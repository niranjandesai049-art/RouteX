import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DriversService } from '../drivers/drivers.service';
import { PrismaService } from '../prisma/prisma.service';
import { MapService } from '../map/map.service';
import { stop_status, stop_type } from '@prisma/client';

export interface LocationUpdatePayload {
  driverId: string;
  bookingId?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // In-memory mapping stores
  private driverSockets = new Map<string, string>(); // driverId -> socketId
  private bookingDrivers = new Map<string, string>(); // bookingId -> driverId
  private latestCoords = new Map<
    string,
    Omit<LocationUpdatePayload, 'bookingId'>
  >(); // driverId -> latest telemetry

  private driverState = new Map<
    string,
    { lastCoords: [number, number]; stationarySince?: Date; lastActive: Date }
  >(); // driverId -> tracking metadata

  constructor(
    private readonly prisma: PrismaService,
    private readonly mapService: MapService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`WebSocket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`WebSocket client disconnected: ${client.id}`);
    // Clean up driver mappings if the disconnected client was a driver
    for (const [driverId, socketId] of this.driverSockets.entries()) {
      if (socketId === client.id) {
        this.driverSockets.delete(driverId);
        console.log(`Pruned driver ${driverId} socket mapping`);
        break;
      }
    }
  }

  @SubscribeMessage('driver:join')
  handleDriverJoin(
    @MessageBody() data: { driverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`driver_${data.driverId}`);
    this.driverSockets.set(data.driverId, client.id);
    console.log(`Driver ${data.driverId} mapped to socket ${client.id}`);
    return { status: 'ok' };
  }

  @SubscribeMessage('shipper:join')
  handleShipperJoin(
    @MessageBody() data: { bookingId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.bookingId);
    console.log(
      `Shipper socket ${client.id} joined booking room: ${data.bookingId}`,
    );
    return { status: 'ok' };
  }

  @SubscribeMessage('admin:join')
  handleAdminJoin(@ConnectedSocket() client: Socket) {
    client.join('admins');
    console.log(`Admin socket ${client.id} joined admins broadcast room`);
    return { status: 'ok' };
  }

  @SubscribeMessage('fleet:join')
  handleFleetJoin(@ConnectedSocket() client: Socket) {
    client.join('fleet_owners');
    console.log(
      `Fleet Owner socket ${client.id} joined fleet_owners broadcast room`,
    );
    return { status: 'ok' };
  }

  @SubscribeMessage('location_update')
  @SubscribeMessage('driver:locationUpdate')
  @SubscribeMessage('driver:location')
  handleLocationUpdate(@MessageBody() data: LocationUpdatePayload) {
    // Sync to centralized driver locations registry
    DriversService.driverLocations.set(data.driverId, {
      latitude: data.latitude,
      longitude: data.longitude,
      heading: data.heading,
      speed: data.speed,
      last_updated_at: new Date(),
    });

    // Store latest driver coordinates and booking mappings
    this.latestCoords.set(data.driverId, {
      driverId: data.driverId,
      latitude: data.latitude,
      longitude: data.longitude,
      heading: data.heading,
      speed: data.speed,
      accuracy: data.accuracy,
      timestamp: data.timestamp,
    });

    if (data.bookingId) {
      this.bookingDrivers.set(data.bookingId, data.driverId);
      this.processLiveTracking(data).catch((err) =>
        console.error('Tracking analytics error:', err.message),
      );
    }

    console.log(
      `[Driver ${data.driverId}] Lat: ${data.latitude}, Lng: ${data.longitude}`,
    );

    // Targeted Room-Based Broadcasting
    // 1. Send update to the shipper joined to this bookingId room
    if (data.bookingId) {
      this.server.to(data.bookingId).emit('driver:locationUpdate', data);
      this.server.to(data.bookingId).emit('driver:location', data);
    }

    // 2. Send update to all active admins
    this.server.to('admins').emit('driver:locationUpdate', data);
    this.server.to('admins').emit('driver:location', data);

    // 3. Send update to all active fleet owners
    this.server.to('fleet_owners').emit('driver:locationUpdate', data);
    this.server.to('fleet_owners').emit('driver:location', data);
  }

  // Helper method to emit status updates globally or to specific rooms when database changes occur
  emitBookingStatus(bookingId: string, status: string) {
    const eventName = `booking:${status.toLowerCase()}`;
    const payload = { bookingId, status, timestamp: new Date().toISOString() };

    console.log(`Broadcasting status change: ${eventName} for ${bookingId}`);

    if (this.server) {
      // Emit to the shipper monitoring this booking
      this.server.to(bookingId).emit(eventName, payload);
      // Emit to admins
      this.server.to('admins').emit(eventName, payload);
      // Emit to fleet owners
      this.server.to('fleet_owners').emit(eventName, payload);

      // User requested events mapping
      const userEventName = `shipment:${status.toLowerCase()}`;
      this.server.to(bookingId).emit(userEventName, payload);
      this.server.to('admins').emit(userEventName, payload);
      this.server.to('fleet_owners').emit(userEventName, payload);
    } else {
      console.log(
        `[Socket.io Offline] Skipping real-time broadcast of event: ${eventName}`,
      );
    }

    if (
      status.toLowerCase() === 'completed' ||
      status.toLowerCase() === 'cancelled'
    ) {
      this.cleanupBooking(bookingId);
    }
  }

  async processLiveTracking(data: LocationUpdatePayload) {
    if (!data.bookingId) return;

    try {
      // 1. Fetch all stops for this booking
      const stops = await this.prisma.booking_stops.findMany({
        where: { booking_id: data.bookingId },
        orderBy: { stop_order: 'asc' },
      });

      if (stops.length === 0) return;

      // Find the first stop that isn't completed (our current target)
      const currentStop = stops.find((s) => s.status !== stop_status.completed);
      if (!currentStop) return;

      const targetLat = Number(currentStop.latitude);
      const targetLng = Number(currentStop.longitude);

      // Calculate distance to current target stop
      const distance = await this.mapService.getPostGisDistanceKm(
        data.latitude,
        data.longitude,
        targetLat,
        targetLng,
      );

      // Update state for delay tracking
      const now = new Date();
      let state = this.driverState.get(data.driverId);
      if (!state) {
        state = {
          lastCoords: [data.latitude, data.longitude],
          lastActive: now,
        };
        this.driverState.set(data.driverId, state);
      }

      // 2. Delay Detection
      const speed = data.speed || 0;
      if (speed < 5) {
        if (!state.stationarySince) {
          state.stationarySince = now;
        } else {
          const stationaryDurationMs =
            now.getTime() - state.stationarySince.getTime();
          if (stationaryDurationMs > 15 * 60 * 1000) {
            // 15 minutes
            const durationMins = Math.round(stationaryDurationMs / 60000);
            if (this.server) {
              this.server.to(data.bookingId).emit('booking:delay_detected', {
                bookingId: data.bookingId,
                stopOrder: currentStop.stop_order,
                durationMinutes: durationMins,
                message: `Shipment is delayed. Driver has been stationary for ${durationMins} minutes.`,
              });
            }
            console.log(
              `[Alert] Booking ${data.bookingId} delay detected: ${durationMins} mins`,
            );
          }
        }
      } else {
        state.stationarySince = undefined;
      }
      state.lastCoords = [data.latitude, data.longitude];
      state.lastActive = now;

      // 3. Geofencing (Entering 500m geofence)
      if (distance <= 0.5 && currentStop.status === stop_status.pending) {
        await this.prisma.booking_stops.update({
          where: { id: currentStop.id },
          data: {
            status: stop_status.arrived,
            arrival_time: now,
          },
        });

        const eventPayload = {
          bookingId: data.bookingId,
          stopId: currentStop.id,
          stopOrder: currentStop.stop_order,
          stopType: currentStop.stop_type,
          timestamp: now.toISOString(),
        };

        if (this.server) {
          this.server
            .to(data.bookingId)
            .emit('booking:stop_arrived', eventPayload);
          this.server
            .to(data.bookingId)
            .emit(
              `booking:waypoint_arrived:${currentStop.stop_order}`,
              eventPayload,
            );
        }

        // Broadcast high-level booking status updates for pickup/delivery geofences
        if (currentStop.stop_type === stop_type.pickup) {
          await this.prisma.booking.update({
            where: { id: data.bookingId },
            data: { status: 'at_pickup' },
          });
          this.emitBookingStatus(data.bookingId, 'at_pickup');
        } else if (currentStop.stop_type === stop_type.delivery) {
          await this.prisma.booking.update({
            where: { id: data.bookingId },
            data: { status: 'at_delivery' },
          });
          this.emitBookingStatus(data.bookingId, 'at_delivery');
        }

        console.log(
          `[Geofence] Driver arrived at Stop ${currentStop.stop_order} for booking ${data.bookingId}`,
        );
      }

      // 4. Route Deviation Detection
      // Get previous stop to trace the path segment
      const prevStop = stops
        .filter((s) => s.stop_order < currentStop.stop_order)
        .sort((a, b) => b.stop_order - a.stop_order)[0]; // closest preceding stop

      if (prevStop) {
        const prevLat = Number(prevStop.latitude);
        const prevLng = Number(prevStop.longitude);

        const distPrevToDriver = await this.mapService.getPostGisDistanceKm(
          prevLat,
          prevLng,
          data.latitude,
          data.longitude,
        );
        const distPrevToNext = await this.mapService.getPostGisDistanceKm(
          prevLat,
          prevLng,
          targetLat,
          targetLng,
        );

        // Deviation: if current distance + distance traversed exceeds direct distance by 15% and at least 5km
        if (
          distPrevToDriver + distance > distPrevToNext * 1.15 &&
          distance > 5
        ) {
          if (this.server) {
            this.server.to(data.bookingId).emit('booking:route_deviation', {
              bookingId: data.bookingId,
              driverId: data.driverId,
              currentCoords: [data.latitude, data.longitude],
              nextStopCoords: [targetLat, targetLng],
              message: `Route deviation detected! Driver is off the optimal path by ${Math.round(distPrevToDriver + distance - distPrevToNext)} km.`,
            });
          }
          console.log(
            `[Alert] Route deviation detected for Booking ${data.bookingId}`,
          );
        }
      }

      // 5. Automatic ETA Recalculation
      // Assume average speed is 40 km/h if driver is stationary, otherwise use actual speed
      const travelSpeed = speed >= 15 ? speed : 40;
      const remainingHours = distance / travelSpeed;
      const etaMs = remainingHours * 60 * 60 * 1000;
      const newEta = new Date(now.getTime() + etaMs);

      // Update ETA in database
      await this.prisma.booking_stops.update({
        where: { id: currentStop.id },
        data: { eta: newEta },
      });

      // Shift subsequent stops' ETAs if there is a delay
      const oldEta = currentStop.eta ? new Date(currentStop.eta) : null;
      if (oldEta) {
        const delayMs = newEta.getTime() - oldEta.getTime();
        if (delayMs > 2 * 60 * 1000) {
          // delay > 2 minutes
          const subsequentStops = stops.filter(
            (s) => s.stop_order > currentStop.stop_order,
          );
          for (const s of subsequentStops) {
            const currentStopEta = s.eta ? new Date(s.eta) : new Date();
            await this.prisma.booking_stops.update({
              where: { id: s.id },
              data: { eta: new Date(currentStopEta.getTime() + delayMs) },
            });
          }
        }
      }

      if (this.server) {
        this.server.to(data.bookingId).emit('booking:eta_update', {
          bookingId: data.bookingId,
          stopId: currentStop.id,
          stopOrder: currentStop.stop_order,
          eta: newEta.toISOString(),
        });
      }
    } catch (error: any) {
      console.error('Error processing live tracking analytics:', error.message);
    }
  }

  cleanupBooking(bookingId: string) {
    const driverId = this.bookingDrivers.get(bookingId);
    this.bookingDrivers.delete(bookingId);
    if (driverId) {
      this.latestCoords.delete(driverId);
    }
    console.log(
      `Cleaned up real-time memory mappings for booking ${bookingId}`,
    );
  }
}

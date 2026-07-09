'use client';

import React, { useEffect, useState } from 'react';
import MapView, { MapMarker } from './MapView';
import { useSocket } from '../../context/SocketContext';

interface Booking {
  id: string;
  pickup: string;
  destination: string;
  status: string;
  price: number;
  truckType: string;
  weight: string;
}

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

interface LiveTrackingMapProps {
  bookings: Booking[];
  users: User[];
}

const geocodeAddress = (address: string): [number, number] => {
  const lower = (address || '').toLowerCase();
  if (lower.includes('mumbai')) return [19.0760, 72.8777];
  if (lower.includes('delhi')) return [28.6139, 77.2090];
  if (lower.includes('jaipur')) return [26.9124, 75.7873];
  if (lower.includes('pune')) return [18.5204, 73.8567];
  if (lower.includes('salem')) return [11.6643, 78.1460];
  if (lower.includes('bengaluru')) return [12.9716, 77.5946];
  if (lower.includes('chennai')) return [13.0827, 80.2707];
  if (lower.includes('kolkata')) return [22.5726, 88.3639];
  return [28.6139, 77.2090];
};

export default function LiveTrackingMap({ bookings = [], users = [] }: LiveTrackingMapProps) {
  const { socket } = useSocket();
  const [liveBookingPositions, setLiveBookingPositions] = useState<Record<string, [number, number]>>({});
  const [liveDriverPositions, setLiveDriverPositions] = useState<Record<string, [number, number]>>({});

  useEffect(() => {
    if (!socket) return;

    const handleLocationUpdate = (data: any) => {
      // data: { driverId, bookingId, latitude, longitude }
      if (data.bookingId) {
        setLiveBookingPositions((prev) => ({
          ...prev,
          [data.bookingId]: [data.latitude, data.longitude],
        }));
        console.log(`LiveTrackingMap updated booking ${data.bookingId} live pos: [${data.latitude}, ${data.longitude}]`);
      } else {
        setLiveDriverPositions((prev) => ({
          ...prev,
          [data.driverId]: [data.latitude, data.longitude],
        }));
        console.log(`LiveTrackingMap updated available driver ${data.driverId} live pos: [${data.latitude}, ${data.longitude}]`);
      }
    };

    socket.on('driver:locationUpdate', handleLocationUpdate);
    return () => {
      socket.off('driver:locationUpdate', handleLocationUpdate);
    };
  }, [socket]);

  const markers: MapMarker[] = [];

  // 1. Plot all bookings (active & completed)
  bookings.forEach((b) => {
    const pickup = geocodeAddress(b.pickup);
    const drop = geocodeAddress(b.destination);
    const isActive = ['assigned', 'dispatched', 'at_pickup', 'in_transit', 'at_delivery', 'completed'].includes(b.status?.toLowerCase());

    markers.push({
      id: `pickup-${b.id}`,
      position: pickup,
      title: `Pickup [${b.id.substring(0, 5)}]`,
      description: b.pickup,
      color: 'gold',
    });

    markers.push({
      id: `drop-${b.id}`,
      position: drop,
      title: `Drop [${b.id.substring(0, 5)}]`,
      description: b.destination,
      color: 'red',
    });

    // Render en-route pulsing truck icon
    if (isActive) {
      let lat = 0;
      let lng = 0;
      const isLive = !!liveBookingPositions[b.id];

      if (isLive) {
        [lat, lng] = liveBookingPositions[b.id];
      } else {
        let progress = 0.25;
        if (b.status?.toLowerCase() === 'in_transit') progress = 0.55;
        if (b.status?.toLowerCase() === 'completed') progress = 1.0;

        lat = pickup[0] + (drop[0] - pickup[0]) * progress;
        lng = pickup[1] + (drop[1] - pickup[1]) * progress;
      }

      markers.push({
        id: `truck-${b.id}`,
        position: [lat, lng],
        title: `Truck - ${b.truckType}`,
        description: `Booking Reference: ${b.id.substring(0, 8)}`,
        color: isLive ? 'blue' : 'blue',
        popupData: {
          status: isLive ? `${b.status} (LIVE)` : b.status,
          speed: b.status?.toLowerCase() === 'in_transit' ? '60 km/h' : '0 km/h',
          eta: b.status?.toLowerCase() === 'in_transit' ? '1.5 Hours' : 'Arrived',
        },
      });
    }
  });

  // 2. Plot online drivers who are available/idle
  const onlineDrivers = users.filter((u) => u.role === 'DRIVER' || u.role === 'driver');
  onlineDrivers.forEach((driver, idx) => {
    let lat = 0;
    let lng = 0;
    const isLive = !!liveDriverPositions[driver.id];

    if (isLive) {
      [lat, lng] = liveDriverPositions[driver.id];
    } else {
      // Offset available drivers around Delhi NCR as fallback
      lat = 28.6139 + (idx % 2 === 0 ? 0.08 : -0.07);
      lng = 77.2090 + (idx % 3 === 0 ? -0.09 : 0.06);
    }

    // Only render if driver is not actively driving a truck already rendered above
    const isBusy = bookings.some((b) => ['assigned', 'in_transit'].includes(b.status?.toLowerCase()));
    if (!isBusy || idx > 0 || isLive) {
      markers.push({
        id: `driver-idle-${driver.id}`,
        position: [lat, lng],
        title: `Available Driver: ${driver.name}`,
        description: `Mobile: ${driver.phone}`,
        color: 'green',
      });
    }
  });

  return (
    <div className="w-full h-full min-h-[400px]">
      <MapView
        markers={markers}
        center={[22.5726, 82.3639]} // Centered nationally to cover multi-state bookings
        zoom={5}
      />
    </div>
  );
}

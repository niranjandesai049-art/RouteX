'use client';

import React, { useEffect, useState } from 'react';
import MapView, { MapMarker } from './MapView';
import { useSocket } from '../../context/SocketContext';

interface ShipmentMapProps {
  shipment: {
    id: string;
    pickup: string;
    destination: string;
    status: string;
    price: number;
    truckType: string;
    weight: string;
    bookingStops?: any[];
  } | null;
}

const geocodeAddressAsync = async (address: string): Promise<[number, number]> => {
  if (!address) return [28.6139, 77.2090];
  
  const lower = address.toLowerCase();
  if (lower.includes('miraj')) return [16.8222, 74.6468];
  if (lower.includes('sangli')) return [16.8524, 74.5815];
  if (lower.includes('mumbai')) return [19.0760, 72.8777];
  if (lower.includes('delhi')) return [28.6139, 77.2090];
  if (lower.includes('jaipur')) return [26.9124, 75.7873];
  if (lower.includes('pune')) return [18.5204, 73.8567];

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
    ).catch(() => null);
    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data[0]) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    }
  } catch (err: any) {
    // Safe fallback without throwing unhandled rejection
  }
  
  return [28.6139, 77.2090];
};

export default function ShipmentMap({ shipment }: ShipmentMapProps) {
  const { socket } = useSocket();
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [pickupCoords, setPickupCoords] = useState<[number, number]>([28.6139, 77.2090]);
  const [dropCoords, setDropCoords] = useState<[number, number]>([26.9124, 75.7873]);

  // Resolve coordinates using bookingStops first, then fallback to Nominatim geocoder
  useEffect(() => {
    if (!shipment) return;
    
    if (shipment.bookingStops && shipment.bookingStops.length > 0) {
      const pStop = shipment.bookingStops.find((s: any) => s.stop_type === 'pickup');
      const dStop = shipment.bookingStops.find((s: any) => s.stop_type === 'delivery');
      if (pStop && dStop) {
        setPickupCoords([Number(pStop.latitude), Number(pStop.longitude)]);
        setDropCoords([Number(dStop.latitude), Number(dStop.longitude)]);
        return;
      }
    }

    let active = true;
    const resolvePositions = async () => {
      const p = await geocodeAddressAsync(shipment.pickup);
      const d = await geocodeAddressAsync(shipment.destination);
      if (active) {
        setPickupCoords(p);
        setDropCoords(d);
      }
    };
    resolvePositions();
    return () => {
      active = false;
    };
  }, [shipment?.pickup, shipment?.destination, shipment?.bookingStops]);

  useEffect(() => {
    if (!socket || !shipment) {
      setDriverPos(null);
      return;
    }

    // Join the specific booking room
    socket.emit('shipper:join', { bookingId: shipment.id });
    console.log(`Shipper joined booking room: ${shipment.id}`);

    const handleLocationUpdate = (data: any) => {
      if (data.bookingId === shipment.id) {
        setDriverPos([data.latitude, data.longitude]);
        console.log(`ShipmentMap received live driver position: [${data.latitude}, ${data.longitude}]`);
      }
    };

    socket.on('driver:locationUpdate', handleLocationUpdate);

    return () => {
      socket.off('driver:locationUpdate', handleLocationUpdate);
    };
  }, [socket, shipment?.id]);

  if (!shipment) {
    return (
      <div className="w-full h-full min-h-[300px] bg-slate-100 flex items-center justify-center rounded-xl border border-slate-200 text-xs font-bold text-slate-400">
        No active shipment to track.
      </div>
    );
  }

  const markers: MapMarker[] = [
    {
      id: 'pickup-loc',
      position: pickupCoords,
      title: 'Pickup Location',
      description: shipment.pickup,
      color: 'gold',
    },
  ];

  if (shipment.bookingStops && shipment.bookingStops.length > 0) {
    shipment.bookingStops.forEach((stop: any) => {
      if (stop.stop_type === 'waypoint') {
        markers.push({
          id: `stop-${stop.id}`,
          position: [Number(stop.latitude), Number(stop.longitude)],
          title: `Stop ${stop.stop_order} (Waypoint)`,
          description: stop.address,
          color: 'gold',
        });
      }
    });
  }

  markers.push({
    id: 'drop-loc',
    position: dropCoords,
    title: 'Delivery Destination',
    description: shipment.destination,
    color: 'red',
  });

  // If carrier is assigned, simulate or show driver position en-route
  const isAssigned = ['assigned', 'dispatched', 'at_pickup', 'in_transit', 'at_delivery', 'completed'].includes(shipment.status?.toLowerCase());
  
  if (isAssigned) {
    let positionCoords: [number, number];

    if (driverPos) {
      positionCoords = driverPos;
    } else {
      let progress = 0; // At pickup point
      if (shipment.status?.toLowerCase() === 'in_transit') progress = 0.45; // Half-way
      if (shipment.status?.toLowerCase() === 'completed') progress = 1.0; // Arrived

      const driverLat = pickupCoords[0] + (dropCoords[0] - pickupCoords[0]) * progress;
      const driverLng = pickupCoords[1] + (dropCoords[1] - pickupCoords[1]) * progress;
      positionCoords = [driverLat, driverLng];
    }

    markers.push({
      id: 'driver-transit',
      position: positionCoords,
      title: 'Assigned Driver',
      description: `Carrier truck: ${shipment.truckType}`,
      color: 'blue',
      popupData: {
        status: shipment.status,
        speed: shipment.status?.toLowerCase() === 'in_transit' ? '50 km/h' : '0 km/h',
        eta: shipment.status?.toLowerCase() === 'in_transit' ? '2.5 Hours' : 'Arrived',
        bookingRef: shipment.id.substring(0, 8),
      },
    });
  }

  const waypointsList: [number, number][] = [];
  if (shipment.bookingStops && shipment.bookingStops.length > 0) {
    shipment.bookingStops.forEach((stop: any) => {
      if (stop.stop_type === 'waypoint') {
        waypointsList.push([Number(stop.latitude), Number(stop.longitude)]);
      }
    });
  }

  return (
    <div className="w-full h-full min-h-[300px]">
      <MapView
        markers={markers}
        pickupCoords={pickupCoords}
        dropCoords={dropCoords}
        waypoints={waypointsList}
        zoom={8}
      />
    </div>
  );
}

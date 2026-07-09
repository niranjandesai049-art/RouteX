'use client';

import React, { useEffect, useState } from 'react';
import MapView, { MapMarker } from './MapView';
import { useSocket } from '../../context/SocketContext';

interface Vehicle {
  id: string;
  rcNo: string;
  category: string;
  driverId?: string;
  driver?: {
    user: {
      name: string;
    };
  };
}

interface FleetMapProps {
  vehicles: Vehicle[];
}

// Helper to spread mock positions around Delhi NCR to simulate fleet operations
const getMockCoordinateForVehicle = (index: number): [number, number] => {
  const centerLat = 28.6139;
  const centerLng = 77.2090;
  // Offset slightly
  const latOffset = (index % 3 === 0 ? 0.05 : -0.04) * (1 + index * 0.1);
  const lngOffset = (index % 2 === 0 ? -0.06 : 0.07) * (1 + index * 0.15);
  return [centerLat + latOffset, centerLng + lngOffset];
};

export default function FleetMap({ vehicles }: FleetMapProps) {
  const { socket } = useSocket();
  const [livePositions, setLivePositions] = useState<Record<string, [number, number]>>({});

  useEffect(() => {
    if (!socket) return;

    const handleLocationUpdate = (data: any) => {
      // Find vehicle by driver ID
      const matchedVehicle = vehicles.find((v) => v.driverId === data.driverId);
      if (matchedVehicle) {
        setLivePositions((prev) => ({
          ...prev,
          [matchedVehicle.id]: [data.latitude, data.longitude],
        }));
        console.log(`FleetMap matched driver ${data.driverId} to vehicle ${matchedVehicle.id}: [${data.latitude}, ${data.longitude}]`);
      }
    };

    socket.on('driver:locationUpdate', handleLocationUpdate);
    return () => {
      socket.off('driver:locationUpdate', handleLocationUpdate);
    };
  }, [socket, vehicles]);

  const markers: MapMarker[] = vehicles.map((v, idx) => {
    const pos = livePositions[v.id] || getMockCoordinateForVehicle(idx);
    const hasDriver = !!v.driver;
    const isLive = !!livePositions[v.id];

    return {
      id: v.id,
      position: pos,
      title: v.category || 'Container Truck',
      description: `Plate: ${v.rcNo}`,
      color: isLive ? 'blue' : (hasDriver ? 'blue' : 'green'), // Blue for active/live, Green for idle
      popupData: {
        driverName: v.driver?.user?.name || 'Unassigned',
        truckNumber: v.rcNo,
        status: isLive ? 'LIVE' : (hasDriver ? 'ACTIVE' : 'IDLE'),
        speed: isLive ? '45 km/h' : (hasDriver ? '55 km/h' : '0 km/h'),
        eta: hasDriver ? '1.2 Hours' : 'N/A',
      },
    };
  });

  return (
    <div className="w-full h-full min-h-[400px]">
      <MapView
        markers={markers}
        center={[28.6139, 77.2090]} // Centered on Delhi NCR
        zoom={10}
      />
    </div>
  );
}

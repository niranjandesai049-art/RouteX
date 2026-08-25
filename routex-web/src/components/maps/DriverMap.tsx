'use client';

import React, { useEffect, useState } from 'react';
import MapView, { MapMarker } from './MapView';
import { Locate } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

interface DriverMapProps {
  activeShipment: {
    id: string;
    pickup: string;
    destination: string;
    status: string;
    price: number;
    truckType: string;
    weight: string;
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

export default function DriverMap({ activeShipment }: DriverMapProps) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [driverPos, setDriverPos] = useState<[number, number]>([28.6139, 77.2090]);
  const [simProgress, setSimProgress] = useState<number>(0);
  const [pickupCoords, setPickupCoords] = useState<[number, number]>([28.6139, 77.2090]);
  const [dropCoords, setDropCoords] = useState<[number, number]>([26.9124, 75.7873]);

  // Resolve pickup and drop coordinates dynamically
  useEffect(() => {
    if (!activeShipment) return;
    
    let active = true;
    const resolvePositions = async () => {
      const p = await geocodeAddressAsync(activeShipment.pickup);
      const d = await geocodeAddressAsync(activeShipment.destination);
      if (active) {
        setPickupCoords(p);
        setDropCoords(d);
      }
    };
    resolvePositions();
    return () => {
      active = false;
    };
  }, [activeShipment?.pickup, activeShipment?.destination]);

  // Simulated movement effect when in transit
  useEffect(() => {
    if (!activeShipment || activeShipment.status?.toLowerCase() !== 'in_transit') {
      setSimProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setSimProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const nextProgress = prev + 10;
        const lat = pickupCoords[0] + (dropCoords[0] - pickupCoords[0]) * (nextProgress / 100);
        const lng = pickupCoords[1] + (dropCoords[1] - pickupCoords[1]) * (nextProgress / 100);
        setDriverPos([lat, lng]);
        return nextProgress;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [activeShipment?.id, activeShipment?.status, pickupCoords, dropCoords]);

  // Handle static status fallback positions
  useEffect(() => {
    if (!activeShipment) return;

    if (['assigned', 'dispatched', 'at_pickup'].includes(activeShipment.status?.toLowerCase())) {
      setDriverPos(pickupCoords);
    } else if (['at_delivery', 'completed'].includes(activeShipment.status?.toLowerCase())) {
      setDriverPos(dropCoords);
    }
  }, [activeShipment?.id, activeShipment?.status, pickupCoords, dropCoords]);

  // Real-time GPS watch (only if not simulating transit)
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    if (activeShipment?.status?.toLowerCase() === 'in_transit') return; // Skip GPS when simulating transit

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setDriverPos([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        console.warn('GPS permission denied. Using fallback coordinates.', error);
        if (activeShipment) {
          if (['assigned', 'dispatched', 'at_pickup'].includes(activeShipment.status?.toLowerCase())) {
            setDriverPos(pickupCoords);
          } else if (['at_delivery', 'completed'].includes(activeShipment.status?.toLowerCase())) {
            setDriverPos(dropCoords);
          }
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeShipment?.id, activeShipment?.status, pickupCoords, dropCoords]);

  // Telemetry Emit Effect
  useEffect(() => {
    if (!socket || !user) return;

    const emitLocation = () => {
      const payload = {
        driverId: user.id,
        bookingId: activeShipment?.id || '',
        latitude: driverPos[0],
        longitude: driverPos[1],
        timestamp: new Date().toISOString(),
      };
      socket.emit('driver:locationUpdate', payload);
      console.log('Emitted driver location update:', payload);
    };

    // Emit location immediately when position changes
    emitLocation();

    // Set up a periodic broadcast every 5 seconds just in case
    const interval = setInterval(emitLocation, 5000);
    return () => clearInterval(interval);
  }, [socket, user, driverPos, activeShipment?.id]);

  // Construct markers array
  const markers: MapMarker[] = [];

  // Driver marker (dynamic)
  markers.push({
    id: 'driver-live',
    position: driverPos,
    title: 'My Location',
    description: activeShipment ? `En Route to ${activeShipment.destination}` : 'Online & Available',
    color: activeShipment ? 'blue' : 'green',
    popupData: {
      status: activeShipment ? activeShipment.status : 'AVAILABLE',
      speed: activeShipment?.status?.toLowerCase() === 'in_transit' ? '45 km/h' : '0 km/h',
      eta: activeShipment?.status?.toLowerCase() === 'in_transit' ? '35 Mins' : 'N/A',
      bookingRef: activeShipment?.id.substring(0, 8),
    },
  });

  // If there is an active shipment, add destination marker and route parameters
  if (activeShipment) {
    markers.push({
      id: 'drop-dest',
      position: dropCoords,
      title: 'Drop Destination',
      description: activeShipment.destination,
      color: 'red',
    });
  }

  const handleRecenter = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setDriverPos([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  };

  return (
    <div className="w-full h-full min-h-[350px] relative">
      <MapView
        markers={markers}
        pickupCoords={activeShipment ? driverPos : undefined}
        dropCoords={dropCoords}
        zoom={13}
        autoCenter={true}
      />
      
      {/* Current Geolocation Recenter Button */}
      <button
        onClick={handleRecenter}
        className="absolute bottom-4 left-4 z-20 w-10 h-10 bg-white border border-slate-200 rounded-lg shadow-md flex items-center justify-center hover:bg-slate-50 transition cursor-pointer text-slate-600"
        title="Find My Geolocation"
      >
        <Locate size={18} />
      </button>
    </div>
  );
}

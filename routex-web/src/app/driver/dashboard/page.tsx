'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import { ProtectedLayout } from '../../../components/ProtectedLayout';
import DriverSimulator from '../../../components/DriverSimulator';
import { bookingsService, BookingResponse } from '../../../services/bookings.service';
import { driversService } from '../../../services/drivers.service';

interface Shipment {
  id: string;
  pickup: string;
  pickupOtp?: string;
  destination: string;
  status: string;
  price: number;
  truckType: string;
  weight: string;
}

// Maps backend enum status to Simulator-friendly status labels
const mapBackendStatusToSimulator = (status: string): string => {
  switch (status) {
    case 'assigned':
      return 'ACCEPTED';
    case 'at_pickup':
      return 'ARRIVED_AT_PICKUP';
    case 'in_transit':
      return 'IN_TRANSIT';
    case 'at_delivery':
      return 'DELIVERED';
    case 'completed':
      return 'COMPLETED';
    default:
      return 'PENDING';
  }
};

export default function DriverDashboardPage() {
  const { user, logout, showToast } = useAuth();
  const { socket } = useSocket();
  const [activeShipment, setActiveShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchActiveBooking = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const bookings = await bookingsService.findAll();
      
      // 1. Check if this driver already has an active (not completed/cancelled) booking assigned
      const assigned = bookings.find(
        (b) => b.driver_id === user.id && b.status !== 'completed' && b.status !== 'cancelled'
      );

      if (assigned) {
        setActiveShipment({
          id: assigned.id,
          pickup: typeof assigned.pickup_address === 'string' 
            ? JSON.parse(assigned.pickup_address).address 
            : assigned.pickup_address?.address || 'Delhi',
          pickupOtp: typeof assigned.pickup_address === 'string'
            ? JSON.parse(assigned.pickup_address).otp
            : assigned.pickup_address?.otp || '',
          destination: typeof assigned.delivery_address === 'string' 
            ? JSON.parse(assigned.delivery_address).address 
            : assigned.delivery_address?.address || 'Mumbai',
          status: mapBackendStatusToSimulator(assigned.status),
          price: parseFloat(assigned.quoted_price.toString()),
          truckType: assigned.cargo_description || 'Tata Ace',
          weight: assigned.estimated_weight_kg ? `${parseFloat(assigned.estimated_weight_kg.toString()) / 1000} Tons` : '1 Ton',
        });
      } else {
        // 2. Otherwise, find any booking that is searching for a driver (available pool)
        const available = bookings.find((b) => b.status === 'searching');
        if (available) {
          setActiveShipment({
            id: available.id,
            pickup: typeof available.pickup_address === 'string' 
              ? JSON.parse(available.pickup_address).address 
              : available.pickup_address?.address || 'Delhi',
            pickupOtp: typeof available.pickup_address === 'string'
              ? JSON.parse(available.pickup_address).otp
              : available.pickup_address?.otp || '',
            destination: typeof available.delivery_address === 'string' 
              ? JSON.parse(available.delivery_address).address 
              : available.delivery_address?.address || 'Mumbai',
            status: 'PENDING', // Mapped status for simulator to prompt "Accept"
            price: parseFloat(available.quoted_price.toString()),
            truckType: available.cargo_description || 'Tata Ace',
            weight: available.estimated_weight_kg ? `${parseFloat(available.estimated_weight_kg.toString()) / 1000} Tons` : '1 Ton',
          });
        } else {
          setActiveShipment(null);
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error syncing active shipment logs', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    fetchActiveBooking();
  }, [fetchActiveBooking]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleBookingStatusChange = (data: any) => {
      console.log('Driver Dashboard received socket status update:', data);
      fetchActiveBooking();
    };

    const statuses = ['assigned', 'at_pickup', 'in_transit', 'at_delivery', 'completed', 'searching', 'cancelled'];
    statuses.forEach(status => {
      socket.on(`booking:${status}`, handleBookingStatusChange);
    });

    return () => {
      statuses.forEach(status => {
        socket.off(`booking:${status}`, handleBookingStatusChange);
      });
    };
  }, [socket, user, fetchActiveBooking]);



  // Inverse mapper for status transitions
  const handleAccept = async (id: string) => {
    if (!user) return;
    try {
      await bookingsService.assignDriver(id, user.id);
      showToast('Shipment accepted!', 'success');
      await fetchActiveBooking();
    } catch (err: any) {
      showToast('Could not accept job', 'error');
    }
  };

  const handleArrivePickup = async (id: string) => {
    try {
      await bookingsService.updateStatus(id, 'at_pickup');
      showToast('Arrived at pickup location', 'success');
      await fetchActiveBooking();
    } catch (err: any) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleStartTransit = async (id: string) => {
    try {
      await bookingsService.updateStatus(id, 'in_transit');
      showToast('Transit started. Live GPS active.', 'success');
      await fetchActiveBooking();
      
      // Seed initial location
      await driversService.updateLocation(28.6139, 77.2090);
    } catch (err: any) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDeliver = async (id: string) => {
    try {
      await bookingsService.updateStatus(id, 'at_delivery');
      showToast('Arrived at delivery location', 'success');
      await fetchActiveBooking();
    } catch (err: any) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleUploadSignature = async (id: string, signature: string) => {
    try {
      await bookingsService.submitEpod(id, signature);
      showToast('ePOD uploaded & payment settled!', 'success');
      await fetchActiveBooking();
    } catch (err: any) {
      showToast('Payment settlement failed', 'error');
    }
  };

  return (
    <ProtectedLayout allowedRoles={['driver']}>
      <div className="flex flex-col min-h-screen bg-slate-900 text-white">
        <header className="bg-slate-950 text-white py-4 px-6 flex items-center justify-between sticky top-0 z-40 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center font-bold text-lg">R</div>
            <span className="font-extrabold tracking-tight">RouteX <span className="text-xs text-blue-400 font-semibold uppercase ml-1 px-1.5 py-0.5 bg-blue-900/50 rounded">Driver App</span></span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs font-bold text-slate-400">Welcome, {user?.name || 'Driver'}</span>
            <button
              onClick={logout}
              className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded transition cursor-pointer border border-slate-700"
            >
              Sign Out
            </button>
          </div>
        </header>

        {isLoading && (
          <div className="bg-blue-600 text-center py-2 text-xs font-bold animate-pulse text-white">
            Syncing geolocation feeds...
          </div>
        )}

        <main className="flex-1 flex items-center justify-center py-6 bg-slate-950">
          <DriverSimulator
            activeShipment={activeShipment}
            onAccept={handleAccept}
            onArrivePickup={handleArrivePickup}
            onStartTransit={handleStartTransit}
            onDeliver={handleDeliver}
            onUploadSignature={handleUploadSignature}
          />
        </main>
      </div>
    </ProtectedLayout>
  );
}

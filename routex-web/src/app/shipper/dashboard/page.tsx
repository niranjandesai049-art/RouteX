'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import { ProtectedLayout } from '../../../components/ProtectedLayout';
import ShipperPortal from '../../../components/ShipperPortal';
import { bookingsService, BookingResponse } from '../../../services/bookings.service';
import { walletService } from '../../../services/wallet.service';

interface Shipment {
  id: string;
  pickup: string;
  pickupOtp?: string;
  destination: string;
  status: string;
  price: number;
  truckType: string;
  weight: string;
  delayPredicted: string;
}

export default function ShipperDashboardPage() {
  const { user, logout, showToast } = useAuth();
  const { socket } = useSocket();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0.00);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchShipperData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1. Fetch bookings
      const bookings = await bookingsService.findAll(user?.id);
      const list = Array.isArray(bookings) ? bookings : [];
      const mapped = list.map((b: BookingResponse) => {
        let pickupAddr = 'Delhi';
        let pickupOtp: string | undefined = undefined;
        let destAddr = 'Mumbai';

        try {
          if (typeof b.pickup_address === 'string') {
            const trimmed = b.pickup_address.trim();
            if (trimmed.startsWith('{')) {
              const parsed = JSON.parse(trimmed);
              pickupAddr = parsed.address || b.pickup_address;
              pickupOtp = parsed.otp;
            } else {
              pickupAddr = b.pickup_address;
            }
          } else if (b.pickup_address && typeof b.pickup_address === 'object') {
            pickupAddr = b.pickup_address.address || 'Delhi';
            pickupOtp = b.pickup_address.otp;
          }
        } catch {
          pickupAddr = typeof b.pickup_address === 'string' ? b.pickup_address : 'Delhi';
        }

        if (b.status !== 'assigned' && b.status !== 'at_pickup') {
          pickupOtp = undefined;
        }

        try {
          if (typeof b.delivery_address === 'string') {
            const trimmed = b.delivery_address.trim();
            if (trimmed.startsWith('{')) {
              const parsed = JSON.parse(trimmed);
              destAddr = parsed.address || b.delivery_address;
            } else {
              destAddr = b.delivery_address;
            }
          } else if (b.delivery_address && typeof b.delivery_address === 'object') {
            destAddr = b.delivery_address.address || 'Mumbai';
          }
        } catch {
          destAddr = typeof b.delivery_address === 'string' ? b.delivery_address : 'Mumbai';
        }

        return {
          id: b.id,
          pickup: pickupAddr,
          pickupOtp,
          destination: destAddr,
          status: b.status,
          price: parseFloat((b.quoted_price || 0).toString()),
          truckType: b.cargo_description || 'Tata Ace',
          weight: b.estimated_weight_kg ? `${parseFloat(b.estimated_weight_kg.toString()) / 1000} Tons` : '1 Ton',
          delayPredicted: 'AI Calculating...',
        };
      });
      setShipments(mapped);

      // 2. Fetch wallet balance
      const wallet = await walletService.getBalance();
      setWalletBalance(wallet.walletBalance);
    } catch (err: any) {
      console.error(err);
      showToast('Error loading live shipper records', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast]);

  // Synchronize FCM Token for real-time push alerts
  useEffect(() => {
    if (!user) return;
    
    const syncFcm = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { NotificationService } = await import('../../../lib/firebase-messaging');
          await NotificationService.requestPermissionAndGetToken(user.id, token);
          
          await NotificationService.onMessageReceived((payload) => {
            showToast(`${payload.notification?.title}: ${payload.notification?.body}`, 'info');
          });
        } catch (e) {
          console.error('FCM initialization failed:', e);
        }
      }
    };

    const timer = setTimeout(syncFcm, 2500);
    return () => clearTimeout(timer);
  }, [user, showToast]);

  useEffect(() => {
    fetchShipperData();
  }, [fetchShipperData]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleStatusChange = (data: any) => {
      console.log('Shipper Dashboard received socket status update:', data);
      fetchShipperData();
    };

    const statuses = ['assigned', 'at_pickup', 'in_transit', 'at_delivery', 'completed', 'searching', 'cancelled'];
    statuses.forEach(status => {
      socket.on(`booking:${status}`, handleStatusChange);
    });

    return () => {
      statuses.forEach(status => {
        socket.off(`booking:${status}`, handleStatusChange);
      });
    };
  }, [socket, user, fetchShipperData]);

  const handleAddShipment = async (newShipment: Omit<Shipment, 'id' | 'status' | 'delayPredicted'> & { distanceKm?: number }) => {
    if (!user) return;
    setIsLoading(true);
    try {
      await bookingsService.create({
        shipperId: user.id,
        pickupAddress: newShipment.pickup,
        destAddress: newShipment.destination,
        distanceKm: newShipment.distanceKm || 450,
        weightTons: parseFloat(newShipment.weight),
        truckCategory: newShipment.truckType,
        loadType: newShipment.truckType,
        price: newShipment.price,
      });
      showToast('Booking posted successfully!', 'success');
      await fetchShipperData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Could not place cargo booking', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {isLoading && (
        <div className="bg-blue-50 text-blue-700 py-2 px-6 rounded-lg text-center text-xs font-bold animate-pulse mb-6 border border-blue-100">
          Syncing database records...
        </div>
      )}

      <ShipperPortal
        shipments={shipments}
        onAddShipment={handleAddShipment}
        walletBalance={walletBalance}
      />
    </div>
  );
}

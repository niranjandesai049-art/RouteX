'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { useSocket } from '../../../../context/SocketContext';
import { ShipmentMap } from '../../../../components/maps/MapLoader';
import { bookingsService, BookingResponse } from '../../../../services/bookings.service';
import { MapPin, Truck, CheckCircle2, Clock, Phone, AlertTriangle, ArrowLeft, Download, Search } from 'lucide-react';

export default function ShipmentDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user, showToast } = useAuth();
  const { socket } = useSocket();

  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBooking = useCallback(async () => {
    if (!user || !id) return;
    try {
      const b: BookingResponse = await bookingsService.findOne(id);
      
      let pAddr = 'Unknown';
      let pOtp = '';
      let pLat = 28.6139;
      let pLng = 77.2090;
      
      let dAddr = 'Unknown';
      let dOtp = '';
      let dLat = 19.0760;
      let dLng = 72.8777;

      try {
        const pParsed = typeof b.pickup_address === 'string' ? JSON.parse(b.pickup_address) : b.pickup_address;
        pAddr = pParsed?.address || 'Unknown';
        pOtp = pParsed?.otp || '';
        pLat = pParsed?.latitude || pLat;
        pLng = pParsed?.longitude || pLng;
      } catch(e){}

      try {
        const dParsed = typeof b.delivery_address === 'string' ? JSON.parse(b.delivery_address) : b.delivery_address;
        dAddr = dParsed?.address || 'Unknown';
        dOtp = dParsed?.otp || '';
        dLat = dParsed?.latitude || dLat;
        dLng = dParsed?.longitude || dLng;
      } catch(e){}

      setBooking({
        id: b.id,
        reference: b.booking_reference,
        status: b.status,
        price: parseFloat(b.quoted_price.toString()),
        truckType: b.cargo_description || 'Truck',
        weight: b.estimated_weight_kg ? `${parseFloat(b.estimated_weight_kg.toString()) / 1000} Tons` : '1 Ton',
        pickup: pAddr,
        pickupOtp: pOtp,
        pickupLat: pLat,
        pickupLng: pLng,
        destination: dAddr,
        deliveryOtp: dOtp,
        deliveryLat: dLat,
        deliveryLng: dLng,
        driver: b.driver_id ? { id: b.driver_id, name: 'Assigned Driver', phone: '+91 XXXXX XXXXX' } : null,
        bookingStops: b.booking_stops || [],
      });
    } catch (err) {
      showToast('Error loading shipment details', 'error');
      router.push('/shipper/shipments');
    } finally {
      setIsLoading(false);
    }
  }, [id, user, router, showToast]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  useEffect(() => {
    if (!socket || !booking) return;

    const handleStatusChange = (data: any) => {
      if (data.id === booking.id) {
        fetchBooking(); // Refresh
      }
    };

    const handleLocation = (data: any) => {
       // Location updates are typically handled within ShipmentMap.
       // Here we could update ETA or driver distance if we wanted.
    };

    socket.on('booking:assigned', handleStatusChange);
    socket.on('booking:at_pickup', handleStatusChange);
    socket.on('booking:in_transit', handleStatusChange);
    socket.on('booking:at_delivery', handleStatusChange);
    socket.on('booking:completed', handleStatusChange);
    socket.on('driver:location', handleLocation);

    return () => {
      socket.off('booking:assigned', handleStatusChange);
      socket.off('booking:at_pickup', handleStatusChange);
      socket.off('booking:in_transit', handleStatusChange);
      socket.off('booking:at_delivery', handleStatusChange);
      socket.off('booking:completed', handleStatusChange);
      socket.off('driver:location', handleLocation);
    };
  }, [socket, booking, fetchBooking]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!booking) return null;

  const steps = [
    { id: 'searching', label: 'Finding Driver', icon: Search },
    { id: 'assigned', label: 'Driver Assigned', icon: CheckCircle2 },
    { id: 'in_transit', label: 'In Transit', icon: Truck },
    { id: 'completed', label: 'Delivered', icon: MapPin }
  ];

  const getStepIndex = (status: string) => {
    if (status === 'searching') return 0;
    if (status === 'assigned' || status === 'at_pickup') return 1;
    if (status === 'in_transit' || status === 'at_delivery') return 2;
    if (status === 'completed') return 3;
    return 0;
  };

  const currentIndex = getStepIndex(booking.status);

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-64px)] overflow-y-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => router.back()} className="mr-4 p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              Shipment #{booking.reference}
            </h2>
            <p className="text-gray-500 text-sm mt-1">ID: {booking.id}</p>
          </div>
        </div>
        <div>
          {booking.status === 'completed' && (
            <button className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100 transition border border-indigo-200">
              <Download size={18} className="mr-2" /> Download ePOD & Invoice
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Map Column */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
          
          {/* Tracking Map */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 min-h-[400px] relative z-0">
            <ShipmentMap shipment={booking} />
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-6">Shipment Timeline</h3>
            <div className="relative">
              <div className="absolute left-[20px] top-4 bottom-4 w-0.5 bg-gray-100 z-0"></div>
              
              <div className="space-y-8 relative z-10">
                {booking.bookingStops && booking.bookingStops.length > 0 ? (
                  booking.bookingStops.map((stop: any, index: number) => {
                    const isCompleted = stop.status === 'completed';
                    const isArrived = stop.status === 'arrived';
                    
                    return (
                      <div key={stop.id} className="flex items-start">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 border-4 border-white shadow-sm flex-shrink-0 transition-colors ${
                          isCompleted ? 'bg-green-500 text-white' : 
                          isArrived ? 'bg-blue-600 text-white ring-4 ring-blue-50' : 'bg-gray-200 text-gray-400'
                        }`}>
                          {stop.stop_type === 'pickup' ? <Search size={18} /> :
                           stop.stop_type === 'delivery' ? <MapPin size={18} /> : <Truck size={18} />}
                        </div>
                        <div className="pt-2 flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className={`font-bold ${isArrived ? 'text-blue-700' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                                {stop.stop_type.toUpperCase()} (Stop {stop.stop_order})
                              </h4>
                              <p className="text-gray-600 text-sm mt-1">{stop.address}</p>
                            </div>
                            {stop.otp && !isCompleted && (
                              <div className="bg-amber-50 border border-amber-200 px-2 py-1 rounded text-amber-700 font-mono text-xs font-bold">
                                OTP: {stop.otp}
                              </div>
                            )}
                          </div>
                          {isCompleted && stop.departure_time && (
                            <p className="text-xs text-green-600 font-semibold mt-1">
                              Cleared at: {new Date(stop.departure_time).toLocaleTimeString()}
                            </p>
                          )}
                          {isArrived && !isCompleted && (
                            <p className="text-xs text-blue-600 font-semibold mt-1 animate-pulse">
                              Driver has arrived at this location.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  steps.map((step, index) => {
                    const isCompleted = index <= currentIndex;
                    const isActive = index === currentIndex;
                    
                    return (
                      <div key={step.id} className="flex items-start">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 border-4 border-white shadow-sm flex-shrink-0 transition-colors ${
                          isActive ? 'bg-blue-600 text-white ring-4 ring-blue-50' : 
                          isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                        }`}>
                          <step.icon size={18} />
                        </div>
                        <div className="pt-2 flex-1">
                          <h4 className={`font-bold ${isActive ? 'text-blue-700' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                            {step.label}
                          </h4>
                          
                          {isActive && step.id === 'assigned' && (
                            <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3 flex justify-between items-center">
                              <div>
                                <p className="text-xs text-amber-800 font-semibold uppercase tracking-wider">Pickup Security OTP</p>
                                <p className="text-2xl font-black text-amber-600 tracking-widest mt-1">{booking.pickupOtp}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-amber-600">Share with driver upon arrival</p>
                              </div>
                            </div>
                          )}
                          
                          {isActive && step.id === 'in_transit' && (
                            <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex justify-between items-center">
                              <div>
                                <p className="text-xs text-indigo-800 font-semibold uppercase tracking-wider">Delivery Security OTP</p>
                                <p className="text-2xl font-black text-indigo-600 tracking-widest mt-1">{booking.deliveryOtp || 'N/A'}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-indigo-600">Share at unloading point</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Column */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Driver Info (if assigned) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Driver Details</h3>
            {booking.driver ? (
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Truck size={24} className="text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{booking.driver.name}</p>
                  <div className="flex items-center text-gray-500 text-sm mt-1">
                    <Phone size={14} className="mr-1" /> {booking.driver.phone}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-500 font-medium">Searching for nearby drivers...</p>
              </div>
            )}
          </div>

          {/* Shipment Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="font-bold text-gray-900 border-b pb-3">Load Details</h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Origin</p>
                <p className="font-medium text-gray-900 mt-1">{booking.pickup}</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Destination</p>
                <p className="font-medium text-gray-900 mt-1">{booking.destination}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-50">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Vehicle</p>
                  <p className="font-bold text-gray-900 mt-1">{booking.truckType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Weight</p>
                  <p className="font-bold text-gray-900 mt-1">{booking.weight}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-50">
                <p className="text-xs text-gray-500 uppercase font-semibold">Agreed Price</p>
                <p className="text-2xl font-extrabold text-blue-600 mt-1">₹{booking.price.toLocaleString()}</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

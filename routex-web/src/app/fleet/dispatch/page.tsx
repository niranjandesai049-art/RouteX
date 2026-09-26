'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { FleetMap } from '../../../components/maps/MapLoader';
import {
  Compass,
  Search,
  CheckCircle,
  Truck,
  Users,
  MapPin,
  Clock,
  Check,
  X,
  TrendingUp,
} from 'lucide-react';

interface VehicleLog {
  id: string;
  plate_number: string;
  model_name: string;
  brand: string;
  type: string;
  status: string;
  drivers?: Array<{
    id: string;
    profiles: {
      first_name: string;
      last_name: string;
    };
  }>;
}

interface DriverLog {
  id: string;
  license_number: string;
  status: string;
  current_truck_id?: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    phone_number: string;
  };
}

interface BookingLog {
  id: string;
  booking_reference: string;
  cargo_description: string;
  pickup_address: any;
  delivery_address: any;
  quoted_price: number;
  status: string;
  created_at: string;
  driver_id?: string | null;
  truck_id?: string | null;
}

export default function FleetDispatchPage() {
  const [vehicles, setVehicles] = useState<VehicleLog[]>([]);
  const [drivers, setDrivers] = useState<DriverLog[]>([]);
  const [bookings, setBookings] = useState<BookingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingLog | null>(null);

  // Allocation targets
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedTruckId, setSelectedTruckId] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const vRes = await api.get('/api/fleet/trucks');
      setVehicles(vRes.data || []);

      const dRes = await api.get('/api/fleet/drivers');
      setDrivers(dRes.data || []);

      const bRes = await api.get('/api/fleet/bookings');
      setBookings(bRes.data || []);
    } catch (err) {
      console.error('Failed to load dispatch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAssignModal = (booking: BookingLog) => {
    setSelectedBooking(booking);
    setSelectedDriverId('');
    setSelectedTruckId('');
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !selectedDriverId || !selectedTruckId) return;

    try {
      // 1. Assign driver to truck in fleet service
      await api.post('/api/fleet/assign-driver', {
        vehicleId: selectedTruckId,
        driverProfileId: selectedDriverId,
      });

      // 2. Assign driver to booking (which automatically grabs the truck)
      await api.put(`/api/booking/${selectedBooking.id}/assign`, {
        driverId: selectedDriverId,
      });

      setIsAssignModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dispatch shipment.');
    }
  };

  // Map vehicles list to the schema expected by FleetMap component
  const mapVehiclesForMap = () => {
    return vehicles.map((v) => {
      const driverObj = drivers.find((d) => d.current_truck_id === v.id || (v.drivers && v.drivers.some(vd => vd.id === d.id)));
      return {
        id: v.id,
        rcNo: v.plate_number,
        category: v.model_name,
        driverId: driverObj?.id,
        driver: driverObj
          ? {
              user: {
                name: `${driverObj.profiles.first_name} ${driverObj.profiles.last_name}`,
              },
            }
          : undefined,
      };
    });
  };

  // Filter bookings that need assignment (status draft / searching)
  const pendingAssignments = bookings.filter(
    (b) => ['searching', 'draft'].includes(b.status.toLowerCase()) && !b.driver_id
  );

  const activeShipments = bookings.filter(
    (b) => !['searching', 'draft', 'completed', 'cancelled'].includes(b.status.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Upper Grid: OSM Live Map and Pending Dispatch Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <div className="lg:col-span-2 bg-white border border-[#EBEBEB] rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-[#2563EB]">
            <Compass size={18} />
            <span className="font-bold text-xs uppercase tracking-wider">Live Fleet Telemetry Map</span>
          </div>
          <div className="h-[400px] border border-[#EBEBEB] rounded-xl overflow-hidden bg-gray-50">
            {!isLoading && <FleetMap vehicles={mapVehiclesForMap()} />}
          </div>
        </div>

        {/* Dispatch Allocation Queue */}
        <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm flex flex-col justify-between max-h-[466px]">
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-[#1A1A1A] uppercase tracking-wider">Pending Dispatch Queue</h3>
            
            {isLoading ? (
              <p className="text-xs text-[#888888] animate-pulse">Loading queue...</p>
            ) : pendingAssignments.length === 0 ? (
              <p className="text-xs text-[#888888] py-8 text-center">All shipments allocated. No bookings pending dispatch.</p>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[320px] pr-1">
                {pendingAssignments.map((booking) => {
                  let pickupStr: any = booking.pickup_address;
                  let destStr: any = booking.delivery_address;
                  try {
                    if (typeof booking.pickup_address === 'string' && booking.pickup_address.trim().startsWith('{')) {
                      pickupStr = JSON.parse(booking.pickup_address);
                    } else if (typeof booking.pickup_address === 'string') {
                      pickupStr = { address: booking.pickup_address };
                    }
                  } catch {}
                  try {
                    if (typeof booking.delivery_address === 'string' && booking.delivery_address.trim().startsWith('{')) {
                      destStr = JSON.parse(booking.delivery_address);
                    } else if (typeof booking.delivery_address === 'string') {
                      destStr = { address: booking.delivery_address };
                    }
                  } catch {}
                  
                  return (
                    <div key={booking.id} className="border border-[#EBEBEB] p-4 rounded-xl space-y-3 text-xs">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1A1A1A]">{booking.booking_reference}</span>
                          <span className="font-semibold text-blue-600">₹{booking.quoted_price.toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-[#888888] mt-0.5">{booking.cargo_description}</p>
                      </div>

                      <div className="space-y-1 text-[11px] text-[#666666]">
                        <p className="truncate"><strong>From:</strong> {pickupStr?.address || 'Pickup'}</p>
                        <p className="truncate"><strong>To:</strong> {destStr?.address || 'Destination'}</p>
                      </div>

                      <button
                        onClick={() => openAssignModal(booking)}
                        className="w-full bg-[#2563EB] text-white py-2 rounded-lg font-bold text-[11px] hover:bg-blue-700 transition cursor-pointer"
                      >
                        Dispatch Booking
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lower Row: Active Shipments Roster */}
      <div className="bg-white border border-[#EBEBEB] rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
        <h3 className="font-bold text-sm text-[#1A1A1A] uppercase tracking-wider">Active Shipments Roster</h3>
        
        {isLoading ? (
          <p className="text-center py-6 text-xs text-[#888888] animate-pulse">Loading active roster...</p>
        ) : activeShipments.length === 0 ? (
          <p className="text-center py-6 text-xs text-[#888888]">No active shipments in transit.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#EBEBEB] text-[#666666] font-semibold">
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4">Assigned Vehicle</th>
                  <th className="px-6 py-4">Assigned Driver</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEBEB]">
                {activeShipments.map((booking) => {
                  const driverObj = drivers.find((d) => d.id === booking.driver_id);
                  const truckObj = vehicles.find((v) => v.id === booking.truck_id);

                  return (
                    <tr key={booking.id} className="hover:bg-[#FAFAFA]/50 transition">
                      <td className="px-6 py-4 font-bold text-[#1A1A1A]">
                        {booking.booking_reference}
                      </td>
                      <td className="px-6 py-4">
                        {truckObj ? (
                          <div>
                            <p className="font-bold text-[#1A1A1A] uppercase">{truckObj.plate_number}</p>
                            <span className="text-[10px] text-[#888888]">{truckObj.model_name}</span>
                          </div>
                        ) : (
                          <span className="text-[#888888]">No Truck</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {driverObj ? (
                          <div>
                            <p className="font-bold text-[#1A1A1A]">{driverObj.profiles.first_name} {driverObj.profiles.last_name}</p>
                            <span className="text-[10px] text-[#888888]">{driverObj.profiles.phone_number}</span>
                          </div>
                        ) : (
                          <span className="text-[#888888]">No Driver</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 font-bold uppercase rounded-full text-[9px] ${
                          booking.status.toLowerCase() === 'in_transit'
                            ? 'bg-blue-50 text-[#2563EB]'
                            : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#666666]">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dispatch Allocation Modal */}
      {isAssignModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white border border-[#EBEBEB] rounded-2xl w-[500px] shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
                Dispatch Allocation ({selectedBooking.booking_reference})
              </h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-[#666666] hover:text-[#1A1A1A] p-1 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmAssignment} className="space-y-4 text-xs font-semibold text-[#666666]">
              {/* Select Driver */}
              <div className="space-y-1">
                <label>Select Driver</label>
                <select
                  required
                  value={selectedDriverId}
                  onChange={(e) => {
                    setSelectedDriverId(e.target.value);
                    // Autofill driver's current vehicle if registered
                    const drv = drivers.find(d => d.id === e.target.value);
                    if (drv?.current_truck_id) {
                      setSelectedTruckId(drv.current_truck_id);
                    }
                  }}
                  className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="">-- Choose Operator --</option>
                  {drivers
                    .filter(d => d.status.toLowerCase() === 'available')
                    .map((drv) => (
                      <option key={drv.id} value={drv.id}>
                        {drv.profiles.first_name} {drv.profiles.last_name} (Exp: {drv.license_number})
                      </option>
                    ))}
                </select>
              </div>

              {/* Select Truck */}
              <div className="space-y-1">
                <label>Select Truck</label>
                <select
                  required
                  value={selectedTruckId}
                  onChange={(e) => setSelectedTruckId(e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles
                    .filter(v => v.status.toLowerCase() === 'available')
                    .map((trk) => (
                      <option key={trk.id} value={trk.id}>
                        {trk.plate_number} - {trk.brand} {trk.model_name} ({trk.type})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#EBEBEB]">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="bg-[#FAFAFA] border border-[#EBEBEB] px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#2563EB] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { Truck, MapPin, Search, Filter, Eye, Copy } from 'lucide-react';
import { bookingsService, BookingResponse } from '../../../services/bookings.service';

interface ShipmentRow {
  id: string;
  pickup: string;
  destination: string;
  status: string;
  price: number;
  truckType: string;
  date: string;
}

export default function ShipmentsPage() {
  const { user, showToast } = useAuth();
  const router = useRouter();
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchShipments = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const bookings = await bookingsService.findAll();
      const mapped = bookings.map((b: BookingResponse) => {
        let pAddr = 'Unknown';
        let dAddr = 'Unknown';
        
        try { pAddr = typeof b.pickup_address === 'string' ? JSON.parse(b.pickup_address).address : b.pickup_address?.address || 'Unknown'; } catch(e){}
        try { dAddr = typeof b.delivery_address === 'string' ? JSON.parse(b.delivery_address).address : b.delivery_address?.address || 'Unknown'; } catch(e){}

        return {
          id: b.id,
          pickup: pAddr,
          destination: dAddr,
          status: b.status,
          price: parseFloat(b.quoted_price.toString()),
          truckType: b.cargo_description || 'Truck',
          date: new Date(b.created_at).toLocaleDateString()
        };
      });
      setShipments(mapped);
    } catch (err: any) {
      console.error(err);
      showToast('Error loading shipments', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const filtered = shipments.filter(s => 
    s.id.toLowerCase().includes(search.toLowerCase()) || 
    s.pickup.toLowerCase().includes(search.toLowerCase()) ||
    s.destination.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Truck className="mr-2 text-blue-600" /> Shipment History
          </h2>
          <p className="text-gray-500 text-sm mt-1">Manage and track your freight loads</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link href="/shipper/book" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition shadow-sm">
            + New Shipment
          </Link>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by ID, Origin, or Destination..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-blue-600 outline-none transition"
            />
          </div>
          <button className="flex items-center text-sm font-semibold text-gray-600 hover:text-blue-600 transition bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <Filter size={16} className="mr-2" /> Filter
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Loading shipments...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Truck size={48} className="mx-auto mb-4 text-gray-200" />
            <h3 className="text-lg font-bold text-gray-900">No shipments found</h3>
            <p className="text-gray-500 mt-1">You haven't booked any shipments yet matching this criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 text-xs">
                  <th className="p-4">TRIP ID & DATE</th>
                  <th className="p-4">ROUTE DETAILS</th>
                  <th className="p-4">VEHICLE</th>
                  <th className="p-4">RATE</th>
                  <th className="p-4">STATUS</th>
                  <th className="p-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="p-4">
                      <div className="font-bold text-gray-900">{s.id.substring(0, 8).toUpperCase()}</div>
                      <div className="text-xs text-gray-500 mt-1">{s.date}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center text-xs">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2 flex-shrink-0"></div>
                        <span className="truncate max-w-[150px]" title={s.pickup}>{s.pickup}</span>
                      </div>
                      <div className="flex items-center text-xs mt-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500 mr-2 flex-shrink-0"></div>
                        <span className="truncate max-w-[150px]" title={s.destination}>{s.destination}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-semibold bg-gray-100 px-2.5 py-1 rounded text-gray-700">{s.truckType}</span>
                    </td>
                    <td className="p-4 font-bold text-gray-900">₹{s.price.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${
                        s.status === 'searching' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        s.status === 'assigned' || s.status === 'in_transit' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        s.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}>
                        {s.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link 
                        href={`/shipper/shipments/${s.id}`}
                        className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition tooltip"
                        title="View Details & Track"
                      >
                        <Eye size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

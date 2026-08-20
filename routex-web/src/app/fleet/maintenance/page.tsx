'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import {
  Activity,
  Search,
  Wrench,
  Fuel,
  Disc,
  ArrowRight,
  TrendingDown,
  Download,
} from 'lucide-react';

interface MaintenanceLog {
  id: string;
  description: string;
  cost: number;
  maintenance_date: string;
  status: string;
  odometer: number;
  truck: {
    plate_number: string;
    model_name: string;
  };
}

interface FuelLog {
  id: string;
  fuel_quantity_liters: number;
  cost: number;
  odometer: number;
  fuel_date: string;
  location?: string;
  truck: {
    plate_number: string;
  };
}

interface TyreLog {
  id: string;
  serial_number: string;
  position: string;
  status: string;
  install_date: string;
  install_odometer: number;
  truck: {
    plate_number: string;
  };
}

export default function FleetMaintenancePage() {
  const [maintenances, setMaintenances] = useState<MaintenanceLog[]>([]);
  const [fuels, setFuels] = useState<FuelLog[]>([]);
  const [tyres, setTyres] = useState<TyreLog[]>([]);
  const [activeSegment, setActiveSegment] = useState<'maintenance' | 'fuel' | 'tyres'>('maintenance');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const mRes = await api.get('/api/fleet/maintenance');
      setMaintenances(mRes.data || []);

      const fRes = await api.get('/api/fleet/fuel');
      setFuels(fRes.data || []);

      const tRes = await api.get('/api/fleet/tyres');
      setTyres(tRes.data || []);
    } catch (err) {
      console.error('Failed to load maintenance logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalMaintenanceCost = maintenances.reduce((acc, cur) => acc + Number(cur.cost), 0);
  const totalFuelCost = fuels.reduce((acc, cur) => acc + Number(cur.cost), 0);
  const totalLitersRefilled = fuels.reduce((acc, cur) => acc + Number(cur.fuel_quantity_liters), 0);

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (activeSegment === 'maintenance') {
      csvContent += "Plate,Description,Cost (INR),Odometer (KM),Date\n";
      maintenances.forEach(m => {
        csvContent += `${m.truck.plate_number},"${m.description}",${m.cost},${m.odometer},${new Date(m.maintenance_date).toLocaleDateString()}\n`;
      });
    } else if (activeSegment === 'fuel') {
      csvContent += "Plate,Liters,Cost (INR),Odometer (KM),Date,Location\n";
      fuels.forEach(f => {
        csvContent += `${f.truck.plate_number},${f.fuel_quantity_liters},${f.cost},${f.odometer},${new Date(f.fuel_date).toLocaleDateString()},"${f.location || ''}"\n`;
      });
    } else {
      csvContent += "Plate,Serial No,Position,Status,Odometer (KM),Date\n";
      tyres.forEach(t => {
        csvContent += `${t.truck.plate_number},${t.serial_number},${t.position},${t.status},${t.install_odometer},${new Date(t.install_date).toLocaleDateString()}\n`;
      });
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fleet_${activeSegment}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Operational Analytics & Logs</h2>
          <p className="text-xs text-[#666666] mt-0.5">Consolidated ledger for fleet maintenance, fuel refill costs, and tyres lifecycles.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 bg-white border border-[#EBEBEB] text-[#1A1A1A] hover:bg-gray-50 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider">Total Maintenance Bill</span>
            <p className="text-3xl font-extrabold text-[#1A1A1A]">₹{totalMaintenanceCost.toLocaleString()}</p>
            <p className="text-[10px] text-[#888888]">{maintenances.length} Service intervals logged</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <Wrench size={22} />
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider">Total Fuel Refills</span>
            <p className="text-3xl font-extrabold text-[#1A1A1A]">₹{totalFuelCost.toLocaleString()}</p>
            <p className="text-[10px] text-[#888888]">{totalLitersRefilled.toFixed(1)} Liters consumed</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Fuel size={22} />
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider">Active Tyre Sets</span>
            <p className="text-3xl font-extrabold text-[#1A1A1A]">{tyres.length}</p>
            <p className="text-[10px] text-[#137333] font-semibold flex items-center">
              <TrendingDown size={12} className="mr-1" /> Worn tyre alerts active
            </p>
          </div>
          <div className="w-12 h-12 bg-green-50 text-[#137333] rounded-2xl flex items-center justify-center">
            <Disc size={22} />
          </div>
        </div>
      </div>

      {/* Segment Selector & Search */}
      <div className="bg-white border border-[#EBEBEB] rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex space-x-1.5 bg-[#FAFAFA] p-1 border border-[#EBEBEB] rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveSegment('maintenance')}
            className={`px-4 py-2 rounded-lg transition ${
              activeSegment === 'maintenance' ? 'bg-white text-[#1A1A1A] shadow-xs' : 'text-[#666666]'
            }`}
          >
            Servicing
          </button>
          <button
            onClick={() => setActiveSegment('fuel')}
            className={`px-4 py-2 rounded-lg transition ${
              activeSegment === 'fuel' ? 'bg-white text-[#1A1A1A] shadow-xs' : 'text-[#666666]'
            }`}
          >
            Fuel Logs
          </button>
          <button
            onClick={() => setActiveSegment('tyres')}
            className={`px-4 py-2 rounded-lg transition ${
              activeSegment === 'tyres' ? 'bg-white text-[#1A1A1A] shadow-xs' : 'text-[#666666]'
            }`}
          >
            Tyres Check
          </button>
        </div>

        <div className="relative w-80">
          <Search size={16} className="absolute left-3.5 top-3 text-[#888888]" />
          <input
            type="text"
            placeholder="Search by license plate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#FAFAFA] border border-[#EBEBEB] pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#2563EB]"
          />
        </div>
      </div>

      {/* Main Table logs */}
      <div className="bg-white border border-[#EBEBEB] rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#888888] font-semibold animate-pulse">
            Loading operational logs...
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeSegment === 'maintenance' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-[#EBEBEB] text-[#666666] font-semibold">
                    <th className="px-6 py-4">Vehicle Plate</th>
                    <th className="px-6 py-4">Service Description</th>
                    <th className="px-6 py-4">Cost</th>
                    <th className="px-6 py-4">Odometer Reading</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEBEB]">
                  {maintenances
                    .filter(m => m.truck.plate_number.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((m) => (
                      <tr key={m.id} className="hover:bg-[#FAFAFA]/50 transition">
                        <td className="px-6 py-4 font-bold text-[#1A1A1A] uppercase">{m.truck.plate_number}</td>
                        <td className="px-6 py-4 text-[#1A1A1A] font-medium">{m.description}</td>
                        <td className="px-6 py-4 font-bold text-[#1A1A1A]">₹{Number(m.cost).toLocaleString()}</td>
                        <td className="px-6 py-4 font-medium text-[#666666]">{m.odometer.toLocaleString()} KM</td>
                        <td className="px-6 py-4 text-[#888888]">{new Date(m.maintenance_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeSegment === 'fuel' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-[#EBEBEB] text-[#666666] font-semibold">
                    <th className="px-6 py-4">Vehicle Plate</th>
                    <th className="px-6 py-4">Quantity Refilled</th>
                    <th className="px-6 py-4">Cost</th>
                    <th className="px-6 py-4">Odometer</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Station Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEBEB]">
                  {fuels
                    .filter(f => f.truck.plate_number.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((f) => (
                      <tr key={f.id} className="hover:bg-[#FAFAFA]/50 transition">
                        <td className="px-6 py-4 font-bold text-[#1A1A1A] uppercase">{f.truck.plate_number}</td>
                        <td className="px-6 py-4 text-[#1A1A1A] font-semibold">{Number(f.fuel_quantity_liters).toFixed(1)} Liters</td>
                        <td className="px-6 py-4 font-bold text-[#1A1A1A]">₹{Number(f.cost).toLocaleString()}</td>
                        <td className="px-6 py-4 font-medium text-[#666666]">{f.odometer.toLocaleString()} KM</td>
                        <td className="px-6 py-4 text-[#888888]">{new Date(f.fuel_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-[#666666] font-medium">{f.location || 'N/A'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeSegment === 'tyres' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-[#EBEBEB] text-[#666666] font-semibold">
                    <th className="px-6 py-4">Vehicle Plate</th>
                    <th className="px-6 py-4">Tyre Serial</th>
                    <th className="px-6 py-4">Position</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Installed Odometer</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEBEB]">
                  {tyres
                    .filter(t => t.truck.plate_number.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-[#FAFAFA]/50 transition">
                        <td className="px-6 py-4 font-bold text-[#1A1A1A] uppercase">{t.truck.plate_number}</td>
                        <td className="px-6 py-4 text-[#1A1A1A] font-semibold uppercase">{t.serial_number}</td>
                        <td className="px-6 py-4 text-[#666666] font-medium">{t.position}</td>
                        <td className="px-6 py-4 text-[#2563EB] font-bold uppercase">{t.status}</td>
                        <td className="px-6 py-4 text-[#666666] font-medium">{t.install_odometer.toLocaleString()} KM</td>
                        <td className="px-6 py-4 text-[#888888]">{new Date(t.install_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

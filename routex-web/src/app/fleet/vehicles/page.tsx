'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import {
  Truck,
  Search,
  Plus,
  Trash2,
  Edit2,
  X,
  FileText,
  Activity,
  Fuel,
  Settings,
  AlertCircle,
  FileUp,
} from 'lucide-react';

interface VehicleLog {
  id: string;
  plate_number: string;
  model_name: string;
  brand: string;
  type: string;
  payload_capacity_kg: number;
  volumetric_capacity_cft?: number;
  fuel_type: string;
  status: string;
  is_verified: boolean;
}

interface MaintenanceRecord {
  id: string;
  description: string;
  cost: number;
  maintenance_date: string;
  status: string;
  odometer: number;
}

interface FuelRecord {
  id: string;
  fuel_quantity_liters: number;
  cost: number;
  odometer: number;
  fuel_date: string;
  location?: string;
}

interface TyreRecord {
  id: string;
  serial_number: string;
  position: string;
  status: string;
  install_date: string;
  install_odometer: number;
}

interface DocumentRecord {
  id: string;
  type: string;
  document_number: string;
  file_url: string;
  expiry_date?: string;
}

export default function FleetVehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleLog[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLog | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Tabs for details drawer
  const [activeTab, setActiveTab] = useState<'maintenance' | 'fuel' | 'tyres' | 'docs'>('maintenance');

  // Logs state
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [fuels, setFuels] = useState<FuelRecord[]>([]);
  const [tyres, setTyres] = useState<TyreRecord[]>([]);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);

  // Modals state
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Vehicle Form Fields
  const [plateNo, setPlateNo] = useState('');
  const [modelName, setModelName] = useState('');
  const [brand, setBrand] = useState('');
  const [type, setType] = useState('container');
  const [payload, setPayload] = useState(7500);
  const [volume, setVolume] = useState(450);
  const [fuelType, setFuelType] = useState('Diesel');

  // Maintenance Log Form Fields
  const [mDesc, setMDesc] = useState('');
  const [mCost, setMCost] = useState(0);
  const [mDate, setMDate] = useState('');
  const [mStatus, setMStatus] = useState('completed');
  const [mOdometer, setMOdometer] = useState(0);

  // Fuel Log Form Fields
  const [fQuantity, setFQuantity] = useState(0);
  const [fCost, setFCost] = useState(0);
  const [fDate, setFDate] = useState('');
  const [fOdometer, setFOdometer] = useState(0);
  const [fLocation, setFLocation] = useState('');

  // Tyre Log Form Fields
  const [tSerial, setTSerial] = useState('');
  const [tPosition, setTPosition] = useState('Front Left');
  const [tStatus, setTStatus] = useState('new');
  const [tDate, setTDate] = useState('');
  const [tOdometer, setTOdometer] = useState(0);

  // Document Upload Form Fields
  const [dType, setDType] = useState('truck_rc');
  const [dNumber, setDNumber] = useState('');
  const [dUrl, setDUrl] = useState('https://supabase.co/storage/document.pdf');
  const [dExpiry, setDExpiry] = useState('');

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/fleet/trucks');
      setVehicles(res.data || []);
    } catch (err) {
      console.error('Failed to load fleet:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async (truckId: string) => {
    try {
      const mRes = await api.get(`/api/fleet/maintenance?truckId=${truckId}`);
      setMaintenances(mRes.data || []);

      const fRes = await api.get(`/api/fleet/fuel?truckId=${truckId}`);
      setFuels(fRes.data || []);

      const tRes = await api.get(`/api/fleet/tyres?truckId=${truckId}`);
      setTyres(tRes.data || []);

      const dRes = await api.get(`/api/fleet/documents?truckId=${truckId}`);
      setDocs(dRes.data || []);
    } catch (err) {
      console.error('Failed to load vehicle operational logs:', err);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const openAddVehicleModal = () => {
    setSelectedVehicle(null);
    setPlateNo('');
    setModelName('');
    setBrand('');
    setType('container');
    setPayload(7500);
    setVolume(450);
    setFuelType('Diesel');
    setIsVehicleModalOpen(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedVehicle) {
        await api.put(`/api/fleet/trucks/${selectedVehicle.id}`, {
          model_name: modelName,
          brand,
          type,
          payload_capacity_kg: Number(payload),
          volumetric_capacity_cft: Number(volume),
          fuel_type: fuelType,
        });
      } else {
        await api.post('/api/fleet/trucks', {
          plate_number: plateNo,
          model_name: modelName,
          brand,
          type,
          payload_capacity_kg: Number(payload),
          volumetric_capacity_cft: Number(volume),
          fuel_type: fuelType,
        });
      }
      setIsVehicleModalOpen(false);
      fetchVehicles();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save vehicle.');
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Are you sure you want to retire this vehicle?')) return;
    try {
      await api.delete(`/api/fleet/trucks/${id}`);
      setSelectedVehicle(null);
      fetchVehicles();
    } catch (err) {
      console.error('Failed to delete truck:', err);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    try {
      if (activeTab === 'maintenance') {
        await api.post('/api/fleet/maintenance', {
          truck_id: selectedVehicle.id,
          description: mDesc,
          cost: Number(mCost),
          maintenance_date: mDate,
          status: mStatus,
          odometer: Number(mOdometer),
        });
        setMDesc('');
        setMCost(0);
        setMDate('');
        setMOdometer(0);
      } else if (activeTab === 'fuel') {
        await api.post('/api/fleet/fuel', {
          truck_id: selectedVehicle.id,
          fuel_quantity_liters: Number(fQuantity),
          cost: Number(fCost),
          odometer: Number(fOdometer),
          fuel_date: fDate,
          location: fLocation,
        });
        setFQuantity(0);
        setFCost(0);
        setFDate('');
        setFOdometer(0);
        setFLocation('');
      } else if (activeTab === 'tyres') {
        await api.post('/api/fleet/tyres', {
          truck_id: selectedVehicle.id,
          serial_number: tSerial,
          position: tPosition,
          status: tStatus,
          install_date: tDate,
          install_odometer: Number(tOdometer),
        });
        setTSerial('');
        setTDate('');
        setTOdometer(0);
      } else if (activeTab === 'docs') {
        await api.post('/api/fleet/documents', {
          truck_id: selectedVehicle.id,
          type: dType,
          document_number: dNumber,
          file_url: dUrl,
          expiry_date: dExpiry || undefined,
        });
        setDNumber('');
        setDExpiry('');
      }
      setIsLogModalOpen(false);
      fetchLogs(selectedVehicle.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit log entry.');
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    const search = searchTerm.toLowerCase();
    return (
      v.plate_number.toLowerCase().includes(search) ||
      v.model_name.toLowerCase().includes(search) ||
      v.brand.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Vehicles Fleet</h2>
          <p className="text-xs text-[#666666] mt-0.5">Register container trucks, logistics assets, and track servicing logs.</p>
        </div>
        <button
          onClick={openAddVehicleModal}
          className="flex items-center space-x-2 bg-[#2563EB] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
        >
          <Plus size={16} />
          <span>Register Vehicle</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-white border border-[#EBEBEB] rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div className="relative w-80">
          <Search size={16} className="absolute left-3.5 top-3 text-[#888888]" />
          <input
            type="text"
            placeholder="Search license plate, brand, model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#FAFAFA] border border-[#EBEBEB] pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#2563EB]"
          />
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Vehicles Table Card */}
        <div className="lg:col-span-2 bg-white border border-[#EBEBEB] rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-[#888888] font-semibold animate-pulse">
              Loading vehicles list...
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#888888]">
              No vehicles registered yet. Add your first truck.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-[#EBEBEB] text-[#666666] font-semibold">
                    <th className="px-6 py-4">Plate No</th>
                    <th className="px-6 py-4">Vehicle Details</th>
                    <th className="px-6 py-4">Capacity</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEBEB]">
                  {filteredVehicles.map((truck) => (
                    <tr
                      key={truck.id}
                      onClick={() => {
                        setSelectedVehicle(truck);
                        fetchLogs(truck.id);
                      }}
                      className={`hover:bg-[#FAFAFA]/50 transition cursor-pointer ${
                        selectedVehicle?.id === truck.id ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-bold text-[#1A1A1A] uppercase">
                        {truck.plate_number}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[#1A1A1A] font-bold">{truck.brand} {truck.model_name}</p>
                        <span className="text-[10px] text-[#888888] uppercase">{truck.type.replace(/_/g, ' ')} • {truck.fuel_type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[#1A1A1A] font-medium">{(truck.payload_capacity_kg / 1000).toFixed(1)} Tons</p>
                        <span className="text-[10px] text-[#888888]">{truck.volumetric_capacity_cft || 0} CFT Volume</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 font-bold uppercase rounded-full text-[9px] ${
                          truck.status.toLowerCase() === 'available'
                            ? 'bg-[#E6F4EA] text-[#137333]'
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                          {truck.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedVehicle(truck);
                            setModelName(truck.model_name);
                            setBrand(truck.brand);
                            setType(truck.type);
                            setPayload(truck.payload_capacity_kg);
                            setVolume(Number(truck.volumetric_capacity_cft || 0));
                            setFuelType(truck.fuel_type);
                            setIsVehicleModalOpen(true);
                          }}
                          className="p-1.5 text-[#666666] hover:text-[#1A1A1A] hover:bg-[#FAFAFA] rounded-lg transition cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteVehicle(truck.id)}
                          className="p-1.5 text-[#FF4D4D] hover:text-red-700 hover:bg-[#FFF5F5] rounded-lg transition cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Drawer: Operations Log Tabs */}
        {selectedVehicle ? (
          <div className="bg-white border border-[#EBEBEB] rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-4">
              <div>
                <span className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">Asset Logs</span>
                <h3 className="font-extrabold text-sm text-[#1A1A1A] uppercase">{selectedVehicle.plate_number}</h3>
              </div>
              <button
                onClick={() => setIsLogModalOpen(true)}
                className="flex items-center space-x-1.5 bg-[#FAFAFA] border border-[#EBEBEB] text-[#1A1A1A] hover:bg-gray-100 px-3 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer"
              >
                <Plus size={12} />
                <span>Add Record</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#EBEBEB] text-xs font-semibold">
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`flex-1 pb-2 border-b-2 text-center transition ${
                  activeTab === 'maintenance' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#666666]'
                }`}
              >
                Servicing
              </button>
              <button
                onClick={() => setActiveTab('fuel')}
                className={`flex-1 pb-2 border-b-2 text-center transition ${
                  activeTab === 'fuel' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#666666]'
                }`}
              >
                Fuel
              </button>
              <button
                onClick={() => setActiveTab('tyres')}
                className={`flex-1 pb-2 border-b-2 text-center transition ${
                  activeTab === 'tyres' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#666666]'
                }`}
              >
                Tyres
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`flex-1 pb-2 border-b-2 text-center transition ${
                  activeTab === 'docs' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#666666]'
                }`}
              >
                Vault
              </button>
            </div>

            {/* Tab Panels */}
            <div className="max-h-[300px] overflow-y-auto space-y-4">
              {activeTab === 'maintenance' && (
                maintenances.length === 0 ? (
                  <p className="text-center py-8 text-[11px] text-[#888888]">No service records completed.</p>
                ) : (
                  maintenances.map((m) => (
                    <div key={m.id} className="border-b border-[#EBEBEB] pb-3 last:border-0 flex justify-between text-[11px]">
                      <div>
                        <p className="font-bold text-[#1A1A1A]">{m.description}</p>
                        <span className="text-[10px] text-[#888888]">{new Date(m.maintenance_date).toLocaleDateString()} • {m.odometer.toLocaleString()} km</span>
                      </div>
                      <span className="font-bold text-[#1A1A1A]">₹{Number(m.cost).toLocaleString()}</span>
                    </div>
                  ))
                )
              )}

              {activeTab === 'fuel' && (
                fuels.length === 0 ? (
                  <p className="text-center py-8 text-[11px] text-[#888888]">No fuel logs registered.</p>
                ) : (
                  fuels.map((f) => (
                    <div key={f.id} className="border-b border-[#EBEBEB] pb-3 last:border-0 flex justify-between text-[11px]">
                      <div>
                        <p className="font-bold text-[#1A1A1A]">{Number(f.fuel_quantity_liters).toFixed(1)} Liters Refill</p>
                        <span className="text-[10px] text-[#888888]">{new Date(f.fuel_date).toLocaleDateString()} • {f.odometer.toLocaleString()} km</span>
                      </div>
                      <span className="font-bold text-[#1A1A1A]">₹{Number(f.cost).toLocaleString()}</span>
                    </div>
                  ))
                )
              )}

              {activeTab === 'tyres' && (
                tyres.length === 0 ? (
                  <p className="text-center py-8 text-[11px] text-[#888888]">No tyre checkups logged.</p>
                ) : (
                  tyres.map((t) => (
                    <div key={t.id} className="border-b border-[#EBEBEB] pb-3 last:border-0 flex justify-between text-[11px]">
                      <div>
                        <p className="font-bold text-[#1A1A1A]">{t.position} - {t.serial_number}</p>
                        <span className="text-[10px] text-[#888888]">Installed at {t.install_odometer.toLocaleString()} km</span>
                      </div>
                      <span className="font-bold text-blue-600 uppercase tracking-wider">{t.status}</span>
                    </div>
                  ))
                )
              )}

              {activeTab === 'docs' && (
                docs.length === 0 ? (
                  <p className="text-center py-8 text-[11px] text-[#888888]">No documents uploaded.</p>
                ) : (
                  docs.map((d) => (
                    <div key={d.id} className="border-b border-[#EBEBEB] pb-3 last:border-0 flex items-center justify-between text-[11px]">
                      <div className="flex items-center space-x-2">
                        <FileText size={16} className="text-[#666666]" />
                        <div>
                          <p className="font-bold text-[#1A1A1A] uppercase">{d.type.replace(/_/g, ' ')}</p>
                          <span className="text-[9px] text-[#888888]">No: {d.document_number} {d.expiry_date ? `• Exp: ${new Date(d.expiry_date).toLocaleDateString()}` : ''}</span>
                        </div>
                      </div>
                      <a href={d.file_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-[#2563EB] hover:underline">View</a>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#EBEBEB] rounded-2xl shadow-sm p-12 text-center text-xs text-[#888888]">
            <AlertCircle size={28} className="mx-auto mb-2 text-[#888888]" />
            <span>Select a vehicle to inspect operations logs, maintenance history, and documents vault.</span>
          </div>
        )}
      </div>

      {/* Register Vehicle Modal */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white border border-[#EBEBEB] rounded-2xl w-[500px] shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
                {selectedVehicle ? 'Edit Vehicle Profile' : 'Register New Vehicle'}
              </h3>
              <button onClick={() => setIsVehicleModalOpen(false)} className="text-[#666666] hover:text-[#1A1A1A] p-1 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="space-y-4 text-xs font-semibold text-[#666666]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label>Plate Number</label>
                  <input
                    type="text"
                    required
                    disabled={!!selectedVehicle}
                    value={plateNo}
                    onChange={(e) => setPlateNo(e.target.value)}
                    placeholder="MH 12 QW 3456"
                    className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div className="space-y-1">
                  <label>Brand</label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Tata / BharatBenz"
                    className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label>Model Name</label>
                  <input
                    type="text"
                    required
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="LPT 1109"
                    className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div className="space-y-1">
                  <label>Fuel Type</label>
                  <input
                    type="text"
                    required
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label>Truck Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="container">Container</option>
                    <option value="flatbed">Flatbed</option>
                    <option value="refrigerated">Refrigerated</option>
                    <option value="open_body">Open Body</option>
                    <option value="trailer">Trailer</option>
                    <option value="tipper">Tipper</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label>Payload (KG)</label>
                  <input
                    type="number"
                    required
                    value={payload}
                    onChange={(e) => setPayload(Number(e.target.value))}
                    className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div className="space-y-1">
                  <label>Volume (CFT)</label>
                  <input
                    type="number"
                    required
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#EBEBEB]">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="bg-[#FAFAFA] border border-[#EBEBEB] px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#2563EB] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Log Record Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white border border-[#EBEBEB] rounded-2xl w-[500px] shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
                Add {activeTab.toUpperCase()} Log Record
              </h3>
              <button onClick={() => setIsLogModalOpen(false)} className="text-[#666666] hover:text-[#1A1A1A] p-1 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddLog} className="space-y-4 text-xs font-semibold text-[#666666]">
              {activeTab === 'maintenance' && (
                <>
                  <div className="space-y-1">
                    <label>Description of Service</label>
                    <input
                      type="text"
                      required
                      value={mDesc}
                      onChange={(e) => setMDesc(e.target.value)}
                      placeholder="E.g., Brake Pad Replacement"
                      className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label>Cost (INR)</label>
                      <input
                        type="number"
                        required
                        value={mCost}
                        onChange={(e) => setMCost(Number(e.target.value))}
                        className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Odometer Reading (KM)</label>
                      <input
                        type="number"
                        required
                        value={mOdometer}
                        onChange={(e) => setMOdometer(Number(e.target.value))}
                        className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label>Date of Service</label>
                    <input
                      type="date"
                      required
                      value={mDate}
                      onChange={(e) => setMDate(e.target.value)}
                      className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </>
              )}

              {activeTab === 'fuel' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label>Fuel Refilled (Liters)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={fQuantity}
                        onChange={(e) => setFQuantity(Number(e.target.value))}
                        className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Cost (INR)</label>
                      <input
                        type="number"
                        required
                        value={fCost}
                        onChange={(e) => setFCost(Number(e.target.value))}
                        className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label>Odometer Reading (KM)</label>
                      <input
                        type="number"
                        required
                        value={fOdometer}
                        onChange={(e) => setFOdometer(Number(e.target.value))}
                        className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Refill Date</label>
                      <input
                        type="date"
                        required
                        value={fDate}
                        onChange={(e) => setFDate(e.target.value)}
                        className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label>Station Location</label>
                    <input
                      type="text"
                      value={fLocation}
                      onChange={(e) => setFLocation(e.target.value)}
                      placeholder="E.g., Bharat Petroleum, Pune Highway"
                      className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </>
              )}

              {activeTab === 'tyres' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label>Tyre Serial Number</label>
                      <input
                        type="text"
                        required
                        value={tSerial}
                        onChange={(e) => setTSerial(e.target.value)}
                        placeholder="TYR-998822"
                        className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Odometer Reading (KM)</label>
                      <input
                        type="number"
                        required
                        value={tOdometer}
                        onChange={(e) => setTOdometer(Number(e.target.value))}
                        className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label>Position</label>
                      <select
                        value={tPosition}
                        onChange={(e) => setTPosition(e.target.value)}
                        className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                      >
                        <option value="Front Left">Front Left</option>
                        <option value="Front Right">Front Right</option>
                        <option value="Rear Left Outer">Rear Left Outer</option>
                        <option value="Rear Left Inner">Rear Left Inner</option>
                        <option value="Rear Right Outer">Rear Right Outer</option>
                        <option value="Rear Right Inner">Rear Right Inner</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label>Install Date</label>
                      <input
                        type="date"
                        required
                        value={tDate}
                        onChange={(e) => setTDate(e.target.value)}
                        className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'docs' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label>Document Category</label>
                      <select
                        value={dType}
                        onChange={(e) => setDType(e.target.value)}
                        className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                      >
                        <option value="truck_rc">Registration Certificate (RC)</option>
                        <option value="truck_insurance">Insurance Policy</option>
                        <option value="gst_certificate">Permit Certificate</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label>Document Number</label>
                      <input
                        type="text"
                        required
                        value={dNumber}
                        onChange={(e) => setDNumber(e.target.value)}
                        placeholder="RC-998827"
                        className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label>Expiry Date</label>
                    <input
                      type="date"
                      value={dExpiry}
                      onChange={(e) => setDExpiry(e.target.value)}
                      className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Attachment URL</label>
                    <input
                      type="text"
                      required
                      value={dUrl}
                      onChange={(e) => setDUrl(e.target.value)}
                      className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#EBEBEB]">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="bg-[#FAFAFA] border border-[#EBEBEB] px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#2563EB] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                >
                  Submit Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

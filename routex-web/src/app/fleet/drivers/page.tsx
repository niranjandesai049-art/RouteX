'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface DriverProfile {
  id: string;
  license_number: string;
  license_expiry: string;
  years_of_experience: number;
  status: string;
  verification_state: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
  };
}

export default function FleetDriversPage() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DriverProfile | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [experience, setExperience] = useState(0);

  const fetchDrivers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/fleet/drivers');
      setDrivers(res.data || []);
    } catch (err) {
      console.error('Failed to load drivers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const openAddModal = () => {
    setSelectedDriver(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setLicenseNo('');
    setLicenseExpiry('');
    setExperience(0);
    setIsModalOpen(true);
  };

  const openEditModal = (driver: DriverProfile) => {
    setSelectedDriver(driver);
    setFirstName(driver.profiles.first_name);
    setLastName(driver.profiles.last_name);
    setEmail(driver.profiles.email);
    setPhone(driver.profiles.phone_number || '');
    setLicenseNo(driver.license_number);
    setLicenseExpiry(driver.license_expiry.split('T')[0]);
    setExperience(driver.years_of_experience);
    setIsModalOpen(true);
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedDriver) {
        // Edit flow
        await api.put(`/api/fleet/drivers/${selectedDriver.id}`, {
          first_name: firstName,
          last_name: lastName,
          license_number: licenseNo,
          license_expiry: licenseExpiry,
          years_of_experience: Number(experience),
        });
      } else {
        // Add flow
        await api.post('/api/fleet/drivers', {
          first_name: firstName,
          last_name: lastName,
          email,
          phone_number: phone,
          license_number: licenseNo,
          license_expiry: licenseExpiry,
          years_of_experience: Number(experience),
        });
      }
      setIsModalOpen(false);
      fetchDrivers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save driver profile.');
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (!confirm('Are you sure you want to remove this driver profile?')) return;
    try {
      await api.delete(`/api/fleet/drivers/${id}`);
      fetchDrivers();
    } catch (err) {
      console.error('Failed to delete driver:', err);
    }
  };

  const filteredDrivers = drivers.filter((d) => {
    const fullName = `${d.profiles?.first_name} ${d.profiles?.last_name}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return (
      fullName.includes(search) ||
      d.license_number.toLowerCase().includes(search) ||
      (d.profiles?.phone_number && d.profiles.phone_number.includes(search))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Drivers Roster</h2>
          <p className="text-xs text-[#666666] mt-0.5">Manage operator credentials, compliance certificates, and statuses.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 bg-[#2563EB] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
        >
          <Plus size={16} />
          <span>Register Driver</span>
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white border border-[#EBEBEB] rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div className="relative w-80">
          <Search size={16} className="absolute left-3.5 top-3 text-[#888888]" />
          <input
            type="text"
            placeholder="Search driver name, license, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#FAFAFA] border border-[#EBEBEB] pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#2563EB]"
          />
        </div>
      </div>

      {/* Drivers List Card */}
      <div className="bg-white border border-[#EBEBEB] rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#888888] font-semibold animate-pulse">
            Loading drivers roster...
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#888888]">
            No drivers found. Register a new operator to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#EBEBEB] text-[#666666] font-semibold">
                  <th className="px-6 py-4">Driver Name</th>
                  <th className="px-6 py-4">Contact Info</th>
                  <th className="px-6 py-4">License / Expiry</th>
                  <th className="px-6 py-4">Experience</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEBEB]">
                {filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-[#FAFAFA]/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-[#666666] text-xs">
                          {driver.profiles.first_name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-[#1A1A1A]">
                            {driver.profiles.first_name} {driver.profiles.last_name}
                          </p>
                          <span className="text-[10px] text-[#888888] flex items-center">
                            <ShieldCheck size={11} className="text-green-600 mr-0.5" /> ID Verified
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[#1A1A1A] font-medium">{driver.profiles.email}</p>
                      <span className="text-[10px] text-[#888888]">{driver.profiles.phone_number || 'No Phone'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[#1A1A1A] font-medium uppercase">{driver.license_number}</p>
                      <span className="text-[10px] text-[#888888] flex items-center">
                        <Clock size={11} className="mr-0.5" /> Exp: {new Date(driver.license_expiry).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#1A1A1A] font-semibold">
                      {driver.years_of_experience} Years
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 font-bold uppercase rounded-full text-[9px] ${
                        driver.status.toLowerCase() === 'available'
                          ? 'bg-[#E6F4EA] text-[#137333]'
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        {driver.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(driver)}
                        className="p-1.5 text-[#666666] hover:text-[#1A1A1A] hover:bg-[#FAFAFA] rounded-lg transition cursor-pointer"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteDriver(driver.id)}
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

      {/* Add / Edit Driver Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white border border-[#EBEBEB] rounded-2xl w-[500px] shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
                {selectedDriver ? 'Edit Driver Profile' : 'Register New Operator'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#666666] hover:text-[#1A1A1A] p-1 rounded-lg transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="space-y-4 text-xs font-semibold text-[#666666]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label>First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div className="space-y-1">
                  <label>Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {!selectedDriver && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label>Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label>License Number</label>
                  <input
                    type="text"
                    required
                    value={licenseNo}
                    onChange={(e) => setLicenseNo(e.target.value)}
                    className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div className="space-y-1">
                  <label>License Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={licenseExpiry}
                    onChange={(e) => setLicenseExpiry(e.target.value)}
                    className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label>Years of Experience</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={experience}
                  onChange={(e) => setExperience(Number(e.target.value))}
                  className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#EBEBEB]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-[#FAFAFA] border border-[#EBEBEB] px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#2563EB] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

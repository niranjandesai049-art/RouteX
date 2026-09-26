'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Plus, Wallet, MapPin, Truck, Calendar, FileText, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import { ShipmentMap } from './maps/MapLoader';
import { api } from '../lib/api';

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
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    }
  } catch (err: any) {
    console.warn('Geocoding fetch failed, using fallback:', err.message);
  }
  
  return [28.6139, 77.2090];
};

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
  material?: string;
}

interface ShipperPortalProps {
  shipments: Shipment[];
  onAddShipment: (newShipment: Omit<Shipment, 'id' | 'status' | 'delayPredicted'> & { distanceKm?: number; material?: string }) => void;
  walletBalance: number;
}

export default function ShipperPortal({ shipments, onAddShipment, walletBalance }: ShipperPortalProps) {
  const [isGstVerified, setIsGstVerified] = useState(false);
  const [gstNo, setGstNo] = useState('');
  
  // Booking Form State
  const [pickup, setPickup] = useState('');
  const [dest, setDest] = useState('');
  const [weight, setWeight] = useState('');
  const [truckType, setTruckType] = useState('Bolero Pickup');
  const [material, setMaterial] = useState('');

  // AI Predictions
  const [aiPrice, setAiPrice] = useState<number | null>(null);
  const [aiDelay, setAiDelay] = useState<number | null>(null);
  const [aiDistance, setAiDistance] = useState<number | null>(null);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [aiBreakdown, setAiBreakdown] = useState<any | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [recommendedTruck, setRecommendedTruck] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleVerifyGst = (e: React.FormEvent) => {
    e.preventDefault();
    if (gstNo.length === 15) {
      setIsGstVerified(true);
    }
  };

  const fetchAiPricing = async (
    p: string,
    d: string,
    w: number,
    t: string,
    m: string,
    activeCheck = () => true
  ) => {
    try {
      setIsLoadingAi(true);
      setAiError(null);

      const pCoords = await geocodeAddressAsync(p);
      const dCoords = await geocodeAddressAsync(d);
      
      let distanceKm = 15;
      try {
        const osrmRes = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${pCoords[1]},${pCoords[0]};${dCoords[1]},${dCoords[0]}?overview=false`
        );
        if (osrmRes.ok) {
          const osrmData = await osrmRes.json();
          if (osrmData.routes && osrmData.routes[0]) {
            distanceKm = Math.round(osrmData.routes[0].distance / 1000);
          }
        }
      } catch {
        // Fallback distance calculation
        distanceKm = 15;
      }

      if (!activeCheck()) return;
      setAiDistance(distanceKm);

      const pricingRes = await api.post('/ai/pricing', {
        pickup: p,
        destination: d,
        distanceKm,
        weightTons: w,
        truckCategory: t,
        material: m || 'General Cargo',
        weather: 'Sunny',
        fuelPrice: 94.5,
        demandLevel: 'High'
      });

      if (activeCheck() && pricingRes.data) {
        const data = pricingRes.data;
        setAiPrice(data.estimatedPrice);
        setAiDelay(data.etaMinutes);
        setAiReason(data.reason);
        setAiBreakdown(data.pricingBreakdown);
        setAiConfidence(data.confidence);
        setRecommendedTruck(data.recommendedTruck || null);
        setAiError(null);
      }
    } catch (err: any) {
      console.error('Failed to calculate rate:', err);
      if (activeCheck()) {
        const msg = err.response?.data?.message || err.message || 'AI pricing calculation failed';
        setAiError(typeof msg === 'string' ? msg : 'Unable to calculate AI rate');
        setAiPrice(null);
      }
    } finally {
      if (activeCheck()) {
        setIsLoadingAi(false);
      }
    }
  };

  useEffect(() => {
    const parsedWeight = parseFloat(weight);
    if (!pickup || !dest || !weight || isNaN(parsedWeight) || parsedWeight <= 0 || !truckType) {
      setAiPrice(null);
      setAiDelay(null);
      setAiDistance(null);
      setAiReason(null);
      setAiBreakdown(null);
      setAiConfidence(null);
      setRecommendedTruck(null);
      setAiError(null);
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      fetchAiPricing(pickup, dest, parsedWeight, truckType, material, () => active);
    }, 600);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pickup, dest, weight, truckType, material]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedWeight = parseFloat(weight);
    if (!pickup || !dest || !weight || isNaN(parsedWeight) || parsedWeight <= 0) {
      alert('Please enter a valid weight greater than 0.');
      return;
    }

    const baseRates: Record<string, number> = {
      'Tata Ace': 16, 'Bolero Pickup': 21, 'LCV': 30, 'HCV': 48, 'Trailer': 68, 'Container': 58
    };
    const distance = aiDistance || 15;
    const rate = baseRates[truckType] || 25;
    const price = aiPrice && aiPrice > 0 ? aiPrice : Math.max(650, Math.round(distance * rate));

    onAddShipment({
      pickup,
      destination: dest,
      price,
      truckType,
      weight: `${weight} Tons`,
      distanceKm: distance,
      material: material || 'General Cargo',
    });

    // Reset Form
    setPickup('');
    setDest('');
    setWeight('');
    setMaterial('');
    setAiPrice(null);
    setAiDelay(null);
    setAiDistance(null);
    setAiReason(null);
    setAiBreakdown(null);
    setAiConfidence(null);
    setRecommendedTruck(null);
    setAiError(null);
  };

  return (
    <div className="bg-[#F5F5F5] min-h-screen text-gray-900 font-sans p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Booking Form and Onboarding */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* KYC Status / GST Verification */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">GST Onboarding</h3>
              {isGstVerified ? (
                <span className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-semibold">
                  <ShieldCheck size={14} className="mr-1" /> Verified
                </span>
              ) : (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-semibold">Verification Pending</span>
              )}
            </div>
            
            {!isGstVerified ? (
              <form onSubmit={handleVerifyGst} className="space-y-3">
                <input 
                  type="text" 
                  value={gstNo} 
                  onChange={(e) => setGstNo(e.target.value.toUpperCase())}
                  placeholder="Enter 15-Digit GSTIN" 
                  maxLength={15}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm uppercase outline-none focus:border-blue-600 text-gray-900 bg-white"
                  required
                />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition">
                  Verify Company GST
                </button>
              </form>
            ) : (
              <div className="text-sm text-gray-500">
                <p className="font-semibold text-gray-800">RouteX Corporate ID: RX-CORP-9481</p>
                <p className="text-xs mt-1">Verified Legal Name: Mahindra Logistics Ltd.</p>
              </div>
            )}
          </div>

          {/* Book Truck Form */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center">
              <Plus className="mr-2 text-blue-600" size={20} /> Instant Load Booking
            </h3>
            
            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Pickup Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    placeholder="Pickup location (e.g. Sangli)" 
                    className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none shadow-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Destination</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    value={dest}
                    onChange={(e) => setDest(e.target.value)}
                    placeholder="Delivery location (e.g. Miraj)" 
                    className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Weight (Tons)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 5" 
                    className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Material Type</label>
                  <input 
                    type="text" 
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    placeholder="e.g. Steel" 
                    className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Truck Category</label>
                <select 
                  value={truckType}
                  onChange={(e) => setTruckType(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-sm text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none shadow-sm cursor-pointer"
                >
                  <option value="Tata Ace">Tata Ace (1.5T)</option>
                  <option value="Bolero Pickup">Bolero Pickup (2.5T)</option>
                  <option value="LCV">LCV (5T)</option>
                  <option value="HCV">HCV (16T)</option>
                  <option value="Trailer">Trailer (30T)</option>
                  <option value="Container">Container (20T)</option>
                </select>
              </div>

              {/* AI Cost and Delay Estimation */}
              {pickup && dest && (
                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 space-y-3">
                  {(!weight || parseFloat(weight) <= 0) ? (
                    <p className="text-xs text-amber-600 font-semibold flex items-center">
                      <AlertTriangle size={14} className="mr-1 text-amber-500" /> Enter weight greater than 0 to predict rate.
                    </p>
                  ) : isLoadingAi ? (
                    <div className="flex items-center justify-center py-4 space-x-2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-blue-700 animate-pulse">Running RouteX AI Pricing Engine (Groq)...</span>
                    </div>
                  ) : aiError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs space-y-1">
                      <p className="text-red-700 font-bold flex items-center">
                        <AlertTriangle size={14} className="mr-1 text-red-500" /> AI Pricing Unavailable
                      </p>
                      <p className="text-red-600">{aiError}</p>
                      <button
                        type="button"
                        onClick={() => {
                          const w = parseFloat(weight);
                          if (w > 0) fetchAiPricing(pickup, dest, w, truckType, material);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-bold text-[11px] underline mt-1 inline-block"
                      >
                        Retry AI Prediction
                      </button>
                    </div>
                  ) : aiPrice && aiPrice > 0 ? (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center text-blue-700 font-bold">
                          <TrendingUp size={14} className="mr-1" /> AI Rate Predictor (Groq-Llama)
                        </span>
                        {aiConfidence !== null && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-black">
                            {aiConfidence}% Match
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-baseline">
                        <span className="text-2xl font-extrabold text-blue-600">₹{aiPrice.toLocaleString()}</span>
                        {aiDelay !== null && (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded flex items-center font-semibold border border-amber-100">
                            <AlertTriangle size={12} className="mr-1 text-amber-600" /> Est. Transit: {aiDelay >= 60 ? `${Math.floor(aiDelay / 60)}h ${aiDelay % 60}m` : `${aiDelay} mins`}
                          </span>
                        )}
                      </div>

                      {recommendedTruck && recommendedTruck !== truckType && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[11px] text-amber-800">
                          <span className="font-bold">AI Recommendation:</span> Consider <span className="font-bold">{recommendedTruck}</span> for this {weight}T {material || 'cargo'} load.
                        </div>
                      )}

                      {aiBreakdown && (
                        <div className="border-t border-blue-100/70 pt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-medium text-slate-600">
                          <div className="flex justify-between">
                            <span>Dist. Cost ({aiDistance || 15} km):</span>
                            <span className="font-bold text-slate-800">₹{aiBreakdown.distanceCost}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fuel Surcharge:</span>
                            <span className="font-bold text-slate-800">₹{aiBreakdown.fuelCost}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Weather:</span>
                            <span className="font-bold text-slate-800">₹{aiBreakdown.weatherImpact}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Demand Surcharge:</span>
                            <span className="font-bold text-slate-800">x{aiBreakdown.demandMultiplier}</span>
                          </div>
                        </div>
                      )}

                      {aiReason && (
                        <p className="text-[10px] italic text-slate-600 border-t border-blue-100/70 pt-1.5 leading-relaxed font-medium">
                          &ldquo;{aiReason}&rdquo;
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Enter shipment details to calculate live AI rate.</p>
                  )}
                </div>
              )}

              <button 
                type="submit" 
                disabled={!pickup || !dest || !weight || parseFloat(weight) <= 0 || isLoadingAi}
                className={`w-full font-semibold py-3 rounded-lg text-sm transition ${
                  (!pickup || !dest || !weight || parseFloat(weight) <= 0 || isLoadingAi)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                }`}
              >
                {isLoadingAi ? 'Calculating AI Match...' : 'Find AI Best Match & Book'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Wallet and Shipments */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Top Row Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Prepaid Wallet Balance</span>
                <p className="text-3xl font-bold mt-1 text-gray-900">₹{walletBalance.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                <Wallet size={24} />
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Total Shipments (Active)</span>
                <p className="text-3xl font-bold mt-1 text-gray-900">{shipments.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                <Truck size={24} />
              </div>
            </div>
          </div>

          {/* Active Booking Card (OTP Display) */}
          {shipments.find(s => s.status === 'assigned' || s.status === 'at_pickup') && (
            (() => {
              const activeShip = shipments.find(s => s.status === 'assigned' || s.status === 'at_pickup')!;
              return (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl p-6 shadow-lg relative overflow-hidden mb-6">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mt-8"></div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded tracking-wider">Active Trip OTP</span>
                      <h4 className="text-lg font-extrabold mt-1">Trip Reference: {activeShip.id.substring(0, 8)}...</h4>
                      <p className="text-xs text-white/80 mt-1">Provide this pickup verification code to the driver upon vehicle arrival:</p>
                    </div>
                    <div className="bg-white text-blue-700 px-6 py-3 rounded-2xl font-black text-3xl tracking-widest text-center shadow-lg shadow-black/10">
                      {activeShip.pickupOtp || '----'}
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          {/* Shipment map tracking */}
          {shipments.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900">Live GPS Cargo Tracking</h3>
              <div className="h-64 rounded-xl overflow-hidden border border-gray-200 relative">
                <ShipmentMap shipment={shipments[0]} />
              </div>
            </div>
          )}

          {/* Shipment Table */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Active Shipments & Live Status</h3>
            </div>
            
            {shipments.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Truck size={48} className="mx-auto mb-4 text-gray-200" />
                <p>No active shipments. Book your first freight load using the form.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 text-xs">
                      <th className="p-4">TRIP ID</th>
                      <th className="p-4">ROUTE</th>
                      <th className="p-4">VEHICLE</th>
                      <th className="p-4">WEIGHT</th>
                      <th className="p-4">RATE</th>
                      <th className="p-4">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map(s => (
                      <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="p-4 font-bold text-blue-600">{s.id.substring(0, 8)}...</td>
                        <td className="p-4">
                          <div className="text-xs">
                            <p className="font-semibold text-gray-900"><span className="text-blue-500">Pick:</span> {s.pickup}</p>
                            {s.pickupOtp && (
                              <p className="inline-flex items-center my-1 px-2 py-0.5 bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-black rounded uppercase tracking-wider">
                                OTP: {s.pickupOtp}
                              </p>
                            )}
                            <p className="text-gray-500 mt-0.5"><span className="text-red-500">Drop:</span> {s.destination}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-semibold bg-gray-100 px-2.5 py-1 rounded text-gray-700">{s.truckType}</span>
                        </td>
                        <td className="p-4 text-gray-600">{s.weight}</td>
                        <td className="p-4 font-bold text-gray-900">₹{s.price.toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${
                            s.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                            s.status === 'ACCEPTED' ? 'bg-blue-50 text-blue-700' :
                            s.status === 'DELIVERED' ? 'bg-green-50 text-green-700' :
                            'bg-indigo-50 text-indigo-700'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { MapPin, Truck, TrendingUp, AlertTriangle, Plus, Trash2, ArrowRight, RefreshCw } from 'lucide-react';
import { bookingsService } from '../../../services/bookings.service';
import { api } from '../../../lib/api';

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

export default function BookShipmentPage() {
  const { user, showToast } = useAuth();
  const router = useRouter();

  const [pickup, setPickup] = useState('');
  const [dest, setDest] = useState('');
  const [stops, setStops] = useState<string[]>([]);
  const [weight, setWeight] = useState('');
  const [truckType, setTruckType] = useState('Bolero Pickup');
  const [material, setMaterial] = useState('');

  // AI Pricing state
  const [aiPrice, setAiPrice] = useState<number | null>(null);
  const [aiDelay, setAiDelay] = useState<number | null>(null);
  const [aiDistance, setAiDistance] = useState<number | null>(null);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [aiBreakdown, setAiBreakdown] = useState<any | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [recommendedTruck, setRecommendedTruck] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const calculateRate = async () => {
    const parsedWeight = parseFloat(weight);
    if (!pickup || !dest || isNaN(parsedWeight) || parsedWeight <= 0) {
      return;
    }

    try {
      setIsLoadingAi(true);
      setAiError(null);
      const pCoords = await geocodeAddressAsync(pickup);
      const dCoords = await geocodeAddressAsync(dest);
      
      // Fetch driving route distance from OSRM
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
        distanceKm = 15;
      }

      // Add additional distance for intermediate stops roughly
      distanceKm += (stops.filter(Boolean).length * 20);
      setAiDistance(distanceKm);

      const pricingRes = await api.post('/ai/pricing', {
        pickup,
        destination: dest,
        waypoints: stops.filter(Boolean),
        distanceKm,
        weightTons: parsedWeight,
        truckCategory: truckType,
        material: material || 'General Cargo',
        weather: 'Sunny',
        fuelPrice: 94.5,
        demandLevel: 'High'
      });

      if (pricingRes.data) {
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
      const msg = err.response?.data?.message || err.message || 'AI pricing calculation failed';
      setAiError(typeof msg === 'string' ? msg : 'Unable to calculate AI rate');
      setAiPrice(null);
    } finally {
      setIsLoadingAi(false);
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

    const debounce = setTimeout(() => {
      calculateRate();
    }, 700);

    return () => {
      clearTimeout(debounce);
    };
  }, [pickup, dest, stops, weight, truckType, material]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsedWeight = parseFloat(weight);
    if (!pickup || !dest || !weight || isNaN(parsedWeight) || parsedWeight <= 0) {
      showToast('Please enter valid shipment details', 'error');
      return;
    }

    const baseRates: Record<string, number> = {
      'Tata Ace': 16, 'Bolero Pickup': 21, 'LCV': 30, 'HCV': 48, 'Trailer': 68, 'Container': 58
    };
    const distance = aiDistance || 15;
    const rate = baseRates[truckType] || 25;
    const price = aiPrice && aiPrice > 0 ? aiPrice : Math.max(650, Math.round(distance * rate));

    setIsBooking(true);
    try {
      let finalDest = dest;
      const validStops = stops.filter(Boolean);
      if (validStops.length > 0) {
        finalDest = JSON.stringify({ address: dest, stops: validStops });
      }

      await bookingsService.create({
        shipperId: user.id,
        pickupAddress: pickup,
        destAddress: finalDest,
        distanceKm: distance,
        weightTons: parsedWeight,
        truckCategory: truckType,
        loadType: material || truckType,
        price,
      });

      showToast('Shipment booked successfully!', 'success');
      router.push(`/shipper/dashboard`);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Could not place cargo booking', 'error');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create New Shipment</h2>
        <p className="text-gray-500 text-sm mt-1">Get AI-powered instant dynamic pricing and book your freight load seamlessly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <form onSubmit={handleBook} className="space-y-6">
              
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2 flex items-center">
                  <MapPin className="mr-2 text-blue-600" size={20} /> Route Details
                </h3>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase">Origin (Pickup Location)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 text-green-600" size={18} />
                    <input 
                      type="text" 
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      placeholder="e.g. Sangli" 
                      className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition shadow-sm"
                      required
                    />
                  </div>
                </div>

                {stops.map((stop, index) => (
                  <div key={index} className="flex items-end space-x-2">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase">Intermediate Stop {index + 1}</label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-3 text-amber-500" size={18} />
                        <input 
                          type="text" 
                          value={stop}
                          onChange={(e) => {
                            const newStops = [...stops];
                            newStops[index] = e.target.value;
                            setStops(newStops);
                          }}
                          placeholder="Intermediate stop address" 
                          className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition shadow-sm"
                        />
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setStops(stops.filter((_, i) => i !== index))}
                      className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition border border-red-100"
                      title="Remove stop"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase">Destination (Delivery Location)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 text-red-600" size={18} />
                    <input 
                      type="text" 
                      value={dest}
                      onChange={(e) => setDest(e.target.value)}
                      placeholder="e.g. Miraj" 
                      className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition shadow-sm"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => setStops([...stops, ''])}
                  className="text-blue-600 text-sm font-semibold flex items-center hover:text-blue-700 transition pt-1 cursor-pointer"
                >
                  <Plus size={16} className="mr-1" /> Add Intermediate Stop
                </button>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2 flex items-center">
                  <Truck className="mr-2 text-blue-600" size={20} /> Cargo & Vehicle
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase">Cargo Weight (Tons)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 5" 
                      className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition shadow-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase">Material Category</label>
                    <input 
                      type="text" 
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      placeholder="e.g. Steel, FMCG, Electronics" 
                      className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase">Preferred Truck Category</label>
                  <div className="relative">
                    <Truck className="absolute left-3.5 top-3 text-gray-400" size={18} />
                    <select 
                      value={truckType}
                      onChange={(e) => setTruckType(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-10 pr-8 text-sm text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition shadow-sm cursor-pointer"
                    >
                      <option value="Tata Ace">Tata Ace (1.5T) - Ideal for local city transit</option>
                      <option value="Bolero Pickup">Bolero Pickup (2.5T) - Standard regional courier</option>
                      <option value="LCV">LCV (5T) - Regional transit & heavier cargo</option>
                      <option value="HCV">HCV (16T) - Long haul freight transit</option>
                      <option value="Trailer">Trailer (30T) - Heavy industrial machinery</option>
                      <option value="Container">Container (20T) - Secure enclosed transit</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={!pickup || !dest || !weight || parseFloat(weight) <= 0 || isBooking || isLoadingAi}
                  className={`w-full font-bold py-3.5 rounded-xl text-base transition shadow-sm flex items-center justify-center ${
                    (!pickup || !dest || !weight || parseFloat(weight) <= 0 || isBooking || isLoadingAi)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md cursor-pointer'
                  }`}
                >
                  {isBooking ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Confirming Booking...</span>
                    </div>
                  ) : (
                    <span className="flex items-center">
                      Confirm Shipment <ArrowRight size={18} className="ml-2" />
                    </span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* Right Column: AI Insights */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-b from-blue-50/80 to-white border border-blue-200 rounded-xl p-6 shadow-sm sticky top-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="mr-2 text-blue-600" size={20} /> AI Pricing Engine
            </h3>

            {(!pickup || !dest || !weight || parseFloat(weight) <= 0) ? (
              <div className="text-center py-10 bg-white rounded-lg border border-dashed border-gray-300 p-6">
                <AlertTriangle size={28} className="mx-auto text-amber-500 mb-3" />
                <p className="text-sm font-semibold text-gray-800">Enter full route details</p>
                <p className="text-xs text-gray-500 mt-1">Provide origin, destination, and cargo weight to generate live AI quote.</p>
              </div>
            ) : isLoadingAi ? (
              <div className="text-center py-12 bg-white rounded-lg border border-blue-100 p-6 shadow-sm">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm font-bold text-blue-700 animate-pulse">Running RouteX AI Pricing Engine...</p>
                <p className="text-xs text-slate-500 mt-1">Analyzing route distance, fuel prices, and truck capacity with Groq AI</p>
              </div>
            ) : aiError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs space-y-2">
                <p className="text-red-700 font-bold flex items-center">
                  <AlertTriangle size={16} className="mr-1.5 text-red-500" /> AI Pricing Unavailable
                </p>
                <p className="text-red-600">{aiError}</p>
                <button
                  type="button"
                  onClick={calculateRate}
                  className="flex items-center text-blue-700 hover:text-blue-900 font-bold text-xs mt-2 underline cursor-pointer"
                >
                  <RefreshCw size={12} className="mr-1" /> Retry AI Calculation
                </button>
              </div>
            ) : aiPrice && aiPrice > 0 ? (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estimated Fare</p>
                    {aiConfidence !== null && (
                      <span className="text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full font-extrabold">
                        {aiConfidence}% Confidence
                      </span>
                    )}
                  </div>
                  <p className="text-4xl font-black text-blue-700 tracking-tight">₹{aiPrice.toLocaleString()}</p>
                </div>

                {recommendedTruck && recommendedTruck !== truckType && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 shadow-xs">
                    <p className="font-bold flex items-center">
                      <Truck size={14} className="mr-1 text-amber-700" /> AI Vehicle Recommendation:
                    </p>
                    <p className="mt-0.5 text-amber-800 font-medium">
                      Consider upgrading to <strong>{recommendedTruck}</strong> to handle {weight}T {material || 'cargo'} safely.
                    </p>
                  </div>
                )}
                
                <div className="bg-white rounded-lg border border-blue-100 p-4 space-y-2.5 shadow-sm">
                  <div className="flex justify-between items-center text-xs border-b border-gray-100 pb-2">
                    <span className="text-gray-500">Route Distance</span>
                    <span className="font-bold text-gray-900">{aiDistance || 15} km</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-gray-100 pb-2">
                    <span className="text-gray-500">Estimated Transit Time</span>
                    <span className="font-bold text-amber-600">
                      {aiDelay ? (aiDelay >= 60 ? `${Math.floor(aiDelay/60)}h ${aiDelay%60}m` : `${aiDelay} mins`) : '30 mins'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Cargo Type</span>
                    <span className="font-bold text-gray-900">{material || 'General Cargo'}</span>
                  </div>
                </div>

                {aiBreakdown && (
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Cost Breakdown</p>
                    <div className="space-y-1.5 text-xs text-gray-700 bg-white rounded-lg border border-gray-200 p-3 shadow-xs">
                      <div className="flex justify-between">
                        <span>Base Route Fare:</span>
                        <span className="font-bold text-gray-900">₹{aiBreakdown.distanceCost}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fuel Surcharge:</span>
                        <span className="font-bold text-gray-900">₹{aiBreakdown.fuelCost}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Weather Impact:</span>
                        <span className="font-bold text-gray-900">₹{aiBreakdown.weatherImpact}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Demand Surcharge:</span>
                        <span className="font-bold text-gray-900">x{aiBreakdown.demandMultiplier}</span>
                      </div>
                    </div>
                  </div>
                )}

                {aiReason && (
                  <div className="bg-blue-50/90 p-3 rounded-lg border border-blue-200">
                    <p className="text-xs italic text-blue-900 font-medium leading-relaxed">
                      &ldquo;{aiReason}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

      </div>
    </div>
  );
}

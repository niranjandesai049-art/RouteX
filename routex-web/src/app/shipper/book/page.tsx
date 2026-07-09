'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { MapPin, Truck, TrendingUp, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { bookingsService } from '../../../services/bookings.service';

const geocodeAddressAsync = async (address: string): Promise<[number, number]> => {
  if (!address) return [28.6139, 77.2090];
  
  const lower = address.toLowerCase();
  if (lower.includes('miraj')) return [16.8222, 74.6468];
  if (lower.includes('sangli')) return [16.8524, 74.5815];
  if (lower.includes('mumbai')) return [19.0760, 72.8777];
  if (lower.includes('delhi')) return [28.6139, 77.2090];
  if (lower.includes('jaipur')) return [26.9124, 75.7873];
  if (lower.includes('pune')) return [18.5204, 73.8567];
  if (lower.includes('googleplex')) return [37.4219983, -122.084];
  if (lower.includes('san jose')) return [37.3382, -121.8863];

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
  const [truckType, setTruckType] = useState('Tata Ace');
  const [material, setMaterial] = useState('');

  // AI Pricing state
  const [aiPrice, setAiPrice] = useState<number | null>(null);
  const [aiDelay, setAiDelay] = useState<number | null>(null);
  const [aiDistance, setAiDistance] = useState<number | null>(null);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [aiBreakdown, setAiBreakdown] = useState<any | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    const parsedWeight = parseFloat(weight);
    if (!pickup || !dest || !weight || isNaN(parsedWeight) || parsedWeight <= 0 || !truckType) {
      setAiPrice(null);
      setAiDelay(null);
      setAiDistance(null);
      setAiReason(null);
      setAiBreakdown(null);
      setAiConfidence(null);
      return;
    }

    let active = true;
    const calculateRate = async () => {
      try {
        setIsLoadingAi(true);
        const pCoords = await geocodeAddressAsync(pickup);
        const dCoords = await geocodeAddressAsync(dest);
        
        // Fetch driving route distance from OSRM
        const osrmRes = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${pCoords[1]},${pCoords[0]};${dCoords[1]},${dCoords[0]}?overview=false`
        );
        
        let distanceKm = Math.floor(200 + Math.random() * 600);
        if (osrmRes.ok) {
          const osrmData = await osrmRes.json();
          if (osrmData.routes && osrmData.routes[0]) {
            distanceKm = Math.round(osrmData.routes[0].distance / 1000);
          }
        }

        // Add additional distance for intermediate stops roughly
        distanceKm += (stops.length * 50);

        if (!active) return;
        setAiDistance(distanceKm);

        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const pricingRes = await fetch(`${backendUrl}/ai/pricing`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pickup,
            destination: dest,
            distanceKm,
            weightTons: parsedWeight,
            truckCategory: truckType,
            weather: 'Sunny',
            fuelPrice: 94.5,
            demandLevel: 'High'
          })
        });

        if (pricingRes.ok && active) {
          const data = await pricingRes.json();
          setAiPrice(data.estimatedPrice);
          setAiDelay(data.etaMinutes);
          setAiReason(data.reason);
          setAiBreakdown(data.pricingBreakdown);
          setAiConfidence(data.confidence);
        }
      } catch (err) {
        console.error('Failed to calculate rate:', err);
      } finally {
        if (active) {
          setIsLoadingAi(false);
        }
      }
    };

    const debounce = setTimeout(() => {
      calculateRate();
    }, 1000); // 1s debounce to avoid spamming the API

    return () => {
      active = false;
      clearTimeout(debounce);
    };
  }, [pickup, dest, stops, weight, truckType]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsedWeight = parseFloat(weight);
    if (!pickup || !dest || !weight || isNaN(parsedWeight) || parsedWeight <= 0) {
      showToast('Please enter valid shipment details', 'error');
      return;
    }

    const baseRates: Record<string, number> = {
      'Tata Ace': 15, 'Bolero Pickup': 20, 'LCV': 28, 'HCV': 45, 'Trailer': 65, 'Container': 55
    };
    const distance = aiDistance || Math.floor(200 + Math.random() * 600);
    const rate = baseRates[truckType] || 25;
    const price = aiPrice || Math.round(distance * rate);

    setIsBooking(true);
    try {
      // Create multi-stop address object for destination
      let finalDest = dest;
      if (stops.length > 0) {
        finalDest = JSON.stringify({ address: dest, stops });
      }

      const booking = await bookingsService.create({
        shipperId: user.id,
        pickupAddress: pickup,
        destAddress: finalDest,
        distanceKm: distance,
        weightTons: parsedWeight,
        truckCategory: truckType,
        loadType: material || truckType,
        price,
      });

      showToast('Booking posted successfully!', 'success');
      router.push(`/shipper/shipments`);
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
        <p className="text-gray-500 text-sm mt-1">Get instant pricing and book your freight instantly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-100 rounded-xl p-8 shadow-sm">
            <form onSubmit={handleBook} className="space-y-6">
              
              <div className="space-y-4">
                <h3 className="text-lg font-bold border-b pb-2">Route Details</h3>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Origin (Pickup Location)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-green-500" size={18} />
                    <input 
                      type="text" 
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      placeholder="Enter pickup address, warehouse, or city" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:border-blue-600 outline-none transition"
                      required
                    />
                  </div>
                </div>

                {stops.map((stop, index) => (
                  <div key={index} className="flex items-end space-x-2">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Stop {index + 1}</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 text-amber-500" size={18} />
                        <input 
                          type="text" 
                          value={stop}
                          onChange={(e) => {
                            const newStops = [...stops];
                            newStops[index] = e.target.value;
                            setStops(newStops);
                          }}
                          placeholder="Intermediate stop address" 
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:border-blue-600 outline-none transition"
                          required
                        />
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setStops(stops.filter((_, i) => i !== index))}
                      className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Final Destination</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-red-500" size={18} />
                    <input 
                      type="text" 
                      value={dest}
                      onChange={(e) => setDest(e.target.value)}
                      placeholder="Enter delivery address, warehouse, or city" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:border-blue-600 outline-none transition"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => setStops([...stops, ''])}
                  className="text-blue-600 text-sm font-semibold flex items-center hover:text-blue-700 transition"
                >
                  <Plus size={16} className="mr-1" /> Add Multiple Stops
                </button>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-bold border-b pb-2">Cargo & Vehicle</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Weight (Tons)</label>
                    <input 
                      type="number" 
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 15" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-4 text-sm focus:border-blue-600 outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Material Category</label>
                    <input 
                      type="text" 
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      placeholder="Steel, Electronics, FMCG..." 
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-4 text-sm focus:border-blue-600 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Preferred Truck Category</label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-3 text-gray-400" size={18} />
                    <select 
                      value={truckType}
                      onChange={(e) => setTruckType(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:border-blue-600 outline-none transition appearance-none"
                    >
                      <option value="Tata Ace">Tata Ace (1.5T) - Ideal for local city</option>
                      <option value="Bolero Pickup">Bolero Pickup (2.5T)</option>
                      <option value="LCV">LCV (5T) - Regional transit</option>
                      <option value="HCV">HCV (16T) - Long haul freight</option>
                      <option value="Trailer">Trailer (30T) - Heavy industrial</option>
                      <option value="Container">Container (20T) - Secure transit</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={!pickup || !dest || !weight || parseFloat(weight) <= 0 || isBooking}
                  className={`w-full font-bold py-4 rounded-xl text-base transition shadow-sm flex items-center justify-center ${
                    (!pickup || !dest || !weight || parseFloat(weight) <= 0 || isBooking)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
                  }`}
                >
                  {isBooking ? 'Confirming Booking...' : 'Confirm Shipment'}
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* Right Column: AI Insights */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-b from-blue-50 to-white border border-blue-100 rounded-xl p-6 shadow-sm sticky top-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="mr-2 text-blue-600" size={20} /> AI Pricing Engine
            </h3>

            {(!pickup || !dest || !weight || parseFloat(weight) <= 0) ? (
              <div className="text-center py-10 bg-white/60 rounded-lg border border-dashed border-gray-200">
                <AlertTriangle size={24} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 font-medium">Enter full route details<br/>to generate AI quote.</p>
              </div>
            ) : isLoadingAi ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm font-semibold text-blue-600 animate-pulse">Calculating optimal routes & pricing...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Estimated Fare</p>
                  <p className="text-4xl font-extrabold text-blue-700">₹{(aiPrice || 0).toLocaleString()}</p>
                </div>
                
                <div className="bg-white rounded-lg border border-blue-100 p-4 space-y-3 shadow-sm">
                  <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                    <span className="text-gray-500">Total Distance</span>
                    <span className="font-bold text-gray-900">{aiDistance} km</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                    <span className="text-gray-500">Est. Transit Time</span>
                    <span className="font-bold text-amber-600">{aiDelay ? Math.floor(aiDelay/60) + 'h ' + (aiDelay%60) + 'm' : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">AI Match Confidence</span>
                    <span className="font-bold text-emerald-600">{aiConfidence}%</span>
                  </div>
                </div>

                {aiBreakdown && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cost Breakdown</p>
                    <div className="space-y-1.5 text-xs text-gray-600 bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                      <div className="flex justify-between"><span>Base Route Fare</span><span className="font-medium text-gray-900">₹{aiBreakdown.distanceCost}</span></div>
                      <div className="flex justify-between"><span>Fuel Surcharge</span><span className="font-medium text-gray-900">₹{aiBreakdown.fuelCost}</span></div>
                      <div className="flex justify-between"><span>Weather Impact</span><span className="font-medium text-gray-900">₹{aiBreakdown.weatherImpact}</span></div>
                      <div className="flex justify-between"><span>Demand Multiplier</span><span className="font-medium text-gray-900">x{aiBreakdown.demandMultiplier}</span></div>
                    </div>
                  </div>
                )}

                {aiReason && (
                  <div className="bg-blue-100/50 p-3 rounded-lg border border-blue-200">
                    <p className="text-xs italic text-blue-800 font-medium leading-relaxed">
                      &ldquo;{aiReason}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

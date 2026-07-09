'use client';

import React, { useState } from 'react';
import { Sparkles, CloudRain, Clock, MapPin, CheckCircle, TrendingUp } from 'lucide-react';

export default function AiEngine() {
  const [pickup, setPickup] = useState('Delhi');
  const [destination, setDestination] = useState('Mumbai');
  const [truckType, setTruckType] = useState('Trailer');
  const [weather, setWeather] = useState('Sunny');

  const [predictedPrice, setPredictedPrice] = useState<number | null>(null);
  const [predictedDelay, setPredictedDelay] = useState<number | null>(null);
  const [weatherRisk, setWeatherRisk] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handlePredict = async () => {
    setIsLoading(true);
    try {
      const distance = pickup === 'Delhi' && destination === 'Mumbai' ? 1420 : 850;
      
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + '/api';
      
      // Fetch cost prediction
      const rateRes = await fetch(
        `${baseUrl}/ai/predict-rate?pickup=${pickup}&destination=${destination}&distance=${distance}&weight=15&category=${truckType}&weather=${weather}`
      );
      if (rateRes.ok) {
        const data = await rateRes.json();
        setPredictedPrice(data.predictedPrice);
      }

      // Fetch delay prediction
      const delayRes = await fetch(
        `${baseUrl}/ai/predict-delay?pickup=${pickup}&destination=${destination}&distance=${distance}&weight=15&category=${truckType}&weather=${weather}`
      );
      if (delayRes.ok) {
        const data = await delayRes.json();
        setPredictedDelay(data.predictedDelayMinutes);
        setWeatherRisk(data.weatherRiskScore);
      }
    } catch (err) {
      console.warn('API connection offline.');
    } finally {
      setIsLoading(false);
    }
  };

  const emptyReturns = [
    { start: 'Jaipur', end: 'Delhi', truckType: 'Bolero Pickup', availableIn: '2 hrs', emptyRateDiscount: '-35%' },
    { start: 'Pune', end: 'Mumbai', truckType: 'LCV', availableIn: '4 hrs', emptyRateDiscount: '-40%' },
    { start: 'Salem', end: 'Bengaluru', truckType: 'Trailer', availableIn: '1 hr', emptyRateDiscount: '-30%' },
  ];

  return (
    <div className="bg-[#F5F5F5] min-h-screen text-gray-900 font-sans p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="text-blue-600 animate-pulse" size={20} />
              <h2 className="text-xl font-extrabold tracking-tight text-gray-900">RouteX AI Optimization Console</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">Real-time prediction metrics powered by NestJS and PyTorch core</p>
          </div>
          <span className="text-xs bg-green-50 text-green-700 font-bold px-3 py-1 rounded-full border border-green-200">AI Core: Online</span>
        </div>

        {/* Console Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* AI Predictor Sandbox */}
          <div className="lg:col-span-1 bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center"><TrendingUp className="mr-2 text-blue-600" size={18} /> Rate & Delay Sandbox</h3>
            
            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Route Pickup</label>
                <select value={pickup} onChange={(e) => setPickup(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs outline-none focus:border-blue-600">
                  <option value="Delhi">Delhi NCR</option>
                  <option value="Mumbai">Mumbai Port</option>
                  <option value="Bengaluru">Bengaluru Hub</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Route Destination</label>
                <select value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs outline-none focus:border-blue-600">
                  <option value="Mumbai">Mumbai Port</option>
                  <option value="Chennai">Chennai Terminal</option>
                  <option value="Kolkata">Kolkata Hub</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Truck Class</label>
                <select value={truckType} onChange={(e) => setTruckType(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs outline-none focus:border-blue-600">
                  <option value="Tata Ace">Tata Ace (1.5T)</option>
                  <option value="LCV">LCV (5T)</option>
                  <option value="HCV">HCV (16T)</option>
                  <option value="Trailer">Trailer (30T)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Simulated Weather</label>
                <select value={weather} onChange={(e) => setWeather(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs outline-none focus:border-blue-600">
                  <option value="Sunny">Sunny / Clear</option>
                  <option value="Rainy">Monsoon Rainy</option>
                  <option value="Stormy">Heavy Storms</option>
                  <option value="Foggy">Foggy Winter</option>
                </select>
              </div>

              <button onClick={handlePredict} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs transition">
                {isLoading ? 'Running Predictions...' : 'Recalculate AI Predictions'}
              </button>
            </div>

            {(predictedPrice !== null || predictedDelay !== null) && (
              <div className="pt-4 border-t border-gray-100 space-y-3">
                {predictedPrice !== null && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-semibold uppercase">Predicted Fare</span>
                    <span className="font-bold text-blue-600">₹{predictedPrice.toLocaleString()}</span>
                  </div>
                )}
                {predictedDelay !== null && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-semibold uppercase">Expected Route Delay</span>
                    <span className="font-bold text-amber-600">{predictedDelay} Minutes</span>
                  </div>
                )}
                {weatherRisk !== null && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-semibold uppercase">Weather Risk Score</span>
                    <span className="font-bold text-red-600">{(weatherRisk * 100).toFixed(0)}% Risk</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Empty Return Matches */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center"><MapPin className="mr-2 text-green-600" size={18} /> AI Empty Return Load Matching</h3>
              <p className="text-xs text-gray-400 mb-4">Suggests trucks returning empty from recent drop-offs to companies, granting up to 40% discounts while keeping driver utilization high.</p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                      <th className="p-3">RETURNING ROUTE</th>
                      <th className="p-3">TRUCK</th>
                      <th className="p-3">AVAILABILITY</th>
                      <th className="p-3">MATCH RATE DISCOUNT</th>
                      <th className="p-3">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emptyReturns.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="p-3 font-semibold">{item.start} → {item.end}</td>
                        <td className="p-3 text-gray-500">{item.truckType}</td>
                        <td className="p-3 text-gray-600 font-medium">{item.availableIn}</td>
                        <td className="p-3 text-green-600 font-bold">{item.emptyRateDiscount}</td>
                        <td className="p-3">
                          <button className="text-[10px] font-bold bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 transition">Book Discount</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Smart Dispatch and Demand Forecasting Card */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center">Demand Forecasting (Next 48 Hours)</h3>
              <p className="text-xs text-gray-400 mb-6">Predicts cargo booking demand in main hubs to redirect idle fleet trucks.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-gray-400">Delhi NCR</p>
                  <p className="text-lg font-bold text-red-600 mt-1">CRITICAL</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-gray-400">Mumbai Port</p>
                  <p className="text-lg font-bold text-green-600 mt-1">NORMAL</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-gray-400">Bengaluru Hub</p>
                  <p className="text-lg font-bold text-red-600 mt-1">HIGH</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-gray-400">Chennai Terminal</p>
                  <p className="text-lg font-bold text-green-600 mt-1">NORMAL</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-gray-400">Kolkata Terminal</p>
                  <p className="text-lg font-bold text-amber-600 mt-1">MODERATE</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

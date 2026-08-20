'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  ShieldCheck,
  Zap,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  Search,
  ChevronRight,
  AlertCircle,
  BarChart3,
  Navigation,
  FileCheck,
  User,
  Radio,
} from 'lucide-react';

export default function RouteXDashboardPreview() {
  const [activeTab, setActiveTab] = useState<'live' | 'fleet' | 'ai'>('live');
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((prev) => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden text-xs md:text-sm">
      {/* Top Application Header */}
      <div className="h-12 md:h-14 border-b border-slate-800/80 bg-slate-900/60 px-3 md:px-6 flex items-center justify-between backdrop-blur-md shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-blue-600 rounded-lg flex items-center justify-center font-extrabold text-white text-base shadow-md shadow-blue-500/20">
            R
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm md:text-base text-white tracking-tight">
              Route<span className="text-blue-500">X</span>
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Control Engine v2.0
            </span>
          </div>
        </div>

        {/* Search & Status Bar */}
        <div className="hidden md:flex items-center space-x-4 flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input
              type="text"
              readOnly
              value="Search Trip ID, Vehicle Plate (DL-01-AB-1234), Driver..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-1.5 pl-9 pr-4 text-xs text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Live Network Connection Badge */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-400">
            <span className={`w-2 h-2 rounded-full ${pulse ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-emerald-600'}`}></span>
            <span className="hidden sm:inline">Mesh Telemetry • Online</span>
            <span className="sm:hidden">Live</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
            <User size={14} />
          </div>
        </div>
      </div>

      {/* Main Body Dashboard Content */}
      <div className="flex-1 p-3 md:p-5 overflow-y-auto space-y-3 md:space-y-4 custom-scrollbar">
        {/* KPI Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 md:p-4 relative overflow-hidden group hover:border-blue-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">Active Shipments</span>
              <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                <Truck size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-lg md:text-2xl font-black text-white tracking-tight">1,428</span>
              <span className="text-[10px] font-bold text-emerald-400 flex items-center">
                <TrendingUp size={10} className="mr-0.5" /> +12.4%
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">In transit across 18 states</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 md:p-4 relative overflow-hidden group hover:border-emerald-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">On-Time Accuracy</span>
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-lg md:text-2xl font-black text-white tracking-tight">99.4%</span>
              <span className="text-[10px] font-bold text-emerald-400">OSRM AI Route</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Avg delay &lt; 4 mins</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 md:p-4 relative overflow-hidden group hover:border-indigo-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">Fleet Active Ratio</span>
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <Activity size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-lg md:text-2xl font-black text-white tracking-tight">482 / 500</span>
              <span className="text-[10px] font-bold text-indigo-400">96.4% Online</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">18 in maintenance</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 md:p-4 relative overflow-hidden group hover:border-amber-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">AI Tariff Savings</span>
              <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                <Zap size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-lg md:text-2xl font-black text-white tracking-tight">₹14.8M</span>
              <span className="text-[10px] font-bold text-amber-400">Groq Llama 3.3</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Dynamic fuel & toll optimization</p>
          </div>
        </div>

        {/* Central Map & Dispatch Telemetry Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
          {/* Simulated Interactive GIS Map Panel */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3 md:p-4 flex flex-col justify-between relative overflow-hidden min-h-[220px] md:min-h-[300px]">
            {/* Map Vector Grid Styling */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

            {/* Map Header Overlay */}
            <div className="relative z-10 flex items-center justify-between bg-slate-950/80 backdrop-blur border border-slate-800/80 rounded-xl p-2.5 mb-2">
              <div className="flex items-center space-x-2">
                <Navigation size={14} className="text-blue-400 animate-pulse" />
                <span className="font-semibold text-xs text-white">Live GIS Route Map: New Delhi ➔ Mumbai Express Corridor</span>
              </div>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md font-mono">
                OSRM Routing
              </span>
            </div>

            {/* Simulated Live Route Visualizer */}
            <div className="relative z-10 my-4 flex-1 flex flex-col justify-center px-4">
              <div className="relative flex items-center justify-between">
                {/* Route Connecting Line */}
                <div className="absolute top-1/2 left-4 right-4 h-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-indigo-600 transform -translate-y-1/2 rounded-full"></div>
                
                {/* Waypoint 1: Pickup */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-blue-500/50 border-2 border-slate-950">
                    A
                  </div>
                  <span className="mt-1.5 font-bold text-[10px] text-white">Delhi ICD</span>
                  <span className="text-[9px] text-slate-400">08:30 AM (Loaded)</span>
                </div>

                {/* Waypoint 2: Intermediate Waypoint / Live Vehicle Marker */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-extrabold text-xs shadow-xl shadow-emerald-500/60 border-2 border-white animate-bounce">
                    <Truck size={18} />
                  </div>
                  <div className="mt-1 bg-slate-950/90 border border-emerald-500/50 px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-300">
                    62 km/h • En Route
                  </div>
                </div>

                {/* Waypoint 3: Delivery */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-indigo-500/50 border-2 border-slate-950">
                    B
                  </div>
                  <span className="mt-1.5 font-bold text-[10px] text-white">JNPT Mumbai</span>
                  <span className="text-[9px] text-slate-400">ETA 08:45 PM</span>
                </div>
              </div>

              {/* Active Trip Live Card Overlay */}
              <div className="mt-6 bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                    RX
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-white">Trip #RX-9824</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                        Container 20T
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Driver: Ramesh Sharma • HR-55-AT-9012</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-semibold">ePOD Status</span>
                    <span className="text-emerald-400 font-semibold flex items-center">
                      <FileCheck size={12} className="mr-1" /> OTP Verified
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-semibold">Remaining</span>
                    <span className="text-white font-bold">248 km (4h 12m)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Real-Time Dispatch Feed & AI Insights Panel */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3 md:p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Radio size={14} className="text-blue-400 animate-pulse" />
                  <span className="font-bold text-xs text-white">Live Freight Feed</span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">Real-time</span>
              </div>

              {/* Feed Items */}
              <div className="mt-3 space-y-2">
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between hover:border-slate-700 transition">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <div>
                      <div className="font-bold text-xs text-white">#RX-9824 • Delhi to Mumbai</div>
                      <div className="text-[10px] text-slate-400">20T Container • ₹45,000</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    In Transit
                  </span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between hover:border-slate-700 transition">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                    <div>
                      <div className="font-bold text-xs text-white">#RX-9825 • Gurgaon to Noida</div>
                      <div className="text-[10px] text-slate-400">Tata Ace • ₹4,200</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    At Pickup
                  </span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between hover:border-slate-700 transition">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <div>
                      <div className="font-bold text-xs text-white">#RX-9826 • Pune to Bangalore</div>
                      <div className="text-[10px] text-slate-400">HCV 16T • ₹77,000</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    Priority Dispatch
                  </span>
                </div>
              </div>
            </div>

            {/* Groq AI Tariff Intelligence Summary Box */}
            <div className="bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-800/40 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-blue-300 flex items-center">
                  <Zap size={12} className="mr-1 text-amber-400" /> Groq Llama 3.3 AI Model
                </span>
                <span className="text-[9px] text-slate-400 font-mono">Dynamic Tariff</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1">
                <span>Fuel Index: ₹90.5/L</span>
                <span>Toll Estimate: ₹600</span>
                <span className="text-emerald-400 font-bold">Surge: 1.05x</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

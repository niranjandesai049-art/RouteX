'use client';

import dynamic from 'next/dynamic';

export const LazyMapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] bg-slate-900 flex items-center justify-center rounded-xl border border-slate-800">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Initializing Canvas...</span>
      </div>
    </div>
  ),
});

export const DriverMap = dynamic(() => import('./DriverMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] bg-slate-950 flex items-center justify-center rounded-xl">
      <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  ),
});

export const ShipmentMap = dynamic(() => import('./ShipmentMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] bg-slate-50 flex items-center justify-center rounded-xl border border-slate-200">
      <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  ),
});

export const FleetMap = dynamic(() => import('./FleetMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] bg-slate-50 flex items-center justify-center rounded-xl border border-slate-200">
      <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  ),
});

export const LiveTrackingMap = dynamic(() => import('./LiveTrackingMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] bg-slate-50 flex items-center justify-center rounded-xl border border-slate-200">
      <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  ),
});

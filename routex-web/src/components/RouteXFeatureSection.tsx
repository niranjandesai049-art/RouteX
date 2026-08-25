'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  MapPin,
  Route,
  Network,
  Package,
  Smartphone,
  Users,
  IndianRupee,
  Truck,
  BarChart3,
  ShieldAlert,
  Leaf,
  Zap,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export interface RouteXFeatureItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const routeXFeatures: RouteXFeatureItem[] = [
  {
    id: 'ai-command',
    title: 'AI Command Center',
    subtitle: 'Your entire logistics operation, powered by AI',
    icon: Sparkles,
  },
  {
    id: 'fleet-tracking',
    title: 'Live Fleet Tracking',
    subtitle: 'Track trucks and shipments in real-time',
    icon: MapPin,
  },
  {
    id: 'route-opt',
    title: 'AI Route Optimization',
    subtitle: 'Reduce distance, fuel costs and delivery time',
    icon: Route,
  },
  {
    id: 'freight-match',
    title: 'Smart Freight Matching',
    subtitle: 'Match shipments with the right available transporter',
    icon: Network,
  },
  {
    id: 'shipment-mgmt',
    title: 'Shipment Management',
    subtitle: 'Manage bookings, loads, stops and delivery status',
    icon: Package,
  },
  {
    id: 'driver-app',
    title: 'Driver App',
    subtitle: 'Give drivers live trips, navigation and delivery updates',
    icon: Smartphone,
  },
  {
    id: 'customer-portal',
    title: 'Customer Portal',
    subtitle: 'Give customers real-time shipment visibility',
    icon: Users,
  },
  {
    id: 'pricing-intel',
    title: 'AI Pricing Intelligence',
    subtitle: 'Estimate freight prices and optimize transportation costs',
    icon: IndianRupee,
  },
  {
    id: 'fleet-ops',
    title: 'Fleet Operations',
    subtitle: 'Manage trucks, drivers, maintenance and utilization',
    icon: Truck,
  },
  {
    id: 'reports-analytics',
    title: 'Reports & Analytics',
    subtitle: 'Turn logistics data into actionable business insights',
    icon: BarChart3,
  },
  {
    id: 'watchdog',
    title: 'Watchdog Protection',
    subtitle: 'Detect delays, route deviations and critical shipment events',
    icon: ShieldAlert,
  },
  {
    id: 'emissions-intel',
    title: 'Emissions Intelligence',
    subtitle: 'Track fuel consumption and transportation emissions',
    icon: Leaf,
  },
];

interface RouteXFeatureSectionProps {
  onNavigate?: (portal: string) => void;
}

export function RouteXFeatureSection({ onNavigate }: RouteXFeatureSectionProps) {
  // Duplicate array for seamless infinite vertical scrolling
  const duplicatedFeatures = [...routeXFeatures, ...routeXFeatures];

  const handlePortalClick = (portal: string) => {
    if (onNavigate) {
      onNavigate(portal);
    }
  };

  return (
    <section id="features" className="py-24 md:py-32 bg-slate-950 text-white relative overflow-hidden border-t border-slate-900 font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* LEFT COLUMN — Vertically Scrolling Feature Cards Container */}
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="relative w-full max-w-md mx-auto lg:max-w-none bg-slate-900/70 backdrop-blur-2xl border border-slate-800/90 rounded-[32px] shadow-2xl p-6 sm:p-7 overflow-hidden h-[540px] flex flex-col justify-center">
              
              {/* Top Fade Gradient Mask */}
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent pointer-events-none z-20" />
              
              {/* Bottom Fade Gradient Mask */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none z-20" />

              {/* Animated Continuous Vertical Scroller */}
              <motion.div
                animate={{ y: ['0%', '-50%'] }}
                transition={{
                  repeat: Infinity,
                  duration: 32,
                  ease: 'linear',
                }}
                className="space-y-3.5 py-4"
              >
                {duplicatedFeatures.map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={`${feature.id}-${idx}`}
                      className="group relative flex items-center space-x-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:bg-slate-800/90 hover:border-blue-500/40 transition-all duration-300 shadow-md cursor-pointer"
                    >
                      {/* Icon Container */}
                      <div className="w-11 h-11 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 flex items-center justify-center shrink-0 shadow-inner">
                        <Icon size={20} />
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white tracking-tight group-hover:text-blue-300 transition-colors">
                          {feature.title}
                        </h4>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed mt-0.5 line-clamp-1">
                          {feature.subtitle}
                        </p>
                      </div>

                      {/* Status Dot */}
                      <div className="w-2 h-2 rounded-full bg-blue-500/60 group-hover:bg-blue-400 group-hover:scale-125 transition-all shrink-0" />
                    </div>
                  );
                })}
              </motion.div>
            </div>
          </div>

          {/* RIGHT COLUMN — RouteX Branding & Feature Content */}
          <div className="lg:col-span-7 order-1 lg:order-2 space-y-6 text-left">
            
            {/* Top Pill Badge */}
            <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-extrabold uppercase tracking-wider px-4 py-1.5 rounded-full">
              <Zap size={14} className="text-amber-400" />
              <span>AI-Powered Logistics</span>
            </div>

            {/* Main Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
              Everything you need to run <br className="hidden sm:inline" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                smarter logistics.
              </span>
            </h2>

            {/* Supporting Text */}
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
              RouteX brings fleet tracking, freight management, AI route optimization, driver operations, customer visibility and intelligent analytics into one unified logistics platform.
            </p>

            {/* Feature Badges Grid */}
            <div className="pt-2 flex flex-wrap gap-2.5">
              {[
                'AI-Powered',
                'Real-Time Tracking',
                'Smart Routing',
                'Fleet Intelligence',
                'Enterprise Ready',
              ].map((badge) => (
                <div
                  key={badge}
                  className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold tracking-wide shadow-sm hover:border-blue-500/40 hover:text-white transition-all"
                >
                  <CheckCircle2 size={13} className="text-blue-400" />
                  <span>{badge}</span>
                </div>
              ))}
            </div>

            {/* Call To Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => handlePortalClick('shipper')}
                className="bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold px-7 py-3.5 rounded-full shadow-lg shadow-blue-600/25 transition-all duration-200 flex items-center justify-center space-x-2 text-xs uppercase tracking-wider cursor-pointer"
              >
                <span>Access Shipper Portal</span>
                <ArrowRight size={15} />
              </button>

              <button
                onClick={() => handlePortalClick('fleet')}
                className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-extrabold px-7 py-3.5 rounded-full transition-all duration-200 text-center text-xs uppercase tracking-wider cursor-pointer"
              >
                Carrier Fleet Portal
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export default RouteXFeatureSection;

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Truck, Shield, Clock, MapPin, ArrowRight, Zap, CheckCircle } from 'lucide-react';
import { ContainerScroll } from './ui/container-scroll-animation';
import RouteXDashboardPreview from './RouteXDashboardPreview';
import Component from './ui/component';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface LandingPageProps {
  onNavigate: (portal: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pickup, setPickup] = useState('');
  const [dest, setDest] = useState('');
  const [truckType, setTruckType] = useState('Tata Ace');
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);

  const truckCategories = [
    { name: 'Tata Ace', capacity: '1.5 Tons', rate: 15 },
    { name: 'Bolero Pickup', capacity: '2.5 Tons', rate: 20 },
    { name: 'LCV', capacity: '5 Tons', rate: 28 },
    { name: 'HCV', capacity: '16 Tons', rate: 45 },
    { name: 'Trailer', capacity: '30 Tons', rate: 65 },
    { name: 'Container', capacity: '20 Tons', rate: 55 },
  ];

  const handleEstimate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dest) return;
    const randomDistance = Math.floor(150 + Math.random() * 800);
    const selected = truckCategories.find((t) => t.name === truckType);
    const perKm = selected ? selected.rate : 25;
    setEstimatedPrice(randomDistance * perKm);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let heroTextCtx: gsap.Context | null = null;
    let heroFormCtx: gsap.Context | null = null;
    let trustCardsCtx: gsap.Context | null = null;

    const heroTextElements = el.querySelectorAll('.hero-text-animate');
    if (heroTextElements.length > 0) {
      heroTextCtx = gsap.context(() => {
        gsap.fromTo(
          heroTextElements,
          { opacity: 0, x: -40 },
          {
            opacity: 1,
            x: 0,
            duration: 1,
            stagger: 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: '.hero-section-trigger',
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          }
        );
      }, el);
    }

    const heroForm = el.querySelector('.hero-form-animate');
    if (heroForm) {
      heroFormCtx = gsap.context(() => {
        gsap.fromTo(
          heroForm,
          { opacity: 0, x: 40, scale: 0.96 },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: '.hero-section-trigger',
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          }
        );
      }, el);
    }

    const trustCards = el.querySelectorAll('.trust-card-animate');
    if (trustCards.length > 0) {
      trustCardsCtx = gsap.context(() => {
        gsap.fromTo(
          trustCards,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.18,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: '#features',
              start: 'top 80%',
              toggleActions: 'play none none none',
            },
          }
        );
      }, el);
    }

    return () => {
      if (heroTextCtx) heroTextCtx.revert();
      if (heroFormCtx) heroFormCtx.revert();
      if (trustCardsCtx) trustCardsCtx.revert();
    };
  }, []);

  return (
    <div ref={containerRef} className="bg-white text-gray-900 min-h-screen font-sans">
      {/* Header — ABSOLUTELY UNTOUCHED */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xl">
              R
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">
              Route<span className="text-blue-600">X</span>
            </span>
          </div>
          <nav className="hidden md:flex space-x-8 text-sm font-semibold text-gray-600">
            <a href="#features" className="hover:text-blue-600 transition">
              Features
            </a>
            <a href="#fleet" className="hover:text-blue-600 transition">
              Truck Categories
            </a>
            <a href="#estimator" className="hover:text-blue-600 transition">
              Rate Estimator
            </a>
          </nav>
          <div className="flex space-x-4">
            <button
              onClick={() => onNavigate('shipper')}
              className="text-sm font-semibold px-4 py-2 border border-gray-200 rounded-lg hover:border-gray-900 transition"
            >
              Sign In
            </button>
            <button
              onClick={() => onNavigate('shipper')}
              className="text-sm font-semibold bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Book a Truck
            </button>
          </div>
        </div>
      </header>

      {/* GSAP + ScrollTrigger + Lenis RouteX Parallax Hero Section */}
      <Component />

      {/* Hero Section */}
      <section className="hero-section-trigger py-20 md:py-32 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="hero-text-animate inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold mb-6">
            <Zap size={14} />
            <span>India's AI-Powered Digital Freight Marketplace</span>
          </div>
          <h1 className="hero-text-animate text-5xl md:text-7xl font-bold tracking-tight text-gray-900 mb-6 leading-tight">
            Move Anything.<br />
            Anywhere. <span className="text-blue-600 font-extrabold">Smarter.</span>
          </h1>
          <p className="hero-text-animate text-lg text-gray-500 mb-8 max-w-lg">
            Connect instantly with thousands of verified carriers, optimize routes using AI, track shipments in real time, and settle payments instantly.
          </p>
          <div className="hero-text-animate flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => onNavigate('shipper')}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/10"
            >
              <span>Access Shipper Portal</span>
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => onNavigate('admin')}
              className="bg-gray-50 text-gray-900 px-8 py-4 rounded-lg font-semibold border border-gray-200 hover:bg-gray-100 transition text-center"
            >
              Admin Dashboard
            </button>
          </div>
        </div>

        {/* Instant Freight Estimate Form */}
        <div id="estimator" className="hero-form-animate bg-white border border-gray-100 rounded-2xl p-8 shadow-xl shadow-gray-200/50">
          <h3 className="text-xl font-bold mb-6 text-gray-900">Get Instant Rate Estimate</h3>
          <form onSubmit={handleEstimate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Pickup Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="e.g. Okhla, New Delhi"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:border-blue-600 focus:bg-white outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Destination</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  value={dest}
                  onChange={(e) => setDest(e.target.value)}
                  placeholder="e.g. Kalamboli, Navi Mumbai"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:border-blue-600 focus:bg-white outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Truck Type</label>
              <select
                value={truckType}
                onChange={(e) => setTruckType(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-4 text-sm focus:border-blue-600 focus:bg-white outline-none"
              >
                {truckCategories.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} ({t.capacity})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
            >
              Calculate AI Estimate Price
            </button>
          </form>

          {estimatedPrice !== null && (
            <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 font-semibold uppercase">Estimated Freight Cost</span>
                <p className="text-3xl font-black text-blue-600">₹{estimatedPrice.toLocaleString()}</p>
              </div>
              <button
                onClick={() => onNavigate('shipper')}
                className="bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-blue-700 transition"
              >
                Book Now
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 3D Scroll-Based RouteX Product Showcase Section */}
      <section className="bg-slate-950 overflow-hidden border-t border-slate-900">
        <ContainerScroll
          titleComponent={
            <div className="space-y-3 md:space-y-4">
              <div className="inline-flex items-center space-x-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold">
                <Zap size={15} className="text-amber-400" />
                <span>Next-Generation Digital Freight Control Engine</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Unleash the Power of <br className="hidden sm:inline" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                  Real-Time AI Logistics
                </span>
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm md:text-base max-w-2xl mx-auto px-4">
                Experience India's most advanced freight control center. Manage live shipments, optimize carrier routes, and settle payments in real time.
              </p>
            </div>
          }
        >
          <RouteXDashboardPreview />
        </ContainerScroll>
      </section>

      {/* Trust Pillars */}
      <section id="features" className="py-20 bg-gray-50 border-t border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">Designed for Modern Logistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="trust-card-animate bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-6">
                <Shield size={24} />
              </div>
              <h4 className="text-xl font-bold mb-3">100% Verified Users</h4>
              <p className="text-gray-500 text-sm leading-relaxed">
                All drivers and fleet owners undergo strict Aadhaar, DL, and GST verification before onboarding to ensure premium safety.
              </p>
            </div>
            <div className="trust-card-animate bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-6">
                <Clock size={24} />
              </div>
              <h4 className="text-xl font-bold mb-3">AI Pricing & Dispatch</h4>
              <p className="text-gray-500 text-sm leading-relaxed">
                Get real-time freight pricing matching market rates and optimal driver assignments using state-of-the-art AI.
              </p>
            </div>
            <div className="trust-card-animate bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-6">
                <CheckCircle size={24} />
              </div>
              <h4 className="text-xl font-bold mb-3">Digital ePOD & Fast Payments</h4>
              <p className="text-gray-500 text-sm leading-relaxed">
                Instant digital proof of delivery upload with automatic, direct wallet and bank settlements for drivers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
          <div className="flex items-center space-x-3 text-white">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center font-bold text-lg">R</div>
            <span className="font-bold tracking-tight">RouteX</span>
          </div>
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} RouteX Technologies Private Limited. All rights reserved.</p>
          <div className="flex space-x-6 text-sm font-medium">
            <a href="#" className="hover:text-white transition">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

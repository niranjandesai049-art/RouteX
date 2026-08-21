'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const Component = () => {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    const triggerElement = triggerRef.current;
    if (!triggerElement) return;

    // GSAP ScrollTrigger timeline matching data-parallax-layer concept
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: triggerElement,
        start: '0% 0%',
        end: '100% 0%',
        scrub: 0,
      },
    });

    const layers = [
      { layer: '1', yPercent: 70 },
      { layer: '2', yPercent: 55 },
      { layer: '3', yPercent: 40 },
      { layer: '4', yPercent: 10 },
    ];

    layers.forEach((item) => {
      const el = triggerElement.querySelector(`[data-parallax-layer="${item.layer}"]`);
      if (el) {
        tl.to(
          el,
          {
            yPercent: item.yPercent,
            ease: 'none',
          },
          0
        );
      }
    });

    // 🌟 Entrance animations on initial page load (wows the user!)
    const entryTl = gsap.timeline({
      defaults: { ease: 'power3.out' }
    });

    // 1. Background image zoom out + fade in
    const bgEl = triggerElement.querySelector('[data-parallax-layer="1"]');
    if (bgEl) {
      entryTl.fromTo(bgEl,
        { scale: 1.12, opacity: 0 },
        { scale: 1, opacity: 0.85, duration: 1.8 },
        0
      );
    }

    // 2. Title fade & slide down
    const titleEl = triggerElement.querySelector('.parallax__title');
    if (titleEl) {
      entryTl.fromTo(titleEl,
        { y: -60, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.4 },
        0.3
      );
    }

    // 3. Subtitle fade & slide up
    const subtitleEl = triggerElement.querySelector('.parallax__layer-title p');
    if (subtitleEl) {
      entryTl.fromTo(subtitleEl,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2 },
        0.5
      );
    }

    // 4. Truck & Shadow slide up with back bounce
    const truckWrapper = triggerElement.querySelector('[data-parallax-layer="4"] > div');
    if (truckWrapper) {
      entryTl.fromTo(truckWrapper,
        { y: 150, scale: 0.9, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, ease: 'back.out(1.1)', duration: 1.6 },
        0.4
      );
    }

    return () => {
      gsap.ticker.remove(updateTicker);
      ScrollTrigger.getAll().forEach((st) => st.kill());
      gsap.killTweensOf(triggerElement);
      if (bgEl) gsap.killTweensOf(bgEl);
      if (titleEl) gsap.killTweensOf(titleEl);
      if (subtitleEl) gsap.killTweensOf(subtitleEl);
      if (truckWrapper) gsap.killTweensOf(truckWrapper);
      lenis.destroy();
    };
  }, []);

  return (
    <section
      ref={triggerRef}
      className="parallax relative w-full h-[130vh] overflow-hidden bg-slate-950 text-white border-b border-slate-900"
    >
      <div data-parallax-layers className="parallax__layers relative w-full h-full">
        {/* Layer 1: Background Distant Landscape */}
        <div
          data-parallax-layer="1"
          className="absolute inset-0 w-full h-full bg-cover bg-center opacity-85"
          style={{
            backgroundImage: `radial-gradient(ellipse at 50% 30%, rgba(37, 99, 235, 0.3) 0%, rgba(2, 6, 23, 0.95) 75%), url('https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=2000&q=80')`,
            willChange: 'transform',
          }}
        />

        {/* Layer 2: Environment / Highway Perspective Road */}
        <div
          data-parallax-layer="2"
          className="absolute inset-x-0 bottom-0 h-[60vh] w-full flex items-end justify-center pointer-events-none"
          style={{ willChange: 'transform' }}
        >
          <div className="relative w-full h-full flex flex-col justify-end items-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent z-10" />
            <div
              className="w-[180%] h-[80%] bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-t-2 border-blue-500/40 shadow-2xl flex justify-center overflow-hidden"
              style={{ transform: 'perspective(600px) rotateX(62deg)' }}
            >
              {/* Road Lane Marking */}
              <div className="w-3 h-full bg-gradient-to-b from-amber-400 via-amber-500/40 to-transparent opacity-80 shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
            </div>
          </div>
        </div>

        {/* Layer 3: RouteX Title Branding */}
        <div
          data-parallax-layer="3"
          className="parallax__layer-title absolute inset-0 flex flex-col items-center justify-start pt-20 md:pt-28 pointer-events-none z-20"
          style={{ willChange: 'transform' }}
        >
          <h1 className="parallax__title text-[15vw] md:text-[16vw] font-black tracking-tighter leading-none uppercase bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-100 to-slate-400/10 drop-shadow-[0_25px_60px_rgba(0,0,0,0.9)] select-none">
            Route<span className="text-blue-500">X</span>
          </h1>
          <p className="mt-2 text-xs md:text-sm font-semibold tracking-[0.35em] uppercase text-blue-400 bg-blue-950/70 border border-blue-500/30 px-4 py-1.5 rounded-full backdrop-blur-md shadow-lg shadow-blue-500/10">
            India's AI-Powered Digital Freight Marketplace
          </p>
        </div>

        {/* Layer 4: Uploaded Semi-Truck (Foreground Visual) */}
        <div
          data-parallax-layer="4"
          className="absolute inset-x-0 bottom-16 md:bottom-24 z-30 flex justify-center items-end pointer-events-none px-4"
          style={{ willChange: 'transform' }}
        >
          <div className="relative w-[85%] sm:w-[65%] md:w-[50%] lg:w-[45%] max-w-[850px] flex justify-center">
            {/* Natural Contact Shadow */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[85%] h-8 bg-black/90 blur-md rounded-full pointer-events-none" />

            {/* Exact Uploaded Truck PNG */}
            <img
              src="/truck-hero.png"
              alt="RouteX Freight Truck"
              className="w-full h-auto object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.8)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Component;

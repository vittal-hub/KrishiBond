import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Wheat, Building2, Sparkles, ShieldCheck } from 'lucide-react';
import heroBg from '../../assets/krishibond4.avif';

export default function HeroSection() {
  return (
    <section
      className="relative overflow-hidden min-h-[34rem] sm:min-h-[38rem] lg:min-h-[44rem] flex items-center"
      style={{ backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Slow, subtle zoom on the background photo for a premium first impression */}
      <div
        className="absolute inset-0 bg-cover bg-center animate-hero-zoom"
        style={{ backgroundImage: `url(${heroBg})` }}
        aria-hidden="true"
      />

      {/* Dark-to-green gradient overlay so headline/CTA text stays readable on any photo */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/60 to-canopy-900/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 w-full">
        <div className="max-w-2xl animate-fade-in">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold tracking-widest uppercase text-harvest-200 bg-paper/10 backdrop-blur px-3 py-1 rounded-full border border-paper/20">
            <Sparkles className="w-3.5 h-3.5" /> Assured contract farming platform
          </span>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.08] mt-5 text-paper drop-shadow-sm">
            Secure Contract Farming
            <br className="hidden sm:block" /> for a{' '}
            <span className="text-canopy-300">Better Future.</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-paper/90 max-w-xl leading-relaxed">
            KrishiBond connects farmers with verified buyers through digital
            contracts, transparent price negotiation, and secure escrow
            payments — so every harvest has a guaranteed home, and every deal
            is paid through to delivery.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
            <Link to="/register" className="btn-primary text-base px-6 py-3">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/register?role=farmer"
              className="inline-flex items-center justify-center gap-2 rounded-stub px-5 py-3 text-sm font-semibold bg-paper/10 backdrop-blur text-paper border border-paper/30 hover:bg-paper/20 hover:-translate-y-0.5 transition-all"
            >
              <Wheat className="w-4 h-4" /> Register as Farmer
            </Link>
            <Link
              to="/register?role=buyer"
              className="inline-flex items-center justify-center gap-2 rounded-stub px-5 py-3 text-sm font-semibold bg-paper/10 backdrop-blur text-paper border border-paper/30 hover:bg-paper/20 hover:-translate-y-0.5 transition-all"
            >
              <Building2 className="w-4 h-4" /> Register as Buyer
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-paper/80">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-canopy-300" /> Escrow-protected payments
            </span>
            <span className="hidden sm:inline text-paper/40">·</span>
            <span>No listing fees</span>
            <span className="hidden sm:inline text-paper/40">·</span>
            <span>Verified buyers &amp; farmers</span>
          </div>
        </div>
      </div>
    </section>
  );
}

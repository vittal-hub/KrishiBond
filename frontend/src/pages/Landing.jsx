import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Sprout, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import Loader from "../components/Loader.jsx";
import HeroSection from "../components/landing/HeroSection.jsx";
import WhyKrishiBond from "../components/landing/WhyKrishiBond.jsx";
import HowItWorks from "../components/landing/HowItWorks.jsx";
import Benefits from "../components/landing/Benefits.jsx";
import PlatformFeatures from "../components/landing/PlatformFeatures.jsx";
import WhyChooseUs from "../components/landing/WhyChooseUs.jsx";
import FAQAccordion from "../components/landing/FAQAccordion.jsx";
import CTASection from "../components/landing/CTASection.jsx";
import LandingFooter from "../components/landing/LandingFooter.jsx";

const NAV_LINKS = [
  { label: "Why us", href: "#why" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "FAQ", href: "#faq" },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, loading } = useAuth();

  // "/" is the public marketing page and has no idea whether a visitor is
  // authenticated - previously an already-logged-in user landing here (e.g.
  // via the app's own logo link) saw this logged-out header/CTAs with no
  // trace of their session, which looked exactly like being logged out even
  // though nothing about their auth state had actually changed. Redirecting
  // to the real authenticated home here closes that gap for every path that
  // can land a signed-in user on "/", not just the logo link.
  if (loading) return <Loader full label="Loading" />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-stub bg-canopy-600 flex items-center justify-center">
              <Sprout className="w-4.5 h-4.5 text-paper" size={18} />
            </div>
            <span className="font-display text-lg font-semibold">KrishiBond</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-ink-soft hover:text-canopy-700 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="btn-ghost">
              Log in
            </Link>
            <Link to="/register" className="btn-primary">
              Get started
            </Link>
          </div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-stub hover:bg-ink/5"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-ink/10 bg-paper px-4 sm:px-6 py-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium text-ink-soft hover:text-canopy-700"
              >
                {link.label}
              </a>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <Link to="/login" className="btn-ghost flex-1 justify-center" onClick={() => setMenuOpen(false)}>
                Log in
              </Link>
              <Link to="/register" className="btn-primary flex-1 justify-center" onClick={() => setMenuOpen(false)}>
                Get started
              </Link>
            </div>
          </div>
        )}
      </header>

      <main>
        <HeroSection />
        <WhyKrishiBond />
        <HowItWorks />
        <Benefits />
        <PlatformFeatures />
        <WhyChooseUs />
        <FAQAccordion />
        <CTASection />
      </main>

      <LandingFooter />
    </div>
  );
}

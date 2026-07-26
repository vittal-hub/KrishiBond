import React from "react";
import { Link } from "react-router-dom";
import {
  Sprout,
  ShieldCheck,
  Handshake,
  LineChart,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Handshake,
    title: "Matched, not cold-called",
    body: "Search and match by crop, location, and production capacity — buyers and farmers find each other on fit, not luck.",
  },
  {
    icon: LineChart,
    title: "Negotiate with real numbers",
    body: "Bid on price with live market benchmarks in view, so neither side is guessing what fair looks like.",
  },
  {
    icon: ShieldCheck,
    title: "Payment held until delivery",
    body: "Escrow releases funds only once contract milestones are confirmed by both parties.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-stub bg-canopy-600 flex items-center justify-center">
            <Sprout className="w-4.5 h-4.5 text-paper" size={18} />
          </div>
          <span className="font-display text-lg font-semibold">KrishiBond</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost">
            Log in
          </Link>
          <Link to="/register" className="btn-primary">
            Get started
          </Link>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-block text-xs font-mono font-semibold tracking-widest uppercase text-harvest-600 bg-harvest-50 px-3 py-1 rounded-full border border-harvest-200">
            Contract No. 000001 — Trust, signed
          </span>
          <h1 className="font-display text-5xl sm:text-6xl font-semibold leading-[1.05] mt-5 text-ink">
            Farming deals,
            <br />
            <span className="text-canopy-600">made assured.</span>
          </h1>
          <p className="mt-6 text-lg text-ink-soft max-w-lg leading-relaxed">
            KrishiBond connects farmers with verified buyers through contracts
            that are negotiated in the open, paid through escrow, and tracked
            end to end — so a harvest never has to end in a guessing game.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/register" className="btn-primary text-base px-6 py-3">
              Create an account <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="btn-secondary text-base px-6 py-3">
              I already have one
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="stub-card p-6 bg-perforation bg-perf bg-left bg-repeat-y ml-4">
            <div className="border-l-2 border-dashed border-ink/15 pl-6">
              <p className="font-mono text-xs text-ink-faint uppercase tracking-widest">
                Contract Stub
              </p>
              <h3 className="font-display text-2xl font-semibold mt-1">
                Basmati Rice — 12 Tonnes
              </h3>
              <div className="mt-4 space-y-2 text-sm text-ink-soft">
                <div className="flex justify-between">
                  <span>Farmer</span>
                  <span className="font-medium text-ink">
                    R. Meena, Sri Ganganagar
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Buyer</span>
                  <span className="font-medium text-ink">
                    Amber Foods Pvt. Ltd.
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Agreed price</span>
                  <span className="font-medium text-ink">₹42,500 / tonne</span>
                </div>
                <div className="flex justify-between">
                  <span>Escrow status</span>
                  <span className="font-medium text-canopy-700">Funded</span>
                </div>
              </div>
              <div className="mt-5">
                <span className="stamp stamp-active">Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-ink/10 bg-paper-dim/60">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <h2 className="font-display text-3xl font-semibold text-center">
            Built around one problem: uncertainty
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="stub-card p-6">
                <Icon className="w-6 h-6 text-canopy-600" />
                <h3 className="font-display text-xl font-semibold mt-4">
                  {title}
                </h3>
                <p className="text-sm text-ink-soft mt-2 leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="max-w-7xl mx-auto px-6 py-10 text-sm text-ink-faint flex items-center justify-between">
        <span>© {new Date().getFullYear()} KrishiBond</span>
        <Link to="/help" className="hover:text-ink">
          Help Center
        </Link>
      </footer>
    </div>
  );
}

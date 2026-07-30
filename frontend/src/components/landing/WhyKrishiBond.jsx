import React from 'react';
import { ShieldCheck, Users, FileCheck, Lock, Scale, FileSignature, Store } from 'lucide-react';
import Reveal from './Reveal.jsx';

const REASONS = [
  {
    icon: FileCheck,
    title: 'Assured Contract Farming',
    body: 'Every crop is grown against a signed agreement, not a hope that someone shows up to buy it.',
  },
  {
    icon: Users,
    title: 'Guaranteed Buyers',
    body: 'Farmers list produce and get matched with verified buyers actively looking for that crop.',
  },
  {
    icon: FileSignature,
    title: 'Transparent Agreements',
    body: 'Every term — price, quantity, delivery date — is visible to both sides before anyone signs.',
  },
  {
    icon: Lock,
    title: 'Secure Escrow Payments',
    body: "Buyer funds sit in escrow and release only once delivery milestones are confirmed.",
  },
  {
    icon: Scale,
    title: 'Fair Price Negotiation',
    body: 'Live market benchmarks keep offers grounded, so neither side is negotiating blind.',
  },
  {
    icon: ShieldCheck,
    title: 'Digital Contracts',
    body: 'Contracts are generated, signed, and stored digitally — always downloadable as PDF.',
  },
  {
    icon: Store,
    title: 'Direct Farmer-to-Buyer Marketplace',
    body: 'No middlemen taking a cut — farmers and buyers deal with each other, directly.',
  },
];

export default function WhyKrishiBond() {
  return (
    <section id="why" className="border-t border-ink/10 bg-paper-dim/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold">Why KrishiBond?</h2>
          <p className="text-ink-soft mt-3">
            Built around one problem: the uncertainty that makes farming a gamble instead of a business.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {REASONS.map(({ icon: Icon, title, body }, idx) => (
            <Reveal key={title} delay={idx * 80}>
              <div className="stub-card p-6 h-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <div className="w-11 h-11 rounded-stub bg-canopy-50 flex items-center justify-center">
                  <Icon className="w-5.5 h-5.5 text-canopy-600" size={22} />
                </div>
                <h3 className="font-display text-lg font-semibold mt-4">{title}</h3>
                <p className="text-sm text-ink-soft mt-2 leading-relaxed">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

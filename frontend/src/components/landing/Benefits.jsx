import React from 'react';
import { Wheat, Building2, CheckCircle2 } from 'lucide-react';
import Reveal from './Reveal.jsx';
import benefitsImage from '../../assets/krishibond1.jpeg';

const FARMER_BENEFITS = [
  'Guaranteed income before harvest even begins',
  'No middlemen — deal directly with buyers',
  'Better market access beyond the local mandi',
  'Secure payments held in escrow',
  'Plan production with demand you can see',
];

const BUYER_BENEFITS = [
  'Source from trusted, KYC-verified farmers',
  'Consistent, quality produce on schedule',
  'Transparent pricing backed by market data',
  'Reliable supply through binding contracts',
  'Manage every contract from one dashboard',
];

function BenefitCard({ icon: Icon, title, items, accent }) {
  return (
    <div className="stub-card p-6 h-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
      <div className={`w-11 h-11 rounded-stub flex items-center justify-center ${accent.bg}`}>
        <Icon className={`w-5.5 h-5.5 ${accent.text}`} size={22} />
      </div>
      <h3 className="font-display text-lg font-semibold mt-3.5">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-ink-soft">
            <CheckCircle2 className={`w-4.5 h-4.5 shrink-0 mt-0.5 ${accent.text}`} size={18} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Benefits() {
  return (
    <section id="benefits" className="border-t border-ink/10 bg-paper-dim/60 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold">Built for both sides of the deal</h2>
          <p className="text-ink-soft mt-3">Whether you grow it or buy it, KrishiBond works in your favor.</p>
        </Reveal>

        {/* Split-screen: photo on one side, benefit cards on the other */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 mt-12 items-center">
          <Reveal className="relative order-2 lg:order-1">
            <div className="pointer-events-none absolute -top-10 -left-10 w-56 h-56 rounded-full bg-canopy-300/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 -right-8 w-48 h-48 rounded-3xl bg-harvest-400/25 blur-2xl -rotate-6" />

            <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-ink/10 hover:-translate-y-1.5 transition-transform duration-500">
              <img
                src={benefitsImage}
                alt="A smiling farmer handing a basket of fresh vegetables to a buyer carrying a Local Harvest tote bag, walking together through the fields"
                className="w-full h-72 sm:h-96 lg:h-[26rem] object-cover"
                loading="lazy"
                width="1024"
                height="576"
              />
            </div>
          </Reveal>

          <div className="order-1 lg:order-2 space-y-6">
            <Reveal>
              <BenefitCard
                icon={Wheat}
                title="For Farmers"
                items={FARMER_BENEFITS}
                accent={{ bg: 'bg-canopy-50', text: 'text-canopy-600' }}
              />
            </Reveal>
            <Reveal delay={120}>
              <BenefitCard
                icon={Building2}
                title="For Buyers"
                items={BUYER_BENEFITS}
                accent={{ bg: 'bg-irrigation-50', text: 'text-irrigation-600' }}
              />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

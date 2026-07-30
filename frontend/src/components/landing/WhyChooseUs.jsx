import React from 'react';
import { Eye, ShieldCheck, Scale, Zap, BadgeCheck } from 'lucide-react';
import Reveal from './Reveal.jsx';

const POINTS = [
  { icon: Eye, title: 'Transparency', body: 'Every term of every contract is visible to both parties, always.' },
  { icon: ShieldCheck, title: 'Security', body: 'Escrow payments and verified accounts keep every deal safe.' },
  { icon: Scale, title: 'Fair Pricing', body: 'Market benchmarks keep negotiations honest on both sides.' },
  { icon: Zap, title: 'Faster Agreements', body: 'Go from offer to signed contract in minutes, not weeks.' },
  { icon: BadgeCheck, title: 'Trusted Marketplace', body: 'A growing network of verified farmers and buyers, nationwide.' },
];

export default function WhyChooseUs() {
  return (
    <section className="border-t border-ink/10 bg-paper-dim/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold">Why Choose Us</h2>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5 mt-12">
          {POINTS.map(({ icon: Icon, title, body }, idx) => (
            <Reveal key={title} delay={idx * 80}>
              <div className="text-center p-5">
                <div className="w-14 h-14 rounded-full bg-canopy-600 text-paper flex items-center justify-center mx-auto shadow-stub">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-display text-base font-semibold mt-4">{title}</h3>
                <p className="text-xs text-ink-soft mt-2 leading-relaxed">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

import React from 'react';
import { Quote, Star } from 'lucide-react';
import Reveal from './Reveal.jsx';

const TESTIMONIALS = [
  {
    name: 'Ramesh Meena',
    role: 'Farmer, Sri Ganganagar',
    quote:
      "For the first time I knew my price before I sowed the crop. The escrow payment meant I wasn't chasing anyone after delivery.",
  },
  {
    name: 'Amber Foods Pvt. Ltd.',
    role: 'Buyer, Processing Unit',
    quote:
      'We source from five districts through KrishiBond now. Contracts are clear, and quality has been consistent every season.',
  },
  {
    name: 'Sunita Patil',
    role: 'Farmer, Nashik',
    quote:
      "Negotiating price used to mean guessing. Now I see market benchmarks right next to the buyer's offer before I decide.",
  },
  {
    name: 'Green Harvest Traders',
    role: 'Buyer, Wholesale',
    quote:
      'Dispute resolution actually worked when we needed it. That trust is why we keep coming back to the platform.',
  },
];

export default function Testimonials() {
  return (
    <section className="border-t border-ink/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold">What our users say</h2>
          <p className="text-ink-soft mt-3">Real farmers and buyers, real contracts.</p>
        </Reveal>

        <div className="grid sm:grid-cols-2 gap-6 mt-12">
          {TESTIMONIALS.map(({ name, role, quote }, idx) => (
            <Reveal key={name} delay={idx * 100}>
              <div className="stub-card p-6 h-full">
                <Quote className="w-7 h-7 text-harvest-400" />
                <p className="text-sm text-ink-soft mt-3 leading-relaxed">&ldquo;{quote}&rdquo;</p>
                <div className="flex items-center gap-3 mt-5">
                  <div className="w-10 h-10 rounded-full bg-canopy-100 flex items-center justify-center text-canopy-700 font-semibold">
                    {name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{name}</p>
                    <p className="text-xs text-ink-faint">{role}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className="w-3.5 h-3.5 fill-harvest-500 text-harvest-500" />
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

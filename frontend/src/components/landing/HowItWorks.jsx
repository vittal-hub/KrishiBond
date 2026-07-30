import React from 'react';
import { UserPlus, Sprout, Handshake, FileSignature } from 'lucide-react';
import Reveal from './Reveal.jsx';

const STEPS = [
  {
    icon: UserPlus,
    title: 'Farmer Registers',
    body: 'Sign up, complete your profile, and verify your KYC details in a few minutes.',
  },
  {
    icon: Sprout,
    title: 'Creates Crop Listing',
    body: 'List your crop with quantity, expected yield, and harvest date for buyers to discover.',
  },
  {
    icon: Handshake,
    title: 'Buyer Sends Offer & Negotiates',
    body: 'Buyers browse listings and send offers; both sides negotiate price with real market data.',
  },
  {
    icon: FileSignature,
    title: 'Digital Contract + Secure Payment',
    body: 'Once agreed, a digital contract is signed and payment is locked in escrow until delivery.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-ink/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold">How It Works</h2>
          <p className="text-ink-soft mt-3">From registration to a paid, delivered contract — four steps.</p>
        </Reveal>

        <div className="relative mt-14">
          {/* Connecting line - desktop only */}
          <div className="hidden lg:block absolute top-9 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-canopy-200 via-canopy-400 to-canopy-200" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {STEPS.map(({ icon: Icon, title, body }, idx) => (
              <Reveal key={title} delay={idx * 120}>
                <div className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 w-[4.5rem] h-[4.5rem] rounded-full bg-canopy-600 text-paper flex items-center justify-center shadow-stub">
                    <Icon className="w-7 h-7" />
                    <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-harvest-500 text-ink text-xs font-bold flex items-center justify-center border-2 border-paper">
                      {idx + 1}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-semibold mt-5">{title}</h3>
                  <p className="text-sm text-ink-soft mt-2 leading-relaxed max-w-[15rem]">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import React from 'react';
import {
  Sprout,
  Scale,
  FileSignature,
  Lock,
  Bell,
  MessageSquare,
  BarChart3,
  ListChecks,
  Sparkles,
  CloudSun,
  Landmark,
  Languages,
} from 'lucide-react';
import Reveal from './Reveal.jsx';

const FEATURES = [
  { icon: Sprout, title: 'Smart Crop Listings', body: 'List produce with yield, harvest date, and quality certificates.' },
  { icon: Scale, title: 'Price Negotiation', body: 'Bid, counter-offer, and settle on a fair price with market data.' },
  { icon: FileSignature, title: 'Digital Contracts', body: 'Legally clear, signable contracts generated in seconds.' },
  { icon: Lock, title: 'Escrow Payments', body: 'Funds held securely until both sides confirm delivery.' },
  { icon: Bell, title: 'Real-Time Notifications', body: 'Stay on top of offers, signatures, and payments as they happen.' },
  { icon: MessageSquare, title: 'Live Chat', body: 'Message your counterparty directly, right inside the contract.' },
  { icon: BarChart3, title: 'Analytics Dashboard', body: 'Track income, contract value, and performance over time.' },
  { icon: ListChecks, title: 'Contract Tracking', body: 'Follow every contract from proposal through fulfilment.' },
  { icon: Sparkles, title: 'AI Price Insights', body: 'Predictive pricing guidance to help you negotiate smarter.', comingSoon: true },
  { icon: CloudSun, title: 'Weather Updates', body: 'Localized forecasts to help plan sowing and harvest.', comingSoon: true },
  { icon: Landmark, title: 'Government Schemes', body: 'Discover subsidies and schemes relevant to your crop.', comingSoon: true },
  { icon: Languages, title: 'Multi-language Support', body: 'Use KrishiBond in the language you\'re most comfortable in.', comingSoon: true },
];

export default function PlatformFeatures() {
  return (
    <section id="features" className="border-t border-ink/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold">Platform Features</h2>
          <p className="text-ink-soft mt-3">Everything you need to run contract farming end to end.</p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {FEATURES.map(({ icon: Icon, title, body, comingSoon }, idx) => (
            <Reveal key={title} delay={(idx % 4) * 80}>
              <div className="relative stub-card p-5 h-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                {comingSoon && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wide text-harvest-700 bg-harvest-50 border border-harvest-200 px-2 py-0.5 rounded-full">
                    Soon
                  </span>
                )}
                <div className="w-10 h-10 rounded-stub bg-canopy-50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-canopy-600" />
                </div>
                <h3 className="font-display text-base font-semibold mt-3.5">{title}</h3>
                <p className="text-xs text-ink-soft mt-1.5 leading-relaxed">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

import React, { useEffect, useState } from 'react';
import { Users, Building2, FileSignature, ShieldCheck } from 'lucide-react';
import { useInView } from '../../hooks/useInView.js';

const STATS = [
  { icon: Users, value: 5000, suffix: '+', label: 'Farmers' },
  { icon: Building2, value: 1200, suffix: '+', label: 'Buyers' },
  { icon: FileSignature, value: 18000, suffix: '+', label: 'Contracts' },
  { icon: ShieldCheck, value: 99, suffix: '%', label: 'Secure Payments' },
];

function Counter({ target, suffix, active, duration = 1600 }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return undefined;
    let frame;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3; // ease-out-cubic
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target, duration]);

  return (
    <span>
      {value.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

export default function StatsCounter() {
  const [ref, inView] = useInView({ threshold: 0.4 });

  return (
    <section ref={ref} className="border-t border-ink/10 bg-canopy-600 text-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map(({ icon: Icon, value, suffix, label }) => (
            <div key={label} className="text-center">
              <Icon className="w-6 h-6 mx-auto text-canopy-100" />
              <p className="font-display text-3xl sm:text-4xl font-semibold mt-3">
                <Counter target={value} suffix={suffix} active={inView} />
              </p>
              <p className="text-sm text-canopy-100 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

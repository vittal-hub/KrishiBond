import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Facebook, Twitter, Instagram, Linkedin, Mail } from 'lucide-react';

const LINK_GROUPS = [
  {
    title: 'KrishiBond',
    links: [
      { label: 'Why KrishiBond', href: '#why' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Features', href: '#features' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', to: '/help' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Contact', href: 'mailto:support@krishibond.com' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', comingSoon: true },
      { label: 'Terms & Conditions', comingSoon: true },
    ],
  },
];

const SOCIALS = [
  { icon: Facebook, label: 'Facebook', href: 'https://facebook.com' },
  { icon: Twitter, label: 'Twitter', href: 'https://twitter.com' },
  { icon: Instagram, label: 'Instagram', href: 'https://instagram.com' },
  { icon: Linkedin, label: 'LinkedIn', href: 'https://linkedin.com' },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-ink/10 bg-paper-dim/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-stub bg-canopy-600 flex items-center justify-center">
                <Sprout className="w-4.5 h-4.5 text-paper" size={18} />
              </div>
              <span className="font-display text-lg font-semibold">KrishiBond</span>
            </div>
            <p className="text-sm text-ink-soft mt-4 max-w-xs leading-relaxed">
              Assured contract farming — connecting farmers and buyers through
              transparent agreements and secure escrow payments.
            </p>
            <div className="flex items-center gap-2 mt-5">
              {SOCIALS.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-full border border-ink/10 flex items-center justify-center text-ink-faint hover:text-canopy-700 hover:border-canopy-300 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{group.title}</p>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.comingSoon ? (
                      <span className="text-sm text-ink-faint cursor-default">
                        {link.label} <span className="text-[10px] uppercase">(soon)</span>
                      </span>
                    ) : link.to ? (
                      <Link to={link.to} className="text-sm text-ink-soft hover:text-canopy-700 transition-colors">
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} className="text-sm text-ink-soft hover:text-canopy-700 transition-colors">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-ink/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-faint">
          <span>© {new Date().getFullYear()} KrishiBond. All rights reserved.</span>
          <a href="mailto:support@krishibond.com" className="flex items-center gap-1.5 hover:text-ink">
            <Mail className="w-3.5 h-3.5" /> support@krishibond.com
          </a>
        </div>
      </div>
    </footer>
  );
}

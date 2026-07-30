import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import Reveal from './Reveal.jsx';

const FAQS = [
  {
    question: 'What is contract farming?',
    answer:
      "Contract farming is an agreement between a farmer and a buyer, made before the harvest, that fixes the price, quantity, and delivery terms in advance. KrishiBond makes that agreement digital, transparent, and enforceable.",
  },
  {
    question: 'How are payments secured?',
    answer:
      'When a contract is signed, the buyer funds the agreed amount into an escrow account. The money is only released to the farmer once delivery milestones are confirmed by both sides — it never sits with either party unprotected.',
  },
  {
    question: 'How do buyers contact farmers?',
    answer:
      'Buyers can message a farmer directly from a crop listing, or send a formal offer to start contract negotiation. All communication happens inside the platform, so there is always a record.',
  },
  {
    question: 'What happens if a dispute occurs?',
    answer:
      "Either party can raise a dispute directly from the contract. Our support team reviews evidence and comments from both sides and works to a fair resolution — with payments held safely in escrow throughout.",
  },
  {
    question: 'Is registration free?',
    answer:
      'Yes. Creating an account, listing crops, and negotiating contracts on KrishiBond is free for both farmers and buyers.',
  },
];

function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="stub-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 text-left px-5 py-4"
        aria-expanded={isOpen}
      >
        <span className="text-sm sm:text-base font-semibold text-ink">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-ink-faint shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-sm text-ink-soft leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="border-t border-ink/10 bg-paper-dim/60">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold tracking-widest uppercase text-canopy-700 bg-canopy-50 px-3 py-1 rounded-full border border-canopy-200">
            <HelpCircle className="w-3.5 h-3.5" /> FAQ
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold mt-4">Frequently asked questions</h2>
        </Reveal>

        <div className="mt-10 space-y-3">
          {FAQS.map((faq, idx) => (
            <Reveal key={faq.question} delay={idx * 60}>
              <FAQItem
                {...faq}
                isOpen={openIndex === idx}
                onToggle={() => setOpenIndex((current) => (current === idx ? -1 : idx))}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

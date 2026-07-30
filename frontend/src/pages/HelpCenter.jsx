import React, { useEffect, useState } from 'react';
import { ChevronDown, LifeBuoy, Ticket } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { supportApi } from '../api/communicationApi';
import { formatRelative } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

const FALLBACK_FAQS = [
  { question: 'How does escrow protect my payment?', answer: 'Once a buyer funds a contract, the amount sits in escrow and is only released to the farmer after both sides confirm the delivery milestone.' },
  { question: 'What happens if we disagree on price?', answer: 'Either side can send a counter-offer from the contract page. Market benchmarks are shown alongside each listing to keep negotiations grounded.' },
  { question: 'How do I raise a dispute?', answer: 'Open the contract in question and select "Report a problem." Our support team reviews every dispute within 48 hours.' },
  { question: 'Can I cancel a contract after accepting it?', answer: 'Active contracts can be cancelled from the contract detail page, but repeated cancellations may affect your trust score.' },
];

const TICKET_STATUS_STYLE = {
  open: 'bg-harvest-50 text-harvest-700 border-harvest-400/30',
  in_progress: 'bg-irrigation-50 text-irrigation-700 border-irrigation-400/30',
  closed: 'bg-ink/5 text-ink-faint border-ink/10',
};

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-ink/10 py-4">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-left">
        <span className="text-sm font-medium text-ink">{question}</span>
        <ChevronDown className={`w-4 h-4 text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="text-sm text-ink-soft mt-2 leading-relaxed">{answer}</p>}
    </div>
  );
}

export default function HelpCenter() {
  const [faqs, setFaqs] = useState(FALLBACK_FAQS);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const loadTickets = () => {
    supportApi
      .myTickets()
      .then((data) => setTickets(data.tickets ?? []))
      .catch(() => {})
      .finally(() => setLoadingTickets(false));
  };

  useEffect(() => {
    supportApi
      .faqs()
      .then((data) => data.faqs?.length && setFaqs(data.faqs))
      .catch(() => {});
    loadTickets();
  }, []);

  const onSubmit = async (values) => {
    try {
      await supportApi.submitTicket(values);
      toast.success('Ticket submitted — we\'ll get back to you within a day');
      reset();
      loadTickets();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not submit your ticket'));
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="stub-card p-6">
          <h1 className="font-display text-xl font-semibold flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-canopy-600" /> Frequently asked questions
          </h1>
          <div className="mt-2">
            {faqs.map((f) => <FaqItem key={f.question} {...f} />)}
          </div>
        </div>

        <div className="stub-card p-6">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Ticket className="w-4.5 h-4.5 text-canopy-600" /> Your tickets
          </h2>
          {loadingTickets ? (
            <p className="text-sm text-ink-faint mt-3">Loading…</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-ink-faint mt-3">You haven't submitted any support tickets yet.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {tickets.map((t) => (
                <div key={t._id} className="flex items-center justify-between p-3 rounded-stub border border-ink/10">
                  <div>
                    <p className="text-sm font-medium">{t.subject}</p>
                    <p className="text-xs text-ink-faint mt-0.5">{formatRelative(t.createdAt)}</p>
                  </div>
                  <span className={`text-xs font-semibold capitalize px-2.5 py-1 rounded-full border ${TICKET_STATUS_STYLE[t.status] || TICKET_STATUS_STYLE.open}`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="stub-card p-6 h-fit">
        <h2 className="font-display text-lg font-semibold">Contact support</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="subject">Subject</label>
            <input id="subject" className="input-field" {...register('subject', { required: 'Subject is required' })} />
            {errors.subject && <p className="text-xs text-clay-500 mt-1">{errors.subject.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="message">Message</label>
            <textarea id="message" rows={4} className="input-field resize-none" {...register('message', { required: 'Please describe your issue' })} />
            {errors.message && <p className="text-xs text-clay-500 mt-1">{errors.message.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Sending…' : 'Submit ticket'}
          </button>
        </form>
      </div>
    </div>
  );
}

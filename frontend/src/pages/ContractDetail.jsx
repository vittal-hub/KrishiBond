import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Wallet,
  Gavel,
  ListChecks,
  MessageSquare,
  PenLine,
  FileText,
  Download,
  Star,
  PackageCheck,
} from 'lucide-react';
import { contractApi } from '../api/contractApi';
import { reviewApi } from '../api/reviewApi';
import { useAuth } from '../context/AuthContext.jsx';
import StatusStamp from '../components/StatusStamp.jsx';
import Loader from '../components/Loader.jsx';
import DemoPaymentModal from '../components/payment/DemoPaymentModal.jsx';
import { formatCurrency, formatDate, formatRelative } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

function BidForm({ contractId, onPlaced }) {
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!amount || !quantity) return;
    setSubmitting(true);
    try {
      await contractApi.placeBid(contractId, { pricePerUnit: Number(amount), quantity: Number(quantity), message });
      toast.success('Counter-offer sent');
      setAmount('');
      setQuantity('');
      setMessage('');
      onPlaced();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not place your offer'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 mt-3">
      <input
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Price per unit (₹)"
        className="input-field sm:max-w-[160px]"
        required
      />
      <input
        type="number"
        step="0.01"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="Quantity"
        className="input-field sm:max-w-[120px]"
        required
      />
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Optional note"
        className="input-field"
      />
      <button type="submit" disabled={submitting} className="btn-accent whitespace-nowrap">
        {submitting ? 'Sending…' : 'Send offer'}
      </button>
    </form>
  );
}

function ClauseForm({ contractId, onAdded }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await contractApi.addClause(contractId, text.trim());
      setText('');
      onAdded();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not add clause'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex gap-2 mt-3">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Packaging must be moisture-proof jute bags"
        className="input-field"
      />
      <button type="submit" disabled={submitting} className="btn-secondary whitespace-nowrap">
        Add clause
      </button>
    </form>
  );
}

function ReleaseEscrowForm({ heldPayment, onRelease, disabled }) {
  const [amount, setAmount] = useState(String(heldPayment.amount));

  const submit = (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0 || value > heldPayment.amount) return;
    onRelease(value < heldPayment.amount ? value : undefined);
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <label className="label" htmlFor="releaseAmount">Release amount (₹, max {formatCurrency(heldPayment.amount)})</label>
      <div className="flex gap-2">
        <input
          id="releaseAmount"
          type="number"
          step="0.01"
          max={heldPayment.amount}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input-field"
        />
        <button type="submit" disabled={disabled} className="btn-accent whitespace-nowrap">
          Release
        </button>
      </div>
      <p className="text-xs text-ink-faint">Releasing less than the full amount keeps the remainder held for later milestones.</p>
    </form>
  );
}

function StarRatingInput({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
          <Star className={`w-6 h-6 ${n <= value ? 'fill-harvest-500 text-harvest-500' : 'text-ink/20'}`} />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ contractId, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { review } = await reviewApi.submit({ contractId, rating, comment: comment.trim() || undefined });
      toast.success('Review submitted');
      onSubmitted(review);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not submit your review'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <StarRatingInput value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        className="input-field resize-none"
        placeholder="How was your experience with this contract? (optional)"
      />
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  );
}

function ReviewSummary({ review }) {
  return (
    <div className="p-3 rounded-stub border border-ink/10">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={`w-3.5 h-3.5 ${n <= review.rating ? 'fill-harvest-500 text-harvest-500' : 'text-ink/20'}`} />
        ))}
      </div>
      {review.comment && <p className="text-sm text-ink-soft mt-2">{review.comment}</p>}
      <p className="text-xs text-ink-faint mt-1">{review.reviewerName} · {formatRelative(review.createdAt)}</p>
    </div>
  );
}

export default function ContractDetail() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [bids, setBids] = useState([]);
  const [payments, setPayments] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const [contractData, bidData, paymentData, reviewData] = await Promise.all([
        contractApi.getById(id),
        contractApi.listBids(id).catch(() => ({ bids: [] })),
        contractApi.listPayments(id).catch(() => ({ payments: [] })),
        reviewApi.forContract(id).catch(() => ({ reviews: [] })),
      ]);
      setContract(contractData.contract);
      setTimeline(contractData.timeline ?? []);
      setBids(bidData.bids ?? []);
      setPayments(paymentData.payments ?? []);
      setReviews(reviewData.reviews ?? []);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not load this contract'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (fn, successMsg) => {
    setActionLoading(true);
    try {
      await fn();
      toast.success(successMsg);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Action failed'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Loader full label="Loading contract" />;
  if (!contract) return <p className="text-sm text-ink-faint">Contract not found.</p>;

  const isBuyer = role === 'buyer';
  const counterpartyName = isBuyer ? contract.farmerName : contract.buyerName;
  const counterpartyId = isBuyer ? contract.farmerId : contract.buyerId;
  const myReview = reviews.find((r) => r.reviewerId === user?.id);
  const theirReview = reviews.find((r) => r.reviewerId === counterpartyId);
  const mySignature = isBuyer ? contract.signatures.buyer : contract.signatures.farmer;
  const counterpartySignature = isBuyer ? contract.signatures.farmer : contract.signatures.buyer;
  const bothSigned = Boolean(contract.signatures.farmer && contract.signatures.buyer);

  const heldPayment = payments.find((p) => p.status === 'held');
  const pendingPayment = payments.find((p) => p.status === 'pending');
  const releasedPayment = payments.find((p) => p.status === 'released');
  const refundedPayment = payments.find((p) => p.status === 'refunded');
  const escrowStatus = heldPayment
    ? 'funded'
    : pendingPayment
      ? 'awaiting confirmation'
      : refundedPayment
        ? 'refunded'
        : releasedPayment
          ? 'released'
          : 'not funded';

  const handleDownloadPdf = async () => {
    try {
      // Lazy-loaded: @react-pdf/renderer is heavy and only needed on demand.
      const { downloadContractPdf } = await import('../pdf/ContractPdfDocument.jsx');
      await downloadContractPdf(contract);
    } catch (error) {
      toast.error('Could not generate the PDF');
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    toast.success('Payment held in escrow');
    load();
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="stub-card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-mono text-ink-faint uppercase tracking-widest">
                Contract #{contract.id?.slice(-6)}
              </p>
              <h1 className="font-display text-2xl font-semibold mt-1">
                {contract.cropType} — {contract.quantity} {contract.unit}
              </h1>
              <p className="text-sm text-ink-faint mt-1">
                With <Link to={`/users/${counterpartyId}`} className="text-canopy-700 hover:underline">{counterpartyName}</Link>
              </p>
            </div>
            <StatusStamp status={contract.status} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-ink/10">
            <div>
              <p className="text-xs text-ink-faint">Price per unit</p>
              <p className="text-sm font-semibold mt-0.5">{formatCurrency(contract.pricePerUnit)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-faint">Total value</p>
              <p className="text-sm font-semibold mt-0.5">{formatCurrency(contract.totalValue)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-faint">Delivery date</p>
              <p className="text-sm font-semibold mt-0.5">{formatDate(contract.deliveryDate)}</p>
            </div>
          </div>

          {contract.terms && (
            <div className="mt-5 pt-5 border-t border-ink/10">
              <p className="text-xs text-ink-faint uppercase tracking-wide mb-1.5">Terms</p>
              <p className="text-sm text-ink-soft leading-relaxed">{contract.terms}</p>
            </div>
          )}

          <div className="mt-5 pt-5 border-t border-ink/10 flex flex-wrap gap-2">
            <button onClick={handleDownloadPdf} className="btn-ghost text-xs px-3 py-1.5">
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
          </div>

          {contract.status === 'pending' && (
            <div className="mt-6 pt-6 border-t border-ink/10 space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className={`flex items-center gap-1.5 ${mySignature ? 'text-canopy-700' : 'text-ink-faint'}`}>
                  <PenLine className="w-4 h-4" /> You: {mySignature ? `Signed ${formatRelative(mySignature.signedAt)}` : 'Not signed'}
                </span>
                <span className={`flex items-center gap-1.5 ${counterpartySignature ? 'text-canopy-700' : 'text-ink-faint'}`}>
                  <PenLine className="w-4 h-4" /> {counterpartyName}: {counterpartySignature ? `Signed ${formatRelative(counterpartySignature.signedAt)}` : 'Not signed'}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                {!mySignature && (
                  <button
                    disabled={actionLoading}
                    onClick={() => runAction(() => contractApi.sign(id, user?.name), 'You signed the contract')}
                    className="btn-secondary"
                  >
                    <PenLine className="w-4 h-4" /> Sign contract
                  </button>
                )}
                <button
                  disabled={actionLoading || !bothSigned}
                  title={!bothSigned ? 'Both parties must sign before accepting' : undefined}
                  onClick={() => runAction(() => contractApi.accept(id), 'Contract accepted')}
                  className="btn-primary"
                >
                  <CheckCircle2 className="w-4 h-4" /> Accept terms
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => runAction(() => contractApi.reject(id), 'Contract rejected')}
                  className="btn-danger"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
              {!bothSigned && (
                <p className="text-xs text-ink-faint">Both parties need to sign before this contract can be accepted.</p>
              )}
            </div>
          )}
        </div>

        {/* Custom clauses */}
        <div className="stub-card p-6">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <FileText className="w-4.5 h-4.5 text-canopy-600" /> Custom clauses
          </h2>
          {contract.customClauses.length === 0 ? (
            <p className="text-sm text-ink-faint mt-3">No custom clauses added.</p>
          ) : (
            <ul className="mt-3 space-y-2 list-disc list-inside text-sm text-ink-soft">
              {contract.customClauses.map((clause, idx) => (
                <li key={idx}>{clause}</li>
              ))}
            </ul>
          )}
          {contract.status === 'pending' && <ClauseForm contractId={id} onAdded={load} />}
        </div>

        {/* Price negotiation */}
        <div className="stub-card p-6">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Gavel className="w-4.5 h-4.5 text-canopy-600" /> Price negotiation
          </h2>
          {bids.length === 0 ? (
            <p className="text-sm text-ink-faint mt-3">No counter-offers yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {bids.map((bid) => (
                <div key={bid.id} className="flex items-center justify-between p-3 rounded-stub border border-ink/10">
                  <div>
                    <p className="text-sm font-medium">{formatCurrency(bid.pricePerUnit)} / {contract.unit} · {bid.quantity} {contract.unit}</p>
                    <p className="text-xs text-ink-faint mt-0.5">
                      {bid.proposedByName} · {formatRelative(bid.createdAt)}
                      {bid.message ? ` — "${bid.message}"` : ''}
                      {bid.status !== 'pending' ? ` · ${bid.status}` : ''}
                    </p>
                  </div>
                  {contract.status === 'pending' && bid.status === 'pending' && bid.proposedBy !== user?.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => runAction(() => contractApi.acceptBid(id, bid.id), 'Offer accepted')}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => runAction(() => contractApi.rejectBid(id, bid.id), 'Offer rejected')}
                        className="btn-ghost text-xs px-3 py-1.5"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {contract.status === 'pending' && <BidForm contractId={id} onPlaced={load} />}
        </div>

        {/* Milestones */}
        {contract.milestones?.length > 0 && (
          <div className="stub-card p-6">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <ListChecks className="w-4.5 h-4.5 text-canopy-600" /> Milestones
            </h2>
            <div className="mt-4 space-y-2">
              {contract.milestones.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-stub border border-ink/10">
                  <span className="text-sm">{m.label}</span>
                  {m.completed ? (
                    <span className="text-xs font-medium text-canopy-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Done
                    </span>
                  ) : contract.status === 'active' ? (
                    <button
                      onClick={() => runAction(() => contractApi.markMilestone(id, m.id), 'Milestone marked complete')}
                      className="text-xs text-canopy-700 font-medium hover:underline"
                    >
                      Mark complete
                    </button>
                  ) : (
                    <span className="text-xs text-ink-faint">Pending</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {contract.status === 'fulfilled' && (
          <div className="stub-card p-6">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Star className="w-4.5 h-4.5 text-harvest-500" /> Reviews
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-ink-faint uppercase tracking-wide mb-2">Your review</p>
                {myReview ? <ReviewSummary review={myReview} /> : <ReviewForm contractId={id} onSubmitted={() => load()} />}
              </div>
              <div>
                <p className="text-xs text-ink-faint uppercase tracking-wide mb-2">From {counterpartyName}</p>
                {theirReview ? (
                  <ReviewSummary review={theirReview} />
                ) : (
                  <p className="text-sm text-ink-faint">No review yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="stub-card p-6">
          <h2 className="font-display text-lg font-semibold">Activity timeline</h2>
          <div className="mt-4 space-y-4 border-l-2 border-dashed border-ink/15 pl-4">
            {timeline.length === 0 && <p className="text-sm text-ink-faint">No activity recorded yet.</p>}
            {timeline.map((event) => (
              <div key={event.id}>
                <p className="text-sm text-ink">{event.description}</p>
                <p className="text-xs text-ink-faint mt-0.5">{event.actorName ? `${event.actorName} · ` : ''}{formatRelative(event.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Escrow / payments */}
        <div className="stub-card p-6">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Wallet className="w-4.5 h-4.5 text-irrigation-600" /> Escrow & payments
          </h2>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-ink-faint">Escrow status</span>
            <span className="font-semibold capitalize">{escrowStatus}</span>
          </div>
          <div className="mt-4 space-y-2">
            {isBuyer && contract.status === 'active' && escrowStatus === 'not funded' && (
              <button
                disabled={actionLoading}
                onClick={() => setShowPaymentModal(true)}
                className="btn-primary w-full"
              >
                Fund escrow — {formatCurrency(contract.totalValue)}
              </button>
            )}
            {isBuyer && pendingPayment && (
              <div className="space-y-2">
                <p className="text-xs text-harvest-700 leading-relaxed">
                  Payment is pending. You can resume it from where you left off.
                </p>
                <button onClick={() => setShowPaymentModal(true)} className="btn-secondary w-full text-xs">
                  Resume payment
                </button>
              </div>
            )}
            {isBuyer && heldPayment && (
              <ReleaseEscrowForm
                heldPayment={heldPayment}
                onRelease={(amount) =>
                  runAction(() => contractApi.releaseEscrow(id, heldPayment._id, amount), 'Payment released to farmer')
                }
                disabled={actionLoading}
              />
            )}
            {!isBuyer && (
              <p className="text-xs text-ink-faint leading-relaxed">
                Payment is held securely until you and the buyer confirm delivery milestones.
              </p>
            )}
          </div>
        </div>

        <div className="stub-card p-6 space-y-2.5">
          <button
            onClick={() =>
              navigate('/messages', {
                state: { contractId: id, recipientId: isBuyer ? contract.farmerId : contract.buyerId },
              })
            }
            className="btn-secondary w-full"
          >
            <MessageSquare className="w-4 h-4" /> Message {counterpartyName}
          </button>
          {contract.status === 'active' && (
            <button
              disabled={actionLoading}
              onClick={() => runAction(() => contractApi.complete(id), 'Contract marked as fulfilled')}
              className="btn-secondary w-full"
            >
              <PackageCheck className="w-4 h-4" /> Mark as fulfilled
            </button>
          )}
          {contract.status === 'active' && (
            <Link to={`/disputes?contractId=${id}`} className="btn-ghost w-full text-clay-600">
              <ShieldAlert className="w-4 h-4" /> Report a problem
            </Link>
          )}
          {['pending', 'active'].includes(contract.status) && (
            <button
              disabled={actionLoading}
              onClick={() => runAction(() => contractApi.cancel(id, 'Cancelled by user'), 'Contract cancelled')}
              className="btn-ghost w-full text-clay-600"
            >
              Cancel contract
            </button>
          )}
        </div>
      </div>

      {showPaymentModal && (
        <DemoPaymentModal
          contract={contract}
          existingPayment={pendingPayment}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

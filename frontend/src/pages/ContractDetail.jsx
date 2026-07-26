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
} from 'lucide-react';
import { contractApi } from '../api/contractApi';
import { useAuth } from '../context/AuthContext.jsx';
import StatusStamp from '../components/StatusStamp.jsx';
import Loader from '../components/Loader.jsx';
import { formatCurrency, formatDate, formatRelative } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

function BidForm({ contractId, onPlaced }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!amount) return;
    setSubmitting(true);
    try {
      await contractApi.placeBid(contractId, { pricePerUnit: Number(amount), note });
      toast.success('Counter-offer sent');
      setAmount('');
      setNote('');
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
        placeholder="Your price per unit (₹)"
        className="input-field sm:max-w-[200px]"
        required
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note"
        className="input-field"
      />
      <button type="submit" disabled={submitting} className="btn-accent whitespace-nowrap">
        {submitting ? 'Sending…' : 'Send offer'}
      </button>
    </form>
  );
}

export default function ContractDetail() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [bids, setBids] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [contractData, bidData, timelineData] = await Promise.all([
        contractApi.getById(id),
        contractApi.listBids(id).catch(() => []),
        contractApi.timeline(id).catch(() => []),
      ]);
      setContract(contractData);
      setBids(bidData.items ?? bidData);
      setTimeline(timelineData.items ?? timelineData);
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

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="stub-card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-mono text-ink-faint uppercase tracking-widest">
                Contract #{contract._id?.slice(-6)}
              </p>
              <h1 className="font-display text-2xl font-semibold mt-1">
                {contract.cropType} — {contract.quantity} {contract.unit}
              </h1>
              <p className="text-sm text-ink-faint mt-1">With {counterpartyName}</p>
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

          {contract.status === 'pending' && (
            <div className="mt-6 pt-6 border-t border-ink/10 flex flex-wrap gap-3">
              <button
                disabled={actionLoading}
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
          )}
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
                <div key={bid._id} className="flex items-center justify-between p-3 rounded-stub border border-ink/10">
                  <div>
                    <p className="text-sm font-medium">{formatCurrency(bid.pricePerUnit)} / {contract.unit}</p>
                    <p className="text-xs text-ink-faint mt-0.5">
                      {bid.proposedByName} · {formatRelative(bid.createdAt)}
                      {bid.note ? ` — "${bid.note}"` : ''}
                    </p>
                  </div>
                  {contract.status === 'pending' && bid.proposedBy !== user?._id && (
                    <button
                      onClick={() => runAction(() => contractApi.acceptBid(id, bid._id), 'Offer accepted')}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      Accept
                    </button>
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
                <div key={m._id} className="flex items-center justify-between p-3 rounded-stub border border-ink/10">
                  <span className="text-sm">{m.label}</span>
                  {m.completed ? (
                    <span className="text-xs font-medium text-canopy-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Done
                    </span>
                  ) : contract.status === 'active' ? (
                    <button
                      onClick={() => runAction(() => contractApi.markMilestone(id, m._id), 'Milestone marked complete')}
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

        {/* Timeline */}
        <div className="stub-card p-6">
          <h2 className="font-display text-lg font-semibold">Activity timeline</h2>
          <div className="mt-4 space-y-4 border-l-2 border-dashed border-ink/15 pl-4">
            {timeline.length === 0 && <p className="text-sm text-ink-faint">No activity recorded yet.</p>}
            {timeline.map((event) => (
              <div key={event._id}>
                <p className="text-sm text-ink">{event.description}</p>
                <p className="text-xs text-ink-faint mt-0.5">{formatRelative(event.createdAt)}</p>
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
            <span className="font-semibold capitalize">{contract.escrowStatus ?? 'not funded'}</span>
          </div>
          <div className="mt-4 space-y-2">
            {isBuyer && contract.status === 'active' && contract.escrowStatus !== 'funded' && (
              <button
                disabled={actionLoading}
                onClick={() => runAction(() => contractApi.initiatePayment(id, { amount: contract.totalValue }), 'Payment initiated to escrow')}
                className="btn-primary w-full"
              >
                Fund escrow — {formatCurrency(contract.totalValue)}
              </button>
            )}
            {isBuyer && contract.escrowStatus === 'funded' && contract.status === 'active' && (
              <button
                disabled={actionLoading}
                onClick={() => runAction(() => contractApi.releaseEscrow(id), 'Payment released to farmer')}
                className="btn-accent w-full"
              >
                Release payment to farmer
              </button>
            )}
            {!isBuyer && (
              <p className="text-xs text-ink-faint leading-relaxed">
                Payment is held securely until you and the buyer confirm delivery milestones.
              </p>
            )}
          </div>
        </div>

        <div className="stub-card p-6 space-y-2.5">
          <button onClick={() => navigate('/messages', { state: { contractId: id } })} className="btn-secondary w-full">
            <MessageSquare className="w-4 h-4" /> Message {counterpartyName}
          </button>
          {['active', 'disputed'].includes(contract.status) && (
            <Link to={`/disputes/new?contractId=${id}`} className="btn-ghost w-full text-clay-600">
              <ShieldAlert className="w-4 h-4" /> Report a problem
            </Link>
          )}
          {contract.status === 'active' && (
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
    </div>
  );
}

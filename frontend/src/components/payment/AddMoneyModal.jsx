import React, { useState } from 'react';
import {
  X,
  Smartphone,
  CreditCard,
  Landmark,
  Wallet as WalletIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Sprout,
} from 'lucide-react';
import { walletApi } from '../../api/walletApi';
import { formatCurrency } from '../../utils/format';
import { getErrorMessage } from '../../utils/errorMessage';

const METHODS = [
  { value: 'upi', label: 'UPI', icon: Smartphone },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'netbanking', label: 'Net Banking', icon: Landmark },
  { value: 'wallet', label: 'Wallet', icon: WalletIcon },
];

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

/**
 * "Wallet -> Add Money" - a standalone top-up flow, independent of any
 * contract/proposal. Deliberately a separate component from
 * DemoPaymentModal (contract-scoped escrow funding) rather than a shared
 * one: the two have different data shapes (no contract/farmer/buyer here)
 * and reusing/forking that component risked regressing the existing,
 * working proposal-payment flow.
 */
export default function AddMoneyModal({ onClose, onSuccess }) {
  const [stage, setStage] = useState('amount'); // amount | details | processing | success | failed
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [transaction, setTransaction] = useState(null);
  const [method, setMethod] = useState('upi');
  const [devOutcome, setDevOutcome] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validateAmount = () => {
    const value = Number(amount);
    if (!amount || Number.isNaN(value)) return 'Enter a valid amount';
    if (value < 10) return 'Minimum top-up is ₹10';
    if (value > 100000) return 'Maximum top-up is ₹1,00,000';
    return '';
  };

  const handleContinue = async () => {
    const err = validateAmount();
    if (err) {
      setAmountError(err);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const data = await walletApi.initiateTopup(Number(amount));
      setTransaction({ id: data.transactionId, amount: Number(amount) });
      setStage('details');
    } catch (e) {
      setError(getErrorMessage(e, 'Could not start the payment'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async () => {
    setStage('processing');
    const delay = 1500 + Math.random() * 700;
    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      const { transaction: result, wallet } = await walletApi.completeTopupDemo(transaction.id, {
        outcome: devOutcome || undefined,
        method,
      });
      setTransaction((prev) => ({ ...prev, ...result }));
      if (result.status === 'success') {
        setStage('success');
        onSuccess?.(wallet);
      } else {
        setStage('failed');
      }
    } catch (e) {
      setError(getErrorMessage(e, 'Payment could not be completed'));
      setStage('failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={stage === 'processing' ? undefined : onClose} />

      <div className="relative w-full max-w-md stub-card p-0 overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="bg-canopy-600 text-paper px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-paper/15 flex items-center justify-center">
              <Sprout className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Add Money</p>
              <p className="text-[10px] text-canopy-100 leading-tight">KrishiBond Wallet</p>
            </div>
          </div>
          {stage !== 'processing' && (
            <button onClick={onClose} aria-label="Close" className="p-1 rounded-full hover:bg-paper/10">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-5">
          {stage === 'amount' && (
            <div className="space-y-5">
              <div>
                <label className="label" htmlFor="topupAmount">Amount to add</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm">₹</span>
                  <input
                    id="topupAmount"
                    type="number"
                    inputMode="decimal"
                    className="input-field pl-7"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setAmountError(''); }}
                    autoFocus
                  />
                </div>
                {amountError && <p className="text-xs text-clay-500 mt-1">{amountError}</p>}
                <p className="text-[11px] text-ink-faint mt-1">Minimum ₹10 · Maximum ₹1,00,000</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => { setAmount(String(a)); setAmountError(''); }}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    {formatCurrency(a)}
                  </button>
                ))}
              </div>

              {error && <p className="text-xs text-clay-500">{error}</p>}

              <button onClick={handleContinue} disabled={submitting} className="btn-primary w-full text-base py-3">
                {submitting ? 'Please wait…' : 'Continue'}
              </button>
            </div>
          )}

          {stage === 'details' && (
            <div className="space-y-5">
              <div className="rounded-stub border border-ink/10 p-4 text-center">
                <p className="text-xs text-ink-faint">You're adding</p>
                <p className="font-display text-2xl font-semibold text-canopy-700 mt-1">{formatCurrency(transaction.amount)}</p>
              </div>

              <div>
                <p className="label mb-2">Payment method</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {METHODS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMethod(value)}
                      className={`flex flex-col items-center gap-1 rounded-stub border-2 py-2.5 text-[10px] font-medium transition-colors ${
                        method === value ? 'border-canopy-600 bg-canopy-50 text-canopy-700' : 'border-ink/10 text-ink-faint hover:border-ink/20'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <details className="text-xs">
                <summary className="cursor-pointer text-ink-faint select-none">Developer: force a result (demo only)</summary>
                <select className="input-field mt-2 text-xs" value={devOutcome} onChange={(e) => setDevOutcome(e.target.value)}>
                  <option value="">Random (90% success)</option>
                  <option value="success">Force success</option>
                  <option value="failed">Force failure</option>
                </select>
              </details>

              {error && <p className="text-xs text-clay-500">{error}</p>}

              <button onClick={handlePay} className="btn-primary w-full text-base py-3">
                Pay {formatCurrency(transaction.amount)}
              </button>
              <p className="text-[10px] text-ink-faint text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Simulated payment - verified by KrishiBond before your balance updates
              </p>
            </div>
          )}

          {stage === 'processing' && (
            <div className="py-14 flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-canopy-600 animate-spin" />
              <p className="text-sm font-semibold">Processing payment…</p>
            </div>
          )}

          {stage === 'success' && (
            <div className="py-6 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-canopy-50 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-canopy-600" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold">Money added</p>
                <p className="text-sm text-ink-faint mt-1">{formatCurrency(transaction.amount)} is now in your wallet</p>
              </div>
              <button onClick={onClose} className="btn-primary w-full">Done</button>
            </div>
          )}

          {stage === 'failed' && (
            <div className="py-6 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-clay-50 flex items-center justify-center">
                <XCircle className="w-9 h-9 text-clay-500" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold">Payment failed</p>
                <p className="text-sm text-ink-faint mt-1">{error || 'Your wallet was not charged.'}</p>
              </div>
              <div className="flex gap-2 w-full">
                <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
                <button onClick={() => setStage('details')} className="btn-primary flex-1">Retry</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

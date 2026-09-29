import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  X,
  Landmark,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { walletApi } from '../../api/walletApi';
import { kycApi } from '../../api/kycApi';
import { formatCurrency } from '../../utils/format';
import { getErrorMessage } from '../../utils/errorMessage';

const IFSC_PATTERN = /^[A-Za-z]{4}0[A-Z0-9]{6}$/;

/**
 * "Wallet -> Withdraw to Bank". Reuses the existing KYC bank-details record
 * (Kyc.bankDetails, already admin-reviewed via the KYC queue) as the user's
 * one bank account, rather than a separate bank-account model/UI - a
 * withdrawal is only ever allowed once that record exists and has been
 * approved by an admin, exactly like every other KYC-gated capability in
 * this app.
 */
export default function WithdrawModal({ wallet, bankAccount, onClose, onSuccess }) {
  const availableBalance = wallet?.balance ?? 0;
  const [stage, setStage] = useState(bankAccount ? (bankAccount.isVerified ? 'amount' : 'pending') : 'add-bank');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [transaction, setTransaction] = useState(null);
  const [devOutcome, setDevOutcome] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register: registerBank,
    handleSubmit: handleBankSubmit,
    formState: { errors: bankErrors, isSubmitting: submittingBank },
  } = useForm();

  const validateAmount = () => {
    const value = Number(amount);
    if (!amount || Number.isNaN(value)) return 'Enter a valid amount';
    if (value <= 0) return 'Amount must be greater than 0';
    if (value > availableBalance) return 'Amount cannot exceed your available balance';
    return '';
  };

  const onSubmitBank = async (values) => {
    setError('');
    try {
      await kycApi.submit({
        bankDetails: {
          accountHolderName: values.accountHolderName,
          accountNumber: values.accountNumber,
          ifsc: values.ifsc.toUpperCase(),
        },
      });
      setStage('pending');
    } catch (e) {
      setError(getErrorMessage(e, 'Could not save your bank details'));
    }
  };

  const handleContinue = () => {
    const err = validateAmount();
    if (err) {
      setAmountError(err);
      return;
    }
    setStage('confirm');
  };

  const handleWithdraw = async () => {
    setStage('processing');
    setSubmitting(true);
    try {
      const initData = await walletApi.initiateWithdrawal(Number(amount));
      // Simulated payout resolution - mirrors the same two-phase pattern as
      // AddMoneyModal/the demo payment gateway. See walletController on the
      // backend for why: no real payout provider is integrated yet.
      const delay = 1200 + Math.random() * 600;
      await new Promise((resolve) => setTimeout(resolve, delay));
      const { transaction: result, wallet: updatedWallet } = await walletApi.completeWithdrawalDemo(
        initData.transactionId,
        { outcome: devOutcome || undefined }
      );
      setTransaction(result);
      if (result.status === 'success') {
        setStage('success');
        onSuccess?.(updatedWallet);
      } else {
        setError(result.meta?.failureReason || 'The withdrawal could not be processed. Your wallet balance has not been lost.');
        setStage('failed');
      }
    } catch (e) {
      setError(getErrorMessage(e, 'The withdrawal could not be processed. Your wallet balance has not been lost.'));
      setStage('failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={stage === 'processing' ? undefined : onClose} />

      <div className="relative w-full max-w-md stub-card p-0 overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="bg-canopy-600 text-paper px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-paper/15 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Withdraw to Bank</p>
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
          {stage === 'add-bank' && (
            <form onSubmit={handleBankSubmit(onSubmitBank)} className="space-y-4">
              <p className="text-sm text-ink-soft">
                Add your bank account to withdraw funds. An admin will verify it before your first withdrawal.
              </p>
              <div>
                <label className="label" htmlFor="accountHolderName">Account holder name</label>
                <input
                  id="accountHolderName"
                  className="input-field"
                  {...registerBank('accountHolderName', { required: 'Required', minLength: { value: 2, message: 'Too short' } })}
                />
                {bankErrors.accountHolderName && <p className="text-xs text-clay-500 mt-1">{bankErrors.accountHolderName.message}</p>}
              </div>
              <div>
                <label className="label" htmlFor="accountNumber">Account number</label>
                <input
                  id="accountNumber"
                  className="input-field"
                  {...registerBank('accountNumber', { required: 'Required', minLength: { value: 4, message: 'Too short' } })}
                />
                {bankErrors.accountNumber && <p className="text-xs text-clay-500 mt-1">{bankErrors.accountNumber.message}</p>}
              </div>
              <div>
                <label className="label" htmlFor="ifsc">IFSC code</label>
                <input
                  id="ifsc"
                  className="input-field uppercase"
                  placeholder="SBIN0001234"
                  {...registerBank('ifsc', { required: 'Required', pattern: { value: IFSC_PATTERN, message: 'Enter a valid IFSC code' } })}
                />
                {bankErrors.ifsc && <p className="text-xs text-clay-500 mt-1">{bankErrors.ifsc.message}</p>}
              </div>
              {error && <p className="text-xs text-clay-500">{error}</p>}
              <button type="submit" disabled={submittingBank} className="btn-primary w-full">
                {submittingBank ? 'Saving…' : 'Save bank account'}
              </button>
            </form>
          )}

          {stage === 'pending' && (
            <div className="py-6 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-harvest-50 flex items-center justify-center">
                <Clock className="w-9 h-9 text-harvest-600" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold">Bank account pending verification</p>
                <p className="text-sm text-ink-faint mt-1">
                  We're reviewing your bank details. You'll be able to withdraw once it's verified.
                </p>
              </div>
              <button onClick={onClose} className="btn-primary w-full">Done</button>
            </div>
          )}

          {stage === 'amount' && (
            <div className="space-y-5">
              <div className="rounded-stub border border-ink/10 p-4">
                <p className="text-xs text-ink-faint uppercase tracking-wide">Available balance</p>
                <p className="font-display text-2xl font-semibold text-canopy-700 mt-1 break-words [overflow-wrap:anywhere]">
                  {formatCurrency(availableBalance)}
                </p>
              </div>

              <div className="rounded-stub border border-ink/10 p-3 flex items-center gap-3">
                <Landmark className="w-4 h-4 text-ink-faint shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{bankAccount.accountHolderName}</p>
                  <p className="text-xs text-ink-faint">{bankAccount.accountNumberMasked} · {bankAccount.ifsc}</p>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="withdrawAmount">Amount to withdraw</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm">₹</span>
                  <input
                    id="withdrawAmount"
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
              </div>

              <button onClick={handleContinue} className="btn-primary w-full text-base py-3">Continue</button>
            </div>
          )}

          {stage === 'confirm' && (
            <div className="space-y-5">
              <div className="rounded-stub border border-ink/10 p-4 text-center">
                <p className="text-xs text-ink-faint">You're withdrawing</p>
                <p className="font-display text-2xl font-semibold text-canopy-700 mt-1 break-words [overflow-wrap:anywhere]">
                  {formatCurrency(Number(amount))}
                </p>
                <p className="text-xs text-ink-faint mt-2">to {bankAccount.accountNumberMasked}</p>
              </div>

              <details className="text-xs">
                <summary className="cursor-pointer text-ink-faint select-none">Developer: force a result (demo only)</summary>
                <select className="input-field mt-2 text-xs" value={devOutcome} onChange={(e) => setDevOutcome(e.target.value)}>
                  <option value="">Random (90% success)</option>
                  <option value="success">Force success</option>
                  <option value="failed">Force failure</option>
                </select>
              </details>

              <div className="flex gap-2">
                <button onClick={() => setStage('amount')} className="btn-ghost flex-1">Back</button>
                <button onClick={handleWithdraw} disabled={submitting} className="btn-primary flex-1">Withdraw</button>
              </div>
              <p className="text-[10px] text-ink-faint text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Funds are reserved immediately and only leave your wallet once the transfer is confirmed
              </p>
            </div>
          )}

          {stage === 'processing' && (
            <div className="py-14 flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-canopy-600 animate-spin" />
              <p className="text-sm font-semibold">Processing withdrawal…</p>
            </div>
          )}

          {stage === 'success' && (
            <div className="py-6 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-canopy-50 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-canopy-600" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold">Withdrawal completed</p>
                <p className="text-sm text-ink-faint mt-1">{formatCurrency(Number(amount))} was sent to {bankAccount.accountNumberMasked}</p>
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
                <p className="font-display text-lg font-semibold">Withdrawal failed</p>
                <p className="text-sm text-ink-faint mt-1">{error}</p>
              </div>
              <div className="flex gap-2 w-full">
                <button onClick={onClose} className="btn-ghost flex-1">Close</button>
                <button onClick={() => setStage('amount')} className="btn-primary flex-1">Try again</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

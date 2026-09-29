import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  X,
  Landmark,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Pencil,
} from 'lucide-react';
import { walletApi } from '../../api/walletApi';
import { formatCurrency } from '../../utils/format';
import { getErrorMessage } from '../../utils/errorMessage';

const IFSC_PATTERN = /^[A-Za-z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUMBER_PATTERN = /^\d{9,18}$/;

/**
 * "Wallet -> Withdraw to Bank". Bank details are entered directly with the
 * withdrawal - there is no separate "add your bank account and wait for
 * admin verification" step blocking this. If the user previously saved an
 * account (see the "save these details" checkbox below), they can reuse it
 * with one click instead of retyping; either way, ownership and every
 * numeric/format check happen authoritatively on the backend regardless of
 * what the frontend shows.
 */
export default function WithdrawModal({ wallet, bankAccount, onClose, onSuccess }) {
  const availableBalance = wallet?.balance ?? 0;
  const [useSaved, setUseSaved] = useState(Boolean(bankAccount));
  const [stage, setStage] = useState('form'); // form | confirm | processing | success | failed
  const [formValues, setFormValues] = useState(null);
  const [devOutcome, setDevOutcome] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { amount: '' } });

  const accountNumber = watch('accountNumber');

  const onSubmitForm = (values) => {
    setError('');
    setFormValues(values);
    setStage('confirm');
  };

  const handleWithdraw = async () => {
    setStage('processing');
    setSubmitting(true);
    try {
      const payload = useSaved
        ? { useSavedAccount: true, amount: Number(formValues.amount) }
        : {
            accountHolderName: formValues.accountHolderName,
            accountNumber: formValues.accountNumber,
            confirmAccountNumber: formValues.confirmAccountNumber,
            ifscCode: formValues.ifscCode.toUpperCase(),
            amount: Number(formValues.amount),
            saveAccount: Boolean(formValues.saveAccount),
          };

      const initData = await walletApi.initiateWithdrawal(payload);
      // Simulated payout resolution - mirrors the same two-phase pattern as
      // AddMoneyModal/the demo payment gateway. See walletController on the
      // backend for why: no real payout provider is integrated yet.
      const delay = 1200 + Math.random() * 600;
      await new Promise((resolve) => setTimeout(resolve, delay));
      const { transaction: result, wallet: updatedWallet } = await walletApi.completeWithdrawalDemo(
        initData.transactionId,
        { outcome: devOutcome || undefined }
      );
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

  const destinationLabel = useSaved
    ? bankAccount?.accountNumberMasked
    : accountNumber
      ? `${'*'.repeat(Math.max(0, accountNumber.length - 4))}${accountNumber.slice(-4)}`
      : '';

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
              <p className="text-sm font-semibold leading-tight">Withdraw Money</p>
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
          {stage === 'form' && (
            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
              <div className="rounded-stub border border-ink/10 p-4">
                <p className="text-xs text-ink-faint uppercase tracking-wide">Available balance</p>
                <p className="font-display text-2xl font-semibold text-canopy-700 mt-1 break-words [overflow-wrap:anywhere]">
                  {formatCurrency(availableBalance)}
                </p>
              </div>

              {bankAccount && useSaved ? (
                <div className="rounded-stub border border-ink/10 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Landmark className="w-4 h-4 text-ink-faint shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{bankAccount.accountHolderName}</p>
                      <p className="text-xs text-ink-faint">{bankAccount.accountNumberMasked} · {bankAccount.ifsc}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseSaved(false)}
                    className="text-xs text-canopy-700 font-medium hover:underline flex items-center gap-1 shrink-0"
                  >
                    <Pencil className="w-3 h-3" /> Use different account
                  </button>
                </div>
              ) : (
                <>
                  {bankAccount && (
                    <button
                      type="button"
                      onClick={() => setUseSaved(true)}
                      className="text-xs text-canopy-700 font-medium hover:underline"
                    >
                      Use saved account ({bankAccount.accountNumberMasked}) instead
                    </button>
                  )}
                  <div>
                    <label className="label" htmlFor="accountHolderName">Account Holder Name</label>
                    <input
                      id="accountHolderName"
                      className="input-field"
                      {...register('accountHolderName', {
                        required: 'Enter the account holder name',
                        minLength: { value: 2, message: 'Name is too short' },
                      })}
                    />
                    {errors.accountHolderName && <p className="text-xs text-clay-500 mt-1">{errors.accountHolderName.message}</p>}
                  </div>
                  <div>
                    <label className="label" htmlFor="accountNumber">Bank Account Number</label>
                    <input
                      id="accountNumber"
                      inputMode="numeric"
                      className="input-field"
                      {...register('accountNumber', {
                        required: 'Enter your bank account number',
                        pattern: { value: ACCOUNT_NUMBER_PATTERN, message: 'Please enter a valid bank account number' },
                      })}
                    />
                    {errors.accountNumber && <p className="text-xs text-clay-500 mt-1">{errors.accountNumber.message}</p>}
                  </div>
                  <div>
                    <label className="label" htmlFor="confirmAccountNumber">Confirm Account Number</label>
                    <input
                      id="confirmAccountNumber"
                      inputMode="numeric"
                      className="input-field"
                      {...register('confirmAccountNumber', {
                        required: 'Re-enter your account number',
                        validate: (value) => value === accountNumber || 'Account numbers do not match',
                      })}
                    />
                    {errors.confirmAccountNumber && <p className="text-xs text-clay-500 mt-1">{errors.confirmAccountNumber.message}</p>}
                  </div>
                  <div>
                    <label className="label" htmlFor="ifscCode">IFSC Code</label>
                    <input
                      id="ifscCode"
                      className="input-field uppercase"
                      placeholder="SBIN0001234"
                      {...register('ifscCode', {
                        required: 'Enter the IFSC code',
                        pattern: { value: IFSC_PATTERN, message: 'Enter a valid IFSC code' },
                      })}
                    />
                    {errors.ifscCode && <p className="text-xs text-clay-500 mt-1">{errors.ifscCode.message}</p>}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-ink-soft">
                    <input type="checkbox" className="rounded border-ink/20" {...register('saveAccount')} />
                    Save these details for future withdrawals
                  </label>
                </>
              )}

              <div>
                <label className="label" htmlFor="withdrawAmount">Withdrawal Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm">₹</span>
                  <input
                    id="withdrawAmount"
                    type="number"
                    inputMode="decimal"
                    className="input-field pl-7"
                    placeholder="0"
                    {...register('amount', {
                      required: 'Enter an amount',
                      validate: (value) => {
                        const num = Number(value);
                        if (Number.isNaN(num)) return 'Enter a valid amount';
                        if (num <= 0) return 'Amount must be greater than 0';
                        if (num > availableBalance) return 'Amount cannot exceed your available balance';
                        return true;
                      },
                    })}
                  />
                </div>
                {errors.amount && <p className="text-xs text-clay-500 mt-1">{errors.amount.message}</p>}
              </div>

              {error && <p className="text-xs text-clay-500">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Withdraw Money</button>
              </div>
            </form>
          )}

          {stage === 'confirm' && (
            <div className="space-y-5">
              <div className="rounded-stub border border-ink/10 p-4 text-center">
                <p className="text-xs text-ink-faint">You're withdrawing</p>
                <p className="font-display text-2xl font-semibold text-canopy-700 mt-1 break-words [overflow-wrap:anywhere]">
                  {formatCurrency(Number(formValues.amount))}
                </p>
                <p className="text-xs text-ink-faint mt-2">to {destinationLabel}</p>
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
                <button onClick={() => setStage('form')} className="btn-ghost flex-1">Back</button>
                <button onClick={handleWithdraw} disabled={submitting} className="btn-primary flex-1">Confirm</button>
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
                <p className="text-sm text-ink-faint mt-1">{formatCurrency(Number(formValues.amount))} was sent to {destinationLabel}</p>
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
                <button onClick={() => setStage('form')} className="btn-primary flex-1">Try again</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

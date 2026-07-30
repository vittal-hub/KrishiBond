import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  X,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Landmark,
  Wallet as WalletIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Sprout,
} from 'lucide-react';
import { contractApi } from '../../api/contractApi';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatCurrency, formatDate } from '../../utils/format';
import { getErrorMessage } from '../../utils/errorMessage';

const METHODS = [
  { value: 'upi', label: 'UPI', icon: Smartphone },
  { value: 'card', label: 'Credit Card', icon: CreditCard },
  { value: 'debit_card', label: 'Debit Card', icon: CreditCard },
  { value: 'netbanking', label: 'Net Banking', icon: Landmark },
  { value: 'wallet', label: 'Wallet', icon: WalletIcon },
];

const FAILURE_LABELS = {
  'Network error, please try again': 'Network Error',
};

function MethodFields({ method, fields, setFields }) {
  if (method === 'upi') {
    return (
      <div>
        <label className="label" htmlFor="upiId">UPI ID</label>
        <input
          id="upiId"
          className="input-field font-mono"
          value={fields.upiId}
          onChange={(e) => setFields((f) => ({ ...f, upiId: e.target.value }))}
        />
      </div>
    );
  }

  if (method === 'card' || method === 'debit_card') {
    return (
      <div className="space-y-3">
        <div>
          <label className="label" htmlFor="cardNumber">Card number</label>
          <input
            id="cardNumber"
            className="input-field font-mono"
            value={fields.cardNumber}
            onChange={(e) => setFields((f) => ({ ...f, cardNumber: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="expiry">Expiry</label>
            <input
              id="expiry"
              className="input-field font-mono"
              value={fields.expiry}
              onChange={(e) => setFields((f) => ({ ...f, expiry: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="cvv">CVV</label>
            <input
              id="cvv"
              type="password"
              className="input-field font-mono"
              value={fields.cvv}
              onChange={(e) => setFields((f) => ({ ...f, cvv: e.target.value }))}
            />
          </div>
        </div>
      </div>
    );
  }

  if (method === 'netbanking') {
    return (
      <div>
        <label className="label" htmlFor="bankName">Bank</label>
        <select
          id="bankName"
          className="input-field"
          value={fields.bankName}
          onChange={(e) => setFields((f) => ({ ...f, bankName: e.target.value }))}
        >
          <option>Demo Bank</option>
          <option>Demo National Bank</option>
          <option>Demo Cooperative Bank</option>
        </select>
      </div>
    );
  }

  // wallet
  return (
    <div>
      <label className="label" htmlFor="walletId">Wallet ID / phone number</label>
      <input
        id="walletId"
        className="input-field font-mono"
        value={fields.upiId}
        onChange={(e) => setFields((f) => ({ ...f, upiId: e.target.value }))}
      />
    </div>
  );
}

export default function DemoPaymentModal({ contract, existingPayment, onClose, onSuccess }) {
  const { user } = useAuth();
  const [stage, setStage] = useState('loading'); // loading | details | processing | success | failed | pending
  const [payment, setPayment] = useState(existingPayment ?? null);
  const [merchant, setMerchant] = useState(null);
  const [method, setMethod] = useState('upi');
  const [fields, setFields] = useState({
    cardNumber: '4111 1111 1111 1111',
    expiry: '12/30',
    cvv: '123',
    upiId: 'demo@upi',
    bankName: 'Demo Bank',
  });
  const [devOutcome, setDevOutcome] = useState('');
  const [error, setError] = useState('');

  const initiate = async () => {
    setStage('loading');
    setError('');
    try {
      const { payment: p, merchant: m } = await contractApi.initiateDemoPayment(contract.id, contract.totalValue);
      setPayment(p);
      setMerchant(m);
      setStage('details');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not start the payment simulation'));
      setStage('details');
    }
  };

  useEffect(() => {
    if (existingPayment) {
      setPayment(existingPayment);
      setMerchant({
        name: 'KrishiBond',
        contractId: contract.id,
        farmerName: contract.farmerName,
        buyerName: contract.buyerName,
        cropType: contract.cropType,
        amount: existingPayment.amount,
        convenienceFee: existingPayment.convenienceFee || 0,
        totalAmount: existingPayment.totalAmount || existingPayment.amount,
      });
      setStage('details');
    } else {
      initiate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePay = async () => {
    setStage('processing');
    const delay = 1800 + Math.random() * 800;
    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      const { payment: result } = await contractApi.completeDemoPayment(contract.id, payment.id, {
        outcome: devOutcome || undefined,
        method,
      });
      setPayment(result);
      if (result.status === 'held') setStage('success');
      else if (result.status === 'failed') setStage('failed');
      else setStage('pending');
    } catch (err) {
      setError(getErrorMessage(err, 'Payment simulation failed unexpectedly'));
      setStage('failed');
    }
  };

  const handleRetry = () => {
    setError('');
    initiate();
  };

  const handleDownloadReceipt = async () => {
    try {
      const { downloadReceiptPdf } = await import('../../pdf/ReceiptPdfDocument.jsx');
      await downloadReceiptPdf({ payment, merchant, payerName: user?.name });
    } catch {
      toast.error('Could not generate the receipt');
    }
  };

  const total = merchant ? merchant.totalAmount : contract.totalValue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={stage === 'processing' ? undefined : onClose} />

      <div className="relative w-full max-w-md stub-card p-0 overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-canopy-600 text-paper px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-paper/15 flex items-center justify-center">
              <Sprout className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">KrishiBond</p>
              <p className="text-[10px] text-canopy-100 leading-tight">Demo Payment Gateway</p>
            </div>
          </div>
          {stage !== 'processing' && (
            <button onClick={onClose} aria-label="Close" className="p-1 rounded-full hover:bg-paper/10">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="px-5 py-2 bg-harvest-50 border-b border-harvest-200">
          <p className="text-[11px] text-harvest-700 text-center font-medium">
            This is a simulated payment for demonstration only. No real transaction occurs.
          </p>
        </div>

        <div className="p-5">
          {stage === 'loading' && (
            <div className="py-14 flex flex-col items-center gap-3">
              <Loader2 className="w-7 h-7 text-canopy-600 animate-spin" />
              <p className="text-sm text-ink-faint">Preparing payment…</p>
            </div>
          )}

          {stage === 'details' && merchant && (
            <div className="space-y-5">
              <div className="rounded-stub border border-ink/10 p-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-ink-faint">Contract</span><span className="font-medium">#{merchant.contractId?.slice?.(-6)}</span></div>
                <div className="flex justify-between"><span className="text-ink-faint">Crop</span><span className="font-medium">{merchant.cropType}</span></div>
                <div className="flex justify-between"><span className="text-ink-faint">Farmer</span><span className="font-medium">{merchant.farmerName}</span></div>
                <div className="flex justify-between"><span className="text-ink-faint">Buyer</span><span className="font-medium">{merchant.buyerName}</span></div>
                <div className="flex justify-between pt-1.5 mt-1.5 border-t border-ink/10"><span className="text-ink-faint">Amount</span><span className="font-medium">{formatCurrency(merchant.amount)}</span></div>
                {merchant.convenienceFee > 0 && (
                  <div className="flex justify-between"><span className="text-ink-faint">Convenience fee</span><span className="font-medium">{formatCurrency(merchant.convenienceFee)}</span></div>
                )}
                <div className="flex justify-between text-base pt-1.5 mt-1.5 border-t border-ink/10"><span className="font-semibold">Total</span><span className="font-semibold text-canopy-700">{formatCurrency(total)}</span></div>
              </div>

              <div>
                <p className="label mb-2">Payment method</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {METHODS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMethod(value)}
                      title={label}
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

              <MethodFields method={method} fields={fields} setFields={setFields} />

              <details className="text-xs">
                <summary className="cursor-pointer text-ink-faint select-none">Developer: force a result (demo only)</summary>
                <select
                  className="input-field mt-2 text-xs"
                  value={devOutcome}
                  onChange={(e) => setDevOutcome(e.target.value)}
                >
                  <option value="">Random (90% success)</option>
                  <option value="success">Force success</option>
                  <option value="failed">Force failure</option>
                  <option value="pending">Force pending</option>
                </select>
              </details>

              {error && <p className="text-xs text-clay-500">{error}</p>}

              <button onClick={handlePay} disabled={!payment} className="btn-primary w-full text-base py-3">
                Pay {formatCurrency(total)}
              </button>
              <p className="text-[10px] text-ink-faint text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Simulated escrow — no card data leaves your browser
              </p>
            </div>
          )}

          {stage === 'processing' && (
            <div className="py-14 flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-canopy-600 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold">Processing payment…</p>
                <p className="text-xs text-ink-faint mt-1">Please don't close this window</p>
              </div>
            </div>
          )}

          {stage === 'success' && (
            <div className="py-6 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-canopy-50 flex items-center justify-center animate-fade-in">
                <CheckCircle2 className="w-9 h-9 text-canopy-600" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold">Payment Successful</p>
                <p className="text-sm text-ink-faint mt-1">{formatCurrency(total)} is now held in escrow</p>
              </div>
              <div className="w-full rounded-stub border border-ink/10 p-4 space-y-1.5 text-xs text-left">
                <div className="flex justify-between"><span className="text-ink-faint">Transaction ID</span><span className="font-mono">{payment.transactionId}</span></div>
                <div className="flex justify-between"><span className="text-ink-faint">Receipt number</span><span className="font-mono">{payment.receiptNumber}</span></div>
                <div className="flex justify-between"><span className="text-ink-faint">Timestamp</span><span>{formatDate(payment.paidAt, 'dd MMM yyyy, HH:mm')}</span></div>
              </div>
              <div className="flex gap-2 w-full">
                <button onClick={handleDownloadReceipt} className="btn-secondary flex-1">
                  <Download className="w-4 h-4" /> Receipt
                </button>
                <button onClick={() => onSuccess?.(payment)} className="btn-primary flex-1">
                  Done
                </button>
              </div>
            </div>
          )}

          {stage === 'failed' && (
            <div className="py-6 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-clay-50 flex items-center justify-center">
                <XCircle className="w-9 h-9 text-clay-500" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold">Payment Failed</p>
                <p className="text-sm text-ink-faint mt-1">
                  {FAILURE_LABELS[payment?.failureReason] || payment?.failureReason || error || 'Something went wrong'}
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
                <button onClick={handleRetry} className="btn-primary flex-1">Retry</button>
              </div>
            </div>
          )}

          {stage === 'pending' && (
            <div className="py-6 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-harvest-50 flex items-center justify-center">
                <Clock className="w-9 h-9 text-harvest-600 animate-pulse" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold">Payment Pending</p>
                <p className="text-sm text-ink-faint mt-1">We're still confirming this payment.</p>
              </div>
              <div className="flex gap-2 w-full">
                <button onClick={onClose} className="btn-ghost flex-1">Complete later</button>
                <button onClick={handlePay} className="btn-primary flex-1">Refresh status</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

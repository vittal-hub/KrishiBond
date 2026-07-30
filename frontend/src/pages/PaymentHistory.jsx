import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Receipt as ReceiptIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentApi } from '../api/paymentApi';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import { formatCurrency, formatDate } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

const STATUS_STYLE = {
  pending: 'bg-harvest-50 text-harvest-700 border-harvest-400/30',
  held: 'bg-canopy-50 text-canopy-700 border-canopy-200',
  released: 'bg-irrigation-50 text-irrigation-700 border-irrigation-400/30',
  refunded: 'bg-ink/5 text-ink-faint border-ink/10',
  failed: 'bg-clay-50 text-clay-600 border-clay-400/30',
};

const METHOD_LABELS = {
  upi: 'UPI',
  card: 'Credit Card',
  debit_card: 'Debit Card',
  netbanking: 'Net Banking',
  wallet: 'Wallet',
};

export default function PaymentHistory() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const load = (page = 1) => {
    setLoading(true);
    paymentApi
      .history({ page, ...(status && { status }) })
      .then((data) => {
        setPayments(data.payments);
        setMeta(data.meta);
      })
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load payment history')))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(1), [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = async (payment) => {
    if (payment.status !== 'held' && payment.status !== 'released') {
      toast.error('Only completed payments have a receipt');
      return;
    }
    try {
      const { downloadReceiptPdf } = await import('../pdf/ReceiptPdfDocument.jsx');
      await downloadReceiptPdf({
        payment,
        merchant: {
          contractId: payment.contractId,
          cropType: payment.cropType,
          farmerName: payment.payeeName,
          buyerName: payment.payerName,
        },
      });
    } catch {
      toast.error('Could not generate the receipt');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Payment History</h1>
        <select className="input-field max-w-[160px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="held">Held (paid)</option>
          <option value="released">Released</option>
          <option value="refunded">Refunded</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {loading ? (
        <Loader label="Loading payment history" />
      ) : payments.length === 0 ? (
        <div className="stub-card p-10 text-center text-sm text-ink-faint">No payments yet.</div>
      ) : (
        <div className="stub-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs text-ink-faint uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Transaction ID</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Farmer</th>
                <th className="px-4 py-3 font-medium">Buyer</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link to={`/contracts/${p.contractId}`} className="text-canopy-700 hover:underline">
                      {p.transactionId || p.orderId || p.id.slice(-8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(p.totalAmount)}</td>
                  <td className="px-4 py-3">{p.payerId === user?.id ? p.payeeName : `You (${p.payeeName})`}</td>
                  <td className="px-4 py-3">{p.payerId === user?.id ? `You (${p.payerName})` : p.payerName}</td>
                  <td className="px-4 py-3 text-ink-faint">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3 text-ink-faint">{METHOD_LABELS[p.method] || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold capitalize px-2.5 py-1 rounded-full border ${STATUS_STYLE[p.status] || STATUS_STYLE.pending}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(p.status === 'held' || p.status === 'released') && (
                      <button onClick={() => handleDownload(p)} className="btn-ghost text-xs px-2.5 py-1.5">
                        <Download className="w-3.5 h-3.5" /> Receipt
                      </button>
                    )}
                    {p.status !== 'held' && p.status !== 'released' && (
                      <span className="text-xs text-ink-faint flex items-center gap-1">
                        <ReceiptIcon className="w-3.5 h-3.5" /> —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={meta.page <= 1} onClick={() => load(meta.page - 1)} className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-40">Previous</button>
          <span className="text-xs text-ink-faint">Page {meta.page} of {meta.pages}</span>
          <button disabled={meta.page >= meta.pages} onClick={() => load(meta.page + 1)} className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}

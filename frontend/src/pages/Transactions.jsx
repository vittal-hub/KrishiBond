import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { transactionApi } from '../api/transactionApi';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import { formatCurrency, formatDate } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

const TYPES = [
  { value: '', label: 'All types' },
  { value: 'wallet_topup', label: 'Wallet top-up' },
  { value: 'escrow_fund', label: 'Escrow funding' },
  { value: 'escrow_release', label: 'Escrow release' },
  { value: 'refund', label: 'Refund' },
  { value: 'withdrawal', label: 'Withdrawal to bank' },
];

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1 });
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await transactionApi.list({ type: type || undefined, page });
      setTransactions(data.transactions);
      setMeta(data.meta);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not load transactions'));
    } finally {
      setLoading(false);
    }
  }, [type, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvoice = async (transaction) => {
    setDownloadingId(transaction._id);
    let downloadInvoicePdf;
    try {
      ({ downloadInvoicePdf } = await import('../pdf/InvoicePdfDocument.jsx'));
    } catch (error) {
      // A dynamic import() rejecting like this (as opposed to throwing
      // inside the PDF library itself, caught below) almost always means the
      // browser tried to fetch a hashed chunk file that no longer exists on
      // the server - i.e. the page was left open across a new deployment.
      // Reloading re-fetches the current index.html/asset map and fixes it;
      // no amount of retrying the same stale page will.
      console.error('Invoice module failed to load (likely a stale deployment):', error);
      toast.error('A new version of KrishiBond is available. Please refresh the page and try again.');
      setDownloadingId(null);
      return;
    }
    try {
      await downloadInvoicePdf(transaction, user ? { name: user.name, email: user.email } : undefined);
    } catch (error) {
      console.error('Invoice generation failed:', error);
      toast.error('Could not generate the invoice');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Transaction history</h1>
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          className="input-field w-auto min-w-[180px]"
        >
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {loading ? (
        <Loader label="Loading transactions" />
      ) : transactions.length === 0 ? (
        <div className="stub-card p-10 text-center text-sm text-ink-faint">No transactions yet.</div>
      ) : (
        <>
          <div className="stub-card divide-y divide-ink/5">
            {transactions.map((t) => (
              <div key={t._id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-medium text-sm capitalize">{t.type.replace('_', ' ')}</p>
                  <p className="text-xs text-ink-faint mt-1">
                    {t.contract ? (
                      <Link to={`/contracts/${t.contract._id}`} className="hover:underline">
                        {t.contract.cropType} — {t.contract.quantity} {t.contract.unit}
                      </Link>
                    ) : (
                      '—'
                    )}
                    {' · '}{formatDate(t.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold">{formatCurrency(t.amount)}</span>
                  <span className="text-xs text-ink-faint capitalize">{t.status}</span>
                  <button
                    onClick={() => handleInvoice(t)}
                    disabled={downloadingId === t._id}
                    className="btn-ghost text-xs px-3 py-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Invoice
                  </button>
                </div>
              </div>
            ))}
          </div>

          {meta.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-ink-faint">Page {meta.page} of {meta.pages}</span>
              <button
                disabled={page >= meta.pages}
                onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

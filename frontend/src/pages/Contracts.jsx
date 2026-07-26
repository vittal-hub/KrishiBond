import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { contractApi } from '../api/contractApi';
import StatusStamp from '../components/StatusStamp.jsx';
import Loader from '../components/Loader.jsx';
import { formatCurrency, formatDate } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';
import { useAuth } from '../context/AuthContext.jsx';

const TABS = ['all', 'pending', 'active', 'fulfilled', 'disputed', 'cancelled'];

export default function Contracts() {
  const { role } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    let active = true;
    setLoading(true);
    contractApi
      .list({ status: tab !== 'all' ? tab : undefined })
      .then((data) => active && setContracts(data.items ?? data))
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load contracts')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [tab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Contracts</h1>
        {role === 'buyer' && (
          <Link to="/contracts/new" className="btn-primary">New contract</Link>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition ${
              tab === t ? 'bg-canopy-600 text-paper' : 'bg-ink/5 text-ink-soft hover:bg-ink/10'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader label="Loading contracts" />
      ) : contracts.length === 0 ? (
        <div className="stub-card p-10 text-center text-sm text-ink-faint">No contracts in this category yet.</div>
      ) : (
        <div className="stub-card divide-y divide-ink/5">
          {contracts.map((c) => (
            <Link
              key={c._id}
              to={`/contracts/${c._id}`}
              className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-canopy-50/40 transition"
            >
              <div>
                <p className="font-medium text-sm">{c.cropType} — {c.quantity} {c.unit}</p>
                <p className="text-xs text-ink-faint mt-1">
                  {role === 'farmer' ? c.buyerName : c.farmerName} · {formatDate(c.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold">{formatCurrency(c.totalValue)}</span>
                <StatusStamp status={c.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

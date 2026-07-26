import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, TrendingUp, Wallet, Clock, ArrowRight, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { contractApi } from '../api/contractApi';
import { marketplaceApi } from '../api/marketplaceApi';
import StatusStamp from '../components/StatusStamp.jsx';
import Loader from '../components/Loader.jsx';
import { formatCurrency, formatDate } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';
import toast from 'react-hot-toast';

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="stub-card p-5">
      <div className={`w-9 h-9 rounded-stub flex items-center justify-center ${accent}`}>
        <Icon className="w-4.5 h-4.5" size={18} />
      </div>
      <p className="text-2xl font-display font-semibold mt-3">{value}</p>
      <p className="text-xs text-ink-faint mt-0.5">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [contractData, matchData] = await Promise.all([
          contractApi.list({ limit: 5, sort: '-updatedAt' }),
          marketplaceApi.matches().catch(() => []),
        ]);
        if (!active) return;
        setContracts(contractData.items ?? contractData);
        setMatches(matchData.items ?? matchData ?? []);
      } catch (error) {
        toast.error(getErrorMessage(error, 'Could not load your dashboard'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <Loader full label="Loading your dashboard" />;

  const activeCount = contracts.filter((c) => c.status === 'active').length;
  const pendingCount = contracts.filter((c) => c.status === 'pending').length;
  const totalValue = contracts.reduce((sum, c) => sum + (c.totalValue ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="text-sm text-ink-faint mt-1 capitalize">{user?.role} dashboard</p>
        </div>
        {user?.role === 'buyer' && (
          <Link to="/contracts/new" className="btn-primary">
            <Plus className="w-4 h-4" /> New contract
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Active contracts" value={activeCount} accent="bg-canopy-50 text-canopy-700" />
        <StatCard icon={Clock} label="Pending actions" value={pendingCount} accent="bg-harvest-50 text-harvest-700" />
        <StatCard icon={Wallet} label="Total contract value" value={formatCurrency(totalValue)} accent="bg-irrigation-50 text-irrigation-700" />
        <StatCard icon={TrendingUp} label="New matches" value={matches.length} accent="bg-clay-50 text-clay-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 stub-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Recent contracts</h2>
            <Link to="/contracts" className="text-sm text-canopy-700 font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {contracts.length === 0 ? (
            <p className="text-sm text-ink-faint py-8 text-center">
              No contracts yet. {user?.role === 'buyer' ? 'Start by browsing the marketplace.' : 'Buyers will reach out once they find your listing.'}
            </p>
          ) : (
            <div className="divide-y divide-ink/5">
              {contracts.map((c) => (
                <Link
                  key={c._id}
                  to={`/contracts/${c._id}`}
                  className="flex items-center justify-between py-3.5 hover:bg-canopy-50/50 -mx-2 px-2 rounded-stub transition"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{c.cropType} — {c.quantity} {c.unit}</p>
                    <p className="text-xs text-ink-faint mt-0.5">
                      Updated {formatDate(c.updatedAt)} · {formatCurrency(c.totalValue)}
                    </p>
                  </div>
                  <StatusStamp status={c.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="stub-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Suggested matches</h2>
          {matches.length === 0 ? (
            <p className="text-sm text-ink-faint py-8 text-center">No new matches right now.</p>
          ) : (
            <div className="space-y-3">
              {matches.slice(0, 4).map((m) => (
                <Link
                  key={m._id}
                  to={`/marketplace/${m._id}`}
                  className="block p-3 rounded-stub border border-ink/10 hover:border-canopy-400 transition"
                >
                  <p className="text-sm font-medium">{m.cropType}</p>
                  <p className="text-xs text-ink-faint mt-0.5">{m.location} · {m.quantity} {m.unit}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

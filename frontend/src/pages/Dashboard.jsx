import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, TrendingUp, Wallet, Clock, ArrowRight, Plus, CalendarClock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { contractApi } from '../api/contractApi';
import { marketplaceApi } from '../api/marketplaceApi';
import { walletApi } from '../api/walletApi';
import { transactionApi } from '../api/transactionApi';
import StatusStamp from '../components/StatusStamp.jsx';
import Loader from '../components/Loader.jsx';
import TrendChart from '../components/charts/TrendChart.jsx';
import StatusFunnelChart from '../components/charts/StatusFunnelChart.jsx';
import { formatCurrency, formatDate } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';
import toast from 'react-hot-toast';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CONTRACT_STATUSES = ['pending', 'active', 'fulfilled', 'disputed', 'cancelled'];

function buildMonthlySeries(series, monthsCount, type) {
  const now = new Date();
  const months = [];
  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: MONTH_LABELS[d.getMonth()] });
  }
  return months.map(({ year, month, label }) => {
    const match = series.find((s) => s.year === year && s.month === month && s.type === type);
    return { label, value: match?.total ?? 0 };
  });
}

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

function formatLocation(location) {
  if (!location) return null;
  return [location.district, location.state].filter(Boolean).join(', ') || null;
}

function UpcomingMilestones({ milestones }) {
  return (
    <div className="stub-card p-6">
      <h2 className="font-display text-lg font-semibold flex items-center gap-2">
        <CalendarClock className="w-4.5 h-4.5 text-canopy-600" /> Upcoming milestones
      </h2>
      {milestones.length === 0 ? (
        <p className="text-sm text-ink-faint py-6 text-center">No pending milestones right now.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {milestones.map((m) => {
            const overdue = m.dueDate && new Date(m.dueDate) < new Date();
            return (
              <Link
                key={m.milestoneId}
                to={`/contracts/${m.contractId}`}
                className="flex items-center justify-between p-3 rounded-stub border border-ink/10 hover:border-canopy-400 transition"
              >
                <div>
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-ink-faint mt-0.5">{m.cropType}</p>
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium ${overdue ? 'text-clay-600' : 'text-ink-faint'}`}>
                  {overdue && <AlertCircle className="w-3.5 h-3.5" />}
                  {m.dueDate ? formatDate(m.dueDate) : 'No due date'}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [matches, setMatches] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [analyticsSeries, setAnalyticsSeries] = useState([]);
  const [milestones, setMilestones] = useState([]);

  const isFarmer = user?.role === 'farmer';

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [contractData, matchData, walletData, analyticsData, milestoneData] = await Promise.all([
          contractApi.list(),
          marketplaceApi.matches().catch(() => ({ matches: [] })),
          walletApi.getMine().catch(() => ({ wallet: null })),
          transactionApi.getAnalytics(6).catch(() => ({ series: [] })),
          contractApi.upcomingMilestones().catch(() => ({ milestones: [] })),
        ]);
        if (!active) return;
        setContracts(contractData.contracts ?? []);
        setMatches(matchData.matches ?? []);
        setWallet(walletData.wallet);
        setAnalyticsSeries(analyticsData.series ?? []);
        setMilestones(milestoneData.milestones ?? []);
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

  const trendData = useMemo(
    () => buildMonthlySeries(analyticsSeries, 6, isFarmer ? 'escrow_release' : 'escrow_fund'),
    [analyticsSeries, isFarmer]
  );

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(CONTRACT_STATUSES.map((s) => [s, 0]));
    contracts.forEach((c) => {
      if (counts[c.status] !== undefined) counts[c.status] += 1;
    });
    return counts;
  }, [contracts]);

  if (loading) return <Loader full label="Loading your dashboard" />;

  const activeCount = contracts.filter((c) => c.status === 'active').length;
  const pendingCount = contracts.filter((c) => c.status === 'pending').length;
  const recentContracts = contracts.slice(0, 5);
  const fulfillmentRate = contracts.length
    ? Math.round((statusCounts.fulfilled / contracts.length) * 100)
    : 0;

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
        <StatCard
          icon={Wallet}
          label={isFarmer ? 'Wallet balance' : 'Held in escrow'}
          value={formatCurrency(isFarmer ? wallet?.balance : wallet?.inEscrow)}
          accent="bg-irrigation-50 text-irrigation-700"
        />
        <StatCard
          icon={TrendingUp}
          label={isFarmer ? 'Fulfillment rate' : 'New matches'}
          value={isFarmer ? `${fulfillmentRate}%` : matches.length}
          accent="bg-clay-50 text-clay-600"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 stub-card p-6">
          <h2 className="font-display text-lg font-semibold mb-1">
            {isFarmer ? 'Income trend' : 'Spend trend'}
          </h2>
          <p className="text-xs text-ink-faint mb-2">Last 6 months, from released escrow {isFarmer ? 'to you' : 'you funded'}</p>
          <TrendChart
            data={trendData}
            color={isFarmer ? '#2F5233' : '#3A6B7A'}
            emptyLabel={isFarmer ? 'No income recorded yet' : 'No escrow funding recorded yet'}
          />
        </div>

        <UpcomingMilestones milestones={milestones} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 stub-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Recent contracts</h2>
            <Link to="/contracts" className="text-sm text-canopy-700 font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentContracts.length === 0 ? (
            <p className="text-sm text-ink-faint py-8 text-center">
              No contracts yet. {user?.role === 'buyer' ? 'Start by browsing the marketplace.' : 'Buyers will reach out once they find your listing.'}
            </p>
          ) : (
            <div className="divide-y divide-ink/5">
              {recentContracts.map((c) => (
                <Link
                  key={c.id}
                  to={`/contracts/${c.id}`}
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
          <h2 className="font-display text-lg font-semibold mb-4">Contract pipeline</h2>
          <StatusFunnelChart counts={statusCounts} />
        </div>
      </div>

      {!isFarmer && (
        <div className="stub-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Suggested matches</h2>
          {matches.length === 0 ? (
            <p className="text-sm text-ink-faint py-8 text-center">No new matches right now.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {matches.slice(0, 4).map((m) => (
                <Link
                  key={m.id}
                  to={`/marketplace/${m.id}`}
                  className="block p-3 rounded-stub border border-ink/10 hover:border-canopy-400 transition"
                >
                  <p className="text-sm font-medium">{m.cropType}</p>
                  <p className="text-xs text-ink-faint mt-0.5">{formatLocation(m.location) ?? 'Location not set'} · {m.quantity} {m.unit}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

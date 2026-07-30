import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, TrendingUp, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { walletApi } from '../api/walletApi';
import Loader from '../components/Loader.jsx';
import { formatCurrency } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

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

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    walletApi
      .getMine()
      .then((data) => setWallet(data.wallet))
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load your wallet')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader full label="Loading wallet" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Wallet</h1>
        <Link to="/transactions" className="text-sm text-canopy-700 font-medium hover:underline flex items-center gap-1">
          View transaction history <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={WalletIcon} label="Available balance" value={formatCurrency(wallet?.balance)} accent="bg-canopy-50 text-canopy-700" />
        <StatCard icon={ArrowUpRight} label="Held in escrow" value={formatCurrency(wallet?.inEscrow)} accent="bg-harvest-50 text-harvest-700" />
        <StatCard icon={TrendingUp} label="Lifetime earned" value={formatCurrency(wallet?.lifetimeEarned)} accent="bg-irrigation-50 text-irrigation-700" />
        <StatCard icon={ArrowDownRight} label="Lifetime spent" value={formatCurrency(wallet?.lifetimeSpent)} accent="bg-clay-50 text-clay-600" />
      </div>

      <div className="stub-card p-6">
        <p className="text-sm text-ink-soft leading-relaxed">
          Available balance is money released to you from completed escrow milestones. Held in escrow reflects
          buyer funds currently locked against your active contracts. Withdrawing your balance to a bank account
          isn't available yet — this ships with the payouts feature.
        </p>
      </div>
    </div>
  );
}

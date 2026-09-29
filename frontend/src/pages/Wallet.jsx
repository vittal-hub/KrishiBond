import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet as WalletIcon, ArrowUpRight, TrendingUp, ArrowRight, Plus, Lock, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { walletApi } from '../api/walletApi';
import { transactionApi } from '../api/transactionApi';
import AddMoneyModal from '../components/payment/AddMoneyModal.jsx';
import Loader from '../components/Loader.jsx';
import { formatCurrency, formatRelative } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

const TYPE_LABELS = {
  wallet_topup: 'Added to wallet',
  escrow_fund: 'Escrow funded',
  escrow_release: 'Escrow released to you',
  refund: 'Refund',
  platform_fee: 'Platform fee',
};

// Credits (money coming into the wallet) vs debits (money leaving it) -
// purely for the icon/color shown next to each row; the ledger's real
// source of truth is the backend, this is just presentation.
const CREDIT_TYPES = new Set(['wallet_topup', 'escrow_release', 'refund']);

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
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMoney, setShowAddMoney] = useState(false);

  const load = useCallback(async () => {
    try {
      const [walletData, txData] = await Promise.all([
        walletApi.getMine(),
        transactionApi.list({ limit: 5 }),
      ]);
      setWallet(walletData.wallet);
      setTransactions(txData.transactions ?? []);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not load your wallet'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loader full label="Loading wallet" />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Wallet</h1>
        <button onClick={() => setShowAddMoney(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Money
        </button>
      </div>

      <div className="stub-card p-6">
        <p className="text-xs text-ink-faint uppercase tracking-wide">Available balance</p>
        <p className="font-display text-4xl font-semibold mt-1">{formatCurrency(wallet?.balance)}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={WalletIcon} label="Available balance" value={formatCurrency(wallet?.balance)} accent="bg-canopy-50 text-canopy-700" />
        <StatCard icon={ArrowUpRight} label="Held in escrow" value={formatCurrency(wallet?.inEscrow)} accent="bg-harvest-50 text-harvest-700" />
        <StatCard icon={TrendingUp} label="Lifetime earned" value={formatCurrency(wallet?.lifetimeEarned)} accent="bg-irrigation-50 text-irrigation-700" />
      </div>

      <div className="stub-card p-5 flex items-start gap-3">
        <Lock className="w-4 h-4 text-ink-faint mt-0.5 shrink-0" />
        <p className="text-sm text-ink-soft leading-relaxed">
          Funds in this wallet can be used for eligible KrishiBond contract payments. Withdrawals to a bank
          account are not available.
        </p>
      </div>

      <div className="stub-card">
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="font-display text-lg font-semibold">Recent transactions</h2>
          <Link to="/transactions" className="text-sm text-canopy-700 font-medium hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {transactions.length === 0 ? (
          <p className="text-sm text-ink-faint text-center py-10">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-ink/5 mt-3">
            {transactions.map((t) => {
              const isCredit = CREDIT_TYPES.has(t.type);
              return (
                <div key={t._id} className="flex items-center justify-between gap-3 p-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCredit ? 'bg-canopy-50 text-canopy-700' : 'bg-clay-50 text-clay-600'}`}>
                      {isCredit ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{TYPE_LABELS[t.type] || t.type}</p>
                      <p className="text-xs text-ink-faint mt-0.5">{formatRelative(t.createdAt)} · {t.status}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${isCredit ? 'text-canopy-700' : 'text-clay-600'}`}>
                    {isCredit ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddMoney && (
        <AddMoneyModal
          onClose={() => { setShowAddMoney(false); load(); }}
          onSuccess={(updatedWallet) => setWallet(updatedWallet)}
        />
      )}
    </div>
  );
}

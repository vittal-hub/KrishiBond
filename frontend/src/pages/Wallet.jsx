import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet as WalletIcon, ArrowUpRight, TrendingUp, ArrowRight, Plus, Landmark, Clock, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { walletApi } from '../api/walletApi';
import { transactionApi } from '../api/transactionApi';
import AddMoneyModal from '../components/payment/AddMoneyModal.jsx';
import WithdrawModal from '../components/payment/WithdrawModal.jsx';
import Loader from '../components/Loader.jsx';
import { formatCurrency, formatRelative } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

const TYPE_LABELS = {
  wallet_topup: 'Added to wallet',
  escrow_fund: 'Escrow funded',
  escrow_release: 'Escrow released to you',
  refund: 'Refund',
  platform_fee: 'Platform fee',
  withdrawal: 'Withdrawal to bank',
};

const STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  success: 'Completed',
  failed: 'Failed',
  reversed: 'Reversed',
};

// Credits (money coming into the wallet) vs debits (money leaving it) -
// purely for the icon/color shown next to each row; the ledger's real
// source of truth is the backend, this is just presentation.
const CREDIT_TYPES = new Set(['wallet_topup', 'escrow_release', 'refund']);

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="stub-card p-5 min-w-0">
      <div className={`w-9 h-9 rounded-stub flex items-center justify-center ${accent}`}>
        <Icon className="w-4.5 h-4.5" size={18} />
      </div>
      <p className="text-xl sm:text-2xl font-display font-semibold mt-3 break-words [overflow-wrap:anywhere] leading-tight">{value}</p>
      <p className="text-xs text-ink-faint mt-0.5">{label}</p>
    </div>
  );
}

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [bankAccount, setBankAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const load = useCallback(async () => {
    try {
      const [walletData, txData] = await Promise.all([
        walletApi.getMine(),
        transactionApi.list({ limit: 5 }),
      ]);
      setWallet(walletData.wallet);
      setBankAccount(walletData.bankAccount);
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

  const availableBalance = wallet?.balance ?? 0;
  const pendingWithdrawal = wallet?.pendingWithdrawal ?? 0;
  const totalBalance = availableBalance + pendingWithdrawal;
  const canWithdraw = availableBalance > 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Wallet</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowAddMoney(true)} className="btn-secondary">
            <Plus className="w-4 h-4" /> Add Money
          </button>
          {canWithdraw && (
            <button onClick={() => setShowWithdraw(true)} className="btn-primary">
              <Landmark className="w-4 h-4" /> Withdraw to Bank
            </button>
          )}
        </div>
      </div>

      <div className="stub-card p-6 min-w-0">
        <p className="text-xs text-ink-faint uppercase tracking-wide">Available to withdraw</p>
        <p className="font-display text-3xl sm:text-4xl font-semibold mt-1 break-words [overflow-wrap:anywhere] leading-tight">
          {formatCurrency(availableBalance)}
        </p>
        {pendingWithdrawal > 0 && (
          <p className="text-xs text-harvest-700 mt-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {formatCurrency(pendingWithdrawal)} withdrawal in progress · Total balance {formatCurrency(totalBalance)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={WalletIcon} label="Available to withdraw" value={formatCurrency(availableBalance)} accent="bg-canopy-50 text-canopy-700" />
        <StatCard icon={Clock} label="Withdrawal pending" value={formatCurrency(pendingWithdrawal)} accent="bg-harvest-50 text-harvest-700" />
        <StatCard icon={ArrowUpRight} label="Held in escrow (as buyer)" value={formatCurrency(wallet?.inEscrow)} accent="bg-irrigation-50 text-irrigation-700" />
        <StatCard icon={TrendingUp} label="Lifetime earned" value={formatCurrency(wallet?.lifetimeEarned)} accent="bg-clay-50 text-clay-600" />
      </div>

      <div className="stub-card p-5 flex items-start gap-3">
        <Landmark className="w-4 h-4 text-ink-faint mt-0.5 shrink-0" />
        <p className="text-sm text-ink-soft leading-relaxed">
          {bankAccount?.isVerified
            ? `Verified for withdrawals: ${bankAccount.accountHolderName} · ${bankAccount.accountNumberMasked}`
            : bankAccount
              ? 'Your bank account is on file and pending verification. You can withdraw once it is verified.'
              : 'Only funds actually released to you from a completed contract, or added directly, become available to withdraw. Add a bank account from "Withdraw to Bank" to get started.'}
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
                      <p className="text-xs text-ink-faint mt-0.5">{formatRelative(t.createdAt)} · {STATUS_LABELS[t.status] || t.status}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${isCredit ? 'text-canopy-700' : 'text-clay-600'}`}>
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

      {showWithdraw && (
        <WithdrawModal
          wallet={wallet}
          bankAccount={bankAccount}
          onClose={() => { setShowWithdraw(false); load(); }}
          onSuccess={(updatedWallet) => setWallet(updatedWallet)}
        />
      )}
    </div>
  );
}

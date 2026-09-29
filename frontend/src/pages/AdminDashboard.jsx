import React, { useEffect, useState } from 'react';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  TrendingUp,
  UserPlus,
  Tag,
  HelpCircle,
  Ticket,
  ScrollText,
  Ban,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  Download,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { adminApi } from '../api/adminApi';
import { marketplaceApi } from '../api/marketplaceApi';
import { supportApi } from '../api/communicationApi';
import TrendChart from '../components/charts/TrendChart.jsx';
import StatusFunnelChart from '../components/charts/StatusFunnelChart.jsx';
import Loader from '../components/Loader.jsx';
import { formatCurrency, formatDate, formatRelative } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

const TABS = ['Overview', 'Users', 'KYC Queue', 'Payments', 'Categories', 'FAQ', 'Tickets', 'Audit Log'];

function KpiCard({ icon: Icon, label, value }) {
  return (
    <div className="stub-card p-5 min-w-0">
      <div className="flex items-center gap-2 text-ink-faint">
        <Icon className="w-4 h-4" />
        <p className="text-xs">{label}</p>
      </div>
      <p className="font-display text-xl sm:text-2xl font-semibold mt-2 break-words [overflow-wrap:anywhere] leading-tight">{value}</p>
    </div>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .stats()
      .then((data) => setStats(data.stats))
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load platform stats')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Loading platform stats" />;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Total users" value={stats.totalUsers} />
        <KpiCard icon={UserPlus} label="New signups (7d)" value={stats.newSignups7d} />
        <KpiCard icon={TrendingUp} label="GMV (6 months)" value={formatCurrency(stats.gmv)} />
        <KpiCard icon={Wallet} label="Escrow held" value={formatCurrency(stats.escrowHeld)} />
        <KpiCard icon={ShieldCheck} label="Pending KYC" value={stats.pendingKyc} />
        <KpiCard icon={ShieldAlert} label="Open disputes" value={stats.openDisputes} />
        <KpiCard icon={TrendingUp} label="Active contracts" value={stats.activeContracts} />
        <KpiCard icon={Users} label="Farmers / Buyers" value={`${stats.usersByRole.farmer} / ${stats.usersByRole.buyer}`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="stub-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4">GMV trend</h2>
          <TrendChart data={stats.gmvTrend} emptyLabel="No released escrow payments yet" />
        </div>
        <div className="stub-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Contract funnel</h2>
          <StatusFunnelChart counts={stats.contractsByStatus} />
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ role: '', status: '', search: '' });

  const load = (page = 1) => {
    setLoading(true);
    adminApi
      .listUsers({ ...filters, page })
      .then((data) => {
        setUsers(data.users);
        setMeta(data.meta);
      })
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load users')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSuspend = async (user) => {
    try {
      if (user.status === 'suspended') {
        await adminApi.reactivateUser(user.id);
        toast.success(`${user.name} reactivated`);
      } else {
        const reason = window.prompt(`Reason for suspending ${user.name}? (optional)`) || undefined;
        await adminApi.suspendUser(user.id, reason);
        toast.success(`${user.name} suspended`);
      }
      load(meta.page);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update this user'));
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(1);
        }}
        className="flex flex-wrap gap-3"
      >
        <input
          className="input-field max-w-xs"
          placeholder="Search name or email"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <select
          className="input-field max-w-[140px]"
          value={filters.role}
          onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
        >
          <option value="">All roles</option>
          <option value="farmer">Farmer</option>
          <option value="buyer">Buyer</option>
          <option value="admin">Admin</option>
        </select>
        <select
          className="input-field max-w-[140px]"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button type="submit" className="btn-secondary">Filter</button>
      </form>

      {loading ? (
        <Loader label="Loading users" />
      ) : (
        <div className="stub-card divide-y divide-ink/5">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium">{u.name} <span className="text-xs text-ink-faint capitalize">· {u.role}</span></p>
                <p className="text-xs text-ink-faint mt-0.5">{u.email} · Joined {formatDate(u.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold capitalize px-2.5 py-1 rounded-full border ${u.status === 'suspended' ? 'bg-clay-50 text-clay-600 border-clay-400/30' : 'bg-canopy-50 text-canopy-700 border-canopy-200'}`}>
                  {u.status}
                </span>
                {u.role !== 'admin' && (
                  <button onClick={() => toggleSuspend(u)} className="btn-ghost text-xs px-3 py-1.5">
                    {u.status === 'suspended' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                    {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-sm text-ink-faint p-6 text-center">No users match these filters.</p>}
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

function KycTab() {
  const [kycs, setKycs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi
      .listKyc({ status: 'pending' })
      .then((data) => setKycs(data.kycs))
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load the KYC queue')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const approve = async (id) => {
    try {
      await adminApi.approveKyc(id);
      toast.success('KYC approved');
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not approve this submission'));
    }
  };

  const reject = async (id) => {
    const reason = window.prompt('Reason for rejection?') || undefined;
    try {
      await adminApi.rejectKyc(id, reason);
      toast.success('KYC rejected');
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not reject this submission'));
    }
  };

  if (loading) return <Loader label="Loading KYC queue" />;

  return (
    <div className="stub-card divide-y divide-ink/5">
      {kycs.length === 0 && <p className="text-sm text-ink-faint p-6 text-center">No pending KYC submissions.</p>}
      {kycs.map((k) => (
        <div key={k.id} className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium">{k.user?.name} <span className="text-xs text-ink-faint">({k.user?.role})</span></p>
            <p className="text-xs text-ink-faint mt-0.5">{k.user?.email} · PAN {k.panNumber || '—'} · Submitted {formatRelative(k.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => approve(k.id)} className="btn-secondary text-xs px-3 py-1.5">Approve</button>
            <button onClick={() => reject(k.id)} className="btn-ghost text-xs px-3 py-1.5 text-clay-600">Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

const PAYMENT_STATUS_STYLE = {
  pending: 'bg-harvest-50 text-harvest-700 border-harvest-400/30',
  held: 'bg-canopy-50 text-canopy-700 border-canopy-200',
  released: 'bg-irrigation-50 text-irrigation-700 border-irrigation-400/30',
  refunded: 'bg-ink/5 text-ink-faint border-ink/10',
  failed: 'bg-clay-50 text-clay-600 border-clay-400/30',
};

function PaymentsTab() {
  const [payments, setPayments] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const load = (page = 1) => {
    setLoading(true);
    adminApi
      .listPayments({ page, ...(status && { status }) })
      .then((data) => {
        setPayments(data.payments);
        setMeta(data.meta);
      })
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load payments')))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(1), [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (payment, newStatus) => {
    try {
      await adminApi.updatePaymentStatus(payment.id, newStatus);
      toast.success(`Payment marked ${newStatus}`);
      load(meta.page);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update this payment'));
    }
  };

  const downloadReceipt = async (payment) => {
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
    <div className="space-y-4">
      <div className="flex justify-end">
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
        <Loader label="Loading payments" />
      ) : (
        <div className="stub-card divide-y divide-ink/5">
          {payments.length === 0 && <p className="text-sm text-ink-faint p-6 text-center">No payments yet.</p>}
          {payments.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium">{formatCurrency(p.totalAmount)} · {p.cropType}</p>
                <p className="text-xs text-ink-faint mt-0.5">
                  {p.payerName} → {p.payeeName} · {formatRelative(p.createdAt)}
                </p>
                {p.transactionId && <p className="text-[11px] font-mono text-ink-faint mt-0.5">{p.transactionId}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold capitalize px-2.5 py-1 rounded-full border ${PAYMENT_STATUS_STYLE[p.status] || PAYMENT_STATUS_STYLE.pending}`}>
                  {p.status}
                </span>
                {(p.status === 'held' || p.status === 'released') && (
                  <button onClick={() => downloadReceipt(p)} className="btn-ghost text-xs px-2.5 py-1.5">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
                {p.status === 'held' && (
                  <button onClick={() => updateStatus(p, 'refunded')} className="btn-ghost text-xs px-2.5 py-1.5 text-clay-600" title="Mark refunded">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                {p.status === 'pending' && (
                  <>
                    <button onClick={() => updateStatus(p, 'held')} className="btn-ghost text-xs px-2.5 py-1.5 text-canopy-700" title="Mark paid">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => updateStatus(p, 'failed')} className="btn-ghost text-xs px-2.5 py-1.5 text-clay-600" title="Mark failed">
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
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

function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const load = () => {
    setLoading(true);
    marketplaceApi
      .categories()
      .then((data) => setCategories(data.categories))
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load categories')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startEdit = (category) => {
    setEditing(category?._id ?? 'new');
    reset({ name: category?.name ?? '', description: category?.description ?? '' });
  };

  const onSubmit = async (values) => {
    try {
      if (editing === 'new') {
        await adminApi.createCategory(values);
        toast.success('Category created');
      } else {
        await adminApi.updateCategory(editing, values);
        toast.success('Category updated');
      }
      setEditing(null);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save this category'));
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await adminApi.deleteCategory(id);
      toast.success('Category deleted');
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete this category'));
    }
  };

  if (loading) return <Loader label="Loading categories" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => startEdit(null)} className="btn-primary text-xs px-3 py-1.5"><Plus className="w-3.5 h-3.5" /> New category</button>
      </div>

      {editing && (
        <form onSubmit={handleSubmit(onSubmit)} className="stub-card p-5 space-y-3">
          <input className="input-field" placeholder="Category name" {...register('name', { required: true })} />
          <textarea className="input-field resize-none" rows={2} placeholder="Description (optional)" {...register('description')} />
          <div className="flex gap-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary text-xs px-3 py-1.5">Save</button>
            <button type="button" onClick={() => setEditing(null)} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
          </div>
        </form>
      )}

      <div className="stub-card divide-y divide-ink/5">
        {categories.map((c) => (
          <div key={c._id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium">{c.name}</p>
              {c.description && <p className="text-xs text-ink-faint mt-0.5">{c.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => startEdit(c)} className="btn-ghost text-xs px-2.5 py-1.5"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => remove(c._id)} className="btn-ghost text-xs px-2.5 py-1.5 text-clay-600"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        {categories.length === 0 && <p className="text-sm text-ink-faint p-6 text-center">No categories yet.</p>}
      </div>
    </div>
  );
}

function FaqTab() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  // Loads FAQs via the public support endpoint (same data admins manage).
  const fetchFaqs = () => {
    setLoading(true);
    supportApi
      .faqs()
      .then((data) => setFaqs(data.faqs))
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load FAQs')))
      .finally(() => setLoading(false));
  };

  useEffect(fetchFaqs, []);

  const startEdit = (faq) => {
    setEditing(faq?._id ?? 'new');
    reset({ question: faq?.question ?? '', answer: faq?.answer ?? '', category: faq?.category ?? 'general' });
  };

  const onSubmit = async (values) => {
    try {
      if (editing === 'new') {
        await adminApi.createFaq(values);
        toast.success('FAQ created');
      } else {
        await adminApi.updateFaq(editing, values);
        toast.success('FAQ updated');
      }
      setEditing(null);
      fetchFaqs();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save this FAQ'));
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this FAQ?')) return;
    try {
      await adminApi.deleteFaq(id);
      toast.success('FAQ deleted');
      fetchFaqs();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete this FAQ'));
    }
  };

  if (loading) return <Loader label="Loading FAQs" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => startEdit(null)} className="btn-primary text-xs px-3 py-1.5"><Plus className="w-3.5 h-3.5" /> New FAQ</button>
      </div>

      {editing && (
        <form onSubmit={handleSubmit(onSubmit)} className="stub-card p-5 space-y-3">
          <input className="input-field" placeholder="Question" {...register('question', { required: true })} />
          <textarea className="input-field resize-none" rows={3} placeholder="Answer" {...register('answer', { required: true })} />
          <input className="input-field" placeholder="Category (e.g. general, payments)" {...register('category')} />
          <div className="flex gap-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary text-xs px-3 py-1.5">Save</button>
            <button type="button" onClick={() => setEditing(null)} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
          </div>
        </form>
      )}

      <div className="stub-card divide-y divide-ink/5">
        {faqs.map((f) => (
          <div key={f._id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium">{f.question}</p>
              <p className="text-xs text-ink-faint mt-0.5 capitalize">{f.category}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => startEdit(f)} className="btn-ghost text-xs px-2.5 py-1.5"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => remove(f._id)} className="btn-ghost text-xs px-2.5 py-1.5 text-clay-600"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        {faqs.length === 0 && <p className="text-sm text-ink-faint p-6 text-center">No FAQs yet.</p>}
      </div>
    </div>
  );
}

const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

function TicketRow({ ticket: t, onUpdated }) {
  const [status, setStatus] = useState(t.status);
  const [reply, setReply] = useState(t.response || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { ticket } = await adminApi.updateTicket(t._id, {
        status,
        response: reply.trim() || undefined,
      });
      onUpdated(ticket);
      toast.success('Ticket updated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update this ticket'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{t.subject}</p>
          <p className="text-xs text-ink-faint mt-0.5">{t.user?.name} ({t.user?.email}) · {formatRelative(t.createdAt)}</p>
          <p className="text-sm text-ink-soft mt-1">{t.message}</p>
        </div>
        <select
          className="input-field max-w-[140px] text-xs"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>
      <div className="flex items-end gap-2">
        <textarea
          className="input-field text-sm flex-1"
          rows={2}
          placeholder="Reply to this ticket…"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary text-xs px-3 py-2 whitespace-nowrap"
        >
          {saving ? 'Saving…' : 'Save & notify'}
        </button>
      </div>
    </div>
  );
}

function TicketsTab() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi
      .listTickets()
      .then((data) => setTickets(data.tickets))
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load support tickets')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleUpdated = (updated) => {
    setTickets((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
  };

  if (loading) return <Loader label="Loading tickets" />;

  return (
    <div className="stub-card divide-y divide-ink/5">
      {tickets.length === 0 && <p className="text-sm text-ink-faint p-6 text-center">No support tickets.</p>}
      {tickets.map((t) => (
        <TicketRow key={t._id} ticket={t} onUpdated={handleUpdated} />
      ))}
    </div>
  );
}

function AuditLogTab() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);

  const load = (page = 1) => {
    setLoading(true);
    adminApi
      .listAuditLogs({ page })
      .then((data) => {
        setLogs(data.logs);
        setMeta(data.meta);
      })
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load the audit log')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Loader label="Loading audit log" />;

  return (
    <div className="space-y-4">
      <div className="stub-card divide-y divide-ink/5">
        {logs.length === 0 && <p className="text-sm text-ink-faint p-6 text-center">No audit entries yet.</p>}
        {logs.map((l) => (
          <div key={l.id} className="p-4">
            <p className="text-sm font-medium">{l.action.replace(/_/g, ' ')}</p>
            <p className="text-xs text-ink-faint mt-0.5">
              {l.actorName} · {l.entityType} · {formatRelative(l.createdAt)}
            </p>
          </div>
        ))}
      </div>
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

export default function AdminDashboard() {
  const [tab, setTab] = useState('Overview');

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Admin Dashboard</h1>

      <div className="flex flex-wrap gap-1 border-b border-ink/10">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-canopy-600 text-canopy-700' : 'border-transparent text-ink-faint hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab />}
      {tab === 'Users' && <UsersTab />}
      {tab === 'KYC Queue' && <KycTab />}
      {tab === 'Payments' && <PaymentsTab />}
      {tab === 'Categories' && <CategoriesTab />}
      {tab === 'FAQ' && <FaqTab />}
      {tab === 'Tickets' && <TicketsTab />}
      {tab === 'Audit Log' && <AuditLogTab />}
    </div>
  );
}

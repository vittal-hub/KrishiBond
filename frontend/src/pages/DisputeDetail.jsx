import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Send, Paperclip, Image as ImageIcon } from 'lucide-react';
import { disputeApi } from '../api/communicationApi';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import { formatRelative } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

const RESOLUTION_OPTIONS = ['under_review', 'resolved', 'rejected'];

function ResolvePanel({ dispute, onResolved }) {
  const [status, setStatus] = useState('under_review');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { dispute: updated } = await disputeApi.resolve(dispute.id, { status, resolutionNote: note });
      toast.success('Dispute updated');
      onResolved(updated);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update this dispute'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stub-card p-6">
      <h2 className="font-display text-lg font-semibold mb-4">Admin resolution</h2>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
            {RESOLUTION_OPTIONS.map((o) => (
              <option key={o} value={o}>{o.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="note">Resolution note</label>
          <textarea
            id="note"
            rows={3}
            className="input-field resize-none"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explain the outcome for both parties"
          />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Saving…' : 'Update dispute'}
        </button>
      </form>
    </div>
  );
}

export default function DisputeDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    disputeApi
      .getById(id)
      .then((data) => setDispute(data.dispute))
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load this dispute')))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSending(true);
    try {
      const { dispute: updated } = await disputeApi.addComment(id, comment.trim());
      setDispute(updated);
      setComment('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not post your comment'));
    } finally {
      setSending(false);
    }
  };

  const handleEvidenceUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { dispute: updated } = await disputeApi.uploadEvidence(id, file);
      setDispute(updated);
      toast.success('Evidence uploaded');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not upload evidence'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <Loader full label="Loading dispute" />;
  if (!dispute) return <p className="text-sm text-ink-faint">Dispute not found.</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="stub-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-display text-xl font-semibold">{dispute.reason}</h1>
          <span className="text-xs font-semibold capitalize px-2.5 py-1 rounded-full bg-clay-50 text-clay-600 border border-clay-400/30">
            {dispute.status ?? 'open'}
          </span>
        </div>
        <p className="text-sm text-ink-faint mt-2">Contract #{dispute.contractId?.slice?.(-6)} · Filed {formatRelative(dispute.createdAt)} by {dispute.raisedByName}</p>
        {dispute.resolutionNote && (
          <div className="mt-4 p-3 rounded-stub bg-canopy-50 border border-canopy-200">
            <p className="text-xs font-semibold text-canopy-700 uppercase tracking-wide">Resolution</p>
            <p className="text-sm text-ink-soft mt-1">{dispute.resolutionNote}</p>
          </div>
        )}
      </div>

      <div className="stub-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="w-4.5 h-4.5 text-canopy-600" /> Evidence
          </h2>
          <label className="btn-secondary text-xs px-3 py-1.5 cursor-pointer">
            <Paperclip className="w-3.5 h-3.5" /> {uploading ? 'Uploading…' : 'Add evidence'}
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleEvidenceUpload} disabled={uploading} />
          </label>
        </div>
        {dispute.evidenceUrls.length === 0 ? (
          <p className="text-sm text-ink-faint mt-3">No evidence uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {dispute.evidenceUrls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="block">
                <img src={url} alt="Evidence" className="w-full h-20 object-cover rounded-stub border border-ink/10" />
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="stub-card p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Discussion</h2>
        <div className="space-y-4">
          {dispute.comments.length === 0 && (
            <p className="text-sm text-ink-faint">No comments yet — our support team has been notified.</p>
          )}
          {dispute.comments.map((c) => (
            <div key={c.id} className="border-b border-ink/5 pb-4 last:border-0">
              <p className="text-sm font-medium">{c.authorName}</p>
              <p className="text-sm text-ink-soft mt-1">{c.text}</p>
              <p className="text-xs text-ink-faint mt-1">{formatRelative(c.createdAt)}</p>
            </div>
          ))}
        </div>
        <form onSubmit={submitComment} className="flex gap-2 mt-4">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment or update"
            className="input-field"
          />
          <button type="submit" disabled={sending} className="btn-primary px-4">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {user?.role === 'admin' && <ResolvePanel dispute={dispute} onResolved={setDispute} />}
    </div>
  );
}

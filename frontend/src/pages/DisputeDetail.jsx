import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';
import { disputeApi } from '../api/communicationApi';
import Loader from '../components/Loader.jsx';
import { formatRelative } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

export default function DisputeDetail() {
  const { id } = useParams();
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => {
    disputeApi
      .getById(id)
      .then(setDispute)
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load this dispute')))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSending(true);
    try {
      await disputeApi.addComment(id, { body: comment });
      setComment('');
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not post your comment'));
    } finally {
      setSending(false);
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
        <p className="text-sm text-ink-faint mt-2">Contract #{dispute.contractId?.slice?.(-6)} · Filed {formatRelative(dispute.createdAt)}</p>
        {dispute.description && <p className="text-sm text-ink-soft mt-4 leading-relaxed">{dispute.description}</p>}
      </div>

      <div className="stub-card p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Discussion</h2>
        <div className="space-y-4">
          {(dispute.comments ?? []).length === 0 && (
            <p className="text-sm text-ink-faint">No comments yet — our support team has been notified.</p>
          )}
          {(dispute.comments ?? []).map((c) => (
            <div key={c._id} className="border-b border-ink/5 pb-4 last:border-0">
              <p className="text-sm font-medium">{c.authorName}</p>
              <p className="text-sm text-ink-soft mt-1">{c.body}</p>
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
    </div>
  );
}

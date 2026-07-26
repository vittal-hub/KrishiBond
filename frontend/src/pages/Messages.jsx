import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { messageApi } from '../api/communicationApi';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import { formatRelative } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

export default function Messages() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    messageApi
      .threads()
      .then((data) => setThreads(data.items ?? data))
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load conversations')))
      .finally(() => setLoadingThreads(false));
  }, []);

  const loadThread = useCallback((id) => {
    setLoadingMessages(true);
    messageApi
      .thread(id)
      .then(setActiveThread)
      .catch((error) => toast.error(getErrorMessage(error, 'Could not open this conversation')))
      .finally(() => setLoadingMessages(false));
  }, []);

  useEffect(() => {
    if (threadId) loadThread(threadId);
  }, [threadId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !threadId) return;
    setSending(true);
    try {
      const message = await messageApi.send(threadId, { body: draft });
      setActiveThread((prev) => ({ ...prev, messages: [...(prev?.messages ?? []), message] }));
      setDraft('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Message failed to send'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-8rem)]">
      <div className="stub-card overflow-hidden flex flex-col">
        <div className="p-4 border-b border-ink/10">
          <h2 className="font-display font-semibold">Conversations</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingThreads ? (
            <Loader label="Loading" />
          ) : threads.length === 0 ? (
            <p className="text-sm text-ink-faint text-center py-8 px-4">
              No conversations yet. Start one from a listing or contract.
            </p>
          ) : (
            threads.map((t) => (
              <button
                key={t._id}
                onClick={() => navigate(`/messages/${t._id}`)}
                className={`w-full text-left px-4 py-3 border-b border-ink/5 hover:bg-canopy-50/50 transition ${
                  threadId === t._id ? 'bg-canopy-50' : ''
                }`}
              >
                <p className="text-sm font-medium truncate">{t.counterpartyName}</p>
                <p className="text-xs text-ink-faint truncate mt-0.5">{t.lastMessage}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="stub-card flex flex-col overflow-hidden">
        {!threadId ? (
          <div className="flex-1 flex items-center justify-center text-sm text-ink-faint">
            Select a conversation to view messages.
          </div>
        ) : loadingMessages ? (
          <Loader full={false} label="Loading messages" />
        ) : (
          <>
            <div className="p-4 border-b border-ink/10">
              <p className="font-medium text-sm">{activeThread?.counterpartyName}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(activeThread?.messages ?? []).map((m) => (
                <div
                  key={m._id}
                  className={`max-w-[75%] px-3.5 py-2.5 rounded-stub text-sm ${
                    m.senderId === user?._id
                      ? 'ml-auto bg-canopy-600 text-paper'
                      : 'bg-paper-dim text-ink'
                  }`}
                >
                  <p>{m.body}</p>
                  <p className={`text-[10px] mt-1 ${m.senderId === user?._id ? 'text-paper/70' : 'text-ink-faint'}`}>
                    {formatRelative(m.createdAt)}
                  </p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} className="p-3 border-t border-ink/10 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                className="input-field"
              />
              <button type="submit" disabled={sending} className="btn-primary px-4">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

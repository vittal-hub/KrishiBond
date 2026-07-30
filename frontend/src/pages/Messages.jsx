import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Send, Paperclip, Mic, Square, Check, CheckCheck, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { messageApi } from '../api/communicationApi';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import Loader from '../components/Loader.jsx';
import { formatRelative } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

function useVoiceRecorder(onDone) {
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        onDone(new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' }));
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast.error('Microphone access denied');
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  return { recording, start, stop };
}

function MessageBubble({ message, isMine }) {
  return (
    <div
      className={`max-w-[75%] px-3.5 py-2.5 rounded-stub text-sm ${
        isMine ? 'ml-auto bg-canopy-600 text-paper' : 'bg-paper-dim text-ink'
      }`}
    >
      {message.type === 'image' && message.attachments[0] && (
        <img src={message.attachments[0]} alt="Shared" className="rounded-stub mb-2 max-h-56 object-cover" />
      )}
      {message.type === 'voice' && message.attachments[0] && (
        <audio controls src={message.attachments[0]} className="mb-1 max-w-full" />
      )}
      {message.type === 'file' && message.attachments[0] && (
        <a href={message.attachments[0]} target="_blank" rel="noreferrer" className="underline text-sm">
          Download attachment
        </a>
      )}
      {message.body && <p>{message.body}</p>}
      <div className={`flex items-center gap-1 text-[10px] mt-1 ${isMine ? 'text-paper/70' : 'text-ink-faint'}`}>
        {formatRelative(message.createdAt)}
        {isMine && (message.seenByOthers ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
      </div>
    </div>
  );
}

export default function Messages() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const socket = useSocket();

  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [typingUser, setTypingUser] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const refreshThreads = useCallback(() => {
    messageApi
      .threads()
      .then((data) => setThreads(data.threads ?? []))
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load conversations')))
      .finally(() => setLoadingThreads(false));
  }, []);

  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  // "Message" buttons elsewhere in the app (contract detail) hand off a
  // recipient via navigation state instead of an existing thread id.
  useEffect(() => {
    const recipientId = location.state?.recipientId;
    if (!threadId && recipientId) {
      messageApi
        .startThread({ recipientId, contractId: location.state?.contractId })
        .then(({ thread }) => navigate(`/messages/${thread.id}`, { replace: true }))
        .catch((error) => toast.error(getErrorMessage(error, 'Could not start the conversation')));
    }
  }, [threadId, location.state, navigate]);

  const loadThread = useCallback((id) => {
    setLoadingMessages(true);
    messageApi
      .thread(id)
      .then((data) => {
        setActiveThread(data.thread);
        setMessages(data.messages ?? []);
        setHasMore(data.hasMore);
        refreshThreads();
      })
      .catch((error) => toast.error(getErrorMessage(error, 'Could not open this conversation')))
      .finally(() => setLoadingMessages(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (threadId) loadThread(threadId);
  }, [threadId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, threadId]);

  // Realtime: join the active thread's room and listen for events.
  useEffect(() => {
    if (!socket || !threadId) return undefined;
    socket.emit('thread:join', threadId);

    const onNewMessage = (message) => {
      if (message.threadId !== threadId) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      setTypingUser(false);
    };
    const onTyping = ({ threadId: tid, isTyping }) => {
      if (tid === threadId) setTypingUser(isTyping);
    };
    const onSeen = ({ threadId: tid }) => {
      if (tid !== threadId) return;
      setMessages((prev) => prev.map((m) => (m.senderId === user?.id ? { ...m, seenByOthers: true } : m)));
    };

    socket.on('message:new', onNewMessage);
    socket.on('thread:typing', onTyping);
    socket.on('thread:seen', onSeen);

    return () => {
      socket.emit('thread:leave', threadId);
      socket.off('message:new', onNewMessage);
      socket.off('thread:typing', onTyping);
      socket.off('thread:seen', onSeen);
    };
  }, [socket, threadId, user?.id]);

  const handleTyping = (value) => {
    setDraft(value);
    if (!socket || !threadId) return;
    socket.emit('thread:typing', { threadId, isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('thread:typing', { threadId, isTyping: false });
    }, 1500);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !threadId) return;
    setSending(true);
    try {
      const { message } = await messageApi.send(threadId, { body: draft.trim() });
      setMessages((prev) => [...prev, message]);
      setDraft('');
      socket?.emit('thread:typing', { threadId, isTyping: false });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Message failed to send'));
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !threadId) return;
    setUploading(true);
    try {
      const { message } = await messageApi.uploadAttachment(threadId, file);
      setMessages((prev) => [...prev, message]);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Attachment upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const { recording, start: startRecording, stop: stopRecording } = useVoiceRecorder(async (file) => {
    if (!threadId) return;
    setUploading(true);
    try {
      const { message } = await messageApi.uploadAttachment(threadId, file);
      setMessages((prev) => [...prev, message]);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Voice note upload failed'));
    } finally {
      setUploading(false);
    }
  });

  const handleLoadOlder = async () => {
    if (!threadId || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const data = await messageApi.thread(threadId, { before: messages[0].createdAt });
      setMessages((prev) => [...(data.messages ?? []), ...prev]);
      setHasMore(data.hasMore);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not load older messages'));
    } finally {
      setLoadingOlder(false);
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
                key={t.id}
                onClick={() => navigate(`/messages/${t.id}`)}
                className={`w-full text-left px-4 py-3 border-b border-ink/5 hover:bg-canopy-50/50 transition ${
                  threadId === t.id ? 'bg-canopy-50' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{t.counterpartyName}</p>
                  {t.unreadCount > 0 && (
                    <span className="w-4.5 h-4.5 min-w-[18px] rounded-full bg-clay-500 text-paper text-[10px] font-bold flex items-center justify-center">
                      {t.unreadCount > 9 ? '9+' : t.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-faint truncate mt-0.5">
                  {t.lastMessage ? `${t.lastMessage.isMine ? 'You: ' : ''}${t.lastMessage.body}` : 'No messages yet'}
                </p>
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
              {typingUser && <p className="text-xs text-canopy-700 mt-0.5">typing…</p>}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {hasMore && (
                <button
                  onClick={handleLoadOlder}
                  disabled={loadingOlder}
                  className="mx-auto flex items-center gap-1 text-xs text-canopy-700 font-medium hover:underline"
                >
                  <ChevronUp className="w-3.5 h-3.5" /> {loadingOlder ? 'Loading…' : 'Load older messages'}
                </button>
              )}
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} isMine={m.senderId === user?.id} />
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} className="p-3 border-t border-ink/10 flex gap-2 items-center">
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || recording}
                className="btn-ghost px-3"
                title="Attach a file or image"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                disabled={uploading}
                className={`btn-ghost px-3 ${recording ? 'text-clay-600' : ''}`}
                title={recording ? 'Stop recording' : 'Record a voice note'}
              >
                {recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input
                value={draft}
                onChange={(e) => handleTyping(e.target.value)}
                placeholder="Type a message…"
                className="input-field"
                disabled={uploading || recording}
              />
              <button type="submit" disabled={sending || uploading} className="btn-primary px-4">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

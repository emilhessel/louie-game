'use client';

import { useRef, useEffect, useState, FormEvent, KeyboardEvent, useCallback } from 'react';
import { ChatMessage } from '@louie/shared';

interface ChatFeedProps {
  messages: ChatMessage[];
  myPlayerId: string;
  onSend: (text: string) => void;
}

export default function ChatFeed({ messages, myPlayerId, onSend }: ChatFeedProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevCountRef = useRef(messages.length);

  // Track unread messages while chat is closed
  useEffect(() => {
    const prev = prevCountRef.current;
    const curr = messages.length;
    if (curr > prev && !isOpen) {
      setUnread(u => u + (curr - prev));
    }
    prevCountRef.current = curr;
  }, [messages.length, isOpen]);

  // Clear unread and scroll to bottom when opened
  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      const el = feedRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [isOpen]);

  // Auto-scroll when new messages arrive while open
  useEffect(() => {
    if (!isOpen) return;
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isOpen]);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.blur();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  const autoResize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 72)}px`;
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  // ── Collapsed: floating pill button ──────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-3 z-30 flex items-center gap-1.5 px-3 py-2 text-sm rounded-full shadow-lg"
        style={{
          background: 'rgba(0,0,0,0.72)',
          border: '1px solid rgba(201,168,76,0.35)',
          backdropFilter: 'blur(4px)',
          color: 'rgba(245,235,210,0.8)',
        }}
        aria-label="Open chat"
      >
        💬
        {unread > 0 && (
          <span
            className="text-xs font-bold rounded-full px-1.5 py-0.5 leading-none"
            style={{ background: 'rgba(201,168,76,0.9)', color: '#1a1a0e' }}
          >
            {unread}
          </span>
        )}
      </button>
    );
  }

  // ── Open: full bottom bar ─────────────────────────────────────────────────
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30"
      style={{
        background: 'rgba(0,0,0,0.72)',
        borderTop: '1px solid rgba(201,168,76,0.35)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Header row with collapse button */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-xs text-cream/40 uppercase tracking-widest">Chat</span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-cream/40 hover:text-cream/80 text-xs px-1"
          aria-label="Collapse chat"
        >
          ▼ Hide
        </button>
      </div>

      {/* Message feed */}
      <div
        ref={feedRef}
        className="px-3 pb-1 overflow-y-auto space-y-0.5"
        style={{ maxHeight: 80 }}
      >
        {messages.length === 0 ? (
          <p className="text-cream/20 text-xs italic">No messages yet</p>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className="text-xs leading-snug">
              <span
                className={`font-semibold mr-1 ${
                  msg.playerId === myPlayerId ? 'text-gold' : 'text-cream/80'
                }`}
              >
                {msg.playerName}
                {msg.isSpectator && (
                  <span className="text-cream/30 font-normal"> (spectator)</span>
                )}
              </span>
              <span className="text-cream/70 whitespace-pre-wrap">{msg.text}</span>
            </div>
          ))
        )}
      </div>

      {/* Input row */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 px-3 pb-3 pt-1">
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => { setText(e.target.value); autoResize(); }}
          onKeyDown={handleKeyDown}
          placeholder="Message… (Shift+Enter for newline)"
          maxLength={200}
          rows={1}
          className="input-felt flex-1 py-1.5 text-sm resize-none overflow-hidden"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="btn-primary px-3 py-1.5 text-sm disabled:opacity-30"
          aria-label="Send"
        >
          Send
        </button>
      </form>
    </div>
  );
}

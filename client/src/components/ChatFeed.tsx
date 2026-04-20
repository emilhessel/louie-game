'use client';

import { useRef, useEffect, useState, FormEvent, KeyboardEvent } from 'react';
import { ChatMessage } from '@louie/shared';

interface ChatFeedProps {
  messages: ChatMessage[];
  myPlayerId: string;
  onSend: (text: string) => void;
}

export default function ChatFeed({ messages, myPlayerId, onSend }: ChatFeedProps) {
  const [text, setText] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll feed to bottom whenever messages change
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    // Blur on mobile so the keyboard dismisses after sending
    inputRef.current?.blur();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30"
      style={{
        background: 'rgba(0,0,0,0.72)',
        borderTop: '1px solid rgba(201,168,76,0.35)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Message feed */}
      <div
        ref={feedRef}
        className="px-3 pt-2 pb-1 overflow-y-auto space-y-0.5"
        style={{ maxHeight: 80 }}
      >
        {messages.length === 0 ? (
          <p className="text-cream/20 text-xs italic">No messages yet</p>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className="text-xs leading-snug">
              <span
                className={`font-semibold mr-1 ${
                  msg.playerId === myPlayerId
                    ? 'text-gold'
                    : 'text-cream/80'
                }`}
              >
                {msg.playerName}
                {msg.isSpectator && (
                  <span className="text-cream/30 font-normal"> (spectator)</span>
                )}
              </span>
              <span className="text-cream/70">{msg.text}</span>
            </div>
          ))
        )}
      </div>

      {/* Input row */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 pb-3 pt-1">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          maxLength={200}
          className="input-felt flex-1 py-1.5 text-sm"
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

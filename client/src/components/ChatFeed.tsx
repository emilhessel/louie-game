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
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#0a150a]/90 backdrop-blur-sm">
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
          className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-cream placeholder-cream/20 focus:outline-none focus:border-gold/40"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="text-gold/70 hover:text-gold disabled:text-cream/20 text-sm px-2 py-1.5 transition-colors"
          aria-label="Send"
        >
          Send
        </button>
      </form>
    </div>
  );
}

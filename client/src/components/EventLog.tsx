'use client';

import { useEffect, useRef } from 'react';
import { GameEvent } from '@louie/shared';

interface EventLogProps {
  events: GameEvent[];
}

const TYPE_COLORS: Record<GameEvent['type'], string> = {
  system: 'text-gray-400',
  join:   'text-emerald-400',
  deal:   'text-blue-300',
  trump:  'text-yellow-300',
  bid:    'text-purple-300',
  play:   'text-orange-300',
  score:  'text-gold',
  error:  'text-red-400',
};

const TYPE_ICONS: Record<GameEvent['type'], string> = {
  system: '·',
  join:   '→',
  deal:   '🂠',
  trump:  '★',
  bid:    '?',
  play:   '♠',
  score:  '✓',
  error:  '!',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function EventLog({ events }: EventLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest event
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  return (
    <div className="panel flex flex-col h-48 md:h-56">
      <div className="px-3 py-2 border-b border-gold-dark/20 flex items-center gap-2">
        <span className="text-gold text-xs font-semibold uppercase tracking-widest">Event Log</span>
        <span className="ml-auto text-xs text-cream/30">{events.length} events</span>
      </div>
      <div className="flex-1 overflow-y-auto scroll-thin px-3 py-2 space-y-0.5">
        {events.length === 0 && (
          <p className="text-cream/30 text-xs italic">No events yet…</p>
        )}
        {events.map((ev) => (
          <div key={ev.id} className="flex items-start gap-2 text-xs leading-relaxed">
            <span className="text-cream/30 shrink-0 font-mono">{formatTime(ev.timestamp)}</span>
            <span className={`shrink-0 w-3 text-center ${TYPE_COLORS[ev.type]}`}>
              {TYPE_ICONS[ev.type]}
            </span>
            <span className={`${TYPE_COLORS[ev.type]} break-words`}>{ev.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

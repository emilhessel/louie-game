'use client';

import { Player } from '@louie/shared';

interface SeatCardProps {
  seatIndex: number;
  player?: Player;
  isDealer: boolean;
  isHost: boolean;
  isYou: boolean;
}

const SUIT_SYMBOLS = ['♠', '♥', '♣', '♦'];

export default function SeatCard({ seatIndex, player, isDealer, isHost, isYou }: SeatCardProps) {
  if (!player) {
    // Empty seat
    return (
      <div className="seat-card flex flex-col items-center justify-center gap-1 p-3 min-w-[100px] min-h-[90px] opacity-50">
        <div className="text-2xl text-cream/20">{SUIT_SYMBOLS[seatIndex % 4]}</div>
        <span className="text-xs text-cream/30 font-medium">Open Seat</span>
        <span className="text-xs text-cream/20">{seatIndex + 1}</span>
      </div>
    );
  }

  return (
    <div
      className={`seat-card occupied flex flex-col items-center gap-1.5 p-3 min-w-[100px] min-h-[90px]
        ${isYou ? 'self animate-fade-in' : 'animate-fade-in'}`}
    >
      {/* Badges row */}
      <div className="flex gap-1 flex-wrap justify-center">
        {isHost && (
          <span className="badge badge-gold">Host</span>
        )}
        {isDealer && (
          <span className="badge badge-green">Dealer</span>
        )}
        {isYou && (
          <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: '#f5f0e8', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.65rem' }}>
            You
          </span>
        )}
      </div>

      {/* Player name */}
      <span
        className="text-sm font-semibold text-cream text-center leading-tight max-w-full truncate px-1"
        title={player.name}
        style={{ fontFamily: 'var(--font-inter)' }}
      >
        {player.name}
      </span>

      {/* Connection status */}
      <div className="flex items-center gap-1 mt-auto">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            player.connected ? 'bg-emerald-400' : 'bg-red-400'
          }`}
        />
        <span className="text-xs text-cream/40">
          {player.connected ? 'connected' : 'offline'}
        </span>
      </div>

      {/* Score */}
      {player.score > 0 && (
        <span className="text-xs text-gold font-mono">{player.score} pts</span>
      )}
    </div>
  );
}

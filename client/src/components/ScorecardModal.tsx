'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientGameState } from '@louie/shared';
import { SUIT_SYMBOL, SUIT_COLOR } from '@/lib/cardUtils';
import { HAND_SIZES } from '@louie/shared';

interface ScorecardModalProps {
  gameState: ClientGameState;
  onClose: () => void;
}

export default function ScorecardModal({ gameState, onClose }: ScorecardModalProps) {
  const { players, scoreHistory, currentRound, round } = gameState;

  return (
    <motion.div
      key="scorecard-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="panel w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gold" style={{ fontFamily: 'var(--font-playfair)' }}>
              Scorecard
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
              <p className="text-xs text-cream/40">tricks/bid = tricks won out of what you bid</p>
              <p className="text-xs text-cream/40">+pts = tricks won, <span className="text-gold">★ +10 bonus</span> for exact bid</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-cream/40 hover:text-cream text-xl leading-none px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto scroll-thin px-5 py-4">
          <table className="w-full text-sm border-collapse min-w-[520px]">
            <thead>
              <tr>
                <th className="text-left text-xs text-cream/40 uppercase tracking-widest pb-3 pr-3 font-normal w-16">Rnd</th>
                <th className="text-left text-xs text-cream/40 uppercase tracking-widest pb-3 pr-3 font-normal w-10">♠</th>
                {players.map(p => (
                  <th key={p.id} className="text-center pb-3 px-2 font-normal min-w-[80px]">
                    <span className="text-xs text-cream/70 truncate block max-w-[80px] mx-auto">
                      {p.name}
                    </span>
                    {p.id === gameState.myPlayerId && (
                      <span className="text-cream/30 text-xs">(you)</span>
                    )}
                    <span className="text-cream/20 text-xs block">tricks/bid</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HAND_SIZES.map((handSize, idx) => {
                const roundNum = idx + 1;
                const isPast = roundNum < currentRound;
                const isCurrent = roundNum === currentRound;
                const isFuture = roundNum > currentRound;

                // Find trump for this round from scoreHistory (we only have current round's trump live)
                const trumpCard = isCurrent ? round?.trump : undefined;
                const trumpColor = trumpCard
                  ? (SUIT_COLOR[trumpCard.suit] === '#1a1a1a' ? '#f5f0e8' : SUIT_COLOR[trumpCard.suit])
                  : undefined;

                return (
                  <tr
                    key={roundNum}
                    className={`border-t border-white/5
                      ${isCurrent ? 'bg-gold/5' : ''}
                      ${isFuture ? 'opacity-30' : ''}
                    `}
                  >
                    {/* Round # */}
                    <td className="py-2 pr-3 text-cream/50 font-mono text-xs">
                      {roundNum}
                      {isCurrent && <span className="text-gold ml-1">◀</span>}
                    </td>

                    {/* Hand size + trump */}
                    <td className="py-2 pr-3">
                      <span className="text-cream/40 font-mono text-xs">{handSize}</span>
                      {trumpCard && (
                        <span className="ml-1 text-xs" style={{ color: trumpColor }}>
                          {SUIT_SYMBOL[trumpCard.suit]}
                        </span>
                      )}
                    </td>

                    {/* Per-player score cells */}
                    {players.map(player => {
                      const entry = scoreHistory[player.id]?.find(e => e.round === roundNum);
                      const hitBid = entry && entry.tricksWon === entry.bid;
                      const isMe = player.id === gameState.myPlayerId;

                      return (
                        <td key={player.id} className="py-2 px-2 text-center">
                          {entry ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className="font-mono text-sm font-semibold"
                                style={{ color: hitBid ? '#fbbf24' : '#f5f0e8' }}
                              >
                                {entry.tricksWon}/{entry.bid}
                                {hitBid && <span className="text-gold ml-0.5">★</span>}
                              </span>
                              <span className={`text-xs font-mono ${isMe ? 'text-cream/60' : 'text-cream/40'}`}>
                                +{entry.roundScore}
                              </span>
                            </div>
                          ) : isCurrent ? (
                            <span className="text-cream/20 text-xs">—</span>
                          ) : (
                            <span className="text-cream/10 text-xs">·</span>
                          )}
                        </td>
                      );
                    })}

                  </tr>
                );
              })}
            </tbody>

            {/* Totals footer */}
            <tfoot>
              <tr className="border-t-2 border-gold/30">
                <td colSpan={2} className="pt-3 pb-1 text-xs text-cream/40 uppercase tracking-widest">
                  Total
                </td>
                {players.map(player => (
                  <td key={player.id} className="pt-3 pb-1 text-center">
                    <span className="text-gold font-bold font-mono text-base">
                      {player.score}
                    </span>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

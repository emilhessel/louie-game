'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrickState } from '@louie/shared';
import { PlayingCard } from './PlayingCard';
import { SUIT_SYMBOL } from '@/lib/cardUtils';

interface LastTrickModalProps {
  trick: TrickState;
  onClose: () => void;
}

export default function LastTrickModal({ trick, onClose }: LastTrickModalProps) {
  return (
    <motion.div
      key="last-trick-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-6 pt-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="panel w-full max-w-md"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-base font-bold text-gold" style={{ fontFamily: 'var(--font-playfair)' }}>
            Last Trick
          </h2>
          <button
            onClick={onClose}
            className="text-cream/40 hover:text-cream text-xl leading-none px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Plays */}
        <div className="px-5 py-4 space-y-3">
          {trick.plays.map(play => {
            const isWinner = play.playerId === trick.winnerId;
            const isLed = play.card.suit === trick.ledSuit && trick.plays[0]?.playerId === play.playerId;

            return (
              <div
                key={play.playerId}
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors
                  ${isWinner ? 'bg-gold/10 border border-gold/30' : 'bg-white/5'}`}
              >
                <PlayingCard card={play.card} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-cream text-sm font-medium truncate">{play.playerName}</p>
                  <p className="text-cream/40 text-xs">
                    {play.card.rank} of {play.card.suit}
                    {isLed && (
                      <span className="ml-2 text-cream/50">
                        led {SUIT_SYMBOL[play.card.suit]}
                      </span>
                    )}
                  </p>
                </div>
                {isWinner && (
                  <span className="text-gold text-sm font-semibold shrink-0">🏆 won</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 pb-4">
          <button onClick={onClose} className="btn-secondary w-full py-2 text-sm">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Suit } from '@louie/shared';
import { SortPrefs, SUIT_SYMBOL, SUIT_COLOR } from '@/lib/cardUtils';

interface SortModalProps {
  prefs: SortPrefs;
  onChange: (prefs: SortPrefs) => void;
  onClose: () => void;
}

export default function SortModal({ prefs, onChange, onClose }: SortModalProps) {
  function moveSuit(index: number, dir: -1 | 1) {
    const newOrder = [...prefs.suitOrder];
    const target = index + dir;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    onChange({ ...prefs, suitOrder: newOrder });
  }

  function toggleRankDir() {
    onChange({
      ...prefs,
      rankDirection: prefs.rankDirection === 'high-to-low' ? 'low-to-high' : 'high-to-low',
    });
  }

  return (
    <motion.div
      key="sort-backdrop"
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
        className="panel w-full max-w-sm"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-base font-bold text-gold" style={{ fontFamily: 'var(--font-playfair)' }}>
            Sort Options
          </h2>
          <button onClick={onClose} className="text-cream/40 hover:text-cream text-xl leading-none px-2 py-1">
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Suit order */}
          <div>
            <p className="text-xs text-cream/40 uppercase tracking-widest mb-3">Suit Order</p>
            <div className="space-y-2">
              {prefs.suitOrder.map((suit, idx) => {
                const color = SUIT_COLOR[suit] === '#1a1a1a' ? '#f5f0e8' : SUIT_COLOR[suit];
                return (
                  <div key={suit} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                    <span className="text-lg w-6 text-center" style={{ color }}>
                      {SUIT_SYMBOL[suit]}
                    </span>
                    <span className="flex-1 text-cream/80 text-sm capitalize">{suit}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveSuit(idx, -1)}
                        disabled={idx === 0}
                        className="w-7 h-7 flex items-center justify-center text-cream/50 hover:text-cream disabled:opacity-20 disabled:cursor-not-allowed text-sm"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveSuit(idx, 1)}
                        disabled={idx === prefs.suitOrder.length - 1}
                        className="w-7 h-7 flex items-center justify-center text-cream/50 hover:text-cream disabled:opacity-20 disabled:cursor-not-allowed text-sm"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rank direction */}
          <div>
            <p className="text-xs text-cream/40 uppercase tracking-widest mb-3">Rank Order (within each suit)</p>
            <button
              onClick={toggleRankDir}
              className="w-full flex items-center justify-between bg-white/5 rounded-lg px-3 py-3 hover:bg-white/10 transition-colors"
            >
              <span className="text-cream/80 text-sm">
                {prefs.rankDirection === 'high-to-low' ? 'A K Q J … 2  (high to low)' : '2 3 4 … A  (low to high)'}
              </span>
              <span className="text-gold text-xs">tap to flip</span>
            </button>
          </div>
        </div>

        <div className="px-5 pb-4">
          <button onClick={onClose} className="btn-primary w-full py-2 text-sm">
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

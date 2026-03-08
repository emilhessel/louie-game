'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ClientGameState } from '@louie/shared';

interface GameOverViewProps {
  gameState: ClientGameState;
}

export default function GameOverView({ gameState }: GameOverViewProps) {
  const router = useRouter();

  const ranked = [...gameState.players].sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  const isMyWin = winner?.id === gameState.myPlayerId;

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  return (
    <div className="felt-bg min-h-screen flex flex-col items-center justify-center py-8 px-4">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold text-gold mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
          ♠ LOUIE ♥
        </h1>
        <p className="text-cream/40 text-xs tracking-widest uppercase">Game Over</p>
      </motion.div>

      {/* Winner callout */}
      {winner && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 280, damping: 24 }}
          className="panel px-8 py-6 text-center border-gold/50 w-full max-w-sm mb-6"
        >
          <div className="text-5xl mb-3">🏆</div>
          <p className="text-cream/50 text-xs uppercase tracking-widest mb-1">Winner</p>
          <p className="text-gold text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair)' }}>
            {winner.name}
          </p>
          <p className="text-cream/60 text-sm mt-1 font-mono">{winner.score} points</p>
          {isMyWin && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-emerald-400 text-sm mt-2 font-medium"
            >
              That's you! Well played.
            </motion.p>
          )}
        </motion.div>
      )}

      {/* Final standings */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="panel px-6 py-5 w-full max-w-sm mb-6"
      >
        <p className="text-xs text-cream/40 uppercase tracking-widest mb-4">Final Standings</p>
        <div className="space-y-3">
          {ranked.map((player, i) => {
            const isMe = player.id === gameState.myPlayerId;
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.07 }}
                className={`flex items-center gap-3 py-1 ${i === 0 ? 'border-b border-gold/20 pb-3 mb-1' : ''}`}
              >
                <span className="text-xl w-7 text-center">{medals[i]}</span>
                <span className={`flex-1 text-sm font-medium ${isMe ? 'text-cream' : 'text-cream/70'}`}>
                  {player.name}
                  {isMe && <span className="text-cream/30 text-xs ml-1">(you)</span>}
                </span>
                <span className={`font-mono font-bold ${i === 0 ? 'text-gold text-lg' : 'text-cream/70'}`}>
                  {player.score}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Back to home */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => router.push('/')}
        className="btn-secondary px-8 py-3"
      >
        ← Back to Home
      </motion.button>

    </div>
  );
}

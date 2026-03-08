'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CreateGameResponse, JoinGameResponse, ApiError, LouieSession } from '@louie/shared';
import { saveSession } from '@/hooks/useGameState';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3001';

type Mode = 'home' | 'create' | 'join';

export default function HomeView() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('home');
  const [name, setName] = useState('');
  const [gameId, setGameId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullGameOffer, setFullGameOffer] = useState<string | null>(null); // gameId if game is full

  function reset() {
    setError(null);
    setFullGameOffer(null);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Enter your Louie Name first.'); return; }
    setLoading(true);
    reset();

    try {
      const res = await fetch(`${SERVER_URL}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name.trim() }),
      });
      const data: CreateGameResponse | ApiError = await res.json();

      if (!data.ok) {
        setError((data as ApiError).error);
        return;
      }

      const { gameId: gId, playerId } = data as CreateGameResponse;
      const session: LouieSession = {
        gameId: gId,
        playerName: name.trim(),
        playerId,
        role: 'player',
      };
      saveSession(session);
      router.push(`/game/${gId}`);
    } catch {
      setError('Could not reach the server. Is it running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: FormEvent, asSpectator = false) {
    e.preventDefault();
    const gId = gameId.trim().toUpperCase();
    if (!name.trim()) { setError('Enter your Louie Name first.'); return; }
    if (!gId) { setError('Enter a Game ID.'); return; }
    setLoading(true);
    reset();

    try {
      const res = await fetch(`${SERVER_URL}/api/games/${gId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name.trim(), asSpectator }),
      });
      const data: JoinGameResponse | ApiError = await res.json();

      if (!data.ok) {
        const errMsg = (data as ApiError).error;
        // If game is full, offer spectator option
        if (errMsg.includes('full') || errMsg.includes('Full')) {
          setFullGameOffer(gId);
        }
        setError(errMsg);
        return;
      }

      const { playerId, role } = data as JoinGameResponse;
      const session: LouieSession = {
        gameId: gId,
        playerName: name.trim(),
        playerId,
        role,
      };
      saveSession(session);
      router.push(`/game/${gId}`);
    } catch {
      setError('Could not reach the server. Is it running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="felt-bg min-h-screen flex flex-col items-center justify-center px-4 py-8">

      {/* Title card */}
      <div className="mb-10 text-center">
        <div className="text-cream/20 text-5xl mb-3 tracking-widest select-none">
          ♠ ♥ ♣ ♦
        </div>
        <h1
          className="text-6xl md:text-7xl font-bold text-gold mb-3 tracking-tight"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          LOUIE
        </h1>
        <p className="text-cream/50 text-sm tracking-[0.3em] uppercase">
          The Trick-Taking Card Game
        </p>
      </div>

      {/* Mode panels */}
      {mode === 'home' && (
        <div className="panel px-8 py-8 w-full max-w-sm text-center space-y-4 animate-fade-in">
          <p className="text-cream/60 text-sm mb-6">
            Play with up to 5 friends. No account needed.
          </p>
          <button
            onClick={() => { setMode('create'); reset(); }}
            className="btn-primary w-full text-base py-3"
          >
            ✦ Create Game
          </button>
          <button
            onClick={() => { setMode('join'); reset(); }}
            className="btn-secondary w-full text-base py-3"
          >
            Join Game
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="panel px-8 py-8 w-full max-w-sm animate-slide-up">
          <button
            onClick={() => { setMode('home'); reset(); }}
            className="text-cream/40 text-sm hover:text-cream/70 mb-4 flex items-center gap-1"
          >
            ← Back
          </button>
          <h2
            className="text-xl font-semibold text-gold mb-6"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Create a New Game
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs text-cream/50 uppercase tracking-widest mb-1.5">
                Your Louie Name
              </label>
              <input
                className="input-felt"
                placeholder="e.g. Captain Tricks"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={20}
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn-primary w-full py-3"
            >
              {loading ? 'Creating…' : '✦ Create Game'}
            </button>
          </form>
        </div>
      )}

      {mode === 'join' && (
        <div className="panel px-8 py-8 w-full max-w-sm animate-slide-up">
          <button
            onClick={() => { setMode('home'); reset(); }}
            className="text-cream/40 text-sm hover:text-cream/70 mb-4 flex items-center gap-1"
          >
            ← Back
          </button>
          <h2
            className="text-xl font-semibold text-gold mb-6"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Join a Game
          </h2>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs text-cream/50 uppercase tracking-widest mb-1.5">
                Game ID
              </label>
              <input
                className="input-felt font-mono tracking-widest uppercase"
                placeholder="e.g. AB3XY9"
                value={gameId}
                onChange={e => setGameId(e.target.value.toUpperCase())}
                maxLength={6}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-cream/50 uppercase tracking-widest mb-1.5">
                Your Louie Name
              </label>
              <input
                className="input-felt"
                placeholder="e.g. Captain Tricks"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={20}
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}

            {/* Offer spectator if game is full */}
            {fullGameOffer && (
              <button
                type="button"
                onClick={e => handleJoin(e as unknown as FormEvent, true)}
                className="btn-secondary w-full py-2 text-sm"
              >
                👁 Join as Spectator Instead
              </button>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim() || !gameId.trim()}
              className="btn-primary w-full py-3"
            >
              {loading ? 'Joining…' : 'Join Game →'}
            </button>
          </form>
        </div>
      )}

      {/* Footer */}
      <p className="mt-10 text-cream/20 text-xs text-center">
        Up to 5 players · 17 rounds · Highest score wins
      </p>
    </div>
  );
}

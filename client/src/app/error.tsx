'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="felt-bg min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="text-cream/20 text-5xl mb-6 select-none">♠ ♥ ♣ ♦</div>
      <h1 className="text-4xl font-bold text-gold mb-3">Oops</h1>
      <p className="text-cream/60 mb-8">Something went wrong.</p>
      <button onClick={reset} className="btn-primary px-6 py-2">
        Try Again
      </button>
    </div>
  );
}

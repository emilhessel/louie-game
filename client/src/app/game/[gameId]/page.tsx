'use client';

import { useParams } from 'next/navigation';
import GamePage from '@/components/GamePage';

export default function GameRoute() {
  const params = useParams();
  const gameId = ((params?.gameId ?? '') as string).toUpperCase();
  return <GamePage gameId={gameId} />;
}

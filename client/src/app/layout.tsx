import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Louie — The Trick-Taking Card Game',
  description: 'A real-time multiplayer version of the classic card game Louie.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="felt-bg min-h-screen">{children}</body>
    </html>
  );
}

import './globals.css';
import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';

const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600', '700'] });

export const metadata: Metadata = {
  title: 'IoT Cyber Security Mesh — Sentinel Core',
  description: 'Real-time IoT threat monitoring, network topology, AI security agents, and automated defense tools.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={mono.className} style={{ background: 'var(--bg)', color: 'var(--text)' }}>{children}</body>
    </html>
  );
}

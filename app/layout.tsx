import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'Sentinel Core — Cybersecurity Topology Mesh',
  description: 'Clean, interactive network topology and cyber security mesh console in light mode.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className={inter.className} style={{ background: '#f8fafc', color: '#0f172a' }}>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Upload and Forget',
  description: 'Upload a beat. Everything else happens on its own.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans min-h-screen flex flex-col">
        <header className="border-b border-border bg-surface px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <Link href="/" className="text-text font-semibold tracking-tight text-sm sm:text-base">
            Upload and Forget
          </Link>
          <Nav />
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </body>
    </html>
  );
}

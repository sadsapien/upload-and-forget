'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/upload', label: 'Upload' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((l) => {
        const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
              active ? 'bg-accent text-text' : 'text-muted hover:text-text hover:bg-surface2'
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

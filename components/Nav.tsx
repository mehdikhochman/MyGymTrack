'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  ['/', 'Accueil'],
  ['/nutrition', 'Nutrition'],
  ['/historique', 'Historique'],
  ['/coach', 'Coach'],
  ['/reglages', 'Réglages'],
];

export default function Nav() {
  const path = usePathname();
  if (path === '/login') return null;
  return (
    <nav className="tabs">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} className={(href === '/' ? path === '/' : path.startsWith(href)) ? 'on' : ''}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

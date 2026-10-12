'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Icon, { type IconName } from './Icon';

const LINKS: [string, string, IconName][] = [
  ['/', 'Accueil', 'home'],
  ['/nutrition', 'Nutrition', 'food'],
  ['/historique', 'Historique', 'history'],
  ['/coach', 'Coach', 'coach'],
  ['/reglages', 'Réglages', 'settings'],
];

// Tabs are fully prefetched (and re-prefetched after every change), so switching is instant.
export default function Nav() {
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    // iOS only applies :active (tap feedback) styles when the page listens to touches.
    const noop = () => {};
    document.addEventListener('touchstart', noop, { passive: true });
    // Back in the app after a pause (phone unlocked): refresh the data and wake the server and database now.
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (Date.now() - hiddenAt > 60_000) router.refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('touchstart', noop);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [router]);

  if (path === '/login') return null;
  return (
    <nav className="tabs">
      {LINKS.map(([href, label, icon]) => (
        <Link key={href} href={href} prefetch className={(href === '/' ? path === '/' : path.startsWith(href)) ? 'on' : ''}>
          <Icon name={icon} />
          {label}
        </Link>
      ))}
    </nav>
  );
}

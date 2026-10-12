'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  ['/', 'Accueil'],
  ['/nutrition', 'Nutrition'],
  ['/historique', 'Historique'],
  ['/coach', 'Coach'],
  ['/reglages', 'Réglages'],
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
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} prefetch className={(href === '/' ? path === '/' : path.startsWith(href)) ? 'on' : ''}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

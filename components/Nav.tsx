'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Icon, { type IconName } from './Icon';
import { deleteSession } from '@/app/actions';
import { unsentDeletes } from '@/lib/instant';

const LINKS: [string, string, IconName][] = [
  ['/', 'Aujourd’hui', 'today'],
  ['/nutrition', 'Nutrition', 'food'],
  ['/seance', 'Séance', 'dumbbell'],
  ['/progres', 'Progrès', 'chart'],
  ['/coach', 'Coach', 'coach'],
];
// Full-screen flows without the tab bar.
const HIDDEN = /^\/(login|inscription|mot-de-passe|bienvenue|seance\/\d)/;

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

  // Sessions deleted on the previous screen: sent now that the navigation is done (see lib/instant).
  useEffect(() => {
    for (const id of unsentDeletes) {
      unsentDeletes.delete(id);
      deleteSession(id).catch(() => alert("La séance n'a pas pu être supprimée."));
    }
  }, [path]);

  if (HIDDEN.test(path)) return null;
  return (
    <nav className="tabs" aria-label="Navigation principale">
      {LINKS.map(([href, label, icon]) => {
        const on = href === '/' ? path === '/' : path.startsWith(href);
        return href === '/seance' ? (
          <Link key={href} href={href} prefetch className={on ? 'fab on' : 'fab'} aria-label="Commencer une séance">
            <span className="circle"><Icon name={icon} size={28} /></span>
            {label}
          </Link>
        ) : (
          <Link key={href} href={href} prefetch className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
            <Icon name={icon} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

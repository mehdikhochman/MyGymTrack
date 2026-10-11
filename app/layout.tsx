import type { Metadata, Viewport } from 'next';
import Nav from '@/components/Nav';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MyGymTrack',
  appleWebApp: { capable: true, title: 'MyGymTrack', statusBarStyle: 'black-translucent' },
};
export const viewport: Viewport = { themeColor: '#111318', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <main>{children}</main>
        <Nav />
      </body>
    </html>
  );
}

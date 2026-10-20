import type { Metadata, Viewport } from 'next';
import { Barlow, Big_Shoulders } from 'next/font/google';
import Nav from '@/components/Nav';
import './globals.css';

// Fonts are downloaded at build time and served by the app itself.
const display = Big_Shoulders({ subsets: ['latin', 'latin-ext'], axes: ['opsz'], variable: '--font-display', adjustFontFallback: false });
const text = Barlow({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], variable: '--font-text' });

export const metadata: Metadata = {
  title: 'MyGymTrack',
  description: 'Entraînement, nutrition et coach IA. Garde ta série.',
  appleWebApp: { capable: true, title: 'MyGymTrack', statusBarStyle: 'default' },
};
export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#EEF0F3' }, { media: '(prefers-color-scheme: dark)', color: '#0F1115' }],
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${text.variable}`}>
      <body>
        <main>{children}</main>
        <Nav />
      </body>
    </html>
  );
}

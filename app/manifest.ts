import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MyGymTrack',
    short_name: 'GymTrack',
    description: 'Entraînement, nutrition et coach IA.',
    lang: 'fr',
    start_url: '/',
    display: 'standalone',
    background_color: '#EEF0F3',
    theme_color: '#EEF0F3',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

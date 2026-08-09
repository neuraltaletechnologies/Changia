import type { MetadataRoute } from 'next';
import icon from '@/images/icon.png';
import maskableIcon from '@/images/icon-maskable.png';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ScrewFast',
    short_name: 'ScrewFast',
    description: 'Top-quality Hardware Tools',
    start_url: '/',
    id: '/',
    display: 'minimal-ui',
    theme_color: '#FFEDD5',
    background_color: '#262626',
    icons: [
      {
        src: icon.src,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: icon.src,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: maskableIcon.src,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: maskableIcon.src,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
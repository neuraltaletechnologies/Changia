import type { Metadata } from 'next';
import ContactSectionSw from '@components/sections/sw/ContactSection_sw';

export const metadata: Metadata = {
  title: 'Wasiliana Nasi',
  description:
    'Una wazo la kampeni au maswali kuhusu jukwaa la Changia? Wasiliana nasi na tupange pamoja uwekaji wako wa ukusanyaji wa mobile money.',
  openGraph: {
    title: 'Wasiliana Nasi | Changia',
    description:
      'Una wazo la kampeni au maswali kuhusu jukwaa la Changia? Wasiliana nasi na tupange pamoja uwekaji wako wa ukusanyaji wa mobile money.',
  },
};

export default function SwahiliContactPage() {
  return <ContactSectionSw />;
}

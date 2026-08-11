import type { Metadata } from 'next';
import ContactSectionSw from '@components/sections/sw/ContactSection_sw';

export const metadata: Metadata = {
  title: 'Wasiliana Nasi',
  description:
    'Una wazo la kampeni au maswali kuhusu jukwaa la Changia? Wasiliana nasi na tupange pamoja uwekaji wako wa ukusanyaji wa All money transfer.',
  openGraph: {
    title: 'Wasiliana Nasi | Changia',
    description:
      'Una wazo la kampeni au maswali kuhusu jukwaa la Changia? Wasiliana nasi na tupange pamoja uwekaji wako wa ukusanyaji wa All money transfer.',
  },
};

export default function SwahiliContactPage() {
  return <ContactSectionSw />;
}

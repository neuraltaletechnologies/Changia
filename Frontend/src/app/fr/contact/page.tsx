import type { Metadata } from 'next';
import ContactSectionFr from '@components/sections/fr/ContactSection_fr';

export const metadata: Metadata = {
  title: 'Nous Contacter',
  description:
    "Vous avez des questions ou souhaitez discuter d'un projet ? Contactez-nous et élaborons ensemble la solution parfaite avec nos outils et services.",
  openGraph: {
    title: 'Nous Contacter | ScrewFast',
    description:
      "Vous avez des questions ou souhaitez discuter d'un projet ? Contactez-nous et élaborons ensemble la solution parfaite avec nos outils et services.",
  },
};

export default function FrenchContactPage() {
  return <ContactSectionFr />;
}

import type { Metadata } from 'next';
import ContactSectionFr from '@components/sections/fr/ContactSection_fr';

export const metadata: Metadata = {
  title: 'Nous Contacter',
  description:
    "Vous avez une idée de campagne ou des questions sur la plateforme Changia ? Contactez-nous et planifions ensemble votre déploiement de collecte mobile money.",
  openGraph: {
    title: 'Nous Contacter | Changia',
    description:
      "Vous avez une idée de campagne ou des questions sur la plateforme Changia ? Contactez-nous et planifions ensemble votre déploiement de collecte mobile money.",
  },
};

export default function FrenchContactPage() {
  return <ContactSectionFr />;
}
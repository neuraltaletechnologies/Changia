import type { Metadata } from 'next';
import ContactSection from '@components/sections/misc/ContactSection';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    "Have a Campaign  idea or questions about the Changia platform? Reach out, and let's plan your mobile-money fundraising rollout.",
  openGraph: {
    title: 'Contact Us | Changia',
    description:
      "Have a Campaign  idea or questions about the Changia platform? Reach out, and let's plan your mobile-money fundraising rollout.",
  },
};

export default function ContactPage() {
  return <ContactSection />;
}
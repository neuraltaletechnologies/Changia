import type { Metadata } from 'next';
import ContactSection from '@components/sections/misc/ContactSection';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    "Have questions or want to discuss a project? Reach out, and let's craft the perfect solution with our tools and services.",
  openGraph: {
    title: 'Contact Us | ScrewFast',
    description:
      "Have questions or want to discuss a project? Reach out, and let's craft the perfect solution with our tools and services.",
  },
};

export default function ContactPage() {
  return <ContactSection />;
}

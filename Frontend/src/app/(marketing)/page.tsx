import HeroSection from '@components/sections/landing/HeroSection';
import AnnouncementBanner from '@components/ui/banners/AnnouncementBanner';
import HeroSectionAlt from '@components/sections/landing/HeroSectionAlt';
import ClientsSection from '@components/sections/landing/ClientsSection';
import FeaturesGeneral from '@components/sections/features/FeaturesGeneral';
import FeaturesNavs from '@components/sections/features/FeaturesNavs';
import TestimonialsSection from '@components/sections/testimonials/TestimonialsSection';
import PricingSection from '@components/sections/pricing/PricingSection';
import FAQ from '@components/sections/misc/FAQ';
import PrimaryCTA from '@/components/ui/buttons/PrimaryCTA';
import heroImage from '@images/hero-image.avif';
import faqs from '@data/faqs.json';
import features from '@data/features.json';
import pricing from '@data/pricing.json';
import featureImage from '@images/features-image.avif';
import construction from '@images/construction-image.avif';
import tools from '@images/automated-tools.avif';
import dashboard from '@images/dashboard-image.avif';
import { partnersData } from '@/data_files/constants';

export const metadata = {
  title: 'Changia',
  description:
    'Help someone. Change a life. Changia brings people together to support medical emergencies, families, education, and community needs — with cash or in kind.',
};

const avatarSrcs: string[] = [
  'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80',
  'https://images.unsplash.com/photo-1531927557220-a9e23c1e4794?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80',
  'https://images.unsplash.com/photo-1541101767792-f9b2b1c4f127?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&&auto=format&fit=facearea&facepad=3&w=300&h=300&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80',
];

export default function HomePage() {
  return (
    <>
      <AnnouncementBanner
        btnId="dismiss-button"
        btnTitle="Explore the Platform"
        url="/campaigns"
        title="Someone needs help today. You can be part of the answer."
      />

      <HeroSection
        title='Connect people<span class="text-yellow-500 dark:text-yellow-400"> in need</span> with those who want <span class="text-yellow-500 dark:text-yellow-400">to help</span>'
        subTitle="Changia connects people who need help — whether it's a medical emergency, education, a family crisis, or a community need — with people who are willing to give. With money, with things, or both."
        primaryBtn="Start a Fundraiser"
        primaryBtnURL="/login?redirect=%2Fdashboard%2FCampaigns%2Fnew"
        secondaryBtn="Explore the Campaigns"
        secondaryBtnURL="/campaigns"
        withReview
        avatars={avatarSrcs}
        rating='<span class="font-bold">TZS 100</span>'
        starCount={4}
        reviews='minimum donation on any Changia Campaign '
        src={heroImage}
        alt="A Changia Campaign  page shown on a smartphone"
      />

      <ClientsSection
        title="Connect people who need help with people who want to give"
        subTitle="Through mobile-money wallets they already trust, supporters give what they can. Campaign organizers coordinate donated items and in-kind help too — all in one place, all for one cause."
        partners={partnersData}
      />

      <FeaturesGeneral
        title="Every contribution — cash or kind — makes a difference"
        subTitle="Whether it's a medical bill, school fees, or food and clothes for a family, Changia makes giving simple. Campaign organizers share a page, supporters give with money or drop off what's needed — and someone's life changes."
        src={featureImage}
        alt="The Changia dashboard on a laptop"
        features={features}
      />

      <FeaturesNavs
        title='The  <span class="text-yellow-500 dark:text-yellow-400">Modules</span>  that turn goodwill into real help.'
        tabs={[
          {
            heading: 'Core Platform & Donor Pool',
            content:
              'A secure, responsive foundation for administrators, managers and donors — with role-based access, dashboards, an audit log and a consent-aware donor CRM.',
            svg: 'tools',
            src: tools,
            alt: 'Changia admin dashboard workspace',
            first: true,
          },
          {
            heading: 'Campaign  Link Distribution',
            content:
              'Create Campaigns, set a required amount or list the items you need, generate a short link and QR code, and distribute approved SMS, WhatsApp or email messages to the donor pool or public channels.',
            svg: 'dashboard',
            src: dashboard,
            alt: 'Changia Campaign  page with progress bar and donation options',
            second: true,
          },
          {
            heading: 'Cash & In-Kind Giving',
            content:
              "Donors can contribute money through a direct payment request they confirm with their own PIN — and campaign managers can equally track donated items, goods and in-kind support, with every verified contribution updating the Campaign exactly once.",
            svg: 'house',
            src: construction,
            alt: 'A field fundraiser confirming a donation request on a phone',
          },
        ]}
      />

      <TestimonialsSection
        title="Real stories of people helping people"
        subTitle="From emergency medical funds to school supply drives, Changia turns goodwill into real help — connecting people who need it with people who care."
        testimonials={[
          {
            content:
              'We ran the Children Surgery Fund with a public target of TZS 10,500,000 — the 10,000,000 purpose amount plus the 5% Changia fee. Every contribution is credited at full face value and donors receive a receipt plus a live progress update. Fundraising that inspires trust.',
            author: 'Dr. Msuya',
            role: 'Initial Launch Partner',
            avatarSrc:
              'https://images.unsplash.com/photo-1593104547489-5cfb3839a3b5?q=80&w=1453&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D8&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
          },
        ]}
        statistics={[
          { count: 'TZS 100', description: 'minimum donation on every Changia Campaign ' },
          { count: '5%', description: 'Campaign -level service fee' },
          { count: '99%', description: 'Campaigns, delivered and payable independently' },
          { count: '10+', description: 'Created Campaigns for a single Manager' },
        ]}
      />

      <PricingSection pricing={pricing} />

      <FAQ title="Frequently<br />asked questions" faqs={faqs} />

      <HeroSectionAlt
        title="Someone needs help today. You can be part of the answer."
        subTitle="Whether it's a medical emergency, a child's education, a family crisis, or a community in need — Changia connects you to people who care. Start a Campaign, share a link, and watch goodwill turn into real help. With money, with things, or both."
      />
    </>
  );
}
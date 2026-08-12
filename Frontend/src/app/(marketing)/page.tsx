import HeroSection from '@components/sections/landing/HeroSection';
import HeroSectionAlt from '@components/sections/landing/HeroSectionAlt';
import ClientsSection from '@components/sections/landing/ClientsSection';
import FeaturesGeneral from '@components/sections/features/FeaturesGeneral';
import FeaturesNavs from '@components/sections/features/FeaturesNavs';
import TestimonialsSection from '@components/sections/testimonials/TestimonialsSection';
import PricingSection from '@components/sections/pricing/PricingSection';
import FAQ from '@components/sections/misc/FAQ';
import AnnouncementBanner from '@components/ui/banners/AnnouncementBanner';
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
    'Changia is a Tanzania-first, fast campaign money digital fundraising platform. Create a Campaign , share a link, and collect mobile-money contributions with less friction.',
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
        title="We're building a Tanzania-first, fast campaign money fundraising platform."
      />

      <HeroSection
        title='Collect money contributions with <span class="text-yellow-500 dark:text-yellow-400">less friction</span>'
        subTitle="Changia is a Tanzania-first, fast campaign money fundraising platform. Campaign  owners create a clear Campaign  page, share a link, and turn a donor's willingness to help into a completed payment."
        primaryBtn="Start a Campaign "
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
        title="Works with the All money transfer your donors already use"
        subTitle="Donors give from any smartphone and confirm with their own PIN in the gateway prompt they trust."
        partners={partnersData}
      />

      <FeaturesGeneral
        title="A Simpler Way to Give"
        subTitle="Fundraising often loses donors between intention and payment. Changia reduces that friction with clear Campaign  pages, shareable links and a direct payment request."
        src={featureImage}
        alt="The Changia dashboard on a laptop"
        features={features}
      />

      <FeaturesNavs
        title='The  <span class="text-yellow-500 dark:text-yellow-400">Modules</span>  that take Campaigns from idea to completed payment.'
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
              'Create Campaigns, set a required amount, generate a short link and QR code, and distribute approved SMS, WhatsApp or email messages to the donor pool or public channels.',
            svg: 'dashboard',
            src: dashboard,
            alt: 'Changia Campaign  page with progress bar and donation options',
            second: true,
          },
          {
            heading: 'Instant Push Donation',
            content:
              "A Campaign  manager who has obtained a donor's agreement sends a direct payment request. The donor confirms with their PIN and the verified callback updates the Campaign  exactly once.",
            svg: 'house',
            src: construction,
            alt: 'A field fundraiser confirming a donation request on a phone',
          },
        ]}
      />

      <TestimonialsSection
        title="Convert willingness into completed payments"
        subTitle="From radio, SMS and WhatsApp at scale to face-to-face manager-led giving, Changia bridges the gap between intention and contribution."
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
        title="Let's Raise Together"
        subTitle="Changia is designed for Tanzania: useful for our first organization today, and adaptable to hospitals, churches, schools, NGOs, community groups and individuals tomorrow."
      />
    </>
  );
}
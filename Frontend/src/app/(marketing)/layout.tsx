import Navbar from '@/components/sections/navbar&footer/Navbar';
import FooterSection from '@/components/sections/navbar&footer/FooterSection';
import SiteProvider from '@/components/SiteProvider';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SiteProvider>
      <div className="flex min-h-screen flex-col bg-neutral-200 selection:bg-yellow-400 selection:text-neutral-700 dark:bg-neutral-800">
        <div className="mx-auto w-full max-w-(--breakpoint-2xl) grow px-4 sm:px-6 lg:px-8">
          <Navbar />
          <main>{children}</main>
        </div>
        <FooterSection />
      </div>
    </SiteProvider>
  );
}

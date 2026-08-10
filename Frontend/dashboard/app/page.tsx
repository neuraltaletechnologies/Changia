"use client";

import Link from "next/link";
import { LandingNavbar, LandingFooter } from "@/components/layout/landing-nav";
import { Button } from "@/components/ui/button";
import {
  HeartHandshake,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Send,
  Zap,
  CheckCircle2,
  Users,
  Building2,
  PhoneCall,
} from "lucide-react";
import { motion } from "motion/react";
import { campaigns, formatTZS } from "@/lib/mock-data";

export default function LandingPage() {
  const activeCampaigns = campaigns.filter((c) => c.status === "active");

  // Framer Motion presets
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground antialiased selection:bg-primary/30">
      <LandingNavbar />

      <main className="flex-grow pt-24">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-32">
          {/* Background Gradients */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl -z-10" />
          <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-sky-400/5 rounded-full blur-3xl -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Copy */}
              <div className="lg:col-span-7 space-y-6 text-left">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold"
                >
                  <SparkleIcon className="w-3.5 h-3.5" />
                  Tanzania-First Mobile Money Fundraising
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-foreground"
                >
                  Convert Generosity into{" "}
                  <span className="bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent">
                    Instant Contributions
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-lg text-muted-foreground max-w-xl leading-relaxed"
                >
                  Changia removes payment friction. Share custom campaign links via
                  SMS, WhatsApp or Email and receive mobile money donations directly.
                  No complicated codes, just a simple PIN request on the donor's phone.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="flex flex-wrap gap-4 pt-2"
                >
                  <Button asChild size="lg" className="shadow-lg shadow-primary/25 h-12 px-6">
                    <Link href="/dashboard" className="flex items-center gap-2">
                      Start Your Campaign
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-12 px-6">
                    <a href="#campaigns">Explore Campaigns</a>
                  </Button>
                </motion.div>
              </div>

              {/* Right Column: Visual Mockup */}
              <div className="lg:col-span-5 flex justify-center">
                <motion.div
                  initial={{ opacity: 0, y: 30, rotate: 1 }}
                  animate={{ opacity: 1, y: 0, rotate: -1 }}
                  transition={{ type: "spring", stiffness: 100, delay: 0.3 }}
                  className="relative w-full max-w-[340px] aspect-[9/18] bg-slate-950 rounded-[45px] p-3 shadow-2xl border-[6px] border-slate-800/80"
                >
                  {/* Speaker & Camera Notch */}
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-950 rounded-full flex items-center justify-center gap-1.5 z-20">
                    <div className="w-10 h-1 bg-slate-800 rounded-full" />
                    <div className="w-2.5 h-2.5 bg-slate-900 rounded-full border border-slate-800" />
                  </div>

                  {/* Phone screen content */}
                  <div className="w-full h-full rounded-[38px] bg-slate-900 overflow-hidden relative flex flex-col p-4 pt-10 text-white font-sans text-xs">
                    {/* Simulated App Header */}
                    <div className="flex justify-between items-center px-2 py-1.5 text-[10px] text-zinc-400">
                      <span>Changia Pay</span>
                      <span>17:30</span>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 px-2">
                      <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shadow-inner">
                        <HeartHandshake className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-zinc-200 text-sm">
                          Changia Foundation
                        </h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Dodoma Water Campaign
                        </p>
                      </div>

                      {/* Payment Card */}
                      <div className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-2xl p-3.5 space-y-2 text-left">
                        <div className="flex justify-between text-zinc-400 text-[10px]">
                          <span>DONATION AMOUNT</span>
                          <span className="text-primary font-semibold">TZS</span>
                        </div>
                        <div className="text-xl font-bold text-white tracking-tight">
                          TZS 25,000
                        </div>
                        <div className="border-t border-zinc-700/60 my-2 pt-2 flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[#e60000] flex items-center justify-center text-[8px] font-bold">
                            V
                          </div>
                          <div>
                            <p className="text-[9px] text-zinc-300 font-medium">
                              Vodacom M-Pesa
                            </p>
                            <p className="text-[8px] text-zinc-400">+255 769 ••• 567</p>
                          </div>
                        </div>
                      </div>

                      {/* Push Alert Notification overlay */}
                      <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 1.2, type: "spring" }}
                        className="w-full bg-zinc-950/95 border border-primary/40 rounded-xl p-3 shadow-xl text-left space-y-2 z-10"
                      >
                        <div className="flex items-center gap-1.5 text-[9px] text-primary font-semibold">
                          <Zap className="w-3 h-3 text-primary animate-pulse" />
                          M-PESA TRANSACTION
                        </div>
                        <p className="text-[10px] text-zinc-200 leading-snug">
                          Enter PIN to confirm contribution of TZS 25,000 to Changia
                          Foundation.
                        </p>
                        <div className="flex gap-2 pt-1 text-[9px]">
                          <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-400 cursor-pointer">
                            Cancel
                          </span>
                          <span className="px-3.5 py-0.5 bg-primary rounded text-white font-medium shadow-sm cursor-pointer ml-auto">
                            Confirm
                          </span>
                        </div>
                      </motion.div>
                    </div>

                    {/* Home Indicator */}
                    <div className="w-24 h-1 bg-zinc-700 rounded-full mx-auto mt-auto mb-1.5" />
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Strip */}
        <section className="bg-card border-y border-border py-12 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center divide-x-0 sm:divide-x divide-border">
              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-bold text-primary tracking-tight">
                  TZS 78.2M+
                </p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Total Funds Raised
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                  650+
                </p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Everyday Donors
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                  98.6%
                </p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Payment Success Rate
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                  4 Active
                </p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Fundraising Campaigns
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Features / How It Works */}
        <section className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Simple. Transparent. Auditable.
            </h2>
            <p className="text-muted-foreground">
              Built specifically for Tanzania. Changia replaces manual USSD and billing code
              entries with a seamless digital platform.
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {/* Feature 1 */}
            <motion.div
              variants={fadeInUp}
              className="bg-card border border-border p-6 rounded-2xl space-y-4 hover:border-primary/50 transition-colors shadow-sm text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Send className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-foreground">
                Campaign Link Distribution
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Create a campaign, set a required goal and automatically share a short, feature-phone-friendly link via SMS, WhatsApp, or Email.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              variants={fadeInUp}
              className="bg-card border border-border p-6 rounded-2xl space-y-4 hover:border-primary/50 transition-colors shadow-sm text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-foreground">
                Instant Push Donations
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Empower your field fundraisers. A manager inputs a donor's number and amount, prompting a secure PIN screen directly on the donor's mobile screen.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              variants={fadeInUp}
              className="bg-card border border-border p-6 rounded-2xl space-y-4 hover:border-primary/50 transition-colors shadow-sm text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-foreground">
                Integrated Donor CRM
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Maintain an auditable donor pool directory. Normalise mobile numbers, record consents, tag donors, and track detailed contribution history.
              </p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div
              variants={fadeInUp}
              className="bg-card border border-border p-6 rounded-2xl space-y-4 hover:border-primary/50 transition-colors shadow-sm text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-foreground">
                Strict Security Safeguards
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Changia never sees or stores a mobile money PIN. Immutable audit trails record manager events to ensure zero leakage.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* Active Campaigns List */}
        <section id="campaigns" className="py-20 bg-muted/30 border-y border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div className="space-y-2 text-left">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Ongoing Campaigns
                </h2>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Support active community, educational, and healthcare fundraisers directly using local mobile money channels.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/dashboard" className="flex items-center gap-1.5 text-xs font-semibold">
                  Manage Campaigns
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCampaigns.map((c) => {
                const percent = Math.min(Math.round((c.raised / c.goal) * 100), 100);
                return (
                  <motion.div
                    key={c.id}
                    className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow flex flex-col text-left"
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Placeholder image representation */}
                    <div className="h-44 bg-gradient-to-br from-primary/10 to-sky-500/10 flex items-center justify-center relative border-b border-border">
                      <HeartHandshake className="w-12 h-12 text-primary/40" />
                      <div className="absolute top-4 right-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Active
                      </div>
                    </div>

                    <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <h3 className="font-semibold text-lg text-foreground leading-snug">
                          {c.name}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          Help us make a difference by funding essential resources. Every shilling goes directly to community leaders.
                        </p>
                      </div>

                      <div className="space-y-3 pt-2">
                        {/* Progress */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-muted-foreground">{percent}% Funded</span>
                            <span className="text-foreground">{formatTZS(c.raised)}</span>
                          </div>
                          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                            <span>Goal: {formatTZS(c.goal)}</span>
                            <span>{c.donors} donors</span>
                          </div>
                        </div>

                        <Button asChild className="w-full mt-2" variant="secondary">
                          <Link href={`/c/${c.id}`} className="flex items-center justify-center gap-1.5">
                            Donate Now
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 lg:py-28 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <SparkleIcon className="w-6 h-6" />
          </div>
          <blockquote className="space-y-4">
            <p className="text-xl sm:text-2xl font-medium text-foreground leading-relaxed italic">
              &ldquo;Changia has revolutionized how we raise funds for medical operations. Before, donors lost momentum manually entering business paybill numbers. Now, they click a link, enter their number, and input their PIN. The success rate has doubled.&rdquo;
            </p>
            <cite className="block not-italic">
              <span className="font-semibold text-foreground text-sm block">
                Dr. Msuya
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">
                Initial Launch Partner & Chief Medical Officer
              </span>
            </cite>
          </blockquote>
        </section>

        {/* CTA section */}
        <section className="py-16 sm:py-24 bg-gradient-to-r from-primary to-sky-600 text-white relative overflow-hidden">
          {/* Subtle decoration */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3" />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Ready to Secure and Streamline Your Fundraising?
            </h2>
            <p className="text-white/80 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
              Join Dr. Msuya and start creating campaigns, distribution lists, and instant payment push requests for your organization.
            </p>
            <div className="flex flex-wrap gap-4 justify-center pt-2">
              <Button asChild size="lg" variant="secondary" className="h-12 px-6 font-semibold">
                <Link href="/dashboard" className="flex items-center gap-1.5">
                  Launch Platform App
                  <ArrowRight className="w-4 h-4 text-primary" />
                </Link>
              </Button>
              <Button asChild size="lg" className="h-12 px-6 border-white/20 hover:bg-white/10 hover:text-white" variant="outline">
                <Link href="/contact">Speak to Sales</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

function SparkleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z" />
    </svg>
  );
}

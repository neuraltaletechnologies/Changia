"use client";

import { LandingNavbar, LandingFooter } from "@/components/layout/landing-nav";
import { HeartHandshake, Eye, ShieldCheck, Heart } from "lucide-react";
import { motion } from "motion/react";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground antialiased">
      <LandingNavbar />

      <main className="flex-grow pt-24 pb-16">
        {/* Banner */}
        <section className="relative overflow-hidden py-16 sm:py-24 bg-card border-b border-border">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl -z-10" />
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
            >
              Our Mission at Changia
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-base sm:text-lg text-muted-foreground leading-relaxed"
            >
              Removing friction from charity. Helping everyday donors support local causes and foundations directly through local mobile money transactions.
            </motion.p>
          </div>
        </section>

        {/* Our Story */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
          <div className="space-y-6 text-left">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">The Changia Story</h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              In Tanzania, millions of people contribute small sums daily to fund medical procedures, community infrastructure, school bursaries, and micro-loans. However, traditional payment menus are riddled with friction. Donors must manually remember business numbers, account details, and navigate complex USSD menus. This friction results in high drop-off rates between a donor's intention to give and the final transaction.
            </p>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Changia was built to bridge this gap. Partnering with Dr. Msuya to launch our first campaign, we engineered a secure, mobile-money-first payment gateway trigger. Through a single link or direct push request, donors receive a secure approval screen directly on their phone screen to enter their operator PIN.
            </p>
          </div>

          {/* Pillars Grid */}
          <div className="grid md:grid-cols-3 gap-6 pt-6">
            <div className="border border-border p-6 rounded-2xl bg-card text-left space-y-3 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm">Donor First</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We optimize every path for the donor. Whether browsing on a smartphone or receiving an SMS, the donation flow is fast, simple, and clean.
              </p>
            </div>

            <div className="border border-border p-6 rounded-2xl bg-card text-left space-y-3 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm">Full Transparency</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configurable campaign service fees are disclosed up front, keeping calculations transparent and audit logs clean and immutable.
              </p>
            </div>

            <div className="border border-border p-6 rounded-2xl bg-card text-left space-y-3 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm">PIN Security</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Changia never sees, requests, or stores a mobile money PIN. Authentication is handled strictly by the operator or gateway prompt.
              </p>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

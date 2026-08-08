"use client";

import { LandingNavbar, LandingFooter } from "@/components/layout/landing-nav";
import { FileText, Award, Scale } from "lucide-react";
import { motion } from "motion/react";

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground antialiased">
      <LandingNavbar />

      <main className="flex-grow pt-24 pb-16">
        {/* Banner */}
        <section className="relative overflow-hidden py-16 bg-card border-b border-border text-left">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">
              Last updated: August 8, 2026
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              1. Platform Usage
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By accessing or using Changia, you agree to comply with and be bound by these Terms of Service. Changia provides a digital collection routing interface and donor management CRM. We route payments to integrated telecom operator nodes and do not hold funds directly.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">2. Campaign and Donor Rules</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Campaign owners and fundraisers using the manager app must adhere to these policies:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Manager Push requests require verbal consent from the donor. Sending unauthorized requests is strictly prohibited.</li>
              <li>Promotional communications may only be sent to contacts listed as "Consented" inside the Donor Pool.</li>
              <li>Campaign goals and service fees must be clearly and transparently disclosed on public pages.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">3. Platform Fees and Settlements</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Changia uses a campaign-level service fee model:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Platform service fees (e.g. 5%) are added directly to the campaign collection goal, rather than deducted from individual donor sums.</li>
              <li>Settlements and payouts are subject to gateway reconciliation and telecom clearance.</li>
              <li>All transaction audits are permanent and immutable.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">4. Compliance and Legal</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Users must comply with all local regulations under the Bank of Tanzania (BoT) payment system guidelines and the Cybercrimes Act of Tanzania. Fraudulent activity, money laundering, or attempt to siphon funds will lead to immediate account suspension and referral to authorities.
            </p>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

"use client";

import { LandingNavbar, LandingFooter } from "@/components/layout/landing-nav";
import { ShieldAlert, Lock, Eye, FileText } from "lucide-react";
import { motion } from "motion/react";

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground antialiased">
      <LandingNavbar />

      <main className="flex-grow pt-24 pb-16">
        {/* Banner */}
        <section className="relative overflow-hidden py-16 bg-card border-b border-border text-left">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">
              Last updated: August 8, 2026
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">1. Introduction</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Changia ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard donor and manager information when you use the Changia platform and public Campaign  pages.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">2. Data We Collect</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We collect minimal information necessary to process contributions and manage Campaigns:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Donor Phone Number: Required to route the All money transfer transaction via the payment gateway.</li>
              <li>Donor Name and Email (Optional): Captured only if provided voluntarily for receipting and updates.</li>
              <li>Consent Records: We maintain whether donors have explicitly opted in or out of promotional communications.</li>
              <li>Reconciliation Data: Unique transaction numbers, dates, and amounts for immutable audits.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">3.  All money transfer PIN Safeguard</h2>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-xl flex gap-3 text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Critical Security Rule</h4>
                <p className="text-xs leading-relaxed mt-1">
                  Changia NEVER stores, sees, or asks for your All money transfer PIN. The PIN is entered exclusively within the operator-controlled approval prompt. We will never send you messages asking for your PIN.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">4. How We Use Information</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Data collected is used to:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Process payments and trigger mobile network callbacks.</li>
              <li>Verify Campaign  balances and render fundraising totals.</li>
              <li>Send digital transaction receipts and progress updates.</li>
              <li>Maintain administrative and manager action audit logs to prevent fraud.</li>
            </ul>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

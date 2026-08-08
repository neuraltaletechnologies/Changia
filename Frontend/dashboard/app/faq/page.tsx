"use client";

import { LandingNavbar, LandingFooter } from "@/components/layout/landing-nav";
import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is Changia?",
    answer: "Changia is a digital fundraising platform designed specifically for Tanzania, optimized to collect small contributions via mobile money with zero payment friction. It enables organizations to share direct donation links and send push payment requests directly to donors' phones.",
  },
  {
    question: "How do donors make a contribution?",
    answer: "Donors can click a campaign link or receive a direct push payment request from a campaign manager. They select their mobile operator (M-Pesa, Tigo Pesa, Airtel Money, or Halopesa), input their phone number, and confirm the transaction by entering their PIN in their operator's secure approval popup.",
  },
  {
    question: "Does Changia store, see, or ask for my mobile money PIN?",
    answer: "No. Changia never stores, sees, or asks for your mobile money PIN. The PIN is entered only in the operator or payment gateway-controlled prompt. Your financial credentials are 100% secure.",
  },
  {
    question: "What are the platform service fees?",
    answer: "Changia does not deduct fees from individual donations. Instead, we add a configurable service fee (e.g. 5%) to the campaign's overall collection target when created. This ensures donations are shown and credited at their full face value, keeping progress tracking transparent.",
  },
  {
    question: "Which mobile networks are supported in Tanzania?",
    answer: "We support all major Tanzanian mobile money providers: Vodacom M-Pesa, Tigo Pesa, Airtel Money, and Halopesa. Payouts can be settled directly to your organization's bank account or authorized mobile money merchant account.",
  },
  {
    question: "How do instant push donations work for field fundraisers?",
    answer: "A campaign manager speaks with a potential donor in the field. Upon verbal agreement, the manager enters the donor's phone number and the agreed contribution amount. This triggers an instant payment prompt on the donor's handset, requiring only their PIN to complete.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    if (openIndex === index) {
      setOpenIndex(null);
    } else {
      setOpenIndex(index);
    }
  };

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
              Frequently Asked Questions
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-base sm:text-lg text-muted-foreground leading-relaxed"
            >
              Have questions about security, transaction limits, or operator compatibility? Learn how Changia works.
            </motion.p>
          </div>
        </section>

        {/* FAQs Accordion */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={index}
                  className="bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-all"
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left font-medium text-sm sm:text-base hover:bg-muted/40 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <HelpCircle className="w-5 h-5 text-primary shrink-0" />
                      {faq.question}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/50 text-left">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

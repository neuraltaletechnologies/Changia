"use client";

import { LandingNavbar, LandingFooter } from "@/components/layout/landing-nav";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Send, MessageSquare } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";

export default function ContactPage() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setFormSubmitted(true);
    }, 1200);
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
              Get in Touch
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-base sm:text-lg text-muted-foreground leading-relaxed"
            >
              Have questions about platform integration, setup fees, or our roadmap? Contact the Changia support user.
            </motion.p>
          </div>
        </section>

        {/* Contact Form and Details Grid */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-12 gap-12 items-start text-left">
            {/* Details (4 cols) */}
            <div className="md:col-span-5 space-y-8">
              <div className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Contact Info</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We are here to support hospitals, NGOs, community programs, and individual Campaign  managers.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Email Support</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">support@changia.tz</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Phone Hotline</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">+255 769 234 567</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Headquarters</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Changia Foundation TZ,<br />Dar es Salaam, Tanzania
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form (7 cols) */}
            <div className="md:col-span-7 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
              {formSubmitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircleIcon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground">Message Sent Successfully!</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Thank you for reaching out. A member of our support user will get back to you at your email address within 24 hours.
                  </p>
                  <Button variant="outline" onClick={() => setFormSubmitted(false)} className="mt-4">
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-2 mb-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Send a Message
                  </h3>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                      <input
                        type="email"
                        required
                        className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Subject</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                      placeholder="Integration query, setup, fees etc."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Message</label>
                    <textarea
                      required
                      rows={5}
                      className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                      placeholder="Write your query details here..."
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full h-11 shadow-sm mt-2">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Send Message
                        <Send className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { LandingNavbar, LandingFooter } from "@/components/layout/landing-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  HeartHandshake,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Send,
  Zap,
  CheckCircle2,
  Users,
  Smartphone,
  Share2,
  FileCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { campaigns, recentDonations, formatTZS, formatTZSFull } from "@/lib/mock-data";

interface PublicCampaignPageProps {
  params: Promise<{ id: string }>;
}

export default function PublicCampaignPage({ params }: PublicCampaignPageProps) {
  const resolvedParams = use(params);
  const campaignId = resolvedParams.id;

  // Find the campaign
  const initialCampaign = campaigns.find((c) => c.id === campaignId) || campaigns[0];

  // State to simulate dynamic database updates in local storage / memory
  const [campaign, setCampaign] = useState(initialCampaign);
  const [donationsList, setDonationsList] = useState(recentDonations.filter(d => d.campaign === initialCampaign.name));
  
  const [amount, setAmount] = useState<number>(10000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [network, setNetwork] = useState<string>("mpesa");
  
  const [step, setStep] = useState<"form" | "prompt" | "success">("form");
  const [pin, setPin] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState("");

  const percent = Math.min(Math.round((campaign.raised / campaign.goal) * 100), 100);

  const handlePresetSelect = (val: number) => {
    setAmount(val);
    setCustomAmount("");
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    const parsed = parseInt(e.target.value);
    if (!isNaN(parsed)) {
      setAmount(parsed);
    } else {
      setAmount(0);
    }
  };

  const triggerPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("prompt");
    }, 1000);
  };

  const confirmPIN = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      // Simulate successful payment callback
      const newRaised = campaign.raised + amount;
      const newDonorsCount = campaign.donors + 1;
      const newCampaign = { ...campaign, raised: newRaised, donors: newDonorsCount };
      
      const newReceipt = `CHG-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      
      const mockNewDonation = {
        id: `don_new_${Math.random()}`,
        donorId: "new_donor",
        donorName: name.trim() || "Anonymous Donor",
        amount: amount,
        campaign: campaign.name,
        channel: "whatsapp" as any,
        date: new Date().toISOString().split("T")[0],
        status: "completed" as any,
      };

      setCampaign(newCampaign);
      setDonationsList([mockNewDonation, ...donationsList]);
      setReceiptNumber(newReceipt);
      setLoading(false);
      setStep("success");
    }, 1500);
  };

  // Details for platform fee transparency
  // 5% platform fee calculation
  const purposeAmount = Math.round(campaign.goal * 0.95);
  const platformFee = campaign.goal - purposeAmount;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground antialiased text-left">
      <LandingNavbar />

      <main className="flex-grow pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Campaign Story & Details (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Campaign Meta */}
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider">
                  Active Fundraiser
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {campaign.name}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every shilling raised helps support the initiative directly. This fundraiser is managed by verified administrators and launch partners.
                </p>
              </div>

              {/* Progress Bar Card */}
              <Card className="p-5 border-border shadow-sm space-y-4">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="text-2xl font-bold tracking-tight text-primary">
                      {formatTZSFull(campaign.raised)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1.5">
                      raised of {formatTZS(campaign.goal)} goal
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {percent}% Complete
                  </span>
                </div>

                <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 pt-1 divide-x divide-border">
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground">Donors</p>
                    <p className="text-sm font-semibold text-foreground">{campaign.donors}</p>
                  </div>
                  <div className="text-left pl-4">
                    <p className="text-xs text-muted-foreground">Target Remaining</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatTZS(Math.max(0, campaign.goal - campaign.raised))}
                    </p>
                  </div>
                  <div className="text-left pl-4">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">
                      Active
                    </p>
                  </div>
                </div>
              </Card>

              {/* About the Cause */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-foreground">About the Fundraiser</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This campaign collects small mobile money contributions from our donor pool and public networks to support the primary requirements. As agreed under the digital platform directives, all funds are sent directly to the verified project coordinators under transparent, auditable ledger controls.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Donations made through this page route directly to Vodacom M-Pesa, Tigo Pesa, Airtel Money, or Halopesa. A progress notification message is generated for you upon verification.
                </p>
              </div>

              {/* Recent Donations List */}
              <div className="space-y-4 pt-2">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Recent Contributions
                </h3>
                <div className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden">
                  {donationsList.slice(0, 4).map((d) => (
                    <div key={d.id} className="p-4 flex justify-between items-center gap-4 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                          {d.donorName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{d.donorName}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Simulated transaction • {d.date}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-foreground">+{formatTZS(d.amount)}</span>
                    </div>
                  ))}
                  {donationsList.length === 0 && (
                    <p className="text-xs text-muted-foreground p-4 text-center">No donations logged yet. Be the first!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Interactive Mobile Money Payment Module (5 cols) */}
            <div className="lg:col-span-5 sticky top-24">
              <Card className="border-border shadow-md overflow-hidden bg-card">
                {/* Header info */}
                <div className="bg-primary p-5 text-white flex justify-between items-center">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-white/80 font-semibold uppercase tracking-wider">
                      Mobile Money Payment
                    </p>
                    <p className="text-sm font-bold">Secure Gateway Interface</p>
                  </div>
                  <Smartphone className="w-5 h-5 opacity-90" />
                </div>

                <div className="p-6">
                  <AnimatePresence mode="wait">
                    {/* Step 1: Form */}
                    {step === "form" && (
                      <motion.form
                        key="form"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onSubmit={triggerPayment}
                        className="space-y-4 text-left"
                      >
                        {/* Amount selector */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground">
                            Select Donation Amount (TZS)
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {[5000, 10000, 20000, 50000].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handlePresetSelect(val)}
                                className={`py-2 px-1 text-xs font-bold rounded-lg border transition-colors ${
                                  amount === val && !customAmount
                                    ? "bg-primary text-white border-primary"
                                    : "border-border hover:bg-muted text-muted-foreground"
                                }`}
                              >
                                {formatTZS(val).replace("TZS ", "")}
                              </button>
                            ))}
                          </div>
                          
                          {/* Custom Amount input */}
                          <div className="relative mt-2">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                              TZS
                            </span>
                            <input
                              type="number"
                              className="w-full bg-background border border-border rounded-lg pl-12 pr-3.5 py-2 text-sm focus:outline-none focus:border-primary transition-colors font-semibold"
                              placeholder="Enter custom amount"
                              value={customAmount}
                              onChange={handleCustomChange}
                              min={1000}
                            />
                          </div>
                        </div>

                        {/* Network Provider Selector */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground">
                            Mobile Money Operator
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: "mpesa", label: "M-Pesa", color: "border-red-500/30 hover:bg-red-50/10" },
                              { id: "tigopesa", label: "Tigo Pesa", color: "border-blue-500/30 hover:bg-blue-50/10" },
                              { id: "airtel", label: "Airtel Money", color: "border-red-600/30 hover:bg-red-50/10" },
                              { id: "halopesa", label: "Halopesa", color: "border-orange-500/30 hover:bg-orange-50/10" },
                            ].map((net) => (
                              <button
                                key={net.id}
                                type="button"
                                onClick={() => setNetwork(net.id)}
                                className={`p-2.5 rounded-lg border text-xs font-semibold transition-colors flex items-center justify-between ${
                                  network === net.id
                                    ? "border-primary bg-primary/10 text-primary"
                                    : `border-border ${net.color} text-muted-foreground`
                                }`}
                              >
                                {net.label}
                                <div
                                  className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
                                    network === net.id ? "border-primary bg-primary" : "border-border"
                                  }`}
                                >
                                  {network === net.id && (
                                    <div className="w-1 h-1 rounded-full bg-white" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Phone input */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">
                            Donor Mobile Number (For Push Request)
                          </label>
                          <input
                            type="tel"
                            required
                            className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-primary transition-colors font-mono"
                            placeholder="+255 769 234 567"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>

                        {/* Name input */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">
                            Your Name (Optional)
                          </label>
                          <input
                            type="text"
                            className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                            placeholder="Leave empty to donate anonymously"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </div>

                        <Button type="submit" disabled={loading || amount <= 0} className="w-full h-11 shadow-sm mt-3">
                          {loading ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Contacting Gateway...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              Contribute {formatTZS(amount)}
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          )}
                        </Button>
                      </motion.form>
                    )}

                    {/* Step 2: Prompt Simulation */}
                    {step === "prompt" && (
                      <motion.form
                        key="prompt"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onSubmit={confirmPIN}
                        className="space-y-5 text-left py-4"
                      >
                        <div className="bg-slate-950 text-white rounded-xl p-4 space-y-3 font-mono shadow-inner border border-zinc-800">
                          <div className="flex items-center gap-1.5 text-[10px] text-primary font-bold">
                            <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
                            NETWORK PUSH REQUEST
                          </div>
                          
                          <p className="text-xs text-zinc-300 leading-relaxed">
                            Enter your mobile money PIN to authorize a contribution of{" "}
                            <span className="text-white font-bold">{formatTZSFull(amount)}</span> to{" "}
                            <span className="text-white font-bold">Changia Foundation</span>.
                          </p>

                          <div className="space-y-2 pt-2">
                            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                              Enter PIN (Mock Authorization)
                            </label>
                            <input
                              type="password"
                              maxLength={4}
                              required
                              autoFocus
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-center text-lg tracking-[8px] focus:outline-none focus:border-primary transition-colors text-white font-bold"
                              placeholder="••••"
                              value={pin}
                              onChange={(e) => setPin(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setStep("form");
                              setPin("");
                            }}
                            className="flex-1"
                            disabled={loading}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1" disabled={loading || pin.length < 4}>
                            {loading ? (
                              <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                              </span>
                            ) : (
                              "Authorize Payment"
                            )}
                          </Button>
                        </div>
                        
                        <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
                          This is a secure simulated authorization. No actual mobile money will be deducted from your account.
                        </p>
                      </motion.form>
                    )}

                    {/* Step 3: Success Screen */}
                    {step === "success" && (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-6 space-y-4"
                      >
                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        
                        <div className="space-y-1">
                          <h3 className="font-bold text-lg text-foreground">Payment Successful!</h3>
                          <p className="text-xs text-muted-foreground">
                            Thank you for your generous contribution of {formatTZSFull(amount)}
                          </p>
                        </div>

                        <div className="bg-muted/50 rounded-xl p-4 text-xs space-y-2 text-left border border-border/60">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Receipt Number:</span>
                            <span className="font-mono font-semibold text-foreground">{receiptNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Campaign:</span>
                            <span className="font-semibold text-foreground truncate max-w-[180px]">{campaign.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Platform Fee:</span>
                            <span className="font-semibold text-foreground">TZS 0 (Paid at campaign creation)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Settlement Status:</span>
                            <span className="font-semibold text-emerald-600">Pending Reconciliation</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 text-xs"
                            onClick={() => {
                              setStep("form");
                              setPin("");
                              setPhone("");
                              setCustomAmount("");
                            }}
                          >
                            Donate Again
                          </Button>
                          <Button asChild className="flex-1 text-xs">
                            <Link href="/">Back to Home</Link>
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Card>

              {/* Transparency Panel */}
              <div className="border border-border rounded-xl p-4 bg-muted/30 text-xs text-muted-foreground space-y-2 mt-4">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <FileCheck className="w-3.5 h-3.5 text-primary" />
                  Campaign Service Disclosure
                </div>
                <p className="leading-relaxed">
                  Changia applies a 5% service fee directly to the fundraising target upon campaign creation. Payout allocations are:
                </p>
                <div className="flex justify-between border-t border-border/50 pt-2 font-mono">
                  <span>Owner Allocation:</span>
                  <span className="text-foreground">{formatTZS(purposeAmount)}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>Changia Platform (5%):</span>
                  <span className="text-foreground">{formatTZS(platformFee)}</span>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-1 font-semibold font-mono text-foreground">
                  <span>Public Campaign Target:</span>
                  <span>{formatTZS(campaign.goal)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

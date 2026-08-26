'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PublicApiError,
  formatTZS,
  getContributionStatus,
  simulateConfirmContribution,
  startContribution,
  type ContributionStatus,
  type Locale,
} from '@/lib/public-campaigns';

type DonateWidgetProps = {
  campaignSlug: string;
  minimumAmount: number;
  remaining: number;
  locale?: Locale;
};

type Stage = 'form' | 'pending' | 'success' | 'error';

const buttonClasses =
  'group inline-flex w-full items-center justify-center gap-x-2 rounded-lg border border-transparent bg-emerald-600 px-4 py-3 text-sm font-bold text-neutral-50 ring-zinc-500 transition duration-300 hover:bg-emerald-700 focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 dark:ring-zinc-200';

const inputClasses =
  'block w-full rounded-lg border border-neutral-200 px-4 py-3 text-sm text-neutral-800 focus:border-emerald-500 focus:ring-emerald-500 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200';

const POLL_MS = 3000;

const STRINGS = {
  en: {
    minError: (min: string) => `Minimum contribution is ${min}`,
    phoneError: 'Enter a valid Tanzanian phone number',
    emailError: 'Please enter a valid email address',
    genericError: 'Something went wrong. Please try again.',
    thanks: 'Asante! Thank you!',
    paymentSuccess: 'Your payment was successful!',
    receiptLabel: 'Receipt Number',
    transactionIdLabel: 'Transaction ID',
    amountLabel: 'Amount Paid',
    emailSent: 'A receipt has been sent to your email address.',
    confirmedText: (amount: string, receipt: string) =>
      `Your contribution of ${amount} was confirmed.${receipt ? ` Receipt ${receipt}.` : ''}`,
    contributeAgain: 'Contribute again',
    checkPhone: 'Check your phone to approve',
    pendingText: (amount: string) =>
      `We never ask for your mobile-money PIN — approve the ${amount} request at your operator's own prompt to complete it.`,
    simulate: 'Simulate approval (demo)',
    cancel: 'Cancel and start over',
    expired: 'The request expired before it was approved.',
    notApproved: 'The request was not approved.',
    tryAgain: 'Try again',
    amountPlaceholder: (min: string) => `Amount (min. ${min})`,
    phonePlaceholder: 'Mobile-money number (e.g. 07XXXXXXXX)',
    emailPlaceholder: 'Email address (for receipt)',
    namePlaceholder: 'Your name (optional)',
    anonymous: 'Contribute anonymously',
    sending: 'Sending request…',
    submit: 'Contribute now',
    noPin: 'Changia never stores or asks for your mobile-money PIN.',
  },
  sw: {
    minError: (min: string) => `Mchango wa chini ni ${min}`,
    phoneError: 'Weka namba sahihi ya simu ya Tanzania',
    emailError: 'Weka anwani sahihi ya barua pepe',
    genericError: 'Hitilafu imetokea. Tafadhali jaribu tena.',
    thanks: 'Asante sana!',
    paymentSuccess: 'Malipo yako yamefanikiwa!',
    receiptLabel: 'Nambari ya Risiti',
    transactionIdLabel: 'Nambari ya Muamala',
    amountLabel: 'Kiasi kilicholipwa',
    emailSent: 'Risiti imetumwa kwenye anwani yako ya barua pepe.',
    confirmedText: (amount: string, receipt: string) =>
      `Mchango wako wa ${amount} umethibitishwa.${receipt ? ` Risiti ${receipt}.` : ''}`,
    contributeAgain: 'Changia tena',
    checkPhone: 'Angalia simu yako ili kuthibitisha',
    pendingText: (amount: string) =>
      `Hatuombi PIN yako ya pesa za simu — thibitisha ombi la ${amount} kwenye ombi la mtoa huduma wako mwenyewe ili kukamilisha.`,
    simulate: 'Iga uthibitisho (demo)',
    cancel: 'Ghairi na anza upya',
    expired: 'Ombi limeisha muda kabla ya kuthibitishwa.',
    notApproved: 'Ombi halikuthibitishwa.',
    tryAgain: 'Jaribu tena',
    amountPlaceholder: (min: string) => `Kiasi (chini zaidi ${min})`,
    phonePlaceholder: 'Namba ya pesa za simu (mf. 07XXXXXXXX)',
    emailPlaceholder: 'Anwani ya barua pepe (kwa risiti)',
    namePlaceholder: 'Jina lako (si lazima)',
    anonymous: 'Changia bila jina',
    sending: 'Inatuma ombi…',
    submit: 'Changia sasa',
    noPin: 'Changia haihifadhi wala haiombi PIN yako ya pesa za simu.',
  },
} as const;

export default function DonateWidget({
  campaignSlug,
  minimumAmount,
  remaining,
  locale = 'en',
}: DonateWidgetProps) {
  const t = STRINGS[locale];
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('form');
  const [amount, setAmount] = useState(String(minimumAmount));
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [status, setStatus] = useState<ContributionStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const quickAmounts = [minimumAmount, minimumAmount * 5, minimumAmount * 10].filter(
    (v) => v <= Math.max(remaining, minimumAmount * 10)
  );

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = (id: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const s = await getContributionStatus(id);
        setStatus(s);
        if (s.status !== 'PENDING') {
          if (pollRef.current) clearInterval(pollRef.current);
          setStage(s.status === 'SUCCESS' ? 'success' : 'error');
          if (s.status === 'SUCCESS') router.refresh();
        }
      } catch {
        // A transient poll failure isn't fatal — keep trying until it resolves.
      }
    }, POLL_MS);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amountNum = Math.round(Number(amount));
    if (!amountNum || amountNum < minimumAmount) {
      setError(t.minError(formatTZS(minimumAmount)));
      return;
    }
    if (!/^(\+?255|0)?[67][0-9]{8}$/.test(donorPhone.trim())) {
      setError(t.phoneError);
      return;
    }
    setSubmitting(true);
    try {
      const result = await startContribution(campaignSlug, {
        amount: amountNum,
        donorName: isAnonymous ? undefined : donorName.trim() || undefined,
        donorPhone: donorPhone.trim(),
        donorEmail: donorEmail.trim() || undefined,
        isAnonymous,
      });
      setAttemptId(result.attemptId);
      setStage('pending');
      startPolling(result.attemptId);
    } catch (e) {
      setError(e instanceof PublicApiError ? e.message : t.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  const simulateApproval = async () => {
    if (!attemptId) return;
    try {
      await simulateConfirmContribution(attemptId);
    } catch {
      // The poller above will surface the real state on its next tick.
    }
  };

  const reset = () => {
    setStage('form');
    setAttemptId(null);
    setStatus(null);
    setError(null);
    setAmount(String(minimumAmount));
  };

  if (stage === 'success') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-900/20">
        {/* Success Icon */}
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <svg className="h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{t.thanks}</p>
        <p className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-300">{t.paymentSuccess}</p>

        {/* Transaction Details Card */}
        <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-4 text-left dark:border-emerald-800 dark:bg-neutral-900">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{t.amountLabel}</span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{status ? formatTZS(status.amount) : ''}</span>
            </div>
            {status?.receiptNumber && (
              <div className="flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-neutral-700">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{t.receiptLabel}</span>
                <span className="font-mono text-sm font-bold text-neutral-800 dark:text-neutral-200">{status.receiptNumber}</span>
              </div>
            )}
            {status?.attemptId && (
              <div className="flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-neutral-700">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{t.transactionIdLabel}</span>
                <span className="font-mono text-sm font-bold text-neutral-800 dark:text-neutral-200">#{status.attemptId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Email notification */}
        {donorEmail && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <span>{t.emailSent}</span>
          </div>
        )}

        <button type="button" onClick={reset} className={`${buttonClasses} mt-5`}>
          {t.contributeAgain}
        </button>
      </div>
    );
  }

  if (stage === 'pending') {
    return (
      <div className="rounded-xl border border-neutral-200 p-6 text-center dark:border-neutral-700">
        <p className="text-base font-bold text-neutral-800 dark:text-neutral-200">{t.checkPhone}</p>
        <p className="mt-1 text-sm text-pretty text-neutral-600 dark:text-neutral-400">
          {t.pendingText(formatTZS(Number(amount)))}
        </p>
        <button type="button" onClick={simulateApproval} className={`${buttonClasses} mt-4`}>
          {t.simulate}
        </button>
        <button
          type="button"
          onClick={reset}
          className="mt-2 block w-full text-xs text-neutral-500 underline dark:text-neutral-400"
        >
          {t.cancel}
        </button>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900 dark:bg-rose-900/20">
        <p className="text-sm font-bold text-rose-700 dark:text-rose-400">
          {status?.status === 'EXPIRED' ? t.expired : t.notApproved}
        </p>
        <button type="button" onClick={reset} className={`${buttonClasses} mt-4`}>
          {t.tryAgain}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-neutral-200 p-6 dark:border-neutral-700">
      <div className="flex flex-wrap gap-2">
        {quickAmounts.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setAmount(String(v))}
            className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
              Number(amount) === v
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'border-neutral-200 text-neutral-600 hover:border-emerald-400 dark:border-neutral-700 dark:text-neutral-400'
            }`}
          >
            {formatTZS(v)}
          </button>
        ))}
      </div>

      <input
        type="number"
        inputMode="numeric"
        min={minimumAmount}
        step={100}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={t.amountPlaceholder(formatTZS(minimumAmount))}
        className={inputClasses}
        required
      />
      <input
        type="tel"
        value={donorPhone}
        onChange={(e) => setDonorPhone(e.target.value)}
        placeholder={t.phonePlaceholder}
        className={inputClasses}
        required
      />
      <input
        type="email"
        value={donorEmail}
        onChange={(e) => setDonorEmail(e.target.value)}
        placeholder={t.emailPlaceholder}
        className={inputClasses}
      />
      {!isAnonymous && (
        <input
          type="text"
          value={donorName}
          onChange={(e) => setDonorName(e.target.value)}
          placeholder={t.namePlaceholder}
          className={inputClasses}
        />
      )}
      <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="rounded border-neutral-300"
        />
        {t.anonymous}
      </label>

      {error ? <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}

      <button type="submit" disabled={submitting} className={buttonClasses}>
        {submitting ? t.sending : t.submit}
      </button>
      <p className="text-center text-[11px] text-neutral-500 dark:text-neutral-500">{t.noPin}</p>
    </form>
  );
}

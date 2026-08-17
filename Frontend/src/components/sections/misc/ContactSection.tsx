'use client';

import { useState, type FormEvent } from 'react';
import AuthBtn from '@/components/ui/buttons/AuthBtn';
import ContactIconBlock from '@/components/ui/blocks/ContactIconBlock';
import TextInput from '@/components/ui/forms/input/TextInput';
import EmailContactInput from '@/components/ui/forms/input/EmailContactInput';
import PhoneInput from '@/components/ui/forms/input/PhoneInput';
import TextAreaInput from '@/components/ui/forms/input/TextAreaInput';
import Icon from '@/components/ui/icons/Icon';

const title = 'Contact us';
const subTitle =
  "Have a Campaign  idea or questions about the platform? Reach out, and let's plan your Changia rollout.";
const formTitle = 'Fill in the form below';
const formSubTitle = "We'll get back to you in 1-2 business days.";

const MAX_FIELD = 500;

export default function ContactSection() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    details: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const setField = (field: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSent(false);

    const nextErrors: Record<string, string> = {};
    if (!form.firstName.trim()) nextErrors.firstName = 'First name is required.';
    else if (form.firstName.trim().length > 100)
      nextErrors.firstName = 'First name must be 100 characters or fewer.';
    if (!form.lastName.trim()) nextErrors.lastName = 'Last name is required.';
    else if (form.lastName.trim().length > 100)
      nextErrors.lastName = 'Last name must be 100 characters or fewer.';
    if (!form.email.trim()) nextErrors.email = 'Email is required.';
    else if (!/.+@.+\..+/.test(form.email.trim()))
      nextErrors.email = 'Please enter a valid email address.';
    if (!form.phone.trim()) nextErrors.phone = 'Phone number is required.';
    else if (!/^(\+?255|0)?[67][0-9]{8}$/.test(form.phone.replace(/[\s-]/g, '')))
      nextErrors.phone = 'Enter a valid Tanzanian phone number.';
    if (!form.details.trim()) nextErrors.details = 'Details are required.';
    else if (form.details.trim().length > MAX_FIELD)
      nextErrors.details = `Details must be ${MAX_FIELD} characters or fewer.`;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // All fields validated — proceed to submit
    setErrors({});
    setSent(true);
    setForm({ firstName: '', lastName: '', email: '', phone: '', details: '' });
  };

  return (
    <section className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-2xl lg:max-w-5xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-balance text-neutral-800 md:text-4xl md:leading-tight dark:text-neutral-200">
            {title}
          </h1>
          <p className="mt-1 text-pretty text-neutral-600 dark:text-neutral-400">
            {subTitle}
          </p>
        </div>

        <div className="mt-12 grid items-center gap-6 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col rounded-xl p-4 sm:p-6 lg:p-8">
            <h2 className="mb-8 text-xl font-bold text-neutral-700 dark:text-neutral-300">
              {formTitle}
            </h2>
            <form onSubmit={handleSubmit} noValidate>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextInput
                    id="hs-firstname-contacts"
                    label="First Name"
                    name="hs-firstname-contacts"
                    value={form.firstName}
                    onChange={setField('firstName')}
                    required
                    maxLength={100}
                    error={errors.firstName}
                  />
                  <TextInput
                    id="hs-lastname-contacts"
                    label="Last Name"
                    name="hs-lastname-contacts"
                    value={form.lastName}
                    onChange={setField('lastName')}
                    required
                    maxLength={100}
                    error={errors.lastName}
                  />
                </div>
                <EmailContactInput
                  id="hs-email-contacts"
                  value={form.email}
                  onChange={setField('email')}
                  required
                  error={errors.email}
                />
                <PhoneInput
                  id="hs-phone-number"
                  value={form.phone}
                  onChange={setField('phone')}
                  required
                  error={errors.phone}
                />
                <TextAreaInput
                  id="hs-about-contacts"
                  label="Details"
                  name="hs-about-contacts"
                  value={form.details}
                  onChange={setField('details')}
                  required
                  maxLength={MAX_FIELD}
                  error={errors.details}
                />
              </div>
              {sent ? (
                <div
                  role="status"
                  className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300"
                >
                  Thank you! Your message has been sent. We&apos;ll get back to you in 1-2
                  business days.
                </div>
              ) : (
                <div className="mt-4 grid">
                  <AuthBtn title="Send Message" />
                </div>
              )}
              <div className="mt-3 text-center">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{formSubTitle}</p>
              </div>
            </form>
          </div>

          <div className="divide-y divide-neutral-300 dark:divide-neutral-700">
            <ContactIconBlock
              heading="Guides & Docs"
              content="Browse through our platform guides and Campaign  best practices."
              isLinkVisible
              linkTitle="Visit guides & tutorials"
              linkURL="#"
              isArrowVisible
            >
              <Icon name="question" />
            </ContactIconBlock>
            <ContactIconBlock
              heading="FAQ"
              content="Explore our FAQ for quick, clear answers about Campaigns, donors and fees."
              isLinkVisible
              linkTitle="Visit FAQ"
              linkURL="#"
              isArrowVisible
            >
              <Icon name="chatBubble" />
            </ContactIconBlock>
            <ContactIconBlock
              heading="Where we work"
              content="Tanzania — remote-first"
              isAddressVisible
              addressContent="Nationwide support for your Campaigns"
            >
              <Icon name="mapPin" />
            </ContactIconBlock>
            <ContactIconBlock
              heading="Contact us by email"
              content="Prefer the written word? Drop us an email at"
              isLinkVisible
              linkTitle="hello@changia.org.tz"
              linkURL="#"
            >
              <Icon name="envelopeOpen" />
            </ContactIconBlock>
          </div>
        </div>
      </div>
    </section>
  );
}
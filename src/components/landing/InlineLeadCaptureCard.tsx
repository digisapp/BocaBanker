'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import BocaBankerAvatar from './BocaBankerAvatar';
import { siteConfig } from '@/lib/site-config';

const formSchema = z.object({
  name: z.string().trim().min(1, { message: 'Please enter your name' }),
  email: z.string().trim().email({ message: 'Enter a valid email' }),
  phone: z.string().trim().optional(),
});

interface InlineLeadCaptureCardProps {
  /** The visitor's first question, sent along so the follow-up has context. */
  question?: string;
  onDismiss: () => void;
  onSuccess: (name: string) => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40';

export default function InlineLeadCaptureCard({ question, onDismiss, onSuccess }: InlineLeadCaptureCardProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = formSchema.safeParse({ name, email, phone });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please check your input');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/chat/guest/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parsed.data,
          question: question?.slice(0, 500),
          page: window.location.pathname,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      onSuccess(parsed.data.name);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex gap-3 justify-start">
      {/* The follow-up comes from the real banker, so show him here when available. */}
      {siteConfig.bankerPhoto ? (
        <BocaBankerAvatar
          size={32}
          src={siteConfig.bankerPhoto}
          alt={siteConfig.ownerName || 'Boca Banker'}
          className="flex-shrink-0 mt-1"
        />
      ) : (
        <BocaBankerAvatar size={32} className="flex-shrink-0 mt-1" />
      )}
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-amber-200 bg-cream px-5 py-4">
        <p className="font-semibold text-sm text-navy mb-1">
          Want Boca Banker to follow up personally?
        </p>
        <p className="text-xs text-gray-500 mb-3">
          Leave your details and he&apos;ll reach out about your situation. No obligation.
        </p>

        <form onSubmit={handleSubmit} className="space-y-2" noValidate>
          <input
            type="text"
            autoComplete="name"
            aria-label="Your name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <input
            type="email"
            autoComplete="email"
            aria-label="Email address"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <input
            type="tel"
            autoComplete="tel"
            aria-label="Phone (optional)"
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />

          {error && (
            <p role="alert" className="text-xs text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-navy text-white font-semibold text-sm rounded-lg py-2.5 hover:bg-navy-light disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : (
              'Have him reach out'
            )}
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="block mx-auto text-xs text-gray-500 hover:text-gray-700 transition-colors py-2"
          >
            Maybe later
          </button>
        </form>
      </div>
    </div>
  );
}

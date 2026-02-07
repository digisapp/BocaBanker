'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Loader2, CheckCircle2, Mail } from 'lucide-react';
import BocaBankerAvatar from './BocaBankerAvatar';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  propertyLocation: z.string().min(1, { message: 'Property location is required' }),
  email: z.string().email({ message: 'Enter a valid email' }),
});

interface InlineLeadCaptureCardProps {
  onDismiss: () => void;
  onSuccess: () => void;
}

export default function InlineLeadCaptureCard({ onDismiss, onSuccess }: InlineLeadCaptureCardProps) {
  const [name, setName] = useState('');
  const [propertyLocation, setPropertyLocation] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = formSchema.safeParse({ name, propertyLocation, email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please check your input');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/guest-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, propertyLocation }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong');
        return;
      }

      setSuccess(true);
      onSuccess();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex gap-3 justify-start">
        <BocaBankerAvatar size={32} className="flex-shrink-0 mt-1" />
        <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-green-200 bg-green-50/50 px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <p className="font-semibold text-sm text-gray-900">Check your email!</p>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            We sent a magic link to <span className="font-medium text-gray-700">{email}</span>.
            Click it to continue with full access.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
            <Mail className="h-3 w-3" />
            Check spam if you don&apos;t see it
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 justify-start">
      <BocaBankerAvatar size={32} className="flex-shrink-0 mt-1" />
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-amber-200 bg-amber-50/50 px-5 py-4">
        <p className="font-semibold text-sm text-gray-900 mb-1">
          I&apos;d love to dig deeper for you!
        </p>
        <p className="text-xs text-gray-500 mb-3">
          Drop your info and I&apos;ll send you a magic link for full access.
        </p>

        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
          />
          <input
            type="text"
            placeholder="Property location (e.g. Miami, FL)"
            value={propertyLocation}
            onChange={(e) => setPropertyLocation(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
          />

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold text-sm rounded-lg py-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : (
              'Send Magic Link'
            )}
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="block mx-auto text-xs text-gray-400 hover:text-gray-600 transition-colors pt-1"
          >
            Maybe later
          </button>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Loader2, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BocaBankerAvatar from './BocaBankerAvatar';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email({ message: 'Enter a valid email' }),
});

interface LeadCaptureOverlayProps {
  onDismiss: () => void;
}

export default function LeadCaptureOverlay({ onDismiss }: LeadCaptureOverlayProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = formSchema.safeParse({ name, email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please check your input');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/guest-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-center rounded-3xl">
      <div className="px-8 py-6 text-center max-w-sm w-full">
        {success ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
            </div>
            <h3 className="font-serif text-xl font-bold text-gray-900">
              Check your email!
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              We sent a magic link to <span className="font-medium text-gray-700">{email}</span>.
              Click it to continue your conversation with full chat history.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-2">
              <Mail className="h-3.5 w-3.5" />
              Check spam if you don&apos;t see it
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center mb-2">
              <BocaBankerAvatar size={56} />
            </div>
            <h3 className="font-serif text-xl font-bold text-gray-900">
              Enjoying the conversation?
            </h3>
            <p className="text-sm text-gray-500">
              Sign up free to keep chatting with Boca Banker — your history will be saved.
            </p>

            <div className="space-y-3 text-left">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90 rounded-xl h-11"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Send Magic Link'
              )}
            </Button>

            <button
              type="button"
              onClick={onDismiss}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Maybe later
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

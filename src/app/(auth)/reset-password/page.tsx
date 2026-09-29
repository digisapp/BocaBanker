'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import BocaBankerAvatar from '@/components/landing/BocaBankerAvatar'

const resetSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
})

type ResetInput = z.infer<typeof resetSchema>

// Matches the marketing site's inputs, primary (navy) button and gold links
const inputClass =
  'h-11 rounded-xl border-gray-300 bg-white px-3.5 text-base text-navy shadow-none placeholder:text-gray-400 focus-visible:border-navy focus-visible:ring-[3px] focus-visible:ring-amber-400/40 aria-invalid:border-red-400 aria-invalid:ring-red-500/15 md:text-sm'
const primaryBtn =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-6 text-sm font-semibold text-white shadow-lg shadow-navy/20 transition-colors hover:bg-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base'
const linkClass =
  'rounded-sm font-semibold text-gold-dark transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2'

export default function ResetPasswordPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
  })

  const onSubmit = async (data: ResetInput) => {
    setError(null)

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        data.email,
        {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/settings`,
        }
      )

      if (resetError) {
        setError(resetError.message)
        return
      }

      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center shadow-xl shadow-navy/5 sm:px-8 sm:py-10">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-amber-400">
              <CheckCircle className="h-7 w-7" />
            </div>
          </div>
          <h1 className="mt-5 font-serif text-3xl leading-tight text-navy">
            Check your email
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            We sent a password reset link to your email address.
            Click the link to set a new password.
          </p>
          <div className="mt-8">
            <Link href="/login" className={`${linkClass} inline-flex items-center gap-1.5 text-sm`}>
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-xl shadow-navy/5 sm:px-8 sm:py-10">
        <div className="text-center">
          <div className="flex justify-center">
            <BocaBankerAvatar size={64} priority />
          </div>
          <h1 className="mt-5 font-serif text-3xl leading-tight text-navy">
            Reset password
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5">
          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-navy">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={errors.email ? true : undefined}
              {...register('email')}
              className={inputClass}
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className={`mt-2 ${primaryBtn}`}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>

        <p className="mt-6 border-t border-gray-100 pt-5 text-center text-sm text-gray-600">
          Remember your password?{' '}
          <Link href="/login" className={linkClass}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

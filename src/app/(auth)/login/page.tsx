'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { loginSchema, type LoginInput } from '@/lib/validation/schemas'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import BocaBankerAvatar from '@/components/landing/BocaBankerAvatar'

// Matches the marketing site's inputs and primary (navy) button
const inputClass =
  'h-11 rounded-xl border-gray-300 bg-white px-3.5 text-base text-navy shadow-none placeholder:text-gray-400 focus-visible:border-navy focus-visible:ring-[3px] focus-visible:ring-amber-400/40 aria-invalid:border-red-400 aria-invalid:ring-red-500/15 md:text-sm'
const primaryBtn =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-6 text-sm font-semibold text-white shadow-lg shadow-navy/20 transition-colors hover:bg-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    setError(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Invalid email or password')
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-xl shadow-navy/5 sm:px-8 sm:py-10">
        <div className="text-center">
          <div className="flex justify-center">
            <BocaBankerAvatar size={64} priority />
          </div>
          <h1 className="mt-5 font-serif text-3xl leading-tight text-navy">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your Boca Banker account
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
              autoComplete="username"
              placeholder="you@example.com"
              aria-invalid={errors.email ? true : undefined}
              {...register('email')}
              className={inputClass}
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-navy">
                Password
              </Label>
              <Link
                href="/reset-password"
                className="group -my-2.5 py-2.5 text-xs font-semibold text-gold-dark transition-colors hover:text-navy focus-visible:outline-none"
              >
                {/* Ring the text, not the padded tap area, so it doesn't overlap the input */}
                <span className="rounded-sm group-focus-visible:ring-2 group-focus-visible:ring-gold group-focus-visible:ring-offset-2">
                  Forgot password?
                </span>
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-invalid={errors.password ? true : undefined}
              {...register('password')}
              className={inputClass}
            />
            {errors.password && (
              <p className="text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className={`mt-2 ${primaryBtn}`}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="mt-6 border-t border-gray-100 pt-5 text-center text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
          Admin access only
        </p>
      </div>
    </div>
  )
}

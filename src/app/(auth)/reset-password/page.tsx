'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Building2, Loader2, CheckCircle, ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

const resetSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
})

type ResetInput = z.infer<typeof resetSchema>

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
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[rgba(26,43,69,0.8)] border-[rgba(201,168,76,0.15)] backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/20 shadow-lg">
                <CheckCircle className="h-7 w-7 text-emerald-400" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-serif text-gold-gradient">
                Check Your Email
              </CardTitle>
              <CardDescription className="text-[#94A3B8] mt-2">
                We sent a password reset link to your email address.
                Click the link to set a new password.
              </CardDescription>
            </div>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild variant="ghost" className="text-[#C9A84C] hover:text-[#D4B962]">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[rgba(26,43,69,0.8)] border-[rgba(201,168,76,0.15)] backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gold-gradient shadow-lg gold-glow">
              <Building2 className="h-7 w-7 text-[#0F1B2D]" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-serif text-gold-gradient">
              Reset Password
            </CardTitle>
            <CardDescription className="text-[#94A3B8] mt-1">
              Enter your email and we&apos;ll send you a reset link
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#94A3B8]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(201,168,76,0.15)] text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#C9A84C] focus:ring-[#C9A84C]/20"
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gold-gradient text-[#0F1B2D] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>

            <p className="text-sm text-[#94A3B8] text-center">
              Remember your password?{' '}
              <Link
                href="/login"
                className="text-[#C9A84C] hover:text-[#D4B962] font-medium transition-colors"
              >
                Sign In
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react'
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
import BocaBankerAvatar from '@/components/landing/BocaBankerAvatar'

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
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-sky-50 via-white to-[#FAFAF8]">
        <Card className="w-full max-w-md bg-white border-gray-200 shadow-xl shadow-black/5">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100">
                <CheckCircle className="h-7 w-7 text-emerald-600" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-serif text-gray-900">
                Check Your Email
              </CardTitle>
              <CardDescription className="text-gray-500 mt-2">
                We sent a password reset link to your email address.
                Click the link to set a new password.
              </CardDescription>
            </div>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild variant="ghost" className="text-amber-600 hover:text-amber-700">
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
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-sky-50 via-white to-[#FAFAF8]">
      <Card className="w-full max-w-md bg-white border-gray-200 shadow-xl shadow-black/5">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <BocaBankerAvatar size={56} />
          </div>
          <div>
            <CardTitle className="text-2xl font-serif text-gray-900">
              Reset Password
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              Enter your email and we&apos;ll send you a reset link
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
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

            <p className="text-sm text-gray-500 text-center">
              Remember your password?{' '}
              <Link
                href="/login"
                className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
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

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Loader2 } from 'lucide-react'
import { signupSchema, type SignupInput } from '@/lib/validation/schemas'
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

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupInput) => {
    setError(null)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: data.full_name,
          email: data.email,
          password: data.password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to create account')
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[rgba(26,43,69,0.8)] border-[rgba(201,168,76,0.15)] backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-4">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gold-gradient shadow-lg gold-glow">
              <Building2 className="h-7 w-7 text-[#0F1B2D]" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-serif text-gold-gradient">
              Create Account
            </CardTitle>
            <CardDescription className="text-[#94A3B8] mt-1">
              Get started with Boca Banker
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Global Error */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-[#94A3B8]">
                Full Name
              </Label>
              <Input
                id="full_name"
                type="text"
                placeholder="John Doe"
                {...register('full_name')}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(201,168,76,0.15)] text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#C9A84C] focus:ring-[#C9A84C]/20"
              />
              {errors.full_name && (
                <p className="text-xs text-red-400">{errors.full_name.message}</p>
              )}
            </div>

            {/* Email */}
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

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#94A3B8]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                {...register('password')}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(201,168,76,0.15)] text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#C9A84C] focus:ring-[#C9A84C]/20"
              />
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm_password" className="text-[#94A3B8]">
                Confirm Password
              </Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="Confirm your password"
                {...register('confirm_password')}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(201,168,76,0.15)] text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#C9A84C] focus:ring-[#C9A84C]/20"
              />
              {errors.confirm_password && (
                <p className="text-xs text-red-400">{errors.confirm_password.message}</p>
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
                  Creating account...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>

            <p className="text-sm text-[#94A3B8] text-center">
              Already have an account?{' '}
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

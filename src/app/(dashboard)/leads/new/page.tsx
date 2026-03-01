'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import { ArrowLeft, Target } from 'lucide-react'
import { LeadForm } from '@/components/leads/LeadForm'
import { Button } from '@/components/ui/button'
import type { LeadInput } from '@/lib/validation/schemas'

export default function NewLeadPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: LeadInput) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create lead')
      }

      router.push('/leads')
    } catch (error) {
      logger.error('leads-page', 'Failed to create lead', error)
      alert(error instanceof Error ? error.message : 'Failed to create lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="text-gray-500 hover:text-amber-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Target className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Lead</h1>
            <p className="text-sm text-gray-500">
              Add a new property purchase lead
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <LeadForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  )
}

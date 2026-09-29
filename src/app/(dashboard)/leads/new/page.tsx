'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import { Target } from 'lucide-react'
import { LeadForm } from '@/components/leads/LeadForm'
import PageHeader from '@/components/shared/PageHeader'
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
      toast.error(error instanceof Error ? error.message : 'Failed to create lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <PageHeader
        icon={Target}
        title="New Lead"
        description="Add a new property purchase lead"
        onBack={() => router.back()}
      />

      {/* Form */}
      <LeadForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  )
}

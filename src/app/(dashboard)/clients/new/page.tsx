'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'
import { ClientForm } from '@/components/clients/ClientForm'
import PageHeader from '@/components/shared/PageHeader'
import type { ClientInput } from '@/lib/validation/schemas'

export default function NewClientPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: ClientInput) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create client')
      }

      router.push('/clients')
    } catch (error) {
      logger.error('clients-page', 'Failed to create client', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create client')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <PageHeader
        icon={UserPlus}
        title="New Client"
        description="Add a new client to your database"
        onBack={() => router.back()}
      />

      {/* Form */}
      <ClientForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  )
}

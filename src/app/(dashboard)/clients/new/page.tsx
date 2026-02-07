'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { ClientForm } from '@/components/clients/ClientForm'
import { Button } from '@/components/ui/button'
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
      console.error('Failed to create client:', error)
      alert(error instanceof Error ? error.message : 'Failed to create client')
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
            <UserPlus className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              New Client
            </h1>
            <p className="text-sm text-gray-500">
              Add a new client to your database
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <ClientForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  )
}

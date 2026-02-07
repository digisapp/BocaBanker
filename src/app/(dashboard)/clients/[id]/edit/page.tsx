'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Pencil, Loader2 } from 'lucide-react'
import { ClientForm } from '@/components/clients/ClientForm'
import { Button } from '@/components/ui/button'
import type { ClientInput } from '@/lib/validation/schemas'

interface ClientData {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  company: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  status: string | null
  tags: string[] | null
  notes: string | null
  source: string | null
}

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [client, setClient] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients/${params.id}`)
        if (!res.ok) throw new Error('Not found')
        const data = await res.json()
        setClient(data)
      } catch {
        router.push('/clients')
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [params.id, router])

  const handleSubmit = async (data: ClientInput) => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/clients/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update client')
      }

      router.push(`/clients/${params.id}`)
    } catch (error) {
      console.error('Failed to update client:', error)
      alert(error instanceof Error ? error.message : 'Failed to update client')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!client) return null

  // Convert DB format to form format
  const defaultValues: Partial<ClientInput> = {
    first_name: client.firstName,
    last_name: client.lastName,
    email: client.email ?? '',
    phone: client.phone ?? '',
    company: client.company ?? '',
    address: client.address ?? '',
    city: client.city ?? '',
    state: client.state ?? '',
    zip: client.zip ?? '',
    status: (client.status as 'active' | 'prospect' | 'inactive') ?? 'active',
    tags: client.tags?.join(', ') ?? '',
    notes: client.notes ?? '',
    source: client.source ?? '',
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
            <Pencil className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Client
            </h1>
            <p className="text-sm text-gray-500">
              {client.firstName} {client.lastName}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <ClientForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}

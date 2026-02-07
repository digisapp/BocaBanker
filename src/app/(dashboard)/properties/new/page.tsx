'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import PropertyForm from '@/components/properties/PropertyForm'
import type { PropertyInput } from '@/lib/validation/schemas'

interface ClientOption {
  id: string
  firstName: string
  lastName: string
  company?: string | null
}

export default function NewPropertyPage() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch('/api/clients?limit=200')
        if (res.ok) {
          const data = await res.json()
          setClients(
            (data.clients || []).map((c: Record<string, string>) => ({
              id: c.id,
              firstName: c.firstName || c.first_name,
              lastName: c.lastName || c.last_name,
              company: c.company,
            }))
          )
        }
      } catch (error) {
        console.error('Error fetching clients:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchClients()
  }, [])

  async function handleSubmit(data: PropertyInput & { client_id?: string; description?: string }) {
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to create property')
    }

    const { property } = await res.json()
    router.push(`/properties/${property.id}`)
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[250px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="text-gray-500 hover:text-amber-600 hover:bg-amber-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Property</h1>
          <p className="text-sm text-gray-500 mt-0.5">Add a new property to your portfolio</p>
        </div>
      </div>

      <PropertyForm clients={clients} onSubmit={handleSubmit} />
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import { Building2 } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
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
  // Pre-select the client when arriving from a client page (?clientId=...)
  const [presetClientId, setPresetClientId] = useState<string | null>(null)

  useEffect(() => {
    const clientId = new URLSearchParams(window.location.search).get('clientId')
    async function fetchClients() {
      try {
        // API caps limit at 100
        const res = await fetch('/api/clients?limit=100&sort=firstName&order=asc')
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
        logger.error('properties-page', 'Error fetching clients', error)
      } finally {
        if (clientId) setPresetClientId(clientId)
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
      const err = await res.json().catch(() => ({}))
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
      <PageHeader
        icon={Building2}
        title="New Property"
        description="Add a new property to your portfolio"
        onBack={() => router.back()}
      />

      <PropertyForm
        clients={clients}
        onSubmit={handleSubmit}
        isEdit={false}
        defaultValues={presetClientId ? { client_id: presetClientId } : undefined}
      />
    </div>
  )
}

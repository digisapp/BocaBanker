'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import { FileBarChart } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import StudyForm from '@/components/studies/StudyForm'
import type { PropertyOption, ClientOption, StudyFormData } from '@/hooks/useStudyForm'

// The list APIs cap `limit` at 100, so page through until a short page
// (measured against the limit the API reports it actually applied).
const PAGE_SIZE = 100
const MAX_PAGES = 100

async function fetchAllPages<T extends { id?: unknown }>(path: string, key: string): Promise<T[]> {
  // keyed by id: a row added mid-load can shift offsets and repeat one
  const rows = new Map<unknown, T>()
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${path}?limit=${PAGE_SIZE}&page=${page}`)
    if (!res.ok) throw new Error(`Failed to load ${key} (${res.status})`)
    const data = await res.json()
    const batch: T[] = Array.isArray(data[key]) ? data[key] : []
    for (const row of batch) rows.set(row.id ?? rows.size, row)
    const appliedLimit = Number(data.limit ?? data.pagination?.limit) || PAGE_SIZE
    if (batch.length === 0 || batch.length < appliedLimit) break
  }
  return [...rows.values()]
}

function NewStudyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultPropertyId = searchParams.get('property_id') || undefined

  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Load each list independently so one failing doesn't empty both
        const [propsResult, clientsResult] = await Promise.allSettled([
          fetchAllPages<Record<string, unknown>>('/api/properties', 'properties'),
          fetchAllPages<Record<string, string>>('/api/clients', 'clients'),
        ])

        if (propsResult.status === 'fulfilled') {
          setProperties(
            propsResult.value.map((p) => ({
              id: p.id as string,
              address: p.address as string,
              city: p.city as string | null,
              state: p.state as string | null,
              propertyType: p.propertyType as string,
              purchasePrice: p.purchasePrice as string,
              buildingValue: p.buildingValue as string | null,
              landValue: p.landValue as string | null,
              purchaseDate: p.purchaseDate as string | null,
              clientId: p.clientId as string | null,
            }))
          )
        } else {
          logger.error('studies-page', 'Error loading properties', propsResult.reason)
          toast.error('Could not load your properties. Refresh to try again.')
        }

        if (clientsResult.status === 'fulfilled') {
          setClients(
            clientsResult.value.map((c) => ({
              id: c.id,
              firstName: c.firstName || c.first_name,
              lastName: c.lastName || c.last_name,
              company: c.company,
            }))
          )
        } else {
          logger.error('studies-page', 'Error loading clients', clientsResult.reason)
          toast.error('Could not load your clients. Refresh to try again.')
        }
      } catch (error) {
        logger.error('studies-page', 'Error loading data', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  async function handleSubmit(data: StudyFormData) {
    const res = await fetch('/api/studies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to create study')
    }

    const { study } = await res.json()
    router.push(`/studies/${study.id}`)
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[80px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        icon={FileBarChart}
        title="New Study"
        description="Create a new cost segregation study"
        onBack={() => router.back()}
      />

      <StudyForm
        properties={properties}
        clients={clients}
        onSubmit={handleSubmit}
        defaultPropertyId={defaultPropertyId}
      />
    </div>
  )
}

export default function NewStudyPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[80px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      }
    >
      <NewStudyContent />
    </Suspense>
  )
}

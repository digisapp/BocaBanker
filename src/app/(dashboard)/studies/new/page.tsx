'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import StudyForm from '@/components/studies/StudyForm'

interface PropertyOption {
  id: string
  address: string
  city?: string | null
  state?: string | null
  propertyType: string
  purchasePrice: string | number
  buildingValue?: string | number | null
  landValue?: string | number | null
  clientId?: string | null
}

interface ClientOption {
  id: string
  firstName: string
  lastName: string
  company?: string | null
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
        const [propsRes, clientsRes] = await Promise.all([
          fetch('/api/properties?limit=200'),
          fetch('/api/clients?limit=200'),
        ])

        if (propsRes.ok) {
          const data = await propsRes.json()
          setProperties(
            (data.properties || []).map((p: Record<string, unknown>) => ({
              id: p.id as string,
              address: p.address as string,
              city: p.city as string | null,
              state: p.state as string | null,
              propertyType: p.propertyType as string,
              purchasePrice: p.purchasePrice as string,
              buildingValue: p.buildingValue as string | null,
              landValue: p.landValue as string | null,
              clientId: p.clientId as string | null,
            }))
          )
        }

        if (clientsRes.ok) {
          const data = await clientsRes.json()
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
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  async function handleSubmit(data: {
    study_name: string
    property_id: string
    client_id: string
    tax_rate: number
    discount_rate: number
    bonus_depreciation_rate: number
    study_year: number
    assets: Array<{
      category: string
      description: string
      amount: number
      recoveryPeriod: number
      bonusEligible: boolean
    }>
  }) {
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
          <h1 className="text-2xl font-bold text-gray-900">New Study</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create a new cost segregation study
          </p>
        </div>
      </div>

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

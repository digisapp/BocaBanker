'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { logger } from '@/lib/logger'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Tag,
  StickyNote,
  Home,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RoleGate } from '@/components/shared/RoleGate'

interface ClientDetail {
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
  createdAt: string | null
  updatedAt: string | null
}

interface Property {
  id: string
  address: string
  city: string | null
  state: string | null
  propertyType: string
  purchasePrice: string
}

const statusColorMap: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  prospect: 'bg-amber-50 text-amber-600 border-amber-200',
  inactive: 'bg-gray-100 text-gray-500 border-gray-200',
}

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [client, setClient] = useState<ClientDetail | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients/${params.id}`)
        if (!res.ok) throw new Error('Not found')
        const data = await res.json()
        setClient(data)
      } catch {
        router.push('/clients')
        return
      }

      // Fetch properties for this client
      try {
        const propsRes = await fetch(`/api/properties?client_id=${params.id}&limit=50`)
        if (propsRes.ok) {
          const propsData = await propsRes.json()
          setProperties(propsData.properties || [])
        }
      } catch {
        // Properties fetch is non-critical
      }

      setLoading(false)
    }

    fetchClient()
  }, [params.id, router])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/clients/${params.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      router.push('/clients')
    } catch (error) {
      logger.error('clients-page', 'Failed to delete client', error)
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

  const fullAddress = [client.address, client.city, client.state, client.zip]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/clients')}
            className="text-gray-500 hover:text-amber-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
              <User className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {client.firstName} {client.lastName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={`${
                    statusColorMap[client.status ?? 'active'] ??
                    statusColorMap.active
                  } text-xs capitalize`}
                >
                  {client.status}
                </Badge>
                {client.source && (
                  <span className="text-xs text-gray-500">
                    via {client.source}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-14 sm:ml-0">
          <RoleGate permission="canEdit">
            <Button
              variant="outline"
              onClick={() => router.push(`/clients/${params.id}/edit`)}
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </RoleGate>
          <RoleGate permission="canDelete">
            <Button
              variant="outline"
              onClick={handleDelete}
              className="border-red-200 text-red-500 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </RoleGate>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-amber-600 mb-4">
          Contact Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            value={client.email}
          />
          <InfoRow
            icon={<Phone className="h-4 w-4" />}
            label="Phone"
            value={client.phone}
          />
          <InfoRow
            icon={<Building2 className="h-4 w-4" />}
            label="Company"
            value={client.company}
          />
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="Address"
            value={fullAddress || null}
          />
        </div>
      </div>

      {/* Tags */}
      {client.tags && client.tags.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {client.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-gray-100 text-gray-700 border border-gray-200"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {client.notes && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Notes
          </h2>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {client.notes}
          </p>
        </div>
      )}

      {/* Related Properties */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-amber-600 flex items-center gap-2">
            <Home className="h-4 w-4" />
            Properties
          </h2>
          <RoleGate permission="canCreate">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/properties/new?clientId=${params.id}`)}
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Add Property
            </Button>
          </RoleGate>
        </div>
        {properties.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            No properties associated with this client yet.
          </p>
        ) : (
          <div className="space-y-3">
            {properties.map((property) => (
              <div
                key={property.id}
                onClick={() => router.push(`/properties/${property.id}`)}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer hover:border-amber-300 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {property.address}
                  </p>
                  <p className="text-xs text-gray-500">
                    {property.city}, {property.state} &middot;{' '}
                    {property.propertyType}
                  </p>
                </div>
                <span className="text-sm text-amber-600 font-medium">
                  ${Number(property.purchasePrice).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
        {client.createdAt && (
          <span>
            Created{' '}
            {new Date(client.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        )}
        {client.updatedAt && (
          <>
            <Separator orientation="vertical" className="h-3 bg-gray-200" />
            <span>
              Updated{' '}
              {new Date(client.updatedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | null
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-amber-500 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm text-gray-700 mt-0.5">
          {value || '--'}
        </p>
      </div>
    </div>
  )
}

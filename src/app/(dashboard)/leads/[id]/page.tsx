'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { logger } from '@/lib/logger'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  UserCheck,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  User,
  FileText,
  Tag,
  StickyNote,
  Hash,
  Ruler,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RoleGate } from '@/components/shared/RoleGate'

interface LeadDetail {
  id: string
  propertyAddress: string | null
  propertyCity: string | null
  propertyCounty: string | null
  propertyState: string | null
  propertyZip: string | null
  propertyType: string | null
  salePrice: string | null
  saleDate: string | null
  parcelId: string | null
  deedBook: string | null
  deedPage: string | null
  buyerName: string | null
  buyerCompany: string | null
  buyerEmail: string | null
  buyerPhone: string | null
  sellerName: string | null
  squareFootage: string | null
  yearBuilt: string | null
  status: string | null
  priority: string | null
  source: string | null
  notes: string | null
  tags: string[] | null
  createdAt: string | null
  updatedAt: string | null
}

const statusColorMap: Record<string, string> = {
  new: 'bg-blue-50 text-blue-600 border-blue-200',
  contacted: 'bg-amber-50 text-amber-600 border-amber-200',
  qualified: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  proposal_sent: 'bg-purple-50 text-purple-600 border-purple-200',
  converted: 'bg-green-50 text-green-600 border-green-200',
  lost: 'bg-red-50 text-red-600 border-red-200',
}

const statusLabel: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal_sent: 'Proposal Sent',
  converted: 'Converted',
  lost: 'Lost',
}

const priorityColorMap: Record<string, string> = {
  high: 'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  low: 'bg-gray-100 text-gray-500 border-gray-200',
}

const formatCurrency = (value: string | number | null) => {
  if (!value) return '--'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '--'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

const formatDate = (value: string | null) => {
  if (!value) return '--'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function LeadDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const res = await fetch(`/api/leads/${params.id}`)
        if (!res.ok) throw new Error('Not found')
        const data = await res.json()
        setLead(data)
      } catch {
        router.push('/leads')
        return
      }

      setLoading(false)
    }

    fetchLead()
  }, [params.id, router])

  const handleConvert = async () => {
    try {
      const res = await fetch(`/api/leads/${params.id}/convert`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to convert')
      const data = await res.json()
      router.push(`/clients/${data.clientId}`)
    } catch (error) {
      logger.error('lead-detail', 'Failed to convert lead', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/leads/${params.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      router.push('/leads')
    } catch (error) {
      logger.error('lead-detail', 'Failed to delete lead', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!lead) return null

  const status = lead.status ?? 'new'
  const priority = lead.priority ?? 'medium'

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/leads')}
            className="text-gray-500 hover:text-amber-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {lead.propertyAddress || 'Untitled Lead'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={`${
                    statusColorMap[status] ?? statusColorMap.new
                  } text-xs capitalize`}
                >
                  {statusLabel[status] ?? status}
                </Badge>
                <Badge
                  variant="outline"
                  className={`${
                    priorityColorMap[priority] ?? priorityColorMap.medium
                  } text-xs capitalize`}
                >
                  {priority} priority
                </Badge>
                {lead.source && (
                  <span className="text-xs text-gray-500">
                    via {lead.source}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-14 sm:ml-0">
          <Button
            variant="outline"
            onClick={() => {
              // TODO: Edit lead page
            }}
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <RoleGate permission="canCreate">
            <Button
              onClick={handleConvert}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Convert to Client
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

      {/* Property Information */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Property Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="Address"
            value={lead.propertyAddress}
          />
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="City"
            value={lead.propertyCity}
          />
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="County"
            value={lead.propertyCounty}
          />
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="State"
            value={lead.propertyState}
          />
          <InfoRow
            icon={<Hash className="h-4 w-4" />}
            label="ZIP"
            value={lead.propertyZip}
          />
          <InfoRow
            icon={<Building2 className="h-4 w-4" />}
            label="Property Type"
            value={lead.propertyType}
          />
          <InfoRow
            icon={<Ruler className="h-4 w-4" />}
            label="Square Footage"
            value={
              lead.squareFootage
                ? Number(lead.squareFootage).toLocaleString() + ' sq ft'
                : null
            }
          />
          <InfoRow
            icon={<Calendar className="h-4 w-4" />}
            label="Year Built"
            value={lead.yearBuilt}
          />
        </div>
      </div>

      {/* Transaction Details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Transaction Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            icon={<DollarSign className="h-4 w-4" />}
            label="Sale Price"
            value={formatCurrency(lead.salePrice)}
          />
          <InfoRow
            icon={<Calendar className="h-4 w-4" />}
            label="Sale Date"
            value={formatDate(lead.saleDate)}
          />
          <InfoRow
            icon={<Hash className="h-4 w-4" />}
            label="Parcel ID"
            value={lead.parcelId}
          />
          <InfoRow
            icon={<FileText className="h-4 w-4" />}
            label="Deed Book / Page"
            value={
              lead.deedBook || lead.deedPage
                ? [lead.deedBook, lead.deedPage].filter(Boolean).join(' / ')
                : null
            }
          />
        </div>
      </div>

      {/* Buyer Information */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
          <User className="h-4 w-4" />
          Buyer Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            icon={<User className="h-4 w-4" />}
            label="Name"
            value={lead.buyerName}
          />
          <InfoRow
            icon={<Building2 className="h-4 w-4" />}
            label="Company"
            value={lead.buyerCompany}
          />
          <div className="flex items-start gap-3">
            <div className="text-amber-500 mt-0.5">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Email
              </p>
              {lead.buyerEmail ? (
                <a
                  href={`mailto:${lead.buyerEmail}`}
                  className="text-sm text-amber-600 hover:underline mt-0.5 block"
                >
                  {lead.buyerEmail}
                </a>
              ) : (
                <p className="text-sm text-gray-700 mt-0.5">--</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-amber-500 mt-0.5">
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Phone
              </p>
              {lead.buyerPhone ? (
                <a
                  href={`tel:${lead.buyerPhone}`}
                  className="text-sm text-amber-600 hover:underline mt-0.5 block"
                >
                  {lead.buyerPhone}
                </a>
              ) : (
                <p className="text-sm text-gray-700 mt-0.5">--</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seller Information */}
      {lead.sellerName && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
            <User className="h-4 w-4" />
            Seller Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow
              icon={<User className="h-4 w-4" />}
              label="Seller Name"
              value={lead.sellerName}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {lead.tags.map((tag) => (
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
      {lead.notes && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Notes
          </h2>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {lead.notes}
          </p>
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
        {lead.createdAt && (
          <span>
            Created{' '}
            {new Date(lead.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        )}
        {lead.updatedAt && (
          <>
            <Separator orientation="vertical" className="h-3 bg-gray-200" />
            <span>
              Updated{' '}
              {new Date(lead.updatedAt).toLocaleDateString('en-US', {
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

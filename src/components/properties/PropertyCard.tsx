'use client'

import { useRouter } from 'next/navigation'
import { Building2, MapPin, Ruler } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '$0'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0'
  return new Intl.NumberFormat('en-US').format(value)
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  commercial: 'Commercial',
  residential: 'Residential',
  mixed_use: 'Mixed Use',
  'mixed-use': 'Mixed Use',
  industrial: 'Industrial',
  retail: 'Retail',
  office: 'Office',
  warehouse: 'Warehouse',
  hotel: 'Hotel',
  hospitality: 'Hospitality',
  healthcare: 'Healthcare',
  multifamily: 'Multifamily',
  other: 'Other',
}

interface PropertyCardProps {
  property: {
    id: string
    address: string
    city?: string | null
    state?: string | null
    zip?: string | null
    propertyType: string
    purchasePrice: string | number
    buildingValue?: string | number | null
    landValue?: string | number | null
    squareFootage?: number | null
    clientName?: string | null
  }
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const router = useRouter()

  const purchasePrice = typeof property.purchasePrice === 'string'
    ? parseFloat(property.purchasePrice)
    : property.purchasePrice
  const buildingValue = property.buildingValue
    ? typeof property.buildingValue === 'string'
      ? parseFloat(property.buildingValue)
      : property.buildingValue
    : null
  const landValue = property.landValue
    ? typeof property.landValue === 'string'
      ? parseFloat(property.landValue)
      : property.landValue
    : null

  const buildingPct = buildingValue && purchasePrice > 0
    ? Math.round((buildingValue / purchasePrice) * 100)
    : null
  const landPct = landValue && purchasePrice > 0
    ? Math.round((landValue / purchasePrice) * 100)
    : null

  const location = [property.city, property.state].filter(Boolean).join(', ')

  return (
    <div
      className="glass-card-hover p-5 cursor-pointer group"
      onClick={() => router.push(`/properties/${property.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(201,168,76,0.1)] group-hover:bg-[rgba(201,168,76,0.2)] transition-colors">
            <Building2 className="h-5 w-5 text-[#C9A84C]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#F8FAFC] truncate max-w-[200px]">
              {property.address}
            </p>
            {location && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-[#64748B]" />
                <p className="text-xs text-[#64748B]">{location}</p>
              </div>
            )}
          </div>
        </div>
        <Badge
          variant="secondary"
          className="bg-[rgba(201,168,76,0.1)] text-[#C9A84C] border-[rgba(201,168,76,0.2)] text-[10px] shrink-0"
        >
          {PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType}
        </Badge>
      </div>

      {/* Purchase Price */}
      <div className="mb-4">
        <p className="text-2xl font-bold text-gold-gradient">
          {formatCurrency(purchasePrice)}
        </p>
        <p className="text-xs text-[#64748B] mt-0.5">Purchase Price</p>
      </div>

      {/* Building / Land Split */}
      {(buildingValue || landValue) && (
        <div className="mb-4">
          <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-[rgba(255,255,255,0.05)]">
            {buildingPct !== null && (
              <div
                className="bg-[#3B82F6] rounded-full transition-all"
                style={{ width: `${buildingPct}%` }}
              />
            )}
            {landPct !== null && (
              <div
                className="bg-[#64748B] rounded-full transition-all"
                style={{ width: `${landPct}%` }}
              />
            )}
          </div>
          <div className="flex justify-between mt-1.5">
            {buildingValue && (
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-[#3B82F6]" />
                <span className="text-xs text-[#94A3B8]">
                  Building {formatCurrency(buildingValue)}
                </span>
              </div>
            )}
            {landValue && (
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-[#64748B]" />
                <span className="text-xs text-[#94A3B8]">
                  Land {formatCurrency(landValue)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[rgba(201,168,76,0.08)]">
        {property.squareFootage && (
          <div className="flex items-center gap-1.5">
            <Ruler className="h-3.5 w-3.5 text-[#64748B]" />
            <span className="text-xs text-[#94A3B8]">
              {formatNumber(property.squareFootage)} sqft
            </span>
          </div>
        )}
        {property.clientName && (
          <span className="text-xs text-[#64748B] truncate max-w-[120px]">
            {property.clientName}
          </span>
        )}
      </div>
    </div>
  )
}

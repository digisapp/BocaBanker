'use client'

import { useEffect, useState, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { useRouter } from 'next/navigation'
import { Building2, Plus, Search, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import PropertyCard from '@/components/properties/PropertyCard'
import { RoleGate } from '@/components/shared/RoleGate'

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

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'residential', label: 'Residential' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'retail', label: 'Retail' },
  { value: 'office', label: 'Office' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'multifamily', label: 'Multifamily' },
  { value: 'other', label: 'Other' },
]

const TYPE_LABELS: Record<string, string> = {
  commercial: 'Commercial',
  residential: 'Residential',
  mixed_use: 'Mixed Use',
  'mixed-use': 'Mixed Use',
  industrial: 'Industrial',
  retail: 'Retail',
  office: 'Office',
  warehouse: 'Warehouse',
  hotel: 'Hotel',
  multifamily: 'Multifamily',
  other: 'Other',
}

interface Property {
  id: string
  address: string
  city: string | null
  state: string | null
  zip: string | null
  propertyType: string
  purchasePrice: string
  buildingValue: string | null
  landValue: string | null
  squareFootage: number | null
  clientName: string | null
  createdAt: string
}

export default function PropertiesPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  })

  const fetchProperties = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      if (search) params.set('search', search)
      if (propertyType) params.set('property_type', propertyType)

      const res = await fetch(`/api/properties?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')

      const data = await res.json()
      setProperties(data.properties)
      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }))
    } catch (error) {
      logger.error('properties-page', 'Error fetching properties', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search, propertyType])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pagination.total} {pagination.total === 1 ? 'property' : 'properties'} total
          </p>
        </div>
        <RoleGate permission="canCreate">
          <Button
            onClick={() => router.push('/properties/new')}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </RoleGate>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by address or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>

          <Select value={propertyType} onValueChange={(val) => { setPropertyType(val); setPagination((p) => ({ ...p, page: 1 })) }}>
            <SelectTrigger className="w-full sm:w-[180px] bg-gray-50 border-gray-200 text-gray-900">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              {PROPERTY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value || '_all'} className="text-gray-900 focus:bg-amber-50 focus:text-amber-600">
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1 border border-gray-200 rounded-lg p-0.5">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon-sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-amber-50 text-amber-600' : 'text-gray-500'}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="icon-sm"
              onClick={() => setViewMode('table')}
              className={viewMode === 'table' ? 'bg-amber-50 text-amber-600' : 'text-gray-500'}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[220px] rounded-xl" />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Building2 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No properties found</h3>
          <p className="text-gray-500 mb-6">
            {search || propertyType
              ? 'Try adjusting your filters.'
              : 'Add your first property to get started.'}
          </p>
          {!search && !propertyType && (
            <RoleGate permission="canCreate">
              <Button
                onClick={() => router.push('/properties/new')}
                className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </RoleGate>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-100">
                <TableHead className="text-amber-600">Address</TableHead>
                <TableHead className="text-amber-600">Type</TableHead>
                <TableHead className="text-amber-600 text-right">Purchase Price</TableHead>
                <TableHead className="text-amber-600">Client</TableHead>
                <TableHead className="text-amber-600 text-right">Sqft</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((property) => (
                <TableRow
                  key={property.id}
                  className="border-gray-100 cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/properties/${property.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{property.address}</p>
                      <p className="text-xs text-gray-500">
                        {[property.city, property.state].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="bg-amber-50 text-amber-600 border-amber-200 text-[10px]"
                    >
                      {TYPE_LABELS[property.propertyType] || property.propertyType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-gray-900 font-medium">
                    {formatCurrency(property.purchasePrice)}
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {property.clientName || '-'}
                  </TableCell>
                  <TableCell className="text-right text-gray-500 text-sm">
                    {property.squareFootage
                      ? new Intl.NumberFormat('en-US').format(property.squareFootage)
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500 px-3">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

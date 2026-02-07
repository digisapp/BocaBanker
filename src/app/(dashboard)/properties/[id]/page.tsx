'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  MapPin,
  DollarSign,
  Calendar,
  Ruler,
  Pencil,
  Trash2,
  FileBarChart,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

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
  hospitality: 'Hospitality',
  healthcare: 'Healthcare',
  multifamily: 'Multifamily',
  other: 'Other',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-blue-50 text-blue-600',
  completed: 'bg-emerald-50 text-emerald-600',
}

interface PropertyDetail {
  id: string
  address: string
  city: string | null
  state: string | null
  zip: string | null
  propertyType: string
  purchasePrice: string
  purchaseDate: string | null
  buildingValue: string | null
  landValue: string | null
  squareFootage: number | null
  yearBuilt: number | null
  description: string | null
  clientId: string | null
  clientName: string | null
  clientCompany: string | null
  createdAt: string
}

interface Study {
  id: string
  studyName: string
  status: string
  totalFirstYearDeduction: string | null
  totalTaxSavings: string | null
  createdAt: string
}

export default function PropertyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [studies, setStudies] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function fetchProperty() {
      try {
        const res = await fetch(`/api/properties/${id}`)
        if (!res.ok) throw new Error('Not found')
        const data = await res.json()
        setProperty(data.property)
        setStudies(data.studies || [])
      } catch (error) {
        console.error('Error:', error)
        router.push('/properties')
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchProperty()
  }, [id, router])

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/properties')
      }
    } catch (error) {
      console.error('Error deleting:', error)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[200px] rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-[120px] rounded-xl" />
          <Skeleton className="h-[120px] rounded-xl" />
          <Skeleton className="h-[120px] rounded-xl" />
        </div>
      </div>
    )
  }

  if (!property) return null

  const location = [property.city, property.state, property.zip].filter(Boolean).join(', ')

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/properties')}
            className="text-gray-500 hover:text-amber-600 hover:bg-amber-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{property.address}</h1>
              <Badge
                variant="secondary"
                className="bg-amber-50 text-amber-600 border-amber-200"
              >
                {TYPE_LABELS[property.propertyType] || property.propertyType}
              </Badge>
            </div>
            {location && (
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-sm text-gray-500">{location}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/properties/${id}/edit`)}
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="h-4 w-4 mr-1.5" />
            Edit
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white border-gray-200">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-gray-900">Delete Property</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-500">
                  Are you sure you want to delete this property? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-gray-200 text-gray-700">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-500 text-white hover:bg-red-600"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Purchase Price</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">
            {formatCurrency(property.purchasePrice)}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-[#3B82F6]" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Building Value</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(property.buildingValue)}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Land Value</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(property.landValue)}
          </p>
        </div>
      </div>

      {/* Property Details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {property.squareFootage && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Ruler className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs text-gray-500">Square Footage</span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {new Intl.NumberFormat('en-US').format(property.squareFootage)} sqft
              </p>
            </div>
          )}

          {property.yearBuilt && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs text-gray-500">Year Built</span>
              </div>
              <p className="text-sm font-medium text-gray-900">{property.yearBuilt}</p>
            </div>
          )}

          {property.purchaseDate && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs text-gray-500">Purchase Date</span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {new Date(property.purchaseDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}

          {property.clientName && (
            <div>
              <span className="text-xs text-gray-500">Client</span>
              <p className="text-sm font-medium text-gray-900 mt-1">{property.clientName}</p>
              {property.clientCompany && (
                <p className="text-xs text-gray-500">{property.clientCompany}</p>
              )}
            </div>
          )}
        </div>

        {property.description && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-500">Description</span>
            <p className="text-sm text-gray-500 mt-1">{property.description}</p>
          </div>
        )}
      </div>

      {/* Linked Studies */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Cost Segregation Studies</h2>
          </div>
          <Button
            size="sm"
            onClick={() => router.push(`/studies/new?property_id=${id}`)}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Study
          </Button>
        </div>

        {studies.length === 0 ? (
          <div className="text-center py-8">
            <FileBarChart className="h-10 w-10 text-gray-500 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No studies for this property yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Create a cost segregation study to analyze tax savings.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {studies.map((study) => (
              <div
                key={study.id}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100 hover:border-amber-200 cursor-pointer transition-all"
                onClick={() => router.push(`/studies/${study.id}`)}
              >
                <div className="flex items-center gap-3">
                  <FileBarChart className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{study.studyName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(study.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {study.totalFirstYearDeduction && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-amber-600">
                        {formatCurrency(study.totalFirstYearDeduction)}
                      </p>
                      <p className="text-[10px] text-gray-500">First Year</p>
                    </div>
                  )}
                  <Badge
                    className={STATUS_COLORS[study.status] || STATUS_COLORS.draft}
                  >
                    {study.status === 'in_progress' ? 'In Progress' : study.status.charAt(0).toUpperCase() + study.status.slice(1)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

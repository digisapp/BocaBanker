'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  FileBarChart,
  Play,
  Printer,
  Pencil,
  Trash2,
  Loader2,
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
import StudyResults from '@/components/studies/StudyResults'

function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '-'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  completed: 'Completed',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-50 text-blue-600',
  completed: 'bg-emerald-50 text-emerald-600',
}

interface StudyDetail {
  id: string
  studyName: string
  status: string
  taxRate: string
  discountRate: string | null
  bonusDepreciationRate: string | null
  studyYear: number
  results: Record<string, unknown> | null
  totalFirstYearDeduction: string | null
  totalTaxSavings: string | null
  npvTaxSavings: string | null
  notes: string | null
  propertyId: string | null
  propertyName: string | null
  propertyAddress: string | null
  propertyType: string | null
  purchasePrice: string | null
  clientName: string | null
  clientCompany: string | null
  createdAt: string
}

interface StudyAsset {
  id: string
  assetName: string
  assetCategory: string
  recoveryPeriod: number
  costBasis: string
  bonusEligible: boolean | null
}

export default function StudyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [study, setStudy] = useState<StudyDetail | null>(null)
  const [assets, setAssets] = useState<StudyAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function fetchStudy() {
    try {
      const res = await fetch(`/api/studies/${id}`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      setStudy(data.study)
      setAssets(data.assets || [])
    } catch (error) {
      console.error('Error:', error)
      router.push('/studies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchStudy()
  }, [id])

  async function handleCalculate() {
    setCalculating(true)
    try {
      const res = await fetch(`/api/studies/${id}/calculate`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Calculation failed')
      }

      // Refresh the study data
      await fetchStudy()
    } catch (error) {
      console.error('Error calculating:', error)
      alert(error instanceof Error ? error.message : 'Calculation failed')
    } finally {
      setCalculating(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/studies/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/studies')
      }
    } catch (error) {
      console.error('Error deleting:', error)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[350px] rounded-xl" />
      </div>
    )
  }

  if (!study) return null

  const hasResults = study.results && study.status === 'completed'

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/studies')}
            className="text-gray-500 hover:text-amber-600 hover:bg-amber-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{study.studyName}</h1>
              <Badge className={STATUS_COLORS[study.status] || STATUS_COLORS.draft}>
                {STATUS_LABELS[study.status] || study.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              {study.propertyName && <span>{study.propertyName}</span>}
              {study.clientName && (
                <>
                  <span className="text-gray-300">|</span>
                  <span>{study.clientName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Calculate button for draft/in_progress studies */}
          {study.status !== 'completed' && (
            <Button
              onClick={handleCalculate}
              disabled={calculating}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90"
            >
              {calculating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Calculating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Calculation
                </>
              )}
            </Button>
          )}

          {/* Print button for completed studies */}
          {hasResults && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/studies/${id}/report`)}
              className="border-gray-200 text-gray-500 hover:text-amber-600 hover:bg-amber-50"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Print Report
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white border-gray-200">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-gray-900">Delete Study</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-500">
                  Are you sure? This will permanently delete this study and its results.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-gray-200 text-gray-500">
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

      {/* Study Info (shown when no results or alongside results) */}
      {!hasResults && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <span className="text-xs text-gray-400">Property</span>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {study.propertyName || '-'}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Property Type</span>
              <p className="text-sm font-medium text-gray-900 mt-1 capitalize">
                {study.propertyType?.replace('_', ' ') || '-'}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Purchase Price</span>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {formatCurrency(study.purchasePrice)}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Study Year</span>
              <p className="text-sm font-medium text-gray-900 mt-1">{study.studyYear}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <span className="text-xs text-gray-400">Tax Rate</span>
              <p className="text-sm font-medium text-gray-900 mt-1">{study.taxRate}%</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Discount Rate</span>
              <p className="text-sm font-medium text-gray-900 mt-1">{study.discountRate || '5'}%</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Bonus Depreciation</span>
              <p className="text-sm font-medium text-gray-900 mt-1">{study.bonusDepreciationRate || '100'}%</p>
            </div>
          </div>

          {/* Assets */}
          {assets.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-amber-600 mb-3">Study Assets</h4>
              <div className="space-y-2">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <div>
                      <p className="text-sm text-gray-900">{asset.assetName}</p>
                      <p className="text-xs text-gray-400">
                        {asset.recoveryPeriod === 0 ? 'Non-depreciable' : `${asset.recoveryPeriod}-year recovery`}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(asset.costBasis)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assets.length === 0 && (
            <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
              <FileBarChart className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                No assets have been added to this study.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Results Dashboard */}
      {hasResults && (
        <StudyResults results={study.results as StudyResults['results']} />
      )}
    </div>
  )
}

// Helper type for the results prop
type StudyResults = {
  results: {
    summary: {
      totalReclassified: number
      totalFirstYearDeduction: number
      totalTaxSavings: number
      npvTaxSavings: number
      effectiveRate: number
    }
    assetBreakdown: {
      category: string
      amount: number
      percentage: number
      recoveryPeriod: number
    }[]
    depreciationSchedule: {
      year: number
      accelerated: number
      straightLine: number
      difference: number
    }[]
    taxSavingsSchedule: {
      year: number
      withCostSeg: number
      withoutCostSeg: number
      savings: number
      cumulativeSavings: number
    }[]
    firstYearAnalysis: {
      bonusDepreciation: number
      regularFirstYear: number
      totalFirstYear: number
      taxSavings: number
    }
  }
}

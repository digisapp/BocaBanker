'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FileBarChart, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

interface Study {
  id: string
  studyName: string
  status: string
  studyYear: number
  totalFirstYearDeduction: string | null
  totalTaxSavings: string | null
  npvTaxSavings: string | null
  propertyName: string | null
  clientName: string | null
  createdAt: string
}

export default function StudiesPage() {
  const router = useRouter()
  const [studies, setStudies] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchStudies = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/studies?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')

      const data = await res.json()
      setStudies(data.studies)
      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }))
    } catch (error) {
      console.error('Error fetching studies:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, statusFilter])

  useEffect(() => {
    fetchStudies()
  }, [fetchStudies])

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Studies</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pagination.total} cost segregation {pagination.total === 1 ? 'study' : 'studies'}
          </p>
        </div>
        <Button
          onClick={() => router.push('/studies/new')}
          className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Study
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val === '_all' ? '' : val)
              setPagination((p) => ({ ...p, page: 1 }))
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px] bg-gray-50 border-gray-200 text-gray-900">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value || '_all'}
                  className="text-gray-900 focus:bg-amber-50 focus:text-amber-700"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        </div>
      ) : studies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <FileBarChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No studies found</h3>
          <p className="text-gray-500 mb-6">
            {statusFilter
              ? 'Try adjusting your filter.'
              : 'Create your first cost segregation study.'}
          </p>
          {!statusFilter && (
            <Button
              onClick={() => router.push('/studies/new')}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Study
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-100">
                <TableHead className="text-amber-600">Study Name</TableHead>
                <TableHead className="text-amber-600">Property</TableHead>
                <TableHead className="text-amber-600">Client</TableHead>
                <TableHead className="text-amber-600 text-center">Status</TableHead>
                <TableHead className="text-amber-600 text-right">First Year Deduction</TableHead>
                <TableHead className="text-amber-600 text-right">Total Savings</TableHead>
                <TableHead className="text-amber-600">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studies.map((study) => (
                <TableRow
                  key={study.id}
                  className="border-gray-100 cursor-pointer hover:bg-amber-50/50"
                  onClick={() => router.push(`/studies/${study.id}`)}
                >
                  <TableCell>
                    <p className="text-sm font-medium text-gray-900">{study.studyName}</p>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">
                    {study.propertyName || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {study.clientName || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={STATUS_COLORS[study.status] || STATUS_COLORS.draft}>
                      {STATUS_LABELS[study.status] || study.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-gray-900">
                    {formatCurrency(study.totalFirstYearDeduction)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-[#10B981]">
                    {formatCurrency(study.totalTaxSavings)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {new Date(study.createdAt).toLocaleDateString()}
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
            className="border-gray-200 text-gray-500 hover:text-amber-600"
          >
            Previous
          </Button>
          <span className="text-sm text-gray-400 px-3">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            className="border-gray-200 text-gray-500 hover:text-amber-600"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

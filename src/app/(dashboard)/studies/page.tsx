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
  draft: 'bg-[rgba(100,116,139,0.15)] text-[#94A3B8]',
  in_progress: 'bg-[rgba(59,130,246,0.15)] text-[#3B82F6]',
  completed: 'bg-[rgba(16,185,129,0.15)] text-[#10B981]',
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
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Studies</h1>
          <p className="text-sm text-[#64748B] mt-1">
            {pagination.total} cost segregation {pagination.total === 1 ? 'study' : 'studies'}
          </p>
        </div>
        <Button
          onClick={() => router.push('/studies/new')}
          className="bg-gold-gradient text-[#0F1B2D] font-semibold hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Study
        </Button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val === '_all' ? '' : val)
              setPagination((p) => ({ ...p, page: 1 }))
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px] bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-[#F8FAFC]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A2B45] border-[rgba(201,168,76,0.15)]">
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value || '_all'}
                  className="text-[#F8FAFC] focus:bg-[rgba(201,168,76,0.1)] focus:text-[#C9A84C]"
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
        <div className="glass-card overflow-hidden">
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        </div>
      ) : studies.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FileBarChart className="h-12 w-12 text-[#64748B] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-2">No studies found</h3>
          <p className="text-[#64748B] mb-6">
            {statusFilter
              ? 'Try adjusting your filter.'
              : 'Create your first cost segregation study.'}
          </p>
          {!statusFilter && (
            <Button
              onClick={() => router.push('/studies/new')}
              className="bg-gold-gradient text-[#0F1B2D] font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Study
            </Button>
          )}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-[rgba(201,168,76,0.08)]">
                <TableHead className="text-[#C9A84C]">Study Name</TableHead>
                <TableHead className="text-[#C9A84C]">Property</TableHead>
                <TableHead className="text-[#C9A84C]">Client</TableHead>
                <TableHead className="text-[#C9A84C] text-center">Status</TableHead>
                <TableHead className="text-[#C9A84C] text-right">First Year Deduction</TableHead>
                <TableHead className="text-[#C9A84C] text-right">Total Savings</TableHead>
                <TableHead className="text-[#C9A84C]">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studies.map((study) => (
                <TableRow
                  key={study.id}
                  className="border-[rgba(201,168,76,0.08)] cursor-pointer hover:bg-[rgba(201,168,76,0.05)]"
                  onClick={() => router.push(`/studies/${study.id}`)}
                >
                  <TableCell>
                    <p className="text-sm font-medium text-[#F8FAFC]">{study.studyName}</p>
                  </TableCell>
                  <TableCell className="text-sm text-[#94A3B8] max-w-[200px] truncate">
                    {study.propertyName || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-[#94A3B8]">
                    {study.clientName || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={STATUS_COLORS[study.status] || STATUS_COLORS.draft}>
                      {STATUS_LABELS[study.status] || study.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-[#F8FAFC]">
                    {formatCurrency(study.totalFirstYearDeduction)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-[#10B981]">
                    {formatCurrency(study.totalTaxSavings)}
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B]">
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
            className="border-[rgba(201,168,76,0.15)] text-[#94A3B8] hover:text-[#C9A84C]"
          >
            Previous
          </Button>
          <span className="text-sm text-[#64748B] px-3">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            className="border-[rgba(201,168,76,0.15)] text-[#94A3B8] hover:text-[#C9A84C]"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

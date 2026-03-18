'use client'

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import {
  Landmark,
  Plus,
  Loader2,
  MoreHorizontal,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RoleGate } from '@/components/shared/RoleGate'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LoanStatusBadge } from '@/components/mortgage/LoanStatusBadge'
import { toast } from 'sonner'

interface LoanRow {
  id: string
  borrowerName: string | null
  borrowerEmail: string | null
  propertyAddress: string | null
  loanAmount: string | null
  loanType: string | null
  interestRate: string | null
  status: string | null
  estimatedClosingDate: string | null
  commissionBps: number | null
  commissionAmount: string | null
  lenderName: string | null
  createdAt: string | null
}

const loanTypeLabels: Record<string, string> = {
  conventional: 'Conv',
  fha: 'FHA',
  va: 'VA',
  usda: 'USDA',
  jumbo: 'Jumbo',
  heloc: 'HELOC',
  commercial: 'Comm',
  other: 'Other',
}

type SortKey = 'borrowerName' | 'loanAmount' | 'status' | 'loanType' | 'createdAt' | 'estimatedClosingDate'

export default function LoansPage() {
  const router = useRouter()
  const [loans, setLoans] = useState<LoanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const totalPages = Math.ceil(total / limit)

  const fetchLoans = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort: sortKey,
        order: sortOrder,
      })
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter !== 'all') params.set('loanType', typeFilter)

      const res = await fetch(`/api/loans?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setLoans(data.loans)
      setTotal(data.total)
    } catch (error) {
      logger.error('loans-page', 'Failed to fetch loans', error)
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, statusFilter, typeFilter, sortKey, sortOrder])

  useEffect(() => {
    fetchLoans()
  }, [fetchLoans])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this loan? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/loans/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Loan deleted')
      fetchLoans()
    } catch {
      toast.error('Failed to delete loan')
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column)
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1 text-gray-400" />
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 ml-1 text-amber-500" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 ml-1 text-amber-500" />
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Landmark className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Loan Pipeline</h1>
            <p className="text-sm text-gray-500">
              {total} loan{total !== 1 ? 's' : ''} in pipeline
            </p>
          </div>
        </div>
        <RoleGate permission="canCreate">
          <Button
            onClick={() => router.push('/mortgage/loans/new')}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Loan
          </Button>
        </RoleGate>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search borrower, address, lender..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[160px] bg-white border-gray-200 text-gray-900">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pre_qual">Pre-Qual</SelectItem>
            <SelectItem value="application">Application</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="underwriting">Underwriting</SelectItem>
            <SelectItem value="clear_to_close">Clear to Close</SelectItem>
            <SelectItem value="funded">Funded</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[150px] bg-white border-gray-200 text-gray-900">
            <SelectValue placeholder="Loan Type" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="conventional">Conventional</SelectItem>
            <SelectItem value="fha">FHA</SelectItem>
            <SelectItem value="va">VA</SelectItem>
            <SelectItem value="usda">USDA</SelectItem>
            <SelectItem value="jumbo">Jumbo</SelectItem>
            <SelectItem value="heloc">HELOC</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : loans.length === 0 ? (
          <div className="text-center py-20">
            <Landmark className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No loans found</p>
            <p className="text-gray-400 text-sm mt-1">
              Create your first loan to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('borrowerName')}
                  >
                    <div className="flex items-center">
                      Borrower
                      <SortIcon column="borrowerName" />
                    </div>
                  </TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('loanAmount')}
                  >
                    <div className="flex items-center">
                      Amount
                      <SortIcon column="loanAmount" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('loanType')}
                  >
                    <div className="flex items-center">
                      Type
                      <SortIcon column="loanType" />
                    </div>
                  </TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      <SortIcon column="status" />
                    </div>
                  </TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow
                    key={loan.id}
                    className="cursor-pointer hover:bg-gray-50/50"
                    onClick={() => router.push(`/mortgage/loans/${loan.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {loan.borrowerName || '--'}
                        </p>
                        {loan.borrowerEmail && (
                          <p className="text-xs text-gray-500">
                            {loan.borrowerEmail}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-700 max-w-[200px] truncate">
                      {loan.propertyAddress || '--'}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">
                      {formatCurrency(loan.loanAmount, '--')}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {loan.loanType ? loanTypeLabels[loan.loanType] ?? loan.loanType : '--'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {loan.interestRate ? `${loan.interestRate}%` : '--'}
                    </TableCell>
                    <TableCell>
                      <LoanStatusBadge status={loan.status || 'pre_qual'} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {loan.commissionAmount
                        ? formatCurrency(loan.commissionAmount, '--')
                        : loan.commissionBps
                          ? `${loan.commissionBps} bps`
                          : '--'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-white border-gray-200"
                        >
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/mortgage/loans/${loan.id}`)
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <RoleGate permission="canDelete">
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(loan.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </RoleGate>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * limit + 1}–
            {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(1)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-700 px-3">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

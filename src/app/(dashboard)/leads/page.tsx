'use client'

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { useRouter } from 'next/navigation'
import {
  Target,
  Plus,
  Upload,
  Loader2,
  MoreHorizontal,
  Eye,
  UserCheck,
  Trash2,
  TrendingUp,
  DollarSign,
  Sparkles,
  Mail,
  Phone,
  Users,
  Building2,
  ChevronRight,
  X,
  LayoutList,
  Briefcase,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LeadImportModal } from '@/components/leads/LeadImportModal'

interface LeadRow {
  id: string
  propertyAddress: string | null
  propertyCity: string | null
  propertyState: string | null
  propertyType: string | null
  salePrice: string | null
  saleDate: string | null
  buyerName: string | null
  buyerCompany: string | null
  buyerEmail: string | null
  buyerPhone: string | null
  memberName: string | null
  memberAddress: string | null
  memberCity: string | null
  memberState: string | null
  memberZip: string | null
  status: string | null
  priority: string | null
}

interface PortfolioMember {
  memberName: string
  memberAddress: string | null
  memberCity: string | null
  memberState: string | null
  memberZip: string | null
  propertyCount: number
  totalValue: number
  latestPurchase: string | null
  cities: string[]
  properties: {
    id: string
    propertyAddress: string | null
    propertyCity: string | null
    salePrice: string | null
    saleDate: string | null
    buyerName: string | null
    propertyType: string | null
    status: string | null
  }[]
}

interface PortfolioStats {
  totalMembers: number
  multiPropertyOwners: number
  avgProperties: number
  totalValue: number
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

const priorityDotColor: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-gray-400',
}

const propertyTypeBadgeColor: Record<string, string> = {
  industrial: 'bg-slate-50 text-slate-600 border-slate-200',
  office: 'bg-sky-50 text-sky-600 border-sky-200',
  retail: 'bg-pink-50 text-pink-600 border-pink-200',
  multifamily: 'bg-violet-50 text-violet-600 border-violet-200',
  'mixed-use': 'bg-teal-50 text-teal-600 border-teal-200',
  other: 'bg-gray-50 text-gray-500 border-gray-200',
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function LeadsPage() {
  const router = useRouter()

  // View mode
  const [viewMode, setViewMode] = useState<'leads' | 'portfolio'>('leads')

  // Leads state
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [memberFilter, setMemberFilter] = useState('')

  // Portfolio state
  const [portfolios, setPortfolios] = useState<PortfolioMember[]>([])
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats>({
    totalMembers: 0,
    multiPropertyOwners: 0,
    avgProperties: 0,
    totalValue: 0,
  })
  const [portfolioLoading, setPortfolioLoading] = useState(false)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)

  // Leads stats
  const [stats, setStats] = useState({
    total: 0,
    newLeads: 0,
    avgSalePrice: 0,
    totalValue: 0,
  })

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '100',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(propertyTypeFilter !== 'all' && { property_type: propertyTypeFilter }),
        ...(priorityFilter !== 'all' && { priority: priorityFilter }),
        ...(memberFilter && { member: memberFilter }),
      })

      const res = await fetch(`/api/leads?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')

      const data = await res.json()
      setLeads(data.leads)
      setTotal(data.total)

      const allLeads: LeadRow[] = data.leads
      const newCount = allLeads.filter((l) => l.status === 'new').length
      const prices = allLeads
        .map((l) => (l.salePrice ? parseFloat(l.salePrice) : 0))
        .filter((p) => p > 0)
      const avg = prices.length > 0
        ? prices.reduce((a, b) => a + b, 0) / prices.length
        : 0
      const totalVal = prices.reduce((a, b) => a + b, 0)

      setStats({
        total: data.total,
        newLeads: newCount,
        avgSalePrice: avg,
        totalValue: totalVal,
      })
    } catch (error) {
      logger.error('leads-page', 'Failed to fetch leads', error)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, propertyTypeFilter, priorityFilter, memberFilter])

  const fetchPortfolios = useCallback(async () => {
    setPortfolioLoading(true)
    try {
      const res = await fetch('/api/leads/portfolio')
      if (!res.ok) throw new Error('Failed to fetch portfolios')
      const data = await res.json()
      setPortfolios(data.portfolios)
      setPortfolioStats(data.stats)
    } catch (error) {
      logger.error('leads-page', 'Failed to fetch portfolios', error)
    } finally {
      setPortfolioLoading(false)
    }
  }, [])

  useEffect(() => {
    if (viewMode === 'leads') {
      fetchLeads()
    } else {
      fetchPortfolios()
    }
  }, [viewMode, fetchLeads, fetchPortfolios])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      fetchLeads()
    } catch (error) {
      logger.error('leads-page', 'Failed to delete lead', error)
    }
  }

  const handleConvert = async (id: string) => {
    try {
      const res = await fetch(`/api/leads/${id}/convert`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to convert')
      const data = await res.json()
      router.push(`/clients/${data.clientId}`)
    } catch (error) {
      logger.error('leads-page', 'Failed to convert lead', error)
    }
  }

  const handleViewMemberLeads = (memberName: string) => {
    setMemberFilter(memberName)
    setViewMode('leads')
  }

  const clearMemberFilter = () => {
    setMemberFilter('')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Target className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
            <p className="text-sm text-gray-500">
              Property purchase leads
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-amber-200 text-amber-600 ml-2 hidden sm:inline-flex"
          >
            {total}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('leads')}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-all ${
                viewMode === 'leads'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5 mr-1.5" />
              All Leads
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('portfolio')}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-all ${
                viewMode === 'portfolio'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5 mr-1.5" />
              Portfolio
            </Button>
          </div>

          <RoleGate permission="canCreate">
            <LeadImportModal
              open={importOpen}
              onOpenChange={setImportOpen}
              onImportComplete={fetchLeads}
            >
              <Button
                variant="outline"
                className="border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </LeadImportModal>
          </RoleGate>
          <RoleGate permission="canCreate">
            <Button
              onClick={() => router.push('/leads/new')}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </RoleGate>
        </div>
      </div>

      {/* Member filter chip */}
      {memberFilter && viewMode === 'leads' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filtered by member:</span>
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-700 text-sm pl-3 pr-1.5 py-1 flex items-center gap-1.5"
          >
            <Users className="h-3.5 w-3.5" />
            {memberFilter}
            <button
              onClick={clearMemberFilter}
              className="ml-1 p-0.5 rounded-full hover:bg-amber-200 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      {viewMode === 'leads' ? (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px] bg-gray-50 border-gray-200 text-gray-900">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
              <SelectTrigger className="w-[170px] bg-gray-50 border-gray-200 text-gray-900">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="industrial">Industrial</SelectItem>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="multifamily">Multifamily</SelectItem>
                <SelectItem value="mixed-use">Mixed-Use</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px] bg-gray-50 border-gray-200 text-gray-900">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Total Leads</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">New Leads</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.newLeads}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Avg Sale Price</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.avgSalePrice)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Total Value</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
            </div>
          </div>

          {/* Leads Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : leads.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No leads found</h3>
              <p className="text-sm text-gray-500">
                Try adjusting your filters or add a new lead to get started.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 hover:bg-transparent">
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                        Property Address
                      </TableHead>
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                        Property Type
                      </TableHead>
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                        Sale Price
                      </TableHead>
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                        Sale Date
                      </TableHead>
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                        Buyer / LLC
                      </TableHead>
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                        Member / Person
                      </TableHead>
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                        Contact
                      </TableHead>
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                        Status
                      </TableHead>
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                        Priority
                      </TableHead>
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider w-[50px]">
                        {/* Actions */}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => {
                      const status = lead.status ?? 'new'
                      const priority = lead.priority ?? 'medium'
                      const propType = lead.propertyType?.toLowerCase() ?? 'other'

                      return (
                        <TableRow
                          key={lead.id}
                          className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/leads/${lead.id}`)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900">
                                {lead.propertyAddress || '--'}
                              </p>
                              {(lead.propertyCity || lead.propertyState) && (
                                <p className="text-xs text-gray-500">
                                  {[lead.propertyCity, lead.propertyState]
                                    .filter(Boolean)
                                    .join(', ')}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {lead.propertyType ? (
                              <Badge
                                variant="outline"
                                className={`${
                                  propertyTypeBadgeColor[propType] ??
                                  propertyTypeBadgeColor.other
                                } text-xs capitalize`}
                              >
                                {lead.propertyType}
                              </Badge>
                            ) : (
                              <span className="text-gray-500">--</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-gray-700 font-medium">
                              {formatCurrency(lead.salePrice)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-gray-500 text-sm">
                              {formatDate(lead.saleDate)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm text-gray-900">
                                {lead.buyerName || '--'}
                              </p>
                              {lead.buyerCompany && (
                                <p className="text-xs text-gray-500">
                                  {lead.buyerCompany}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {lead.memberName ? (
                              <div>
                                <p className="text-sm text-gray-900">
                                  {lead.memberName}
                                </p>
                                {(lead.memberCity || lead.memberState) && (
                                  <p className="text-xs text-gray-500">
                                    {[lead.memberAddress, lead.memberCity, lead.memberState].filter(Boolean).join(', ')}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">--</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {lead.buyerEmail ? (
                                <a
                                  href={`mailto:${lead.buyerEmail}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1.5 text-xs text-amber-600 hover:underline"
                                >
                                  <Mail className="h-3 w-3" />
                                  {lead.buyerEmail}
                                </a>
                              ) : (
                                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                  <Mail className="h-3 w-3" />
                                  --
                                </span>
                              )}
                              {lead.buyerPhone ? (
                                <a
                                  href={`tel:${lead.buyerPhone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1.5 text-xs text-amber-600 hover:underline"
                                >
                                  <Phone className="h-3 w-3" />
                                  {lead.buyerPhone}
                                </a>
                              ) : (
                                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                  <Phone className="h-3 w-3" />
                                  --
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${
                                statusColorMap[status] ?? statusColorMap.new
                              } text-xs capitalize`}
                            >
                              {statusLabel[status] ?? status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  priorityDotColor[priority] ?? priorityDotColor.medium
                                }`}
                              />
                              <span className="text-sm text-gray-700 capitalize">
                                {priority}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-gray-500 hover:text-amber-600 h-8 w-8"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="bg-white border-gray-200"
                              >
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(`/leads/${lead.id}`)
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleConvert(lead.id)
                                  }}
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Convert to Client
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-gray-100" />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(lead.id)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ======== PORTFOLIO VIEW ======== */
        <>
          {/* Portfolio Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Total Owners</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{portfolioStats.totalMembers}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Multi-Property</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{portfolioStats.multiPropertyOwners}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Avg Properties</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{portfolioStats.avgProperties}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Total Value</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(portfolioStats.totalValue)}</p>
            </div>
          </div>

          {/* Portfolio Table */}
          {portfolioLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : portfolios.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No portfolio data yet</h3>
              <p className="text-sm text-gray-500">
                Member names are populated by the Sunbiz scraper. Check back after scraping completes.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 hover:bg-transparent">
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider w-[30px]" />
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                        Member / Owner
                      </TableHead>
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                        Properties
                      </TableHead>
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                        Total Value
                      </TableHead>
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                        Latest Purchase
                      </TableHead>
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                        Cities
                      </TableHead>
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                        Location
                      </TableHead>
                      <TableHead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider w-[100px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portfolios.map((portfolio) => {
                      const isExpanded = expandedMember === portfolio.memberName

                      return (
                        <>
                          <TableRow
                            key={portfolio.memberName}
                            className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                              isExpanded ? 'bg-amber-50/50' : ''
                            }`}
                            onClick={() =>
                              setExpandedMember(isExpanded ? null : portfolio.memberName)
                            }
                          >
                            <TableCell className="pl-4 pr-0">
                              <ChevronRight
                                className={`h-4 w-4 text-gray-400 transition-transform ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {portfolio.memberName}
                                </p>
                                {portfolio.memberAddress && (
                                  <p className="text-xs text-gray-500">
                                    {portfolio.memberAddress}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs font-semibold ${
                                  portfolio.propertyCount > 5
                                    ? 'border-red-200 bg-red-50 text-red-600'
                                    : portfolio.propertyCount > 1
                                    ? 'border-amber-200 bg-amber-50 text-amber-600'
                                    : 'border-gray-200 bg-gray-50 text-gray-600'
                                }`}
                              >
                                {portfolio.propertyCount} {portfolio.propertyCount === 1 ? 'property' : 'properties'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-gray-700 font-medium">
                                {formatCurrency(portfolio.totalValue)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-gray-500 text-sm">
                                {formatDate(portfolio.latestPurchase)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {portfolio.cities.slice(0, 3).map((city) => (
                                  <Badge
                                    key={city}
                                    variant="outline"
                                    className="text-xs bg-gray-50 text-gray-600 border-gray-200"
                                  >
                                    {city}
                                  </Badge>
                                ))}
                                {portfolio.cities.length > 3 && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-gray-50 text-gray-500 border-gray-200"
                                  >
                                    +{portfolio.cities.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {(portfolio.memberCity || portfolio.memberState) ? (
                                <span className="text-sm text-gray-500">
                                  {[portfolio.memberCity, portfolio.memberState]
                                    .filter(Boolean)
                                    .join(', ')}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">--</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewMemberLeads(portfolio.memberName)
                                }}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                View Leads
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Expanded properties */}
                          {isExpanded && (
                            <TableRow key={`${portfolio.memberName}-expanded`} className="hover:bg-transparent">
                              <TableCell colSpan={8} className="p-0">
                                <div className="bg-gray-50 border-y border-gray-100 px-8 py-3">
                                  <div className="space-y-2">
                                    {portfolio.properties.map((prop) => (
                                      <div
                                        key={prop.id}
                                        className="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-4 py-2.5 hover:border-amber-200 cursor-pointer transition-colors"
                                        onClick={() => router.push(`/leads/${prop.id}`)}
                                      >
                                        <div className="flex items-center gap-4">
                                          <div>
                                            <p className="text-sm font-medium text-gray-900">
                                              {prop.propertyAddress || '--'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              {prop.buyerName} {prop.propertyCity ? `· ${prop.propertyCity}` : ''}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                          {prop.propertyType && (
                                            <Badge
                                              variant="outline"
                                              className={`${
                                                propertyTypeBadgeColor[prop.propertyType.toLowerCase()] ??
                                                propertyTypeBadgeColor.other
                                              } text-xs capitalize`}
                                            >
                                              {prop.propertyType}
                                            </Badge>
                                          )}
                                          <span className="text-sm font-medium text-gray-700 w-28 text-right">
                                            {formatCurrency(prop.salePrice)}
                                          </span>
                                          <span className="text-xs text-gray-500 w-24 text-right">
                                            {formatDate(prop.saleDate)}
                                          </span>
                                          {prop.status && (
                                            <Badge
                                              variant="outline"
                                              className={`${
                                                statusColorMap[prop.status] ?? statusColorMap.new
                                              } text-xs capitalize w-24 justify-center`}
                                            >
                                              {statusLabel[prop.status] ?? prop.status}
                                            </Badge>
                                          )}
                                          <ChevronRight className="h-4 w-4 text-gray-300" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

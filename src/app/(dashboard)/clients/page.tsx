'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { useRouter } from 'next/navigation'
import { Plus, Upload, Users, Loader2 } from 'lucide-react'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import {
  ClientsTable,
  CLIENT_SORT_KEYS,
  type ClientRow,
} from '@/components/clients/ClientsTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { RoleGate } from '@/components/shared/RoleGate'
import EmptyState from '@/components/shared/EmptyState'
import PageHeader from '@/components/shared/PageHeader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ClientsPage() {
  const router = useRouter()

  const [clients, setClients] = useState<ClientRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [sorting, setSorting] = useState<SortingState>([])

  // Debounce search; any filter change returns to the first page
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }))
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const handleSortingChange = (next: SortingState) => {
    setSorting(next)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const fetchClients = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const sortCol = sorting[0]
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        ...(sortCol && CLIENT_SORT_KEYS[sortCol.id] && {
          sort: CLIENT_SORT_KEYS[sortCol.id],
          order: sortCol.desc ? 'desc' : 'asc',
        }),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      })

      const res = await fetch(`/api/clients?${params}`, { signal })
      if (!res.ok) throw new Error('Failed to fetch')

      const data = await res.json()
      setClients(data.clients)
      setTotal(data.total)
      setLoading(false)
    } catch (error) {
      // An aborted request means a newer one is in flight; leave its state alone
      if (signal?.aborted) return
      logger.error('clients-page', 'Failed to fetch clients', error)
      toast.error('Failed to load clients')
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, pagination, sorting])

  useEffect(() => {
    const controller = new AbortController()
    fetchClients(controller.signal)
    return () => controller.abort()
  }, [fetchClients])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return

    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Client deleted')
      // Step back a page if we just removed the last row on this one
      if (clients.length === 1 && pagination.pageIndex > 0) {
        setPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))
      } else {
        fetchClients()
      }
    } catch (error) {
      logger.error('clients-page', 'Failed to delete client', error)
      toast.error('Failed to delete client')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        icon={Users}
        title="Clients"
        description="Manage your client database"
        badge={
          <Badge variant="outline" className="border-amber-200 text-amber-700">
            {total}
          </Badge>
        }
        actions={
          <>
            <RoleGate permission="canCreate">
              <Button
                variant="outline"
                onClick={() => router.push('/clients/import')}
                className="border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </RoleGate>
            <RoleGate permission="canCreate">
              <Button
                onClick={() => router.push('/clients/new')}
                className="bg-navy text-white font-semibold hover:bg-navy-light"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </RoleGate>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search clients..."
          aria-label="Search clients"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
        />
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger aria-label="Filter by status" className="w-full sm:w-[160px] bg-gray-50 border-gray-200 text-gray-900">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-navy" />
        </div>
      ) : total === 0 && !debouncedSearch && statusFilter === 'all' ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add your first client, import a CSV, or convert a lead once they're ready to work with you."
          actionLabel="Add Client"
          actionHref="/clients/new"
        />
      ) : (
        <ClientsTable
          data={clients}
          rowCount={total}
          pagination={pagination}
          onPaginationChange={setPagination}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

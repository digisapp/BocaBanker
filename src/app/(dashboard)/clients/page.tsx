'use client'

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { useRouter } from 'next/navigation'
import { Plus, Upload, Users, Loader2 } from 'lucide-react'
import { ClientsTable, type ClientRow } from '@/components/clients/ClientsTable'
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

export default function ClientsPage() {
  const router = useRouter()

  const [clients, setClients] = useState<ClientRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '100',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      })

      const res = await fetch(`/api/clients?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')

      const data = await res.json()
      setClients(data.clients)
      setTotal(data.total)
    } catch (error) {
      logger.error('clients-page', 'Failed to fetch clients', error)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return

    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      fetchClients()
    } catch (error) {
      logger.error('clients-page', 'Failed to delete client', error)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Users className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-sm text-gray-500">
              Manage your client database
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
              className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </RoleGate>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-gray-50 border-gray-200 text-gray-900">
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
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <ClientsTable data={clients} onDelete={handleDelete} />
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { logger } from '@/lib/logger'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  UserCheck,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  User,
  FileText,
  Tag,
  StickyNote,
  Hash,
  Ruler,
  Loader2,
  CheckCircle,
  ExternalLink,
  Save,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RoleGate } from '@/components/shared/RoleGate'

interface LeadDetail {
  id: string
  propertyAddress: string | null
  propertyCity: string | null
  propertyCounty: string | null
  propertyState: string | null
  propertyZip: string | null
  propertyType: string | null
  salePrice: string | null
  saleDate: string | null
  parcelId: string | null
  deedBook: string | null
  deedPage: string | null
  buyerName: string | null
  buyerCompany: string | null
  buyerEmail: string | null
  buyerPhone: string | null
  sellerName: string | null
  memberName: string | null
  memberAddress: string | null
  memberCity: string | null
  memberState: string | null
  memberZip: string | null
  sunbizDocNumber: string | null
  squareFootage: string | null
  yearBuilt: string | null
  status: string | null
  priority: string | null
  source: string | null
  notes: string | null
  tags: string[] | null
  convertedClientId: string | null
  createdAt: string | null
  updatedAt: string | null
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

const priorityColorMap: Record<string, string> = {
  high: 'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  low: 'bg-gray-100 text-gray-500 border-gray-200',
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
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function LeadDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    status: '',
    priority: '',
    buyerEmail: '',
    buyerPhone: '',
    source: '',
    notes: '',
    tags: '',
  })

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const res = await fetch(`/api/leads/${params.id}`)
        if (!res.ok) throw new Error('Not found')
        const data = await res.json()
        setLead(data)
      } catch {
        router.push('/leads')
        return
      }

      setLoading(false)
    }

    fetchLead()
  }, [params.id, router])

  const handleConvert = async () => {
    setConverting(true)
    try {
      const res = await fetch(`/api/leads/${params.id}/convert`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to convert')
      const data = await res.json()
      // Redirect to the new property so user can start a study or run calculators
      if (data.propertyId) {
        router.push(`/properties/${data.propertyId}`)
      } else {
        router.push(`/clients/${data.clientId}`)
      }
    } catch (error) {
      logger.error('lead-detail', 'Failed to convert lead', error)
      setConverting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/leads/${params.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      router.push('/leads')
    } catch (error) {
      logger.error('lead-detail', 'Failed to delete lead', error)
    }
  }

  const startEditing = () => {
    if (!lead) return
    setEditForm({
      status: lead.status ?? 'new',
      priority: lead.priority ?? 'medium',
      buyerEmail: lead.buyerEmail ?? '',
      buyerPhone: lead.buyerPhone ?? '',
      source: lead.source ?? '',
      notes: lead.notes ?? '',
      tags: lead.tags?.join(', ') ?? '',
    })
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyAddress: lead!.propertyAddress,
          propertyType: lead!.propertyType,
          status: editForm.status,
          priority: editForm.priority,
          buyerEmail: editForm.buyerEmail || null,
          buyerPhone: editForm.buyerPhone || null,
          source: editForm.source || null,
          notes: editForm.notes || null,
          tags: editForm.tags,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const updated = await res.json()
      setLead(updated)
      setEditing(false)
    } catch (error) {
      logger.error('lead-detail', 'Failed to save lead', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!lead) return null

  const status = lead.status ?? 'new'
  const priority = lead.priority ?? 'medium'

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/leads')}
            className="text-gray-500 hover:text-amber-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {lead.propertyAddress || 'Untitled Lead'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={`${
                    statusColorMap[status] ?? statusColorMap.new
                  } text-xs capitalize`}
                >
                  {statusLabel[status] ?? status}
                </Badge>
                <Badge
                  variant="outline"
                  className={`${
                    priorityColorMap[priority] ?? priorityColorMap.medium
                  } text-xs capitalize`}
                >
                  {priority} priority
                </Badge>
                {lead.source && (
                  <span className="text-xs text-gray-500">
                    via {lead.source}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-14 sm:ml-0">
          {editing ? (
            <>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={cancelEditing}
                disabled={saving}
                className="border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              {status !== 'converted' && (
                <RoleGate permission="canCreate">
                  <Button
                    onClick={handleConvert}
                    disabled={converting}
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90"
                  >
                    {converting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4 mr-2" />
                    )}
                    {converting ? 'Converting...' : 'Convert to Client'}
                  </Button>
                </RoleGate>
              )}
              <Button
                variant="outline"
                onClick={startEditing}
                className="border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <RoleGate permission="canDelete">
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="border-red-200 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </RoleGate>
            </>
          )}
        </div>
      </div>

      {/* Converted Banner */}
      {status === 'converted' && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-700">Lead Converted</p>
              <p className="text-sm text-emerald-600 mt-0.5">
                This lead has been converted to a client and property.
              </p>
            </div>
            <div className="flex gap-2">
              {lead.convertedClientId && (
                <Link href={`/clients/${lead.convertedClientId}`}>
                  <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                    <User className="h-3.5 w-3.5 mr-1.5" />
                    View Client
                    <ExternalLink className="h-3 w-3 ml-1.5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Mode Form */}
      {editing && (
        <div className="bg-amber-50/50 rounded-2xl border border-amber-200 shadow-sm p-6 space-y-5">
          <h2 className="text-lg font-semibold text-amber-600 flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit Lead
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Status</label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="bg-white border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Priority</label>
              <Select value={editForm.priority} onValueChange={(v) => setEditForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger className="bg-white border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Buyer Email</label>
              <Input
                type="email"
                value={editForm.buyerEmail}
                onChange={(e) => setEditForm((f) => ({ ...f, buyerEmail: e.target.value }))}
                placeholder="email@example.com"
                className="bg-white border-gray-200"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Buyer Phone</label>
              <Input
                type="tel"
                value={editForm.buyerPhone}
                onChange={(e) => setEditForm((f) => ({ ...f, buyerPhone: e.target.value }))}
                placeholder="(555) 123-4567"
                className="bg-white border-gray-200"
              />
            </div>

            {/* Source */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Source</label>
              <Input
                value={editForm.source}
                onChange={(e) => setEditForm((f) => ({ ...f, source: e.target.value }))}
                placeholder="e.g. county-records, referral"
                className="bg-white border-gray-200"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Tags (comma-separated)</label>
              <Input
                value={editForm.tags}
                onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="tag1, tag2, tag3"
                className="bg-white border-gray-200"
              />
            </div>
          </div>

          {/* Notes (full width) */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Notes</label>
            <Textarea
              value={editForm.notes}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Add notes about this lead..."
              rows={4}
              className="bg-white border-gray-200 resize-none"
            />
          </div>
        </div>
      )}

      {/* Property Information */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Property Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="Address"
            value={lead.propertyAddress}
          />
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="City"
            value={lead.propertyCity}
          />
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="County"
            value={lead.propertyCounty}
          />
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="State"
            value={lead.propertyState}
          />
          <InfoRow
            icon={<Hash className="h-4 w-4" />}
            label="ZIP"
            value={lead.propertyZip}
          />
          <InfoRow
            icon={<Building2 className="h-4 w-4" />}
            label="Property Type"
            value={lead.propertyType}
          />
          <InfoRow
            icon={<Ruler className="h-4 w-4" />}
            label="Square Footage"
            value={
              lead.squareFootage
                ? Number(lead.squareFootage).toLocaleString() + ' sq ft'
                : null
            }
          />
          <InfoRow
            icon={<Calendar className="h-4 w-4" />}
            label="Year Built"
            value={lead.yearBuilt}
          />
        </div>
      </div>

      {/* Transaction Details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Transaction Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            icon={<DollarSign className="h-4 w-4" />}
            label="Sale Price"
            value={formatCurrency(lead.salePrice)}
          />
          <InfoRow
            icon={<Calendar className="h-4 w-4" />}
            label="Sale Date"
            value={formatDate(lead.saleDate)}
          />
          <InfoRow
            icon={<Hash className="h-4 w-4" />}
            label="Parcel ID"
            value={lead.parcelId}
          />
          <InfoRow
            icon={<FileText className="h-4 w-4" />}
            label="Deed Book / Page"
            value={
              lead.deedBook || lead.deedPage
                ? [lead.deedBook, lead.deedPage].filter(Boolean).join(' / ')
                : null
            }
          />
        </div>
      </div>

      {/* Buyer Information */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
          <User className="h-4 w-4" />
          Buyer Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            icon={<User className="h-4 w-4" />}
            label="Name"
            value={lead.buyerName}
          />
          <InfoRow
            icon={<Building2 className="h-4 w-4" />}
            label="Company"
            value={lead.buyerCompany}
          />
          <div className="flex items-start gap-3">
            <div className="text-amber-500 mt-0.5">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Email
              </p>
              {lead.buyerEmail ? (
                <a
                  href={`mailto:${lead.buyerEmail}`}
                  className="text-sm text-amber-600 hover:underline mt-0.5 block"
                >
                  {lead.buyerEmail}
                </a>
              ) : (
                <p className="text-sm text-gray-700 mt-0.5">--</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-amber-500 mt-0.5">
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Phone
              </p>
              {lead.buyerPhone ? (
                <a
                  href={`tel:${lead.buyerPhone}`}
                  className="text-sm text-amber-600 hover:underline mt-0.5 block"
                >
                  {lead.buyerPhone}
                </a>
              ) : (
                <p className="text-sm text-gray-700 mt-0.5">--</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LLC Member / Registered Agent */}
      {lead.memberName && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
            <User className="h-4 w-4" />
            LLC Member / Registered Agent
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow
              icon={<User className="h-4 w-4" />}
              label="Name"
              value={lead.memberName}
            />
            <InfoRow
              icon={<MapPin className="h-4 w-4" />}
              label="Address"
              value={lead.memberAddress}
            />
            <InfoRow
              icon={<MapPin className="h-4 w-4" />}
              label="City / State / ZIP"
              value={
                [lead.memberCity, lead.memberState, lead.memberZip]
                  .filter(Boolean)
                  .join(', ') || null
              }
            />
            {lead.sunbizDocNumber && (
              <InfoRow
                icon={<Hash className="h-4 w-4" />}
                label="Sunbiz Doc #"
                value={lead.sunbizDocNumber}
              />
            )}
          </div>
        </div>
      )}

      {/* Seller Information */}
      {lead.sellerName && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
            <User className="h-4 w-4" />
            Seller Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow
              icon={<User className="h-4 w-4" />}
              label="Seller Name"
              value={lead.sellerName}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {lead.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-gray-100 text-gray-700 border border-gray-200"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {lead.notes && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Notes
          </h2>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {lead.notes}
          </p>
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
        {lead.createdAt && (
          <span>
            Created{' '}
            {new Date(lead.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        )}
        {lead.updatedAt && (
          <>
            <Separator orientation="vertical" className="h-3 bg-gray-200" />
            <span>
              Updated{' '}
              {new Date(lead.updatedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | null
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-amber-500 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm text-gray-700 mt-0.5">
          {value || '--'}
        </p>
      </div>
    </div>
  )
}

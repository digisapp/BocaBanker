'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { logger } from '@/lib/logger'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  MapPin,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  User,
  StickyNote,
  Loader2,
  Save,
  X,
  Send,
  Landmark,
  Percent,
  Building2,
  ExternalLink,
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
import { LoanStatusBadge } from '@/components/mortgage/LoanStatusBadge'
import { LoanPipelineBar } from '@/components/mortgage/LoanPipelineBar'

interface LoanDetail {
  id: string
  borrowerName: string | null
  borrowerEmail: string | null
  borrowerPhone: string | null
  propertyAddress: string | null
  propertyCity: string | null
  propertyState: string | null
  propertyZip: string | null
  purchasePrice: string | null
  loanAmount: string | null
  loanType: string | null
  interestRate: string | null
  term: number | null
  status: string | null
  ariveLink: string | null
  ariveLinkSentAt: string | null
  estimatedClosingDate: string | null
  actualClosingDate: string | null
  commissionBps: number | null
  commissionAmount: string | null
  lenderId: string | null
  lenderName: string | null
  leadId: string | null
  notes: string | null
  createdAt: string | null
  updatedAt: string | null
}

const loanTypeLabels: Record<string, string> = {
  conventional: 'Conventional',
  fha: 'FHA',
  va: 'VA',
  usda: 'USDA',
  jumbo: 'Jumbo',
  heloc: 'HELOC',
  commercial: 'Commercial',
  other: 'Other',
}

const formatDate = (value: string | null) => {
  if (!value) return '--'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function LoanDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [loan, setLoan] = useState<LoanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendingArive, setSendingArive] = useState(false)
  const [editForm, setEditForm] = useState({
    status: '',
    borrowerEmail: '',
    borrowerPhone: '',
    interestRate: '',
    term: '',
    commissionBps: '',
    lenderName: '',
    estimatedClosingDate: '',
    actualClosingDate: '',
    ariveLink: '',
    notes: '',
  })

  useEffect(() => {
    const fetchLoan = async () => {
      try {
        const res = await fetch(`/api/loans/${params.id}`)
        if (!res.ok) throw new Error('Not found')
        const data = await res.json()
        setLoan(data)
      } catch {
        router.push('/mortgage/loans')
        return
      }
      setLoading(false)
    }
    fetchLoan()
  }, [params.id, router])

  const startEditing = () => {
    if (!loan) return
    setEditForm({
      status: loan.status ?? 'pre_qual',
      borrowerEmail: loan.borrowerEmail ?? '',
      borrowerPhone: loan.borrowerPhone ?? '',
      interestRate: loan.interestRate ?? '',
      term: loan.term?.toString() ?? '',
      commissionBps: loan.commissionBps?.toString() ?? '',
      lenderName: loan.lenderName ?? '',
      estimatedClosingDate: loan.estimatedClosingDate ?? '',
      actualClosingDate: loan.actualClosingDate ?? '',
      ariveLink: loan.ariveLink ?? '',
      notes: loan.notes ?? '',
    })
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/loans/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowerName: loan!.borrowerName,
          propertyAddress: loan!.propertyAddress,
          loanAmount: loan!.loanAmount,
          loanType: loan!.loanType,
          purchasePrice: loan!.purchasePrice,
          status: editForm.status,
          borrowerEmail: editForm.borrowerEmail || null,
          borrowerPhone: editForm.borrowerPhone || null,
          interestRate: editForm.interestRate || null,
          term: editForm.term ? Number(editForm.term) : null,
          commissionBps: editForm.commissionBps ? Number(editForm.commissionBps) : null,
          lenderName: editForm.lenderName || null,
          estimatedClosingDate: editForm.estimatedClosingDate || null,
          actualClosingDate: editForm.actualClosingDate || null,
          ariveLink: editForm.ariveLink || null,
          notes: editForm.notes || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const updated = await res.json()
      setLoan(updated)
      setEditing(false)
      toast.success('Loan updated')
    } catch (error) {
      logger.error('loan-detail', 'Failed to save loan', error)
      toast.error('Failed to update loan')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this loan? This action cannot be undone.'))
      return
    try {
      const res = await fetch(`/api/loans/${params.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Loan deleted')
      router.push('/mortgage/loans')
    } catch (error) {
      logger.error('loan-detail', 'Failed to delete loan', error)
      toast.error('Failed to delete loan')
    }
  }

  const handleSendAriveLink = async () => {
    setSendingArive(true)
    try {
      const res = await fetch(`/api/loans/${params.id}/send-arive-link`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      toast.success('Arive application link sent!')
      // Refresh loan data to show updated ariveLinkSentAt
      const refreshRes = await fetch(`/api/loans/${params.id}`)
      if (refreshRes.ok) {
        setLoan(await refreshRes.json())
      }
    } catch (error) {
      logger.error('loan-detail', 'Failed to send Arive link', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send Arive link')
    } finally {
      setSendingArive(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!loan) return null

  const status = loan.status ?? 'pre_qual'

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/mortgage/loans')}
            className="text-gray-500 hover:text-amber-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
              <Landmark className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {loan.borrowerName || 'Untitled Loan'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <LoanStatusBadge status={status} />
                {loan.loanType && (
                  <Badge
                    variant="outline"
                    className="bg-gray-50 text-gray-600 border-gray-200 text-xs"
                  >
                    {loanTypeLabels[loan.loanType] ?? loan.loanType}
                  </Badge>
                )}
                {loan.lenderName && (
                  <span className="text-xs text-gray-500">
                    via {loan.lenderName}
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
                onClick={() => setEditing(false)}
                disabled={saving}
                className="border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              {loan.borrowerEmail && (
                <Button
                  onClick={handleSendAriveLink}
                  disabled={sendingArive}
                  variant="outline"
                  className="border-amber-200 text-amber-700 hover:bg-amber-50"
                >
                  {sendingArive ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {sendingArive ? 'Sending...' : 'Send Arive Link'}
                </Button>
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

      {/* Pipeline Progress */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Pipeline Progress
        </h2>
        <LoanPipelineBar status={status} />
      </div>

      {/* Edit Mode Form */}
      {editing && (
        <div className="bg-amber-50/50 rounded-2xl border border-amber-200 shadow-sm p-6 space-y-5">
          <h2 className="text-lg font-semibold text-amber-600 flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit Loan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Status
              </label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger className="bg-white border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
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
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Interest Rate (%)
              </label>
              <Input
                type="number"
                step="0.125"
                value={editForm.interestRate}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, interestRate: e.target.value }))
                }
                placeholder="6.75"
                className="bg-white border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Term (years)
              </label>
              <Input
                type="number"
                value={editForm.term}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, term: e.target.value }))
                }
                placeholder="30"
                className="bg-white border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Commission (bps)
              </label>
              <Input
                type="number"
                value={editForm.commissionBps}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, commissionBps: e.target.value }))
                }
                placeholder="200"
                className="bg-white border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Borrower Email
              </label>
              <Input
                type="email"
                value={editForm.borrowerEmail}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, borrowerEmail: e.target.value }))
                }
                placeholder="email@example.com"
                className="bg-white border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Borrower Phone
              </label>
              <Input
                type="tel"
                value={editForm.borrowerPhone}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, borrowerPhone: e.target.value }))
                }
                placeholder="(555) 123-4567"
                className="bg-white border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Lender
              </label>
              <Input
                value={editForm.lenderName}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, lenderName: e.target.value }))
                }
                placeholder="Wells Fargo, UWM, etc."
                className="bg-white border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Est. Closing Date
              </label>
              <Input
                type="date"
                value={editForm.estimatedClosingDate}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    estimatedClosingDate: e.target.value,
                  }))
                }
                className="bg-white border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Actual Closing Date
              </label>
              <Input
                type="date"
                value={editForm.actualClosingDate}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    actualClosingDate: e.target.value,
                  }))
                }
                className="bg-white border-gray-200"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Arive Link
              </label>
              <Input
                type="url"
                value={editForm.ariveLink}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, ariveLink: e.target.value }))
                }
                placeholder="https://apply.arive.com/..."
                className="bg-white border-gray-200"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">
              Notes
            </label>
            <Textarea
              value={editForm.notes}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Add notes about this loan..."
              rows={4}
              className="bg-white border-gray-200 resize-none"
            />
          </div>
        </div>
      )}

      {/* Borrower Information */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
          <User className="h-4 w-4" />
          Borrower Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            icon={<User className="h-4 w-4" />}
            label="Name"
            value={loan.borrowerName}
          />
          <div className="flex items-start gap-3">
            <div className="text-amber-500 mt-0.5">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Email
              </p>
              {loan.borrowerEmail ? (
                <a
                  href={`mailto:${loan.borrowerEmail}`}
                  className="text-sm text-amber-600 hover:underline mt-0.5 block"
                >
                  {loan.borrowerEmail}
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
              {loan.borrowerPhone ? (
                <a
                  href={`tel:${loan.borrowerPhone}`}
                  className="text-sm text-amber-600 hover:underline mt-0.5 block"
                >
                  {loan.borrowerPhone}
                </a>
              ) : (
                <p className="text-sm text-gray-700 mt-0.5">--</p>
              )}
            </div>
          </div>
        </div>
      </div>

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
            value={loan.propertyAddress}
          />
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="City"
            value={loan.propertyCity}
          />
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="State"
            value={loan.propertyState}
          />
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="ZIP"
            value={loan.propertyZip}
          />
          <InfoRow
            icon={<DollarSign className="h-4 w-4" />}
            label="Purchase Price"
            value={formatCurrency(loan.purchasePrice, '--')}
          />
        </div>
      </div>

      {/* Loan Details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
          <Landmark className="h-4 w-4" />
          Loan Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            icon={<DollarSign className="h-4 w-4" />}
            label="Loan Amount"
            value={formatCurrency(loan.loanAmount, '--')}
          />
          <InfoRow
            icon={<Landmark className="h-4 w-4" />}
            label="Loan Type"
            value={
              loan.loanType
                ? loanTypeLabels[loan.loanType] ?? loan.loanType
                : null
            }
          />
          <InfoRow
            icon={<Percent className="h-4 w-4" />}
            label="Interest Rate"
            value={loan.interestRate ? `${loan.interestRate}%` : null}
          />
          <InfoRow
            icon={<Calendar className="h-4 w-4" />}
            label="Term"
            value={loan.term ? `${loan.term} years` : null}
          />
          <InfoRow
            icon={<Building2 className="h-4 w-4" />}
            label="Lender"
            value={loan.lenderName}
          />
          <InfoRow
            icon={<Calendar className="h-4 w-4" />}
            label="Est. Closing"
            value={formatDate(loan.estimatedClosingDate)}
          />
          <InfoRow
            icon={<Calendar className="h-4 w-4" />}
            label="Actual Closing"
            value={formatDate(loan.actualClosingDate)}
          />
        </div>
      </div>

      {/* Commission */}
      {(loan.commissionBps || loan.commissionAmount) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Commission
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow
              icon={<Percent className="h-4 w-4" />}
              label="Basis Points"
              value={loan.commissionBps ? `${loan.commissionBps} bps` : null}
            />
            <InfoRow
              icon={<DollarSign className="h-4 w-4" />}
              label="Commission Amount"
              value={formatCurrency(loan.commissionAmount, '--')}
            />
          </div>
        </div>
      )}

      {/* Arive Integration */}
      {(loan.ariveLink || loan.ariveLinkSentAt) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Arive Integration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loan.ariveLink && (
              <div className="flex items-start gap-3">
                <div className="text-amber-500 mt-0.5">
                  <ExternalLink className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    Application Link
                  </p>
                  <a
                    href={loan.ariveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-amber-600 hover:underline mt-0.5 block truncate max-w-[300px]"
                  >
                    {loan.ariveLink}
                  </a>
                </div>
              </div>
            )}
            <InfoRow
              icon={<Send className="h-4 w-4" />}
              label="Link Sent"
              value={loan.ariveLinkSentAt ? formatDate(loan.ariveLinkSentAt) : 'Not sent yet'}
            />
          </div>
        </div>
      )}

      {/* Lead Link */}
      {loan.leadId && (
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-700 text-sm">
                Linked to Lead
              </p>
              <p className="text-xs text-blue-500 mt-0.5">
                This loan was created from a lead
              </p>
            </div>
            <Link href={`/leads/${loan.leadId}`}>
              <Button
                size="sm"
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                View Lead
                <ExternalLink className="h-3 w-3 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Notes */}
      {loan.notes && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Notes
          </h2>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {loan.notes}
          </p>
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
        {loan.createdAt && (
          <span>Created {formatDate(loan.createdAt)}</span>
        )}
        {loan.updatedAt && (
          <>
            <Separator orientation="vertical" className="h-3 bg-gray-200" />
            <span>Updated {formatDate(loan.updatedAt)}</span>
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
        <p className="text-sm text-gray-700 mt-0.5">{value || '--'}</p>
      </div>
    </div>
  )
}

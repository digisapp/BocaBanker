'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Star,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Review } from '@/types'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            'w-3.5 h-3.5',
            i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
          )}
        />
      ))}
    </div>
  )
}

export default function ReviewsManagementPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const limit = 20

  // Respond dialog
  const [respondReview, setRespondReview] = useState<Review | null>(null)
  const [responseText, setResponseText] = useState('')
  const [responding, setResponding] = useState(false)

  // Delete dialog
  const [deleteReview, setDeleteReview] = useState<Review | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    })
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (search) params.set('search', search)

    const res = await fetch(`/api/reviews/admin?${params}`)
    if (res.ok) {
      const data = await res.json()
      setReviews(data.reviews)
      setTotal(data.total)
      setStats(data.stats)
    }
    setLoading(false)
  }, [page, statusFilter, search])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    const res = await fetch(`/api/reviews/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast.success(`Review ${status}`)
      fetchReviews()
    } else {
      toast.error('Failed to update review')
    }
  }

  const handleRespond = async () => {
    if (!respondReview || !responseText.trim()) return
    setResponding(true)
    const res = await fetch(`/api/reviews/${respondReview.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'approved',
        response_text: responseText,
      }),
    })
    if (res.ok) {
      toast.success('Response saved & review approved')
      setRespondReview(null)
      setResponseText('')
      fetchReviews()
    } else {
      toast.error('Failed to save response')
    }
    setResponding(false)
  }

  const handleDelete = async () => {
    if (!deleteReview) return
    setDeleting(true)
    const res = await fetch(`/api/reviews/${deleteReview.id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      toast.success('Review deleted')
      setDeleteReview(null)
      fetchReviews()
    } else {
      toast.error('Failed to delete review')
    }
    setDeleting(false)
  }

  const totalPages = Math.ceil(total / limit)

  const tabs = [
    { key: 'all', label: 'All', count: stats.pending + stats.approved + stats.rejected },
    { key: 'pending', label: 'Pending', count: stats.pending, icon: Clock },
    { key: 'approved', label: 'Approved', count: stats.approved, icon: CheckCircle },
    { key: 'rejected', label: 'Rejected', count: stats.rejected, icon: XCircle },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage client reviews and responses
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/reviews" target="_blank">
            <ExternalLink className="w-4 h-4" /> View Public Page
          </Link>
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-xs text-gray-500 mt-1">Pending Review</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{stats.approved}</div>
          <div className="text-xs text-gray-500 mt-1">Approved</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-xs text-gray-500 mt-1">Rejected</div>
        </div>
      </div>

      {/* Filter tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key)
                setPage(1)
              }}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                statusFilter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search reviews..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-400">No reviews found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <Stars rating={review.rating} />
                    <Badge
                      variant="outline"
                      className={cn('text-xs', statusColors[review.status])}
                    >
                      {review.status}
                    </Badge>
                    {review.reviewDate && (
                      <span className="text-xs text-gray-400">
                        {new Date(review.reviewDate + 'T00:00:00').toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric', year: 'numeric' }
                        )}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {review.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {review.body}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span className="font-medium text-gray-600">
                      {review.reviewerName}
                    </span>
                    {review.reviewerCity && (
                      <span>
                        {review.reviewerCity}
                        {review.reviewerState ? `, ${review.reviewerState}` : ''}
                      </span>
                    )}
                    {review.reviewerEmail && (
                      <span className="text-sky-500">{review.reviewerEmail}</span>
                    )}
                  </div>
                  {review.responseText && (
                    <div className="mt-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-800">
                      <span className="font-semibold">Your response:</span>{' '}
                      {review.responseText.slice(0, 100)}
                      {review.responseText.length > 100 ? '...' : ''}
                    </div>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="shrink-0">
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {review.status !== 'approved' && (
                      <DropdownMenuItem
                        onClick={() => updateStatus(review.id, 'approved')}
                      >
                        <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />
                        Approve
                      </DropdownMenuItem>
                    )}
                    {review.status !== 'rejected' && (
                      <DropdownMenuItem
                        onClick={() => updateStatus(review.id, 'rejected')}
                      >
                        <XCircle className="w-4 h-4 mr-2 text-red-500" />
                        Reject
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => {
                        setRespondReview(review)
                        setResponseText(review.responseText || '')
                      }}
                    >
                      <MessageSquare className="w-4 h-4 mr-2 text-amber-500" />
                      Respond
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteReview(review)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages} ({total} reviews)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Respond Dialog */}
      <Dialog
        open={!!respondReview}
        onOpenChange={() => setRespondReview(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Review</DialogTitle>
          </DialogHeader>
          {respondReview && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Stars rating={respondReview.rating} />
                  <span className="text-sm font-medium">
                    {respondReview.reviewerName}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{respondReview.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Your Response
                </label>
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Thank you for your kind words..."
                  rows={5}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setRespondReview(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRespond}
                  disabled={responding || !responseText.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                >
                  {responding && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save & Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteReview} onOpenChange={() => setDeleteReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
          </DialogHeader>
          {deleteReview && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete the review from{' '}
                <span className="font-semibold">
                  {deleteReview.reviewerName}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteReview(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="gap-2"
                >
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import { ArrowLeft, Landmark, Loader2 } from 'lucide-react'
import { LoanForm } from '@/components/mortgage/LoanForm'
import { Button } from '@/components/ui/button'
import type { LoanInput } from '@/lib/validation/schemas'

function NewLoanContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pre-fill from lead if leadId is in the URL
  const leadId = searchParams.get('leadId') ?? ''
  const borrowerName = searchParams.get('borrowerName') ?? ''
  const borrowerEmail = searchParams.get('borrowerEmail') ?? ''
  const borrowerPhone = searchParams.get('borrowerPhone') ?? ''
  const propertyAddress = searchParams.get('propertyAddress') ?? ''
  const propertyCity = searchParams.get('propertyCity') ?? ''
  const propertyState = searchParams.get('propertyState') ?? 'FL'
  const purchasePrice = searchParams.get('purchasePrice')

  const defaultValues: Partial<LoanInput> = {
    ...(leadId && { lead_id: leadId }),
    ...(borrowerName && { borrower_name: borrowerName }),
    ...(borrowerEmail && { borrower_email: borrowerEmail }),
    ...(borrowerPhone && { borrower_phone: borrowerPhone }),
    ...(propertyAddress && { property_address: propertyAddress }),
    ...(propertyCity && { property_city: propertyCity }),
    ...(propertyState && { property_state: propertyState }),
    ...(purchasePrice && { purchase_price: Number(purchasePrice) }),
  }

  const handleSubmit = async (data: LoanInput) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create loan')
      }

      toast.success('Loan created successfully')
      router.push('/mortgage/loans')
    } catch (error) {
      logger.error('loans-page', 'Failed to create loan', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create loan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="text-gray-500 hover:text-amber-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Landmark className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Loan</h1>
            <p className="text-sm text-gray-500">
              Add a new loan to your pipeline
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <LoanForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}

export default function NewLoanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <NewLoanContent />
    </Suspense>
  )
}

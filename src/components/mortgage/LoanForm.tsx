'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loanSchema, type LoanInput } from '@/lib/validation/schemas'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface LoanFormProps {
  defaultValues?: Partial<LoanInput>
  onSubmit: (data: LoanInput) => Promise<void>
  isSubmitting?: boolean
  submitLabel?: string
}

const inputClass =
  'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20'

export function LoanForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Create Loan',
}: LoanFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<LoanInput>({
    resolver: zodResolver(loanSchema) as any,
    defaultValues: {
      borrower_name: '',
      borrower_email: '',
      borrower_phone: '',
      property_address: '',
      property_city: '',
      property_state: 'FL',
      property_zip: '',
      purchase_price: undefined,
      loan_amount: undefined as unknown as number,
      loan_type: 'conventional',
      interest_rate: undefined,
      term: undefined,
      status: 'pre_qual',
      arive_link: '',
      estimated_closing_date: '',
      actual_closing_date: '',
      commission_bps: undefined,
      lender_name: '',
      lead_id: '',
      notes: '',
      ...defaultValues,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Borrower Information */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <h3 className="text-lg font-semibold text-amber-600">
            Borrower Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="borrower_name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-gray-700">
                    Borrower Name *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Smith"
                      className={inputClass}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="borrower_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      className={inputClass}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="borrower_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Phone</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      className={inputClass}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Property Information */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <h3 className="text-lg font-semibold text-amber-600">
            Property Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="property_address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-gray-700">
                    Property Address *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Main St"
                      className={inputClass}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="property_city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">City</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Boca Raton"
                      className={inputClass}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="property_state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">State</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="FL"
                      maxLength={2}
                      className={inputClass}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="property_zip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">ZIP Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="33431"
                      className={inputClass}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Loan Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <h3 className="text-lg font-semibold text-amber-600">
            Loan Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="loan_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Loan Type *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white border-gray-200">
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
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="purchase_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">
                    Purchase Price
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="500000"
                      className={inputClass}
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="loan_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">
                    Loan Amount *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="400000"
                      className={inputClass}
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="interest_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">
                    Interest Rate (%)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.125"
                      placeholder="6.75"
                      className={inputClass}
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="term"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">
                    Term (years)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="30"
                      className={inputClass}
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lender_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Lender</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Wells Fargo, UWM, etc."
                      className={inputClass}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Pipeline & Commission */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <h3 className="text-lg font-semibold text-amber-600">
            Pipeline & Commission
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="commission_bps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">
                    Commission (bps)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="200"
                      className={inputClass}
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estimated_closing_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">
                    Est. Closing Date
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className={inputClass}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Arive Integration */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <h3 className="text-lg font-semibold text-amber-600">
            Arive Integration
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="arive_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">
                    Arive Application Link
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://apply.arive.com/..."
                      className={inputClass}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <h3 className="text-lg font-semibold text-amber-600">Notes</h3>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Additional notes about this loan..."
                    rows={4}
                    className={`${inputClass} resize-none`}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90 px-8"
          >
            {isSubmitting && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}

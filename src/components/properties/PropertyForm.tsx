'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { propertySchema } from '@/lib/validation/schemas'
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
import { MapPin, DollarSign, Building2, Loader2 } from 'lucide-react'

const propertyFormSchema = propertySchema.extend({
  client_id: z.string().optional().or(z.literal('')),
  description: z.string().max(2000).optional().or(z.literal('')),
})

type PropertyFormValues = z.infer<typeof propertyFormSchema>

const PROPERTY_TYPES = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'residential', label: 'Residential' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'retail', label: 'Retail' },
  { value: 'office', label: 'Office' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'multifamily', label: 'Multifamily' },
  { value: 'other', label: 'Other' },
] as const

interface ClientOption {
  id: string
  firstName: string
  lastName: string
  company?: string | null
}

interface PropertyFormProps {
  defaultValues?: Partial<PropertyFormValues>
  clients: ClientOption[]
  onSubmit: (data: PropertyFormValues) => Promise<void>
}

export default function PropertyForm({ defaultValues, clients, onSubmit }: PropertyFormProps) {
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      address: '',
      city: '',
      state: '',
      zip: '',
      property_type: undefined,
      purchase_price: undefined,
      purchase_date: '',
      building_value: undefined,
      land_value: undefined,
      square_footage: undefined,
      year_built: undefined,
      client_id: '',
      description: '',
      ...defaultValues,
    },
  })

  const { formState: { isSubmitting } } = form

  async function handleSubmit(data: PropertyFormValues) {
    await onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Location Section */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(201,168,76,0.15)]">
              <MapPin className="h-4 w-4 text-[#C9A84C]" />
            </div>
            <h3 className="text-lg font-semibold text-[#F8FAFC]">Location</h3>
          </div>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#94A3B8]">Address</FormLabel>
                <FormControl>
                  <Input
                    placeholder="123 Main Street"
                    className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-[#F8FAFC] placeholder:text-[#475569]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#94A3B8]">City</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Boca Raton"
                      className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-[#F8FAFC] placeholder:text-[#475569]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#94A3B8]">State</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="FL"
                      maxLength={2}
                      className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-[#F8FAFC] placeholder:text-[#475569] uppercase"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="zip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#94A3B8]">ZIP Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="33432"
                      className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-[#F8FAFC] placeholder:text-[#475569]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Financial Details Section */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(201,168,76,0.15)]">
              <DollarSign className="h-4 w-4 text-[#C9A84C]" />
            </div>
            <h3 className="text-lg font-semibold text-[#F8FAFC]">Financial Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="purchase_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#94A3B8]">Purchase Price</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C9A84C]">$</span>
                      <Input
                        type="number"
                        placeholder="1,000,000"
                        className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-[#F8FAFC] placeholder:text-[#475569] pl-7"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        value={field.value ?? ''}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchase_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#94A3B8]">Purchase Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-[#F8FAFC]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="building_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#94A3B8]">Building Value</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C9A84C]">$</span>
                      <Input
                        type="number"
                        placeholder="800,000"
                        className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-[#F8FAFC] placeholder:text-[#475569] pl-7"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        value={field.value ?? ''}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="land_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#94A3B8]">Land Value</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C9A84C]">$</span>
                      <Input
                        type="number"
                        placeholder="200,000"
                        className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-[#F8FAFC] placeholder:text-[#475569] pl-7"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        value={field.value ?? ''}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Property Details Section */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(201,168,76,0.15)]">
              <Building2 className="h-4 w-4 text-[#C9A84C]" />
            </div>
            <h3 className="text-lg font-semibold text-[#F8FAFC]">Property Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="property_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#94A3B8]">Property Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-[#F8FAFC]">
                        <SelectValue placeholder="Select property type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#1A2B45] border-[rgba(201,168,76,0.15)]">
                      {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-[#F8FAFC] focus:bg-[rgba(201,168,76,0.1)] focus:text-[#C9A84C]">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#94A3B8]">Client</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger className="w-full bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-[#F8FAFC]">
                        <SelectValue placeholder="Select client (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#1A2B45] border-[rgba(201,168,76,0.15)]">
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id} className="text-[#F8FAFC] focus:bg-[rgba(201,168,76,0.1)] focus:text-[#C9A84C]">
                          {client.firstName} {client.lastName}
                          {client.company ? ` - ${client.company}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="square_footage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#94A3B8]">Square Footage</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="10,000"
                      className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-[#F8FAFC] placeholder:text-[#475569]"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="year_built"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#94A3B8]">Year Built</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="2005"
                      className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-[#F8FAFC] placeholder:text-[#475569]"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#94A3B8]">Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Additional details about the property..."
                    className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-[#F8FAFC] placeholder:text-[#475569] min-h-24"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-gold-gradient text-[#0F1B2D] font-semibold hover:opacity-90 px-8"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : defaultValues ? (
              'Update Property'
            ) : (
              'Create Property'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

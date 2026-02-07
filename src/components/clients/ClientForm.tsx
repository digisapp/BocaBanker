'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { clientSchema, type ClientInput } from '@/lib/validation/schemas'
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

interface ClientFormProps {
  defaultValues?: Partial<ClientInput>
  onSubmit: (data: ClientInput) => Promise<void>
  isSubmitting?: boolean
}

export function ClientForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
}: ClientFormProps) {
  const form = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      status: 'active',
      tags: '',
      notes: '',
      source: '',
      ...defaultValues,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Personal Information */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gold">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">
                    First Name *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John"
                      className="bg-navy-light/50 border-gold/20 focus-visible:border-gold/50 focus-visible:ring-gold/30"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">
                    Last Name *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Smith"
                      className="bg-navy-light/50 border-gold/20 focus-visible:border-gold/50 focus-visible:ring-gold/30"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      className="bg-navy-light/50 border-gold/20 focus-visible:border-gold/50 focus-visible:ring-gold/30"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Phone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(555) 123-4567"
                      className="bg-navy-light/50 border-gold/20 focus-visible:border-gold/50 focus-visible:ring-gold/30"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Company & Source */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gold">
            Company Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Company</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Acme Corp"
                      className="bg-navy-light/50 border-gold/20 focus-visible:border-gold/50 focus-visible:ring-gold/30"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Source</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Referral, website, cold call..."
                      className="bg-navy-light/50 border-gold/20 focus-visible:border-gold/50 focus-visible:ring-gold/30"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full bg-navy-light/50 border-gold/20 focus-visible:border-gold/50 focus-visible:ring-gold/30">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-navy-light border-gold/20">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">
                    Tags (comma-separated)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="real-estate, high-value, referral"
                      className="bg-navy-light/50 border-gold/20 focus-visible:border-gold/50 focus-visible:ring-gold/30"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Address */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gold">Address</h3>
          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">
                    Street Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Main St"
                      className="bg-navy-light/50 border-gold/20 focus-visible:border-gold/50 focus-visible:ring-gold/30"
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
                    <FormLabel className="text-foreground/80">City</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Boca Raton"
                        className="bg-navy-light/50 border-gold/20 focus-visible:border-gold/50 focus-visible:ring-gold/30"
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
                    <FormLabel className="text-foreground/80">State</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="FL"
                        maxLength={2}
                        className="bg-navy-light/50 border-gold/20 focus-visible:border-gold/50 focus-visible:ring-gold/30"
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
                    <FormLabel className="text-foreground/80">ZIP</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="33432"
                        className="bg-navy-light/50 border-gold/20 focus-visible:border-gold/50 focus-visible:ring-gold/30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gold">Notes</h3>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Additional notes about the client..."
                    rows={4}
                    className="bg-navy-light/50 border-gold/20 focus-visible:border-gold/50 focus-visible:ring-gold/30 resize-none"
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
            className="bg-gold-gradient text-navy font-semibold hover:opacity-90 px-8"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save Client'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

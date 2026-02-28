'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Building2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const PROPERTY_TYPES = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'residential', label: 'Residential' },
  { value: 'mixed-use', label: 'Mixed-Use' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'retail', label: 'Retail' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'multifamily', label: 'Multifamily' },
];

interface PropertyFormData {
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  purchasePrice: string;
  purchaseDate: string;
  buildingValue: string;
  landValue: string;
  squareFootage: string;
  yearBuilt: string;
  description: string;
  loanAmount: string;
  interestRate: string;
  loanTermYears: string;
  monthlyPayment: string;
  loanType: string;
  lenderName: string;
  loanOriginationDate: string;
}

export default function EditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<PropertyFormData>();

  useEffect(() => {
    async function fetchProperty() {
      try {
        const res = await fetch(`/api/properties/${propertyId}`);
        if (res.ok) {
          const data = await res.json();
          const prop = data.property;
          form.reset({
            address: prop.address || '',
            city: prop.city || '',
            state: prop.state || '',
            zip: prop.zip || '',
            propertyType: prop.propertyType || 'commercial',
            purchasePrice: prop.purchasePrice || '',
            purchaseDate: prop.purchaseDate || '',
            buildingValue: prop.buildingValue || '',
            landValue: prop.landValue || '',
            squareFootage: prop.squareFootage?.toString() || '',
            yearBuilt: prop.yearBuilt?.toString() || '',
            description: prop.description || '',
            loanAmount: prop.loanAmount || '',
            interestRate: prop.interestRate || '',
            loanTermYears: prop.loanTermYears?.toString() || '',
            monthlyPayment: prop.monthlyPayment || '',
            loanType: prop.loanType || '',
            lenderName: prop.lenderName || '',
            loanOriginationDate: prop.loanOriginationDate || '',
          });
        } else {
          setError('Property not found');
        }
      } catch (err) {
        setError('Failed to load property');
      } finally {
        setLoading(false);
      }
    }
    fetchProperty();
  }, [propertyId, form]);

  async function handleSave(data: PropertyFormData) {
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: data.address,
          city: data.city,
          state: data.state,
          zip: data.zip,
          property_type: data.propertyType,
          purchase_price: data.purchasePrice ? parseFloat(data.purchasePrice) : undefined,
          purchase_date: data.purchaseDate || undefined,
          building_value: data.buildingValue ? parseFloat(data.buildingValue) : undefined,
          land_value: data.landValue ? parseFloat(data.landValue) : undefined,
          square_footage: data.squareFootage ? parseInt(data.squareFootage) : undefined,
          year_built: data.yearBuilt ? parseInt(data.yearBuilt) : undefined,
          description: data.description || undefined,
          loan_amount: data.loanAmount ? parseFloat(data.loanAmount) : undefined,
          interest_rate: data.interestRate ? parseFloat(data.interestRate) : undefined,
          loan_term_years: data.loanTermYears ? parseInt(data.loanTermYears) : undefined,
          monthly_payment: data.monthlyPayment ? parseFloat(data.monthlyPayment) : undefined,
          loan_type: data.loanType || undefined,
          lender_name: data.lenderName || undefined,
          loan_origination_date: data.loanOriginationDate || undefined,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => {
          router.push('/properties');
        }, 1500);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to save property');
      }
    } catch (err) {
      setError('Failed to save property');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading property..." />;
  }

  if (error && !form.formState.isDirty) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center max-w-md mx-auto">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{error}</h3>
        <Link href="/properties">
          <Button
            variant="outline"
            className="border-gray-200 text-gray-700 hover:bg-gray-50 mt-4"
          >
            Back to Properties
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/properties">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-amber-600 hover:bg-amber-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-amber-600">
              Edit Property
            </h1>
            <p className="text-sm text-gray-500">Update property details</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={form.handleSubmit(handleSave)}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5"
      >
        {/* Address */}
        <div className="space-y-2">
          <Label className="text-gray-500">Address *</Label>
          <Input
            {...form.register('address', { required: true })}
            className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-500">City</Label>
            <Input
              {...form.register('city')}
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-500">State</Label>
            <Input
              {...form.register('state')}
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-500">ZIP</Label>
            <Input
              {...form.register('zip')}
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
        </div>

        {/* Property Type */}
        <div className="space-y-2">
          <Label className="text-gray-500">Property Type *</Label>
          <Select
            value={form.watch('propertyType')}
            onValueChange={(v) => form.setValue('propertyType', v)}
          >
            <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              {PROPERTY_TYPES.map((t) => (
                <SelectItem
                  key={t.value}
                  value={t.value}
                  className="text-gray-900 hover:bg-gray-50 focus:bg-gray-50"
                >
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Financial Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-500">Purchase Price ($) *</Label>
            <Input
              type="number"
              {...form.register('purchasePrice', { required: true })}
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-500">Purchase Date</Label>
            <Input
              type="date"
              {...form.register('purchaseDate')}
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-500">Building Value ($)</Label>
            <Input
              type="number"
              {...form.register('buildingValue')}
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-500">Land Value ($)</Label>
            <Input
              type="number"
              {...form.register('landValue')}
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-500">Square Footage</Label>
            <Input
              type="number"
              {...form.register('squareFootage')}
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-500">Year Built</Label>
            <Input
              type="number"
              {...form.register('yearBuilt')}
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
        </div>

        {/* Loan / Mortgage Details */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Loan / Mortgage Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-500">Loan Amount ($)</Label>
              <Input
                type="number"
                {...form.register('loanAmount')}
                placeholder="e.g. 2400000"
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500">Interest Rate (%)</Label>
              <Input
                type="number"
                step="0.125"
                {...form.register('interestRate')}
                placeholder="e.g. 6.5"
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-500">Loan Term (Years)</Label>
              <Input
                type="number"
                {...form.register('loanTermYears')}
                placeholder="e.g. 30"
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500">Monthly Payment ($)</Label>
              <Input
                type="number"
                {...form.register('monthlyPayment')}
                placeholder="e.g. 15168"
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-500">Loan Type</Label>
              <Input
                {...form.register('loanType')}
                placeholder="e.g. Conventional, FHA, SBA"
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500">Lender Name</Label>
              <Input
                {...form.register('lenderName')}
                placeholder="e.g. Wells Fargo"
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-500">Loan Origination Date</Label>
              <Input
                type="date"
                {...form.register('loanOriginationDate')}
                className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-gray-500">Description</Label>
          <Textarea
            {...form.register('description')}
            rows={3}
            className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20 resize-none"
          />
        </div>

        {/* Error / Success */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <CheckCircle className="h-4 w-4" />
            Property updated successfully! Redirecting...
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:opacity-90 font-semibold"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save Changes
          </Button>
          <Link href="/properties">
            <Button
              type="button"
              variant="outline"
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

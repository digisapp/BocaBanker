'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, type FieldErrors } from 'react-hook-form';
import { Building2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
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
import PageHeader from '@/components/shared/PageHeader';
import {
  PROPERTY_PROPERTY_TYPES,
  propertyTypeOptions,
} from '@/constants/property-types';

const PROPERTY_TYPES = propertyTypeOptions(PROPERTY_PROPERTY_TYPES);

// Blank optional fields are sent as null so the PUT clears them
const textOrNull = (v: string) => (v.trim() ? v.trim() : null);
const floatOrNull = (v: string) => (v.trim() ? parseFloat(v) : null);
const intOrNull = (v: string) => (v.trim() ? parseInt(v, 10) : null);

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
  // A load error replaces the page; a save error shows inline under the form
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');

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
          setLoadError('Property not found');
        }
      } catch {
        setLoadError('Failed to load property');
      } finally {
        setLoading(false);
      }
    }
    fetchProperty();
  }, [propertyId, form]);

  async function handleSave(data: PropertyFormData) {
    setSaving(true);
    setSaved(false);
    setSaveError('');

    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: data.address.trim(),
          city: textOrNull(data.city),
          state: textOrNull(data.state),
          zip: textOrNull(data.zip),
          property_type: data.propertyType,
          purchase_price: parseFloat(data.purchasePrice),
          purchase_date: data.purchaseDate || null,
          building_value: floatOrNull(data.buildingValue),
          land_value: floatOrNull(data.landValue),
          square_footage: intOrNull(data.squareFootage),
          year_built: intOrNull(data.yearBuilt),
          description: textOrNull(data.description),
          loan_amount: floatOrNull(data.loanAmount),
          interest_rate: floatOrNull(data.interestRate),
          loan_term_years: intOrNull(data.loanTermYears),
          monthly_payment: floatOrNull(data.monthlyPayment),
          loan_type: textOrNull(data.loanType),
          lender_name: textOrNull(data.lenderName),
          loan_origination_date: data.loanOriginationDate || null,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => {
          router.push('/properties');
        }, 1500);
      } else {
        // The API's message names the field that failed validation
        const errData = await res.json().catch(() => ({}));
        setSaveError(errData.error || 'Failed to save property');
      }
    } catch {
      setSaveError('Failed to save property');
    } finally {
      setSaving(false);
    }
  }

  // Required fields left blank: say so instead of silently not submitting
  function handleInvalid(errors: FieldErrors<PropertyFormData>) {
    const missing = [
      errors.address && 'Address',
      errors.purchasePrice && 'Purchase price',
    ].filter(Boolean);
    setSaved(false);
    setSaveError(
      missing.length > 0
        ? `${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} required`
        : 'Please check the form',
    );
  }

  if (loading) {
    return <LoadingSpinner text="Loading property..." />;
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center max-w-md mx-auto">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{loadError}</h3>
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
      <PageHeader
        icon={Building2}
        title="Edit Property"
        description="Update property details"
        backHref="/properties"
      />

      {/* Form */}
      <form
        onSubmit={form.handleSubmit(handleSave, handleInvalid)}
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
              inputMode="decimal"
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
              inputMode="decimal"
              {...form.register('buildingValue')}
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-500">Land Value ($)</Label>
            <Input
              type="number"
              inputMode="decimal"
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
              inputMode="numeric"
              {...form.register('squareFootage')}
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-500">Year Built</Label>
            <Input
              type="number"
              inputMode="numeric"
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
                inputMode="decimal"
                {...form.register('loanAmount')}
                placeholder="e.g. 2400000"
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500">Interest Rate (%)</Label>
              <Input
                type="number"
                inputMode="decimal"
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
                inputMode="numeric"
                {...form.register('loanTermYears')}
                placeholder="e.g. 30"
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500">Monthly Payment ($)</Label>
              <Input
                type="number"
                inputMode="decimal"
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
        {saveError && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            {saveError}
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
            className="bg-navy text-white hover:bg-navy-light font-semibold"
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

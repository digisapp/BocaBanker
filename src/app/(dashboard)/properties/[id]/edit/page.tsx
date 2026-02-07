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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          squareFootage: data.squareFootage ? parseInt(data.squareFootage) : null,
          yearBuilt: data.yearBuilt ? parseInt(data.yearBuilt) : null,
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
      <div className="glass-card p-8 text-center max-w-md mx-auto">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">{error}</h3>
        <Link href="/properties">
          <Button
            variant="outline"
            className="border-[rgba(201,168,76,0.3)] text-[#C9A84C] hover:bg-[#243654] mt-4"
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
            className="text-[#94A3B8] hover:text-white hover:bg-[#243654]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient text-[#0F1B2D]">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-gold-gradient">
              Edit Property
            </h1>
            <p className="text-sm text-[#94A3B8]">Update property details</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={form.handleSubmit(handleSave)}
        className="glass-card p-6 space-y-5"
      >
        {/* Address */}
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Address *</Label>
          <Input
            {...form.register('address', { required: true })}
            className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">City</Label>
            <Input
              {...form.register('city')}
              className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">State</Label>
            <Input
              {...form.register('state')}
              className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">ZIP</Label>
            <Input
              {...form.register('zip')}
              className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]"
            />
          </div>
        </div>

        {/* Property Type */}
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Property Type *</Label>
          <Select
            value={form.watch('propertyType')}
            onValueChange={(v) => form.setValue('propertyType', v)}
          >
            <SelectTrigger className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A2B45] border-[rgba(201,168,76,0.15)]">
              {PROPERTY_TYPES.map((t) => (
                <SelectItem
                  key={t.value}
                  value={t.value}
                  className="text-white hover:bg-[#243654] focus:bg-[#243654]"
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
            <Label className="text-[#94A3B8]">Purchase Price ($) *</Label>
            <Input
              type="number"
              {...form.register('purchasePrice', { required: true })}
              className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Purchase Date</Label>
            <Input
              type="date"
              {...form.register('purchaseDate')}
              className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Building Value ($)</Label>
            <Input
              type="number"
              {...form.register('buildingValue')}
              className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Land Value ($)</Label>
            <Input
              type="number"
              {...form.register('landValue')}
              className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Square Footage</Label>
            <Input
              type="number"
              {...form.register('squareFootage')}
              className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Year Built</Label>
            <Input
              type="number"
              {...form.register('yearBuilt')}
              className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Description</Label>
          <Textarea
            {...form.register('description')}
            rows={3}
            className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C] resize-none"
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
            className="bg-gold-gradient text-[#0F1B2D] hover:opacity-90 font-semibold"
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
              className="border-[rgba(201,168,76,0.3)] text-[#94A3B8] hover:bg-[#243654]"
            >
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

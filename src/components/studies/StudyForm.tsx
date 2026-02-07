'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  Calculator,
  BarChart3,
  ClipboardCheck,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Trash2,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getDefaultAllocation, ASSET_CLASSES, type AllocationBreakdown } from '@/lib/cost-seg/asset-classes'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

interface PropertyOption {
  id: string
  address: string
  city?: string | null
  state?: string | null
  propertyType: string
  purchasePrice: string | number
  buildingValue?: string | number | null
  landValue?: string | number | null
  clientId?: string | null
}

interface ClientOption {
  id: string
  firstName: string
  lastName: string
  company?: string | null
}

interface AssetRow {
  category: string
  description: string
  amount: number
  recoveryPeriod: number
  bonusEligible: boolean
}

interface StudyFormData {
  study_name: string
  property_id: string
  client_id: string
  tax_rate: number
  discount_rate: number
  bonus_depreciation_rate: number
  study_year: number
  assets: AssetRow[]
}

interface StudyFormProps {
  properties: PropertyOption[]
  clients: ClientOption[]
  onSubmit: (data: StudyFormData) => Promise<void>
  defaultPropertyId?: string
}

const STEPS = [
  { label: 'Select Property', icon: Building2 },
  { label: 'Tax Parameters', icon: Calculator },
  { label: 'Asset Breakdown', icon: BarChart3 },
  { label: 'Review & Calculate', icon: ClipboardCheck },
]

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  personal_property_5yr: '5-Year Personal Property',
  personal_property_7yr: '7-Year Personal Property',
  land_improvements_15yr: '15-Year Land Improvements',
  building_27_5yr: '27.5-Year Residential Rental',
  building_39yr: '39-Year Nonresidential',
  land: 'Land (Non-depreciable)',
}

const CATEGORY_RECOVERY: Record<string, number> = {
  personal_property_5yr: 5,
  personal_property_7yr: 7,
  land_improvements_15yr: 15,
  building_27_5yr: 27.5,
  building_39yr: 39,
  land: 0,
}

export default function StudyForm({
  properties,
  clients,
  onSubmit,
  defaultPropertyId,
}: StudyFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [studyName, setStudyName] = useState('')
  const [propertyId, setPropertyId] = useState(defaultPropertyId || '')
  const [clientId, setClientId] = useState('')
  const [taxRate, setTaxRate] = useState(37)
  const [discountRate, setDiscountRate] = useState(5)
  const [bonusDepreciationRate, setBonusDepreciationRate] = useState(100)
  const [studyYear, setStudyYear] = useState(new Date().getFullYear())
  const [assets, setAssets] = useState<AssetRow[]>([])

  const selectedProperty = properties.find((p) => p.id === propertyId)

  const populateFromProperty = useCallback((prop: PropertyOption) => {
    if (prop.clientId) {
      setClientId(prop.clientId)
    }
    if (!studyName) {
      setStudyName(`Cost Seg Study - ${prop.address}`)
    }
    const purchasePrice = typeof prop.purchasePrice === 'string'
      ? parseFloat(prop.purchasePrice)
      : prop.purchasePrice

    try {
      const typeMap: Record<string, string> = {
        mixed_use: 'mixed-use',
        office: 'commercial',
        warehouse: 'industrial',
        hotel: 'hospitality',
        other: 'commercial',
      }
      const lookupType = typeMap[prop.propertyType] || prop.propertyType
      const allocation = getDefaultAllocation(lookupType, purchasePrice)
      setAssets(
        allocation.map((a: AllocationBreakdown) => ({
          category: a.category,
          description: a.description,
          amount: a.amount,
          recoveryPeriod: a.recoveryPeriod,
          bonusEligible: a.recoveryPeriod > 0 && a.recoveryPeriod <= 20,
        }))
      )
    } catch {
      const allocation = getDefaultAllocation('commercial', purchasePrice)
      setAssets(
        allocation.map((a: AllocationBreakdown) => ({
          category: a.category,
          description: a.description,
          amount: a.amount,
          recoveryPeriod: a.recoveryPeriod,
          bonusEligible: a.recoveryPeriod > 0 && a.recoveryPeriod <= 20,
        }))
      )
    }
  }, [studyName])

  useEffect(() => {
    if (selectedProperty) {
      populateFromProperty(selectedProperty)
    }
  }, [propertyId, selectedProperty, populateFromProperty])

  function validateStep(step: number): boolean {
    const newErrors: Record<string, string> = {}
    if (step === 0) {
      if (!propertyId) newErrors.property_id = 'Please select a property'
      if (!studyName.trim()) newErrors.study_name = 'Study name is required'
      if (!clientId) newErrors.client_id = 'Please select a client'
    }
    if (step === 1) {
      if (taxRate < 0 || taxRate > 100) newErrors.tax_rate = 'Tax rate must be 0-100'
      if (discountRate < 0 || discountRate > 100) newErrors.discount_rate = 'Discount rate must be 0-100'
      if (bonusDepreciationRate < 0 || bonusDepreciationRate > 100) newErrors.bonus_depreciation_rate = 'Rate must be 0-100'
      if (studyYear < 2000 || studyYear > 2100) newErrors.study_year = 'Invalid year'
    }
    if (step === 2) {
      if (assets.length === 0) newErrors.assets = 'Add at least one asset class'
      const totalAmount = assets.reduce((sum, a) => sum + a.amount, 0)
      if (totalAmount <= 0) newErrors.assets = 'Total asset value must be positive'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function goNext() {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))
    }
  }

  function goBack() {
    setCurrentStep((s) => Math.max(s - 1, 0))
  }

  function updateAssetAmount(index: number, amount: number) {
    setAssets((prev) =>
      prev.map((a, i) => (i === index ? { ...a, amount } : a))
    )
  }

  function removeAsset(index: number) {
    setAssets((prev) => prev.filter((_, i) => i !== index))
  }

  function addAsset() {
    const usedCategories = new Set(assets.map((a) => a.category))
    const available = ASSET_CLASSES.find((ac) => !usedCategories.has(ac.category))
    if (available) {
      setAssets((prev) => [
        ...prev,
        {
          category: available.category,
          description: available.description,
          amount: 0,
          recoveryPeriod: available.recoveryPeriod,
          bonusEligible: available.recoveryPeriod > 0 && available.recoveryPeriod <= 20,
        },
      ])
    }
  }

  async function handleSubmit() {
    if (!validateStep(currentStep)) return
    setSubmitting(true)
    try {
      await onSubmit({
        study_name: studyName,
        property_id: propertyId,
        client_id: clientId,
        tax_rate: taxRate,
        discount_rate: discountRate,
        bonus_depreciation_rate: bonusDepreciationRate,
        study_year: studyYear,
        assets,
      })
    } catch (error) {
      console.error('Error submitting study:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const totalAssetValue = assets.reduce((sum, a) => sum + a.amount, 0)

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon
            const isActive = index === currentStep
            const isComplete = index < currentStep
            return (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                      isActive
                        ? 'border-amber-500 bg-amber-50 text-amber-600'
                        : isComplete
                        ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-gray-200 text-gray-500'
                    }`}
                  >
                    {isComplete ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-1.5 ${
                      isActive
                        ? 'text-amber-600 font-medium'
                        : isComplete
                        ? 'text-amber-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`hidden sm:block w-16 md:w-24 h-[2px] mx-2 mt-[-16px] ${
                      isComplete ? 'bg-amber-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step 1: Select Property */}
      {currentStep === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Select Property</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-500">Study Name</Label>
              <Input
                value={studyName}
                onChange={(e) => setStudyName(e.target.value)}
                placeholder="Cost Seg Study - 123 Main St"
                className="mt-1.5 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
              {errors.study_name && <p className="text-xs text-red-400 mt-1">{errors.study_name}</p>}
            </div>
            <div>
              <Label className="text-gray-500">Property</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger className="mt-1.5 w-full bg-gray-50 border-gray-200 text-gray-900">
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {properties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id} className="text-gray-900 focus:bg-amber-50 focus:text-amber-600">
                      {prop.address}{prop.city ? `, ${prop.city}` : ''}{prop.state ? `, ${prop.state}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.property_id && <p className="text-xs text-red-400 mt-1">{errors.property_id}</p>}
            </div>
            <div>
              <Label className="text-gray-500">Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="mt-1.5 w-full bg-gray-50 border-gray-200 text-gray-900">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id} className="text-gray-900 focus:bg-amber-50 focus:text-amber-600">
                      {client.firstName} {client.lastName}
                      {client.company ? ` - ${client.company}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && <p className="text-xs text-red-400 mt-1">{errors.client_id}</p>}
            </div>
          </div>
          {selectedProperty && (
            <div className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-100">
              <h4 className="text-sm font-medium text-amber-600 mb-3">Property Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Address</span>
                  <p className="text-gray-900">{selectedProperty.address}</p>
                </div>
                <div>
                  <span className="text-gray-500">Type</span>
                  <p className="text-gray-900 capitalize">{selectedProperty.propertyType.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-gray-500">Purchase Price</span>
                  <p className="text-gray-900">
                    {formatCurrency(typeof selectedProperty.purchasePrice === 'string' ? parseFloat(selectedProperty.purchasePrice) : selectedProperty.purchasePrice)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Building Value</span>
                  <p className="text-gray-900">
                    {selectedProperty.buildingValue
                      ? formatCurrency(typeof selectedProperty.buildingValue === 'string' ? parseFloat(selectedProperty.buildingValue) : selectedProperty.buildingValue)
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Tax Parameters */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Tax Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-gray-500">Tax Rate (%)</Label>
              <Input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} min={0} max={100} step={0.1} className="mt-1.5 bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20" />
              {errors.tax_rate && <p className="text-xs text-red-400 mt-1">{errors.tax_rate}</p>}
              <p className="text-xs text-gray-400 mt-1">Federal marginal tax rate</p>
            </div>
            <div>
              <Label className="text-gray-500">Discount Rate (%)</Label>
              <Input type="number" value={discountRate} onChange={(e) => setDiscountRate(Number(e.target.value))} min={0} max={100} step={0.1} className="mt-1.5 bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20" />
              {errors.discount_rate && <p className="text-xs text-red-400 mt-1">{errors.discount_rate}</p>}
              <p className="text-xs text-gray-400 mt-1">For NPV calculation</p>
            </div>
            <div>
              <Label className="text-gray-500">Bonus Depreciation Rate (%)</Label>
              <Input type="number" value={bonusDepreciationRate} onChange={(e) => setBonusDepreciationRate(Number(e.target.value))} min={0} max={100} step={1} className="mt-1.5 bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20" />
              {errors.bonus_depreciation_rate && <p className="text-xs text-red-400 mt-1">{errors.bonus_depreciation_rate}</p>}
              <p className="text-xs text-gray-400 mt-1">Section 168(k) rate for eligible assets</p>
            </div>
            <div>
              <Label className="text-gray-500">Study Year</Label>
              <Input type="number" value={studyYear} onChange={(e) => setStudyYear(Number(e.target.value))} min={2000} max={2100} className="mt-1.5 bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20" />
              {errors.study_year && <p className="text-xs text-red-400 mt-1">{errors.study_year}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Asset Breakdown */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Asset Breakdown</h3>
            <div className="text-sm text-gray-500">
              Total: <span className="text-amber-600 font-medium">{formatCurrency(totalAssetValue)}</span>
            </div>
          </div>
          {errors.assets && <p className="text-xs text-red-400">{errors.assets}</p>}
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-3 px-3 text-xs text-gray-500 uppercase tracking-wide">
              <div className="col-span-4">Category</div>
              <div className="col-span-2">Recovery</div>
              <div className="col-span-3">Amount</div>
              <div className="col-span-2 text-right">% of Total</div>
              <div className="col-span-1" />
            </div>
            {assets.map((asset, index) => {
              const pct = totalAssetValue > 0 ? ((asset.amount / totalAssetValue) * 100).toFixed(1) : '0.0'
              return (
                <div key={index} className="grid grid-cols-12 gap-3 items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="col-span-4">
                    <Select
                      value={asset.category}
                      onValueChange={(val) =>
                        setAssets((prev) =>
                          prev.map((a, i) =>
                            i === index
                              ? { ...a, category: val, description: CATEGORY_DESCRIPTIONS[val] || val, recoveryPeriod: CATEGORY_RECOVERY[val] || 0, bonusEligible: (CATEGORY_RECOVERY[val] || 0) > 0 && (CATEGORY_RECOVERY[val] || 0) <= 20 }
                              : a
                          )
                        )
                      }
                    >
                      <SelectTrigger className="bg-transparent border-gray-200 text-gray-900 text-sm h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {ASSET_CLASSES.map((ac) => (
                          <SelectItem key={ac.category} value={ac.category} className="text-gray-900 focus:bg-amber-50 focus:text-amber-600 text-sm">
                            {ac.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-gray-500">{asset.recoveryPeriod === 0 ? 'N/A' : `${asset.recoveryPeriod} yr`}</span>
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-600 text-xs">$</span>
                      <Input type="number" value={asset.amount || ''} onChange={(e) => updateAssetAmount(index, Number(e.target.value))} className="bg-transparent border-gray-200 text-gray-900 text-sm h-8 pl-5" />
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm text-gray-500">{pct}%</span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon-xs" onClick={() => removeAsset(index)} className="text-gray-500 hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
          {assets.length < ASSET_CLASSES.length && (
            <Button variant="outline" size="sm" onClick={addAsset} className="border-gray-200 text-gray-700 hover:bg-gray-50">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Asset Class
            </Button>
          )}
        </div>
      )}

      {/* Step 4: Review */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Study</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Study Name</span>
                <p className="text-sm font-medium text-gray-900 mt-1">{studyName}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Property</span>
                <p className="text-sm font-medium text-gray-900 mt-1">{selectedProperty?.address || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Client</span>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {clients.find((c) => c.id === clientId)
                    ? `${clients.find((c) => c.id === clientId)!.firstName} ${clients.find((c) => c.id === clientId)!.lastName}`
                    : '-'}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Study Year</span>
                <p className="text-sm font-medium text-gray-900 mt-1">{studyYear}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h4 className="text-sm font-semibold text-amber-600 mb-3">Tax Parameters</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-gray-500">Tax Rate</span>
                <p className="text-sm font-medium text-gray-900">{taxRate}%</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Discount Rate</span>
                <p className="text-sm font-medium text-gray-900">{discountRate}%</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Bonus Depreciation</span>
                <p className="text-sm font-medium text-gray-900">{bonusDepreciationRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h4 className="text-sm font-semibold text-amber-600 mb-3">Asset Allocation</h4>
            <div className="space-y-2">
              {assets.map((asset, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-500">{asset.description}</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(asset.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <span className="text-sm font-semibold text-amber-600">Total</span>
                <span className="text-sm font-bold text-amber-600">{formatCurrency(totalAssetValue)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goBack} disabled={currentStep === 0} className="border-gray-200 text-gray-700 hover:bg-gray-50">
          <ChevronLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={goNext} className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90">
            Next
            <ChevronRight className="h-4 w-4 ml-1.5" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting} className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90 px-8">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating Study...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Create Study
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

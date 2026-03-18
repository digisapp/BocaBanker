'use client'

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { getDefaultAllocation, ASSET_CLASSES, type AllocationBreakdown } from '@/lib/cost-seg/asset-classes'

export interface PropertyOption {
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

export interface ClientOption {
  id: string
  firstName: string
  lastName: string
  company?: string | null
}

export interface AssetRow {
  category: string
  description: string
  amount: number
  recoveryPeriod: number
  bonusEligible: boolean
}

export interface StudyFormData {
  study_name: string
  property_id: string
  client_id: string
  tax_rate: number
  discount_rate: number
  bonus_depreciation_rate: number
  study_year: number
  assets: AssetRow[]
}

export const STEPS = [
  { label: 'Select Property', iconName: 'Building2' as const },
  { label: 'Tax Parameters', iconName: 'Calculator' as const },
  { label: 'Asset Breakdown', iconName: 'BarChart3' as const },
  { label: 'Review & Calculate', iconName: 'ClipboardCheck' as const },
]

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  personal_property_5yr: '5-Year Personal Property',
  personal_property_7yr: '7-Year Personal Property',
  land_improvements_15yr: '15-Year Land Improvements',
  building_27_5yr: '27.5-Year Residential Rental',
  building_39yr: '39-Year Nonresidential',
  land: 'Land (Non-depreciable)',
}

export const CATEGORY_RECOVERY: Record<string, number> = {
  personal_property_5yr: 5,
  personal_property_7yr: 7,
  land_improvements_15yr: 15,
  building_27_5yr: 27.5,
  building_39yr: 39,
  land: 0,
}

interface UseStudyFormParams {
  properties: PropertyOption[]
  clients: ClientOption[]
  onSubmit: (data: StudyFormData) => Promise<void>
  defaultPropertyId?: string
}

export function useStudyForm({
  properties,
  onSubmit,
  defaultPropertyId,
}: UseStudyFormParams) {
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

  function updateAssetCategory(index: number, val: string) {
    setAssets((prev) =>
      prev.map((a, i) =>
        i === index
          ? {
              ...a,
              category: val,
              description: CATEGORY_DESCRIPTIONS[val] || val,
              recoveryPeriod: CATEGORY_RECOVERY[val] || 0,
              bonusEligible: (CATEGORY_RECOVERY[val] || 0) > 0 && (CATEGORY_RECOVERY[val] || 0) <= 20,
            }
          : a
      )
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
      logger.error('StudyForm', 'Error submitting study', error)
    } finally {
      setSubmitting(false)
    }
  }

  const totalAssetValue = assets.reduce((sum, a) => sum + a.amount, 0)

  return {
    // Navigation
    currentStep,
    goNext,
    goBack,

    // Form state
    studyName,
    setStudyName,
    propertyId,
    setPropertyId,
    clientId,
    setClientId,
    taxRate,
    setTaxRate,
    discountRate,
    setDiscountRate,
    bonusDepreciationRate,
    setBonusDepreciationRate,
    studyYear,
    setStudyYear,
    assets,
    totalAssetValue,

    // Asset management
    updateAssetAmount,
    updateAssetCategory,
    removeAsset,
    addAsset,

    // Submission
    submitting,
    handleSubmit,

    // Validation
    errors,

    // Derived
    selectedProperty,
  }
}

export type UseStudyFormReturn = ReturnType<typeof useStudyForm>

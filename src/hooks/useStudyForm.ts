'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import {
  getDefaultAllocation,
  getAllocationFromBuildingValue,
  ASSET_CLASSES,
  type AllocationBreakdown,
} from '@/lib/cost-seg/asset-classes'
import { getBonusRateForYear } from '@/lib/cost-seg/bonus-depreciation'

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

function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return NaN
  return typeof v === 'string' ? parseFloat(v) : v
}

/**
 * Seed the asset breakdown. When the property records its own building value,
 * split THAT across the asset classes (the report's straight-line baseline is
 * the building value, so the assets must sum to it). Otherwise fall back to
 * the typical allocation of the purchase price (20% land).
 */
function allocationFor(
  type: string,
  prop: PropertyOption,
  purchasePrice: number
): AllocationBreakdown[] {
  const buildingValue = toNumber(prop.buildingValue)
  if (Number.isFinite(buildingValue) && buildingValue > 0) {
    const landValue = toNumber(prop.landValue)
    return getAllocationFromBuildingValue(
      type,
      buildingValue,
      Number.isFinite(landValue) ? landValue : null,
      Number.isFinite(purchasePrice) ? purchasePrice : null
    )
  }
  return getDefaultAllocation(type, Number.isFinite(purchasePrice) ? purchasePrice : 0)
}

function toAssetRows(allocation: AllocationBreakdown[]): AssetRow[] {
  return allocation.map((a) => ({
    category: a.category,
    description: a.description,
    amount: a.amount,
    recoveryPeriod: a.recoveryPeriod,
    bonusEligible: a.recoveryPeriod > 0 && a.recoveryPeriod <= 20,
  }))
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
  const [bonusDepreciationRate, setBonusDepreciationRateState] = useState(() =>
    getBonusRateForYear(new Date().getFullYear())
  )
  const [studyYear, setStudyYearState] = useState(new Date().getFullYear())
  // Once the user edits the bonus rate by hand, stop re-deriving it from the
  // study year (e.g. property acquired before Jan 20, 2025 under TCJA rules).
  const bonusRateTouchedRef = useRef(false)

  const setBonusDepreciationRate = useCallback((value: number) => {
    bonusRateTouchedRef.current = true
    setBonusDepreciationRateState(value)
  }, [])

  const setStudyYear = useCallback((year: number) => {
    setStudyYearState(year)
    // Default the §168(k) rate to the statutory rate for the placed-in-service
    // year (60% for 2024, 80% for 2023, 100% for 2025+ under OBBBA) instead
    // of leaving a hard-coded 100% that overstates pre-2025 studies.
    if (!bonusRateTouchedRef.current && year >= 2000 && year <= 2100) {
      setBonusDepreciationRateState(getBonusRateForYear(year))
    }
  }, [])
  const [assets, setAssets] = useState<AssetRow[]>([])

  const selectedProperty = properties.find((p) => p.id === propertyId)

  // Remember which property we last populated from so renaming the study (or
  // any other re-render) never re-runs population and clobbers manual edits.
  const lastPopulatedPropertyIdRef = useRef<string | null>(null)

  const populateFromProperty = useCallback((prop: PropertyOption) => {
    if (prop.clientId) {
      setClientId(prop.clientId)
    }
    setStudyName((prev) => prev || `Cost Seg Study - ${prop.address}`)
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
      setAssets(toAssetRows(allocationFor(lookupType, prop, purchasePrice)))
    } catch {
      setAssets(toAssetRows(allocationFor('commercial', prop, purchasePrice)))
    }
  }, [])

  useEffect(() => {
    if (
      selectedProperty &&
      selectedProperty.id !== lastPopulatedPropertyIdRef.current
    ) {
      lastPopulatedPropertyIdRef.current = selectedProperty.id
      populateFromProperty(selectedProperty)
    }
  }, [selectedProperty, populateFromProperty])

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
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : 'Failed to save study. Please try again.'
      )
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

'use client'

import {
  Building2,
  Calculator,
  BarChart3,
  ClipboardCheck,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStudyForm, STEPS } from '@/hooks/useStudyForm'
import type { PropertyOption, ClientOption, StudyFormData } from '@/hooks/useStudyForm'
import StudyPropertyStep from './StudyPropertyStep'
import StudyTaxParamsStep from './StudyTaxParamsStep'
import StudyAssetStep from './StudyAssetStep'
import StudyReviewStep from './StudyReviewStep'
import type { LucideIcon } from 'lucide-react'

interface StudyFormProps {
  properties: PropertyOption[]
  clients: ClientOption[]
  onSubmit: (data: StudyFormData) => Promise<void>
  defaultPropertyId?: string
}

const STEP_ICONS: Record<string, LucideIcon> = {
  Building2,
  Calculator,
  BarChart3,
  ClipboardCheck,
}

export default function StudyForm({
  properties,
  clients,
  onSubmit,
  defaultPropertyId,
}: StudyFormProps) {
  const form = useStudyForm({ properties, clients, onSubmit, defaultPropertyId })

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const StepIcon = STEP_ICONS[step.iconName]
            const isActive = index === form.currentStep
            const isComplete = index < form.currentStep
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

      {/* Step Content */}
      {form.currentStep === 0 && (
        <StudyPropertyStep
          studyName={form.studyName}
          onStudyNameChange={form.setStudyName}
          propertyId={form.propertyId}
          onPropertyIdChange={form.setPropertyId}
          clientId={form.clientId}
          onClientIdChange={form.setClientId}
          properties={properties}
          clients={clients}
          selectedProperty={form.selectedProperty}
          errors={form.errors}
        />
      )}

      {form.currentStep === 1 && (
        <StudyTaxParamsStep
          taxRate={form.taxRate}
          onTaxRateChange={form.setTaxRate}
          discountRate={form.discountRate}
          onDiscountRateChange={form.setDiscountRate}
          bonusDepreciationRate={form.bonusDepreciationRate}
          onBonusDepreciationRateChange={form.setBonusDepreciationRate}
          studyYear={form.studyYear}
          onStudyYearChange={form.setStudyYear}
          errors={form.errors}
        />
      )}

      {form.currentStep === 2 && (
        <StudyAssetStep
          assets={form.assets}
          totalAssetValue={form.totalAssetValue}
          onUpdateAmount={form.updateAssetAmount}
          onUpdateCategory={form.updateAssetCategory}
          onRemove={form.removeAsset}
          onAdd={form.addAsset}
          errors={form.errors}
        />
      )}

      {form.currentStep === 3 && (
        <StudyReviewStep
          studyName={form.studyName}
          selectedProperty={form.selectedProperty}
          clients={clients}
          clientId={form.clientId}
          studyYear={form.studyYear}
          taxRate={form.taxRate}
          discountRate={form.discountRate}
          bonusDepreciationRate={form.bonusDepreciationRate}
          assets={form.assets}
          totalAssetValue={form.totalAssetValue}
        />
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={form.goBack} disabled={form.currentStep === 0} className="border-gray-200 text-gray-700 hover:bg-gray-50">
          <ChevronLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>

        {form.currentStep < STEPS.length - 1 ? (
          <Button onClick={form.goNext} className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90">
            Next
            <ChevronRight className="h-4 w-4 ml-1.5" />
          </Button>
        ) : (
          <Button onClick={form.handleSubmit} disabled={form.submitting} className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90 px-8">
            {form.submitting ? (
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

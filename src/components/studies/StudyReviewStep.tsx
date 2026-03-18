'use client'

import { formatCurrency } from '@/lib/utils'
import type { AssetRow, PropertyOption, ClientOption } from '@/hooks/useStudyForm'

interface StudyReviewStepProps {
  studyName: string
  selectedProperty: PropertyOption | undefined
  clients: ClientOption[]
  clientId: string
  studyYear: number
  taxRate: number
  discountRate: number
  bonusDepreciationRate: number
  assets: AssetRow[]
  totalAssetValue: number
}

export default function StudyReviewStep({
  studyName,
  selectedProperty,
  clients,
  clientId,
  studyYear,
  taxRate,
  discountRate,
  bonusDepreciationRate,
  assets,
  totalAssetValue,
}: StudyReviewStepProps) {
  const selectedClient = clients.find((c) => c.id === clientId)

  return (
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
              {selectedClient
                ? `${selectedClient.firstName} ${selectedClient.lastName}`
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
  )
}

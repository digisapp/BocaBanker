'use client'

import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ASSET_CLASSES } from '@/lib/cost-seg/asset-classes'
import { formatCurrency } from '@/lib/utils'
import type { AssetRow } from '@/hooks/useStudyForm'

interface StudyAssetStepProps {
  assets: AssetRow[]
  totalAssetValue: number
  onUpdateAmount: (index: number, amount: number) => void
  onUpdateCategory: (index: number, category: string) => void
  onRemove: (index: number) => void
  onAdd: () => void
  errors: Record<string, string>
}

export default function StudyAssetStep({
  assets,
  totalAssetValue,
  onUpdateAmount,
  onUpdateCategory,
  onRemove,
  onAdd,
  errors,
}: StudyAssetStepProps) {
  return (
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
                  onValueChange={(val) => onUpdateCategory(index, val)}
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
                  <Input type="number" value={asset.amount || ''} onChange={(e) => onUpdateAmount(index, Number(e.target.value))} className="bg-transparent border-gray-200 text-gray-900 text-sm h-8 pl-5" />
                </div>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm text-gray-500">{pct}%</span>
              </div>
              <div className="col-span-1 flex justify-end">
                <Button variant="ghost" size="icon-xs" onClick={() => onRemove(index)} className="text-gray-500 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
      {assets.length < ASSET_CLASSES.length && (
        <Button variant="outline" size="sm" onClick={onAdd} className="border-gray-200 text-gray-700 hover:bg-gray-50">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Asset Class
        </Button>
      )}
    </div>
  )
}

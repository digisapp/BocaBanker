'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import type { PropertyOption, ClientOption } from '@/hooks/useStudyForm'

interface StudyPropertyStepProps {
  studyName: string
  onStudyNameChange: (value: string) => void
  propertyId: string
  onPropertyIdChange: (value: string) => void
  clientId: string
  onClientIdChange: (value: string) => void
  properties: PropertyOption[]
  clients: ClientOption[]
  selectedProperty: PropertyOption | undefined
  errors: Record<string, string>
}

export default function StudyPropertyStep({
  studyName,
  onStudyNameChange,
  propertyId,
  onPropertyIdChange,
  clientId,
  onClientIdChange,
  properties,
  clients,
  selectedProperty,
  errors,
}: StudyPropertyStepProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Select Property</h3>
      <div className="space-y-4">
        <div>
          <Label className="text-gray-500">Study Name</Label>
          <Input
            value={studyName}
            onChange={(e) => onStudyNameChange(e.target.value)}
            placeholder="Cost Seg Study - 123 Main St"
            className="mt-1.5 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
          />
          {errors.study_name && <p className="text-xs text-red-400 mt-1">{errors.study_name}</p>}
        </div>
        <div>
          <Label className="text-gray-500">Property</Label>
          <Select value={propertyId} onValueChange={onPropertyIdChange}>
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
          <Select value={clientId} onValueChange={onClientIdChange}>
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
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowRight } from 'lucide-react'

const CLIENT_FIELDS = [
  { value: '__skip__', label: 'Skip this column' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'zip', label: 'ZIP Code' },
  { value: 'status', label: 'Status' },
  { value: 'tags', label: 'Tags' },
  { value: 'notes', label: 'Notes' },
  { value: 'source', label: 'Source' },
]

const AUTO_MAP: Record<string, string> = {
  'first name': 'first_name',
  'first_name': 'first_name',
  'firstname': 'first_name',
  'first': 'first_name',
  'last name': 'last_name',
  'last_name': 'last_name',
  'lastname': 'last_name',
  'last': 'last_name',
  'email': 'email',
  'email address': 'email',
  'e-mail': 'email',
  'phone': 'phone',
  'phone number': 'phone',
  'telephone': 'phone',
  'mobile': 'phone',
  'cell': 'phone',
  'company': 'company',
  'company name': 'company',
  'organization': 'company',
  'org': 'company',
  'address': 'address',
  'street': 'address',
  'street address': 'address',
  'city': 'city',
  'state': 'state',
  'province': 'state',
  'zip': 'zip',
  'zip code': 'zip',
  'zipcode': 'zip',
  'postal code': 'zip',
  'postal': 'zip',
  'status': 'status',
  'tags': 'tags',
  'tag': 'tags',
  'notes': 'notes',
  'note': 'notes',
  'comments': 'notes',
  'source': 'source',
  'lead source': 'source',
  'referral': 'source',
}

interface ColumnMapperProps {
  csvHeaders: string[]
  onMappingComplete: (mapping: Record<string, string>) => void
}

export function ColumnMapper({
  csvHeaders,
  onMappingComplete,
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({})

  // Auto-detect common mappings on mount
  useEffect(() => {
    const autoMapping: Record<string, string> = {}
    const usedFields = new Set<string>()

    csvHeaders.forEach((header) => {
      const normalized = header.toLowerCase().trim()
      const match = AUTO_MAP[normalized]
      if (match && !usedFields.has(match)) {
        autoMapping[header] = match
        usedFields.add(match)
      }
    })

    setMapping(autoMapping)
  }, [csvHeaders])

  const handleFieldChange = (csvHeader: string, clientField: string) => {
    setMapping((prev) => {
      const updated = { ...prev }
      if (clientField === '__skip__') {
        delete updated[csvHeader]
      } else {
        updated[csvHeader] = clientField
      }
      return updated
    })
  }

  const handleConfirm = () => {
    // Only pass through actual field mappings (exclude skipped)
    const finalMapping: Record<string, string> = {}
    for (const [csvHeader, field] of Object.entries(mapping)) {
      if (field !== '__skip__') {
        finalMapping[csvHeader] = field
      }
    }
    onMappingComplete(finalMapping)
  }

  // Check which client fields are already used
  const usedFields = new Set(Object.values(mapping))
  const hasRequiredFields =
    usedFields.has('first_name') && usedFields.has('last_name')

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-gold mb-4">
          Map CSV Columns
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Match each CSV column to the corresponding client field. First Name
          and Last Name are required.
        </p>

        <div className="space-y-3">
          {csvHeaders.map((header) => (
            <div
              key={header}
              className="flex items-center gap-4 p-3 rounded-lg bg-navy/50 border border-gold/10"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground truncate block">
                  {header}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-gold/50 shrink-0" />
              <div className="flex-1">
                <Select
                  value={mapping[header] ?? '__skip__'}
                  onValueChange={(value) => handleFieldChange(header, value)}
                >
                  <SelectTrigger className="w-full bg-navy-light/50 border-gold/20 text-foreground">
                    <SelectValue placeholder="Select field..." />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-light border-gold/20">
                    {CLIENT_FIELDS.map((field) => (
                      <SelectItem
                        key={field.value}
                        value={field.value}
                        disabled={
                          field.value !== '__skip__' &&
                          field.value !== mapping[header] &&
                          usedFields.has(field.value)
                        }
                      >
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!hasRequiredFields && (
        <p className="text-sm text-destructive">
          You must map both First Name and Last Name to proceed.
        </p>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleConfirm}
          disabled={!hasRequiredFields}
          className="bg-gold-gradient text-navy font-semibold hover:opacity-90 px-8"
        >
          Confirm Mapping
        </Button>
      </div>
    </div>
  )
}

'use client'

import { useState, useCallback, useRef } from 'react'
import { logger } from '@/lib/logger'
import Papa from 'papaparse'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Step = 1 | 2 | 3 | 4

interface ImportResult {
  imported: number
  errors: { row: number; message: string }[]
}

const LEAD_FIELDS = [
  { value: '__skip__', label: 'Skip this column' },
  { value: 'property_address', label: 'Property Address' },
  { value: 'property_city', label: 'Property City' },
  { value: 'property_county', label: 'Property County' },
  { value: 'property_state', label: 'Property State' },
  { value: 'property_zip', label: 'Property ZIP' },
  { value: 'property_type', label: 'Property Type' },
  { value: 'sale_price', label: 'Sale Price' },
  { value: 'sale_date', label: 'Sale Date' },
  { value: 'parcel_id', label: 'Parcel ID' },
  { value: 'buyer_name', label: 'Buyer Name' },
  { value: 'buyer_company', label: 'Buyer Company' },
  { value: 'buyer_email', label: 'Buyer Email' },
  { value: 'buyer_phone', label: 'Buyer Phone' },
  { value: 'seller_name', label: 'Seller Name' },
  { value: 'square_footage', label: 'Square Footage' },
  { value: 'year_built', label: 'Year Built' },
  { value: 'source', label: 'Source' },
  { value: 'notes', label: 'Notes' },
  { value: 'tags', label: 'Tags' },
]

const AUTO_MAP: Record<string, string> = {
  'property address': 'property_address',
  'property_address': 'property_address',
  'address': 'property_address',
  'street': 'property_address',
  'street address': 'property_address',
  'property city': 'property_city',
  'property_city': 'property_city',
  'city': 'property_city',
  'property county': 'property_county',
  'property_county': 'property_county',
  'county': 'property_county',
  'property state': 'property_state',
  'property_state': 'property_state',
  'state': 'property_state',
  'property zip': 'property_zip',
  'property_zip': 'property_zip',
  'zip': 'property_zip',
  'zip code': 'property_zip',
  'zipcode': 'property_zip',
  'postal code': 'property_zip',
  'property type': 'property_type',
  'property_type': 'property_type',
  'type': 'property_type',
  'sale price': 'sale_price',
  'sale_price': 'sale_price',
  'price': 'sale_price',
  'purchase price': 'sale_price',
  'amount': 'sale_price',
  'sale date': 'sale_date',
  'sale_date': 'sale_date',
  'date': 'sale_date',
  'close date': 'sale_date',
  'closing date': 'sale_date',
  'parcel id': 'parcel_id',
  'parcel_id': 'parcel_id',
  'parcel': 'parcel_id',
  'apn': 'parcel_id',
  'buyer name': 'buyer_name',
  'buyer_name': 'buyer_name',
  'buyer': 'buyer_name',
  'grantee': 'buyer_name',
  'buyer company': 'buyer_company',
  'buyer_company': 'buyer_company',
  'company': 'buyer_company',
  'organization': 'buyer_company',
  'buyer email': 'buyer_email',
  'buyer_email': 'buyer_email',
  'email': 'buyer_email',
  'buyer phone': 'buyer_phone',
  'buyer_phone': 'buyer_phone',
  'phone': 'buyer_phone',
  'telephone': 'buyer_phone',
  'seller name': 'seller_name',
  'seller_name': 'seller_name',
  'seller': 'seller_name',
  'grantor': 'seller_name',
  'square footage': 'square_footage',
  'square_footage': 'square_footage',
  'sqft': 'square_footage',
  'sq ft': 'square_footage',
  'area': 'square_footage',
  'year built': 'year_built',
  'year_built': 'year_built',
  'yearbuilt': 'year_built',
  'built': 'year_built',
  'source': 'source',
  'lead source': 'source',
  'notes': 'notes',
  'note': 'notes',
  'comments': 'notes',
  'tags': 'tags',
  'tag': 'tags',
}

interface LeadImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
  children: React.ReactNode
}

export function LeadImportModal({
  open,
  onOpenChange,
  onImportComplete,
  children,
}: LeadImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>(1)
  const [file, setFile] = useState<File | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [mappedPreview, setMappedPreview] = useState<Record<string, string>[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resetState = () => {
    setStep(1)
    setFile(null)
    setCsvHeaders([])
    setCsvRows([])
    setMapping({})
    setMappedPreview([])
    setImporting(false)
    setResult(null)
    setError(null)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState()
    }
    onOpenChange(newOpen)
  }

  const handleFileDrop = useCallback(
    async (droppedFile: File) => {
      setError(null)
      if (!droppedFile.name.endsWith('.csv')) {
        setError('Please upload a .csv file.')
        return
      }

      setFile(droppedFile)

      Papa.parse(droppedFile, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        complete: (results) => {
          const headers = results.meta.fields ?? []
          const rows = results.data as Record<string, string>[]

          if (headers.length === 0 || rows.length === 0) {
            setError('CSV file is empty or has no data rows.')
            return
          }

          setCsvHeaders(headers)
          setCsvRows(rows)

          // Auto-map matching headers
          const autoMapping: Record<string, string> = {}
          const usedFields = new Set<string>()

          headers.forEach((header) => {
            const normalized = header.toLowerCase().trim()
            const match = AUTO_MAP[normalized]
            if (match && !usedFields.has(match)) {
              autoMapping[header] = match
              usedFields.add(match)
            }
          })

          setMapping(autoMapping)
          setStep(2)
        },
        error: () => {
          setError('Failed to parse CSV file. Please check the format.')
        },
      })
    },
    []
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) handleFileDrop(droppedFile)
    },
    [handleFileDrop]
  )

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) handleFileDrop(selectedFile)
    },
    [handleFileDrop]
  )

  const handleFieldChange = (csvHeader: string, leadField: string) => {
    setMapping((prev) => {
      const updated = { ...prev }
      if (leadField === '__skip__') {
        delete updated[csvHeader]
      } else {
        updated[csvHeader] = leadField
      }
      return updated
    })
  }

  const handleMappingConfirm = () => {
    const finalMapping: Record<string, string> = {}
    for (const [csvHeader, field] of Object.entries(mapping)) {
      if (field !== '__skip__') {
        finalMapping[csvHeader] = field
      }
    }

    setMapping(finalMapping)

    // Build preview with mapped field names
    const preview = csvRows.slice(0, 5).map((row) => {
      const mapped: Record<string, string> = {}
      for (const [csvHeader, leadField] of Object.entries(finalMapping)) {
        mapped[leadField] = row[csvHeader] ?? ''
      }
      return mapped
    })

    setMappedPreview(preview)
    setStep(3)
  }

  const handleImport = async () => {
    setImporting(true)
    setError(null)

    try {
      const transformedLeads = csvRows.map((row) => {
        const lead: Record<string, string> = {}
        for (const [csvHeader, leadField] of Object.entries(mapping)) {
          lead[leadField] = row[csvHeader] ?? ''
        }
        return lead
      })

      const response = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: transformedLeads, mapping }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Import failed')
      }

      const data: ImportResult = await response.json()
      setResult(data)
      setStep(4)
      onImportComplete()
    } catch (err) {
      logger.error('lead-import', 'Failed to import leads', err)
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const mappedFieldNames = Object.values(mapping)
  const usedFields = new Set(Object.values(mapping))
  const hasRequiredFields = usedFields.has('property_address')

  const stepLabels = ['Upload', 'Map Columns', 'Review', 'Import']

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-white border-gray-200 sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Import Leads from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2">
            {stepLabels.map((label, i) => {
              const stepNum = (i + 1) as Step
              const isActive = step === stepNum
              const isComplete = step > stepNum
              return (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && (
                    <div
                      className={`h-px w-8 ${
                        isComplete ? 'bg-amber-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white'
                          : isComplete
                          ? 'bg-amber-50 text-amber-600 border border-amber-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        stepNum
                      )}
                    </div>
                    <span
                      className={`text-sm hidden sm:inline ${
                        isActive
                          ? 'text-amber-600 font-medium'
                          : isComplete
                          ? 'text-amber-600/70'
                          : 'text-gray-500'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 1 && (
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-amber-400 transition-colors rounded-xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                <Upload className="h-8 w-8 text-amber-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900">
                  Drop your CSV file here
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to browse files
                </p>
              </div>
              <Badge variant="outline" className="border-gray-200 text-gray-500">
                .csv files only
              </Badge>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={onFileInput}
                className="hidden"
              />
            </div>
          )}

          {/* Step 2: Map Columns */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="h-5 w-5 text-amber-600" />
                <span className="text-sm text-gray-500">
                  {file?.name} &mdash; {csvRows.length} rows found
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Match each CSV column to the corresponding lead field. Property
                  Address is required.
                </p>

                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {csvHeaders.map((header) => (
                    <div
                      key={header}
                      className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 border border-gray-200"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 truncate block">
                          {header}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                      <div className="flex-1">
                        <Select
                          value={mapping[header] ?? '__skip__'}
                          onValueChange={(value) => handleFieldChange(header, value)}
                        >
                          <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-900">
                            <SelectValue placeholder="Select field..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            {LEAD_FIELDS.map((field) => (
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
                <p className="text-sm text-red-500">
                  You must map Property Address to proceed.
                </p>
              )}

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1)
                    setFile(null)
                    setCsvHeaders([])
                    setCsvRows([])
                    setMapping({})
                  }}
                  className="border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Back
                </Button>
                <Button
                  onClick={handleMappingConfirm}
                  disabled={!hasRequiredFields}
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90 px-8"
                >
                  Confirm Mapping
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-amber-600 mb-2">
                  Review Import
                </h3>
                <p className="text-sm text-gray-500">
                  Preview of first 5 rows with your column mapping applied.{' '}
                  <strong className="text-gray-900">
                    {csvRows.length} total rows
                  </strong>{' '}
                  will be imported.
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 overflow-auto max-h-[40vh]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 hover:bg-transparent">
                      {mappedFieldNames.map((field) => (
                        <TableHead
                          key={field}
                          className="bg-gray-50 text-amber-600 font-semibold text-xs uppercase tracking-wider whitespace-nowrap"
                        >
                          {field.replace(/_/g, ' ')}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappedPreview.map((row, i) => (
                      <TableRow
                        key={i}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        {mappedFieldNames.map((field) => (
                          <TableCell
                            key={field}
                            className="text-gray-700 text-sm whitespace-nowrap"
                          >
                            {row[field] || '--'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Back to Mapping
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importing}
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90 px-8"
                >
                  {importing && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {importing
                    ? 'Importing...'
                    : `Import ${csvRows.length} Leads`}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && result && (
            <div className="space-y-4">
              <div className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Import Complete
                </h3>
                <p className="text-gray-500">
                  Successfully imported{' '}
                  <strong className="text-amber-600">{result.imported}</strong> leads.
                </p>
                {result.errors.length > 0 && (
                  <p className="text-sm text-red-500 mt-2">
                    {result.errors.length} row(s) had errors and were skipped.
                  </p>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h4 className="text-sm font-semibold text-red-500 mb-3">
                    Import Errors
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-500"
                      >
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <span>
                          Row {err.row}: {err.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <Button
                  onClick={() => handleOpenChange(false)}
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90 px-8"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

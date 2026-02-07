'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { parseCSV } from '@/lib/csv/parser'
import { ColumnMapper } from '@/components/clients/ColumnMapper'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

export function CsvImporter() {
  const router = useRouter()
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

  const handleFileDrop = useCallback(
    async (droppedFile: File) => {
      setError(null)
      if (!droppedFile.name.endsWith('.csv')) {
        setError('Please upload a .csv file.')
        return
      }

      setFile(droppedFile)

      try {
        const { headers, rows } = await parseCSV(droppedFile)
        if (headers.length === 0 || rows.length === 0) {
          setError('CSV file is empty or has no data rows.')
          return
        }
        setCsvHeaders(headers)
        setCsvRows(rows)
        setStep(2)
      } catch {
        setError('Failed to parse CSV file. Please check the format.')
      }
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

  const handleMappingComplete = (newMapping: Record<string, string>) => {
    setMapping(newMapping)

    // Build preview with mapped field names
    const preview = csvRows.slice(0, 5).map((row) => {
      const mapped: Record<string, string> = {}
      for (const [csvHeader, clientField] of Object.entries(newMapping)) {
        mapped[clientField] = row[csvHeader] ?? ''
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
      // Transform rows using the mapping
      const transformedClients = csvRows.map((row) => {
        const client: Record<string, string> = {}
        for (const [csvHeader, clientField] of Object.entries(mapping)) {
          client[clientField] = row[csvHeader] ?? ''
        }
        return client
      })

      const response = await fetch('/api/clients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: transformedClients, mapping }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Import failed')
      }

      const data: ImportResult = await response.json()
      setResult(data)
      setStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const mappedFieldNames = Object.values(mapping)

  const stepLabels = ['Upload', 'Map Columns', 'Review', 'Import']

  return (
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
          className="bg-white rounded-2xl border-2 border-dashed border-gray-300 hover:border-amber-400 transition-colors rounded-xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer"
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
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="h-5 w-5 text-amber-600" />
            <span className="text-sm text-gray-500">
              {file?.name} &mdash; {csvRows.length} rows found
            </span>
          </div>
          <ColumnMapper
            csvHeaders={csvHeaders}
            onMappingComplete={handleMappingComplete}
          />
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-amber-600 mb-2">
              Review Import
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Preview of first 5 rows with your column mapping applied.{' '}
              <strong className="text-gray-900">
                {csvRows.length} total rows
              </strong>{' '}
              will be imported.
            </p>

            <div className="rounded-lg border border-gray-200 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200 hover:bg-transparent">
                    {mappedFieldNames.map((field) => (
                      <TableHead
                        key={field}
                        className="bg-gray-50 text-amber-600 font-semibold text-xs uppercase tracking-wider"
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
                          className="text-gray-700 text-sm"
                        >
                          {row[field] || '--'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
                : `Import ${csvRows.length} Clients`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 4 && result && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Import Complete
            </h3>
            <p className="text-gray-500">
              Successfully imported{' '}
              <strong className="text-amber-600">{result.imported}</strong> clients.
            </p>
            {result.errors.length > 0 && (
              <p className="text-sm text-red-500 mt-2">
                {result.errors.length} row(s) had errors and were skipped.
              </p>
            )}
          </div>

          {result.errors.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h4 className="text-sm font-semibold text-red-500 mb-3">
                Import Errors
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
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
              onClick={() => router.push('/clients')}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90 px-8"
            >
              Go to Clients
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

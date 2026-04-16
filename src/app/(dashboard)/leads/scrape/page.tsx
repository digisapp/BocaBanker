'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Database,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  Download,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────────────────────────

type Mode = 'attom' | 'county'

interface CountyInfo {
  name: string
  searchUrl: string
  bulkDataUrl: string | null
  instructions: string
}

interface AttomResult {
  imported: number
  source: string
}

interface CountyResult {
  counties: CountyInfo[]
  csvFormat: string[]
}

// ── ATTOM-supported property types ─────────────────────────────────────────

const ATTOM_PROPERTY_TYPES = [
  { value: 'industrial', label: 'Industrial' },
  { value: 'office', label: 'Office' },
]

const FLORIDA_COUNTIES = [
  'Palm Beach',
  'Broward',
  'Miami-Dade',
  'Orange',
  'Hillsborough',
  'Duval',
]

const CSV_COLUMNS = [
  'property_address', 'property_city', 'property_county', 'property_state',
  'property_zip', 'property_type', 'sale_price', 'sale_date', 'parcel_id',
  'deed_book_page', 'buyer_name', 'buyer_company', 'seller_name',
  'square_footage', 'year_built', 'building_value', 'land_value',
]

// ── Page ───────────────────────────────────────────────────────────────────

export default function LeadScrapePage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('attom')

  // ATTOM form state
  const [attomKey, setAttomKey] = useState('')
  const [state, setState] = useState('FL')
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['industrial', 'office'])
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // County form state
  const [selectedCounties, setSelectedCounties] = useState<string[]>([])

  // Shared status
  const [loading, setLoading] = useState(false)
  const [attomResult, setAttomResult] = useState<AttomResult | null>(null)
  const [countyResult, setCountyResult] = useState<CountyResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function toggleType(value: string) {
    setSelectedTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    )
  }

  function toggleCounty(name: string) {
    setSelectedCounties((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    )
  }

  async function runAttomImport() {
    if (!attomKey.trim()) {
      toast.error('ATTOM API key is required')
      return
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      toast.error('Date From must be before Date To')
      return
    }

    setLoading(true)
    setError(null)
    setAttomResult(null)

    try {
      const body: Record<string, unknown> = {
        source: 'attom',
        attomApiKey: attomKey.trim(),
        state,
        propertyTypes: selectedTypes,
      }
      if (minPrice) body.minPrice = Number(minPrice)
      if (maxPrice) body.maxPrice = Number(maxPrice)
      if (dateFrom) body.dateFrom = dateFrom
      if (dateTo) body.dateTo = dateTo

      const res = await fetch('/api/leads/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Import failed')
        toast.error(data.error || 'Import failed')
        return
      }

      setAttomResult(data)
      toast.success(`Imported ${data.imported} leads from ATTOM`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCountyInstructions() {
    setLoading(true)
    setError(null)
    setCountyResult(null)

    try {
      const body: Record<string, unknown> = { source: 'county' }
      if (selectedCounties.length > 0) body.counties = selectedCounties

      const res = await fetch('/api/leads/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to fetch county data')
        return
      }

      setCountyResult(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/leads')}
          className="text-gray-500 hover:text-gray-700 -ml-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Leads
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-serif font-bold text-amber-600">Import Leads</h1>
        <p className="text-gray-500 mt-1">
          Pull commercial real estate transaction data from ATTOM or county property appraiser sites.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => { setMode('attom'); setError(null); setAttomResult(null) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'attom'
              ? 'bg-white shadow-sm text-amber-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Zap className="h-4 w-4" />
          ATTOM API
        </button>
        <button
          onClick={() => { setMode('county'); setError(null); setCountyResult(null) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'county'
              ? 'bg-white shadow-sm text-amber-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <MapPin className="h-4 w-4" />
          County Sites
        </button>
      </div>

      {/* ── ATTOM Panel ── */}
      {mode === 'attom' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">ATTOM Property Data</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Pulls paginated commercial sale records directly into your leads dashboard.
                Get an API key at{' '}
                <a
                  href="https://api.gateway.attomdata.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 hover:underline"
                >
                  api.gateway.attomdata.com
                </a>.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {/* API Key */}
            <div className="space-y-1.5">
              <Label htmlFor="attom-key">ATTOM API Key <span className="text-red-400">*</span></Label>
              <Input
                id="attom-key"
                type="password"
                placeholder="Your ATTOM API key"
                value={attomKey}
                onChange={(e) => setAttomKey(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            {/* State */}
            <div className="space-y-1.5">
              <Label>State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FL">Florida</SelectItem>
                  <SelectItem value="TX">Texas</SelectItem>
                  <SelectItem value="CA">California</SelectItem>
                  <SelectItem value="NY">New York</SelectItem>
                  <SelectItem value="GA">Georgia</SelectItem>
                  <SelectItem value="NC">North Carolina</SelectItem>
                  <SelectItem value="AZ">Arizona</SelectItem>
                  <SelectItem value="CO">Colorado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Property Types */}
            <div className="space-y-1.5">
              <Label>Property Types</Label>
              <div className="flex gap-2 flex-wrap">
                {ATTOM_PROPERTY_TYPES.map((pt) => (
                  <button
                    key={pt.value}
                    onClick={() => toggleType(pt.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      selectedTypes.includes(pt.value)
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">Additional property types can be added by extending the ATTOM type map in the API.</p>
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="min-price">Min Sale Price</Label>
                <Input
                  id="min-price"
                  type="number"
                  placeholder="e.g. 500000"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max-price">Max Sale Price</Label>
                <Input
                  id="max-price"
                  type="number"
                  placeholder="e.g. 10000000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="date-from">Sale Date From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date-to">Sale Date To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Success */}
          {attomResult && (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800">Import complete</p>
                <p className="text-sm text-green-600 mt-0.5">
                  {attomResult.imported} lead{attomResult.imported !== 1 ? 's' : ''} added to your dashboard
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto border-green-200 text-green-700 hover:bg-green-100"
                onClick={() => router.push('/dashboard/leads')}
              >
                View Leads
              </Button>
            </div>
          )}

          <Button
            onClick={runAttomImport}
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:opacity-90 font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing — this may take a minute...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Run Import
              </>
            )}
          </Button>
        </div>
      )}

      {/* ── County Panel ── */}
      {mode === 'county' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Florida County Property Appraiser Sites</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Download sales data directly from county property appraiser sites, then import via CSV on the leads page.
                </p>
              </div>
            </div>

            {/* County selector */}
            <div className="space-y-1.5">
              <Label>Counties (leave blank for all)</Label>
              <div className="flex gap-2 flex-wrap">
                {FLORIDA_COUNTIES.map((county) => (
                  <button
                    key={county}
                    onClick={() => toggleCounty(county)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      selectedCounties.includes(county)
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    {county}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={fetchCountyInstructions}
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:opacity-90 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  Get Instructions
                </>
              )}
            </Button>
          </div>

          {/* County results */}
          {countyResult && (
            <div className="space-y-3">
              {countyResult.counties.map((county) => (
                <div key={county.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{county.name} County</h3>
                    <div className="flex gap-2">
                      <a
                        href={county.searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Badge variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50 cursor-pointer gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Search
                        </Badge>
                      </a>
                      {county.bulkDataUrl && (
                        <a
                          href={county.bulkDataUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Badge variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 cursor-pointer gap-1">
                            <Download className="h-3 w-3" />
                            Bulk Data
                          </Badge>
                        </a>
                      )}
                      {!county.bulkDataUrl && (
                        <Badge variant="outline" className="text-gray-400 border-gray-200">
                          No bulk download
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{county.instructions}</p>
                </div>
              ))}

              {/* CSV format reference */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 space-y-3">
                <p className="font-medium text-gray-700 text-sm">Expected CSV Column Headers</p>
                <p className="text-xs text-gray-500">
                  When importing county CSV data, map your columns to these headers before uploading on the{' '}
                  <button
                    onClick={() => router.push('/dashboard/leads/import')}
                    className="text-amber-600 hover:underline"
                  >
                    leads import page
                  </button>.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CSV_COLUMNS.map((col) => (
                    <code
                      key={col}
                      className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600 font-mono"
                    >
                      {col}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

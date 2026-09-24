'use client'

import { useId, useMemo, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  calculateMonthlyPayment,
  FHA_UPFRONT_MIP_RATE,
  getFhaAnnualMipRate,
} from '@/lib/mortgage/calculations'
import { OpenChatButton } from '@/components/landing/LandingClient'

type LoanType = 'conventional' | 'fha'

const whole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const MIN_DOWN: Record<LoanType, number> = { conventional: 3, fha: 3.5 }

// Default estimates; every one is editable. Conventional PMI varies widely
// with credit score and down payment, so it's a rough midpoint.
const DEFAULT_PMI_RATE = 0.5

function Field({
  label,
  hint,
  prefix,
  suffix,
  value,
  onChange,
  step = 1,
}: {
  label: string
  hint?: string
  prefix?: string
  suffix?: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-navy">
        {label}
      </label>
      <div className="mt-1.5 flex items-center rounded-xl border border-gray-300 bg-white focus-within:border-navy focus-within:ring-2 focus-within:ring-gold/40">
        {prefix && <span className="pl-3 text-sm text-gray-500">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className="w-full min-w-0 bg-transparent px-3 py-2.5 text-navy outline-none"
        />
        {suffix && <span className="pr-3 text-sm text-gray-500">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

export default function MortgageCalculator({
  defaultRate,
  rateNote,
}: {
  /** Latest Freddie Mac 30-year average, if available. */
  defaultRate: number
  rateNote: string
}) {
  const [price, setPrice] = useState(600_000)
  const [downPct, setDownPct] = useState(10)
  const [loanType, setLoanType] = useState<LoanType>('conventional')
  const [rate, setRate] = useState(defaultRate)
  const [term, setTerm] = useState(30)
  const [taxPct, setTaxPct] = useState(1.8)
  const [insurance, setInsurance] = useState(5_000)
  const [flood, setFlood] = useState(0)
  const [hoa, setHoa] = useState(0)
  const [pmiRate, setPmiRate] = useState(DEFAULT_PMI_RATE)

  const result = useMemo(() => {
    const down = (price * downPct) / 100
    const baseLoan = Math.max(price - down, 0)
    const ltv = price > 0 ? (baseLoan / price) * 100 : 0

    let loan = baseLoan
    let mortgageInsurance = 0
    let upfrontMip = 0
    if (loanType === 'fha') {
      // Upfront MIP is usually financed into the loan
      upfrontMip = (baseLoan * FHA_UPFRONT_MIP_RATE) / 100
      loan = baseLoan + upfrontMip
      mortgageInsurance = (baseLoan * getFhaAnnualMipRate(baseLoan, ltv, term)) / 100 / 12
    } else if (ltv > 80) {
      mortgageInsurance = (baseLoan * pmiRate) / 100 / 12
    }

    const parts = [
      { key: 'pi', label: 'Principal & interest', value: calculateMonthlyPayment(loan, rate, term), color: 'bg-navy' },
      { key: 'tax', label: 'Property taxes', value: (price * taxPct) / 100 / 12, color: 'bg-amber-500' },
      { key: 'ins', label: 'Homeowners insurance', value: insurance / 12, color: 'bg-sky-600' },
      { key: 'flood', label: 'Flood insurance', value: flood / 12, color: 'bg-teal-600' },
      { key: 'hoa', label: 'HOA / condo dues', value: hoa, color: 'bg-violet-500' },
      {
        key: 'mi',
        label: loanType === 'fha' ? 'FHA mortgage insurance' : 'PMI',
        value: mortgageInsurance,
        color: 'bg-rose-500',
      },
    ].filter((p) => p.value > 0)

    const total = parts.reduce((sum, p) => sum + p.value, 0)
    return { down, loan, upfrontMip, ltv, parts, total }
  }, [price, downPct, loanType, rate, term, taxPct, insurance, flood, hoa, pmiRate])

  const belowMin = downPct < MIN_DOWN[loanType]
  const summary = `a ${whole.format(price)} home with ${downPct}% down (${loanType === 'fha' ? 'FHA' : 'conventional'}, ${term}-year at ${rate}%)`

  return (
    <div className="mx-auto grid max-w-6xl gap-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
      <form className="grid gap-5 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()} aria-label="Mortgage calculator inputs">
        <Field label="Home price" prefix="$" value={price} onChange={setPrice} step={5000} />
        <Field
          label="Down payment"
          suffix="%"
          value={downPct}
          onChange={setDownPct}
          step={0.5}
          hint={`${whole.format(result.down)}`}
        />

        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium text-navy">Loan type</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(['conventional', 'fha'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={loanType === t}
                onClick={() => setLoanType(t)}
                className={cn(
                  'rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors',
                  loanType === t ? 'border-navy bg-navy text-white' : 'border-gray-300 bg-white text-navy hover:border-navy/40'
                )}
              >
                {t === 'fha' ? 'FHA' : 'Conventional'}
              </button>
            ))}
          </div>
        </fieldset>

        <Field label="Interest rate" suffix="%" value={rate} onChange={setRate} step={0.125} hint={rateNote} />
        <div>
          <label htmlFor="calc-term" className="block text-sm font-medium text-navy">
            Loan term
          </label>
          <select
            id="calc-term"
            value={term}
            onChange={(e) => setTerm(Number(e.target.value))}
            className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-navy outline-none focus:border-navy focus:ring-2 focus:ring-gold/40"
          >
            <option value={30}>30 years</option>
            <option value={20}>20 years</option>
            <option value={15}>15 years</option>
          </select>
        </div>

        <Field
          label="Property tax rate"
          suffix="% / yr"
          value={taxPct}
          onChange={setTaxPct}
          step={0.05}
          hint="Of the purchase price, before homestead"
        />
        <Field label="Homeowners insurance" prefix="$" suffix="/ yr" value={insurance} onChange={setInsurance} step={250} />
        <Field label="Flood insurance" prefix="$" suffix="/ yr" value={flood} onChange={setFlood} step={100} />
        <Field label="HOA / condo dues" prefix="$" suffix="/ mo" value={hoa} onChange={setHoa} step={25} />
        {loanType === 'conventional' && result.ltv > 80 && (
          <Field
            label="PMI rate"
            suffix="% / yr"
            value={pmiRate}
            onChange={setPmiRate}
            step={0.05}
            hint="Varies with credit score; often 0.3% to 1%"
          />
        )}
      </form>

      <div className="flex flex-col rounded-2xl bg-cream p-6" aria-live="polite">
        <p className="text-sm font-medium text-gray-600">Estimated monthly payment</p>
        <p className="mt-1 font-serif text-5xl text-navy">{whole.format(result.total)}</p>

        {result.total > 0 && (
          <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
            {result.parts.map((p) => (
              <div key={p.key} className={p.color} style={{ width: `${(p.value / result.total) * 100}%` }} />
            ))}
          </div>
        )}

        <dl className="mt-5 space-y-2.5 text-sm">
          {result.parts.map((p) => (
            <div key={p.key} className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-2 text-gray-600">
                <span className={cn('h-2.5 w-2.5 rounded-full', p.color)} aria-hidden="true" />
                {p.label}
              </dt>
              <dd className="font-semibold text-navy">{whole.format(p.value)}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 space-y-1 border-t border-gray-200 pt-4 text-xs text-gray-500">
          <p>
            Loan amount {whole.format(result.loan)}
            {result.upfrontMip > 0 && <> (includes {whole.format(result.upfrontMip)} FHA upfront premium)</>}
          </p>
          {belowMin && (
            <p className="font-medium text-amber-700">
              {loanType === 'fha' ? 'FHA' : 'Conventional'} loans generally need at least {MIN_DOWN[loanType]}% down.
            </p>
          )}
          <p>Estimate only, not a loan offer or rate quote.</p>
        </div>

        <OpenChatButton
          prompt={`I used the mortgage calculator for ${summary}. It estimates about ${whole.format(result.total)} a month with taxes and insurance. Does that look right for my situation, and how could I lower it?`}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-light"
        >
          <MessageCircle className="h-4 w-4" />
          Ask about this estimate
        </OpenChatButton>
      </div>
    </div>
  )
}

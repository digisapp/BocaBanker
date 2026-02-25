import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { costSegStudies, properties, clients, studyAssets } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '$0'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

const CATEGORY_LABELS: Record<string, string> = {
  personal_property_5yr: '5-Year Personal Property',
  personal_property_7yr: '7-Year Personal Property',
  land_improvements_15yr: '15-Year Land Improvements',
  building_27_5yr: '27.5-Year Residential Rental',
  building_39yr: '39-Year Nonresidential Real Property',
  land: 'Land (Non-depreciable)',
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch study with joins
    const [study] = await db
      .select({
        id: costSegStudies.id,
        studyName: costSegStudies.studyName,
        status: costSegStudies.status,
        taxRate: costSegStudies.taxRate,
        discountRate: costSegStudies.discountRate,
        bonusDepreciationRate: costSegStudies.bonusDepreciationRate,
        studyYear: costSegStudies.studyYear,
        results: costSegStudies.results,
        totalFirstYearDeduction: costSegStudies.totalFirstYearDeduction,
        totalTaxSavings: costSegStudies.totalTaxSavings,
        npvTaxSavings: costSegStudies.npvTaxSavings,
        propertyAddress: properties.address,
        propertyCity: properties.city,
        propertyState: properties.state,
        propertyType: properties.propertyType,
        purchasePrice: properties.purchasePrice,
        buildingValue: properties.buildingValue,
        landValue: properties.landValue,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        clientCompany: clients.company,
        createdAt: costSegStudies.createdAt,
      })
      .from(costSegStudies)
      .leftJoin(properties, eq(costSegStudies.propertyId, properties.id))
      .leftJoin(clients, eq(costSegStudies.clientId, clients.id))
      .where(eq(costSegStudies.id, id))
      .limit(1)

    if (!study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 })
    }

    const results = study.results as {
      summary: {
        totalReclassified: number
        totalFirstYearDeduction: number
        totalTaxSavings: number
        npvTaxSavings: number
        effectiveRate: number
      }
      assetBreakdown: { category: string; amount: number; percentage: number; recoveryPeriod: number }[]
      depreciationSchedule: { year: number; accelerated: number; straightLine: number; difference: number }[]
      taxSavingsSchedule: { year: number; withCostSeg: number; withoutCostSeg: number; savings: number; cumulativeSavings: number }[]
      firstYearAnalysis: { bonusDepreciation: number; regularFirstYear: number; totalFirstYear: number; taxSavings: number }
    } | null

    if (!results) {
      return NextResponse.json({ error: 'Study has no results. Run the calculation first.' }, { status: 400 })
    }

    const clientName = [study.clientFirstName, study.clientLastName].filter(Boolean).join(' ')
    const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const assetRowsHtml = results.assetBreakdown.map(asset => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${CATEGORY_LABELS[asset.category] || asset.category}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right">${asset.recoveryPeriod === 0 ? 'N/A' : `${asset.recoveryPeriod} years`}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600">${formatCurrency(asset.amount)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right">${asset.percentage.toFixed(1)}%</td>
      </tr>
    `).join('')

    const depreciationRowsHtml = results.depreciationSchedule.slice(0, 20).map(row => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6">${row.year}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#d97706">${formatCurrency(row.accelerated)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#6b7280">${formatCurrency(row.straightLine)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:${row.difference >= 0 ? '#10b981' : '#ef4444'};font-weight:600">${formatCurrency(row.difference)}</td>
      </tr>
    `).join('')

    const taxSavingsRowsHtml = results.taxSavingsSchedule.slice(0, 20).map(row => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6">${row.year}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#d97706">${formatCurrency(row.withCostSeg)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#6b7280">${formatCurrency(row.withoutCostSeg)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:${row.savings >= 0 ? '#10b981' : '#ef4444'}">${formatCurrency(row.savings)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#d97706;font-weight:600">${formatCurrency(row.cumulativeSavings)}</td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cost Segregation Study - ${study.studyName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 28px; color: #d97706; text-align: center; margin-bottom: 4px; }
    h2 { font-size: 16px; color: #d97706; border-bottom: 2px solid #fbbf24; padding-bottom: 8px; margin: 32px 0 16px; }
    .subtitle { text-align: center; color: #6b7280; font-size: 16px; margin-bottom: 8px; }
    .meta { text-align: center; color: #9ca3af; font-size: 12px; margin-bottom: 32px; }
    .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .grid4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; }
    .stat-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 4px; }
    .stat-value-lg { font-size: 22px; font-weight: 700; margin-top: 4px; }
    .summary-box { text-align: center; padding: 16px; border-radius: 8px; }
    .amber-box { background: #fffbeb; border: 1px solid #fde68a; }
    .green-box { background: #ecfdf5; border: 1px solid #a7f3d0; }
    .blue-box { background: #eff6ff; border: 1px solid #bfdbfe; }
    .purple-box { background: #f5f3ff; border: 1px solid #ddd6fe; }
    .amber { color: #d97706; }
    .green { color: #10b981; }
    .blue { color: #3b82f6; }
    .purple { color: #8b5cf6; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 8px 12px; color: #9ca3af; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb; }
    th.right { text-align: right; }
    .total-row td { border-top: 2px solid #d1d5db; font-weight: 700; color: #d97706; }
    .disclaimer { font-size: 11px; color: #9ca3af; line-height: 1.6; margin-top: 32px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #9ca3af; }
    .footer .brand { color: #d97706; font-weight: 700; font-size: 14px; }
    @media print { body { padding: 20px; } .card { break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>Cost Segregation Study Report</h1>
  <p class="subtitle">${study.studyName}</p>
  <p class="meta">Prepared: ${now} | Study Year: ${study.studyYear}</p>

  <div class="card">
    <h2 style="margin-top:0">Property Information</h2>
    <div class="grid2">
      <div><span class="stat-label">Address</span><p class="stat-value">${study.propertyAddress || '-'}</p></div>
      <div><span class="stat-label">Property Type</span><p class="stat-value" style="text-transform:capitalize">${study.propertyType?.replace(/-/g, ' ') || '-'}</p></div>
      <div><span class="stat-label">Purchase Price</span><p class="stat-value">${formatCurrency(study.purchasePrice)}</p></div>
      <div><span class="stat-label">Client</span><p class="stat-value">${clientName || '-'}${study.clientCompany ? ` (${study.clientCompany})` : ''}</p></div>
      <div><span class="stat-label">Building Value</span><p class="stat-value">${formatCurrency(study.buildingValue)}</p></div>
      <div><span class="stat-label">Land Value</span><p class="stat-value">${formatCurrency(study.landValue)}</p></div>
    </div>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Tax Parameters</h2>
    <div class="grid3">
      <div><span class="stat-label">Marginal Tax Rate</span><p class="stat-value-lg">${study.taxRate}%</p></div>
      <div><span class="stat-label">Discount Rate</span><p class="stat-value-lg">${study.discountRate || '5'}%</p></div>
      <div><span class="stat-label">Bonus Depreciation</span><p class="stat-value-lg">${study.bonusDepreciationRate || '100'}%</p></div>
    </div>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Executive Summary</h2>
    <div class="grid4">
      <div class="summary-box amber-box">
        <span class="stat-label">First Year Deduction</span>
        <p class="stat-value-lg amber">${formatCurrency(results.summary.totalFirstYearDeduction)}</p>
      </div>
      <div class="summary-box green-box">
        <span class="stat-label">Total Tax Savings</span>
        <p class="stat-value-lg green">${formatCurrency(results.summary.totalTaxSavings)}</p>
      </div>
      <div class="summary-box blue-box">
        <span class="stat-label">NPV of Savings</span>
        <p class="stat-value-lg blue">${formatCurrency(results.summary.npvTaxSavings)}</p>
      </div>
      <div class="summary-box purple-box">
        <span class="stat-label">Effective Rate</span>
        <p class="stat-value-lg purple">${results.summary.effectiveRate.toFixed(1)}%</p>
      </div>
    </div>
  </div>

  <div class="card">
    <h2 style="margin-top:0">First Year Depreciation Analysis</h2>
    <div class="grid4">
      <div><span class="stat-label">Bonus Depreciation</span><p class="stat-value">${formatCurrency(results.firstYearAnalysis.bonusDepreciation)}</p></div>
      <div><span class="stat-label">Regular MACRS (Year 1)</span><p class="stat-value">${formatCurrency(results.firstYearAnalysis.regularFirstYear)}</p></div>
      <div><span class="stat-label">Total First Year</span><p class="stat-value amber">${formatCurrency(results.firstYearAnalysis.totalFirstYear)}</p></div>
      <div><span class="stat-label">First Year Tax Savings</span><p class="stat-value green">${formatCurrency(results.firstYearAnalysis.taxSavings)}</p></div>
    </div>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Asset Classification Breakdown</h2>
    <table>
      <thead><tr><th>Asset Category</th><th class="right">Recovery Period</th><th class="right">Cost Basis</th><th class="right">% of Total</th></tr></thead>
      <tbody>
        ${assetRowsHtml}
        <tr class="total-row">
          <td style="padding:8px 12px" colspan="2">Total</td>
          <td style="padding:8px 12px;text-align:right">${formatCurrency(results.assetBreakdown.reduce((s, a) => s + a.amount, 0))}</td>
          <td style="padding:8px 12px;text-align:right">100.0%</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Year-by-Year Depreciation Schedule</h2>
    <table>
      <thead><tr><th>Year</th><th class="right">With Cost Seg</th><th class="right">Without Cost Seg</th><th class="right">Difference</th></tr></thead>
      <tbody>${depreciationRowsHtml}</tbody>
    </table>
    ${results.depreciationSchedule.length > 20 ? `<p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:8px">Showing first 20 of ${results.depreciationSchedule.length} years</p>` : ''}
  </div>

  <div class="card">
    <h2 style="margin-top:0">Tax Savings Schedule</h2>
    <table>
      <thead><tr><th>Year</th><th class="right">With Cost Seg</th><th class="right">Without Cost Seg</th><th class="right">Annual Savings</th><th class="right">Cumulative</th></tr></thead>
      <tbody>${taxSavingsRowsHtml}</tbody>
    </table>
    ${results.taxSavingsSchedule.length > 20 ? `<p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:8px">Showing first 20 of ${results.taxSavingsSchedule.length} years</p>` : ''}
  </div>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> This cost segregation study report is generated for informational purposes only and does not constitute tax advice. The calculations are based on the data provided and standard IRS MACRS depreciation tables. Actual tax benefits may vary based on individual circumstances, state tax laws, and IRS regulations. Consult with a qualified tax professional before making any tax-related decisions.
  </div>

  <div class="footer">
    <p class="brand">Boca Banker</p>
    <p>Cost Segregation &amp; Banking Intelligence</p>
    <p style="margin-top:4px">Report generated on ${now}</p>
  </div>
</body>
</html>`

    const safeFileName = study.studyName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-')

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="CostSeg-Report-${safeFileName}.html"`,
      },
    })
  } catch (error) {
    logger.error('studies-api', 'Error exporting study report', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

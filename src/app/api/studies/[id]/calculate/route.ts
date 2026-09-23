import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, ApiError } from '@/lib/api/auth'
import { apiError } from '@/lib/api/response'
import { requireUuid } from '@/lib/api/params'
import { db } from '@/db'
import { costSegStudies, studyAssets, properties } from '@/db/schema'
import { logger } from '@/lib/logger'
import { eq, and } from 'drizzle-orm'
import { generateStudyReport } from '@/lib/cost-seg/report-generator'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const id = requireUuid((await params).id, 'Study not found')

    // Load the study
    const studyRows = await db
      .select()
      .from(costSegStudies)
      .where(and(eq(costSegStudies.id, id), eq(costSegStudies.userId, user.id)))
      .limit(1)

    if (studyRows.length === 0) {
      return apiError('Study not found', 404)
    }

    const study = studyRows[0]

    // Load property details and study assets in parallel
    const [propertyRows, assets] = await Promise.all([
      study.propertyId
        ? db
            .select()
            .from(properties)
            .where(and(eq(properties.id, study.propertyId), eq(properties.userId, user.id)))
            .limit(1)
        : Promise.resolve([]),
      db
        .select()
        .from(studyAssets)
        .where(eq(studyAssets.studyId, id)),
    ])

    const property = propertyRows[0]
    if (!property) {
      return apiError('Property not found for this study', 404)
    }

    if (assets.length === 0) {
      return apiError('No assets found for this study. Add assets before calculating.', 400)
    }

    // Real property uses the mid-month convention, so the month placed in
    // service matters. Use the purchase month when it falls in the study year
    // (look-back studies keep the January default).
    let placedInServiceMonth = 1
    if (property.purchaseDate) {
      const [y, m] = property.purchaseDate.split('-').map(Number)
      if (y === study.studyYear && m >= 1 && m <= 12) placedInServiceMonth = m
    }

    // Build report input
    const reportInput = {
      placedInServiceMonth,
      propertyAddress: property.address,
      propertyType: property.propertyType,
      purchasePrice: parseFloat(property.purchasePrice),
      buildingValue: property.buildingValue ? parseFloat(property.buildingValue) : 0,
      landValue: property.landValue ? parseFloat(property.landValue) : 0,
      studyYear: study.studyYear,
      taxRate: parseFloat(study.taxRate),
      discountRate: parseFloat(study.discountRate || '5'),
      bonusDepreciationRate: Math.min(
        100,
        Math.max(0, parseFloat(study.bonusDepreciationRate || '100') || 0)
      ),
      assets: assets.map((a) => ({
        category: a.assetCategory,
        costBasis: parseFloat(a.costBasis),
        recoveryPeriod: a.recoveryPeriod,
      })),
    }

    // Generate the report
    const report = generateStudyReport(reportInput)

    // Save results to the study record
    const [updated] = await db
      .update(costSegStudies)
      .set({
        results: report as unknown as Record<string, unknown>,
        totalFirstYearDeduction: report.summary.totalFirstYearDeduction.toString(),
        totalTaxSavings: report.summary.totalTaxSavings.toString(),
        npvTaxSavings: report.summary.npvTaxSavings.toString(),
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(and(eq(costSegStudies.id, id), eq(costSegStudies.userId, user.id)))
      .returning()

    return NextResponse.json({
      study: updated,
      report,
    })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('studies-api', 'Error calculating study', error)
    return apiError('Failed to calculate study')
  }
}

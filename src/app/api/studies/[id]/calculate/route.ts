import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { costSegStudies, studyAssets, properties } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { generateStudyReport } from '@/lib/cost-seg/report-generator'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Load the study
    const studyRows = await db
      .select()
      .from(costSegStudies)
      .where(and(eq(costSegStudies.id, id), eq(costSegStudies.userId, user.id)))
      .limit(1)

    if (studyRows.length === 0) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 })
    }

    const study = studyRows[0]

    // Load property details
    const propertyRows = study.propertyId
      ? await db
          .select()
          .from(properties)
          .where(eq(properties.id, study.propertyId))
          .limit(1)
      : []

    const property = propertyRows[0]
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found for this study' },
        { status: 404 }
      )
    }

    // Load study assets
    const assets = await db
      .select()
      .from(studyAssets)
      .where(eq(studyAssets.studyId, id))

    if (assets.length === 0) {
      return NextResponse.json(
        { error: 'No assets found for this study. Add assets before calculating.' },
        { status: 400 }
      )
    }

    // Build report input
    const reportInput = {
      propertyAddress: property.address,
      propertyType: property.propertyType,
      purchasePrice: parseFloat(property.purchasePrice),
      buildingValue: property.buildingValue ? parseFloat(property.buildingValue) : 0,
      landValue: property.landValue ? parseFloat(property.landValue) : 0,
      studyYear: study.studyYear,
      taxRate: parseFloat(study.taxRate),
      discountRate: parseFloat(study.discountRate || '5'),
      bonusDepreciationRate: parseFloat(study.bonusDepreciationRate || '100'),
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
      .where(eq(costSegStudies.id, id))
      .returning()

    return NextResponse.json({
      study: updated,
      report,
    })
  } catch (error) {
    console.error('Error calculating study:', error)
    return NextResponse.json(
      { error: 'Failed to calculate study' },
      { status: 500 }
    )
  }
}

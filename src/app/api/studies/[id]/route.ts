import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, ApiError } from '@/lib/api/auth'
import { apiError, apiValidationError } from '@/lib/api/response'
import { requireUuid } from '@/lib/api/params'
import { studyUpdateSchema } from '@/lib/validation/update-schemas'
import { db } from '@/db'
import { costSegStudies, studyAssets, properties, clients } from '@/db/schema'
import { logger } from '@/lib/logger'
import { eq, and } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const id = requireUuid((await params).id, 'Study not found')

    // Fetch the study with property and client info
    const studyRows = await db
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
        notes: costSegStudies.notes,
        createdAt: costSegStudies.createdAt,
        updatedAt: costSegStudies.updatedAt,
        propertyId: costSegStudies.propertyId,
        propertyAddress: properties.address,
        propertyCity: properties.city,
        propertyState: properties.state,
        propertyType: properties.propertyType,
        purchasePrice: properties.purchasePrice,
        buildingValue: properties.buildingValue,
        landValue: properties.landValue,
        clientId: costSegStudies.clientId,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        clientCompany: clients.company,
      })
      .from(costSegStudies)
      .leftJoin(properties, and(eq(costSegStudies.propertyId, properties.id), eq(properties.userId, user.id)))
      .leftJoin(clients, and(eq(costSegStudies.clientId, clients.id), eq(clients.userId, user.id)))
      .where(and(eq(costSegStudies.id, id), eq(costSegStudies.userId, user.id)))
      .limit(1)

    if (studyRows.length === 0) {
      return apiError('Study not found', 404)
    }

    // Fetch study assets
    const assets = await db
      .select()
      .from(studyAssets)
      .where(eq(studyAssets.studyId, id))

    const study = studyRows[0]

    return NextResponse.json({
      study: {
        ...study,
        propertyName: study.propertyAddress
          ? `${study.propertyAddress}${study.propertyCity ? `, ${study.propertyCity}` : ''}`
          : null,
        clientName: study.clientFirstName && study.clientLastName
          ? `${study.clientFirstName} ${study.clientLastName}`
          : null,
      },
      assets,
    })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('studies-api', 'Error fetching study', error)
    return apiError('Failed to fetch study')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const id = requireUuid((await params).id, 'Study not found')

    const body = await request.json()

    const parsed = studyUpdateSchema.safeParse(body ?? {})
    if (!parsed.success) {
      return apiValidationError(parsed.error)
    }
    const d = parsed.data

    const updateData: Partial<typeof costSegStudies.$inferInsert> = { updatedAt: new Date() }

    if (d.study_name !== undefined) updateData.studyName = d.study_name
    if (d.tax_rate !== undefined) updateData.taxRate = d.tax_rate
    if (d.discount_rate !== undefined) updateData.discountRate = d.discount_rate
    if (d.bonus_depreciation_rate !== undefined) updateData.bonusDepreciationRate = d.bonus_depreciation_rate
    if (d.study_year !== undefined) updateData.studyYear = d.study_year
    if (d.status !== undefined) updateData.status = d.status
    if (d.notes !== undefined) updateData.notes = d.notes

    const [updated] = await db
      .update(costSegStudies)
      .set(updateData)
      .where(and(eq(costSegStudies.id, id), eq(costSegStudies.userId, user.id)))
      .returning()

    if (!updated) {
      return apiError('Study not found', 404)
    }

    return NextResponse.json({ study: updated })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('studies-api', 'Error updating study', error)
    return apiError('Failed to update study')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const id = requireUuid((await params).id, 'Study not found')

    // Delete the study — associated study_assets rows are removed by the
    // FK's onDelete cascade
    const [deleted] = await db
      .delete(costSegStudies)
      .where(and(eq(costSegStudies.id, id), eq(costSegStudies.userId, user.id)))
      .returning()

    if (!deleted) {
      return apiError('Study not found', 404)
    }

    return NextResponse.json({ message: 'Study deleted successfully' })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('studies-api', 'Error deleting study', error)
    return apiError('Failed to delete study')
  }
}

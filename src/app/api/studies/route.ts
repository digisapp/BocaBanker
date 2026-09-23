import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, ApiError } from '@/lib/api/auth'
import { apiError, apiValidationError } from '@/lib/api/response'
import { db } from '@/db'
import { costSegStudies, properties, clients, studyAssets } from '@/db/schema'
import { logger } from '@/lib/logger'
import { eq, and, desc, count } from 'drizzle-orm'
import { studySchema } from '@/lib/validation/schemas'
import { studyAssetInputSchema } from '@/lib/validation/update-schemas'
import { parsePagination } from '@/lib/api/params'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const { page, limit, offset } = parsePagination(searchParams, { defaultLimit: 20 })
    const status = searchParams.get('status') || ''

    const conditions = [eq(costSegStudies.userId, user.id)]

    if (status) {
      conditions.push(eq(costSegStudies.status, status as 'draft' | 'in_progress' | 'completed'))
    }

    const whereClause = and(...conditions)

    const [[totalResult], results] = await Promise.all([
      db
        .select({ value: count() })
        .from(costSegStudies)
        .where(whereClause),
      db
        .select({
          id: costSegStudies.id,
          studyName: costSegStudies.studyName,
          status: costSegStudies.status,
          studyYear: costSegStudies.studyYear,
          totalFirstYearDeduction: costSegStudies.totalFirstYearDeduction,
          totalTaxSavings: costSegStudies.totalTaxSavings,
          npvTaxSavings: costSegStudies.npvTaxSavings,
          createdAt: costSegStudies.createdAt,
          propertyId: costSegStudies.propertyId,
          propertyAddress: properties.address,
          propertyCity: properties.city,
          clientId: costSegStudies.clientId,
          clientFirstName: clients.firstName,
          clientLastName: clients.lastName,
        })
        .from(costSegStudies)
        .leftJoin(properties, and(eq(costSegStudies.propertyId, properties.id), eq(properties.userId, user.id)))
        .leftJoin(clients, and(eq(costSegStudies.clientId, clients.id), eq(clients.userId, user.id)))
        .where(whereClause)
        .orderBy(desc(costSegStudies.createdAt))
        .limit(limit)
        .offset(offset),
    ])

    const formatted = results.map((row) => ({
      ...row,
      propertyName: row.propertyAddress
        ? `${row.propertyAddress}${row.propertyCity ? `, ${row.propertyCity}` : ''}`
        : null,
      clientName: row.clientFirstName && row.clientLastName
        ? `${row.clientFirstName} ${row.clientLastName}`
        : null,
    }))

    return NextResponse.json({
      studies: formatted,
      pagination: {
        page,
        limit,
        total: totalResult.value,
        totalPages: Math.ceil(totalResult.value / limit),
      },
    })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('studies-api', 'Error fetching studies', error)
    return apiError('Failed to fetch studies')
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const { assets: assetsData, ...studyData } = body

    const parsed = studySchema.safeParse(studyData)
    if (!parsed.success) {
      return apiValidationError(parsed.error)
    }

    const data = parsed.data

    // Validate assets before touching the database
    const assetsParsed = z
      .array(studyAssetInputSchema)
      .max(500)
      .optional()
      .nullable()
      .safeParse(assetsData)
    if (!assetsParsed.success) {
      return apiValidationError(assetsParsed.error)
    }
    const assetInputs = assetsParsed.data ?? []
    const hasAssets = assetInputs.length > 0

    // property_id / client_id come from the body — both must belong to the
    // caller, otherwise the study GET/export/calculate joins would expose
    // another user's property and client details.
    const [[ownedProperty], [ownedClient]] = await Promise.all([
      db
        .select({ id: properties.id })
        .from(properties)
        .where(and(eq(properties.id, data.property_id), eq(properties.userId, user.id)))
        .limit(1),
      db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.id, data.client_id), eq(clients.userId, user.id)))
        .limit(1),
    ])
    if (!ownedProperty) {
      return apiError('Property not found', 400)
    }
    if (!ownedClient) {
      return apiError('Client not found', 400)
    }

    // Create the study and its assets atomically
    const newStudy = await db.transaction(async (tx) => {
      const [study] = await tx
        .insert(costSegStudies)
        .values({
          userId: user.id,
          propertyId: data.property_id,
          clientId: data.client_id,
          studyName: data.study_name,
          status: 'draft',
          taxRate: data.tax_rate.toString(),
          discountRate: data.discount_rate.toString(),
          bonusDepreciationRate: data.bonus_depreciation_rate.toString(),
          studyYear: data.study_year,
        })
        .returning()

      // Insert study assets if provided
      if (hasAssets) {
        await tx.insert(studyAssets).values(
          assetInputs.map((asset) => ({
            studyId: study.id,
            assetName: asset.description || asset.category,
            assetCategory: asset.category,
            // recoveryPeriod is a real column — fractional values (27.5) are fine
            recoveryPeriod: asset.recoveryPeriod,
            costBasis: asset.amount.toString(),
            bonusEligible: asset.bonusEligible,
          }))
        )
      }

      return study
    })

    return NextResponse.json({ study: newStudy }, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('studies-api', 'Error creating study', error)
    return apiError('Failed to create study')
  }
}

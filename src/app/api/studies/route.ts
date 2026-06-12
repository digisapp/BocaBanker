import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, ApiError } from '@/lib/api/auth'
import { apiError, apiValidationError } from '@/lib/api/response'
import { db } from '@/db'
import { costSegStudies, properties, clients, studyAssets } from '@/db/schema'
import { logger } from '@/lib/logger'
import { eq, and, desc, count } from 'drizzle-orm'
import { studySchema } from '@/lib/validation/schemas'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20') || 20))
    const status = searchParams.get('status') || ''
    const offset = (page - 1) * limit

    const conditions = [eq(costSegStudies.userId, user.id)]

    if (status) {
      conditions.push(eq(costSegStudies.status, status as 'draft' | 'in_progress' | 'completed'))
    }

    const whereClause = and(...conditions)

    // Get total count
    const [totalResult] = await db
      .select({ value: count() })
      .from(costSegStudies)
      .where(whereClause)

    // Get studies with joins
    const results = await db
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
      .leftJoin(properties, eq(costSegStudies.propertyId, properties.id))
      .leftJoin(clients, eq(costSegStudies.clientId, clients.id))
      .where(whereClause)
      .orderBy(desc(costSegStudies.createdAt))
      .limit(limit)
      .offset(offset)

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
    const hasAssets = assetsData && Array.isArray(assetsData) && assetsData.length > 0
    if (hasAssets) {
      const badAssets = (assetsData as {
        category?: string
        description?: string
        amount?: number
        recoveryPeriod?: number
        bonusEligible?: boolean
      }[])
        .map((asset, index) => ({ asset, index }))
        .filter(
          ({ asset }) =>
            asset.amount == null ||
            (asset.amount as unknown) === '' ||
            isNaN(Number(asset.amount))
        )

      if (badAssets.length > 0) {
        return apiError(
          `Invalid asset amount for asset(s): ${badAssets
            .map(({ asset, index }) => asset.description || asset.category || `#${index + 1}`)
            .join(', ')}`,
          400
        )
      }
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
        const assetRows = assetsData.map((asset: {
          category: string
          description: string
          amount: number
          recoveryPeriod: number
          bonusEligible: boolean
        }) => ({
          studyId: study.id,
          assetName: asset.description || asset.category,
          assetCategory: asset.category as typeof studyAssets.$inferInsert['assetCategory'],
          // recoveryPeriod is a real column — pass fractional values (e.g. 27.5) directly
          recoveryPeriod: asset.recoveryPeriod,
          costBasis: asset.amount.toString(),
          bonusEligible: asset.bonusEligible,
        }))

        await tx.insert(studyAssets).values(assetRows)
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

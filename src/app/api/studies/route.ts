import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { costSegStudies, properties, clients, studyAssets } from '@/db/schema'
import { eq, and, desc, sql, count } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { studySchema } from '@/lib/validation/schemas'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
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
    console.error('Error fetching studies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch studies' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { assets: assetsData, ...studyData } = body

    const parsed = studySchema.safeParse(studyData)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Create the study
    const [newStudy] = await db
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
    if (assetsData && Array.isArray(assetsData) && assetsData.length > 0) {
      const assetRows = assetsData.map((asset: {
        category: string
        description: string
        amount: number
        recoveryPeriod: number
        bonusEligible: boolean
      }) => ({
        studyId: newStudy.id,
        assetName: asset.description || asset.category,
        assetCategory: asset.category as typeof studyAssets.$inferInsert['assetCategory'],
        recoveryPeriod: asset.recoveryPeriod,
        costBasis: asset.amount.toString(),
        bonusEligible: asset.bonusEligible,
      }))

      await db.insert(studyAssets).values(assetRows)
    }

    return NextResponse.json({ study: newStudy }, { status: 201 })
  } catch (error) {
    console.error('Error creating study:', error)
    return NextResponse.json(
      { error: 'Failed to create study' },
      { status: 500 }
    )
  }
}

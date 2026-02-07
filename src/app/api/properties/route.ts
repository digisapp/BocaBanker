import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { properties, clients } from '@/db/schema'
import { eq, and, desc, sql, count } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { propertySchema } from '@/lib/validation/schemas'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const search = searchParams.get('search') || ''
    const clientId = searchParams.get('client_id') || ''
    const propertyType = searchParams.get('property_type') || ''
    const offset = (page - 1) * limit

    // Build conditions array
    const conditions = [eq(properties.userId, user.id)]

    if (clientId) {
      conditions.push(eq(properties.clientId, clientId))
    }

    if (propertyType) {
      conditions.push(eq(properties.propertyType, propertyType as typeof properties.propertyType.enumValues[number]))
    }

    if (search) {
      conditions.push(
        sql`(${properties.address} ILIKE ${'%' + search + '%'} OR ${properties.city} ILIKE ${'%' + search + '%'})`
      )
    }

    const whereClause = and(...conditions)

    // Get total count
    const [totalResult] = await db
      .select({ value: count() })
      .from(properties)
      .where(whereClause)

    // Get paginated results with client info
    const results = await db
      .select({
        id: properties.id,
        address: properties.address,
        city: properties.city,
        state: properties.state,
        zip: properties.zip,
        propertyType: properties.propertyType,
        purchasePrice: properties.purchasePrice,
        purchaseDate: properties.purchaseDate,
        buildingValue: properties.buildingValue,
        landValue: properties.landValue,
        squareFootage: properties.squareFootage,
        yearBuilt: properties.yearBuilt,
        description: properties.description,
        clientId: properties.clientId,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        createdAt: properties.createdAt,
      })
      .from(properties)
      .leftJoin(clients, eq(properties.clientId, clients.id))
      .where(whereClause)
      .orderBy(desc(properties.createdAt))
      .limit(limit)
      .offset(offset)

    const formattedResults = results.map((row) => ({
      ...row,
      clientName: row.clientFirstName && row.clientLastName
        ? `${row.clientFirstName} ${row.clientLastName}`
        : null,
    }))

    return NextResponse.json({
      properties: formattedResults,
      pagination: {
        page,
        limit,
        total: totalResult.value,
        totalPages: Math.ceil(totalResult.value / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
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
    const parsed = propertySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data
    const clientId = body.client_id || null
    const description = body.description || null

    const [newProperty] = await db
      .insert(properties)
      .values({
        userId: user.id,
        clientId,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        propertyType: data.property_type,
        purchasePrice: data.purchase_price.toString(),
        purchaseDate: data.purchase_date || null,
        buildingValue: data.building_value?.toString() || null,
        landValue: data.land_value?.toString() || null,
        squareFootage: data.square_footage || null,
        yearBuilt: data.year_built || null,
        description,
      })
      .returning()

    return NextResponse.json({ property: newProperty }, { status: 201 })
  } catch (error) {
    console.error('Error creating property:', error)
    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 }
    )
  }
}

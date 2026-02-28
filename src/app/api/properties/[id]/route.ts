import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { properties, clients, costSegStudies } from '@/db/schema'
import { logger } from '@/lib/logger'
import { eq, and } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { propertySchema } from '@/lib/validation/schemas'

export async function GET(
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

    const result = await db
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
        loanAmount: properties.loanAmount,
        interestRate: properties.interestRate,
        loanTermYears: properties.loanTermYears,
        monthlyPayment: properties.monthlyPayment,
        loanType: properties.loanType,
        lenderName: properties.lenderName,
        loanOriginationDate: properties.loanOriginationDate,
        clientId: properties.clientId,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        clientCompany: clients.company,
        createdAt: properties.createdAt,
        updatedAt: properties.updatedAt,
      })
      .from(properties)
      .leftJoin(clients, eq(properties.clientId, clients.id))
      .where(and(eq(properties.id, id), eq(properties.userId, user.id)))
      .limit(1)

    if (result.length === 0) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Fetch linked studies
    const studies = await db
      .select({
        id: costSegStudies.id,
        studyName: costSegStudies.studyName,
        status: costSegStudies.status,
        totalFirstYearDeduction: costSegStudies.totalFirstYearDeduction,
        totalTaxSavings: costSegStudies.totalTaxSavings,
        createdAt: costSegStudies.createdAt,
      })
      .from(costSegStudies)
      .where(eq(costSegStudies.propertyId, id))

    const property = result[0]

    return NextResponse.json({
      property: {
        ...property,
        clientName: property.clientFirstName && property.clientLastName
          ? `${property.clientFirstName} ${property.clientLastName}`
          : null,
      },
      studies,
    })
  } catch (error) {
    logger.error('properties-api', 'Error fetching property', error)
    return NextResponse.json(
      { error: 'Failed to fetch property' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    const [updated] = await db
      .update(properties)
      .set({
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
        loanAmount: data.loan_amount?.toString() || null,
        interestRate: data.interest_rate?.toString() || null,
        loanTermYears: data.loan_term_years || null,
        monthlyPayment: data.monthly_payment?.toString() || null,
        loanType: data.loan_type || null,
        lenderName: data.lender_name || null,
        loanOriginationDate: data.loan_origination_date || null,
        updatedAt: new Date(),
      })
      .where(and(eq(properties.id, id), eq(properties.userId, user.id)))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json({ property: updated })
  } catch (error) {
    logger.error('properties-api', 'Error updating property', error)
    return NextResponse.json(
      { error: 'Failed to update property' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const [deleted] = await db
      .delete(properties)
      .where(and(eq(properties.id, id), eq(properties.userId, user.id)))
      .returning()

    if (!deleted) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Property deleted successfully' })
  } catch (error) {
    logger.error('properties-api', 'Error deleting property', error)
    return NextResponse.json(
      { error: 'Failed to delete property' },
      { status: 500 }
    )
  }
}

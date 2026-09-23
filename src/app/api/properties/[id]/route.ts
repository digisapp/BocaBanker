import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, ApiError } from '@/lib/api/auth'
import { apiError, apiValidationError } from '@/lib/api/response'
import { requireUuid } from '@/lib/api/params'
import { resolveOwnedClientId } from '@/lib/api/ownership'
import { db } from '@/db'
import { properties, clients, costSegStudies } from '@/db/schema'
import { logger } from '@/lib/logger'
import { eq, and } from 'drizzle-orm'
import { propertySchema } from '@/lib/validation/schemas'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const id = requireUuid((await params).id, 'Property not found')

    const [result, studies] = await Promise.all([
      db
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
        .leftJoin(clients, and(eq(properties.clientId, clients.id), eq(clients.userId, user.id)))
        .where(and(eq(properties.id, id), eq(properties.userId, user.id)))
        .limit(1),
      // Linked studies (scoped to the owner)
      db
        .select({
          id: costSegStudies.id,
          studyName: costSegStudies.studyName,
          status: costSegStudies.status,
          totalFirstYearDeduction: costSegStudies.totalFirstYearDeduction,
          totalTaxSavings: costSegStudies.totalTaxSavings,
          createdAt: costSegStudies.createdAt,
        })
        .from(costSegStudies)
        .where(and(eq(costSegStudies.propertyId, id), eq(costSegStudies.userId, user.id))),
    ])

    if (result.length === 0) {
      return apiError('Property not found', 404)
    }

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
    if (error instanceof ApiError) return error.response
    logger.error('properties-api', 'Error fetching property', error)
    return apiError('Failed to fetch property')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const id = requireUuid((await params).id, 'Property not found')

    const body = await request.json()
    const parsed = propertySchema.safeParse(body)

    if (!parsed.success) {
      return apiValidationError(parsed.error)
    }

    const data = parsed.data

    // The edit form does not send client_id; only touch the client link when
    // the key is present (previously every edit silently unlinked the client).
    // When present it must reference one of the caller's own clients.
    const clientUpdate: { clientId?: string | null } = {}
    if (Object.prototype.hasOwnProperty.call(body, 'client_id')) {
      const ownedClient = await resolveOwnedClientId(body.client_id, user.id)
      if (ownedClient === false) {
        return apiError('Client not found', 400)
      }
      clientUpdate.clientId = ownedClient
    }
    const description = typeof body.description === 'string' && body.description
      ? body.description.slice(0, 5000)
      : null

    const [updated] = await db
      .update(properties)
      .set({
        ...clientUpdate,
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
      return apiError('Property not found', 404)
    }

    return NextResponse.json({ property: updated })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('properties-api', 'Error updating property', error)
    return apiError('Failed to update property')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const id = requireUuid((await params).id, 'Property not found')

    const [deleted] = await db
      .delete(properties)
      .where(and(eq(properties.id, id), eq(properties.userId, user.id)))
      .returning()

    if (!deleted) {
      return apiError('Property not found', 404)
    }

    return NextResponse.json({ message: 'Property deleted successfully' })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('properties-api', 'Error deleting property', error)
    return apiError('Failed to delete property')
  }
}

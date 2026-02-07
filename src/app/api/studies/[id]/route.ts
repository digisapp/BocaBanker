import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { costSegStudies, studyAssets, properties, clients } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

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
      .leftJoin(properties, eq(costSegStudies.propertyId, properties.id))
      .leftJoin(clients, eq(costSegStudies.clientId, clients.id))
      .where(and(eq(costSegStudies.id, id), eq(costSegStudies.userId, user.id)))
      .limit(1)

    if (studyRows.length === 0) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 })
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
    console.error('Error fetching study:', error)
    return NextResponse.json(
      { error: 'Failed to fetch study' },
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

    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (body.study_name !== undefined) updateData.studyName = body.study_name
    if (body.tax_rate !== undefined) updateData.taxRate = body.tax_rate.toString()
    if (body.discount_rate !== undefined) updateData.discountRate = body.discount_rate.toString()
    if (body.bonus_depreciation_rate !== undefined) updateData.bonusDepreciationRate = body.bonus_depreciation_rate.toString()
    if (body.study_year !== undefined) updateData.studyYear = body.study_year
    if (body.status !== undefined) updateData.status = body.status
    if (body.notes !== undefined) updateData.notes = body.notes

    const [updated] = await db
      .update(costSegStudies)
      .set(updateData)
      .where(and(eq(costSegStudies.id, id), eq(costSegStudies.userId, user.id)))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 })
    }

    return NextResponse.json({ study: updated })
  } catch (error) {
    console.error('Error updating study:', error)
    return NextResponse.json(
      { error: 'Failed to update study' },
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

    // Delete associated assets first
    await db.delete(studyAssets).where(eq(studyAssets.studyId, id))

    // Delete the study
    const [deleted] = await db
      .delete(costSegStudies)
      .where(and(eq(costSegStudies.id, id), eq(costSegStudies.userId, user.id)))
      .returning()

    if (!deleted) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Study deleted successfully' })
  } catch (error) {
    console.error('Error deleting study:', error)
    return NextResponse.json(
      { error: 'Failed to delete study' },
      { status: 500 }
    )
  }
}

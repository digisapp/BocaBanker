import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { clients } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { clientSchema } from '@/lib/validation/schemas';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id } = await params;

    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, user.id)));

    if (!client) {
      return apiError('Client not found', 404);
    }

    return NextResponse.json(client);
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('clients-api', 'GET /api/clients/[id] error', error);
    return apiError('Failed to fetch client');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id } = await params;
    const body = await request.json();
    const parsed = clientSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('Validation failed', 400);
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, user.id)));

    if (!existing) {
      return apiError('Client not found', 404);
    }

    const data = parsed.data;

    const tagsArray = data.tags
      ? data.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const [updated] = await db
      .update(clients)
      .set({
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email || null,
        phone: data.phone || null,
        company: data.company || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        status: data.status,
        tags: tagsArray,
        notes: data.notes || null,
        source: data.source || null,
        updatedAt: new Date(),
      })
      .where(and(eq(clients.id, id), eq(clients.userId, user.id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('clients-api', 'PUT /api/clients/[id] error', error);
    return apiError('Failed to update client');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id } = await params;

    // Verify ownership
    const [existing] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, user.id)));

    if (!existing) {
      return apiError('Client not found', 404);
    }

    // Hard delete
    await db
      .delete(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('clients-api', 'DELETE /api/clients/[id] error', error);
    return apiError('Failed to delete client');
  }
}

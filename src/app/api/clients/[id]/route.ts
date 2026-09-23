import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError, apiValidationError } from '@/lib/api/response';
import { requireUuid } from '@/lib/api/params';
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

    const id = requireUuid((await params).id, 'Client not found');

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

    const id = requireUuid((await params).id, 'Client not found');
    const body = await request.json();
    const parsed = clientSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
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

    if (!updated) {
      return apiError('Client not found', 404);
    }

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

    const id = requireUuid((await params).id, 'Client not found');

    // Hard delete, scoped to the owner (properties/studies cascade)
    const deleted = await db
      .delete(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, user.id)))
      .returning({ id: clients.id });

    if (deleted.length === 0) {
      return apiError('Client not found', 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('clients-api', 'DELETE /api/clients/[id] error', error);
    return apiError('Failed to delete client');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { reviews } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { reviewAdminUpdateSchema } from '@/lib/validation/schemas';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;
    const body = await request.json();
    const parsed = reviewAdminUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('Validation failed', 400);
    }

    const data = parsed.data;

    const updateData: Partial<typeof reviews.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.status) {
      updateData.status = data.status as 'pending' | 'approved' | 'rejected';
    }

    if (data.response_text !== undefined) {
      updateData.responseText = data.response_text || null;
      if (data.response_text) {
        updateData.responseDate = new Date();
      }
    }

    const [updated] = await db
      .update(reviews)
      .set(updateData)
      .where(eq(reviews.id, id))
      .returning();

    if (!updated) {
      return apiError('Review not found', 404);
    }

    return NextResponse.json({
      id: updated.id,
      reviewerName: updated.reviewerName,
      status: updated.status,
      responseText: updated.responseText,
      responseDate: updated.responseDate,
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('reviews-api', 'PUT /api/reviews/[id] error', error);
    return apiError('Failed to update review');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;

    await db
      .delete(reviews)
      .where(eq(reviews.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('reviews-api', 'DELETE /api/reviews/[id] error', error);
    return apiError('Failed to delete review');
  }
}

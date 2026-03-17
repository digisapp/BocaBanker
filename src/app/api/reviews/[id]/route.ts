import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';
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

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.status) {
      updateData.status = data.status;
    }

    if (data.response_text !== undefined) {
      updateData.response_text = data.response_text || null;
      if (data.response_text) {
        updateData.response_date = new Date().toISOString();
      }
    }

    const { data: updated, error } = await supabaseAdmin
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      logger.error('reviews-api', 'Supabase update error', error);
      return apiError('Review not found', 404);
    }

    return NextResponse.json({
      id: updated.id,
      reviewerName: updated.reviewer_name,
      status: updated.status,
      responseText: updated.response_text,
      responseDate: updated.response_date,
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

    const { error } = await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('reviews-api', 'Supabase delete error', error);
      return apiError('Failed to delete review', 500);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('reviews-api', 'DELETE /api/reviews/[id] error', error);
    return apiError('Failed to delete review');
  }
}

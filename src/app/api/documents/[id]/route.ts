import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Fetch the record first to get storagePath and verify ownership
    const [doc] = await db
      .select({ id: documents.id, storagePath: documents.storagePath })
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, user.id)));

    if (!doc) {
      return apiError('Document not found', 404);
    }

    // Delete from Supabase Storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('documents')
      .remove([doc.storagePath]);

    if (storageError) {
      logger.error('documents-api', 'Storage delete failed', storageError);
      // Continue — still remove the DB record even if storage fails
    }

    await db
      .delete(documents)
      .where(eq(documents.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('documents-api', 'DELETE /api/documents/[id] error', error);
    return apiError('Failed to delete document');
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, user.id)));

    if (!doc) {
      return apiError('Document not found', 404);
    }

    // Generate a signed URL valid for 60 minutes
    const { data, error } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(doc.storagePath, 3600);

    if (error || !data?.signedUrl) {
      logger.error('documents-api', 'Failed to generate signed URL', error);
      return apiError('Failed to generate download URL');
    }

    return NextResponse.json({ url: data.signedUrl, document: doc });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('documents-api', 'GET /api/documents/[id] error', error);
    return apiError('Failed to fetch document');
  }
}

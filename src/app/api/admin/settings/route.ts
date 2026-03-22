import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { platformSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/settings?key=ai_auto_reply_enabled
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const key = new URL(request.url).searchParams.get('key');
    if (!key) return apiError('key is required', 400);

    const [setting] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, key))
      .limit(1);

    return NextResponse.json({
      key,
      value: setting?.value ?? null,
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('settings-api', 'Settings fetch error', error);
    return apiError('Internal server error');
  }
}

/**
 * PUT /api/admin/settings
 * Body: { key: string, value: any }
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { key, value } = body;

    if (!key) return apiError('key is required', 400);

    await db
      .insert(platformSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value, updatedAt: new Date() },
      });

    return NextResponse.json({ success: true, key, value });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('settings-api', 'Settings update error', error);
    return apiError('Internal server error');
  }
}

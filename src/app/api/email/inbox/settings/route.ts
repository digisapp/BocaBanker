import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { AdminInboxService, isInboxSettingKey } from '@/lib/email/admin-inbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Only the inbox's own keys (see INBOX_SETTING_KEYS) — this is not a general
// platform_settings editor.

/** GET /api/email/inbox/settings?key=ai_auto_reply_enabled */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const key = new URL(request.url).searchParams.get('key');
    if (!isInboxSettingKey(key)) return apiError('Unknown setting', 400);
    const value = await AdminInboxService.getSetting(key);
    return NextResponse.json({ key, value });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Inbox setting fetch error', error);
    return apiError('Internal server error');
  }
}

/** PUT /api/email/inbox/settings { key, value: boolean } */
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    if (!isInboxSettingKey(body.key)) return apiError('Unknown setting', 400);
    if (typeof body.value !== 'boolean') return apiError('value must be true or false', 400);
    await AdminInboxService.setSetting(body.key, body.value);
    logger.info('email-api', `Inbox setting ${body.key} = ${body.value}`);
    return NextResponse.json({ success: true, key: body.key, value: body.value });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Inbox setting update error', error);
    return apiError('Internal server error');
  }
}

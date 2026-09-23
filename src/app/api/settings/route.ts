import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError, apiValidationError } from '@/lib/api/response';
import { userSettingsUpdateSchema } from '@/lib/validation/update-schemas';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth();

    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!settings) {
      return NextResponse.json({
        ariveLink: null,
        ariveCompanyName: null,
        rateAlertEnabled: false,
        rateAlertThresholdBps: null,
      });
    }

    return NextResponse.json({
      ariveLink: settings.arive_link,
      ariveCompanyName: settings.arive_company_name,
      rateAlertEnabled: settings.rate_alert_enabled ?? false,
      rateAlertThresholdBps: settings.rate_alert_threshold_bps,
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('settings-api', 'GET /api/settings error', error);
    return apiError('Failed to fetch settings');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const parsed = userSettingsUpdateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }
    const d = parsed.data;

    // Check if row exists
    const { data: existing } = await supabaseAdmin
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const payload = {
      arive_link: d.ariveLink ?? null,
      arive_company_name: d.ariveCompanyName ?? null,
      rate_alert_enabled: d.rateAlertEnabled ?? false,
      rate_alert_threshold_bps: d.rateAlertThresholdBps ?? null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabaseAdmin
        .from('user_settings')
        .update(payload)
        .eq('user_id', user.id);
      if (error) {
        logger.error('settings-api', 'Failed to update user settings', error);
        return apiError('Failed to update settings');
      }
    } else {
      const { error } = await supabaseAdmin
        .from('user_settings')
        .insert({ ...payload, user_id: user.id });
      if (error) {
        logger.error('settings-api', 'Failed to insert user settings', error);
        return apiError('Failed to update settings');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('settings-api', 'PUT /api/settings error', error);
    return apiError('Failed to update settings');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError, apiValidationError } from '@/lib/api/response';
import { readJson } from '@/lib/api/request';
import { userSettingsUpdateSchema } from '@/lib/validation/update-schemas';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getLeadAlertSettings, saveLeadAlertSettings } from '@/lib/lead-alerts';
import { logger } from '@/lib/logger';

// Partial update: only the keys present are written, so the settings page can
// save one preference without resending (and clobbering) the others.
const settingsUpdateSchema = userSettingsUpdateSchema.extend({
  notifyNewLeads: z.boolean().optional(),
  /** Where new lead alerts go; empty or null means the account email. */
  leadAlertEmail: z
    .union([z.string().trim().email('Enter a valid email for lead alerts').max(200), z.literal('')])
    .nullable()
    .transform((v) => v || null)
    .optional(),
});

// Mortgage preferences live in user_settings; lead alerts are platform-wide
// (see lib/lead-alerts.ts).
const COLUMNS = {
  ariveLink: 'arive_link',
  ariveCompanyName: 'arive_company_name',
  rateAlertEnabled: 'rate_alert_enabled',
  rateAlertThresholdBps: 'rate_alert_threshold_bps',
} as const;

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth();

    const [{ data: settings, error }, alerts] = await Promise.all([
      supabaseAdmin.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
      getLeadAlertSettings(),
    ]);
    if (error) throw error;

    return NextResponse.json({
      ariveLink: settings?.arive_link ?? null,
      ariveCompanyName: settings?.arive_company_name ?? null,
      rateAlertEnabled: settings?.rate_alert_enabled ?? false,
      rateAlertThresholdBps: settings?.rate_alert_threshold_bps ?? null,
      notifyNewLeads: alerts.enabled,
      leadAlertEmail: alerts.email,
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

    const body = await readJson(request);
    const parsed = settingsUpdateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { notifyNewLeads, leadAlertEmail } = parsed.data;
    if (notifyNewLeads !== undefined || leadAlertEmail !== undefined) {
      await saveLeadAlertSettings({
        ...(notifyNewLeads !== undefined && { enabled: notifyNewLeads }),
        ...(leadAlertEmail !== undefined && { email: leadAlertEmail }),
      });
    }

    const payload: Record<string, unknown> = {};
    for (const [key, column] of Object.entries(COLUMNS)) {
      const value = parsed.data[key as keyof typeof COLUMNS];
      if (value !== undefined) payload[column] = value;
    }

    if (Object.keys(payload).length > 0) {
      // Columns left out of the payload keep their value (or their default
      // on first save).
      payload.updated_at = new Date().toISOString();
      const { data: existing, error: lookupError } = await supabaseAdmin
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (lookupError) throw lookupError;

      const { error } = existing
        ? await supabaseAdmin.from('user_settings').update(payload).eq('user_id', user.id)
        : await supabaseAdmin.from('user_settings').insert({ ...payload, user_id: user.id });
      if (error) {
        logger.error('settings-api', 'Failed to save user settings', error);
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

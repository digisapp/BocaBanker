import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

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
    logger.error('settings-api', 'GET /api/settings error', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Check if row exists
    const { data: existing } = await supabaseAdmin
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const payload = {
      arive_link: body.ariveLink ?? null,
      arive_company_name: body.ariveCompanyName ?? null,
      rate_alert_enabled: body.rateAlertEnabled ?? false,
      rate_alert_threshold_bps: body.rateAlertThresholdBps ?? null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabaseAdmin
        .from('user_settings')
        .update(payload)
        .eq('user_id', user.id);
    } else {
      await supabaseAdmin
        .from('user_settings')
        .insert({ ...payload, user_id: user.id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('settings-api', 'PUT /api/settings error', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

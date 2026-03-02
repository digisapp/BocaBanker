import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCachedRates } from '@/lib/mortgage/rates';
import { rateAlertTemplate } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';

/**
 * POST /api/mortgage/rate-alert
 * Check if rates dropped past the user's threshold and email pipeline borrowers.
 * Can be triggered manually from dashboard or via Vercel Cron.
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user settings
    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!settings || !settings.rate_alert_enabled) {
      return NextResponse.json({
        sent: 0,
        message: 'Rate alerts are not enabled',
      });
    }

    const thresholdBps = settings.rate_alert_threshold_bps || 25;
    const ariveLink = settings.arive_link || '';
    const companyName = settings.arive_company_name || 'Boca Banker';

    // Get sender name
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('raw_user_meta_data')
      .eq('id', user.id)
      .single();
    const senderName =
      (userRow?.raw_user_meta_data as Record<string, string>)?.full_name ||
      'Your Loan Officer';

    // Get recent rates — need at least 2 weeks
    const rates = await getCachedRates();
    if (rates.length < 2) {
      return NextResponse.json({
        sent: 0,
        message: 'Not enough rate data to compare',
      });
    }

    const currentRate = rates[0].rate30yr;
    const previousRate = rates[1].rate30yr;

    if (currentRate === null || previousRate === null) {
      return NextResponse.json({
        sent: 0,
        message: 'Rate data missing',
      });
    }

    const changeBps = Math.round((previousRate - currentRate) * 100);

    if (changeBps < thresholdBps) {
      return NextResponse.json({
        sent: 0,
        message: `Rate change (${changeBps} bps) below threshold (${thresholdBps} bps)`,
        currentRate,
        previousRate,
        changeBps,
      });
    }

    // Get pipeline borrowers with email addresses
    const { data: pipelineLoans } = await supabaseAdmin
      .from('loans')
      .select('borrower_name, borrower_email, property_address')
      .eq('user_id', user.id)
      .in('status', ['pre_qual', 'application', 'processing', 'underwriting'])
      .not('borrower_email', 'is', null);

    let sent = 0;
    const errors: string[] = [];

    for (const loan of pipelineLoans || []) {
      if (!loan.borrower_email) continue;

      try {
        const html = rateAlertTemplate({
          borrowerName: (loan.borrower_name as string) || 'there',
          senderName,
          companyName,
          ariveLink,
          oldRate: previousRate,
          newRate: currentRate,
          changeBps,
          propertyAddress: loan.property_address as string | undefined,
        });

        await sendEmail({
          to: loan.borrower_email as string,
          subject: `Rates Just Dropped ${changeBps} BPS — Time to Lock In?`,
          html,
          userId: user.id,
        });

        sent++;
      } catch (err) {
        const msg = `Failed to send to ${loan.borrower_email}`;
        logger.error('rate-alert', msg, err);
        errors.push(msg);
      }
    }

    return NextResponse.json({
      sent,
      totalPipeline: (pipelineLoans || []).length,
      currentRate,
      previousRate,
      changeBps,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('rate-alert-api', 'POST /api/mortgage/rate-alert error', error);
    return NextResponse.json(
      { error: 'Failed to process rate alert' },
      { status: 500 }
    );
  }
}

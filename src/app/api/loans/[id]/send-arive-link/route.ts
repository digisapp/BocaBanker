import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email/resend';
import { ariveLinkTemplate } from '@/lib/email/templates';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id } = await params;

    // Fetch the loan
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (loanError || !loan) {
      return apiError('Loan not found', 404);
    }

    if (!loan.borrower_email) {
      return apiError('Borrower has no email address', 400);
    }

    // Get user settings for Arive link
    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('arive_link, arive_company_name')
      .eq('user_id', user.id)
      .single();

    const ariveLink = loan.arive_link || settings?.arive_link;

    if (!ariveLink) {
      return apiError('No Arive link configured. Set it in Settings or on the loan.', 400);
    }

    // Get user's name for the email
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const senderName = userData?.full_name || 'Your Mortgage Broker';
    const companyName = settings?.arive_company_name || 'Boca Banker';

    const html = ariveLinkTemplate({
      borrowerName: loan.borrower_name,
      senderName,
      companyName,
      ariveLink,
      propertyAddress: loan.property_address,
    });

    const result = await sendEmail({
      to: loan.borrower_email,
      subject: `Start Your Mortgage Application - ${companyName}`,
      html,
      userId: user.id,
      template: 'arive_link',
    });

    if (!result.success) {
      return apiError(result.error || 'Failed to send email', 500);
    }

    // Update loan with Arive link sent timestamp
    await supabaseAdmin
      .from('loans')
      .update({
        arive_link: ariveLink,
        arive_link_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return NextResponse.json({ success: true, resendId: result.resendId });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('loans-api', 'POST /api/loans/[id]/send-arive-link error', error);
    return apiError('Failed to send Arive link');
  }
}

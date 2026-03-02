import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email/resend';
import { ariveLinkTemplate } from '@/lib/email/templates';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the loan
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    if (!loan.borrower_email) {
      return NextResponse.json(
        { error: 'Borrower has no email address' },
        { status: 400 }
      );
    }

    // Get user settings for Arive link
    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('arive_link, arive_company_name')
      .eq('user_id', user.id)
      .single();

    const ariveLink = loan.arive_link || settings?.arive_link;

    if (!ariveLink) {
      return NextResponse.json(
        { error: 'No Arive link configured. Set it in Settings or on the loan.' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
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
    logger.error('loans-api', 'POST /api/loans/[id]/send-arive-link error', error);
    return NextResponse.json(
      { error: 'Failed to send Arive link' },
      { status: 500 }
    );
  }
}

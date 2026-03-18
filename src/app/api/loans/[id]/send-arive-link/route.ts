import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { loans, userSettings, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
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
    const [loan] = await db
      .select()
      .from(loans)
      .where(and(eq(loans.id, id), eq(loans.userId, user.id)));

    if (!loan) {
      return apiError('Loan not found', 404);
    }

    if (!loan.borrowerEmail) {
      return apiError('Borrower has no email address', 400);
    }

    // Get user settings for Arive link
    const [settings] = await db
      .select({
        ariveLink: userSettings.ariveLink,
        ariveCompanyName: userSettings.ariveCompanyName,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, user.id));

    const ariveLink = loan.ariveLink || settings?.ariveLink;

    if (!ariveLink) {
      return apiError('No Arive link configured. Set it in Settings or on the loan.', 400);
    }

    // Get user's name for the email
    const [userData] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, user.id));

    const senderName = userData?.fullName || 'Your Mortgage Broker';
    const companyName = settings?.ariveCompanyName || 'Boca Banker';

    const html = ariveLinkTemplate({
      borrowerName: loan.borrowerName,
      senderName,
      companyName,
      ariveLink,
      propertyAddress: loan.propertyAddress,
    });

    const result = await sendEmail({
      to: loan.borrowerEmail,
      subject: `Start Your Mortgage Application - ${companyName}`,
      html,
      userId: user.id,
      template: 'arive_link',
    });

    if (!result.success) {
      return apiError(result.error || 'Failed to send email', 500);
    }

    // Update loan with Arive link sent timestamp
    await db
      .update(loans)
      .set({
        ariveLink,
        ariveLinkSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(loans.id, id));

    return NextResponse.json({ success: true, resendId: result.resendId });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('loans-api', 'POST /api/loans/[id]/send-arive-link error', error);
    return apiError('Failed to send Arive link');
  }
}

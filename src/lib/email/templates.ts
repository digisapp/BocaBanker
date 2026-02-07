/**
 * Email templates for Boca Banker
 *
 * Each template returns a complete HTML email string styled with the light/amber theme.
 */

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Boca Banker</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Accent Bar -->
          <tr>
            <td style="background: linear-gradient(135deg, #F59E0B, #EAB308); height: 4px; border-radius: 12px 12px 0 0;"></td>
          </tr>
          <!-- Header -->
          <tr>
            <td style="background-color: #FAFAF8; padding: 32px 40px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1F2937; letter-spacing: 1px;">
                Boca <span style="color: #D97706;">Banker</span>
              </h1>
              <p style="margin: 8px 0 0; font-size: 13px; color: #6B7280; letter-spacing: 0.5px;">
                Cost Segregation &amp; Tax Strategy
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F3F4F6; padding: 24px 40px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #6B7280;">
                Boca Banker - Professional Cost Segregation Services
              </p>
              <p style="margin: 0; font-size: 11px; color: #9CA3AF;">
                This email is for informational purposes only and does not constitute tax advice.
                Please consult with a qualified tax professional before making any decisions.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function amberButton(text: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
  <tr>
    <td style="background: linear-gradient(135deg, #F59E0B, #EAB308); border-radius: 10px;">
      <a href="${href}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 10px;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

interface OutreachParams {
  clientName: string;
  senderName: string;
  customMessage?: string;
}

export function outreachTemplate({ clientName, senderName, customMessage }: OutreachParams): string {
  const body = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1F2937;">Hello ${clientName},</h2>
    <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
      I hope this message finds you well. My name is ${senderName}, and I specialize in
      helping property owners like you maximize tax savings through <strong>cost segregation studies</strong>.
    </p>
    <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
      Cost segregation is an IRS-approved tax strategy that accelerates depreciation on your
      commercial or residential investment properties, often resulting in significant first-year
      tax savings of 15-30% of the building value.
    </p>
    ${
      customMessage
        ? `<p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">${customMessage}</p>`
        : ''
    }
    <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
      I would love the opportunity to show you how much you could save. Would you be available
      for a brief 15-minute call this week?
    </p>
    ${amberButton('Schedule a Consultation', 'https://bocabanker.com')}
    <p style="margin: 0; font-size: 15px; color: #374151;">
      Best regards,<br />
      <strong style="color: #1F2937;">${senderName}</strong><br />
      <span style="color: #D97706;">Boca Banker</span>
    </p>
  `;
  return emailWrapper(body);
}

interface FollowUpParams {
  clientName: string;
  senderName: string;
  propertyAddress?: string;
}

export function followUpTemplate({ clientName, senderName, propertyAddress }: FollowUpParams): string {
  const propertyLine = propertyAddress
    ? `<p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
        Specifically regarding your property at <strong>${propertyAddress}</strong>, we believe there
        is a substantial opportunity for accelerated depreciation and tax savings.
      </p>`
    : '';

  const body = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1F2937;">Hi ${clientName},</h2>
    <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
      I wanted to follow up on my previous message about how a cost segregation study could
      benefit you. Many of our clients are surprised to learn they could reduce their current-year
      tax liability by hundreds of thousands of dollars.
    </p>
    ${propertyLine}
    <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
      Our no-obligation analysis takes just a few minutes to set up, and we can provide you
      with a preliminary estimate of your potential savings.
    </p>
    ${amberButton('Get Your Free Estimate', 'https://bocabanker.com')}
    <p style="margin: 0; font-size: 15px; color: #374151;">
      Looking forward to hearing from you,<br />
      <strong style="color: #1F2937;">${senderName}</strong><br />
      <span style="color: #D97706;">Boca Banker</span>
    </p>
  `;
  return emailWrapper(body);
}

interface ReportDeliveryParams {
  clientName: string;
  studyName: string;
  totalSavings: string;
}

export function reportDeliveryTemplate({
  clientName,
  studyName,
  totalSavings,
}: ReportDeliveryParams): string {
  const body = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1F2937;">Great news, ${clientName}!</h2>
    <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
      Your cost segregation study report is ready. Here is a quick summary:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e5e7eb;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Study</p>
          <p style="margin: 0 0 16px; font-size: 16px; color: #1F2937; font-weight: 600;">${studyName}</p>
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Estimated Total Tax Savings</p>
          <p style="margin: 0; font-size: 28px; color: #D97706; font-weight: 700;">${totalSavings}</p>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
      You can access your full report, including detailed depreciation schedules and asset breakdowns,
      by visiting our website.
    </p>
    ${amberButton('View Full Report', 'https://bocabanker.com')}
    <p style="margin: 0; font-size: 15px; color: #374151;">
      If you have any questions, do not hesitate to reach out.<br />
      <strong style="color: #1F2937;">The Boca Banker Team</strong>
    </p>
  `;
  return emailWrapper(body);
}

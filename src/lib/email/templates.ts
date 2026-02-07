/**
 * Email templates for Boca Banker
 *
 * Each template returns a complete HTML email string styled with the navy/gold theme.
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
          <!-- Header -->
          <tr>
            <td style="background-color: #0F1B2D; padding: 32px 40px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #C9A84C; letter-spacing: 1px;">
                Boca Banker
              </h1>
              <p style="margin: 8px 0 0; font-size: 13px; color: #94A3B8; letter-spacing: 0.5px;">
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
            <td style="background-color: #0F1B2D; padding: 24px 40px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #64748B;">
                Boca Banker - Professional Cost Segregation Services
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
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

function goldButton(text: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
  <tr>
    <td style="background: linear-gradient(135deg, #C9A84C, #D4B962); border-radius: 8px;">
      <a href="${href}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #0F1B2D; text-decoration: none; border-radius: 8px;">
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
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #0F1B2D;">Hello ${clientName},</h2>
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
    ${goldButton('Schedule a Consultation', 'https://bocabanker.com/schedule')}
    <p style="margin: 0; font-size: 15px; color: #374151;">
      Best regards,<br />
      <strong style="color: #0F1B2D;">${senderName}</strong><br />
      <span style="color: #C9A84C;">Boca Banker</span>
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
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #0F1B2D;">Hi ${clientName},</h2>
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
    ${goldButton('Get Your Free Estimate', 'https://bocabanker.com/estimate')}
    <p style="margin: 0; font-size: 15px; color: #374151;">
      Looking forward to hearing from you,<br />
      <strong style="color: #0F1B2D;">${senderName}</strong><br />
      <span style="color: #C9A84C;">Boca Banker</span>
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
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #0F1B2D;">Great news, ${clientName}!</h2>
    <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
      Your cost segregation study report is ready. Here is a quick summary:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e5e7eb;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Study</p>
          <p style="margin: 0 0 16px; font-size: 16px; color: #0F1B2D; font-weight: 600;">${studyName}</p>
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Estimated Total Tax Savings</p>
          <p style="margin: 0; font-size: 28px; color: #C9A84C; font-weight: 700;">${totalSavings}</p>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
      You can access your full report, including detailed depreciation schedules and asset breakdowns,
      by logging into your Boca Banker dashboard.
    </p>
    ${goldButton('View Full Report', 'https://bocabanker.com/dashboard/studies')}
    <p style="margin: 0; font-size: 15px; color: #374151;">
      If you have any questions, do not hesitate to reach out.<br />
      <strong style="color: #0F1B2D;">The Boca Banker Team</strong>
    </p>
  `;
  return emailWrapper(body);
}

interface WelcomeParams {
  clientName: string;
}

export function welcomeTemplate({ clientName }: WelcomeParams): string {
  const body = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #0F1B2D;">Welcome to Boca Banker, ${clientName}!</h2>
    <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
      Thank you for choosing Boca Banker for your cost segregation and tax strategy needs. We
      are excited to help you maximize the value of your real estate investments.
    </p>
    <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
      Here is what you can do with your new account:
    </p>
    <ul style="margin: 0 0 16px; padding-left: 20px; font-size: 15px; color: #374151; line-height: 1.8;">
      <li>Run <strong>depreciation calculations</strong> for any property</li>
      <li>Generate <strong>cost segregation study reports</strong></li>
      <li>Chat with our <strong>AI-powered tax advisor</strong></li>
      <li>Track all your <strong>properties and clients</strong> in one place</li>
    </ul>
    ${goldButton('Go to Dashboard', 'https://bocabanker.com/dashboard')}
    <p style="margin: 0; font-size: 15px; color: #374151;">
      Welcome aboard,<br />
      <strong style="color: #0F1B2D;">The Boca Banker Team</strong>
    </p>
  `;
  return emailWrapper(body);
}

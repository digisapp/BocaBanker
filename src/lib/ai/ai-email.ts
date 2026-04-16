import OpenAI from 'openai';
import { db } from '@/db';
import { emails, platformSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email/resend';

// ── Types ──────────────────────────────────────────────────────────

export interface EmailClassification {
  category: string;
  confidence: number;
  summary: string;
  draftHtml: string;
  draftText: string;
  autoSendable: boolean;
}

// ── Categories for BocaBanker ──────────────────────────────────────

export const EMAIL_CATEGORIES = [
  'cost_seg_inquiry',
  'property_question',
  'study_request',
  'mortgage_inquiry',
  'loan_status',
  'rate_question',
  'scheduling',
  'general_inquiry',
  'feedback',
  'partnership',
  'support',
  'personal',
  'spam',
  'other',
] as const;

// Categories safe for auto-reply
const AUTO_SEND_CATEGORIES = [
  'cost_seg_inquiry',
  'property_question',
  'study_request',
  'mortgage_inquiry',
  'loan_status',
  'rate_question',
  'scheduling',
  'general_inquiry',
];

const AUTO_SEND_CONFIDENCE_THRESHOLD = 0.85;

// ── xAI Client ─────────────────────────────────────────────────────

let _xai: OpenAI | null = null;
function getXAI(): OpenAI {
  if (!_xai) {
    _xai = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    });
  }
  return _xai;
}

// ── Classify & Draft ───────────────────────────────────────────────

export async function classifyAndDraftReply(
  fromEmail: string,
  fromName: string | null,
  subject: string,
  bodyText: string | null,
  bodyHtml: string | null,
): Promise<EmailClassification> {
  const xai = getXAI();

  const content = bodyText || bodyHtml?.replace(/<[^>]+>/g, '') || '';

  const response = await xai.chat.completions.create({
    model: 'grok-3-mini',
    messages: [
      {
        role: 'system',
        content: `You are an AI assistant for Boca Banker, a platform specializing in cost segregation studies and mortgage lending services for commercial real estate investors.

Classify this inbound email and draft a professional reply.

Categories:
- cost_seg_inquiry: Questions about cost segregation studies, tax depreciation, accelerated depreciation
- property_question: Questions about specific properties, property valuations, building assessments
- study_request: Requests to start or schedule a cost segregation study
- mortgage_inquiry: Questions about mortgage rates, loan products, refinancing, home buying
- loan_status: Questions about existing loan applications, processing status, documents needed
- rate_question: Questions about current interest rates, rate locks, rate comparisons
- scheduling: Requests to schedule calls, meetings, consultations
- general_inquiry: General business questions that don't fit other categories
- feedback: Testimonials, reviews, complaints, suggestions
- partnership: Business partnership proposals, vendor pitches, collaboration requests
- support: Technical issues, account problems, platform questions
- personal: Personal messages not related to business
- spam: Unsolicited commercial email, phishing, scams
- other: Anything that doesn't fit the above

Respond in this exact JSON format:
{
  "category": "one_of_the_categories",
  "confidence": 0.95,
  "summary": "1-2 sentence summary for admin quick scan",
  "draftText": "Plain text professional reply",
  "draftHtml": "<p>HTML formatted professional reply</p>"
}

Guidelines for drafts:
- Be warm and professional, use the sender's first name if available
- For cost seg inquiries: mention typical first-year savings of 15-30% of building value
- For mortgage inquiries: mention competitive rates and personalized service
- For scheduling: suggest convenient times and mention a 15-minute consultation
- For spam: draft a brief "no reply needed" note
- Sign off as "The Boca Banker Team"
- Keep replies concise (2-3 paragraphs max)`,
      },
      {
        role: 'user',
        content: `From: ${fromName ? `${fromName} <${fromEmail}>` : fromEmail}
Subject: ${subject}

${content.slice(0, 3000)}`,
      },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  let result: { category?: string; confidence?: number; summary?: string; draftHtml?: string; draftText?: string };
  try {
    result = JSON.parse(response.choices[0]?.message?.content || '{}');
  } catch {
    logger.error('ai-email', 'Failed to parse AI response JSON');
    result = {};
  }

  return {
    category: result.category || 'other',
    confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
    summary: result.summary || 'Email received',
    draftHtml: result.draftHtml || '',
    draftText: result.draftText || '',
    autoSendable:
      AUTO_SEND_CATEGORIES.includes(result.category || '') &&
      (result.confidence || 0) >= AUTO_SEND_CONFIDENCE_THRESHOLD,
  };
}

// ── Store AI results on email ──────────────────────────────────────

export async function storeClassification(
  emailId: string,
  classification: EmailClassification,
) {
  await db
    .update(emails)
    .set({
      aiCategory: classification.category,
      aiConfidence: classification.confidence,
      aiSummary: classification.summary,
      aiDraftHtml: classification.draftHtml,
      aiDraftText: classification.draftText,
      aiProcessedAt: new Date(),
    })
    .where(eq(emails.id, emailId));
}

// ── Branded email template ─────────────────────────────────────────

function brandedTemplate(bodyHtml: string, quotedOriginal?: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#f59e0b,#eab308);padding:24px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;font-family:Georgia,serif;">Boca Banker</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Cost Segregation &amp; Mortgage Solutions</p>
    </div>
    <!-- Body -->
    <div style="padding:28px 32px;color:#374151;font-size:15px;line-height:1.7;">
      ${bodyHtml}
    </div>
    ${quotedOriginal ? `
    <!-- Quoted Original -->
    <div style="padding:0 32px 24px;color:#9ca3af;font-size:13px;">
      <div style="border-left:2px solid #d4a855;padding-left:12px;margin-top:8px;">
        ${quotedOriginal}
      </div>
    </div>
    ` : ''}
    <!-- Footer -->
    <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
      <p style="margin:0;">Boca Banker | Cost Segregation &amp; Mortgage Lending</p>
      <p style="margin:4px 0 0;">
        <a href="https://bocabanker.com" style="color:#d97706;text-decoration:none;">bocabanker.com</a>
        &nbsp;·&nbsp; team@bocabanker.com
      </p>
    </div>
  </div>
</body>
</html>`.trim();
}

// ── Platform settings cache (TTL: 60 s) ───────────────────────────

let _autoReplyCache: { enabled: boolean; expiresAt: number } | null = null;

async function isAutoReplyEnabled(): Promise<boolean> {
  const now = Date.now();
  if (_autoReplyCache && now < _autoReplyCache.expiresAt) {
    return _autoReplyCache.enabled;
  }
  const [setting] = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, 'ai_auto_reply_enabled'))
    .limit(1);
  const enabled = setting?.value === true;
  _autoReplyCache = { enabled, expiresAt: now + 60_000 };
  return enabled;
}

// ── Auto-reply ─────────────────────────────────────────────────────

export async function sendAutoReply(
  emailId: string,
  originalEmail: {
    fromEmail: string;
    fromName: string | null;
    subject: string;
    bodyHtml: string | null;
    bodyText: string | null;
    userId: string | null;
    clientId: string | null;
    threadId: string | null;
  },
  classification: EmailClassification,
): Promise<boolean> {
  // Check if auto-reply is enabled (cached for 60 s)
  if (!(await isAutoReplyEnabled())) {
    logger.info('ai-email', 'Auto-reply disabled, skipping');
    return false;
  }

  if (!classification.autoSendable) {
    logger.info('ai-email', `Not auto-sendable: ${classification.category} (${classification.confidence})`);
    return false;
  }

  const replySubject = originalEmail.subject.startsWith('Re:')
    ? originalEmail.subject
    : `Re: ${originalEmail.subject}`;

  const quotedOriginal = originalEmail.bodyHtml || originalEmail.bodyText || '';
  const html = brandedTemplate(classification.draftHtml, quotedOriginal);

  const threadId = originalEmail.threadId || emailId;

  const result = await sendEmail({
    to: originalEmail.fromEmail,
    subject: replySubject,
    html,
    userId: originalEmail.userId || '',
    clientId: originalEmail.clientId || undefined,
    template: 'ai-auto-reply',
    threadId,
    inReplyToId: emailId,
  });

  if (result.success) {
    // Mark original as replied
    await db
      .update(emails)
      .set({
        status: 'replied',
        repliedAt: new Date(),
      })
      .where(eq(emails.id, emailId));

    logger.info('ai-email', `Auto-replied to ${originalEmail.fromEmail} (${classification.category})`);
    return true;
  }

  logger.error('ai-email', `Auto-reply failed: ${result.error}`);
  return false;
}

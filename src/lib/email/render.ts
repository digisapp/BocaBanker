/**
 * HTML helpers for mail we send. Pure (no DB, no network).
 *
 * Nothing attacker-controlled is ever sent as HTML from our domain: replies
 * and auto-replies are rendered from escaped plain text, and the original
 * message is quoted as escaped, truncated text.
 */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Crude HTML -> text for LLM input / quoting (drops style/script/head content). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Plain text -> safe HTML paragraphs. */
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 14px;">${escapeHtml(para).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

const QUOTE_MAX_CHARS = 2000;

/** Escaped, truncated quote of the message being answered. */
export function quotedOriginalHtml(original: {
  bodyText: string | null;
  bodyHtml: string | null;
  fromName: string | null;
  fromEmail: string;
  createdAt: Date | string | null;
}): string {
  const text = original.bodyText || (original.bodyHtml ? htmlToText(original.bodyHtml) : '');
  if (!text) return '';
  const clipped = text.length > QUOTE_MAX_CHARS ? `${text.slice(0, QUOTE_MAX_CHARS)}…` : text;
  const when = original.createdAt ? new Date(original.createdAt) : null;
  const stamp = when && !Number.isNaN(when.getTime())
    ? when.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
  const who = escapeHtml(original.fromName || original.fromEmail);
  return `<p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">On ${stamp ? `${escapeHtml(stamp)}, ` : ''}${who} wrote:</p>${textToHtml(clipped)}`;
}

/** Plain-text twin of `quotedOriginalHtml` for the text/plain part. */
export function quotedOriginalText(original: {
  bodyText: string | null;
  bodyHtml: string | null;
  fromName: string | null;
  fromEmail: string;
  createdAt: Date | string | null;
}): string {
  const text = original.bodyText || (original.bodyHtml ? htmlToText(original.bodyHtml) : '');
  if (!text) return '';
  const clipped = text.length > QUOTE_MAX_CHARS ? `${text.slice(0, QUOTE_MAX_CHARS)}…` : text;
  const when = original.createdAt ? new Date(original.createdAt) : null;
  const stamp = when && !Number.isNaN(when.getTime()) ? when.toLocaleString('en-US') : '';
  return `--- On ${stamp ? `${stamp}, ` : ''}${original.fromName || original.fromEmail} wrote: ---\n${clipped
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n')}`;
}

/**
 * The Boca Banker email shell: navy header, gold rule, grey footer. Matches
 * the site and the dashboard.
 */
export function brandedTemplate(bodyHtml: string, quotedHtml?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Boca Banker</title></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1E293B;padding:24px 32px;border-bottom:3px solid #d4a855;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;font-family:Georgia,'Times New Roman',serif;">Boca Banker</h1>
              <p style="margin:4px 0 0;color:#cbd5e1;font-size:13px;">Mortgage Lending &amp; Cost Segregation</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;color:#374151;font-size:15px;line-height:1.7;">
              ${bodyHtml}
            </td>
          </tr>
          ${quotedHtml ? `
          <tr>
            <td style="padding:0 32px 24px;color:#6b7280;font-size:13px;line-height:1.6;">
              <div style="border-left:2px solid #d4a855;padding-left:12px;margin-top:8px;">
                ${quotedHtml}
              </div>
            </td>
          </tr>` : ''}
          <tr>
            <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
              <p style="margin:0;">Boca Banker &mdash; Mortgage Lending &amp; Cost Segregation</p>
              <p style="margin:4px 0 0;"><a href="https://bocabanker.com" style="color:#b45309;text-decoration:none;">bocabanker.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

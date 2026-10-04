'use client';

import Link from 'next/link';
import { ArrowLeft, Reply, Star, Trash2, ShieldAlert, ShieldCheck, MailOpen, Sparkles, Send, PenLine, Paperclip, ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import SandboxedHtml from '@/components/email/SandboxedHtml';
import type { EmailDetail } from './types';
import { AI_CATEGORY_LABELS, BADGE_TONES, STATUS_LABELS, clientName, formatBytes, formatFullDate, readAttachments, readCc } from './types';

interface EmailDetailViewProps {
  email: EmailDetail | null;
  thread: EmailDetail[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  onBack: () => void;
  onRetry: () => void;
  onReply: () => void;
  onToggleStar: (_id: string) => void;
  onMarkUnread: (_id: string) => void;
  onSetSpam: (_id: string, _isSpam: boolean) => void;
  onDelete: (_id: string) => void;
  onUseAiDraft: (_id: string) => void;
  onEditAiDraft: (_email: EmailDetail) => void;
}

const iconButton = 'size-10 md:size-9 text-gray-500 hover:text-navy hover:bg-gray-100';

function Message({ msg, isLast }: { msg: EmailDetail; isLast: boolean }) {
  const attachments = readAttachments(msg.metadata);
  const cc = readCc(msg);
  const outbound = msg.direction === 'outbound';
  const st = STATUS_LABELS[msg.status];
  const client = clientName(msg);

  return (
    <article className={cn('px-4 py-4 sm:px-5', !isLast && 'border-b border-gray-100')}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
            outbound ? 'bg-navy text-amber-400' : 'bg-amber-50 text-amber-700',
          )}>
            {outbound ? 'BB' : (msg.fromName || msg.fromEmail)[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="truncate text-sm font-semibold text-gray-900">{outbound ? 'You' : msg.fromName || msg.fromEmail}</span>
              {(outbound || msg.fromName) && <span className="truncate text-xs text-gray-500">{msg.fromEmail}</span>}
              {outbound && <Badge variant="outline" className={BADGE_TONES[st.tone]}>{st.label}</Badge>}
              {msg.template === 'ai-auto-reply' && (
                <Badge variant="outline" className={BADGE_TONES.violet}><Sparkles className="h-3 w-3" />Auto-reply</Badge>
              )}
              {!outbound && msg.clientId && (
                <Link
                  href={`/clients/${msg.clientId}`}
                  className="inline-flex items-center gap-1 rounded-full bg-navy px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-navy-light"
                >
                  <ExternalLink className="h-3 w-3" /> {client || 'Client'}
                </Link>
              )}
            </div>
            <p className="truncate text-xs text-gray-500">
              To: {msg.toName ? `${msg.toName} <${msg.toEmail}>` : msg.toEmail}
              {cc.length > 0 && ` · Cc: ${cc.join(', ')}`}
            </p>
          </div>
        </div>
        <time dateTime={msg.createdAt} className="shrink-0 text-xs text-gray-500">{formatFullDate(msg.createdAt)}</time>
      </header>

      {msg.bodyHtml ? (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <SandboxedHtml html={msg.bodyHtml} />
        </div>
      ) : (
        <div className="whitespace-pre-wrap rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800">
          {msg.bodyText || <span className="text-gray-400">(no content)</span>}
        </div>
      )}

      {attachments.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {attachments.map((a) => (
            <li key={a.id}>
              <a
                href={`/api/email/inbox/${msg.id}/attachments/${a.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Paperclip className="h-3.5 w-3.5 text-gray-400" />
                <span className="max-w-[220px] truncate">{a.filename}</span>
                {a.size ? <span className="text-gray-400">{formatBytes(a.size)}</span> : null}
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function EmailDetailView({
  email, thread, loading, error, sending,
  onBack, onRetry, onReply, onToggleStar, onMarkUnread, onSetSpam, onDelete, onUseAiDraft, onEditAiDraft,
}: EmailDetailViewProps) {
  if (loading && !email) {
    return <div className="flex flex-1 items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-navy" /></div>;
  }
  if (error && !email) {
    return (
      <div className="flex-1 p-4">
        <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy lg:hidden"><ArrowLeft className="h-4 w-4" /> Back</button>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <Button variant="outline" size="sm" onClick={onRetry} className="ml-3 border-red-200 text-red-700 hover:bg-red-100">Retry</Button>
        </div>
      </div>
    );
  }
  if (!email) return null;

  const messages = thread.length > 0 ? thread : [email];
  const cat = email.aiCategory ? AI_CATEGORY_LABELS[email.aiCategory] : null;
  const inbound = email.direction === 'inbound';
  const canUseDraft = inbound && !!email.aiDraftText && email.status !== 'replied';

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5 sm:px-4">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to list" className={cn(iconButton, 'lg:hidden')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-gray-900">{email.subject || '(no subject)'}</h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {inbound && <Badge variant="outline" className={BADGE_TONES[STATUS_LABELS[email.status].tone]}>{STATUS_LABELS[email.status].label}</Badge>}
            {cat && (
              <Badge variant="outline" className={BADGE_TONES[cat.tone]}>
                {cat.label}{email.aiConfidence != null && ` · ${Math.round(email.aiConfidence * 100)}%`}
              </Badge>
            )}
            {email.isSpam && <Badge variant="outline" className={BADGE_TONES.red}>Spam</Badge>}
            {messages.length > 1 && <span className="text-xs text-gray-500">{messages.length} messages</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={() => onToggleStar(email.id)} aria-label={email.isStarred ? 'Unstar' : 'Star'} aria-pressed={email.isStarred} className={iconButton}>
            <Star className={cn('h-4 w-4', email.isStarred && 'fill-amber-400 text-amber-400')} />
          </Button>
          {inbound && (
            <Button variant="ghost" size="icon" onClick={() => onMarkUnread(email.id)} aria-label="Mark as unread" title="Mark as unread" className={iconButton}>
              <MailOpen className="h-4 w-4" />
            </Button>
          )}
          {inbound && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSetSpam(email.id, !email.isSpam)}
              aria-label={email.isSpam ? 'Not spam' : 'Mark as spam'}
              title={email.isSpam ? 'Not spam' : 'Mark as spam'}
              className={iconButton}
            >
              {email.isSpam ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => onDelete(email.id)} aria-label="Delete" title="Delete" className="size-10 md:size-9 text-gray-500 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* AI summary + draft */}
        {inbound && (email.aiSummary || canUseDraft) && (
          <div className="space-y-3 border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-5">
            {email.aiSummary && (
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p><span className="font-semibold text-navy">Summary.</span> {email.aiSummary}</p>
              </div>
            )}
            {canUseDraft && (
              <div className="rounded-xl border border-amber-200 bg-white p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
                    <Sparkles className="h-3.5 w-3.5" /> Suggested reply
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => onEditAiDraft(email)} disabled={sending} className="border-gray-200 text-navy hover:bg-gray-100">
                      <PenLine className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" onClick={() => onUseAiDraft(email.id)} disabled={sending} className="bg-navy text-white hover:bg-navy-light">
                      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      {sending ? 'Sending…' : 'Send as is'}
                    </Button>
                  </div>
                </div>
                <p className="line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{email.aiDraftText}</p>
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => <Message key={msg.id} msg={msg} isLast={i === messages.length - 1} />)}
      </div>

      <div className="border-t border-gray-100 px-4 py-3 sm:px-5">
        <Button onClick={onReply} className="w-full bg-navy font-semibold text-white hover:bg-navy-light sm:w-auto">
          <Reply className="h-4 w-4" /> Reply
        </Button>
      </div>
    </div>
  );
}

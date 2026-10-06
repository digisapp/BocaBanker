'use client';

import { Star, Paperclip, Inbox as InboxIcon, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { EmailListItem, InboxFolder } from './types';
import { AI_CATEGORY_LABELS, BADGE_TONES, STATUS_LABELS, clientName, counterpart, formatListDate } from './types';

interface EmailListProps {
  emails: EmailListItem[];
  folder: InboxFolder;
  selectedId: string | null;
  onSelect: (_id: string) => void;
  onToggleStar: (_id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (_id: string) => void;
  searching: boolean;
}

const EMPTY_COPY: Record<InboxFolder, { title: string; body: string }> = {
  inbox: { title: 'Inbox is empty', body: 'Mail sent to the Boca Banker address shows up here.' },
  unread: { title: 'All caught up', body: 'No unread mail.' },
  starred: { title: 'Nothing starred', body: 'Star an email to keep it handy.' },
  sent: { title: 'Nothing sent yet', body: 'Replies and new emails you send appear here.' },
  spam: { title: 'No spam', body: 'Mail flagged as spam lands here instead of the inbox.' },
};

export function EmailList({ emails, folder, selectedId, onSelect, onToggleStar, selectedIds, onToggleSelect, searching }: EmailListProps) {
  if (emails.length === 0) {
    const copy = searching ? { title: 'No matches', body: 'Try a different search.' } : EMPTY_COPY[folder];
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <InboxIcon className="h-6 w-6 text-amber-600" />
        </div>
        <p className="text-sm font-semibold text-gray-900">{copy.title}</p>
        <p className="mt-1 text-xs text-gray-500">{copy.body}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {emails.map((email) => {
        const active = email.id === selectedId;
        const checked = selectedIds.has(email.id);
        const unread = email.direction === 'inbound' && !email.isRead;
        const who = counterpart(email);
        const client = clientName(email);
        const cat = email.aiCategory ? AI_CATEGORY_LABELS[email.aiCategory] : null;
        const st = STATUS_LABELS[email.status];
        const showStatus = email.direction === 'outbound' ? email.status !== 'sent' : email.status === 'replied';

        return (
          <li
            key={email.id}
            className={cn(
              'relative flex items-start gap-3 px-3 py-3 transition-colors',
              active ? 'bg-amber-50/70' : 'hover:bg-gray-50',
            )}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={() => onToggleSelect(email.id)}
              aria-label={`Select email from ${who.name}`}
              className="mt-1.5 shrink-0 border-gray-300 data-[state=checked]:border-navy data-[state=checked]:bg-navy"
            />

            <button
              type="button"
              onClick={() => onSelect(email.id)}
              aria-current={active ? 'true' : undefined}
              className="min-w-0 flex-1 text-left"
            >
              <div className="flex items-center gap-2">
                <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', unread ? 'bg-amber-500' : 'bg-transparent')} aria-hidden="true" />
                <span className={cn('flex-1 truncate text-sm', unread ? 'font-bold text-gray-900' : 'font-medium text-gray-800')}>
                  {email.direction === 'outbound' && <span className="font-normal text-gray-500">To: </span>}
                  {who.name}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-gray-500">{formatListDate(email.createdAt)}</span>
              </div>
              <p className={cn('mt-0.5 truncate pl-4 text-sm', unread ? 'font-semibold text-gray-900' : 'text-gray-700')}>
                {email.subject || '(no subject)'}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5 pl-4">
                <p className="flex-1 truncate text-xs text-gray-500">{email.aiSummary || email.bodyText || ''}</p>
                {email.hasAttachments && <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-label="Has attachments" />}
                {email.isTest && <Badge variant="outline" className={BADGE_TONES.neutral}>Test</Badge>}
                {email.template === 'ai-auto-reply' && (
                  <Badge variant="outline" className={BADGE_TONES.violet}><Sparkles className="h-3 w-3" />Auto</Badge>
                )}
                {cat && <Badge variant="outline" className={BADGE_TONES[cat.tone]}>{cat.label}</Badge>}
                {showStatus && <Badge variant="outline" className={BADGE_TONES[st.tone]}>{st.label}</Badge>}
                {client && (
                  <Badge variant="outline" className={cn('max-w-[140px]', BADGE_TONES.navy)}>
                    <span className="truncate">{client}</span>
                  </Badge>
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => onToggleStar(email.id)}
              aria-label={email.isStarred ? 'Unstar' : 'Star'}
              aria-pressed={email.isStarred}
              className="mt-0.5 shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-white hover:text-amber-500"
            >
              <Star className={cn('h-4 w-4', email.isStarred && 'fill-amber-400 text-amber-400')} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

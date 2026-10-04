'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import TemplateSelector from '@/components/email/TemplateSelector';
import type { ComposeState } from '@/hooks/useAdminInbox';

interface ComposeModalProps {
  compose: ComposeState;
  from: string;
  sending: boolean;
  onField: (_field: 'to' | 'subject' | 'bodyText', _value: string) => void;
  onTemplate: (_template: string, _subject: string, _bodyText: string) => void;
  onSend: () => void;
  onClose: () => void;
  onDiscard: () => void;
}

const TEMPLATE_DEFAULTS: Record<string, { subject: string; body: string }> = {
  outreach: {
    subject: 'Maximize Your Tax Savings with Cost Segregation',
    body: 'I specialize in helping property owners maximize tax savings through cost segregation studies. Many of our clients see first-year savings of 15-30% of the building value.\n\nWould you be available for a brief 15-minute call this week to discuss how this could benefit you?',
  },
  'follow-up': {
    subject: 'Following Up: Cost Segregation Opportunity',
    body: 'I wanted to follow up on my previous message about cost segregation. Our no-obligation analysis takes just a few minutes to set up, and we can provide you with a preliminary estimate of your potential savings.\n\nI would love to connect when you have a moment.',
  },
  'report-delivery': {
    subject: 'Your Cost Segregation Report is Ready',
    body: 'Great news! Your cost segregation study report has been completed and is ready for review.\n\nPlease do not hesitate to reach out if you have any questions.',
  },
};

const inputCls = 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus-visible:ring-amber-500/30';

export function ComposeModal({ compose, from, sending, onField, onTemplate, onSend, onClose, onDiscard }: ComposeModalProps) {
  const [showQuoted, setShowQuoted] = useState(false);
  const isReply = !!compose.replyToEmailId;
  const canSend = !!(compose.to.trim() && compose.subject.trim() && compose.bodyText.trim()) && !sending;

  return (
    <Dialog open={compose.open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto border-gray-200 bg-white text-gray-900 sm:max-w-2xl md:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-navy">{isReply ? 'Reply' : 'New email'}</DialogTitle>
          <DialogDescription className="text-gray-500">
            From <span className="font-medium text-gray-700">{from}</span>. Replies come back to this inbox.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); if (canSend) onSend(); }}
        >
          {!isReply && (
            <TemplateSelector
              selected={compose.template}
              onSelect={(name) => {
                const d = TEMPLATE_DEFAULTS[name];
                onTemplate(name, d?.subject ?? compose.subject, d?.body ?? compose.bodyText);
              }}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="compose-to" className="text-gray-500">To</Label>
            <Input
              id="compose-to"
              type="email"
              autoComplete="off"
              value={compose.to}
              onChange={(e) => onField('to', e.target.value)}
              placeholder="name@example.com"
              readOnly={isReply}
              className={`${inputCls} ${isReply ? 'text-gray-600' : ''}`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="compose-subject" className="text-gray-500">Subject</Label>
            <Input
              id="compose-subject"
              type="text"
              value={compose.subject}
              onChange={(e) => onField('subject', e.target.value)}
              placeholder="Subject"
              maxLength={200}
              className={inputCls}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="compose-body" className="text-gray-500">Message</Label>
            <Textarea
              id="compose-body"
              value={compose.bodyText}
              onChange={(e) => onField('bodyText', e.target.value)}
              placeholder="Write your message…"
              rows={10}
              autoFocus={isReply}
              className={`${inputCls} min-h-[160px] resize-y text-base leading-relaxed md:text-sm`}
            />
          </div>

          {compose.quotedText && (
            <div>
              <button
                type="button"
                onClick={() => setShowQuoted((v) => !v)}
                className="mb-1.5 flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-navy"
              >
                {showQuoted ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showQuoted ? 'Hide' : 'Show'} quoted message
              </button>
              {showQuoted && (
                <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 font-sans text-xs leading-relaxed text-gray-600">
                  {compose.quotedText}
                </pre>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={onDiscard}
              className="inline-flex h-10 items-center gap-1 text-sm text-gray-500 transition-colors hover:text-red-600"
            >
              <X className="h-4 w-4" /> Discard
            </button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="border-gray-200 text-gray-600 hover:bg-gray-100">Close</Button>
              <Button type="submit" disabled={!canSend} className="bg-navy font-semibold text-white hover:bg-navy-light">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

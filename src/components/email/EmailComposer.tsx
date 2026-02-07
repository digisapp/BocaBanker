'use client';

import { useState } from 'react';
import { Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TemplateSelector from './TemplateSelector';

const TEMPLATE_DEFAULTS: Record<
  string,
  { subject: string; body: string }
> = {
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
    body: 'Great news! Your cost segregation study report has been completed and is ready for review. You can access the full report, including detailed depreciation schedules and asset breakdowns, through your Boca Banker dashboard.\n\nPlease do not hesitate to reach out if you have any questions.',
  },
  welcome: {
    subject: 'Welcome to Boca Banker',
    body: 'Welcome to Boca Banker! We are excited to help you maximize the value of your real estate investments through professional cost segregation analysis.\n\nWith your account, you can run depreciation calculations, generate study reports, and chat with our AI-powered tax advisor.',
  },
};

export default function EmailComposer() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [template, setTemplate] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  function handleTemplateSelect(templateName: string) {
    setTemplate(templateName);
    const defaults = TEMPLATE_DEFAULTS[templateName];
    if (defaults) {
      setSubject(defaults.subject);
      setBody(defaults.body);
    }
  }

  async function handleSend() {
    if (!to || !subject || !body) return;

    setStatus('sending');
    setErrorMessage('');

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          html: `<p>${body.replace(/\n/g, '</p><p>')}</p>`,
          template: template || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send email');
      }

      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setTo('');
        setSubject('');
        setBody('');
        setTemplate('');
      }, 3000);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send email');
    }
  }

  return (
    <div className="space-y-6">
      {/* Template Selector */}
      <div>
        <Label className="text-gray-500 mb-3 block">Choose a Template (optional)</Label>
        <TemplateSelector onSelect={handleTemplateSelect} selected={template} />
      </div>

      {/* Compose Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-gray-500">To</Label>
          <Input
            type="email"
            placeholder="recipient@example.com"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-500">Subject</Label>
          <Input
            placeholder="Email subject..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-500">Body</Label>
          <Textarea
            placeholder="Write your message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20 resize-none"
          />
        </div>

        {/* Status Messages */}
        {status === 'success' && (
          <div className="flex items-center gap-2 text-emerald-500 text-sm">
            <CheckCircle className="h-4 w-4" />
            Email sent successfully!
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="h-4 w-4" />
            {errorMessage || 'Failed to send email'}
          </div>
        )}

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!to || !subject || !body || status === 'sending'}
          className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:opacity-90 font-semibold w-full sm:w-auto"
        >
          {status === 'sending' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

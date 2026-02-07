'use client';

import { useState } from 'react';
import { Send, Loader2, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TemplateSelector from './TemplateSelector';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Clients' },
  { value: 'active', label: 'Active Clients' },
  { value: 'prospect', label: 'Prospects' },
  { value: 'inactive', label: 'Inactive Clients' },
];

const TEMPLATE_SUBJECTS: Record<string, string> = {
  outreach: 'Maximize Your Tax Savings with Cost Segregation',
  'follow-up': 'Following Up: Cost Segregation Opportunity',
  'report-delivery': 'Your Cost Segregation Report is Ready',
  welcome: 'Welcome to Boca Banker',
};

interface BulkEmailModalProps {
  trigger?: React.ReactNode;
}

export default function BulkEmailModal({ trigger }: BulkEmailModalProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [template, setTemplate] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleFilterChange(value: string) {
    setFilter(value);
    // Fetch recipient count
    try {
      const res = await fetch(
        `/api/clients?status=${value === 'all' ? '' : value}&limit=0`
      );
      if (res.ok) {
        const data = await res.json();
        setRecipientCount(data.total || 0);
      }
    } catch {
      setRecipientCount(null);
    }
  }

  async function handleSend() {
    if (!template) return;

    setStatus('sending');
    setErrorMessage('');

    try {
      const res = await fetch('/api/email/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: filter === 'all' ? undefined : filter,
          template,
          subject: TEMPLATE_SUBJECTS[template] || 'Message from Boca Banker',
          customMessage: customMessage || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send bulk emails');
      }

      setStatus('success');
      setTimeout(() => {
        setOpen(false);
        setStatus('idle');
        setTemplate('');
        setFilter('all');
        setCustomMessage('');
        setRecipientCount(null);
      }, 2500);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            className="border-[rgba(201,168,76,0.3)] text-[#C9A84C] hover:bg-[#243654]"
          >
            <Users className="h-4 w-4 mr-2" />
            Bulk Email
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-[#1A2B45] border-[rgba(201,168,76,0.15)] text-white max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#C9A84C] text-lg">Send Bulk Email</DialogTitle>
          <DialogDescription className="text-[#94A3B8]">
            Send emails to multiple clients at once using a template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Recipient Filter */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Recipients</Label>
            <Select value={filter} onValueChange={handleFilterChange}>
              <SelectTrigger className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A2B45] border-[rgba(201,168,76,0.15)]">
                {FILTER_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-white hover:bg-[#243654] focus:bg-[#243654]"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {recipientCount !== null && (
              <p className="text-sm text-[#C9A84C]">
                Sending to {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Template */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Template</Label>
            <TemplateSelector onSelect={setTemplate} selected={template} />
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Custom Message (optional)</Label>
            <Input
              placeholder="Add a personal note..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white placeholder:text-[#64748B] focus:border-[#C9A84C]"
            />
          </div>

          {/* Status */}
          {status === 'success' && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle className="h-4 w-4" />
              Bulk emails queued successfully!
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              {errorMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-[rgba(201,168,76,0.15)] text-[#94A3B8] hover:bg-[#243654]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!template || status === 'sending'}
              className="bg-gold-gradient text-[#0F1B2D] hover:opacity-90 font-semibold"
            >
              {status === 'sending' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send to {recipientCount ?? '...'} Recipients
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

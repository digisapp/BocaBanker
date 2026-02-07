'use client';

import { useState } from 'react';
import { Send, Loader2, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
            className="border-gray-200 text-amber-600 hover:bg-amber-50"
          >
            <Users className="h-4 w-4 mr-2" />
            Bulk Email
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-amber-600 text-lg">Send Bulk Email</DialogTitle>
          <DialogDescription className="text-gray-500">
            Send emails to multiple clients at once using a template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Recipient Filter */}
          <div className="space-y-2">
            <Label className="text-gray-500">Recipients</Label>
            <Select value={filter} onValueChange={handleFilterChange}>
              <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                {FILTER_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-gray-900 focus:bg-amber-50 focus:text-amber-700"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {recipientCount !== null && (
              <p className="text-sm text-amber-600">
                Sending to {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Template */}
          <div className="space-y-2">
            <Label className="text-gray-500">Template</Label>
            <TemplateSelector onSelect={setTemplate} selected={template} />
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label className="text-gray-500">Custom Message (optional)</Label>
            <Textarea
              placeholder="Add a personal note..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
              className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20 resize-none"
            />
          </div>

          {/* Status */}
          {status === 'success' && (
            <div className="flex items-center gap-2 text-emerald-500 text-sm">
              <CheckCircle className="h-4 w-4" />
              Bulk emails queued successfully!
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              {errorMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!template || status === 'sending'}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:opacity-90 font-semibold"
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

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import {
  Mail, Inbox, Send, Loader2, MailOpen, Reply, Trash2, X, Search,
  CheckCircle, AlertCircle, MessageSquare, Sparkles, ToggleLeft,
  ToggleRight, ChevronLeft, Square, CheckSquare, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import { RoleGate } from '@/components/shared/RoleGate';
import BulkEmailModal from '@/components/email/BulkEmailModal';
import TemplateSelector from '@/components/email/TemplateSelector';
import SandboxedHtml from '@/components/email/SandboxedHtml';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────

interface InboxEmail {
  id: string;
  fromEmail: string;
  fromName: string | null;
  subject: string;
  bodyText: string | null;
  status: string;
  isRead: boolean;
  threadId: string | null;
  template: string | null;
  createdAt: string;
  clientId: string | null;
  clientFirstName: string | null;
  clientLastName: string | null;
  aiCategory: string | null;
  aiConfidence: number | null;
  aiSummary: string | null;
  aiDraftHtml: string | null;
}

interface EmailDetail {
  id: string;
  direction: string;
  fromEmail: string;
  fromName: string | null;
  toEmail: string;
  subject: string;
  bodyHtml: string | null;
  bodyText: string | null;
  status: string;
  isRead: boolean;
  threadId: string | null;
  inReplyToId: string | null;
  template: string | null;
  createdAt: string;
  readAt: string | null;
  repliedAt: string | null;
  clientId: string | null;
  clientFirstName: string | null;
  clientLastName: string | null;
  clientEmail: string | null;
  aiDraftHtml: string | null;
  aiDraftText: string | null;
  aiCategory: string | null;
  aiConfidence: number | null;
  aiSummary: string | null;
  aiProcessedAt: string | null;
  thread?: EmailDetail[];
}

interface SentEmail {
  id: string;
  toEmail: string;
  subject: string;
  template: string | null;
  status: string;
  createdAt: string;
  clientFirstName: string | null;
  clientLastName: string | null;
}

type Tab = 'inbox' | 'sent';

// ── Status / Category colors ───────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  sent: 'bg-blue-50 text-blue-600 border-blue-200',
  delivered: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  bounced: 'bg-red-50 text-red-600 border-red-200',
  failed: 'bg-red-50 text-red-600 border-red-200',
  received: 'bg-amber-50 text-amber-600 border-amber-200',
  read: 'bg-gray-50 text-gray-600 border-gray-200',
  replied: 'bg-purple-50 text-purple-600 border-purple-200',
};

const CATEGORY_COLORS: Record<string, string> = {
  cost_seg_inquiry: 'bg-amber-50 text-amber-700 border-amber-200',
  mortgage_inquiry: 'bg-blue-50 text-blue-700 border-blue-200',
  study_request: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  scheduling: 'bg-violet-50 text-violet-700 border-violet-200',
  spam: 'bg-red-50 text-red-700 border-red-200',
  general_inquiry: 'bg-gray-50 text-gray-700 border-gray-200',
};

// ── Template defaults ──────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function getPreview(text: string | null): string {
  if (!text) return '';
  return text.slice(0, 120) + (text.length > 120 ? '...' : '');
}

function categoryLabel(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Main component ────────────────────────────────────────────────

export default function EmailPage() {
  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const [unreadCount, setUnreadCount] = useState(0);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  // Fetch auto-reply setting
  useEffect(() => {
    fetch('/api/admin/settings?key=ai_auto_reply_enabled')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setAutoReplyEnabled(d.value === true))
      .catch(() => {});
  }, []);

  async function toggleAutoReply() {
    const newVal = !autoReplyEnabled;
    setAutoReplyEnabled(newVal);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ai_auto_reply_enabled', value: newVal }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`AI auto-reply ${newVal ? 'enabled' : 'disabled'}`);
    } catch {
      setAutoReplyEnabled(!newVal);
      toast.error('Failed to update setting');
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-amber-600">Email</h1>
            <p className="text-sm text-gray-500">Send, receive, and manage client emails</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-reply toggle */}
          <button
            onClick={toggleAutoReply}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-amber-600 transition-colors"
          >
            {autoReplyEnabled ? (
              <ToggleRight className="h-5 w-5 text-amber-500" />
            ) : (
              <ToggleLeft className="h-5 w-5 text-gray-400" />
            )}
            <span className="hidden sm:inline">AI Auto-Reply</span>
          </button>
          {/* Compose button */}
          <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} />
          <RoleGate permission="canSendEmail">
            <BulkEmailModal />
          </RoleGate>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
            activeTab === 'inbox' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Inbox className="h-4 w-4" />
          Inbox
          {unreadCount > 0 && (
            <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
            activeTab === 'sent' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Send className="h-4 w-4" />
          Sent
        </button>
      </div>

      {activeTab === 'inbox' && <InboxTab onUnreadChange={setUnreadCount} />}
      {activeTab === 'sent' && <SentTab />}
    </div>
  );
}

// ── Compose Dialog ─────────────────────────────────────────────────

function ComposeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [template, setTemplate] = useState('');
  const [sending, setSending] = useState(false);

  function handleTemplateSelect(name: string) {
    setTemplate(name);
    const d = TEMPLATE_DEFAULTS[name];
    if (d) { setSubject(d.subject); setBody(d.body); }
  }

  async function handleSend() {
    if (!to || !subject || !body) return;
    setSending(true);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to, subject,
          html: escapeHtml(body).split('\n').map((l) => `<p>${l || '&nbsp;'}</p>`).join(''),
          template: template || undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to send email');
      }
      toast.success('Email sent!');
      onOpenChange(false);
      setTo(''); setSubject(''); setBody(''); setTemplate('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:opacity-90 font-semibold">
          <Mail className="h-4 w-4 mr-2" />
          Compose
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-amber-600">Compose Email</DialogTitle>
          <DialogDescription className="text-gray-500">Send a new email via Resend</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <TemplateSelector onSelect={handleTemplateSelect} selected={template} />
          <div className="space-y-2">
            <Label className="text-gray-500">To</Label>
            <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.com"
              className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-500">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject..."
              className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-500">Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Write your message..."
              className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 resize-none" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-200 text-gray-500">Cancel</Button>
            <Button onClick={handleSend} disabled={!to || !subject || !body || sending}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:opacity-90">
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Inbox Tab ──────────────────────────────────────────────────────

function InboxTab({ onUnreadChange }: { onUnreadChange: (n: number) => void }) {
  const [emailList, setEmailList] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [readFilter, setReadFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '30' });
      if (readFilter === 'unread') params.set('read', 'false');
      if (readFilter === 'read') params.set('read', 'true');
      if (search) params.set('search', search);
      const res = await fetch(`/api/email/inbox?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEmailList(data.emails);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        onUnreadChange(data.unread);
      }
    } catch (err) {
      logger.error('inbox', 'Fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, [page, readFilter, search, onUnreadChange]);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectedEmail) {
        setSelectedEmail(null);
        setShowReply(false);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedEmail]);

  async function openEmail(id: string) {
    setLoadingDetail(true);
    setShowReply(false);
    setReplyBody('');
    try {
      const res = await fetch(`/api/email/inbox/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedEmail(data);
        setEmailList((prev) => prev.map((e) => (e.id === id ? { ...e, isRead: true } : e)));
      }
    } catch (err) {
      logger.error('inbox', 'Fetch detail failed', err);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function deleteEmails(ids: string[]) {
    try {
      const res = await fetch('/api/email/inbox', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds: ids }),
      });
      if (res.ok) {
        setEmailList((prev) => prev.filter((e) => !ids.includes(e.id)));
        if (selectedEmail && ids.includes(selectedEmail.id)) setSelectedEmail(null);
        setSelectedIds(new Set());
        setTotal((prev) => prev - ids.length);
        toast.success(`Deleted ${ids.length} email${ids.length > 1 ? 's' : ''}`);
      }
    } catch { toast.error('Delete failed'); }
  }

  async function bulkMarkRead() {
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch('/api/email/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds: ids }),
      });
      if (!res.ok) throw new Error('Failed');
      setEmailList((prev) => prev.map((e) => ids.includes(e.id) ? { ...e, isRead: true } : e));
      setSelectedIds(new Set());
      toast.success(`Marked ${ids.length} as read`);
    } catch { toast.error('Failed to mark as read'); }
  }

  async function sendReply() {
    if (!selectedEmail || !replyBody.trim()) return;
    setSendingReply(true);
    try {
      const html = escapeHtml(replyBody).split('\n').map((l) => `<p>${l || '&nbsp;'}</p>`).join('');
      const res = await fetch(`/api/email/inbox/${selectedEmail.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      });
      if (res.ok) {
        setShowReply(false);
        setReplyBody('');
        setEmailList((prev) => prev.map((e) => e.id === selectedEmail.id ? { ...e, status: 'replied' } : e));
        setSelectedEmail({ ...selectedEmail, status: 'replied' });
        toast.success('Reply sent!');
      }
    } catch { toast.error('Failed to send reply'); }
    finally { setSendingReply(false); }
  }

  function useDraft() {
    if (!selectedEmail?.aiDraftText) return;
    setReplyBody(selectedEmail.aiDraftText);
    setShowReply(true);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === emailList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emailList.map((e) => e.id)));
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          <span className="text-sm font-medium text-amber-700">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" onClick={bulkMarkRead}
            className="border-amber-200 text-amber-700 hover:bg-amber-100 h-7 text-xs">
            Mark Read
          </Button>
          <Button size="sm" variant="outline" onClick={() => deleteEmails(Array.from(selectedIds))}
            className="border-red-200 text-red-600 hover:bg-red-50 h-7 text-xs">
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}
            className="text-gray-500 h-7 text-xs ml-auto">
            Cancel
          </Button>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search by email, name, or subject..." value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500" />
          </div>
          <Button type="submit" variant="outline" className="border-gray-200 text-amber-600 hover:bg-amber-50">Search</Button>
        </form>
        <Select value={readFilter} onValueChange={(v) => { setReadFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all" className="text-gray-900 focus:bg-amber-50">All</SelectItem>
            <SelectItem value="unread" className="text-gray-900 focus:bg-amber-50">Unread</SelectItem>
            <SelectItem value="read" className="text-gray-900 focus:bg-amber-50">Read</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Two-panel */}
      <div className="flex gap-4 min-h-[600px]">
        {/* Email list */}
        <div className="w-full lg:w-2/5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center py-16 flex-1">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : emailList.length === 0 ? (
            <div className="text-center py-16 flex-1">
              <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">{search ? 'No results' : 'Inbox empty'}</p>
            </div>
          ) : (
            <>
              {/* Select all row */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                <button onClick={toggleSelectAll} className="text-gray-400 hover:text-amber-500">
                  {selectedIds.size === emailList.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                </button>
                <span className="text-xs text-gray-400">{total} emails</span>
              </div>
              <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
                {emailList.map((email) => (
                  <div key={email.id} className={`flex items-start gap-2 px-4 py-3 hover:bg-amber-50/50 transition-colors cursor-pointer ${
                    selectedEmail?.id === email.id ? 'bg-amber-50 border-l-2 border-amber-500' : ''
                  } ${!email.isRead ? 'bg-blue-50/30' : ''} ${email.aiCategory === 'spam' ? 'opacity-60' : ''}`}>
                    {/* Checkbox */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(email.id); }}
                      className="mt-1 text-gray-400 hover:text-amber-500 shrink-0"
                    >
                      {selectedIds.has(email.id) ? <CheckSquare className="h-4 w-4 text-amber-500" /> : <Square className="h-4 w-4" />}
                    </button>
                    {/* Email content */}
                    <button onClick={() => openEmail(email.id)} className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {email.isRead ? <MailOpen className="h-3.5 w-3.5 text-gray-400 shrink-0" /> : <Mail className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                          <p className={`text-sm truncate ${!email.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                            {email.aiCategory === 'spam' ? <s>{email.fromName || email.fromEmail}</s> : (email.fromName || email.fromEmail)}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(email.createdAt)}</span>
                      </div>
                      <p className={`text-sm truncate ${!email.isRead ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                        {email.aiCategory === 'spam' ? <s>{email.subject}</s> : email.subject}
                      </p>
                      {/* AI summary */}
                      {email.aiSummary && (
                        <p className="text-xs text-gray-400 truncate mt-0.5 italic">{email.aiSummary}</p>
                      )}
                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {email.aiCategory && (
                          <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[email.aiCategory] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {categoryLabel(email.aiCategory)}
                            {email.aiConfidence !== null && <span className="ml-1 opacity-60">{Math.round(email.aiConfidence * 100)}%</span>}
                          </Badge>
                        )}
                        {email.status === 'replied' && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">Replied</Badge>
                        )}
                        {email.template === 'ai-auto-reply' && (
                          <Badge variant="outline" className="text-xs bg-violet-50 text-violet-600 border-violet-200">
                            <Sparkles className="h-3 w-3 mr-0.5" />Auto
                          </Badge>
                        )}
                        {email.threadId && (
                          <MessageSquare className="h-3 w-3 text-gray-400" />
                        )}
                        {email.clientFirstName && (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-600 border-amber-200">
                            {email.clientFirstName} {email.clientLastName}
                          </Badge>
                        )}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-3 border-t border-gray-100">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="border-gray-200 text-gray-500 hover:bg-amber-50 disabled:opacity-40">Prev</Button>
              <span className="text-xs text-gray-500">{page}/{totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                className="border-gray-200 text-gray-500 hover:bg-amber-50 disabled:opacity-40">Next</Button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="hidden lg:flex lg:w-3/5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-col">
          {loadingDetail ? (
            <div className="flex items-center justify-center flex-1"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>
          ) : selectedEmail ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedEmail(null)} className="text-gray-400 hover:text-amber-600">
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <h2 className="text-lg font-semibold text-gray-900 truncate">{selectedEmail.subject}</h2>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      From: <span className="font-medium">{selectedEmail.fromName ? `${selectedEmail.fromName} <${selectedEmail.fromEmail}>` : selectedEmail.fromEmail}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(selectedEmail.createdAt)}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {selectedEmail.clientFirstName && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                          Client: {selectedEmail.clientFirstName} {selectedEmail.clientLastName}
                        </Badge>
                      )}
                      <Badge variant="outline" className={STATUS_COLORS[selectedEmail.status] || ''}>{selectedEmail.status}</Badge>
                      {selectedEmail.aiCategory && (
                        <Badge variant="outline" className={CATEGORY_COLORS[selectedEmail.aiCategory] || 'bg-gray-50 text-gray-600 border-gray-200'}>
                          {categoryLabel(selectedEmail.aiCategory)}
                          {selectedEmail.aiConfidence !== null && ` ${Math.round(selectedEmail.aiConfidence * 100)}%`}
                        </Badge>
                      )}
                    </div>
                    {selectedEmail.aiSummary && (
                      <p className="text-xs text-gray-500 mt-2 italic bg-gray-50 px-3 py-1.5 rounded-lg">
                        <Sparkles className="h-3 w-3 inline mr-1 text-amber-500" />{selectedEmail.aiSummary}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => { setShowReply(!showReply); setReplyBody(''); }}
                      className="text-gray-500 hover:text-amber-600 hover:bg-amber-50"><Reply className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteEmails([selectedEmail.id])}
                      className="text-gray-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>

              {/* AI Draft Section */}
              {selectedEmail.aiDraftHtml && selectedEmail.status !== 'replied' && (
                <div className="mx-6 mt-4 p-4 bg-violet-50 border border-violet-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-violet-700 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" />AI Draft Reply
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={useDraft}
                        className="bg-violet-600 text-white hover:bg-violet-700 h-7 text-xs">Use Draft</Button>
                      <Button size="sm" variant="outline" onClick={() => { setReplyBody(selectedEmail.aiDraftText || ''); setShowReply(true); }}
                        className="border-violet-200 text-violet-600 h-7 text-xs">Edit Draft</Button>
                    </div>
                  </div>
                  <div className="text-sm text-violet-800 bg-white/50 rounded-lg p-3">
                    <SandboxedHtml html={selectedEmail.aiDraftHtml} />
                  </div>
                </div>
              )}

              {/* Thread / Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {selectedEmail.thread && selectedEmail.thread.length > 1 ? (
                  [...selectedEmail.thread].reverse().map((msg) => (
                    <div key={msg.id} className={msg.direction === 'outbound' ? 'ml-8' : ''}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-gray-600">
                          {msg.direction === 'outbound' ? 'You' : msg.fromName || msg.fromEmail}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
                        {msg.direction === 'outbound' && (
                          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[msg.status] || ''}`}>{msg.status}</Badge>
                        )}
                        {msg.template === 'ai-auto-reply' && (
                          <Badge variant="outline" className="text-xs bg-violet-50 text-violet-600 border-violet-200">
                            <Sparkles className="h-3 w-3 mr-0.5" />Auto
                          </Badge>
                        )}
                      </div>
                      <div className={`rounded-xl p-4 ${msg.direction === 'outbound' ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50 border border-gray-100'}`}>
                        {msg.bodyHtml ? <SandboxedHtml html={msg.bodyHtml} /> : (
                          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{msg.bodyText || '(no content)'}</pre>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  selectedEmail.bodyHtml ? <SandboxedHtml html={selectedEmail.bodyHtml} /> : (
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{selectedEmail.bodyText || '(no content)'}</pre>
                  )
                )}
              </div>

              {/* Reply box */}
              {showReply && (
                <div className="border-t border-gray-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Reply to {selectedEmail.fromName || selectedEmail.fromEmail}</p>
                    <Button variant="ghost" size="icon" onClick={() => setShowReply(false)} className="text-gray-400 hover:text-gray-600 h-6 w-6">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Type your reply..."
                    className="w-full min-h-[120px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-y text-gray-900 placeholder:text-gray-400" />
                  <div className="flex justify-end">
                    <Button onClick={sendReply} disabled={sendingReply || !replyBody.trim()} className="bg-amber-500 hover:bg-amber-600 text-white">
                      {sendingReply ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      Send Reply
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center">
                <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">Select an email to read</p>
                <p className="text-xs text-gray-300 mt-1">Press Escape to deselect</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sent Tab ───────────────────────────────────────────────────────

function SentTab() {
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchSent = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '30' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/email/sent?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSentEmails(data.emails);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) { logger.error('sent', 'Fetch failed', err); }
    finally { setLoading(false); }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchSent(); }, [fetchSent]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search sent emails..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500" />
          </div>
          <Button type="submit" variant="outline" className="border-gray-200 text-amber-600 hover:bg-amber-50">Search</Button>
        </form>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all" className="text-gray-900 focus:bg-amber-50">All Status</SelectItem>
            <SelectItem value="sent" className="text-gray-900 focus:bg-amber-50">Sent</SelectItem>
            <SelectItem value="delivered" className="text-gray-900 focus:bg-amber-50">Delivered</SelectItem>
            <SelectItem value="bounced" className="text-gray-900 focus:bg-amber-50">Bounced</SelectItem>
            <SelectItem value="failed" className="text-gray-900 focus:bg-amber-50">Failed</SelectItem>
            <SelectItem value="replied" className="text-gray-900 focus:bg-amber-50">Replied</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-gray-500">{total} sent emails</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>
        ) : sentEmails.length === 0 ? (
          <div className="text-center py-16">
            <Send className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">{search ? 'No results' : 'No sent emails'}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-amber-600 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-amber-600 uppercase">Recipient</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-amber-600 uppercase">Subject</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-amber-600 uppercase">Template</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-amber-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sentEmails.map((email) => (
                <tr key={email.id} className="hover:bg-amber-50/50">
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(email.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{email.toEmail}</p>
                    {email.clientFirstName && <p className="text-xs text-gray-400">{email.clientFirstName} {email.clientLastName}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">{email.subject}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 capitalize">
                    {email.template === 'ai-auto-reply' ? (
                      <Badge variant="outline" className="text-xs bg-violet-50 text-violet-600 border-violet-200">
                        <Sparkles className="h-3 w-3 mr-0.5" />Auto
                      </Badge>
                    ) : email.template ? email.template.replace('-', ' ') : '--'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`capitalize ${STATUS_COLORS[email.status] || ''}`}>{email.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="border-gray-200 text-gray-500 hover:bg-amber-50 disabled:opacity-40">Previous</Button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="border-gray-200 text-gray-500 hover:bg-amber-50 disabled:opacity-40">Next</Button>
        </div>
      )}
    </div>
  );
}

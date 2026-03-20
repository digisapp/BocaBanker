'use client';

import { useEffect, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import {
  Mail,
  Inbox,
  Send,
  Loader2,
  MailOpen,
  Reply,
  Trash2,
  X,
  Search,
  Users,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RoleGate } from '@/components/shared/RoleGate';
import BulkEmailModal from '@/components/email/BulkEmailModal';
import TemplateSelector from '@/components/email/TemplateSelector';
import SandboxedHtml from '@/components/email/SandboxedHtml';

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
  createdAt: string;
  clientId: string | null;
  clientFirstName: string | null;
  clientLastName: string | null;
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
  createdAt: string;
  clientId: string | null;
  clientFirstName: string | null;
  clientLastName: string | null;
  clientEmail: string | null;
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

type Tab = 'inbox' | 'sent' | 'compose';

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
    body: 'Great news! Your cost segregation study report has been completed and is ready for review. You can access the full report, including detailed depreciation schedules and asset breakdowns, through your Boca Banker dashboard.\n\nPlease do not hesitate to reach out if you have any questions.',
  },
};

// ── Status colors ──────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  sent: 'bg-blue-50 text-blue-600 border-blue-200',
  delivered: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  bounced: 'bg-red-50 text-red-600 border-red-200',
  failed: 'bg-red-50 text-red-600 border-red-200',
  received: 'bg-amber-50 text-amber-600 border-amber-200',
  read: 'bg-gray-50 text-gray-600 border-gray-200',
  replied: 'bg-purple-50 text-purple-600 border-purple-200',
};

// ── Helpers ────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getPreview(text: string | null): string {
  if (!text) return '';
  return text.slice(0, 120) + (text.length > 120 ? '...' : '');
}

// ── Main component ────────────────────────────────────────────────

export default function EmailPage() {
  const [activeTab, setActiveTab] = useState<Tab>('inbox');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-amber-600">
              Email
            </h1>
            <p className="text-sm text-gray-500">
              Send, receive, and manage client emails
            </p>
          </div>
        </div>
        <RoleGate permission="canSendEmail">
          <BulkEmailModal />
        </RoleGate>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[
          { key: 'inbox' as Tab, label: 'Inbox', icon: Inbox },
          { key: 'sent' as Tab, label: 'Sent', icon: Send },
          { key: 'compose' as Tab, label: 'Compose', icon: Mail },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              activeTab === tab.key
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'inbox' && <InboxTab />}
      {activeTab === 'sent' && <SentTab />}
      {activeTab === 'compose' && <ComposeTab />}
    </div>
  );
}

// ── Inbox Tab ──────────────────────────────────────────────────────

function InboxTab() {
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
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
        setEmails(data.emails);
        setTotal(data.total);
        setUnread(data.unread);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      logger.error('inbox', 'Failed to fetch inbox', err);
    } finally {
      setLoading(false);
    }
  }, [page, readFilter, search]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  async function openEmail(id: string) {
    setLoadingDetail(true);
    setShowReply(false);
    setReplyBody('');
    try {
      const res = await fetch(`/api/email/inbox/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedEmail(data);
        setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, isRead: true } : e)));
      }
    } catch (err) {
      logger.error('inbox', 'Failed to fetch email', err);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function deleteEmail(id: string) {
    try {
      const res = await fetch(`/api/email/inbox/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEmails((prev) => prev.filter((e) => e.id !== id));
        if (selectedEmail?.id === id) setSelectedEmail(null);
        setTotal((prev) => prev - 1);
      }
    } catch (err) {
      logger.error('inbox', 'Failed to delete', err);
    }
  }

  async function sendReply() {
    if (!selectedEmail || !replyBody.trim()) return;
    setSendingReply(true);
    try {
      const html = replyBody
        .split('\n')
        .map((line) => `<p>${line || '&nbsp;'}</p>`)
        .join('');

      const res = await fetch(`/api/email/inbox/${selectedEmail.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      });

      if (res.ok) {
        setShowReply(false);
        setReplyBody('');
        // Update status in list
        setEmails((prev) =>
          prev.map((e) => (e.id === selectedEmail.id ? { ...e, status: 'replied' } : e))
        );
        if (selectedEmail) {
          setSelectedEmail({ ...selectedEmail, status: 'replied' });
        }
      }
    } catch (err) {
      logger.error('inbox', 'Failed to send reply', err);
    } finally {
      setSendingReply(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by email, name, or subject..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500"
            />
          </div>
          <Button type="submit" variant="outline" className="border-gray-200 text-amber-600 hover:bg-amber-50">
            Search
          </Button>
        </form>
        <Select
          value={readFilter}
          onValueChange={(v) => { setReadFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-[140px] bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all" className="text-gray-900 focus:bg-amber-50 focus:text-amber-700">All</SelectItem>
            <SelectItem value="unread" className="text-gray-900 focus:bg-amber-50 focus:text-amber-700">Unread</SelectItem>
            <SelectItem value="read" className="text-gray-900 focus:bg-amber-50 focus:text-amber-700">Read</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Unread count */}
      {unread > 0 && (
        <p className="text-sm text-amber-600 font-medium">
          {unread} unread email{unread !== 1 ? 's' : ''}
        </p>
      )}

      {/* Two-panel layout */}
      <div className="flex gap-4 min-h-[550px]">
        {/* Email list */}
        <div className="w-full lg:w-2/5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center py-16 flex-1">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-16 flex-1">
              <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">
                {search ? 'No emails match your search' : 'No emails in your inbox'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
              {emails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => openEmail(email.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-amber-50/50 transition-colors ${
                    selectedEmail?.id === email.id
                      ? 'bg-amber-50 border-l-2 border-amber-500'
                      : ''
                  } ${!email.isRead ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 shrink-0">
                      {email.isRead ? (
                        <MailOpen className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Mail className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${!email.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {email.fromName || email.fromEmail}
                        </p>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatDate(email.createdAt)}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${!email.isRead ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                        {email.subject}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {getPreview(email.bodyText)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {email.clientFirstName && (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-600 border-amber-200">
                            {email.clientFirstName} {email.clientLastName}
                          </Badge>
                        )}
                        {email.status === 'replied' && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                            Replied
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-3 border-t border-gray-100">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="border-gray-200 text-gray-500 hover:bg-amber-50 disabled:opacity-40">
                Prev
              </Button>
              <span className="text-xs text-gray-500">{page}/{totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                className="border-gray-200 text-gray-500 hover:bg-amber-50 disabled:opacity-40">
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Email detail panel */}
        <div className="hidden lg:flex lg:w-3/5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-col">
          {loadingDetail ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : selectedEmail ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 truncate">
                      {selectedEmail.subject}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      From:{' '}
                      <span className="font-medium">
                        {selectedEmail.fromName
                          ? `${selectedEmail.fromName} <${selectedEmail.fromEmail}>`
                          : selectedEmail.fromEmail}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(selectedEmail.createdAt)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {selectedEmail.clientFirstName && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                          Client: {selectedEmail.clientFirstName} {selectedEmail.clientLastName}
                        </Badge>
                      )}
                      <Badge variant="outline" className={STATUS_COLORS[selectedEmail.status] || ''}>
                        {selectedEmail.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon"
                      onClick={() => { setShowReply(!showReply); setReplyBody(''); }}
                      className="text-gray-500 hover:text-amber-600 hover:bg-amber-50">
                      <Reply className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon"
                      onClick={() => deleteEmail(selectedEmail.id)}
                      className="text-gray-500 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Thread / Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {selectedEmail.thread && selectedEmail.thread.length > 1 ? (
                  // Show full thread
                  [...selectedEmail.thread].reverse().map((msg) => (
                    <div key={msg.id} className={`${msg.direction === 'outbound' ? 'ml-8' : ''}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-gray-600">
                          {msg.direction === 'outbound' ? 'You' : msg.fromName || msg.fromEmail}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
                        {msg.direction === 'outbound' && (
                          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[msg.status] || ''}`}>
                            {msg.status}
                          </Badge>
                        )}
                      </div>
                      <div className={`rounded-xl p-4 ${
                        msg.direction === 'outbound'
                          ? 'bg-amber-50 border border-amber-100'
                          : 'bg-gray-50 border border-gray-100'
                      }`}>
                        {msg.bodyHtml ? (
                          <SandboxedHtml html={msg.bodyHtml} />
                        ) : (
                          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                            {msg.bodyText || '(no content)'}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  // Single email
                  selectedEmail.bodyHtml ? (
                    <SandboxedHtml html={selectedEmail.bodyHtml} />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                      {selectedEmail.bodyText || '(no content)'}
                    </pre>
                  )
                )}
              </div>

              {/* Reply box */}
              {showReply && (
                <div className="border-t border-gray-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">
                      Reply to {selectedEmail.fromName || selectedEmail.fromEmail}
                    </p>
                    <Button variant="ghost" size="icon" onClick={() => setShowReply(false)}
                      className="text-gray-400 hover:text-gray-600 h-6 w-6">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full min-h-[120px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-y text-gray-900 placeholder:text-gray-400"
                  />
                  <div className="flex justify-end">
                    <Button onClick={sendReply} disabled={sendingReply || !replyBody.trim()}
                      className="bg-amber-500 hover:bg-amber-600 text-white">
                      {sendingReply ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
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
    } catch (err) {
      logger.error('sent', 'Failed to fetch sent emails', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchSent();
  }, [fetchSent]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search sent emails..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500"
            />
          </div>
          <Button type="submit" variant="outline" className="border-gray-200 text-amber-600 hover:bg-amber-50">
            Search
          </Button>
        </form>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-[160px] bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all" className="text-gray-900 focus:bg-amber-50 focus:text-amber-700">All Status</SelectItem>
            <SelectItem value="sent" className="text-gray-900 focus:bg-amber-50 focus:text-amber-700">Sent</SelectItem>
            <SelectItem value="delivered" className="text-gray-900 focus:bg-amber-50 focus:text-amber-700">Delivered</SelectItem>
            <SelectItem value="bounced" className="text-gray-900 focus:bg-amber-50 focus:text-amber-700">Bounced</SelectItem>
            <SelectItem value="failed" className="text-gray-900 focus:bg-amber-50 focus:text-amber-700">Failed</SelectItem>
            <SelectItem value="replied" className="text-gray-900 focus:bg-amber-50 focus:text-amber-700">Replied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-gray-500">{total} sent emails</p>

      {/* Sent emails table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : sentEmails.length === 0 ? (
          <div className="text-center py-16">
            <Send className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">
              {search ? 'No sent emails match your search' : 'No sent emails yet'}
            </p>
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
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(email.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{email.toEmail}</p>
                    {email.clientFirstName && (
                      <p className="text-xs text-gray-400">
                        {email.clientFirstName} {email.clientLastName}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">
                    {email.subject}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 capitalize">
                    {email.template ? email.template.replace('-', ' ') : '--'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`capitalize ${STATUS_COLORS[email.status] || ''}`}>
                      {email.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="border-gray-200 text-gray-500 hover:bg-amber-50 disabled:opacity-40">
            Previous
          </Button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="border-gray-200 text-gray-500 hover:bg-amber-50 disabled:opacity-40">
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Compose Tab ────────────────────────────────────────────────────

function ComposeTab() {
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <RoleGate permission="canSendEmail">
        <div className="space-y-6">
          {/* Template */}
          <div>
            <Label className="text-gray-500 mb-3 block">Choose a Template (optional)</Label>
            <TemplateSelector onSelect={handleTemplateSelect} selected={template} />
          </div>

          {/* Form */}
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
      </RoleGate>
    </div>
  );
}

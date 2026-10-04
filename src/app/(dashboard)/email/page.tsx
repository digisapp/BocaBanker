'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Mail, Sparkles, Info, Inbox as InboxIcon, MailOpen, Plus, RefreshCw, Search, ShieldAlert, ShieldCheck,
  Star, StarOff, Trash2, X, History, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/shared/PageHeader';
import { RoleGate } from '@/components/shared/RoleGate';
import BulkEmailModal from '@/components/email/BulkEmailModal';
import { useAdminInbox } from '@/hooks/useAdminInbox';
import {
  EmailList, EmailDetailView, ComposeModal, InboxSetupCard, FOLDERS,
  AUTO_REPLY_CATEGORY_NAMES, HELD_CATEGORY_NAMES,
} from '@/components/email/inbox';

const ghostSm = 'h-7 px-2 text-xs text-gray-600 hover:bg-gray-100 hover:text-navy';

export default function EmailPage() {
  const d = useAdminInbox();
  const [showAutoReplyInfo, setShowAutoReplyInfo] = useState(false);
  const [confirmEnable, setConfirmEnable] = useState(false);

  const selectionCount = d.selectedIds.size;
  const allOnPageSelected = d.emails.length > 0 && selectionCount === d.emails.length;
  const inSpam = d.folder === 'spam';
  const from = d.status?.from ?? 'Boca Banker <team@bocabanker.com>';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Mail}
        title="Email"
        badge={d.counts.unread > 0 ? (
          <span className="rounded-full bg-navy px-2 py-0.5 text-xs font-semibold text-white tabular-nums">{d.counts.unread} new</span>
        ) : undefined}
        description={
          <>
            Mail to <span className="font-mono">{d.status?.inboundAddress ?? 'the Boca Banker address'}</span> lands here; replies go out as {from}.
          </>
        }
        actions={
          <>
            {!d.autoReplyLoading && (
              <div className={cn(
                'flex h-10 items-stretch overflow-hidden rounded-lg border text-xs font-medium',
                d.autoReplyEnabled ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-600',
              )}>
                <label className="flex cursor-pointer items-center gap-2 px-3" title={d.autoReplyEnabled ? 'AI auto-reply is on' : 'AI auto-reply is off'}>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Auto-reply</span>
                  <Switch
                    size="sm"
                    checked={d.autoReplyEnabled}
                    onCheckedChange={(on) => (on ? setConfirmEnable(true) : d.setAutoReply(false))}
                    aria-label="AI auto-reply"
                    className="data-[state=checked]:bg-navy"
                  />
                </label>
                <button type="button" onClick={() => setShowAutoReplyInfo(true)} className="border-l border-inherit px-2 hover:bg-gray-100" aria-label="About AI auto-reply">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <Button variant="outline" onClick={d.refresh} disabled={d.loading} aria-label="Refresh" className="border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-navy">
              <RefreshCw className={cn('h-4 w-4', d.loading && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={() => d.openCompose()} className="bg-navy font-semibold text-white hover:bg-navy-light">
              <Plus className="h-4 w-4" /> Compose
            </Button>
            <RoleGate permission="canSendEmail">
              <BulkEmailModal />
            </RoleGate>
            {/* Topbar search (the usual way to Email History) is hidden below sm */}
            <Button asChild variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-100 sm:hidden">
              <Link href="/email/history"><History className="h-4 w-4" /> History</Link>
            </Button>
          </>
        }
      />

      {d.status && (
        <InboxSetupCard status={d.status} loading={d.statusLoading} onRecheck={d.refreshStatus} onSendTest={d.sendTest} sendingTest={d.sendingTest} />
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Folders">
          {FOLDERS.map((f) => {
            const count = f.value === 'unread' ? d.counts.unread : f.value === 'starred' ? d.counts.starred : f.value === 'spam' ? d.counts.spam : 0;
            const active = d.folder === f.value;
            return (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => d.setFolder(f.value)}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
                  active ? 'bg-navy text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-navy',
                )}
              >
                {f.label}
                {count > 0 && (
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] leading-none tabular-nums', active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600')}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="relative lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            value={d.search}
            onChange={(e) => d.setSearch(e.target.value)}
            placeholder="Search subject, sender, text…"
            aria-label="Search emails"
            className="bg-white pl-9 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus-visible:ring-amber-500/30"
          />
        </div>
      </div>

      {d.error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{d.error}</span>
          <Button variant="outline" size="sm" onClick={d.refresh} className="border-red-200 text-red-700 hover:bg-red-100">Retry</Button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex lg:h-[calc(100dvh-21rem)] lg:min-h-[520px]">
          {/* List pane */}
          <div className={cn('w-full shrink-0 lg:w-[400px] lg:overflow-y-auto lg:border-r lg:border-gray-100', d.selectedId && 'hidden lg:block')}>
            <div className="sticky top-0 z-10 flex min-h-[44px] items-center gap-2 border-b border-gray-100 bg-white px-3 py-1.5 text-xs">
              <Checkbox
                checked={allOnPageSelected}
                onCheckedChange={d.selectAllOnPage}
                disabled={d.emails.length === 0}
                aria-label="Select all on this page"
                className="border-gray-300 data-[state=checked]:border-navy data-[state=checked]:bg-navy"
              />
              {selectionCount > 0 ? (
                <div className="flex flex-1 flex-wrap items-center gap-1">
                  <span className="mr-1 font-medium text-gray-800 tabular-nums">{selectionCount} selected</span>
                  {!inSpam && d.folder !== 'sent' && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => d.bulk('markRead')} disabled={d.bulkActing} className={ghostSm}><MailOpen className="h-3.5 w-3.5" /> Read</Button>
                      <Button size="sm" variant="ghost" onClick={() => d.bulk('markUnread')} disabled={d.bulkActing} className={ghostSm}><Mail className="h-3.5 w-3.5" /> Unread</Button>
                    </>
                  )}
                  {d.folder === 'starred'
                    ? <Button size="sm" variant="ghost" onClick={() => d.bulk('unstar')} disabled={d.bulkActing} className={ghostSm}><StarOff className="h-3.5 w-3.5" /> Unstar</Button>
                    : <Button size="sm" variant="ghost" onClick={() => d.bulk('star')} disabled={d.bulkActing} className={ghostSm}><Star className="h-3.5 w-3.5" /> Star</Button>}
                  {d.folder !== 'sent' && (inSpam
                    ? <Button size="sm" variant="ghost" onClick={() => d.bulk('notSpam')} disabled={d.bulkActing} className={ghostSm}><ShieldCheck className="h-3.5 w-3.5" /> Not spam</Button>
                    : <Button size="sm" variant="ghost" onClick={() => d.bulk('spam')} disabled={d.bulkActing} className={ghostSm}><ShieldAlert className="h-3.5 w-3.5" /> Spam</Button>)}
                  <Button size="sm" variant="ghost" onClick={() => d.bulk('delete')} disabled={d.bulkActing} className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
                  <button type="button" onClick={d.clearSelection} className="ml-auto rounded p-1 text-gray-400 hover:text-navy" aria-label="Clear selection"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <span className="text-gray-500 tabular-nums">
                  {d.loading ? 'Loading…' : `${d.total.toLocaleString()} ${d.total === 1 ? 'email' : 'emails'}`}
                </span>
              )}
            </div>

            {d.loading && d.emails.length === 0 ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-navy" /></div>
            ) : (
              <>
                <EmailList
                  emails={d.emails}
                  folder={d.folder}
                  selectedId={d.selectedId}
                  onSelect={d.selectEmail}
                  onToggleStar={d.toggleStar}
                  selectedIds={d.selectedIds}
                  onToggleSelect={d.toggleSelect}
                  searching={!!d.search.trim()}
                />
                {d.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
                    <Button size="sm" variant="ghost" onClick={() => d.setPage(Math.max(1, d.page - 1))} disabled={d.page <= 1} aria-label="Previous page" className={ghostSm}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-gray-500 tabular-nums">Page {d.page} of {d.totalPages}</span>
                    <Button size="sm" variant="ghost" onClick={() => d.setPage(Math.min(d.totalPages, d.page + 1))} disabled={d.page >= d.totalPages} aria-label="Next page" className={ghostSm}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Detail pane */}
          <div className={cn('min-w-0 flex-1', d.selectedId ? 'flex' : 'hidden lg:flex')}>
            {d.selectedId ? (
              <EmailDetailView
                email={d.selectedEmail}
                thread={d.thread}
                loading={d.detailLoading}
                error={d.detailError}
                sending={d.sending}
                onBack={d.closeDetail}
                onRetry={() => d.selectedId && d.selectEmail(d.selectedId)}
                onReply={() => d.openCompose(d.selectedEmail)}
                onToggleStar={d.toggleStar}
                onMarkUnread={d.markUnread}
                onSetSpam={d.setSpam}
                onDelete={(id) => d.requestDelete([id])}
                onUseAiDraft={d.useAiDraft}
                onEditAiDraft={d.editAiDraft}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                  <InboxIcon className="h-7 w-7 text-amber-600" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Pick an email to read it</p>
                <p className="mt-1 text-xs text-gray-500">The whole conversation shows on the right.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ComposeModal
        compose={d.compose}
        from={from}
        sending={d.sending}
        onField={d.setComposeField}
        onTemplate={d.applyComposeTemplate}
        onSend={d.handleSend}
        onClose={d.closeCompose}
        onDiscard={d.discardCompose}
      />

      <AlertDialog open={!!d.pendingDelete} onOpenChange={(open) => { if (!open) d.cancelDelete(); }}>
        <AlertDialogContent className="border-gray-200 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-navy">
              {d.pendingDelete && d.pendingDelete.length > 1 ? `Delete ${d.pendingDelete.length} emails?` : 'Delete this email?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500">
              It is removed from this inbox for good. The copy in the other person&apos;s mailbox is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-200 text-gray-600 hover:bg-gray-100">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); d.confirmDelete(); }} disabled={d.bulkActing} className="bg-red-600 text-white hover:bg-red-700">
              {d.bulkActing ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmEnable} onOpenChange={setConfirmEnable}>
        <AlertDialogContent className="border-gray-200 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-navy">Turn on AI auto-reply?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500">
              Incoming mail the AI is at least 85% sure is a mortgage, cost segregation, property, rate, loan status, scheduling or general question gets an AI-written reply sent automatically as {from}. Everything else still waits for you. You can turn this off at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-200 text-gray-600 hover:bg-gray-100">Not now</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await d.setAutoReply(true); setConfirmEnable(false); }} className="bg-navy text-white hover:bg-navy-light">
              Turn it on
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showAutoReplyInfo} onOpenChange={setShowAutoReplyInfo}>
        <DialogContent className="border-gray-200 bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-navy">About AI auto-reply</DialogTitle>
            <DialogDescription className="text-gray-500">What the assistant does on its own, and what always waits for you.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-relaxed text-gray-700">
            <p>
              Every incoming email is read by the AI, which writes a one-line summary and a suggested reply you can send or edit.
              With <strong className="text-gray-900">Auto-reply</strong> off (the default), nothing is sent without you.
            </p>
            <div>
              <p className="mb-1 font-semibold text-gray-900">With auto-reply on, the AI answers by itself for:</p>
              <ul className="ml-4 list-disc space-y-0.5 marker:text-amber-500">
                {AUTO_REPLY_CATEGORY_NAMES.map((c) => <li key={c}>{c}</li>)}
              </ul>
              <p className="mt-1.5 text-xs text-gray-500">Only when it is at least 85% confident, never twice in 24 hours to one person or thread, never to automated senders, and never with links outside bocabanker.com.</p>
            </div>
            <div>
              <p className="mb-1 font-semibold text-gray-900">Always waits for you:</p>
              <ul className="ml-4 list-disc space-y-0.5 marker:text-gray-400">
                {HELD_CATEGORY_NAMES.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Auto-replies are real emails to real people, sent as {from}.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

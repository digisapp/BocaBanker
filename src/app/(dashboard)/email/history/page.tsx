'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EmailLogEntry {
  id: string;
  toEmail: string;
  subject: string;
  template: string | null;
  status: 'sent' | 'delivered' | 'bounced' | 'failed';
  sentAt: string;
  clientFirstName: string | null;
  clientLastName: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  sent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  delivered: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  bounced: 'bg-red-500/20 text-red-400 border-red-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function EmailHistoryPage() {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchHistory();
  }, [page, statusFilter]);

  async function fetchHistory() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const res = await fetch(`/api/email/history?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch email history:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/email">
            <Button
              variant="ghost"
              size="icon"
              className="text-[#94A3B8] hover:text-white hover:bg-[#243654]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-bold text-gold-gradient">
              Email History
            </h1>
            <p className="text-sm text-[#94A3B8]">{total} total emails</p>
          </div>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px] bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent className="bg-[#1A2B45] border-[rgba(201,168,76,0.15)]">
            <SelectItem value="all" className="text-white hover:bg-[#243654] focus:bg-[#243654]">
              All Status
            </SelectItem>
            <SelectItem value="sent" className="text-white hover:bg-[#243654] focus:bg-[#243654]">
              Sent
            </SelectItem>
            <SelectItem value="delivered" className="text-white hover:bg-[#243654] focus:bg-[#243654]">
              Delivered
            </SelectItem>
            <SelectItem value="bounced" className="text-white hover:bg-[#243654] focus:bg-[#243654]">
              Bounced
            </SelectItem>
            <SelectItem value="failed" className="text-white hover:bg-[#243654] focus:bg-[#243654]">
              Failed
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#C9A84C]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <Mail className="h-12 w-12 text-[#64748B] mx-auto mb-3" />
            <p className="text-[#94A3B8]">No emails found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[rgba(201,168,76,0.15)] hover:bg-transparent">
                <TableHead className="text-[#C9A84C]">Date</TableHead>
                <TableHead className="text-[#C9A84C]">Recipient</TableHead>
                <TableHead className="text-[#C9A84C]">Subject</TableHead>
                <TableHead className="text-[#C9A84C]">Template</TableHead>
                <TableHead className="text-[#C9A84C]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow
                  key={log.id}
                  className="border-[rgba(201,168,76,0.08)] hover:bg-[#243654]/30"
                >
                  <TableCell className="text-[#94A3B8] text-sm whitespace-nowrap">
                    {formatDate(log.sentAt)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-white text-sm">{log.toEmail}</p>
                      {log.clientFirstName && (
                        <p className="text-xs text-[#64748B]">
                          {log.clientFirstName} {log.clientLastName}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-white text-sm max-w-[200px] truncate">
                    {log.subject}
                  </TableCell>
                  <TableCell className="text-[#94A3B8] text-sm capitalize">
                    {log.template ? log.template.replace('-', ' ') : '--'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`capitalize ${STATUS_COLORS[log.status] || ''}`}
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="border-[rgba(201,168,76,0.15)] text-[#94A3B8] hover:bg-[#243654] disabled:opacity-40"
          >
            Previous
          </Button>
          <span className="text-sm text-[#94A3B8]">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="border-[rgba(201,168,76,0.15)] text-[#94A3B8] hover:bg-[#243654] disabled:opacity-40"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
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
  sent: 'bg-blue-50 text-blue-600 border-blue-200',
  delivered: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  bounced: 'bg-red-50 text-red-600 border-red-200',
  failed: 'bg-red-50 text-red-600 border-red-200',
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
      logger.error('email-history-page', 'Failed to fetch email history', err);
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
              className="text-gray-500 hover:text-amber-600 hover:bg-amber-50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-bold text-amber-600">
              Email History
            </h1>
            <p className="text-sm text-gray-500">{total} total emails</p>
          </div>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px] bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all" className="text-gray-900 focus:bg-amber-50 focus:text-amber-700">
              All Status
            </SelectItem>
            <SelectItem value="sent" className="text-gray-900 focus:bg-amber-50 focus:text-amber-700">
              Sent
            </SelectItem>
            <SelectItem value="delivered" className="text-gray-900 focus:bg-amber-50 focus:text-amber-700">
              Delivered
            </SelectItem>
            <SelectItem value="bounced" className="text-gray-900 focus:bg-amber-50 focus:text-amber-700">
              Bounced
            </SelectItem>
            <SelectItem value="failed" className="text-gray-900 focus:bg-amber-50 focus:text-amber-700">
              Failed
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No emails found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 hover:bg-transparent">
                <TableHead className="text-amber-600">Date</TableHead>
                <TableHead className="text-amber-600">Recipient</TableHead>
                <TableHead className="text-amber-600">Subject</TableHead>
                <TableHead className="text-amber-600">Template</TableHead>
                <TableHead className="text-amber-600">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow
                  key={log.id}
                  className="border-gray-100 hover:bg-amber-50/50"
                >
                  <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                    {formatDate(log.sentAt)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-gray-900 text-sm">{log.toEmail}</p>
                      {log.clientFirstName && (
                        <p className="text-xs text-gray-400">
                          {log.clientFirstName} {log.clientLastName}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-900 text-sm max-w-[200px] truncate">
                    {log.subject}
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm capitalize">
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
            className="border-gray-200 text-gray-500 hover:bg-amber-50 disabled:opacity-40"
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="border-gray-200 text-gray-500 hover:bg-amber-50 disabled:opacity-40"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

'use client';

import { Mail, History } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import EmailComposer from '@/components/email/EmailComposer';
import BulkEmailModal from '@/components/email/BulkEmailModal';

export default function EmailPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient text-[#0F1B2D]">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-gold-gradient">
              Email Outreach
            </h1>
            <p className="text-sm text-[#94A3B8]">
              Compose and send emails to clients
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <BulkEmailModal />
          <Link href="/email/history">
            <Button
              variant="outline"
              className="border-[rgba(201,168,76,0.3)] text-[#C9A84C] hover:bg-[#243654]"
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          </Link>
        </div>
      </div>

      {/* Composer */}
      <div className="glass-card p-6">
        <EmailComposer />
      </div>
    </div>
  );
}

'use client';

import { Mail, History } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import EmailComposer from '@/components/email/EmailComposer';
import BulkEmailModal from '@/components/email/BulkEmailModal';
import { RoleGate } from '@/components/shared/RoleGate';

export default function EmailPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-amber-600">
              Email Outreach
            </h1>
            <p className="text-sm text-gray-500">
              Compose and send emails to clients
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RoleGate permission="canSendEmail">
            <BulkEmailModal />
          </RoleGate>
          <Link href="/email/history">
            <Button
              variant="outline"
              className="border-gray-200 text-amber-600 hover:bg-amber-50"
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          </Link>
        </div>
      </div>

      {/* Composer */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <RoleGate permission="canSendEmail">
          <EmailComposer />
        </RoleGate>
      </div>
    </div>
  );
}

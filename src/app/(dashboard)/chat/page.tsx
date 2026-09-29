'use client';

import { Suspense } from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { MessageSquare } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { useSearchParams } from 'next/navigation';

function ChatContent() {
  const searchParams = useSearchParams();
  const fromGuest = searchParams.get('from') === 'guest';

  return <ChatInterface initialGuestHandoff={fromGuest} />;
}

export default function ChatPage() {
  // Fill the dashboard <main> exactly (h-full, not h-screen) so the page
  // itself never scrolls; the message list is the only scroll area.
  return (
    <div className="flex flex-col h-full min-h-0 bg-[#FAFAF8] md:p-6">
      {/* Page Header (the Topbar already says "AI Chat" on mobile) */}
      <PageHeader
        icon={MessageSquare}
        title="Chat with Boca Banker"
        description="Your AI-powered banking, mortgage, and cost segregation advisor"
        className="hidden md:flex mb-4"
      />

      {/* Chat Interface */}
      <Suspense fallback={<div className="flex-1" />}>
        <ChatContent />
      </Suspense>
    </div>
  );
}

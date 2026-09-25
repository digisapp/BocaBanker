'use client';

import { Suspense } from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Landmark } from 'lucide-react';
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
      <div className="hidden md:flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
          <Landmark className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-serif font-bold text-amber-600">
            Chat with Boca Banker
          </h1>
          <p className="text-xs text-gray-500">
            Your AI-powered banking, mortgage, and cost segregation advisor
          </p>
        </div>
      </div>

      {/* Chat Interface */}
      <Suspense fallback={<div className="flex-1" />}>
        <ChatContent />
      </Suspense>
    </div>
  );
}

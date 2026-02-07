'use client';

import { ChatInterface } from '@/components/chat/ChatInterface';
import { Landmark } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen bg-[#FAFAF8] p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
          <Landmark className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-serif font-bold text-amber-600">
            Chat with Boca Banker
          </h1>
          <p className="text-xs text-gray-500">
            Your AI-powered cost segregation and tax strategy advisor
          </p>
        </div>
      </div>

      {/* Chat Interface */}
      <ChatInterface />
    </div>
  );
}

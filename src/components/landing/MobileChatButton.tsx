'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X } from 'lucide-react'
import GuestChatWidget from './GuestChatWidget'
import BocaBankerAvatar from './BocaBankerAvatar'

export default function MobileChatButton() {
  const [open, setOpen] = useState(false)

  // Lock body scroll when overlay is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="lg:hidden">
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/30 transition-transform hover:scale-105 active:scale-95 animate-bounce-subtle"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Fullscreen overlay */}
      <div
        className={`fixed inset-0 z-50 flex flex-col bg-white transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        {/* Header */}
        <div
          className="flex h-14 items-center justify-between border-b border-gray-100 bg-amber-50/50 px-4"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="flex items-center gap-2.5">
            <BocaBankerAvatar size={32} />
            <div>
              <p className="text-sm font-semibold text-gray-900">Boca Banker</p>
              <p className="text-[10px] text-green-500 flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                Online
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chat body — fills remaining height */}
        <div className="flex-1 min-h-0 overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {open && <GuestChatWidget />}
        </div>
      </div>
    </div>
  )
}

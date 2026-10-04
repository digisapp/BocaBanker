'use client'

import { useEffect, useState } from 'react'

const POLL_MS = 60_000

/**
 * Unread inbound mail, for the nav badge. Polls while the tab is visible;
 * the endpoint is admin-only, so non-admins just get 0.
 */
export function useUnreadEmailCount(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const res = await fetch('/api/email/inbox/unread')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && typeof data.count === 'number') setCount(data.count)
      } catch {
        /* badge is best-effort */
      }
    }
    load()
    const interval = setInterval(load, POLL_MS)
    document.addEventListener('visibilitychange', load)
    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', load)
    }
  }, [])

  return count
}

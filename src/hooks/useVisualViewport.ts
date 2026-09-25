'use client'

import { useSyncExternalStore } from 'react'

/**
 * The part of the page the user can actually see. iOS Safari doesn't resize
 * the layout viewport for the on-screen keyboard; it shrinks and pans the
 * visual viewport instead, so a `fixed inset-0` / `h-dvh` element ends up with
 * its bottom under the keyboard and its top scrolled off screen. Pinning such
 * an element to this box keeps it exactly above the keyboard.
 *
 * Returns null while disabled, where the API is missing, or while the user is
 * pinch-zoomed (the box shrinks with the zoom, which isn't a keyboard).
 */
export function useVisualViewport(enabled = true): { top: number; height: number } | null {
  const snapshot = useSyncExternalStore(enabled ? subscribe : subscribeNothing, getSnapshot, getServerSnapshot)
  if (!enabled || !snapshot) return null
  const [top, height] = snapshot.split(',').map(Number)
  return { top, height }
}

function subscribe(onChange: () => void) {
  const vv = window.visualViewport
  vv?.addEventListener('resize', onChange)
  vv?.addEventListener('scroll', onChange)
  return () => {
    vv?.removeEventListener('resize', onChange)
    vv?.removeEventListener('scroll', onChange)
  }
}

const subscribeNothing = () => () => {}

// A string snapshot, so unchanged values don't re-render
function getSnapshot() {
  const vv = window.visualViewport
  if (!vv || Math.abs(vv.scale - 1) > 0.01) return ''
  return `${vv.offsetTop},${vv.height}`
}

const getServerSnapshot = () => ''

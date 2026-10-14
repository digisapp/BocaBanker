import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { UIMessage } from "ai"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Parse a date string for display. Postgres `date` columns arrive as a bare
 * "YYYY-MM-DD", which `new Date()` reads as UTC midnight (the previous day
 * anywhere west of UTC, e.g. Florida). Read those as local midnight instead.
 * Full timestamps are parsed as-is.
 */
export function parseDate(value: string): Date {
  const m = DATE_ONLY.exec(value)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return new Date(value)
}

/**
 * Turn a user's file name into a Supabase Storage-safe key segment: strip
 * diacritics, replace anything outside [A-Za-z0-9._-] with '-', keep the
 * extension, cap the length. Store the original name separately for display.
 */
export function storageSafeFileName(name: string, maxLength = 100): string {
  const clean = (s: string) =>
    s
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')

  const dot = name.lastIndexOf('.')
  const ext = dot > 0 ? clean(name.slice(dot + 1)).slice(0, 10) : ''
  const stem = clean(dot > 0 ? name.slice(0, dot) : name)
    .slice(0, maxLength - (ext ? ext.length + 1 : 0))
    .replace(/[-.]+$/, '')
  return `${stem || 'file'}${ext ? `.${ext}` : ''}`
}

export function formatCurrency(
  value: number | string | null | undefined,
  fallback: string = '$0',
): string {
  if (value === null || value === undefined) return fallback
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return fallback
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export function getTextContent(message: UIMessage): string {
  if (message.parts) {
    return message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('');
  }
  return '';
}

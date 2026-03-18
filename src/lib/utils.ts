import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { UIMessage } from "ai"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

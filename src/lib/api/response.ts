import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'
import { firstIssueMessage } from '@/lib/validation/errors'

/**
 * Return a JSON success response.
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

/**
 * Return a JSON error response with shape { error: string }.
 */
export function apiError(message: string, status = 500): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Return a 400 validation error: `error` names the first offending field
 * ("zip: Please enter a valid ZIP code") so the UI can show it as-is, and
 * `details` carries every issue (flatten()).
 */
export function apiValidationError(zodError: ZodError): NextResponse {
  return NextResponse.json(
    { error: firstIssueMessage(zodError), details: zodError.flatten() },
    { status: 400 },
  )
}

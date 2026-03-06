import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'

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
 * Return a 400 validation error with flatten() details.
 */
export function apiValidationError(zodError: ZodError): NextResponse {
  return NextResponse.json(
    { error: 'Validation failed', details: zodError.flatten() },
    { status: 400 },
  )
}

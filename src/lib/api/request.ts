import { ApiError } from './auth'

/**
 * Parse a JSON request body. A malformed body is the caller's mistake, so it
 * becomes a 400 (an ApiError, which route catch blocks return as-is) instead
 * of falling through to the generic 500. Drop-in for `await request.json()`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readJson<T = any>(request: Request): Promise<T> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError('Invalid JSON body', 400)
  }
  // A literal `null` parses fine but crashes every `body.field` read
  if (body === null) throw new ApiError('Invalid JSON body', 400)
  return body as T
}

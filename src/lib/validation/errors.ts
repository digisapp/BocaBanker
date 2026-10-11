import type { ZodError } from 'zod'

/**
 * "zip: Please enter a valid ZIP code" — the first issue, readable enough to
 * show in the UI as-is (a bare "Validation failed" told the user nothing).
 * apiValidationError (src/lib/api/response.ts) uses this as its `error`.
 */
export function firstIssueMessage(error: ZodError): string {
  const issue = error.issues[0]
  if (!issue) return 'Validation failed'
  const path = issue.path.map(String).join('.')
  return path ? `${path}: ${issue.message}` : issue.message
}

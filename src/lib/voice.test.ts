import { describe, it, expect, afterEach, vi } from 'vitest'
import { requireVoiceAgent } from './voice'
import { ApiError } from '@/lib/api/auth'

vi.mock('@/lib/api/auth', () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number) {
      super(message)
    }
  },
}))

describe('requireVoiceAgent', () => {
  const original = process.env.SUPABASE_SERVICE_ROLE_KEY
  afterEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = original
  })

  const req = (auth?: string) =>
    new Request('https://bocabanker.com/api/voice/claim', {
      method: 'POST',
      headers: auth ? { authorization: auth } : {},
    })

  it('accepts the service-role key as a bearer token', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    expect(() => requireVoiceAgent(req('Bearer service-key'))).not.toThrow()
  })

  it('rejects a missing or wrong token', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    expect(() => requireVoiceAgent(req())).toThrow(ApiError)
    expect(() => requireVoiceAgent(req('Bearer nope'))).toThrow(ApiError)
    expect(() => requireVoiceAgent(req('service-key'))).toThrow(ApiError)
  })

  it('rejects everything when the key is not configured', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect(() => requireVoiceAgent(req('Bearer '))).toThrow(ApiError)
  })
})

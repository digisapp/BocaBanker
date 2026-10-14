import { describe, it, expect, vi } from 'vitest'
import { readJson } from './request'

vi.mock('./auth', () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number) {
      super(message)
    }
  },
}))

const post = (body: string) => new Request('https://bocabanker.com/api/x', { method: 'POST', body })

describe('readJson', () => {
  it('returns the parsed body', async () => {
    await expect(readJson(post('{"a":1}'))).resolves.toEqual({ a: 1 })
  })

  it.each(['{bad', '', 'null'])('turns %j into a 400', async (body) => {
    await expect(readJson(post(body))).rejects.toMatchObject({ status: 400, message: 'Invalid JSON body' })
  })
})

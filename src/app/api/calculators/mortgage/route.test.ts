import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const { POST } = await import('./route');

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/calculators/mortgage', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as never
  );
}

describe('POST /api/calculators/mortgage', () => {
  it('coerces numeric strings instead of returning zeros', async () => {
    const res = await post({ loanAmount: '300000', interestRate: '6.5', termYears: '30' });
    expect(res.status).toBe(200);
    expect((await res.json()).monthlyPI).toBe(1896.2);
  });

  it('rejects non-numeric input with 400', async () => {
    expect((await post({ loanAmount: 'abc', interestRate: 6.5, termYears: 30 })).status).toBe(400);
    expect((await post({ loanAmount: 300_000, interestRate: 'low', termYears: 30 })).status).toBe(400);
    expect((await post({ loanAmount: 300_000, interestRate: 6.5, termYears: 30, propertyTax: 'x' })).status).toBe(400);
    expect((await post({ loanAmount: 300_000, interestRate: 6.5, termYears: 30, insurance: -1 })).status).toBe(400);
  });
});

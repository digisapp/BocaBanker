import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const { POST } = await import('./route');

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/calculators/tax-savings', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as never
  );
}

describe('POST /api/calculators/tax-savings', () => {
  it('totalSavings is the peak cumulative savings, like the calculators', async () => {
    // $1M commercial, 37%, 100% bonus: year 1 is the peak at $90,223.58
    // (the final cumulative value nets to ~$0)
    const res = await post({ propertyValue: 1_000_000, propertyType: 'commercial', taxRate: 37 });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.firstYearSavings).toBe(90_223.58);
    expect(data.totalSavings).toBe(90_223.58);
    expect(Math.abs(data.schedule[data.schedule.length - 1].cumulativeSavings)).toBeLessThan(1);
  });

  it('coerces numeric strings', async () => {
    const res = await post({ propertyValue: '1000000', propertyType: 'commercial', taxRate: '37' });
    expect(res.status).toBe(200);
    expect((await res.json()).totalSavings).toBe(90_223.58);
  });

  it('rejects a tax rate outside 0-100 or non-numeric input', async () => {
    expect((await post({ propertyValue: 1_000_000, propertyType: 'commercial', taxRate: 137 })).status).toBe(400);
    expect((await post({ propertyValue: 1_000_000, propertyType: 'commercial', taxRate: 'high' })).status).toBe(400);
    expect((await post({ propertyValue: 'lots', propertyType: 'commercial' })).status).toBe(400);
    expect((await post({ propertyValue: 1_000_000, propertyType: 'commercial', bonusDepreciationRate: 'all' })).status).toBe(400);
  });
});

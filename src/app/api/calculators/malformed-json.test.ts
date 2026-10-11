import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const routes = {
  'bonus-depreciation': await import('./bonus-depreciation/route'),
  depreciation: await import('./depreciation/route'),
  mortgage: await import('./mortgage/route'),
  refinance: await import('./refinance/route'),
  'tax-savings': await import('./tax-savings/route'),
};

function post(name: keyof typeof routes, body: string) {
  return routes[name].POST(
    new Request(`http://localhost/api/calculators/${name}`, { method: 'POST', body }) as never
  );
}

describe('calculator routes reject bad JSON bodies with 400, not 500', () => {
  for (const name of Object.keys(routes) as (keyof typeof routes)[]) {
    it(`${name}: malformed JSON`, async () => {
      const res = await post(name, '{"costBasis": 100000,');
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Invalid JSON body');
    });

    it(`${name}: a JSON null body`, async () => {
      expect((await post(name, 'null')).status).toBe(400);
    });
  }
});

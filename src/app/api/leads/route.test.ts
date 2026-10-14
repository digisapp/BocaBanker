import { describe, it, expect, vi, beforeEach } from 'vitest';

// POST /api/leads and POST /api/leads/import with auth and the DB mocked.

const insertedValues: unknown[] = [];
vi.mock('@/db', () => ({
  db: {
    insert: () => ({
      values: (values: unknown) => {
        insertedValues.push(values);
        const result = Promise.resolve(undefined);
        return Object.assign(result, {
          returning: async () => [{ id: 'lead-1', ...(values as object) }],
        });
      },
    }),
  },
}));
vi.mock('@/lib/api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/auth')>()),
  requireAuth: async () => ({ id: 'user-1' }),
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const { POST: createLead } = await import('./route');
const { POST: importLeads } = await import('./import/route');

const post = (handler: (r: never) => Promise<Response>, body: unknown) =>
  handler(
    new Request('http://localhost/api/leads', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }) as never
  );

beforeEach(() => {
  insertedValues.length = 0;
});

describe('POST /api/leads', () => {
  const lead = { property_address: '1 Ocean Blvd', property_type: 'office' };

  it('creates a lead', async () => {
    const res = await post(createLead, { ...lead, status: 'qualified' });
    expect(res.status).toBe(201);
    expect(insertedValues).toHaveLength(1);
  });

  it('rejects status "converted" — only Convert to Client sets it', async () => {
    const res = await post(createLead, { ...lead, status: 'converted' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Convert to Client/);
    expect(insertedValues).toHaveLength(0);
  });

  it('names the failing field in validation errors', async () => {
    const res = await post(createLead, { ...lead, sale_date: '2026-02-30' });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('sale_date: Invalid date');
    expect(json.details.fieldErrors.sale_date).toBeDefined();
  });

  it('answers malformed JSON with 400, not 500', async () => {
    const res = await post(createLead, '{"property_address": ');
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid JSON body');
  });
});

describe('POST /api/leads/import', () => {
  it('reports "converted" rows as row errors and imports the rest', async () => {
    const res = await post(importLeads, {
      leads: [
        { property_address: '1 Ocean Blvd', status: 'qualified' },
        { property_address: '2 Palm Way', status: 'Converted' },
        { property_address: '3 Bay Rd' },
      ],
      mapping: {},
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.imported).toBe(2);
    expect(json.errors).toEqual([
      { row: 2, message: expect.stringMatching(/Convert to Client.*client instead/) },
    ]);
    const rows = insertedValues.flat() as { propertyAddress: string; status: string }[];
    expect(rows.map((r) => [r.propertyAddress, r.status])).toEqual([
      ['1 Ocean Blvd', 'qualified'],
      ['3 Bay Rd', 'new'],
    ]);
  });

  it('rejects malformed and null bodies with 400', async () => {
    expect((await post(importLeads, 'not json')).status).toBe(400);
    expect((await post(importLeads, 'null')).status).toBe(400);
  });
});

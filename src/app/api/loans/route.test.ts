import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// POST /api/loans and PUT /api/loans/[id] with auth and the DB mocked:
// moving a loan into funded/closed records an actual closing date.

const LOAN_ID = '3f2b7c1e-8a4d-4f6b-9c2e-1a2b3c4d5e6f';
let existingLoan: Record<string, unknown> | undefined;
let written: Record<string, unknown> | undefined;

vi.mock('@/db', () => ({
  db: {
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        written = values;
        return { returning: async () => [{ id: LOAN_ID, ...values }] };
      },
    }),
    select: () => ({
      from: () => ({ where: async () => (existingLoan ? [existingLoan] : []) }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        written = values;
        return { where: () => ({ returning: async () => [{ ...existingLoan, ...values }] }) };
      },
    }),
  },
}));
vi.mock('@/lib/api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/auth')>()),
  requireAuth: async () => ({ id: 'user-1' }),
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const { POST } = await import('./route');
const { PUT } = await import('./[id]/route');

const json = (body: unknown) => ({
  method: 'POST',
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const create = (body: unknown) =>
  POST(new Request('http://localhost/api/loans', json(body)) as never);
const update = (body: unknown) =>
  PUT(
    new Request(`http://localhost/api/loans/${LOAN_ID}`, { ...json(body), method: 'PUT' }) as never,
    { params: Promise.resolve({ id: LOAN_ID }) }
  );

const newLoan = {
  borrower_name: 'Ann Lee',
  property_address: '1 Ocean Blvd',
  loan_amount: 400_000,
  loan_type: 'conventional',
};

beforeEach(() => {
  // 9pm Eastern on Oct 31 — already Nov 1 in UTC
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-01T01:00:00Z'));
  written = undefined;
  existingLoan = {
    id: LOAN_ID,
    status: 'clear_to_close',
    actualClosingDate: null,
    loanAmount: '400000',
    commissionBps: 100,
  };
});

afterEach(() => {
  vi.useRealTimers();
});

describe('POST /api/loans', () => {
  it("records today's Eastern date for a loan created as funded/closed", async () => {
    expect((await create({ ...newLoan, status: 'funded' })).status).toBe(201);
    expect(written?.actualClosingDate).toBe('2026-10-31');

    await create({ ...newLoan, status: 'closed', actual_closing_date: '' });
    expect(written?.actualClosingDate).toBe('2026-10-31');
  });

  it('keeps a given closing date, and leaves open loans undated', async () => {
    await create({ ...newLoan, status: 'funded', actual_closing_date: '2026-10-15' });
    expect(written?.actualClosingDate).toBe('2026-10-15');

    await create({ ...newLoan, status: 'processing' });
    expect(written?.actualClosingDate).toBeNull();
  });

  it('answers malformed JSON with 400', async () => {
    const res = await create('{');
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid JSON body');
  });
});

describe('PUT /api/loans/[id]', () => {
  it('records today when the status moves to funded with no date (edit form sends null)', async () => {
    const res = await update({ status: 'funded', actualClosingDate: null });
    expect(res.status).toBe(200);
    expect(written?.actualClosingDate).toBe('2026-10-31');
    expect((await res.json()).actualClosingDate).toBe('2026-10-31');
  });

  it('never overwrites a date on file or in the request', async () => {
    existingLoan = { ...existingLoan, actualClosingDate: '2026-10-20' };
    await update({ status: 'closed' });
    expect(written).not.toHaveProperty('actualClosingDate');

    existingLoan = { ...existingLoan, actualClosingDate: null };
    await update({ status: 'funded', actual_closing_date: '2026-10-29' });
    expect(written?.actualClosingDate).toBe('2026-10-29');
  });

  it("doesn't date an already funded loan on an unrelated edit", async () => {
    existingLoan = { ...existingLoan, status: 'funded' };
    await update({ status: 'funded', notes: 'called borrower' });
    expect(written).not.toHaveProperty('actualClosingDate');
  });

  it('names the failing field in validation errors', async () => {
    const res = await update({ status: 'done' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/^status: /);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { costSegStudies, properties, clients, studyAssets } from '@/db/schema';

// /api/studies routes with auth and the DB mocked: bad JSON is a 400, and the
// mid-quarter convention flag is stored and used by the calculation.

const STUDY_ID = '3f2b7c1e-8a4d-4f6b-9c2e-1a2b3c4d5e6f';
const PROPERTY_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const CLIENT_ID = '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b';

let rowsByTable: Map<unknown, Record<string, unknown>[]>;
let inserted: Map<unknown, unknown>;
let updated: Record<string, unknown> | undefined;

// select().from(table).where() is awaitable directly or via .limit()
const rows = (table: unknown) => {
  const found = rowsByTable.get(table) ?? [];
  return Object.assign(Promise.resolve(found), { limit: async () => found });
};

vi.mock('@/db', () => {
  const insert = (table: unknown) => ({
    values: (values: unknown) => {
      inserted.set(table, values);
      return Object.assign(Promise.resolve(), {
        returning: async () => [{ id: STUDY_ID, ...(values as object) }],
      });
    },
  });
  return {
    db: {
      select: () => ({
        from: (table: unknown) => ({ where: () => rows(table) }),
      }),
      transaction: async (fn: (tx: unknown) => unknown) => fn({ insert }),
      update: () => ({
        set: (values: Record<string, unknown>) => {
          updated = values;
          return { where: () => ({ returning: async () => [{ id: STUDY_ID, ...values }] }) };
        },
      }),
    },
  };
});
vi.mock('@/lib/api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/auth')>()),
  requireAuth: async () => ({ id: 'user-1' }),
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const { POST: createStudy } = await import('./route');
const { PUT: updateStudy } = await import('./[id]/route');
const { POST: calculateStudy } = await import('./[id]/calculate/route');

const params = { params: Promise.resolve({ id: STUDY_ID }) };
const create = (body: string) =>
  createStudy(new Request('http://localhost/api/studies', { method: 'POST', body }) as never);
const update = (body: string) =>
  updateStudy(
    new Request(`http://localhost/api/studies/${STUDY_ID}`, { method: 'PUT', body }) as never,
    params
  );
const calculate = () =>
  calculateStudy(
    new Request(`http://localhost/api/studies/${STUDY_ID}/calculate`, { method: 'POST' }) as never,
    params
  );

const newStudy = {
  study_name: 'Test',
  property_id: PROPERTY_ID,
  client_id: CLIENT_ID,
  tax_rate: 37,
  discount_rate: 5,
  bonus_depreciation_rate: 0,
  study_year: 2025,
};

beforeEach(() => {
  inserted = new Map();
  updated = undefined;
  rowsByTable = new Map<unknown, Record<string, unknown>[]>([
    [properties, [{
      id: PROPERTY_ID,
      address: '1 Ocean Blvd',
      propertyType: 'commercial',
      purchasePrice: '1000000',
      buildingValue: null,
      landValue: null,
      purchaseDate: '2025-11-03',
    }]],
    [clients, [{ id: CLIENT_ID }]],
    [costSegStudies, [{
      id: STUDY_ID,
      propertyId: PROPERTY_ID,
      studyYear: 2025,
      taxRate: '37',
      discountRate: '5',
      bonusDepreciationRate: '0',
      midQuarterConvention: false,
    }]],
    [studyAssets, [
      { assetCategory: 'personal_property_5yr', costBasis: '100000', recoveryPeriod: 5 },
      { assetCategory: 'building_39yr', costBasis: '700000', recoveryPeriod: 39 },
    ]],
  ]);
});

describe('malformed JSON', () => {
  it('POST /api/studies returns 400', async () => {
    const res = await create('{"study_name": ');
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid JSON body');
  });

  it('PUT /api/studies/[id] returns 400', async () => {
    const res = await update('not json');
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid JSON body');
  });

  it('a JSON null body is a 400, not a 500', async () => {
    expect((await create('null')).status).toBe(400);
    expect((await update('null')).status).toBe(400);
  });
});

describe('mid-quarter convention flag', () => {
  it('defaults to off when creating a study', async () => {
    expect((await create(JSON.stringify(newStudy))).status).toBe(201);
    expect(inserted.get(costSegStudies)).toMatchObject({ midQuarterConvention: false });
  });

  it('is stored when opted in', async () => {
    const res = await create(JSON.stringify({ ...newStudy, mid_quarter_convention: true }));
    expect(res.status).toBe(201);
    expect(inserted.get(costSegStudies)).toMatchObject({ midQuarterConvention: true });
  });

  it('must be a boolean', async () => {
    expect((await create(JSON.stringify({ ...newStudy, mid_quarter_convention: 'yes' }))).status).toBe(400);
    expect((await update(JSON.stringify({ mid_quarter_convention: 'yes' }))).status).toBe(400);
  });

  it('can be changed with PUT (and is left alone when omitted)', async () => {
    expect((await update(JSON.stringify({ mid_quarter_convention: true }))).status).toBe(200);
    expect(updated).toMatchObject({ midQuarterConvention: true });
    await update(JSON.stringify({ study_name: 'Renamed' }));
    expect(updated).not.toHaveProperty('midQuarterConvention');
  });

  it('calculate uses the Q4 table for a November purchase when on', async () => {
    const off = await (await calculate()).json();
    expect(off.report.assumptions).toEqual({
      placedInServiceYear: 2025,
      placedInServiceMonth: 11,
      placedInServiceQuarter: 4,
      midQuarterConvention: false,
    });

    rowsByTable.get(costSegStudies)![0].midQuarterConvention = true;
    const on = await (await calculate()).json();
    expect(on.report.assumptions.midQuarterConvention).toBe(true);
    // $100k 5-year, no bonus: 5% (Q4) instead of 20% (half-year) in year 1;
    // the $700k building is on mid-month either way
    expect(off.report.firstYearAnalysis.regularFirstYear - on.report.firstYearAnalysis.regularFirstYear)
      .toBeCloseTo(15_000, 2);
  });
});

import { describe, it, expect } from 'vitest';
import { readNumber } from './numbers';

describe('readNumber', () => {
  it('passes finite numbers through and coerces numeric strings', () => {
    expect(readNumber(300_000)).toBe(300_000);
    expect(readNumber('300000')).toBe(300_000);
    expect(readNumber(' 6.5 ')).toBe(6.5);
    expect(readNumber(0)).toBe(0);
  });

  it('missing fields use the fallback', () => {
    expect(readNumber(undefined, 37)).toBe(37);
    expect(readNumber(null, 0)).toBe(0);
    expect(readNumber('', 5)).toBe(5);
    expect(readNumber(undefined)).toBeNaN();
  });

  it('anything else is NaN, so range checks reject it', () => {
    for (const bad of ['abc', '12abc', '  ', true, {}, [], NaN, Infinity, -Infinity]) {
      expect(readNumber(bad, 1)).toBeNaN();
    }
  });
});

import { describe, it, expect } from 'vitest';
import {
  validateTemperature, isFever, consecutiveFeverFreeDays,
  isDischargeEligible, hasRoutineEntryToday,
} from './clinical';
import { FEVER_THRESHOLD, FEVER_FREE_DAYS_REQUIRED, MIN_TEMP, MAX_TEMP } from '../data/seedData';
import type { TemperatureRecord } from '../types';

// Build a record helper that pins dates so "today" logic is deterministic.
const today = new Date();
function dayKey(offset: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - offset);
  return d.toISOString().split('T')[0];
}
function rec(patientId: string, temp: number, dayOffset: number, hour = 8): TemperatureRecord {
  const d = new Date(today);
  d.setDate(d.getDate() - dayOffset);
  d.setHours(hour, 0, 0, 0);
  return {
    id: `t-${patientId}-${dayOffset}-${hour}`,
    patientId,
    temperature: temp,
    recordedAt: d.toISOString(),
    recordedBy: 'u3',
    recordedByName: 'Test Nurse',
  };
}

describe('validateTemperature', () => {
  it('accepts a normal temperature', () => {
    expect(validateTemperature(37.0)).toBeNull();
  });
  it('accepts the exact fever threshold', () => {
    expect(validateTemperature(FEVER_THRESHOLD)).toBeNull();
  });
  it('rejects values below the minimum', () => {
    expect(validateTemperature(MIN_TEMP - 0.1)).toContain('at least');
  });
  it('rejects values above the maximum', () => {
    expect(validateTemperature(MAX_TEMP + 0.1)).toContain('at most');
  });
  it('rejects NaN', () => {
    expect(validateTemperature(NaN)).toContain('number');
  });
});

describe('isFever', () => {
  it('flags the fever threshold as a fever', () => {
    expect(isFever(FEVER_THRESHOLD)).toBe(true);
  });
  it('does not flag a normal temperature', () => {
    expect(isFever(37.0)).toBe(false);
  });
  it('flags a high temperature', () => {
    expect(isFever(39.5)).toBe(true);
  });
});

describe('consecutiveFeverFreeDays', () => {
  it('returns 0 when there are no readings', () => {
    expect(consecutiveFeverFreeDays([], 'p1')).toBe(0);
  });
  it('counts consecutive fever-free days backwards', () => {
    const records = [
      rec('p1', 36.8, 0),
      rec('p1', 36.9, 1),
      rec('p1', 37.0, 2),
      rec('p1', 39.0, 3), // fever resets
      rec('p1', 38.5, 4),
    ];
    expect(consecutiveFeverFreeDays(records, 'p1')).toBe(3);
  });
  it('resets the sequence when a fever is recorded', () => {
    const records = [
      rec('p1', 39.0, 0), // fever today
      rec('p1', 36.8, 1),
      rec('p1', 36.9, 2),
    ];
    expect(consecutiveFeverFreeDays(records, 'p1')).toBe(0);
  });
  it('uses the max temperature per day when multiple readings exist', () => {
    const records = [
      rec('p1', 36.8, 0),
      rec('p1', 39.5, 0, 14), // same day, fever — max for the day is a fever
      rec('p1', 36.9, 1),
      rec('p1', 37.0, 2),
    ];
    // Because today's max (39.5) is a fever, the streak resets to 0.
    // This proves we use the day's max, not its first/min reading (which
    // would wrongly make today look fever-free and yield 3).
    expect(consecutiveFeverFreeDays(records, 'p1')).toBe(0);
  });
});

describe('isDischargeEligible', () => {
  it('is eligible when fever-free days meet the criterion', () => {
    const records = [
      rec('p1', 36.8, 0),
      rec('p1', 36.9, 1),
      rec('p1', 37.0, 2),
    ];
    expect(isDischargeEligible(records, 'p1')).toBe(true);
  });
  it('is not eligible when one day short', () => {
    const records = [
      rec('p1', 36.8, 0),
      rec('p1', 36.9, 1),
      // missing day 2
    ];
    expect(isDischargeEligible(records, 'p1')).toBe(false);
  });
  it('is not eligible when missing data leaves gaps (no fabricated fever-free days)', () => {
    // Only one reading on day 2, nothing on days 0 and 1
    const records = [rec('p1', 36.8, 2)];
    expect(isDischargeEligible(records, 'p1')).toBe(false);
  });
  it(`requires ${FEVER_FREE_DAYS_REQUIRED} consecutive fever-free days`, () => {
    const records = [
      rec('p1', 36.8, 0),
      rec('p1', 39.0, 1), // fever breaks the chain
      rec('p1', 36.9, 2),
      rec('p1', 37.0, 3),
      rec('p1', 36.7, 4),
    ];
    // From today (day 0) backwards: 36.8 (ok), then 39.0 (fever) -> count = 1
    expect(consecutiveFeverFreeDays(records, 'p1')).toBe(1);
    expect(isDischargeEligible(records, 'p1')).toBe(false);
  });
});

describe('hasRoutineEntryToday', () => {
  it('detects an entry recorded today', () => {
    const records = [rec('p1', 37.0, 0)];
    expect(hasRoutineEntryToday(records, 'p1')).toBe(true);
  });
  it('returns false when only yesterday has a reading', () => {
    const records = [rec('p1', 37.0, 1)];
    expect(hasRoutineEntryToday(records, 'p1')).toBe(false);
  });
  it('ignores readings for other patients', () => {
    const records = [rec('p2', 37.0, 0)];
    expect(hasRoutineEntryToday(records, 'p1')).toBe(false);
  });
});

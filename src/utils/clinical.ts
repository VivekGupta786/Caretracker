import { FEVER_THRESHOLD, FEVER_FREE_DAYS_REQUIRED, MIN_TEMP, MAX_TEMP } from '../data/seedData';
import type { TemperatureRecord } from '../types';

/**
 * Validate a temperature reading.
 * Returns an error string if invalid, or null if valid.
 */
export function validateTemperature(temp: number): string | null {
  if (isNaN(temp)) return 'Temperature must be a number';
  if (temp < MIN_TEMP) return `Temperature must be at least ${MIN_TEMP}°C`;
  if (temp > MAX_TEMP) return `Temperature must be at most ${MAX_TEMP}°C`;
  return null;
}

/**
 * Determine whether a temperature constitutes a fever.
 */
export function isFever(temp: number): boolean {
  return temp >= FEVER_THRESHOLD;
}

/**
 * Get today's date string (YYYY-MM-DD).
 */
export function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Find the most recent temperature recorded today for a patient.
 */
export function getTodayReading(records: TemperatureRecord[], patientId: string): TemperatureRecord | undefined {
  const today = todayKey();
  return records
    .filter(t => t.patientId === patientId && t.recordedAt.startsWith(today))
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
}

/**
 * Check whether a routine daily entry already exists for a patient today.
 * (Server-side / database constraint equivalent in demo mode.)
 */
export function hasRoutineEntryToday(records: TemperatureRecord[], patientId: string): boolean {
  return !!getTodayReading(records, patientId);
}

/**
 * Count consecutive fever-free days from the most recent observation
 * backwards. A day counts only if it has at least one valid reading whose
 * max temperature is below the fever threshold. Missing data does NOT count.
 * The sequence resets when a qualifying fever is encountered.
 */
export function consecutiveFeverFreeDays(records: TemperatureRecord[], patientId: string): number {
  const patientRecords = records.filter(t => t.patientId === patientId);
  if (patientRecords.length === 0) return 0;

  // Group by date, keep the max temperature per day
  const byDate: Record<string, number> = {};
  patientRecords.forEach(t => {
    const day = t.recordedAt.split('T')[0];
    byDate[day] = Math.max(byDate[day] ?? -Infinity, t.temperature);
  });

  // Sort dates newest-first and count backwards until a fever day
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  let count = 0;
  for (const date of sortedDates) {
    if (byDate[date] < FEVER_THRESHOLD) count++;
    else break; // fever resets the sequence
  }
  return count;
}

/**
 * Determine discharge eligibility based on the facility's 3-day
 * fever-free criterion. Missing data never counts as a fever-free day.
 */
export function isDischargeEligible(records: TemperatureRecord[], patientId: string): boolean {
  return consecutiveFeverFreeDays(records, patientId) >= FEVER_FREE_DAYS_REQUIRED;
}

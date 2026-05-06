import { describe, expect, it } from 'vitest';
import {
  getTurkeyDateKey,
  isWithinTurkeyScheduleWindow,
} from '../src/scheduled-publish.js';

describe('scheduled publish timing', () => {
  it('uses the Turkey calendar date for the daily marker', () => {
    expect(getTurkeyDateKey(new Date('2026-05-06T09:30:00Z'))).toBe(
      '2026-05-06',
    );
  });

  it('accepts the configured 12:30 Turkey start time', () => {
    expect(isWithinTurkeyScheduleWindow(new Date('2026-05-06T09:30:00Z'))).toBe(
      true,
    );
  });

  it('rejects times before the Turkey schedule window', () => {
    expect(isWithinTurkeyScheduleWindow(new Date('2026-05-06T09:20:00Z'))).toBe(
      false,
    );
  });

  it('rejects times after the Turkey schedule window closes', () => {
    expect(isWithinTurkeyScheduleWindow(new Date('2026-05-06T09:55:00Z'))).toBe(
      false,
    );
  });
});

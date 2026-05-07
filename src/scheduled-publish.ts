import { settings } from './config.js';
import { runPipeline } from './pipeline.js';
import {
  hasScheduledPublishMarker,
  writeScheduledPublishMarker,
} from './storage.js';
import type { InstagramDraft } from './types.js';

const TURKEY_TIMEZONE = 'Europe/Istanbul';

function getTurkeyDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TURKEY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  };
}

export function getTurkeyDateKey(date: Date): string {
  const { year, month, day } = getTurkeyDateParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isWithinTurkeyScheduleWindow(date: Date): boolean {
  const { hour, minute } = getTurkeyDateParts(date);
  const currentMinutes = hour * 60 + minute;
  const targetMinutes =
    settings.scheduleTargetHourTr * 60 + settings.scheduleTargetMinuteTr;
  return currentMinutes >= targetMinutes;
}

export interface ScheduledPublishResult {
  skipped: boolean;
  reason?: 'outside_window' | 'already_published_today';
  dateKey: string;
  draft?: InstagramDraft;
}

export async function runScheduledPublish(
  now = new Date(),
): Promise<ScheduledPublishResult> {
  const dateKey = getTurkeyDateKey(now);

  if (!isWithinTurkeyScheduleWindow(now)) {
    return {
      skipped: true,
      reason: 'outside_window',
      dateKey,
    };
  }

  if (await hasScheduledPublishMarker(dateKey)) {
    return {
      skipped: true,
      reason: 'already_published_today',
      dateKey,
    };
  }

  const draft = await runPipeline(true);
  await writeScheduledPublishMarker(dateKey, {
    dateKey,
    mediaId: draft.publish.mediaId ?? null,
    promptId: draft.prompt.id,
    publishedAt: now.toISOString(),
  });

  return {
    skipped: false,
    dateKey,
    draft,
  };
}

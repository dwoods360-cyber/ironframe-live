/**
 * Inbound GTM SLA clock — America/Chicago, Mon–Fri 09:00–17:00,
 * excluding US federal holidays (and weekend observances).
 */

export const INBOUND_SLA_TIME_ZONE = "America/Chicago" as const;
export const INBOUND_SLA_OPEN_HOUR = 9 as const;
export const INBOUND_SLA_CLOSE_HOUR = 17 as const;

/** Prospect-facing window label (handles CST/CDT). */
export const INBOUND_SLA_WINDOW_LABEL =
  "9:00 AM – 5:00 PM Central Time (CST/CDT), Mon–Fri (no weekends or US federal holidays)" as const;

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0=Sun … 6=Sat
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function zonedParts(date: Date, timeZone: string = INBOUND_SLA_TIME_ZONE): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: weekdayMap[map.weekday ?? ""] ?? 0,
  };
}

/** Instant for y-m-d H:M:S in America/Chicago (binary search vs UTC). */
export function chicagoWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  second = 0,
): Date {
  let lo = Date.UTC(year, month - 1, day, hour + 5, minute, second) - 6 * 3600_000;
  let hi = Date.UTC(year, month - 1, day, hour + 5, minute, second) + 6 * 3600_000;
  const target = `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
  for (let i = 0; i < 48; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const p = zonedParts(new Date(mid));
    const got = `${p.year}-${pad2(p.month)}-${pad2(p.day)} ${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`;
    if (got === target) return new Date(mid);
    if (got < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return new Date(Math.floor((lo + hi) / 2));
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): number {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (dt.getUTCMonth() !== month - 1) break;
    if (dt.getUTCDay() === weekday) {
      count += 1;
      if (count === n) return day;
    }
  }
  return 1;
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): number {
  for (let day = 31; day >= 1; day--) {
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (dt.getUTCMonth() !== month - 1) continue;
    if (dt.getUTCDay() === weekday) return day;
  }
  return 1;
}

/** Observe Sat→Fri, Sun→Mon (US federal). */
function observedFixed(year: number, month: number, day: number): { month: number; day: number } {
  const wd = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  if (wd === 6) {
    const prev = new Date(Date.UTC(year, month - 1, day - 1));
    return { month: prev.getUTCMonth() + 1, day: prev.getUTCDate() };
  }
  if (wd === 0) {
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    return { month: next.getUTCMonth() + 1, day: next.getUTCDate() };
  }
  return { month, day };
}

function usFederalHolidaySet(year: number): Set<string> {
  const keys = new Set<string>();
  const add = (month: number, day: number) => keys.add(`${year}-${pad2(month)}-${pad2(day)}`);

  const ny = observedFixed(year, 1, 1);
  add(ny.month, ny.day);
  add(1, nthWeekdayOfMonth(year, 1, 1, 3)); // MLK
  add(2, nthWeekdayOfMonth(year, 2, 1, 3)); // Presidents
  add(5, lastWeekdayOfMonth(year, 5, 1)); // Memorial
  const jun = observedFixed(year, 6, 19);
  add(jun.month, jun.day);
  const jul = observedFixed(year, 7, 4);
  add(jul.month, jul.day);
  add(9, nthWeekdayOfMonth(year, 9, 1, 1)); // Labor
  add(10, nthWeekdayOfMonth(year, 10, 1, 2)); // Columbus / Indigenous Peoples'
  const vet = observedFixed(year, 11, 11);
  add(vet.month, vet.day);
  add(11, nthWeekdayOfMonth(year, 11, 4, 4)); // Thanksgiving
  const xmas = observedFixed(year, 12, 25);
  add(xmas.month, xmas.day);

  return keys;
}

const holidayCache = new Map<number, Set<string>>();

function holidayKeysForYear(year: number): Set<string> {
  let set = holidayCache.get(year);
  if (!set) {
    set = usFederalHolidaySet(year);
    holidayCache.set(year, set);
  }
  return set;
}

export function isUsFederalHolidayChicago(date: Date): boolean {
  const p = zonedParts(date);
  return holidayKeysForYear(p.year).has(`${p.year}-${pad2(p.month)}-${pad2(p.day)}`);
}

export function isCentralBusinessDay(date: Date): boolean {
  const p = zonedParts(date);
  if (p.weekday === 0 || p.weekday === 6) return false;
  return !isUsFederalHolidayChicago(date);
}

/** True when Chicago wall clock is Mon–Fri 09:00–16:59:59 on a business day. */
export function isCentralBusinessOpen(date: Date = new Date()): boolean {
  if (!isCentralBusinessDay(date)) return false;
  const p = zonedParts(date);
  const minutes = p.hour * 60 + p.minute;
  return minutes >= INBOUND_SLA_OPEN_HOUR * 60 && minutes < INBOUND_SLA_CLOSE_HOUR * 60;
}

function startOfChicagoDay(date: Date): Date {
  const p = zonedParts(date);
  return chicagoWallTimeToUtc(p.year, p.month, p.day, 0, 0, 0);
}

function addChicagoCalendarDays(date: Date, days: number): Date {
  const p = zonedParts(date);
  const utcNoon = Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0) + days * 86400_000;
  const shifted = new Date(utcNoon);
  const sp = zonedParts(shifted);
  return chicagoWallTimeToUtc(sp.year, sp.month, sp.day, 0, 0, 0);
}

/** Next 09:00 Central on a business day (or same-day open if currently before open). */
export function nextCentralBusinessOpen(date: Date = new Date()): Date {
  let cursor = startOfChicagoDay(date);
  for (let i = 0; i < 400; i++) {
    const open = chicagoWallTimeToUtc(
      zonedParts(cursor).year,
      zonedParts(cursor).month,
      zonedParts(cursor).day,
      INBOUND_SLA_OPEN_HOUR,
      0,
      0,
    );
    const close = chicagoWallTimeToUtc(
      zonedParts(cursor).year,
      zonedParts(cursor).month,
      zonedParts(cursor).day,
      INBOUND_SLA_CLOSE_HOUR,
      0,
      0,
    );
    if (isCentralBusinessDay(open)) {
      if (date.getTime() < open.getTime()) return open;
      if (date.getTime() < close.getTime()) return date;
    }
    cursor = addChicagoCalendarDays(cursor, 1);
  }
  return date;
}

/**
 * Business milliseconds between `from` and `to` on the Central SLA clock.
 * Off-hours / weekends / holidays do not accumulate.
 */
export function businessMillisecondsElapsed(from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 0;
  let elapsed = 0;
  let cursor = new Date(from.getTime());
  let guard = 0;
  while (cursor.getTime() < to.getTime() && guard < 50_000) {
    guard += 1;
    if (!isCentralBusinessOpen(cursor)) {
      const next = nextCentralBusinessOpen(cursor);
      if (next.getTime() <= cursor.getTime()) {
        cursor = new Date(cursor.getTime() + 60_000);
        continue;
      }
      cursor = next;
      continue;
    }
    const p = zonedParts(cursor);
    const close = chicagoWallTimeToUtc(p.year, p.month, p.day, INBOUND_SLA_CLOSE_HOUR, 0, 0);
    const sliceEnd = Math.min(to.getTime(), close.getTime());
    elapsed += Math.max(0, sliceEnd - cursor.getTime());
    cursor = new Date(sliceEnd);
    if (cursor.getTime() < to.getTime() && cursor.getTime() >= close.getTime()) {
      cursor = nextCentralBusinessOpen(new Date(close.getTime() + 1000));
    }
  }
  return elapsed;
}

/** Add `ms` of Central business time to `from` (pause/resume across off-hours). */
export function addBusinessMilliseconds(from: Date, ms: number): Date {
  if (ms <= 0) return new Date(from.getTime());
  let remaining = ms;
  let cursor = nextCentralBusinessOpen(from);
  let guard = 0;
  while (remaining > 0 && guard < 50_000) {
    guard += 1;
    const p = zonedParts(cursor);
    const close = chicagoWallTimeToUtc(p.year, p.month, p.day, INBOUND_SLA_CLOSE_HOUR, 0, 0);
    const available = close.getTime() - cursor.getTime();
    if (available <= 0) {
      cursor = nextCentralBusinessOpen(new Date(close.getTime() + 1000));
      continue;
    }
    if (remaining <= available) {
      return new Date(cursor.getTime() + remaining);
    }
    remaining -= available;
    cursor = nextCentralBusinessOpen(new Date(close.getTime() + 1000));
  }
  return cursor;
}

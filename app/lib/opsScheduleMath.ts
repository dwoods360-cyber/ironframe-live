export type ReminderMilestone = "t3" | "t2" | "t1" | "t0";

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Whole UTC calendar days from today to due date (negative = overdue). */
export function calendarDaysUntilDue(dueAt: Date, now = new Date()): number {
  const dueDay = startOfUtcDay(dueAt).getTime();
  const today = startOfUtcDay(now).getTime();
  return Math.round((dueDay - today) / 86_400_000);
}

export function parseRemindersSent(raw: unknown): Partial<Record<ReminderMilestone, string>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Partial<Record<ReminderMilestone, string>> = {};
  for (const key of ["t3", "t2", "t1", "t0"] as const) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) out[key] = value;
  }
  return out;
}

export function milestoneForDaysUntil(daysUntil: number): ReminderMilestone | null {
  if (daysUntil === 3) return "t3";
  if (daysUntil === 2) return "t2";
  if (daysUntil === 1) return "t1";
  if (daysUntil === 0) return "t0";
  return null;
}

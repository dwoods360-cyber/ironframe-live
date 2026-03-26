/** Localized display of stored UTC instants (DB unchanged). Uses the viewer's locale & timezone. */
const AUDIT_DISPLAY_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
};

export function formatAuditTimestampForDisplay(isoOrDate: string | Date | number): string {
  const d =
    typeof isoOrDate === "number"
      ? new Date(isoOrDate)
      : typeof isoOrDate === "string"
        ? new Date(isoOrDate)
        : isoOrDate;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, AUDIT_DISPLAY_OPTIONS);
}

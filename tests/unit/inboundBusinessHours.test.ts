import { describe, expect, it } from "vitest";

import {
  addBusinessMilliseconds,
  businessMillisecondsElapsed,
  chicagoWallTimeToUtc,
  isCentralBusinessOpen,
  isUsFederalHolidayChicago,
  nextCentralBusinessOpen,
} from "@/lib/gtm/inboundBusinessHours";
import { buildInboundT1AckEmail, buildInboundT3HoldEmail } from "@/lib/gtm/inboundSlaCopy";
import {
  INBOUND_LEAD_REPLY_SLA_HOURS,
  inboundLeadSuccessCopy,
  isInboundSlaT1AckEnabled,
  isInboundSlaT3AutosendEnabled,
} from "@/config/commercialGates";

describe("inbound Central business hours", () => {
  it("treats Independence Day 2026 (observed Fri Jul 3) as holiday", () => {
    // Jul 4 2026 is Saturday → observed Friday Jul 3
    const fri = chicagoWallTimeToUtc(2026, 7, 3, 12, 0, 0);
    expect(isUsFederalHolidayChicago(fri)).toBe(true);
    const thu = chicagoWallTimeToUtc(2026, 7, 2, 12, 0, 0);
    expect(isUsFederalHolidayChicago(thu)).toBe(false);
  });

  it("pauses weekend elapsed time", () => {
    const friClose = chicagoWallTimeToUtc(2026, 7, 10, 16, 30, 0); // Fri 4:30 PM
    const monOpen = chicagoWallTimeToUtc(2026, 7, 13, 9, 30, 0); // Mon 9:30 AM
    const elapsed = businessMillisecondsElapsed(friClose, monOpen);
    // 30m Fri + 30m Mon = 60m business
    expect(elapsed).toBe(60 * 60_000);
  });

  it("adds 1 business hour across close-of-day", () => {
    const friLate = chicagoWallTimeToUtc(2026, 7, 10, 16, 30, 0);
    const due = addBusinessMilliseconds(friLate, 60 * 60_000);
    const expected = chicagoWallTimeToUtc(2026, 7, 13, 9, 30, 0);
    expect(due.getTime()).toBe(expected.getTime());
  });

  it("next open after Saturday is Monday 9 AM", () => {
    const sat = chicagoWallTimeToUtc(2026, 7, 11, 14, 0, 0);
    const next = nextCentralBusinessOpen(sat);
    expect(next.getTime()).toBe(chicagoWallTimeToUtc(2026, 7, 13, 9, 0, 0).getTime());
  });

  it("is open Tue 10 AM and closed Sat", () => {
    expect(isCentralBusinessOpen(chicagoWallTimeToUtc(2026, 7, 14, 10, 0, 0))).toBe(true);
    expect(isCentralBusinessOpen(chicagoWallTimeToUtc(2026, 7, 11, 10, 0, 0))).toBe(false);
  });
});

describe("inbound SLA copy + gates", () => {
  it("exports 1h SLA and Central success copy", () => {
    expect(INBOUND_LEAD_REPLY_SLA_HOURS).toBe(1);
    const copy = inboundLeadSuccessCopy("10–15");
    expect(copy).toContain("1 business hour");
    expect(copy).toContain("Central Time");
    expect(copy).toContain("No workspace was created");
  });

  it("defaults T1 on and T3 autosend off", () => {
    expect(isInboundSlaT1AckEnabled()).toBe(true);
    expect(isInboundSlaT3AutosendEnabled()).toBe(false);
  });

  it("builds T1/T3 templates with booking URL when set", () => {
    const t1 = buildInboundT1AckEmail({
      orgName: "Acme MSSP",
      bookingUrl: "https://calendly.com/ironframe/review",
    });
    expect(t1.subject).toContain("workflow review");
    expect(t1.text).toContain("Acme MSSP");
    expect(t1.text).toContain("https://calendly.com/ironframe/review");
    expect(t1.text).toContain("Central Time");

    const t3 = buildInboundT3HoldEmail({
      orgName: "Acme MSSP",
      bookingUrl: null,
    });
    expect(t3.text).toContain("Central Time");
    expect(t3.text).toContain("automated hold message");
  });
});

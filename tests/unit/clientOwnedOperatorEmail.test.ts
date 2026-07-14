import { describe, expect, it } from "vitest";

import { validateClientOwnedOperatorEmail } from "@/app/lib/server/clientOwnedOperatorEmail";

describe("validateClientOwnedOperatorEmail", () => {
  it("accepts client-owned mailboxes", () => {
    expect(validateClientOwnedOperatorEmail("ciso@acme.com")).toBeNull();
  });

  it("rejects empty and malformed addresses", () => {
    expect(validateClientOwnedOperatorEmail("")).toMatch(/valid/i);
    expect(validateClientOwnedOperatorEmail("not-an-email")).toMatch(/valid/i);
  });

  it("rejects @ironframegrc.com operator mailboxes", () => {
    expect(validateClientOwnedOperatorEmail("pilot@ironframegrc.com")).toMatch(/client-owned/i);
  });
});

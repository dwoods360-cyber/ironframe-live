import { describe, expect, it } from "vitest";

import {
  assertFellowsDatabaseIsolated,
  parseFellowsDbIdentity,
} from "@/lib/fellowsDatabaseUrl";

describe("fellowsDatabaseUrl isolation", () => {
  it("parses academic schema from query string", () => {
    const id = parseFellowsDbIdentity(
      "postgresql://fellows:x@db.example:5432/postgres?schema=academic_fellows",
    );
    expect(id?.schema).toBe("academic_fellows");
    expect(id?.user).toBe("fellows");
  });

  it("rejects same primary URL without academic schema", () => {
    const main = "postgresql://postgres:x@db.example:5432/postgres?schema=public";
    expect(() => assertFellowsDatabaseIsolated(main, main)).toThrow(/academic_fellows/);
  });

  it("allows same host when academic schema is set", () => {
    const main = "postgresql://postgres:x@db.example:5432/postgres?schema=public";
    const fellows =
      "postgresql://postgres:x@db.example:5432/postgres?schema=academic_fellows";
    expect(() => assertFellowsDatabaseIsolated(fellows, main)).not.toThrow();
  });

  it("allows distinct role on same host/db", () => {
    const main = "postgresql://postgres:x@db.example:5432/postgres?schema=public";
    const fellows =
      "postgresql://ironframe_fellows_app:x@db.example:5432/postgres?schema=academic_fellows";
    expect(() => assertFellowsDatabaseIsolated(fellows, main)).not.toThrow();
  });
});

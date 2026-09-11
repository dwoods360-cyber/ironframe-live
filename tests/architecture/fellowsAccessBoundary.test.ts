import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Fellows public access boundary", () => {
  it("never mints a session in the public application handler", () => {
    const source = read("app/api/fellows/apply/route.ts");
    expect(source).not.toContain("mintFellowSessionToken");
    expect(source).not.toContain("FELLOWS_SESSION_COOKIE");
  });

  it("mints only after consuming a single-use email verification", () => {
    const source = read("app/api/fellows/verify/route.ts");
    expect(source).toContain("consumeFellowAccessVerification");
    expect(source.indexOf("consumeFellowAccessVerification")).toBeLessThan(
      source.indexOf("mintFellowSessionToken"),
    );
  });

  it("does not update existing Fellow profile data from public apply", () => {
    const source = read("app/api/fellows/apply/route.ts");
    expect(source).not.toContain("prismaFellows.fellow.update({");
  });

  it("uses a dedicated session-signing secret with no operational-secret fallback", () => {
    const source = read("app/lib/fellows/session.ts");
    expect(source).toContain("process.env.FELLOWS_SESSION_SECRET");
    expect(source).not.toContain("process.env.IRONFRAME_CRON_SECRET");
    expect(source).not.toContain("process.env.INTERNAL_GATEWAY_SECRET_KEY");
  });
});

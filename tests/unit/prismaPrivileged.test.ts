import { describe, expect, it } from "vitest";
import { requirePrivilegedDatabaseUrl } from "@/lib/prismaPrivileged";

describe("privileged Prisma configuration", () => {
  it("fails closed when the privileged credential is absent", () => {
    expect(() => requirePrivilegedDatabaseUrl(undefined, undefined)).toThrow(
      "PRIVILEGED_DATABASE_URL_REQUIRED",
    );
  });

  it("rejects reuse of the application database role", () => {
    expect(() =>
      requirePrivilegedDatabaseUrl(
        "postgresql://ironframe_app:privileged-secret@db.example.test/postgres",
        "postgresql://ironframe_app:application-secret@db.example.test/postgres",
      ),
    ).toThrow("PRIVILEGED_DATABASE_ROLE_MUST_DIFFER_FROM_APPLICATION_ROLE");
  });

  it("rejects encoded reuse of the application database role", () => {
    expect(() =>
      requirePrivilegedDatabaseUrl(
        "postgresql://ironframe%5Fapp:privileged-secret@db.example.test/postgres",
        "postgresql://ironframe_app:application-secret@db.example.test/postgres",
      ),
    ).toThrow("PRIVILEGED_DATABASE_ROLE_MUST_DIFFER_FROM_APPLICATION_ROLE");
  });

  it("accepts a distinct privileged role", () => {
    expect(
      requirePrivilegedDatabaseUrl(
        "postgresql://ironframe_privileged:secret@db.example.test/postgres",
        "postgresql://ironframe_app:secret@db.example.test/postgres",
      ),
    ).toBe("postgresql://ironframe_privileged:secret@db.example.test/postgres");
  });
});

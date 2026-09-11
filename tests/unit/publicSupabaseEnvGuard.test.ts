import { afterEach, describe, expect, it } from "vitest";
import {
  assertBrowserSafeSupabaseKey,
  envSupabaseAnonKey,
} from "@/lib/supabase/envPublic";

const originalPublishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function restore(name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" | "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restore("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", originalPublishable);
  restore("NEXT_PUBLIC_SUPABASE_ANON_KEY", originalAnon);
});

describe("public Supabase environment guard", () => {
  it("accepts a browser-safe publishable key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_example";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(envSupabaseAnonKey()).toBe("sb_publishable_example");
  });

  it("rejects a Supabase secret key in a public variable", () => {
    expect(() =>
      assertBrowserSafeSupabaseKey("sb_secret_example", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    ).toThrow("never a secret/service_role key");
  });

  it("rejects a legacy service_role JWT in a public variable", () => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url");
    expect(() =>
      assertBrowserSafeSupabaseKey(`${header}.${payload}.signature`, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    ).toThrow("never a secret/service_role key");
  });
});

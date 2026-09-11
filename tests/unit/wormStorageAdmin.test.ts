import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ storage: {} })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

import { createSupabaseWormStorageClient } from "@/lib/supabase/wormStorageAdmin";

describe("createSupabaseWormStorageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SUPABASE_WORM_STORAGE_URL;
    delete process.env.SUPABASE_WORM_STORAGE_SECRET_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  });

  it("fails closed without the dedicated storage credential", () => {
    expect(() => createSupabaseWormStorageClient()).toThrow(
      "SUPABASE_WORM_STORAGE_SECRET_KEY",
    );
    expect(createClient).not.toHaveBeenCalled();
  });

  it("creates a non-persistent server client from the dedicated credential", () => {
    process.env.SUPABASE_WORM_STORAGE_SECRET_KEY = "worm-storage-secret";
    createSupabaseWormStorageClient();

    expect(createClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "worm-storage-secret",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );
  });
});

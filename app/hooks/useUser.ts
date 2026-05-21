"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { GRC_ROLE_LABELS } from "@/app/lib/grcRoles";

export type UseUserResult = {
  user: User | null;
  loading: boolean;
  /** Primary label for UI (full_name → email → fallback). */
  displayName: string;
  /** Supabase auth user id (UUID). */
  userId: string;
  email: string | null;
  /** Role string from user_metadata (defaults to Junior GRC Analyst baseline). */
  metadataRole: string;
  /**
   * Stable lowercase token for pipeline assignee `<select>` values.
   * Prefer auth id; falls back to email local-part.
   */
  assigneeSelectValue: string;
};

function sanitizeAssigneeValue(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (!t) return "jr-grc-analyst";
  return t.replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "jr-grc-analyst";
}

export function useUser(): UseUserResult {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const displayName =
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    user?.email?.trim() ||
    (loading ? "…" : GRC_ROLE_LABELS.JR_GRC_ANALYST);

  const userId = typeof user?.id === "string" ? user.id.trim() : "";
  const email = user?.email?.trim() ?? null;

  const rawMetaRole = typeof user?.user_metadata?.role === "string" ? user.user_metadata.role.trim() : "";
  const normalizedMetaRole = rawMetaRole;
  const metadataRole =
    !normalizedMetaRole
      ? GRC_ROLE_LABELS.JR_GRC_ANALYST
      : normalizedMetaRole;

  const assigneeSelectValue = sanitizeAssigneeValue(
    userId || (email ? email.split("@")[0] ?? "" : ""),
  );

  return {
    user,
    loading,
    displayName,
    userId,
    email,
    metadataRole,
    assigneeSelectValue,
  };
}

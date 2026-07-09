"use client";

import { useEffect, useState } from "react";
import { ironguardFetch } from "@/app/utils/apiClient";
import type { AssigneeSelectOption } from "@/app/utils/assigneeSelectValue";

export function useTenantAssigneeRoster(tenantUuid: string | null | undefined): {
  options: AssigneeSelectOption[];
  loading: boolean;
} {
  const [options, setOptions] = useState<AssigneeSelectOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tid = (tenantUuid ?? "").trim();
    if (!tid) {
      setOptions([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void ironguardFetch("/api/tenant/assignee-roster", {
      headers: {
        "x-tenant-id": tid,
        "x-target-tenant-id": tid,
      },
    })
      .then(async (res) => {
        if (!active || !res.ok) return [];
        const payload = (await res.json()) as { options?: AssigneeSelectOption[] };
        return Array.isArray(payload.options) ? payload.options : [];
      })
      .then((rows) => {
        if (!active) return;
        setOptions(rows);
      })
      .catch(() => {
        if (!active) return;
        setOptions([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tenantUuid]);

  return { options, loading };
}

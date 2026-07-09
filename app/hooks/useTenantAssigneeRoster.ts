"use client";

import { useEffect, useState } from "react";
import { getTenantAssigneeRosterAction } from "@/app/actions/tenantAssigneeActions";
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
    void getTenantAssigneeRosterAction(tid)
      .then((res) => {
        if (!active) return;
        setOptions(res.ok ? res.options : []);
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

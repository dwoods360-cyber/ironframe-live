"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ironguardFetch } from "@/app/utils/apiClient";
import type { AssigneeSelectOption } from "@/app/utils/assigneeSelectValue";

type TenantAssigneeRosterContextValue = {
  options: AssigneeSelectOption[];
  loading: boolean;
};

const TenantAssigneeRosterContext = createContext<TenantAssigneeRosterContextValue>({
  options: [],
  loading: false,
});

async function loadAssigneeRoster(tenantUuid: string): Promise<AssigneeSelectOption[]> {
  const res = await ironguardFetch("/api/tenant/assignee-roster", {
    headers: {
      "x-tenant-id": tenantUuid,
      "x-target-tenant-id": tenantUuid,
    },
  });
  if (!res.ok) return [];
  const payload = (await res.json()) as { ok?: boolean; options?: AssigneeSelectOption[] };
  return Array.isArray(payload.options) ? payload.options : [];
}

export function TenantAssigneeRosterProvider({
  tenantUuid,
  children,
}: {
  tenantUuid: string | null | undefined;
  children: ReactNode;
}) {
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
    void loadAssigneeRoster(tid)
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

  const value = useMemo(() => ({ options, loading }), [options, loading]);

  return (
    <TenantAssigneeRosterContext.Provider value={value}>{children}</TenantAssigneeRosterContext.Provider>
  );
}

export function useTenantAssigneeRosterContext(): TenantAssigneeRosterContextValue {
  return useContext(TenantAssigneeRosterContext);
}

"use client";

import { GRC_ROLE_LABELS, GRC_WORKSPACE_ROLES, type GrcWorkspaceRole } from "@/app/lib/grcRoles";

type Props = {
  value: GrcWorkspaceRole;
  onChange: (next: GrcWorkspaceRole) => void;
  id?: string;
  className?: string;
};

/**
 * Dev-only workspace RBAC: writes `ironframe-role` cookie using Prisma `UserRole` values.
 */
export default function DevRoleSwitcher({ value, onChange, id = "dev-grc-role-switcher", className }: Props) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as GrcWorkspaceRole)}
      className={
        className ??
        "w-full max-w-md rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-600"
      }
    >
      {GRC_WORKSPACE_ROLES.map((r) => (
        <option key={r} value={r}>
          {GRC_ROLE_LABELS[r]}
        </option>
      ))}
    </select>
  );
}

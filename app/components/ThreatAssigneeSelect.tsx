"use client";

import { useMemo } from "react";
import {
  SHARED_TEAM_ASSIGNEE_OPTIONS,
  type AssigneeSelectOption,
} from "@/app/utils/assigneeSelectValue";
import { useTenantAssigneeRosterContext } from "@/app/context/TenantAssigneeRosterContext";

type ThreatAssigneeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  currentUserValue: string;
  currentUserLabel: string;
  className?: string;
  disabled?: boolean;
  /** When false, omit shared team buckets (SecOps / GRC / NetSec). */
  includeTeamBuckets?: boolean;
};

function mergeOperatorOptions(
  roster: AssigneeSelectOption[],
  currentUserValue: string,
  currentUserLabel: string,
): AssigneeSelectOption[] {
  const merged: AssigneeSelectOption[] = [];
  const seen = new Set<string>();

  for (const opt of roster) {
    if (seen.has(opt.value)) continue;
    seen.add(opt.value);
    merged.push(opt);
  }

  if (currentUserValue && !seen.has(currentUserValue)) {
    merged.unshift({
      value: currentUserValue,
      label: `${currentUserLabel} (you)`,
    });
  }

  return merged;
}

export default function ThreatAssigneeSelect({
  value,
  onChange,
  currentUserValue,
  currentUserLabel,
  className,
  disabled = false,
  includeTeamBuckets = true,
}: ThreatAssigneeSelectProps) {
  const { options: rosterOptions } = useTenantAssigneeRosterContext();

  const operatorOptions = useMemo(
    () => mergeOperatorOptions(rosterOptions, currentUserValue, currentUserLabel),
    [rosterOptions, currentUserValue, currentUserLabel],
  );

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={
        className ??
        "px-2 py-1 bg-black border border-ironcore-border text-ironcore-text rounded focus:outline-none focus:border-ironcore-accent"
      }
    >
      <option value="unassigned">Unassigned</option>
      {operatorOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
      {includeTeamBuckets
        ? SHARED_TEAM_ASSIGNEE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))
        : null}
    </select>
  );
}

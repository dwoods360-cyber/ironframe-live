"use client";

import React, { useMemo, useState } from "react";
import { useSyncExternalStore } from "react";
import { getAuditLogSnapshot, getAuditLogsForCompany, subscribeAuditLogger } from "@/app/utils/auditLogger";
import type { AuditLogRecord } from "@/app/utils/auditLogger";

type AuditSearchProps = {
  /** When set, filter the audit log to entries for this company (metadata_tag or description contains companyId). */
  companyId?: string | null;
};

export default function AuditSearch({ companyId }: AuditSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "HIGH" | "MED" | "LOW">("ALL");

  const snapshot = useSyncExternalStore(subscribeAuditLogger, getAuditLogSnapshot, getAuditLogSnapshot);
  const logsForCompany = useMemo(() => getAuditLogsForCompany(companyId ?? null), [snapshot, companyId]);

  const filtered = useMemo(() => {
    let list: AuditLogRecord[] = logsForCompany;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          (e.metadata_tag && e.metadata_tag.toLowerCase().includes(q)) ||
          e.action_type.toLowerCase().includes(q)
      );
    }
    if (severityFilter !== "ALL") {
      const tag = severityFilter.toLowerCase();
      list = list.filter((e) => e.metadata_tag && e.metadata_tag.toLowerCase().includes(tag));
    }
    return list.slice(0, 50);
  }, [logsForCompany, searchQuery, severityFilter]);

  return (
    <div style={{ padding: "16px 20px", borderBottom: "1px solid #2d3139", background: "#161b22" }}>
      {companyId && (
        <p style={{ fontSize: "9px", color: "#94a3b8", marginBottom: "8px", textTransform: "uppercase" }}>
          Filtering by company: {companyId}
        </p>
      )}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        {(["ALL", "HIGH", "MED", "LOW"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setSeverityFilter(filter)}
            style={{
              fontSize: "10px",
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: "4px",
              background: severityFilter === filter ? "#3182ce" : "#2d3748",
              border: "1px solid #4a5568",
              color: "white",
              cursor: "pointer",
              letterSpacing: "0.5px",
            }}
          >
            {filter}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <input
          placeholder="Search audit log..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            background: "#0d1117",
            border: "1px solid #30363d",
            color: "#c9d1d9",
            fontSize: "12px",
            padding: "10px",
            borderRadius: "6px",
            outline: "none",
          }}
        />
      </div>
      <p style={{ fontSize: "10px", color: "#64748b", marginTop: "8px" }}>
        Showing {filtered.length} of {logsForCompany.length} log entries
      </p>
    </div>
  );
}

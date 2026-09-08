"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  updateFacultyVerificationAction,
  type FacultyQueueRow,
} from "@/app/actions/admin/facultyVerification";

export default function FacultyAdminClient({
  initialRows,
}: {
  initialRows: FacultyQueueRow[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<
    "ALL" | "PENDING_REVIEW" | "APPROVED" | "REJECTED"
  >("PENDING_REVIEW");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = initialRows.filter(
    (r) => filter === "ALL" || r.facultyStatus === filter,
  );

  const run = (id: string, status: "APPROVED" | "REJECTED" | "PENDING_REVIEW") => {
    startTransition(async () => {
      const res = await updateFacultyVerificationAction({ fellowId: id, status });
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      if (status === "APPROVED") {
        const emailBit = res.emailDispatched
          ? "Email dispatched."
          : `Email not sent${res.emailError ? `: ${res.emailError}` : ""}.`;
        setMessage(
          res.materialsUrl
            ? `Approved. ${emailBit} Link (copy if needed): ${res.materialsUrl}`
            : `Approved. ${emailBit}`,
        );
      } else {
        setMessage(`Updated to ${status}.`);
      }
      router.refresh();
    });
  };

  return (
    <div className="mt-8 space-y-4">
      {message && (
        <p className="break-all rounded border border-teal-900/50 bg-teal-950/20 px-3 py-2 font-mono text-[11px] text-teal-200">
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-2 font-mono text-[10px]">
        {(["PENDING_REVIEW", "APPROVED", "REJECTED", "ALL"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded border px-2.5 py-1 ${
              filter === tab
                ? "border-teal-700 bg-teal-950/60 text-teal-300"
                : "border-slate-800 bg-slate-900 text-slate-400"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[48rem] text-left text-xs">
          <thead className="bg-slate-900/90 font-mono text-[10px] text-slate-500">
            <tr>
              <th className="p-3">Name / email</th>
              <th className="p-3">Course context</th>
              <th className="p-3">LinkedIn</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No faculty applicants for this filter.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="text-slate-300">
                  <td className="p-3">
                    <div className="font-semibold text-slate-100">{row.fullName}</div>
                    <div className="font-mono text-[11px] text-slate-500">{row.email}</div>
                  </td>
                  <td className="max-w-xs p-3 text-slate-400">
                    {row.facultyCourseContext || "—"}
                  </td>
                  <td className="p-3">
                    <a
                      href={row.linkedInUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-400 hover:text-teal-300"
                    >
                      Verify staff
                    </a>
                  </td>
                  <td className="p-3 font-mono text-[11px]">{row.facultyStatus}</td>
                  <td className="space-x-2 p-3 text-right">
                    {row.facultyStatus === "PENDING_REVIEW" ? (
                      <>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => run(row.id, "APPROVED")}
                          className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-bold text-black disabled:opacity-50"
                        >
                          Approve &amp; issue link
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => run(row.id, "REJECTED")}
                          className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => run(row.id, "PENDING_REVIEW")}
                        className="text-[11px] text-slate-500 underline"
                      >
                        Re-open
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

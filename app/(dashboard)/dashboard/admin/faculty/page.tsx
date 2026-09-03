import Link from "next/link";

import { listFacultyApplicantsAction } from "@/app/actions/admin/facultyVerification";
import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";

import FacultyAdminClient from "./FacultyAdminClient";

export default async function FacultyAdminPage() {
  const gate = await requirePlatformAdministrator();
  if ("error" in gate) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-slate-300">
        Platform administrator access required.
      </div>
    );
  }

  const listed = await listFacultyApplicantsAction();
  const rows = listed.ok ? listed.rows : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-6">
      <p className="font-mono text-[10px] tracking-[0.12em] text-teal-500">
        ADMIN // FACULTY VERIFICATION
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-white">Faculty access queue</h1>
      <p className="mt-2 max-w-2xl text-xs text-slate-400">
        Manual review before instructor materials. Approve issues a hashed 72-hour magic link
        (emailed when Resend is configured). Students cannot self-claim faculty status.
      </p>
      <p className="mt-2 text-xs text-slate-600">
        Related:{" "}
        <Link href="/dashboard/admin/fellows-integrity" className="text-teal-400 hover:text-teal-300">
          Fellows integrity desk
        </Link>
      </p>
      {!listed.ok && (
        <p className="mt-4 text-xs text-rose-300">{listed.error}</p>
      )}
      <FacultyAdminClient initialRows={rows} />
    </div>
  );
}

import Link from "next/link";
import { ShieldAlert, ShieldOff } from "lucide-react";

import SessionLogoutButton from "@/app/components/SessionLogoutButton";

import type {
  AssignedWorkspaceAccess,
  WorkspaceAccessDenialReason,
} from "@/app/types/workspaceAccessDenial";

type AccessPendingProps = {
  email?: string | null;
  tenantUuid?: string | null;
  tenantSlug?: string | null;
  tenantName?: string | null;
  reason?: WorkspaceAccessDenialReason;
  assignedWorkspaces?: AssignedWorkspaceAccess[];
  apexLoginUrl?: string | null;
  integrityHubUrl?: string | null;
};

function workspaceLabel(tenantName: string | null | undefined, tenantSlug: string | null | undefined): string {
  if (tenantName?.trim()) return tenantName.trim();
  if (tenantSlug?.trim()) return tenantSlug.trim();
  return "this workspace";
}

function resolveCopy(reason: WorkspaceAccessDenialReason, workspace: string) {
  switch (reason) {
    case "revoked":
      return {
        title: "Workspace access revoked",
        tone: "revoked" as const,
        body: (
          <>
            Your administrator revoked your access to{" "}
            <span className="font-medium text-slate-200">{workspace}</span>. You are still signed in,
            but you cannot enter this command center. Contact your administrator if access should be
            restored here.
          </>
        ),
      };
    case "activation_pending":
      return {
        title: "Workspace activation pending",
        tone: "pending" as const,
        body: (
          <>
            An active invitation exists for{" "}
            <span className="font-medium text-slate-200">{workspace}</span>, but workspace activation
            is not complete. Open the secure registration link from your administrator email to
            finish setup.
          </>
        ),
      };
    case "no_workspace_access":
      return {
        title: "No access to this workspace",
        tone: "pending" as const,
        body: (
          <>
            You are signed in, but your account is not assigned to{" "}
            <span className="font-medium text-slate-200">{workspace}</span>. Use one of your active
            workspaces below, or contact your administrator for a new invitation.
          </>
        ),
      };
    default:
      return {
        title: "Access pending",
        tone: "pending" as const,
        body: (
          <>
            Your account is authenticated, but workspace roles have not been provisioned for{" "}
            <span className="font-medium text-slate-200">{workspace}</span> yet. An administrator
            must assign tenant access before you can enter the command center.
          </>
        ),
      };
  }
}

function AlternateWorkspaceAccessPanel({
  assignedWorkspaces,
  apexLoginUrl,
  integrityHubUrl,
}: {
  assignedWorkspaces: AssignedWorkspaceAccess[];
  apexLoginUrl?: string | null;
  integrityHubUrl?: string | null;
}) {
  if (assignedWorkspaces.length === 0) return null;

  return (
    <section className="mt-6 rounded-lg border border-cyan-500/25 bg-cyan-950/20 p-4">
      <h2 className="text-sm font-semibold text-cyan-100">Active workspaces you can enter</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        Sign out above, then sign in on a workspace host where you still have access. Use the same
        email and password.
      </p>
      <ul className="mt-3 space-y-2">
        {assignedWorkspaces.map((workspace) => (
          <li key={workspace.slug}>
            <a
              href={workspace.loginUrl}
              className="inline-flex min-h-11 w-full items-center justify-between rounded-md border border-slate-700 bg-black/30 px-3 py-2 text-sm text-slate-100 transition hover:border-cyan-500/50 hover:text-white"
            >
              <span>
                <span className="font-medium">{workspace.name}</span>
                <span className="ml-2 font-mono text-xs text-slate-400">{workspace.slug}</span>
              </span>
              <span className="text-xs text-cyan-300">Open login</span>
            </a>
          </li>
        ))}
      </ul>
      {apexLoginUrl && integrityHubUrl ? (
        <p className="mt-4 text-xs leading-relaxed text-slate-400">
          Or sign in on the corporate apex host at{" "}
          <a href={apexLoginUrl} className="font-mono text-cyan-300 underline-offset-2 hover:underline">
            {apexLoginUrl}
          </a>
          , open{" "}
          <a
            href={integrityHubUrl}
            className="font-mono text-cyan-300 underline-offset-2 hover:underline"
          >
            Integrity Hub
          </a>
          , and switch workspace from the tenant switcher in the header.
        </p>
      ) : null}
    </section>
  );
}

export default function AccessPending({
  email,
  tenantUuid,
  tenantSlug,
  tenantName,
  reason = "never_provisioned",
  assignedWorkspaces = [],
  apexLoginUrl,
  integrityHubUrl,
}: AccessPendingProps) {
  const workspace = workspaceLabel(tenantName, tenantSlug);
  const copy = resolveCopy(reason, workspace);
  const isRevoked = copy.tone === "revoked";

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-lg flex-col items-center justify-center px-6 py-16 text-slate-200">
      <div
        className={`w-full rounded-xl border bg-slate-950/90 p-8 shadow-lg ${
          isRevoked
            ? "border-rose-500/35 shadow-rose-950/20"
            : "border-amber-500/30 shadow-amber-950/20"
        }`}
      >
        <div
          className={`mb-4 flex items-center gap-3 ${isRevoked ? "text-rose-300" : "text-amber-300"}`}
        >
          {isRevoked ? (
            <ShieldOff className="h-6 w-6 shrink-0" aria-hidden />
          ) : (
            <ShieldAlert className="h-6 w-6 shrink-0" aria-hidden />
          )}
          <h1 className="text-xl font-semibold text-white">{copy.title}</h1>
        </div>
        <p className="text-sm leading-relaxed text-slate-300">{copy.body}</p>
        <AlternateWorkspaceAccessPanel
          assignedWorkspaces={assignedWorkspaces}
          apexLoginUrl={apexLoginUrl}
          integrityHubUrl={integrityHubUrl}
        />
        {email ? (
          <p className="mt-4 text-xs text-slate-500">
            Signed in as <span className="font-mono text-slate-400">{email}</span>
          </p>
        ) : null}
        {tenantSlug ? (
          <p className="mt-2 text-xs text-slate-500">
            Workspace slug: <span className="font-mono text-slate-400">{tenantSlug}</span>
          </p>
        ) : tenantUuid ? (
          <p className="mt-2 text-xs text-slate-500">
            Requested tenant scope:{" "}
            <span className="font-mono text-slate-400">{tenantUuid}</span>
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <SessionLogoutButton />
          <Link
            href="/docs/hub"
            className="inline-flex min-h-11 items-center rounded-md bg-cyan-600/90 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500"
          >
            Read documentation
          </Link>
        </div>
      </div>
    </main>
  );
}

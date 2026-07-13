"use client";

interface AdminOnboardingDashboardHeaderProps {
  deploymentCount: number;
  partnerMode?: boolean;
}

export default function AdminOnboardingDashboardHeader({
  deploymentCount,
  partnerMode = false,
}: AdminOnboardingDashboardHeaderProps) {
  function scrollToControls() {
    document.getElementById("onboarding-controls")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <header className="flex flex-col justify-between gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-center">
      <div>
        <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-indigo-400">
          <span>{partnerMode ? "PARTNER CLIENT CONSOLE" : "SUPERVISOR COMMAND PLANE"}</span>
          <span>·</span>
          <span className="text-cyan-400">v0.1.0-ga-epic17</span>
        </div>
        <h1 className="font-sans text-2xl font-bold tracking-tight text-white">
          {partnerMode ? "Client Workspaces" : "Onboarding & Tenant Deployments"}
        </h1>
        <p className="mt-2 max-w-2xl font-sans text-sm text-slate-400">
          {partnerMode
            ? "Add regulated client enclaves over time — each workspace stays isolated with its own billing, invites, and exports."
            : "Platform-wide tenant provisioning, billing activation, and invite-only onboarding."}
        </p>
        <p className="mt-2 font-mono text-[10px] text-slate-500">
          ACTIVE_DEPLOYMENTS: {deploymentCount}
        </p>
      </div>

      <button
        type="button"
        onClick={scrollToControls}
        className="flex h-11 touch-manipulation items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-950/40 transition-all duration-150 hover:bg-indigo-500 active:scale-[0.98]"
      >
        <span>+</span> {partnerMode ? "Add Client Workspace" : "Provision New Invite Link"}
      </button>
    </header>
  );
}

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut, Monitor, Moon, SunMedium, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOperatorContext } from "@/app/context/OperatorContext";
import { useOperatorIdentity } from "@/app/hooks/useOperatorIdentity";
import { usePermissions } from "@/app/hooks/usePermissions";
import { useIronframeTheme } from "@/app/hooks/useIronframeTheme";
import { formatUserRoleLabel } from "@/app/lib/grcRoles";
import type { IronframeThemeId } from "@/app/lib/ironframeTheme";

const THEME_ICONS: Record<IronframeThemeId, typeof Monitor> = {
  "standard-system": Monitor,
  "executive-light": SunMedium,
  "cyber-command-dark": Moon,
};

type TopNavUserProfileMenuProps = {
  isLoading: boolean;
  isGuest: boolean;
};

export default function TopNavUserProfileMenu({ isLoading, isGuest }: TopNavUserProfileMenuProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { profile } = useOperatorContext();
  const { displayName } = useOperatorIdentity();
  const { role } = usePermissions();
  const { mounted, activeId, options, saasLocked, setIronframeTheme } = useIronframeTheme();

  const email = profile.email?.trim() || displayName.trim() || "Operator session";
  const roleLabel = formatUserRoleLabel(role || profile.displayRole);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const triggerLabel = isLoading
    ? "Resolving operator profile"
    : `${email}, role ${roleLabel}. Open account menu.`;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          disabled={isLoading}
          aria-label={triggerLabel}
          aria-haspopup="menu"
          className="group flex max-w-[min(20rem,42vw)] items-center gap-2 rounded border border-slate-900/60 bg-slate-900/40 px-3 py-1 text-left transition-colors hover:border-slate-700 hover:bg-slate-900/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
          <span className="min-w-0 truncate font-mono text-[10px] font-medium tracking-wide text-slate-300">
            {isLoading ? "Resolving operator…" : email}
          </span>
          <ChevronDown
            className="h-3 w-3 shrink-0 text-slate-500 transition-transform group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="ironframe-profile-menu z-[1200] w-72 rounded-md border border-slate-800 bg-slate-950 p-1 shadow-xl shadow-black/40 focus:outline-none"
          aria-label="Operator account menu"
        >
          <section aria-labelledby="profile-menu-operator-heading" className="px-3 py-2">
            <DropdownMenu.Label
              id="profile-menu-operator-heading"
              className="text-[9px] font-bold uppercase tracking-widest text-slate-500"
            >
              Operator Profile
            </DropdownMenu.Label>
            <p className="mb-1 text-[9px] leading-snug text-slate-600">
              Workspace client name is shown in the command-line header only.
            </p>
            <dl className="mt-1 space-y-1">
              <div>
                <dt className="sr-only">Email address</dt>
                <dd className="truncate font-mono text-[11px] text-slate-200">{email}</dd>
              </div>
              <div>
                <dt className="sr-only">Workspace role</dt>
                <dd className="font-mono text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                  {roleLabel}
                  {isGuest ? " · local session" : ""}
                </dd>
              </div>
            </dl>
          </section>

          <DropdownMenu.Separator className="my-1 h-px bg-slate-800" />

          {!saasLocked ? (
          <section aria-labelledby="profile-menu-theme-heading" className="px-2 py-1">
            <DropdownMenu.Label
              id="profile-menu-theme-heading"
              className="px-1 text-[9px] font-bold uppercase tracking-widest text-slate-500"
            >
              Theme
            </DropdownMenu.Label>
            <div
              role="radiogroup"
              aria-label="Select dashboard theme"
              className="mt-1 space-y-0.5"
            >
              {options.map((option) => {
                const Icon = THEME_ICONS[option.id];
                const selected = mounted && activeId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setIronframeTheme(option.id)}
                    className={`flex w-full items-start gap-2 rounded px-2 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-500 ${
                      selected
                        ? "bg-emerald-950/50 text-emerald-100"
                        : "text-slate-300 hover:bg-slate-900/80"
                    }`}
                  >
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="min-w-0">
                      <span className="block font-mono text-[10px] font-bold uppercase tracking-wide">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-[9px] leading-snug text-slate-500">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
          ) : null}

          <DropdownMenu.Separator className="my-1 h-px bg-slate-800" />

          <section aria-labelledby="profile-menu-session-heading" className="px-2 py-1">
            <DropdownMenu.Label
              id="profile-menu-session-heading"
              className="px-1 text-[9px] font-bold uppercase tracking-widest text-slate-500"
            >
              Session
            </DropdownMenu.Label>
            <DropdownMenu.Item asChild>
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={isLoading}
                className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded px-2 py-2 font-mono text-[10px] font-bold uppercase tracking-wide text-rose-400 outline-none hover:bg-rose-950/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                Log Out
              </button>
            </DropdownMenu.Item>
          </section>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

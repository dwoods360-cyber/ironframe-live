"use client";

import { performClientSessionLogout } from "@/app/lib/auth/performClientSessionLogout";

type Props = {
  label?: string;
  className?: string;
};

export default function SessionLogoutButton({
  label = "Sign out",
  className = "inline-flex min-h-11 items-center rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-400 hover:text-white",
}: Props) {
  return (
    <button
      type="button"
      onClick={() => void performClientSessionLogout()}
      className={className}
    >
      {label}
    </button>
  );
}

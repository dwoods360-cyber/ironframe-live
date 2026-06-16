"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readDemoSession } from "@/app/lib/demo/demoMode";
import { seedDemoClientState } from "@/app/lib/demo/seedDemoClientState";

type Props = {
  children: ReactNode;
};

export default function DemoModeBootstrap({ children }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = readDemoSession();
    if (!session) {
      router.replace("/register/demo");
      return;
    }

    seedDemoClientState();
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-cyan-400/90">Evaluation Sandbox</p>
        <p className="text-sm text-slate-400">Loading mock workspace…</p>
      </div>
    );
  }

  return <>{children}</>;
}

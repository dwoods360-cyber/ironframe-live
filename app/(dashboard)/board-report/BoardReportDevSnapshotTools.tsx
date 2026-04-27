"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { captureDailySnapshot, simulateSevenDayHistory } from "@/app/actions/dailySnapshotActions";

type Props = {
  isDevelopment: boolean;
};

/** Dev-only: capture / seed `DailySnapshot` rows for the 7-day trend chart. */
export default function BoardReportDevSnapshotTools({ isDevelopment }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!isDevelopment) return null;

  return (
    <div className="rounded-lg border border-amber-900/40 bg-amber-950/15 p-4 print:hidden">
      <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/90">
        Dev · Daily snapshots
      </h3>
      <p className="mt-1 text-[9px] text-amber-100/70">
        `NODE_ENV=development` only. Writes `DailySnapshot` rows for Board Report trend QA.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await captureDailySnapshot();
              router.refresh();
            })
          }
          className="rounded border border-amber-600/50 bg-amber-950/40 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-amber-100 hover:border-amber-400 disabled:opacity-50"
        >
          Capture today
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await simulateSevenDayHistory();
              router.refresh();
            })
          }
          className="rounded border border-amber-600/50 bg-amber-950/40 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-amber-100 hover:border-amber-400 disabled:opacity-50"
        >
          Simulate 7-day history
        </button>
      </div>
    </div>
  );
}

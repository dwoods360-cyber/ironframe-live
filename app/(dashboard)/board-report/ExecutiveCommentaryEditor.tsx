"use client";

import { useEffect, useState, useTransition } from "react";
import { saveExecutiveSummaryForToday } from "@/app/actions/dailySnapshotActions";
import { useRouter } from "next/navigation";

type Props = {
  initialValue: string;
  isApproved: boolean;
};

export default function ExecutiveCommentaryEditor({ initialValue, isApproved }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onSave = () => {
    setStatus("idle");
    startTransition(() => {
      void saveExecutiveSummaryForToday(value).then((res) => {
        if (res.ok) {
          setStatus("saved");
          router.refresh();
        } else {
          setStatus("error");
        }
      });
    });
  };

  return (
    <section className="mt-4 rounded-lg border border-zinc-700/70 bg-zinc-950/55 p-3 print:border-zinc-300 print:bg-zinc-50">
      <h3 className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500 print:text-zinc-700">
        Notes for the board
      </h3>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-2 min-h-28 w-full resize-y rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-[11px] text-zinc-100 outline-none focus:border-zinc-500 print:border-zinc-300 print:bg-white print:text-zinc-900"
        placeholder="Add context here regarding recent drills, VIP hardening decisions, or insurance premium changes..."
      />
      <div className="mt-2 flex items-center justify-between gap-2 print:hidden">
        <span className="text-[9px] text-zinc-500">
          {status === "saved" ? "Saved." : status === "error" ? "Save failed." : "Manual commentary for this snapshot."}
        </span>
        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Commentary"}
        </button>
      </div>
      {isApproved ? (
        <p className="mt-2 text-[9px] text-amber-300/90 print:text-zinc-700">
          Editing this commentary will reset approval status to DRAFT until re-signed.
        </p>
      ) : null}
      {value.trim().length > 0 ? (
        <div className="mt-3 hidden print:block border-t border-zinc-300 pt-2">
          <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-zinc-800">{value.trim()}</p>
        </div>
      ) : null}
    </section>
  );
}

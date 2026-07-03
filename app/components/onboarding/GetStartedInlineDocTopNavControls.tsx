"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useGetStartedReaderStore } from "@/app/store/getStartedReaderStore";

export default function GetStartedInlineDocTopNavControls() {
  const pathname = usePathname();
  const inlineDocHref = useGetStartedReaderStore((s) => s.inlineDocHref);
  const clearInlineDoc = useGetStartedReaderStore((s) => s.clearInlineDoc);

  if (!pathname.startsWith("/get-started") || !inlineDocHref) {
    return null;
  }

  return (
    <>
      <Link
        href={inlineDocHref.split("#")[0] ?? inlineDocHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center rounded-lg border border-[var(--login-border)] px-3 font-mono text-[10px] text-[var(--login-muted)] uppercase transition hover:border-[var(--login-accent)] hover:text-[var(--text-main)]"
      >
        Open full docs
      </Link>
      <button
        type="button"
        onClick={clearInlineDoc}
        className="inline-flex min-h-11 items-center rounded-lg border border-[var(--login-border)] bg-[var(--bg-secondary)] px-4 font-mono text-[10px] font-bold text-[var(--text-main)] uppercase transition hover:bg-[var(--bg-tertiary)]"
      >
        Back to checklist
      </button>
    </>
  );
}

import Link from "next/link";
import { readFile } from "fs/promises";
import path from "path";

export const metadata = {
  title: "TAS Constitution | Ironframe",
  description: "Technical Architecture Specification — canonical docs/TAS.md with anchor targets for constitutional citations.",
};

function stripLeadingAnchors(line: string): { ids: string[]; rest: string } {
  const ids: string[] = [];
  let s = line;
  while (true) {
    const m = s.match(/^<a id="([^"]+)"><\/a>/);
    if (!m?.[1]) break;
    ids.push(m[1]);
    s = s.slice(m[0]!.length);
  }
  return { ids, rest: s };
}

export default async function ConstitutionTasPage() {
  const raw = await readFile(path.join(process.cwd(), "docs", "TAS.md"), "utf8");
  const lines = raw.split(/\r?\n/);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-200">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="mb-4 inline-block text-[11px] font-semibold text-sky-400 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mb-2 text-lg font-black uppercase tracking-wide text-slate-100">
          Technical Architecture Specification
        </h1>
        <p className="mb-6 max-w-2xl text-[11px] leading-relaxed text-slate-500">
          Rendered from <code className="rounded bg-slate-900 px-1 py-0.5 text-slate-300">docs/TAS.md</code> with HTML
          anchors. In-app citations resolve here in production builds; on localhost with{" "}
          <code className="text-slate-400">NEXT_PUBLIC_PROJECT_ROOT</code>, tooltips may open the file in Cursor via{" "}
          <code className="text-slate-400">vscode://file/…</code>.
        </p>
        <article className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <div className="space-y-1 font-mono text-[11px] leading-relaxed text-slate-300/95">
            {lines.map((line, idx) => {
              const { ids, rest } = stripLeadingAnchors(line);
              return (
                <div key={idx} className="scroll-mt-20">
                  {ids.map((id) => (
                    <div
                      key={id}
                      id={id}
                      className="h-0 scroll-mt-28 overflow-hidden leading-none"
                      aria-hidden
                    />
                  ))}
                  <p className="whitespace-pre-wrap break-words">{rest.length > 0 ? rest : "\u00a0"}</p>
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </div>
  );
}

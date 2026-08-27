import type { Metadata } from "next";
import Link from "next/link";

import FellowsNav from "../FellowsNav";

export const metadata: Metadata = {
  title: "Faculty lab brief | IRONFRAMEGRC // FELLOWS",
  description:
    "One-page faculty brief for the optional Ironframe academic GRC lab — outcomes, audit map, lessons, and guardrails. Not a WGU-operated site.",
};

export default function FellowsFacultyBriefPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <FellowsNav />
      <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
        <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-teal-400">
          IRONFRAMEGRC // FELLOWS
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Faculty lab brief
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Optional academic lab for cybersecurity / GRC coursework &amp; MSCSIA capstone.
          Independent Ironframe lab — not a WGU-operated site.
        </p>
        <p className="mt-2 text-xs text-slate-600">
          Lab:{" "}
          <a className="text-teal-400 hover:text-teal-300" href="https://fellows.ironframegrc.com">
            fellows.ironframegrc.com
          </a>{" "}
          · Contact: Dereck Woods · dereck@ironframegrc.com
        </p>

        <section className="mt-10">
          <h2 className="font-mono text-xs font-bold tracking-widest text-slate-500">ASK</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Would you bless a <strong className="text-white">capped, optional ~45–60 minute
            in-browser lab</strong> as a curriculum stress-test for students who need portfolio /
            capstone appendix evidence on multi-tenant isolation and estimated exposure —{" "}
            <strong className="text-white">not</strong> a required module and{" "}
            <strong className="text-white">not</strong> a commercial pilot?
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-mono text-xs font-bold tracking-widest text-slate-500">
            FOUR ASSURANCES
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-400">
            <li>
              <span className="text-slate-200">Zero admin overhead</span> — self-paced, browser-based,
              ~45–60 minutes; no install; no grading required by faculty
            </li>
            <li>
              <span className="text-slate-200">Data safety</span> — synthetic enclaves only; no
              student, school, or proprietary enterprise data ingested
            </li>
            <li>
              <span className="text-slate-200">Academic deliverable</span> — JSON/CSV registers with
              server SHA-256 for appendices / portfolio
            </li>
            <li>
              <span className="text-slate-200">Clear boundary</span> — independent Ironframe lab; not
              WGU-sponsored; not mandatory
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-mono text-xs font-bold tracking-widest text-slate-500">
            MISSIONS + LESSONS
          </h2>
          <p className="mt-3 text-xs text-slate-500">
            Each mission: audit question → teach → check → unlock lab → optional write-up prompt.
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="bg-slate-900/80 font-mono text-[10px] tracking-widest text-slate-500">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Mission</th>
                  <th className="px-3 py-2">Learning outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="px-3 py-3 text-teal-400">01</td>
                  <td className="px-3 py-3">Exposure stress-test</td>
                  <td className="px-3 py-3 text-slate-400">
                    Estimated exposure in whole cents with visible assumptions
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-3 text-teal-400">02</td>
                  <td className="px-3 py-3">Untrusted ingest gate</td>
                  <td className="px-3 py-3 text-slate-400">
                    Quarantine-before-trust blocks unverified promote
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-3 text-teal-400">03</td>
                  <td className="px-3 py-3">Boundary audit</td>
                  <td className="px-3 py-3 text-slate-400">
                    Server 403 + receipt on cross-enclave probe
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-3 text-teal-400">04</td>
                  <td className="px-3 py-3">Lineage export</td>
                  <td className="px-3 py-3 text-slate-400">
                    SHA-256 register with collector / scope / sign-off
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-mono text-xs font-bold tracking-widest text-slate-500">
            AUDIT MAP
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Framing only — not a fifth mission. Prepares students to talk about exam friction with
            synthetic evidence. Does not certify compliance.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            <li>
              <span className="text-slate-200">Estimated exposure + assumptions?</span> → Mission 01
            </li>
            <li>
              <span className="text-slate-200">Vendor pack verified before executive pack?</span> →
              Mission 02
            </li>
            <li>
              <span className="text-slate-200">Client B bleed under Client A exam?</span> → Mission
              03
            </li>
            <li>
              <span className="text-slate-200">Who / when / scope / file integrity?</span> → Mission
              04
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-mono text-xs font-bold tracking-widest text-slate-500">
            WHAT WE ASK
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-400">
            <li>Confirm the lab is appropriate as optional evidence practice.</li>
            <li>Optionally share capped seats with interested students.</li>
            <li>Optional: 10 minutes of friction notes after 1–2 students run it.</li>
          </ol>
          <p className="mt-4 text-xs text-slate-600">
            Not asking for LMS integration, required adoption, or institutional endorsement in Phase
            1. Completion hash ≠ industry certification.
          </p>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/fellows"
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
          >
            Fellows landing
          </Link>
          <Link
            href="/fellows/lab"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
          >
            Enter lab
          </Link>
        </div>
      </main>
    </div>
  );
}

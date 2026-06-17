import Link from "next/link";
import { MSA_SECTIONS } from "@/app/lib/legal/documents";
import { IRONFRAME_TERMS_VERSION } from "@/config/legal";

export const metadata = {
  title: "Terms of Service · Ironframe",
  description: "Master Service Agreement — Ironframe GRC Command Tier",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-[var(--text-main)]">
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--login-muted)]">
        Master Service Agreement
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Terms of Service</h1>
      <p className="mt-2 font-mono text-[10px] text-[var(--login-muted)]">
        Version {IRONFRAME_TERMS_VERSION}
      </p>
      <p className="mt-6 text-sm leading-relaxed text-[var(--login-muted)]">
        These terms govern design-partner and enterprise use of the Ironframe GRC platform. By
        accepting during invite redemption you agree to this version.
      </p>
      <div className="mt-10 space-y-8">
        {MSA_SECTIONS.map((section) => (
          <section key={section.id} id={section.id}>
            <h2 className="text-lg font-semibold text-[var(--text-main)]">{section.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--login-muted)]">{section.body}</p>
          </section>
        ))}
      </div>
      <p className="mt-12 text-center text-xs text-[var(--login-muted)]">
        <Link href="/privacy" className="text-[var(--login-accent)] hover:underline">
          Privacy Framework
        </Link>
        {" · "}
        <Link href="/register/contact" className="text-[var(--login-accent)] hover:underline">
          Contact sales
        </Link>
      </p>
    </main>
  );
}

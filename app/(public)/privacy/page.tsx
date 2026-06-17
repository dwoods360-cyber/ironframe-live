import Link from "next/link";
import { PRIVACY_SECTIONS } from "@/app/lib/legal/documents";
import { IRONFRAME_PRIVACY_VERSION } from "@/config/legal";

export const metadata = {
  title: "Privacy Framework · Ironframe",
  description: "Privacy Framework — Ironframe GRC",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-[var(--text-main)]">
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--login-muted)]">
        Privacy Framework
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 font-mono text-[10px] text-[var(--login-muted)]">
        Version {IRONFRAME_PRIVACY_VERSION}
      </p>
      <p className="mt-6 text-sm leading-relaxed text-[var(--login-muted)]">
        This framework describes how Ironframe GRC collects, uses, and protects information in
        multi-tenant command post deployments.
      </p>
      <div className="mt-10 space-y-8">
        {PRIVACY_SECTIONS.map((section) => (
          <section key={section.id} id={section.id}>
            <h2 className="text-lg font-semibold text-[var(--text-main)]">{section.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--login-muted)]">{section.body}</p>
          </section>
        ))}
      </div>
      <p className="mt-12 text-center text-xs text-[var(--login-muted)]">
        <Link href="/terms" className="text-[var(--login-accent)] hover:underline">
          Terms of Service
        </Link>
        {" · "}
        <Link href="/register/contact" className="text-[var(--login-accent)] hover:underline">
          Contact sales
        </Link>
      </p>
    </main>
  );
}

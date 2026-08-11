import {
  CUSTOMER_FACING_PATH_B_SKU,
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  WORKFLOW_REVIEW_CTA_MINUTES,
  formatPathBUsd,
} from "@/lib/ironframeProductKnowledge/commercial";
import {
  INBOUND_LEAD_REPLY_SLA_HOURS,
} from "@/config/commercialGates";

type EngagementPathChooserProps = {
  /** Optional heading id for aria-labelledby */
  headingId?: string;
  className?: string;
};

/**
 * Below-the-fold engagement chooser — Option 1 workflow review (primary) vs
 * Option 2 Command Design Partner. Mandate 16: board-ready exposure export path
 * (not “custom board-level risk models”).
 */
export default function EngagementPathChooser({
  headingId = "engagement-path-heading",
  className = "",
}: EngagementPathChooserProps) {
  return (
    <section
      className={`rounded-xl border border-[var(--login-border)] bg-[var(--bg-secondary)] p-5 sm:p-6 ${className}`}
      aria-labelledby={headingId}
    >
      <h2
        id={headingId}
        className="text-lg font-semibold tracking-tight text-[var(--text-main)] sm:text-xl"
      >
        Select Your Engagement Path
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--login-muted)]">
        We do not offer generic software demos or low-signal free trials. We walk real control
        execution paths with operators managing multi-entity risk.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-teal-700/40 bg-[var(--bg-primary)] p-4">
          <p className="font-mono text-[10px] tracking-widest text-teal-300 uppercase">
            Option 1 · Primary
          </p>
          <h3 className="mt-2 text-base font-bold text-[var(--text-main)]">
            {WORKFLOW_REVIEW_CTA_MINUTES} Minute Workflow Review
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--login-muted)]">
            <li>
              <span className="font-medium text-[var(--text-main)]">Format:</span> 1-on-1
              operational session with an engineer (By Application).
            </li>
            <li>
              <span className="font-medium text-[var(--text-main)]">Scope:</span> Walk one
              multi-entity evidence item from source system → quarantine DMZ → board-ready
              exposure export path on your own stack.
            </li>
            <li>
              <span className="font-medium text-[var(--text-main)]">Target:</span> CISOs, MSSP
              owners, and GRC leads evaluating tenant isolation and exposure calculations.
            </li>
          </ul>
        </article>

        <article className="rounded-lg border border-[var(--login-border)] bg-[var(--bg-primary)] p-4">
          <p className="font-mono text-[10px] tracking-widest text-[var(--login-muted)] uppercase">
            Option 2
          </p>
          <h3 className="mt-2 text-base font-bold text-[var(--text-main)]">
            {CUSTOMER_FACING_PATH_B_SKU} ({formatPathBUsd()})
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--login-muted)]">
            <li>
              <span className="font-medium text-[var(--text-main)]">Format:</span>{" "}
              {DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day structured architectural co-design and
              deployment.
            </li>
            <li>
              <span className="font-medium text-[var(--text-main)]">Scope:</span> Build hard
              multi-tenant enclaves, quarantine-before-persistence pipelines, and deterministic
              financial exposure modeling alongside the core engineering team.
            </li>
            <li>
              <span className="font-medium text-[var(--text-main)]">Target:</span> Multi-entity
              enterprises and MSSPs requiring production-level isolation and auditable risk
              pipelines.
            </li>
          </ul>
        </article>
      </div>

      <ul className="mt-5 space-y-1.5 text-sm leading-relaxed text-[var(--login-muted)]">
        <li>
          <span className="text-[var(--text-main)]">•</span> {CUSTOMER_FACING_PATH_B_SKU}:{" "}
          {formatPathBUsd()} ({DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day scope)
        </li>
        <li>
          <span className="text-[var(--text-main)]">•</span> Response SLA: Within{" "}
          {INBOUND_LEAD_REPLY_SLA_HOURS} business hour (Mon–Fri, 9 AM–5 PM CT)
        </li>
      </ul>
    </section>
  );
}

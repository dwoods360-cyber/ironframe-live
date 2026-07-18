export type ControlToolChecklistItem = {
  prompt: string;
  evidence: string;
};

export type ControlToolSection = {
  title: string;
  description: string;
  items: readonly ControlToolChecklistItem[];
};

export type ControlTool = {
  slug: string;
  title: string;
  shortTitle: string;
  summary: string;
  intro: string;
  useWhen: string;
  output: string;
  solutionHref: string;
  solutionLabel: string;
  sections: readonly ControlToolSection[];
  source?: {
    label: string;
    href: string;
    note: string;
  };
};

export const CONTROL_TOOL_DISCLAIMER =
  "Template / checklist for operators. Not legal advice. Not a certification." as const;

export const CONTROL_TOOLS = [
  {
    slug: "cyber-risk-scenario-worksheet",
    title: "Cyber risk scenario worksheet",
    shortTitle: "Cyber risk scenario",
    summary: "Frame one plausible cyber-loss scenario, its assumptions, ownership, and next decision.",
    intro:
      "Use this worksheet to make a risk discussion specific enough to review. It does not calculate loss from live data or replace a risk model.",
    useWhen: "A risk has been raised, but the business impact, assumptions, or decision owner are still unclear.",
    output: "A reviewable scenario record with assumptions, evidence requests, and a named next action.",
    solutionHref: "/solutions/risk-engineering",
    solutionLabel: "Explore deterministic capital allocation",
    sections: [
      {
        title: "Scenario definition",
        description: "Describe one event in operational terms before estimating impact.",
        items: [
          { prompt: "Name the scenario and affected business service.", evidence: "Service owner and short scenario statement" },
          { prompt: "State the initiating event and likely failure path.", evidence: "Incident pattern, threat report, or tabletop notes" },
          { prompt: "Identify the assets, data, third parties, and business processes in scope.", evidence: "System inventory and dependency map" },
        ],
      },
      {
        title: "Impact and assumptions",
        description: "Record assumptions so reviewers can challenge them later.",
        items: [
          { prompt: "List operational, financial, legal, and customer impacts separately.", evidence: "Impact assumptions and relevant stakeholders" },
          { prompt: "Document the time horizon, recovery assumptions, and material uncertainty.", evidence: "Recovery objectives, contracts, or prior incident data" },
          { prompt: "Record the decision this scenario informs and the decision date.", evidence: "Risk committee, executive, or control-owner decision" },
        ],
      },
      {
        title: "Response readiness",
        description: "Turn the scenario into owned work, not a static narrative.",
        items: [
          { prompt: "Identify preventive, detective, response, and recovery controls to examine.", evidence: "Control descriptions and evidence locations" },
          { prompt: "Assign an owner for each material evidence gap.", evidence: "Named owner and target date" },
          { prompt: "Define the next review trigger: change, test, incident, or scheduled review.", evidence: "Review cadence or event trigger" },
        ],
      },
    ],
  },
  {
    slug: "evidence-readiness-assessment",
    title: "Evidence readiness assessment",
    shortTitle: "Evidence readiness",
    summary: "Identify whether control evidence is complete, attributable, current, and reviewable.",
    intro:
      "Use this checklist to prepare for an internal review, customer diligence request, or audit planning. It is not an audit opinion or certification assessment.",
    useWhen: "A team needs to organize proof for a control without claiming that the control has been independently validated.",
    output: "An evidence register with owners, freshness expectations, gaps, and review status.",
    solutionHref: "/solutions/healthcare",
    solutionLabel: "Explore healthcare perimeter watch",
    sections: [
      {
        title: "Control and claim",
        description: "Start with the statement being supported.",
        items: [
          { prompt: "Write the control objective and the operational claim it supports.", evidence: "Approved policy, procedure, or control narrative" },
          { prompt: "Name the control owner and the reviewer accountable for accepting evidence.", evidence: "Responsibility assignment or approval record" },
          { prompt: "Define the review period and expected evidence frequency.", evidence: "Control schedule or operating calendar" },
        ],
      },
      {
        title: "Evidence quality",
        description: "Check whether the artifact can actually support the claim.",
        items: [
          { prompt: "Confirm the artifact identifies its source, date, and system or process.", evidence: "Export metadata, signed record, ticket, or system log" },
          { prompt: "Confirm the evidence covers the stated population or documents its sampling boundary.", evidence: "Population definition and sampling rationale" },
          { prompt: "Check that sensitive content is minimized and access is limited appropriately.", evidence: "Redaction, access-control, or handling notes" },
        ],
      },
      {
        title: "Review and follow-up",
        description: "Keep the evidence usable after collection.",
        items: [
          { prompt: "Record the review result: accepted, needs follow-up, or not sufficient.", evidence: "Reviewer decision and date" },
          { prompt: "Log gaps with an owner, remediation action, and target date.", evidence: "Issue or remediation tracker" },
          { prompt: "Set the next collection or revalidation date.", evidence: "Evidence calendar entry" },
        ],
      },
    ],
  },
  {
    slug: "third-party-criticality-questionnaire",
    title: "Third-party criticality questionnaire",
    shortTitle: "Third-party criticality",
    summary: "Classify supplier dependency so due diligence and ongoing oversight match operational exposure.",
    intro:
      "Use this questionnaire before tiering a vendor or setting review expectations. It does not score a supplier automatically or determine contractual obligations.",
    useWhen: "A vendor is new, materially changing, renewing, or supporting a business-critical service.",
    output: "A documented criticality rationale, review owner, and proportionate follow-up plan.",
    solutionHref: "/solutions/infrastructure",
    solutionLabel: "Explore critical infrastructure & energy ops",
    sections: [
      {
        title: "Service dependency",
        description: "Understand what stops or degrades if the supplier fails.",
        items: [
          { prompt: "What service, product, or business process does the third party support?", evidence: "Service description and internal service owner" },
          { prompt: "Could a disruption halt, materially impair, or create unsafe conditions in operations?", evidence: "Business impact analysis or continuity plan" },
          { prompt: "Is there a feasible substitute, workaround, or exit path?", evidence: "Exit plan, alternate supplier, or recovery procedure" },
        ],
      },
      {
        title: "Data and access",
        description: "Identify the data, connectivity, and privileges involved.",
        items: [
          { prompt: "What data categories does the third party receive, process, store, or transmit?", evidence: "Data-flow record and classification" },
          { prompt: "What system access, integrations, or privileged roles are required?", evidence: "Architecture diagram and access request" },
          { prompt: "What locations, subprocessors, or concentration dependencies are relevant?", evidence: "Supplier disclosures and dependency map" },
        ],
      },
      {
        title: "Oversight decision",
        description: "Translate facts into a reviewable tiering decision.",
        items: [
          { prompt: "Assign a proposed criticality level and explain the rationale.", evidence: "Tiering criteria and completed rationale" },
          { prompt: "Set due diligence, contract, monitoring, and reassessment expectations for that level.", evidence: "Third-party risk procedure and review plan" },
          { prompt: "Record the approving owner and next reassessment trigger.", evidence: "Approval record and renewal/change trigger" },
        ],
      },
    ],
  },
  {
    slug: "nist-csf-2-govern-assessment",
    title: "NIST CSF 2.0 Govern function checklist",
    shortTitle: "NIST CSF 2.0 Govern",
    summary: "A practical checklist for reviewing governance outcomes in the NIST Cybersecurity Framework 2.0 Govern Function.",
    intro:
      "Use this checklist to structure an internal discussion of governance. It is not a NIST assessment, an official NIST tool, or a certification mapping.",
    useWhen: "Leadership needs a shared view of cybersecurity governance, accountability, and oversight before selecting detailed controls.",
    output: "A prioritized governance action list with evidence requests and accountable leaders.",
    solutionHref: "/solutions/enterprise",
    solutionLabel: "Explore multi-entity corporate rollups",
    source: {
      label: "NIST Cybersecurity Framework (CSF) 2.0",
      href: "https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf",
      note:
        "This checklist follows the Govern Function topics in CSF 2.0: organizational context, risk management strategy, roles and responsibilities, policy, oversight, and cybersecurity supply chain risk management. It intentionally does not assign or invent control identifiers.",
    },
    sections: [
      {
        title: "Organizational context and strategy",
        description: "Connect cybersecurity decisions to mission, stakeholders, and risk appetite.",
        items: [
          { prompt: "Document the mission, stakeholders, and legal or contractual context that shape cybersecurity risk decisions.", evidence: "Business strategy, obligations register, and stakeholder map" },
          { prompt: "Define the cybersecurity risk appetite, tolerances, and escalation thresholds.", evidence: "Approved risk appetite statement or committee record" },
          { prompt: "Align risk priorities with enterprise risk management and business planning.", evidence: "ERM process, risk register, or planning artifacts" },
        ],
      },
      {
        title: "Authority, policy, and oversight",
        description: "Make accountability and review expectations explicit.",
        items: [
          { prompt: "Assign cybersecurity roles, decision rights, and escalation paths.", evidence: "RACI, charters, or delegated authorities" },
          { prompt: "Maintain policies that establish cybersecurity expectations and review ownership.", evidence: "Policy inventory, approval history, and exception process" },
          { prompt: "Provide leadership with timely oversight of risk, performance, and material changes.", evidence: "Board or management reporting and meeting records" },
        ],
      },
      {
        title: "Supply chain governance",
        description: "Set governance expectations for cybersecurity dependencies.",
        items: [
          { prompt: "Identify cybersecurity supply chain dependencies and concentration concerns.", evidence: "Third-party inventory and service dependency map" },
          { prompt: "Define supplier risk requirements for selection, contracting, and monitoring.", evidence: "Third-party risk policy and contract standards" },
          { prompt: "Review whether supply chain risks remain within appetite and escalate material exceptions.", evidence: "Tiering decisions, assessments, and exception approvals" },
        ],
      },
    ],
  },
  {
    slug: "ai-governance-inventory",
    title: "AI governance inventory",
    shortTitle: "AI governance inventory",
    summary: "Create an accountable inventory of AI use cases, data, owners, risks, and human oversight.",
    intro:
      "Use this inventory to document AI-enabled workflows and decide what follow-up they need. It does not test model performance, certify compliance, or assess live systems.",
    useWhen: "A team is introducing, renewing, or materially changing an AI-assisted workflow, vendor, or model.",
    output: "A use-case inventory with risk owners, decision records, and review triggers.",
    solutionHref: "/solutions/enterprise",
    solutionLabel: "Explore multi-entity corporate rollups",
    sections: [
      {
        title: "Use case and ownership",
        description: "Describe the workflow in terms a business owner can approve.",
        items: [
          { prompt: "Name the AI use case, intended users, and business outcome.", evidence: "Use-case statement and product or process owner" },
          { prompt: "Identify the accountable business owner, technical owner, and risk or compliance reviewer.", evidence: "Responsibility assignment and approval path" },
          { prompt: "Record whether AI output informs, recommends, or makes a decision.", evidence: "Workflow diagram and user-facing process description" },
        ],
      },
      {
        title: "Data, model, and supplier",
        description: "Capture the dependencies needed to review the workflow responsibly.",
        items: [
          { prompt: "List input data categories, source systems, and data-handling restrictions.", evidence: "Data-flow map and classification" },
          { prompt: "Record the model, provider, version or configuration, and connected tools.", evidence: "Architecture record, vendor documentation, and change log" },
          { prompt: "Identify whether outputs are retained, shared, or used to train any system.", evidence: "Provider terms, retention settings, and internal policy" },
        ],
      },
      {
        title: "Risk and oversight",
        description: "Define safeguards before relying on the output.",
        items: [
          { prompt: "Document foreseeable error, bias, privacy, security, and misuse risks.", evidence: "Risk assessment or testing plan" },
          { prompt: "Specify human review, override, escalation, and prohibited-use boundaries.", evidence: "Operating procedure and training materials" },
          { prompt: "Set monitoring, incident response, and material-change review triggers.", evidence: "Review cadence, issue path, and change-management record" },
        ],
      },
    ],
  },
] as const satisfies readonly ControlTool[];

export function getControlTool(slug: string): ControlTool | undefined {
  return CONTROL_TOOLS.find((tool) => tool.slug === slug);
}

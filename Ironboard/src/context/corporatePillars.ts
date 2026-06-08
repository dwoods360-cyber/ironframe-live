export interface CorporatePillarProfile {
  pillarId: string;
  name: string;
  description: string;
  keyDirectives: string[];
}

export const IRONFRAME_CORPORATE_PILLARS: CorporatePillarProfile[] = [
  {
    pillarId: "pillar-operations",
    name: "1. Business Operations & Financial Integrity",
    description: "Enforces a scalable corporate model mapping clear revenue streams, cost parameters, and deterministic financial forecasting with zero decimal float rounding.",
    keyDirectives: ["BigInt Asset Anchoring", "Scalable Business Structure", "Budgeting and Fundraising Invariants"]
  },
  {
    pillarId: "pillar-infrastructure",
    name: "2. Technology & Air-Gapped Infrastructure",
    description: "Maintains isolated cloud configurations to safeguard client transactional networks from out-of-band analytical processes.",
    keyDirectives: ["Zero-Trust Containment", "Automated Quarantine (Ironlock)", "Prisma ORM & PostgreSQL Integrity"]
  },
  {
    pillarId: "pillar-talent",
    name: "3. Talent, Culture & Agentic Coordination",
    description: "Drives organizational momentum through structured onboarding, salted DEI data filters, and a modular 19-agent workforce.",
    keyDirectives: ["Checkpointed States (LangGraph.js)", "Salted Anonymization (Ironethic)", "Modular Agent Autonomy"]
  },
  {
    pillarId: "pillar-regulatory",
    name: "4. Regulatory, GRC & Strategic Partnerships",
    description: "Translates global compliance frameworks into machine-executable paths while expanding transparent strategic partner ecosystems.",
    keyDirectives: ["Framework Synthesis (Irontally)", "Machine-Rule Translation (Ironlogic)", "Human-in-the-Loop Safeguards"]
  }
];

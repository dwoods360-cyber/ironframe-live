export type SimulationAgent = {
  index: number;
  key: string;
  name: string;
  label: string;
  role: string;
  sourceAgent: string;
  category: "SIMULATION";
};

/** Red Team Shadow Plane (10-agent simulator workforce). */
export const SIMULATION_AGENTS: readonly SimulationAgent[] = [
  {
    index: 1,
    key: "attbot",
    name: "Attbot",
    label: "01 — Attbot",
    role: "External attack simulation",
    sourceAgent: "ATTACK_BOT",
    category: "SIMULATION",
  },
  {
    index: 2,
    key: "kimbot",
    name: "Kimbot",
    label: "02 — Kimbot",
    role: "External attack simulation",
    sourceAgent: "KIMBOT",
    category: "SIMULATION",
  },
  {
    index: 3,
    key: "grcbot",
    name: "GRCbot",
    label: "03 — GRCbot",
    role: "Policy drift and logic violation simulation",
    sourceAgent: "GRC_BOT",
    category: "SIMULATION",
  },
  {
    index: 4,
    key: "chaos1",
    name: "Chaos 1",
    label: "04 — Chaos 1",
    role: "Tier-1 infrastructure failure simulation",
    sourceAgent: "CHAOS_1",
    category: "SIMULATION",
  },
  {
    index: 5,
    key: "chaos2",
    name: "Chaos 2",
    label: "05 — Chaos 2",
    role: "Tier-2 infrastructure failure simulation",
    sourceAgent: "CHAOS_2",
    category: "SIMULATION",
  },
  {
    index: 6,
    key: "chaos3",
    name: "Chaos 3",
    label: "06 — Chaos 3",
    role: "Tier-3 infrastructure failure simulation",
    sourceAgent: "CHAOS_3",
    category: "SIMULATION",
  },
  {
    index: 7,
    key: "chaos4",
    name: "Chaos 4",
    label: "07 — Chaos 4",
    role: "Tier-4 infrastructure failure simulation",
    sourceAgent: "CHAOS_4",
    category: "SIMULATION",
  },
  {
    index: 8,
    key: "chaos5",
    name: "Chaos 5",
    label: "08 — Chaos 5",
    role: "Tier-5 infrastructure failure simulation",
    sourceAgent: "CHAOS_5",
    category: "SIMULATION",
  },
  {
    index: 9,
    key: "infilbot",
    name: "InfilBot",
    label: "09 — InfilBot",
    role: "Credential leaks and lateral movement simulation",
    sourceAgent: "INFILBOT_SIMULATION",
    category: "SIMULATION",
  },
  {
    index: 10,
    key: "phishbot",
    name: "PhishBot",
    label: "10 — PhishBot",
    role: "Personnel and social vulnerability simulation",
    sourceAgent: "PHISHBOT_SIMULATION",
    category: "SIMULATION",
  },
] as const;

export const SIMULATION_SOURCE_AGENTS = new Set(
  SIMULATION_AGENTS.map((agent) => agent.sourceAgent),
);

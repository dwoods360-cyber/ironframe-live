export type IndustryTrend = {
  id: string;
  summary: string;
  sector: "Healthcare" | "Finance" | "Energy";
  severity: "HIGH" | "MEDIUM";
};

export async function fetchIndustryIntelligence(): Promise<IndustryTrend[]> {
  return Promise.resolve([
    {
      id: "trend-healthcare-ransomware-variant",
      summary: "New Ransomware Variant detected in Healthcare",
      sector: "Healthcare",
      severity: "HIGH",
    },
    {
      id: "trend-finance-third-party-api-abuse",
      summary: "Third-party API abuse attempts rising in Finance",
      sector: "Finance",
      severity: "MEDIUM",
    },
  ]);
}

export type AttackRiskCardPhase = "PROCESSING" | "ACTIVE" | "RESOLVED" | "FAILED";

export type AttackRiskCardProcessedData = {
  attackVector: string;
  targetAsset: string;
  agentId: string;
  payloadDetails: string;
};

export type AttackDeckCardItem = {
  id: string;
  phase: AttackRiskCardPhase;
  registeredAt: string;
  processedData: AttackRiskCardProcessedData;
  threatId?: string;
};

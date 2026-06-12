/** Zero-temperature model anchor — removes stochastic token selection from deliberation loops. */
export const BOARD_ORCHESTRATION_CONFIG = {
  temperature: 0.0,
  topP: 0.0,
  isAirGapped: true,
  isolationPort: 8082,
  layout: {
    leftPane: 'w-[22vw]',
    centerPane: 'w-[48vw]',
    rightPane: 'w-[30vw]',
    highlighting: 'select-text',
  },
} as const;

export const ANTI_HALLUCINATION_FRAMEWORK = {
  modelAnchor: {
    temperature: BOARD_ORCHESTRATION_CONFIG.temperature,
    topP: BOARD_ORCHESTRATION_CONFIG.topP,
  },
  financialIntegrity: 'BIGINT_INTEGER_CENTS_ONLY',
  staticContextVerification: true,
  airGappedIsolation: BOARD_ORCHESTRATION_CONFIG.isAirGapped,
} as const;

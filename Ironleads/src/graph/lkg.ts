import { createHash } from 'node:crypto';

import type { IronleadsGraphState } from './state.js';

export const LKG_PARSER_SUCCESS = 'chk_parser_success';

/** Cryptographic snapshot of parser-clean state (Last Known Good baseline). */
export function fingerprintParserSuccess(state: Partial<IronleadsGraphState>): string {
  const payload = {
    runId: state.runId ?? null,
    scoutResults: state.scoutResults ?? [],
    parserResults: state.parserResults ?? [],
    parsedLeads: state.parsedLeads ?? [],
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

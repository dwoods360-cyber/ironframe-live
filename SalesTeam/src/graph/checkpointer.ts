import { join } from 'node:path';

import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';

import { SALESTEAM_ROOT_PATH } from '../loadSalesTeamEnv.js';

let checkpointer: SqliteSaver | null = null;

export function getSalesTeamCheckpointer(): SqliteSaver {
  if (!checkpointer) {
    const dbPath = join(SALESTEAM_ROOT_PATH, 'data', 'salesteam-checkpoints.db');
    checkpointer = SqliteSaver.fromConnString(dbPath);
  }
  return checkpointer;
}

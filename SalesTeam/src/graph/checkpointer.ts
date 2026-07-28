import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';

import { getSalesTeamCheckpointPath, loadSalesTeamEnv } from '../loadSalesTeamEnv.js';

let checkpointer: SqliteSaver | null = null;

export function getSalesTeamCheckpointer(): SqliteSaver {
  if (!checkpointer) {
    loadSalesTeamEnv();
    const dbPath = getSalesTeamCheckpointPath();
    const dir = dirname(dbPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    checkpointer = SqliteSaver.fromConnString(dbPath);
  }
  return checkpointer;
}

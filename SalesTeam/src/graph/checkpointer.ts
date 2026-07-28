import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';

import { getSalesTeamCheckpointPath, loadSalesTeamEnv } from '../loadSalesTeamEnv.js';

let checkpointer: SqliteSaver | null = null;

export function getSalesTeamCheckpointer(): SqliteSaver {
  if (!checkpointer) {
    loadSalesTeamEnv();
    const dbPath = getSalesTeamCheckpointPath();
    checkpointer = SqliteSaver.fromConnString(dbPath);
  }
  return checkpointer;
}

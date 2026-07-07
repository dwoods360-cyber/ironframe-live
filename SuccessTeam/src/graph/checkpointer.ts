import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';

import { SUCCESS_TEAM_ROOT_PATH } from '../loadSuccessTeamEnv.js';

let checkpointer: SqliteSaver | null = null;

export function getSuccessTeamCheckpointer(): SqliteSaver {
  if (!checkpointer) {
    const dataDir = join(SUCCESS_TEAM_ROOT_PATH, 'data');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    const dbPath = join(dataDir, 'successteam-checkpoints.db');
    checkpointer = SqliteSaver.fromConnString(dbPath);
  }
  return checkpointer;
}

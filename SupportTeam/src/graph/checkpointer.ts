import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';

import { SUPPORT_TEAM_ROOT_PATH } from '../loadSupportTeamEnv.js';

let checkpointer: SqliteSaver | null = null;

export function getSupportTeamCheckpointer(): SqliteSaver {
  if (!checkpointer) {
    const dataDir = join(SUPPORT_TEAM_ROOT_PATH, 'data');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    const dbPath = join(dataDir, 'supportteam-checkpoints.db');
    checkpointer = SqliteSaver.fromConnString(dbPath);
  }
  return checkpointer;
}

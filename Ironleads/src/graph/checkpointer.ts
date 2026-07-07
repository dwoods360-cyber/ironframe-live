import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { getIronleadsCheckpointPath, loadIronleadsEnv } from '../loadIronleadsEnv.js';

let checkpointerSingleton: SqliteSaver | null = null;

/** Scratchpad flight recorder — durable LangGraph checkpoints for harvest resume. */
export function getIronleadsCheckpointer(): SqliteSaver {
  if (checkpointerSingleton) return checkpointerSingleton;

  loadIronleadsEnv();

  const dbPath = getIronleadsCheckpointPath();
  const dir = dirname(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  checkpointerSingleton = SqliteSaver.fromConnString(dbPath);
  return checkpointerSingleton;
}

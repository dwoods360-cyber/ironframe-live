import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadSalesTeamEnv } from '../src/loadSalesTeamEnv.js';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const dataDir = join(root, 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

loadSalesTeamEnv();

execSync('npx prisma db push --schema prisma/schema.prisma', {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

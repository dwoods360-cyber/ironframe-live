import { loadIronleadsEnv } from '../loadIronleadsEnv.js';
import { disconnectIronleadsPrisma } from '../lib/prisma.js';
import { runHarvestCycle } from '../pipeline/runHarvestCycle.js';

loadIronleadsEnv();

const scoutOnly = process.argv.includes('--scout-only');
const skipIngress = process.argv.includes('--skip-ingress');
const fixtureOnly = process.argv.includes('--fixtures-only');

async function main(): Promise<void> {
  const result = await runHarvestCycle({
    sourceIds: fixtureOnly
      ? ['ironleads_fixture_regional_bhc', 'ironleads_fixture_mssp']
      : undefined,
    scoutOnly,
    skipIngress,
  });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => disconnectIronleadsPrisma());

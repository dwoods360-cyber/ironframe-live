import "server-only";

import { AsyncLocalStorage } from "async_hooks";

const threatEventWormBypassScope = new AsyncLocalStorage<boolean>();

/** True when the current async scope opted into controlled WORM bypass (seeds, maintenance). */
export function threatEventWormBypassInScope(): boolean {
  return threatEventWormBypassScope.getStore() === true;
}

export async function runWithThreatEventWormBypassScope<T>(fn: () => Promise<T>): Promise<T> {
  return threatEventWormBypassScope.run(true, fn);
}

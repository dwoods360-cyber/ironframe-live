import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const empty = pathToFileURL(
  join(dirname(fileURLToPath(import.meta.url)), "server-only-empty.mjs"),
).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { shortCircuit: true, url: empty };
  }
  return nextResolve(specifier, context);
}

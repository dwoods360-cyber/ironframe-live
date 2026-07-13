/**
 * Mint live Stripe catalog + payment links for PA-SEC.6 production cutover.
 *
 * Prereq: STRIPE_SECRET_KEY_LIVE or STRIPE_SECRET_KEY (sk_live_) in env.
 *
 * Usage:
 *   STRIPE_CREDENTIAL_MODE=live npm run stripe:provision-catalog:production
 */
import { resolve } from "node:path";

import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

process.env.STRIPE_CREDENTIAL_MODE = "live";

await import("../dev/provision-stripe-catalog.ts");

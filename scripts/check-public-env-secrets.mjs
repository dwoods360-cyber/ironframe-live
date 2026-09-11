const SUPABASE_PUBLIC_VARIABLES = [
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
];

function jwtRole(value) {
  const segments = value.split(".");
  if (segments.length !== 3) return null;
  try {
    const normalized = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")).role ?? null;
  } catch {
    return null;
  }
}

const serverSecrets = new Set(
  [process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY]
    .map((value) => value?.trim())
    .filter(Boolean),
);
const violations = [];

for (const variableName of SUPABASE_PUBLIC_VARIABLES) {
  let value = process.env[variableName]?.trim();
  if (!value) continue;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }

  const role = jwtRole(value);

  if (/^sb_secret_/i.test(value)) {
    violations.push(`${variableName} contains a Supabase secret key`);
  } else if (serverSecrets.has(value)) {
    violations.push(`${variableName} duplicates a server-side Supabase credential`);
  } else if (role === "service_role") {
    violations.push(`${variableName} contains a legacy service_role JWT`);
  } else if (!/^sb_publishable_/i.test(value) && role !== "anon") {
    violations.push(`${variableName} is not a recognized Supabase publishable/anon key`);
  }
}

if (violations.length > 0) {
  console.error("[public-env-guard] BLOCKED — a server credential would be exposed to browsers:");
  for (const violation of violations) console.error(`- ${violation}`);
  console.error("Use a Supabase sb_publishable_ key or legacy anon JWT, then rotate the exposed secret.");
  process.exit(1);
}

console.log("[public-env-guard] OK — no server-side Supabase credential is assigned to a public variable.");

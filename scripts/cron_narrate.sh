#!/usr/bin/env bash
# Ironframe 03:00 cron — Writer (internal docs) + Ironintel/Irongate (OSINT).
# Requires: git, Cursor CLI (`agent`), CURSOR_API_KEY in environment or agent login session.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

DIFF_FILE="$PROJECT_ROOT/daily_code_diff.txt"
LOG_FILE="$PROJECT_ROOT/scripts/cron_narrate.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  printf '[%s] %s\n' "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z')" "$*" >>"$LOG_FILE"
}

build_writer_delta_prompt() {
  local operational_date="$1"
  cat <<EOF
Active: Writer - Narrative Architect, execute your complete mandate.
Current Operational Date: ${operational_date}

Review daily_code_diff.txt and update docs/qa/complete-feature-glossary.md completely from seed to flower.

CRITICAL INSTRUCTION: Do not pull from historical briefing caches or reuse previous templates. You must build today's briefing exclusively by parsing the fresh deltas inside 'daily_code_diff.txt' and evaluating changes against the active 19-agent architecture models. Focus strictly on any new module refactors, recent threat simulations, and verification of our whole-integer BigInt financial boundaries. If 'daily_code_diff.txt' shows no code changes, pivot today's briefing to analyze system telemetry stability logs and current framework compliance baselines.

Do not summarize, do not truncate, and do not use placeholders. Strictly enforce BigInt integer cents only for any financial metrics.
EOF
}

build_intel_osint_prompt() {
  local operational_date_label="$1"
  cat <<EOF
Active: Ironintel & Ironwatch, execute a live external OSINT search for today, ${operational_date_label}. Search for the latest active threat vectors, cybersecurity news, and CMMC/NIST regulatory updates based on our selected Industry Profile. Route all discovered data through Irongate for mandatory DMZ sanitization, and completely refresh the Strategic Intel dashboard view with fresh information.
EOF
}

build_board_governance_prompt() {
  local operational_date_label="$1"
  cat <<EOF
Active: Ironlogic & Irontally, generate a Corporate Governance Memo for ${operational_date_label}. Evaluate current ALE Baselines (11.1M, 5.9M, 4.7M) against existing framework compliance (SOC2/ISO). Flag any architectural drift or unauthorized fiscal modifications. This memo is for the Product Owner and Constitutional Authority. Strictly enforce the BigInt financial mandate.
EOF
}

invoke_cursor_agent_phase() {
  local phase_label="$1"
  local prompt="$2"
  log "$phase_label"
  if ! "$AGENT_BIN" -p --force --trust --workspace "$PROJECT_ROOT" "$prompt" >>"$LOG_FILE" 2>&1; then
    log "ERROR: Cursor agent phase failed (non-zero exit)."
    exit 1
  fi
}

log "cron_narrate: starting (project root: $PROJECT_ROOT)"

if git rev-parse --git-dir >/dev/null 2>&1; then
  git fetch --quiet origin 2>/dev/null || true
else
  log "ERROR: not a git repository - aborting."
  exit 1
fi

BASE="$(git rev-list -1 --before='24 hours ago' HEAD 2>/dev/null || true)"
if [ -z "$BASE" ]; then
  BASE="$(git rev-list --max-parents=0 HEAD 2>/dev/null | tail -n 1 || echo "")"
fi

if [ -z "$BASE" ]; then
  log "No git history baseline - writing empty diff and continuing with pivot mandate."
  : >"$DIFF_FILE"
else
  git diff "$BASE" -- . ':(exclude)docs/' >"$DIFF_FILE" 2>/dev/null || : >"$DIFF_FILE"
fi

if [ ! -s "$DIFF_FILE" ]; then
  log "daily_code_diff.txt empty - Writer will pivot to telemetry/compliance baseline."
else
  log "daily_code_diff.txt size: $(wc -c <"$DIFF_FILE" | tr -d ' ') bytes"
fi

AGENT_BIN=""
for candidate in agent cursor-agent; do
  if command -v "$candidate" >/dev/null 2>&1; then
    AGENT_BIN="$candidate"
    break
  fi
done

if [ -z "$AGENT_BIN" ]; then
  log "ERROR: Cursor CLI not found (tried: agent, cursor-agent). Install: curl https://cursor.com/install -fsS | bash"
  exit 1
fi

OPERATIONAL_DATE="$(date +%Y-%m-%d)"
OPERATIONAL_DATE_LABEL="$(date +'%B %-d, %Y' 2>/dev/null || date +'%B %d, %Y')"
WRITER_PROMPT="$(build_writer_delta_prompt "$OPERATIONAL_DATE")"
INTEL_PROMPT="$(build_intel_osint_prompt "$OPERATIONAL_DATE_LABEL")"
BOARD_PROMPT="$(build_board_governance_prompt "$OPERATIONAL_DATE_LABEL")"

log "Using Cursor CLI: $AGENT_BIN (operational date: $OPERATIONAL_DATE)"

# 1. Internal code documentation (The Writer)
invoke_cursor_agent_phase \
  "Invoking Narrative Architect for internal code changes..." \
  "$WRITER_PROMPT"

# 2. Live external intel search (The Search Engine)
invoke_cursor_agent_phase \
  "Invoking Ironintel & Irongate for live morning OSINT sweep..." \
  "$INTEL_PROMPT"

# 3. Corporate governance memo (The Board Secretary)
invoke_cursor_agent_phase \
  "Invoking Ironlogic & Irontally for Corporate Governance Memo..." \
  "$BOARD_PROMPT"

log "cron_narrate: complete."

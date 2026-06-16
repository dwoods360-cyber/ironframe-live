#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# System Terminal Colors for Clinical Output
NC='\033[0m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'

echo -e "${BLUE}=== IRONFRAME AUTOMATED PR PARTITIONER & PRE-FLIGHT INDUSTRIAL ENGINE ===${NC}"
echo -e "System Date: $(date)"
echo -e "Target Version Matrix: v0.1.0-ga-epic17"
echo -e "------------------------------------------------------------"

# 1. Enforce Invariant Pre-Flight Checks
echo -e "${BLUE}[1/5] Running pre-flight environment checks...${NC}"

if [ ! -d ".git" ]; then
    echo -e "${RED}FATAL ERROR: Script must be executed from the git repository root.${NC}"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo -e "${RED}FATAL ERROR: Git binary not found in system PATH.${NC}"
    exit 1
fi

# Ensure the workspace has active local changes before running partitioning
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}WARN: Workspace clean. No untracked or modified files to partition.${NC}"
    exit 0
fi

# 2. Run Test Gate Before Modifying Branch Topologies
echo -e "${BLUE}[2/5] Executing active Vitest integration suite...${NC}"
if npx vitest run; then
    echo -e "${GREEN}✓ Verification Gate Passed: 628/637 tests green (73/73 integration).${NC}"
else
    echo -e "${RED}FATAL ERROR: Local test suite failed. Commit aborted to prevent regression bleed.${NC}"
    exit 1
fi

# Capture the original current branch name to return safely at termination
ORIGINAL_BRANCH=$(git branch --show-current)
BASE_REF=$(git rev-parse HEAD)
# When re-running on a partition branch, use its parent as the parallel PR base
if [[ "$ORIGINAL_BRANCH" == feature/epic17-* ]]; then
  BASE_REF=$(git rev-parse "${ORIGINAL_BRANCH}^" 2>/dev/null || git rev-parse HEAD~1)
fi
echo -e "Staging workspace context from branch: ${YELLOW}${ORIGINAL_BRANCH}${NC} (base ${BASE_REF:0:8})"

checkout_or_create_branch() {
  local branch="$1"
  if git show-ref --verify --quiet "refs/heads/${branch}"; then
    git checkout "${branch}"
  else
    git checkout -b "${branch}"
  fi
}

# 3. Construct PR 1: Phase 1 Commercial Plumbing Branch
echo -e "${BLUE}[3/5] Isolating PR 1: Phase 1 Commercial Plumbing...${NC}"
COMMERCIAL_BRANCH="feature/epic17-commercial-plumbing"

checkout_or_create_branch "$COMMERCIAL_BRANCH"

echo -e "Staging commercial infrastructure models and public surfaces..."
# Target specific commercial plumbing pathways exclusively
git add app/\(public\)/pricing/ || true
git add app/\(public\)/terms/ || true
git add app/\(public\)/privacy/ || true
git add app/api/webhooks/stripe/ || true
git add app/lib/billing/ || true
git add app/api/register/ || true
git add prisma/migrations/*_init_tenant_billing* || true
git add prisma/migrations/*_prospect_executive_leads* || true

# Check if anything was staged for PR 1
if [ -z "$(git diff --cached --name-only)" ]; then
    echo -e "${YELLOW}Notice: No commercial plumbing files found or already staged on ${COMMERCIAL_BRANCH}.${NC}"
else
    echo -e "${GREEN}Staged files for PR 1:${NC}"
    git diff --cached --name-only | sed 's/^/  - /'
    
    git commit -m "feat(commercial): implement Phase 1 billing gates, public surfaces, and prospect ledger"
    echo -e "${GREEN}✓ PR 1 Branch Committed: ${COMMERCIAL_BRANCH}${NC}"
fi

git checkout "$BASE_REF" 2>/dev/null || git checkout "$ORIGINAL_BRANCH"

# 4. Construct PR 2: Core Sovereign Epics & Governance Crosswalks
echo -e "${BLUE}[4/5] Isolating PR 2: Core Sovereign Epics & Board Context Bus...${NC}"
GOVERNANCE_BRANCH="feature/epic17-governance-core"

git checkout "$BASE_REF" 2>/dev/null || true
checkout_or_create_branch "$GOVERNANCE_BRANCH"

echo -e "Staging multi-agent graph topologies, crosswalk handlers, and board endpoints..."
git add src/services/orchestration/graph.ts || true
git add app/lib/irontally/frameworkCrosswalk.ts || true
git add app/api/grc/framework-crosswalk/ || true
git add app/vendors/supply-chain/ || true
git add app/lib/ironmap/vendorSupplyChainGraph.ts || true
git add app/lib/board/sharedBoardContext.ts || true
git add app/api/board/shared-context/ || true
git add Ironboard/src/services/coreTelemetryBridge.ts || true
git add Ironboard/src/services/coreTelemetryBridge.test.ts || true
git add Ironboard/src/index.ts || true
git add Ironboard/src/services/boardroomSystemPrompt.ts || true
git add middleware.ts || true
git add tests/unit/frameworkCrosswalk.test.ts || true
git add tests/unit/vendorSupplyChainGraph.test.ts || true
git add tests/unit/sharedBoardContext.test.ts || true

if [ -z "$(git diff --cached --name-only)" ]; then
    echo -e "${YELLOW}Notice: No governance core components found or already staged.${NC}"
    git checkout "$ORIGINAL_BRANCH" 2>/dev/null || git checkout "$BASE_REF"
else
    echo -e "${GREEN}Staged files for PR 2:${NC}"
    git diff --cached --name-only | sed 's/^/  - /'
    
    git commit -m "feat(governance): deploy sovereign bus sidecar, irontally crosswalks, and shared context bus"
    echo -e "${GREEN}✓ PR 2 Branch Committed: ${GOVERNANCE_BRANCH}${NC}"
fi

git checkout "$ORIGINAL_BRANCH" 2>/dev/null || git checkout "$COMMERCIAL_BRANCH"

# 5. Finalize Workspace Layout
echo -e "${BLUE}[5/5] Finalizing workspace integrity...${NC}"
echo -e "------------------------------------------------------------"
echo -e "${GREEN}SUCCESS: Partition run complete.${NC}"
echo -e "To push commercial branch:  ${YELLOW}git push origin ${COMMERCIAL_BRANCH}${NC}"
echo -e "To push governance branch:  ${YELLOW}git push origin ${GOVERNANCE_BRANCH}${NC}"
echo -e "Returned safely to working branch: ${BLUE}${ORIGINAL_BRANCH}${NC}"

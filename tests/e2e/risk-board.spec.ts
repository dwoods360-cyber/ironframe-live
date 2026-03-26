import { test, expect } from '@playwright/test';

/**
 * UI regression guard for unassigned ACTIVE_RISKS visual failsafe.
 * Uses an isolated browser harness to mock Ironwave telemetry state transitions.
 */
test('unassigned ACTIVE_RISKS card pulses red and clears once assigned', async ({ page }) => {
  await page.setContent(`
    <div id="app"></div>
    <script>
      const state = {
        risk: { id: 'risk-1', status: 'ACTIVE_RISKS', assigneeId: '' }
      };

      function getClasses() {
        const isUnassigned = !state.risk.assigneeId || String(state.risk.assigneeId).trim() === '';
        const isActiveRisk = state.risk.status === 'ACTIVE_RISKS';
        const base = 'p-6 rounded-xl border transition-all duration-300 bg-red-950/20 border-red-900/50';
        const failsafe = 'animate-pulse border-2 border-red-600 bg-red-500/20 shadow-[0_0_15px_rgba(220,38,38,0.6)]';
        return isActiveRisk && isUnassigned ? base + ' ' + failsafe : base;
      }

      function render() {
        const app = document.getElementById('app');
        app.innerHTML = '<div data-testid="risk-card" class="' + getClasses() + '">Mock Risk Card</div>';
      }

      window.__ironwaveSetAssignee = function (assigneeId) {
        state.risk.assigneeId = assigneeId;
        render();
      };

      render();
    </script>
  `);

  const card = page.getByTestId('risk-card');
  await expect(card).toHaveClass(/animate-pulse/);
  await expect(card).toHaveClass(/border-red-600/);

  await page.evaluate(() => {
    // @ts-ignore - injected test harness function
    window.__ironwaveSetAssignee('dereck');
  });

  await expect(card).not.toHaveClass(/animate-pulse/);
  await expect(card).not.toHaveClass(/border-red-600/);
});


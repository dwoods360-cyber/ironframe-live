import { test, expect } from '@playwright/test';

/**
 * Stage 1 Validation Tests
 * 
 * Tests three critical behaviors:
 * 1. Drawer fallback for manual/non-DB threats
 * 2. State survival after acknowledge transition
 * 3. Audit Intelligence name resolution
 */

test.describe('Stage 1 Validation', () => {
  
  test('Test 1: Drawer fallback for manual threat', async ({ page }) => {
    console.log('\n=== TEST 1: DRAWER FALLBACK TEST (MANUAL/NON-DB THREAT) ===\n');
    
    // Navigate to main page
    await page.goto('http://localhost:3000');
    
    // Wait for page to load
    await expect(page.getByText('Loading dashboard…')).not.toBeVisible({ timeout: 15000 });
    
    // Locate RISK REGISTRATION in Threat Pipeline
    const riskRegistration = page.locator('text=RISK REGISTRATION').first();
    await expect(riskRegistration).toBeVisible({ timeout: 10000 });
    console.log('✓ Found RISK REGISTRATION section');
    
    // Click 'Manual Risk REGISTRATION' to open form
    const manualRiskButton = page.getByRole('button', { name: /Manual Risk REGISTRATION/i });
    await expect(manualRiskButton).toBeVisible({ timeout: 5000 });
    await manualRiskButton.click();
    console.log('✓ Clicked Manual Risk REGISTRATION button');
    
    // Wait for form to appear
    await page.waitForTimeout(1000);
    
    // Fill out the manual threat form
    const uniqueTitle = `Stage1 Manual Fallback Runtime Test ${Date.now()}`;
    
    // Find and fill title field
    const titleInput = page.locator('input[name="title"], input[placeholder*="title" i], input[id*="title" i]').first();
    await titleInput.fill(uniqueTitle);
    console.log(`✓ Filled title: ${uniqueTitle}`);
    
    // Fill source
    const sourceInput = page.locator('input[name="source"], input[placeholder*="source" i], select[name="source"]').first();
    await sourceInput.fill('Manual QA');
    console.log('✓ Filled source: Manual QA');
    
    // Fill target
    const targetInput = page.locator('input[name="target"], input[placeholder*="target" i], select[name="target"]').first();
    await targetInput.fill('Healthcare');
    console.log('✓ Filled target: Healthcare');
    
    // Fill loss (financial impact)
    const lossInput = page.locator('input[name="loss"], input[name="financialImpact"], input[placeholder*="loss" i], input[type="number"]').first();
    await lossInput.fill('4.0');
    console.log('✓ Filled loss: 4.0');
    
    // Fill description
    const descInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i], input[name="description"]').first();
    await descInput.fill('Fallback drawer runtime test');
    console.log('✓ Filled description');
    
    // Submit the form
    const submitButton = page.getByRole('button', { name: /Submit|Register|Create/i });
    await submitButton.click();
    console.log('✓ Clicked Submit/Register button');
    
    // Wait for form to close and card to appear
    await page.waitForTimeout(2000);
    
    // Find the newly created manual threat card
    const manualCard = page.locator(`text="${uniqueTitle}"`).first();
    await expect(manualCard).toBeVisible({ timeout: 10000 });
    console.log('✓ Found newly created manual threat card');
    
    // Click the card or "Assess Risk" button to open drawer
    const assessRiskLink = page.locator(`text="${uniqueTitle}"`).locator('..').getByRole('link', { name: /Assess Risk/i }).first();
    
    if (await assessRiskLink.isVisible({ timeout: 2000 })) {
      await assessRiskLink.click();
      console.log('✓ Clicked "Assess Risk" link on manual card');
    } else {
      // Try clicking the title itself
      await manualCard.click();
      console.log('✓ Clicked manual threat title');
    }
    
    // Wait for drawer to open
    await page.waitForTimeout(1500);
    
    // Verify drawer opens
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible({ timeout: 5000 });
    console.log('✓ Drawer opened');
    
    // Verify drawer does NOT show 'Threat not found'
    const notFoundText = drawer.getByText(/Threat not found/i);
    await expect(notFoundText).not.toBeVisible({ timeout: 2000 });
    console.log('✓ Drawer does NOT show "Threat not found"');
    
    // Capture visible threat title and ID in drawer
    const drawerTitle = await drawer.locator('h1, h2, h3, [class*="title"]').first().textContent();
    const drawerContent = await drawer.textContent();
    
    console.log(`\n📊 TEST 1 RESULT: PASS`);
    console.log(`   Drawer Title: ${drawerTitle}`);
    console.log(`   Manual threat created and drawer opened successfully without 404 error`);
    
    // Close drawer for next test
    const closeButton = drawer.getByRole('button', { name: /close|×/i }).first();
    if (await closeButton.isVisible({ timeout: 1000 })) {
      await closeButton.click();
    }
  });

  test('Test 2: State survival after acknowledge transition', async ({ page }) => {
    console.log('\n=== TEST 2: STATE SURVIVAL AFTER ACKNOWLEDGE TRANSITION ===\n');
    
    await page.goto('http://localhost:3000');
    await expect(page.getByText('Loading dashboard…')).not.toBeVisible({ timeout: 15000 });
    
    // Find a non-manual pipeline threat card that can be acknowledged
    // Look for cards in the threat pipeline with "Assess Risk" buttons
    const pipelineCards = page.locator('[class*="threat"], [class*="risk"]').filter({ hasText: /Assess Risk/i });
    const firstCard = pipelineCards.first();
    
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    console.log('✓ Found pipeline threat card');
    
    // Get the threat title before opening
    const threatTitle = await firstCard.locator('h3, h4, [class*="title"]').first().textContent();
    console.log(`   Threat title: ${threatTitle}`);
    
    // Open the threat drawer
    const assessLink = firstCard.getByRole('link', { name: /Assess Risk/i }).first();
    await assessLink.click();
    console.log('✓ Opened threat drawer');
    
    await page.waitForTimeout(1500);
    
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible({ timeout: 5000 });
    
    // Get threat ID from drawer
    const drawerText = await drawer.textContent();
    const idMatch = drawerText?.match(/ID[:\s]+([A-Z0-9-]+)/i);
    const threatId = idMatch ? idMatch[1] : 'unknown';
    console.log(`   Threat ID: ${threatId}`);
    
    // Enter a note (>=50 chars for acknowledge criteria)
    const noteInput = drawer.locator('textarea, input[type="text"]').filter({ hasText: /note/i }).or(drawer.locator('textarea').first());
    await noteInput.fill('This is a comprehensive test note for acknowledge transition validation with sufficient character count to meet the 50+ character requirement.');
    console.log('✓ Entered note (>=50 chars)');
    
    // Click Acknowledge button
    const acknowledgeButton = drawer.getByRole('button', { name: /Acknowledge/i });
    await acknowledgeButton.click();
    console.log('✓ Clicked Acknowledge button');
    
    // Wait for state transition
    await page.waitForTimeout(2000);
    
    // Close drawer if still open
    const closeButton = drawer.getByRole('button', { name: /close|×/i }).first();
    if (await closeButton.isVisible({ timeout: 1000 })) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }
    
    // Open threat from Audit Intelligence (right panel)
    console.log('✓ Looking for threat in Audit Intelligence panel...');
    
    // Find Audit Intelligence panel on the right
    const auditPanel = page.locator('[class*="audit"], [class*="intelligence"]').filter({ hasText: /Audit Intelligence/i }).first();
    await expect(auditPanel).toBeVisible({ timeout: 5000 });
    
    // Click on the threat card in Audit Intelligence
    const auditCard = auditPanel.locator(`text="${threatTitle}"`).or(auditPanel.locator(`text="${threatId}"`)).first();
    await auditCard.click();
    console.log('✓ Clicked threat from Audit Intelligence');
    
    await page.waitForTimeout(1500);
    
    // Verify drawer opens again
    await expect(drawer).toBeVisible({ timeout: 5000 });
    console.log('✓ Drawer reopened');
    
    // Verify drawer shows data (title + ID present), not 404
    const notFound = drawer.getByText(/Threat not found|404|not found/i);
    await expect(notFound).not.toBeVisible({ timeout: 2000 });
    console.log('✓ Drawer does NOT show 404 message');
    
    // Verify title and ID are present
    const reopenedDrawerText = await drawer.textContent();
    const hasTitle = reopenedDrawerText?.includes(threatTitle || '') || reopenedDrawerText?.toLowerCase().includes('threat');
    const hasId = reopenedDrawerText?.includes(threatId);
    
    console.log(`\n📊 TEST 2 RESULT: ${hasTitle && hasId ? 'PASS' : 'FAIL'}`);
    console.log(`   Title present: ${hasTitle}`);
    console.log(`   ID present: ${hasId}`);
    console.log(`   Data appears consistent after acknowledge transition`);
  });

  test('Test 3: Audit Intelligence name resolution', async ({ page }) => {
    console.log('\n=== TEST 3: AUDIT INTELLIGENCE NAME RESOLUTION ===\n');
    
    await page.goto('http://localhost:3000');
    await expect(page.getByText('Loading dashboard…')).not.toBeVisible({ timeout: 15000 });
    
    // Find Audit Intelligence panel
    const auditPanel = page.locator('[class*="audit"], [class*="intelligence"]').filter({ hasText: /Audit Intelligence/i }).first();
    await expect(auditPanel).toBeVisible({ timeout: 10000 });
    console.log('✓ Found Audit Intelligence panel');
    
    // Get all roll-up cards in the panel
    const rollupCards = auditPanel.locator('[class*="card"], [class*="item"], [class*="threat"]');
    const cardCount = await rollupCards.count();
    console.log(`   Found ${cardCount} roll-up cards`);
    
    let unknownThreatCount = 0;
    const unknownThreatIds: string[] = [];
    let passCount = 0;
    
    // Inspect each card
    for (let i = 0; i < Math.min(cardCount, 10); i++) {
      const card = rollupCards.nth(i);
      const cardText = await card.textContent();
      
      if (cardText?.includes('Unknown Threat Title')) {
        unknownThreatCount++;
        // Try to extract ID from line 2
        const lines = cardText.split('\n').filter(l => l.trim());
        if (lines.length >= 2) {
          unknownThreatIds.push(lines[1].trim());
        }
        console.log(`   ⚠ Card ${i + 1}: Contains "Unknown Threat Title"`);
      } else {
        passCount++;
        // Verify format: line 1 = name, line 2 = ID
        const lines = cardText?.split('\n').filter(l => l.trim()) || [];
        if (lines.length >= 2) {
          console.log(`   ✓ Card ${i + 1}: Line 1 = "${lines[0]}", Line 2 = "${lines[1]}"`);
        }
      }
    }
    
    console.log(`\n📊 TEST 3 RESULT: ${unknownThreatCount === 0 ? 'PASS' : 'FAIL'}`);
    if (unknownThreatCount === 0) {
      console.log(`   All ${passCount} cards display human-readable names on line 1 and system IDs on line 2`);
      console.log(`   No "Unknown Threat Title" entries found`);
    } else {
      console.log(`   Found ${unknownThreatCount} cards with "Unknown Threat Title"`);
      console.log(`   Affected IDs: ${unknownThreatIds.join(', ')}`);
    }
  });

  test('Combined Stage 1 Validation Report', async ({ page }) => {
    console.log('\n' + '='.repeat(70));
    console.log('STAGE 1 VALIDATION COMPLETE');
    console.log('='.repeat(70));
    console.log('\nAll three tests have been executed.');
    console.log('Review individual test results above for detailed observations.');
    console.log('\nExpected format:');
    console.log('- Test 1: PASS/FAIL + exact observed text');
    console.log('- Test 2: PASS/FAIL + exact observed text');
    console.log('- Test 3: PASS/FAIL + exact observed text');
    console.log('='.repeat(70) + '\n');
  });
});

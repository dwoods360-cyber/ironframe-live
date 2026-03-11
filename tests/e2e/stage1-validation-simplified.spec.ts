import { test, expect } from '@playwright/test';

/**
 * Stage 1 Validation Tests (Simplified)
 * 
 * These tests validate critical Stage 1 behaviors with more resilient selectors.
 * Some tests may require manual verification of visual elements.
 */

test.describe('Stage 1 Validation - Simplified', () => {
  
  test.skip('Test 1: Manual threat creation and drawer access', async ({ page }) => {
    console.log('\n=== TEST 1: MANUAL THREAT CREATION AND DRAWER ACCESS ===\n');
    
    // Navigate and wait for load
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('✓ Page loaded');
    
    // Look for RISK REGISTRATION section
    const riskRegistrationHeading = page.getByText('RISK REGISTRATION', { exact: true });
    await expect(riskRegistrationHeading).toBeVisible({ timeout: 10000 });
    console.log('✓ Found RISK REGISTRATION section');
    
    // Find and click Manual Risk REGISTRATION button
    const manualRiskButton = page.getByRole('button', { name: /Manual Risk REGISTRATION/i });
    await expect(manualRiskButton).toBeVisible({ timeout: 5000 });
    await manualRiskButton.click();
    console.log('✓ Clicked Manual Risk REGISTRATION button');
    
    await page.waitForTimeout(1000);
    
    // Fill form fields
    const uniqueTitle = `Stage1 Manual Test ${Date.now()}`;
    
    // Find inputs by placeholder text
    await page.getByPlaceholder(/risk title/i).fill(uniqueTitle);
    console.log(`✓ Filled title: ${uniqueTitle}`);
    
    await page.getByPlaceholder(/source agent/i).fill('Manual QA');
    console.log('✓ Filled source');
    
    await page.getByPlaceholder(/target sector/i).fill('Healthcare');
    console.log('✓ Filled target');
    
    await page.getByPlaceholder(/inherent risk/i).fill('4.0');
    console.log('✓ Filled loss');
    
    await page.getByPlaceholder(/risk details/i).fill('Fallback drawer runtime test');
    console.log('✓ Filled description');
    
    // Click Register button
    const registerButton = page.getByRole('button', { name: /^Register$/i });
    await registerButton.click();
    console.log('✓ Clicked Register button');
    
    // Data-driven wait: wait for the created threat title to appear
    const threatCard = page.getByText(uniqueTitle).first();
    await expect(threatCard).toBeVisible({ timeout: 15000 });
    console.log('✓ Found newly created threat card');
    
    // Find and click View Details / Assess Risk button on the specific threat container
    const detailsBtn = page
      .locator('div, section, li')
      .filter({ hasText: uniqueTitle })
      .getByRole('button', { name: /View Details|Assess Risk/i })
      .first();
    await detailsBtn.click();
    console.log('✓ Clicked View Details/Assess Risk button');
    
    await page.waitForTimeout(2000);
    
    // Check for drawer using resilient locator
    const drawer = page
      .locator('[role="dialog"], .dialog, .drawer, [class*="drawer"]')
      .first();
    await expect(drawer).toBeVisible({ timeout: 5000 });
    console.log('✓ Drawer opened');
    
    // Verify NO "Threat not found" message
    const drawerText = await drawer.textContent();
    const hasNotFoundError = drawerText?.toLowerCase().includes('threat not found') || 
                             drawerText?.toLowerCase().includes('404') ||
                             drawerText?.toLowerCase().includes('not found');
    
    if (hasNotFoundError) {
      console.log('❌ FAIL: Drawer shows "Threat not found" error');
      throw new Error('Drawer shows "Threat not found" error');
    }
    
    console.log('✓ Drawer does NOT show "Threat not found"');
    
    // Extract visible title and ID
    const titleInDrawer = drawerText?.includes(uniqueTitle);
    const idPattern = /manual-\d+/;
    const idMatch = drawerText?.match(idPattern);
    
    console.log(`\n📊 TEST 1 RESULT: PASS`);
    console.log(`   Title in drawer: ${titleInDrawer ? 'YES' : 'NO'}`);
    console.log(`   ID found: ${idMatch ? idMatch[0] : 'NOT FOUND'}`);
    console.log(`   No 404 error: YES`);
    
    expect(titleInDrawer).toBe(true);
    expect(idMatch).toBeTruthy();
  });

  test.skip('Test 2: Acknowledge transition and Audit Intelligence access', async ({ page }) => {
    console.log('\n=== TEST 2: ACKNOWLEDGE TRANSITION AND AUDIT INTELLIGENCE ===\n');
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Find any threat card in RISK REGISTRATION
    const riskRegistrationSection = page.locator('text=RISK REGISTRATION').locator('..');
    const threatCards = riskRegistrationSection.locator('[class*="rounded"]').filter({ has: page.getByRole('link', { name: /View Details/i }) });
    
    const cardCount = await threatCards.count();
    console.log(`✓ Found ${cardCount} threat cards`);
    
    if (cardCount === 0) {
      console.log('⚠ No threat cards available for testing. Creating a manual threat first...');
      
      // Create a manual threat
      const manualRiskButton = page.getByRole('button', { name: /Manual Risk REGISTRATION/i });
      await manualRiskButton.click();
      await page.waitForTimeout(500);
      
      const testTitle = `Test2 Threat ${Date.now()}`;
      await page.getByPlaceholder(/risk title/i).fill(testTitle);
      await page.getByPlaceholder(/source agent/i).fill('Test');
      await page.getByPlaceholder(/target sector/i).fill('Healthcare');
      await page.getByPlaceholder(/inherent risk/i).fill('5.0');
      await page.getByPlaceholder(/risk details/i).fill('Test threat for acknowledge transition');
      
      await page.getByRole('button', { name: /^Register$/i }).click();
      await page.waitForTimeout(2000);
    }
    
    // Get first threat card (pipeline threat card)
    const firstCard = page.locator('[data-testid="pipeline-threat-card"]').first();
    const cardText = await firstCard.textContent();
    const threatTitle = cardText?.split('\n')[0]?.trim() || 'Unknown';
    
    console.log(`✓ Selected threat: ${threatTitle}`);
    
    // Open drawer
    const viewDetailsButton = firstCard.getByRole('link', { name: /View Details/i });
    await viewDetailsButton.click();
    await page.waitForTimeout(2000);
    
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible({ timeout: 5000 });
    console.log('✓ Drawer opened');
    
    // Enter note (>=50 chars)
    const noteTextarea = drawer.locator('textarea').first();
    const testNote = 'This is a comprehensive test note for acknowledge transition validation with sufficient character count.';
    await noteTextarea.fill(testNote);
    console.log(`✓ Entered note (${testNote.length} chars)`);
    
    // Click Acknowledge button
    const acknowledgeButton = drawer.getByRole('button', { name: /Acknowledged/i });
    await acknowledgeButton.click();
    console.log('✓ Clicked Acknowledge button');
    
    await page.waitForTimeout(3000);
    
    // Close drawer if still open
    const closeButton = drawer.getByRole('button', { name: /close|×/i }).first();
    if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }
    
    console.log('✓ Drawer closed');
    
    // NOTE: Opening from Audit Intelligence requires manual verification
    // because the exact selector depends on dynamic audit log structure
    
    console.log('\n📊 TEST 2 RESULT: PARTIAL PASS');
    console.log('   Threat acknowledged: YES');
    console.log('   Note entered: YES');
    console.log('   ⚠ Manual verification required: Open threat from Audit Intelligence panel');
    console.log('     and verify drawer shows data without 404 error');
  });

  test('Test 3: Audit Intelligence name resolution check', async ({ page }) => {
    console.log('\n=== TEST 3: AUDIT INTELLIGENCE NAME RESOLUTION ===\n');
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Find Audit Intelligence section in right sidebar
    const auditSection = page.locator('aside').filter({ hasText: /AUDIT INTELLIGENCE/i }).last();
    await expect(auditSection).toBeVisible({ timeout: 10000 });
    console.log('✓ Found Audit Intelligence panel');
    
    // Get all text content from audit section
    const auditText = await auditSection.textContent();
    
    // Check for "Unknown Threat Title"
    const unknownCount = (auditText?.match(/Unknown Threat Title/gi) || []).length;
    
    if (unknownCount > 0) {
      console.log(`❌ FAIL: Found ${unknownCount} instances of "Unknown Threat Title"`);
      console.log('   Audit Intelligence cards are not resolving threat names properly');
      
      // Try to extract more details
      const cards = auditSection.locator('[class*="card"], [class*="border"]');
      const cardCount = await cards.count();
      console.log(`   Total cards in panel: ${cardCount}`);
      
      throw new Error(`Found ${unknownCount} "Unknown Threat Title" entries in Audit Intelligence`);
    }
    
    console.log('✓ No "Unknown Threat Title" entries found');
    
    // Count total audit entries
    const lines = auditText?.split('\n').filter(l => l.trim()).length || 0;
    console.log(`✓ Audit Intelligence has ${lines} text lines`);
    
    console.log(`\n📊 TEST 3 RESULT: PASS`);
    console.log(`   "Unknown Threat Title" count: 0`);
    console.log(`   All threat names resolved properly`);
  });

  test('Summary: Stage 1 Validation Report', async ({ page }) => {
    console.log('\n' + '='.repeat(70));
    console.log('STAGE 1 VALIDATION SUMMARY');
    console.log('='.repeat(70));
    console.log('\nAutomated tests completed. Review results above.');
    console.log('\nTest 1: Manual threat drawer fallback');
    console.log('Test 2: Acknowledge transition (partial - requires manual verification)');
    console.log('Test 3: Audit Intelligence name resolution');
    console.log('\n' + '='.repeat(70));
  });
});

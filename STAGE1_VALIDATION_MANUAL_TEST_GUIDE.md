# Stage 1 Validation - Manual Testing Guide

## Prerequisites
- Ensure dev server is running at `http://localhost:3000`
- Open browser (Chrome/Edge recommended)
- Have browser DevTools open (F12) to inspect elements if needed

---

## Test 1: Drawer Fallback Test (Manual/Non-DB Threat)

### Objective
Verify that manually created threats open in the drawer without showing "Threat not found" error.

### Steps

1. **Navigate to Dashboard**
   - Open: `http://localhost:3000`
   - Wait for page to fully load (no "Loading dashboard..." message)

2. **Locate RISK REGISTRATION Section**
   - Scroll to center panel
   - Find the section labeled "RISK REGISTRATION" (white text, uppercase)
   - This section is below "RAW SIGNAL INGESTION"

3. **Open Manual Risk Form**
   - Click the button labeled "Manual Risk REGISTRATION" (blue button, top-right of RISK REGISTRATION section)
   - Verify form appears with fields for:
     - Risk title (text input)
     - Source agent / analyst (text input)
     - Target sector/entity (text input)
     - Inherent risk ($M) (number input)
     - Risk details / context (textarea)

4. **Fill Out Manual Threat Form**
   - **Title**: `Stage1 Manual Fallback Runtime Test [YOUR_TIMESTAMP]`
   - **Source**: `Manual QA`
   - **Target**: `Healthcare`
   - **Inherent risk**: `4.0`
   - **Description**: `Fallback drawer runtime test`

5. **Submit Form**
   - Click "Register" button (green button at bottom of form)
   - Form should close
   - Wait 1-2 seconds for card to appear

6. **Find New Manual Card**
   - In RISK REGISTRATION section, look for a card with your unique title
   - Card should display:
     - Severity badge (MEDIUM/HIGH/CRITICAL)
     - Your threat title as clickable link
     - ID starting with "manual-" followed by timestamp
     - Source, Sector, Target information

7. **Open Drawer**
   - Click the "View Details" button (top-right of the card, has external link icon)
   - Alternative: Click the threat title link
   - Wait for drawer to slide in from right

8. **Verify Drawer Content**
   - **PASS Criteria**:
     - Drawer opens (semi-transparent overlay appears on right side)
     - Drawer shows threat title (your unique title)
     - Drawer shows threat ID (starts with "manual-")
     - **NO "Threat not found" message appears**
   - **FAIL Criteria**:
     - Drawer shows "Threat not found" or "404" message
     - Drawer is blank or shows error

### Expected Result
```
TEST 1: PASS
- Drawer opened successfully
- Title displayed: "Stage1 Manual Fallback Runtime Test [timestamp]"
- ID displayed: "manual-[timestamp]"
- No "Threat not found" error
```

### Record Your Observations
```
TEST 1 RESULT: [PASS/FAIL]
Observed Title: _______________________
Observed ID: _______________________
Error Messages (if any): _______________________
```

---

## Test 2: State Survival After Acknowledge Transition

### Objective
Verify that threats remain accessible in the drawer after being acknowledged and can be reopened from Audit Intelligence.

### Steps

1. **Find a Pipeline Threat Card**
   - In RISK REGISTRATION section, locate any threat card (preferably DB-backed, not manual)
   - Note the threat title and ID for tracking
   - Record: Title = `_______________`, ID = `_______________`

2. **Open Threat Drawer**
   - Click "View Details" button on the selected card
   - Drawer should open

3. **Enter Acknowledge Note**
   - In the drawer, find the "User Notes" textarea
   - Enter a note with at least 50 characters:
     ```
     This is a comprehensive test note for acknowledge transition validation with sufficient character count to meet the 50+ character requirement.
     ```
   - Verify character counter shows "XXX/50 min" and count >= 50

4. **Acknowledge the Threat**
   - Click the "Acknowledged" button (green chip button)
   - Button should be enabled (not grayed out) since note >= 50 chars
   - Wait for action to complete (1-2 seconds)
   - Drawer may close or update

5. **Close Drawer (if still open)**
   - Click the X or close button if drawer is still open
   - Or click outside drawer to close

6. **Open Audit Intelligence Panel**
   - Look at the RIGHT sidebar (labeled "AUDIT INTELLIGENCE" at top)
   - This panel shows roll-up cards of recent threat actions

7. **Find Your Threat in Audit Intelligence**
   - Scroll through Audit Intelligence cards
   - Look for a card showing:
     - **Line 1**: Your threat title (human-readable name)
     - **Line 2**: Your threat ID (system ID)
   - Click on this card

8. **Verify Drawer Reopens**
   - **PASS Criteria**:
     - Drawer opens again
     - Shows threat title (same as before)
     - Shows threat ID (same as before)
     - **NO "Threat not found" or "404" message**
     - Data appears consistent (title, ID, description match)
   - **FAIL Criteria**:
     - Drawer shows "Threat not found"
     - Drawer shows "404" or error message
     - Drawer is blank
     - Data is missing or inconsistent

### Expected Result
```
TEST 2: PASS
- Threat acknowledged successfully
- Drawer reopened from Audit Intelligence
- Title consistent: [threat title]
- ID consistent: [threat ID]
- No 404 error
- Data appears consistent after transition
```

### Record Your Observations
```
TEST 2 RESULT: [PASS/FAIL]
Initial Title: _______________________
Initial ID: _______________________
After Acknowledge - Title: _______________________
After Acknowledge - ID: _______________________
Error Messages (if any): _______________________
Data Consistency: [YES/NO]
```

---

## Test 3: Audit Intelligence Name Resolution

### Objective
Verify that Audit Intelligence roll-up cards display human-readable threat names (not "Unknown Threat Title").

### Steps

1. **Locate Audit Intelligence Panel**
   - Right sidebar of dashboard
   - Header shows "AUDIT INTELLIGENCE"

2. **Inspect Roll-Up Cards**
   - Audit Intelligence shows cards for recent threat actions
   - Each card should have:
     - **Line 1**: Human-readable threat name (e.g., "Vendor Supply Chain Breach", "Healthcare Data Exposure")
     - **Line 2**: System ID (e.g., "risk-123", "c1a2b3c4d5...")

3. **Check for "Unknown Threat Title"**
   - Scroll through all visible cards in Audit Intelligence
   - Count how many cards show "Unknown Threat Title" on line 1
   - Record affected IDs if any

4. **Verify Name Format**
   - **PASS Criteria**:
     - All cards show human-readable names on line 1
     - All cards show system IDs on line 2
     - **ZERO cards show "Unknown Threat Title"**
   - **FAIL Criteria**:
     - One or more cards show "Unknown Threat Title"
     - Names are missing or showing IDs instead

### Expected Result
```
TEST 3: PASS
- Total cards inspected: [count]
- Cards with human-readable names: [count]
- Cards with "Unknown Threat Title": 0
- All cards display: Line 1 = Name, Line 2 = ID
```

### Record Your Observations
```
TEST 3 RESULT: [PASS/FAIL]
Total Cards Inspected: _______
Cards with "Unknown Threat Title": _______
Affected IDs (if any): _______________________
Sample Card Format:
  Line 1: _______________________
  Line 2: _______________________
```

---

## Final Report Template

After completing all three tests, compile your results:

```
=======================================================================
STAGE 1 VALIDATION REPORT
=======================================================================
Date: [DATE]
Tester: [YOUR NAME]
Environment: http://localhost:3000
Browser: [Chrome/Edge/Firefox]

-----------------------------------------------------------------------
TEST 1: DRAWER FALLBACK TEST (MANUAL/NON-DB THREAT)
-----------------------------------------------------------------------
Result: [PASS/FAIL]
Observed Title: _______________________
Observed ID: _______________________
Notes: _______________________

-----------------------------------------------------------------------
TEST 2: STATE SURVIVAL AFTER ACKNOWLEDGE TRANSITION
-----------------------------------------------------------------------
Result: [PASS/FAIL]
Threat Title: _______________________
Threat ID: _______________________
Data Consistency: [YES/NO]
Notes: _______________________

-----------------------------------------------------------------------
TEST 3: AUDIT INTELLIGENCE NAME RESOLUTION
-----------------------------------------------------------------------
Result: [PASS/FAIL]
Total Cards: _______
"Unknown Threat Title" Count: _______
Affected IDs: _______________________
Notes: _______________________

-----------------------------------------------------------------------
BLOCKERS ENCOUNTERED
-----------------------------------------------------------------------
[List any issues that prevented testing]

-----------------------------------------------------------------------
OVERALL ASSESSMENT
-----------------------------------------------------------------------
All Tests Passed: [YES/NO]
Critical Issues: [List if any]
Recommendations: [Any suggestions]

=======================================================================
```

---

## Troubleshooting

### Issue: Can't find RISK REGISTRATION section
- **Solution**: Scroll down in the center panel. It's below "RAW SIGNAL INGESTION".

### Issue: "Manual Risk REGISTRATION" button is disabled
- **Solution**: Check if there are any active simulations or filters applied.

### Issue: Drawer doesn't open when clicking threat
- **Solution**: Try clicking the "View Details" button instead of the title link.

### Issue: Can't find threat in Audit Intelligence
- **Solution**: 
  - Wait a few seconds for audit log to update
  - Scroll through the entire Audit Intelligence panel
  - Look for cards with "Acknowledged" or "GRC Acknowledge" action type

### Issue: Audit Intelligence panel is empty
- **Solution**: 
  - Perform some actions first (acknowledge a threat, register a manual risk)
  - Refresh the page (F5) to load server audit logs

---

## Additional Notes

- **Browser Console**: Keep DevTools console open to check for JavaScript errors
- **Network Tab**: Monitor network requests if drawer fails to load data
- **Screenshots**: Take screenshots of PASS/FAIL states for documentation
- **Timing**: Some actions may take 1-2 seconds to reflect in UI; be patient

---

## Contact

If you encounter unexpected behavior or need clarification on test steps, document the exact state and error messages for debugging.

# 📋 Student Web Sandbox: How to Manually Test the App
## Step-by-Step Screen Check for 11th & 12th Grade Technical Labs

Welcome to the QA (Quality Assurance) Testing Guide! In the software world, a QA tester's job is to click through an app like a regular user to make sure nothing breaks and that the screen behaves exactly how it is supposed to.

Follow these simple steps on your computer screen to test the app and learn how secure cloud software works.

---

## 🔐 Step 1: Logging In and Testing Identity

### Test Case: AUTH-001 — Checking Your Access Badge
* **What you are testing:** Making sure the app securely remembers who you are without mixing you up with another user.
* **What to do on screen:**
  1. Open the app's main page in your browser (`http://localhost:3000`).
  2. Type in your assigned username and password to log in.
  3. Once you are in, right-click anywhere on the screen, click **Inspect**, and look for a tab named **Application** (or **Storage**). Click on **Cookies** on the left menu.
* **What you should expect to see:** The app logs you in smoothly. In your browser inspection panel, you should see a small piece of saved code (a cookie) that proves your account is securely linked to your screen session.

---

## 🔄 Step 2: Testing Company Isolation (The Wall Check)

### Test Case: TENANT-001 — Switching Companies Safely
* **What you are testing:** The app holds data for three separate mock companies: **Medshield** (healthcare), **Vaultbank** (banking), and **Gridcore** (power grid). We need to prove that switching between companies completely changes the screen *without* leaking or mixing up secrets.
* **What to do on screen:**
  1. Look at the top-left corner of your dashboard screen. Find the dropdown box showing the company name (like `Vaultbank NV`).
  2. Click that box and select **Medshield**.
  3. Click it again and select **Gridcore Infrastructure**.
* **What you should expect to see:** Every time you click a new company, the screen should quickly flash a gray "loading silhouette" block. Then, the numbers, charts, and text must completely change to show only that company's statistics. Banking numbers must never show up on the power grid screens, and health records must never stay stuck in the cache.

---

## 🛑 Step 3: Fast-Clicking Stress Test

### Test Case: TENANT-003 — The Turbo Click Challenge
* **What you are testing:** Testing if clicking too fast can trick the software into displaying old or mixed-up data on screen.
* **What to do on screen:**
  1. Open that same top-left company menu box again.
  2. As fast as you can, click back and forth between **Vaultbank** and **Gridcore** five times in a row.
  3. Stop clicking and watch the screen closely.
* **What you should expect to see:** The app should not freeze, glitch, or turn into a blank white screen. The final screen should load completely clean, displaying the correct charts for the last company you clicked, proving the app's memory handles fast user actions perfectly.

---

## 🔋 Step 4: Testing the Internet Outage Backup

### Test Case: CARBON-001 — The Safety Net Display
* **What you are testing:** What happens when the app loses its connection to live external environmental data sources? We need to make sure the screen stays active instead of crashing.
* **What to do on screen:**
  1. Click on the **Carbon Pulse** tab or box on your main dashboard layout.
  2. Look at the graphs and maps trying to load data.
* **What you should expect to see:** Even if your school network blocks live external internet trackers, the app is smart. Instead of showing an error message or breaking, a built-in safety net kicks in. The graph stays safely on screen using a saved, backup simulation chart so you can still finish your classroom lab work without a hitch.

---

## 📂 Step 5: Testing Report Downloads & Money Accuracy

### Test Case: EXPORT-001 — Downloading the Audit Spreadsheet
* **What you are testing:** Proving that the app processes financial data correctly using exact math without decimal rounding errors.
* **What to do on screen:**
  1. Go to the **Analyst Portal** (or data screen) inside the app.
  2. Click the company switcher and pick **Vaultbank NV**.
  3. Find and click the button that says **Export Tabular Ledger Data (CSV)**.
  4. Open the downloaded spreadsheet file on your computer.
* **What you should expect to see:** The spreadsheet file downloads immediately to your computer. When you look at the columns tracking money, you will notice there are no decimal points or floating dot numbers. Instead, everything is listed as total whole cents (for example, a balance of $10.00 will look like `1000` cents). This is how professional banking software keeps numbers perfect!

---

## 🎨 Step 6: Visual Layout & Side Drawer Animations

### Test Case: UX-002 — Pop-Up Slider Fluidity
* **What you are testing:** Making sure the user interface feels smooth, responsive, and easy to read.
* **What to do on screen:**
  1. Find the **Agent Monitor** table that lists background AI workers (like `Ironlock` or `Ironguard`).
  2. Click directly on any of the rows in that list.
  3. Click the "X" close button or click out in the dark space to close it.
* **What you should expect to see:** A beautiful information drawer should slide out smoothly from the right side of your screen over your main dashboard. The rest of the screen behind it should dim slightly so it's easy to read. When you close it, it should glide away smoothly without any jarring visual glitches, blinking, or screen delays.

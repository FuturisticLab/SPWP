# Smart Welcome & Auto-Redirect — Quick Setup & Partial IP Filter Guide

**Package to Upload:** `smart-welcome-hub.sppkg`

---

## 1. Upload `.sppkg` to SharePoint

1. Open **SharePoint Admin Center** → **More features** → **Apps (Open)** (`Manage apps`).
2. Click **Upload** and select `smart-welcome-hub.sppkg` (check *"Replace existing app"* if updating).
3. Select **"Enable this app and add it to all sites"** and click **Enable app**.

---

## 2. How to Open the Settings Panel (Property Pane)

1. Open your SharePoint page and click **Edit** (top right).
2. Click once on the **Smart Welcome & Auto-Redirect** web part.
3. Click the **Pencil icon (`✏️` Edit properties)** on the small toolbar next to the web part.
4. A **settings panel will slide out on the right side of the screen**. Every setting has an **`ⓘ` Info Icon** you can click for help.

---

## 3. How the Partial IP / Subnet Prefix Filter Works

Nothing is hardcoded or blocked in the code — you control office IP mapping directly in the settings panel:

1. **See Your Network Prefix in 1 Second:**
   - Hover your mouse over the **green online light** on the banner—a small tooltip will show your current network's prefix:
     `Online | Network Prefix: 74.102.88.*`
2. **Map Partial IP Prefixes to Your Offices:**
   - In the right-hand settings panel (`✏️`), under **Office Partial IP / Subnet Prefix Filter**, enter the first 2 or 3 parts of each office's IP or subnet (one per line):
     ```text
     74.102. | Boston | MA
     96.44. | Manchester | NH
     10.20. | Boston | MA
     10.10. | Manchester | NH
     ```
   - Anyone on that office network (`74.102.*` or `10.20.*`) will automatically see **`"Welcome to the Boston office, [Name]"`** and trigger your `Boston` / `MA` redirect rules.

---

## 4. Choosing Home Page vs. Department Landing Page Mode

At the very top of the right-hand settings panel (`✏️`), use **Web Part Operating Mode**:

- **Home Page — Auto-Redirect + Welcome Banner** *(Default)*: Shows the green online light + office greeting and redirects users based on their Job Title & Office Location.
- **Department Landing Page — Welcome Banner Only (No Redirect)**: Shows the exact same green online light + office greeting on department pages with **all redirects turned off**.

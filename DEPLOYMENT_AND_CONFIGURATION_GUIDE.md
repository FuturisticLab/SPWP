# Smart Welcome & Auto-Redirect Hub — Deployment, Configuration & Safety Guide

**Package File:** [smart-welcome-hub.sppkg](file:///C:/Users/jmarc/Desktop/FirebaseMigration/SharePoint%20WebPart/smart-welcome-hub.sppkg)  
**Source Folder:** [smart-welcome-hub](file:///C:/Users/jmarc/Desktop/FirebaseMigration/SharePoint%20WebPart/smart-welcome-hub)  
**Architecture Diagram:** [smart-welcome-hub-architecture-flow.jpg](file:///C:/Users/jmarc/Desktop/FirebaseMigration/SharePoint%20WebPart/smart-welcome-hub-architecture-flow.jpg)

---

## Step 1: Upload the `.sppkg` to Your SharePoint App Catalog (Zero API Approvals Needed)

1. Open the **SharePoint Admin Center** (`https://<your-tenant>-admin.sharepoint.com`).
2. In the left navigation, click **More features** → under **Apps**, click **Open** (`Manage apps`).
3. Click **Upload** and select:
   [smart-welcome-hub.sppkg](file:///C:/Users/jmarc/Desktop/FirebaseMigration/SharePoint%20WebPart/smart-welcome-hub.sppkg) (check *"Replace existing app"* if updating).
4. In the **"Enable app"** panel:
   - Select **"Enable this app and add it to all sites"**.
   - Click **Enable app**.

> [!NOTE]
> **Zero Tenant Admin API Approvals Required**
> You do **not** need to approve any permissions in the SharePoint Admin Center API Access page. The web part attempts Microsoft Graph (`/v1.0/me`) first and automatically backfills any missing attributes from SharePoint's built-in, Azure Entra-synced User Profile Service (`/_api/SP.UserProfiles.PeopleManager/GetMyProperties`) and Site Groups (`/_api/web/currentuser/groups?$select=Title`).

---

## Step 2: Add the Web Part to Your SharePoint Landing Page

1. Open your SharePoint landing page and click **Edit** in the top-right corner.
2. Add the **Smart Welcome & Auto-Redirect** web part to any section.
3. Because the web part uses a **Blended Single-Row HUD** (`background: transparent`), only the text and HUD indicators appear, automatically inheriting your SharePoint section background and text contrast.
4. While in **Edit Mode** (or when `?Mode=Edit` / `?noredirect=1` is in the URL), automatic redirection is **paused** so you can never be redirected away while editing.

---

## Step 3: Configure Your Rules on the 1-Page Property Pane

Click the **Pencil icon (✏️)** on the web part to open the Property Pane. All settings are on a single page:

### Group 1: Redirect Rules (`Department or Location | Page Name | URL`)
Enter one rule per line using 3 parts separated by `|`:

```text
HR, Human Resources | HR Portal | /sites/hr
Finance, Accounting | Finance Hub | /sites/finance
Engineering | Engineering Portal | /sites/engineering
New York | New York Office | /sites/ny
London | London Office | /sites/london
Sales + London | London Sales Hub | /sites/london-sales
```

| Syntax | Meaning | Example |
| :--- | :--- | :--- |
| **Comma `,` (OR)** | Matches if the user's Department, Location, or SharePoint Group contains **any** listed word. | `HR, Human Resources \| HR Portal \| /sites/hr` |
| **Plus `+` (AND)** | Matches only if the user's profile contains **all** listed words together. | `IT + Canada \| Canada IT Desk \| /sites/it-ca` |
| **Top-to-Bottom Order** | Evaluated from the top line down (case-insensitive). The first line that matches wins. | Put more specific `Dept + Location` rules above general rules. |

### Group 2: Default Fallback & Timing
| Setting | What It Does | Default |
| :--- | :--- | :--- |
| **Fallback Page Name** | Display label if the fallback URL is used. | `Company Home` |
| **Fallback URL** | Where to send users who don't match any rule. **Leave blank** to keep unmatched users on the current page. | *(Blank — Stay on page)* |
| **Redirect Delay Seconds** | Countdown before auto-redirect (`0` = instant redirect after verification). Users can click `Stay` to cancel. | `3` seconds |
| **Banner Color** | Hex color for the KITT LED scanner, initial badge, and links. | `#ff1e3c` |

---

## Step 4: Live HUD & Safety Assurance Architecture

### 1. Live Telemetry (`SYS.ONLINE // PORTAL:SECURE`)
- Checks `navigator.onLine`, verifies `window.location.protocol === 'https:'`, and performs a live authenticated ping (`GET /_api/web?$select=Title` with a 4-second `AbortController` timeout).

### 2. Interactive `PROFILE AUTHORIZATION` & Knight Rider (KITT) LED Scanner
- Starts in `VERIFYING M365 PROFILE...` while the crimson KITT LED beam sweeps across Row 2.
- Once verified, transitions to `IDENTITY VERIFIED. ACCESS GRANTED.`, flashes the LED bar solid emerald green (`#10b981`), and **smoothly fades the bar out (`opacity: 0`)**.
- Clicking **`PROFILE AUTHORIZATION`** re-runs the live session check and KITT LED scan on demand.

### 3. Safety Assurance Guardrails (Verified by Audit)
- **Open-Redirect & XSS Protection (`sanitizeRedirectUrl`)**: Blocks `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`, and untrusted external phishing domains; permits only relative paths, same-origin URLs, or trusted `.sharepoint.com` / `.microsoft.com` / `.office.com` HTTPS destinations.
- **Self-Redirect Infinite Loop Prevention (`isSamePageUrl`)**: Detects if the matched target URL is the same page the user is already viewing (including `/SitePages/Home.aspx` normalization) and shows `(current page)` instead of reloading in a loop.
- **Pre-Flight 404/500 Protection (`navigateSafely`)**: Performs a timed HTTP `HEAD` check (`4000ms` timeout) before redirecting; if the destination returns `404` or `500+`, auto-redirect stops and displays an inline alert.
- **Emergency URL Bypass**: Appending `?noredirect=1` to any page URL pauses auto-redirection immediately.

# SharePoint Online Migration Manager & Readiness Hub (SPFx Web Part)

## Package Location (`.sppkg`)
The production SharePoint Framework (SPFx 1.23.2) package is compiled and ready for immediate upload at:
- `c:\Users\jmarc\Desktop\FirebaseMigration\SharePoint WebPart\spo-migration-hub.sppkg`
- `c:\Users\jmarc\Desktop\FirebaseMigration\SharePoint WebPart\spo-migration-hub\sharepoint\solution\spo-migration-hub.sppkg`
- `c:\Users\jmarc\Desktop\FirebaseMigration\SPOMigrationManager\spo-migration-hub.sppkg`

---

## How to Upload to SharePoint Online App Management (`Manage apps`)

1. Open the **SharePoint Admin Center** (`https://<tenant>-admin.sharepoint.com`) and select **More features** -> **Apps** -> **Open** (which opens the **Manage apps** page).
2. Click **Upload** (or drag and drop `spo-migration-hub.sppkg` into the list).
3. In the **Enable app** panel that appears:
   - Choose **Enable this app and add it to all sites** (or **Only enable this app** if you want site owners to add it selectively).
   - Click **Enable app**.
   - **Zero API Approvals Required:** Because the web part uses SharePoint's native authenticated `SPHttpClient` (`/_api/web/lists`, `/_api/site/usage`, `/_api/web/siteusers`), it requires **zero** Microsoft Graph or Tenant API permission approvals.
4. Go to any SharePoint Online page, click **Edit**, click the **`+`** icon to add a web part, and select **SPO Migration Manager & Readiness Hub**.
   - *Tip:* This web part supports **Full-Width (Full Bleed) sections** as well as standard 1-column sections.

---

## 1:1 Feature Parity with the PowerShell WPF Application

| Stage / Component | PowerShell Module / XAML | SPFx Web Part Equivalent |
| :--- | :--- | :--- |
| **Header & Environment Profile** | `MainWindow.xaml` + `GuiController.ps1` | Dark-slate header with `Development`, `Test / QA`, `Staging / Pre-Prod`, and `Production` profile selector, live status badge, and progress bar. |
| **Stage 1: Inventory & Assessment** | `Inventory-Assessment.psm1` + `DummyData-Generator.psm1` | Local folder browser (`webkitdirectory`), PowerShell JSON importer, 5-level Dev Test Data generator, 17 invalid char rules, reserved device names (`CON.docx`, `LPT1.txt`), SHA-256 Web Crypto hashing, and triple export (`CSV`, `JSON`, `Directory_Tree_*.txt`). |
| **Stage 2: Character Remediation** | `Remediation-Engine.psm1` | Bottom-up (deepest-first) sanitization engine, Dry-Run (What-If) mode, path shortening, in-memory execution, and downloadable `Undo_Remediation_*.ps1`, `Remediate_*.ps1`, `Cleanup_Sheet_*.csv`, and `Remediation_Audit_*.json`. |
| **Stage 3: Permissions & Identity** | `Permissions-Assessment.psm1` + `PermissionsAssessmentModal.xaml` | Split ACL & `UserMapping.csv` view + dedicated pop-out **Full Permissions Window** modal, live SharePoint site user verification (`/_api/web/siteusers`), 5,000-ACL scope check, and downloadable `Collect-NTFSPermissions.ps1`. |
| **Stage 4: SPO & Azure Pipeline** | `TargetEnvironment-Assessment.psm1` + `BatchMigration-Benchmark.psm1` + `SPOMigration-Pipeline.psm1` | Live `SPHttpClient` target library & storage quota inspection, 400-char Safe Path Headroom calculator, direct browser-to-SPO file upload, 50 GB wave throughput benchmark, and downloadable `Invoke-SPOMigrationPipeline_*.ps1`. |
| **Stage 5 & 6: Anomalies & HTML Report** | `Anomaly-Monitor.psm1` + `HtmlReport-Generator.psm1` | Real-time anomaly sensors (`Telemetry_Events_*.json`), live dark-slate activity console, and 1-click standalone zero-CDN `SPOMigration_Report_*.html` executive dashboard. |

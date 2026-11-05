# 01. Enterprise Deployment Guide
## SharePoint Online Migration Manager & Readiness Hub (`spo-migration-hub`)

---

## 1. Solution Overview & Prerequisites

### Architecture Packaging
The client-side solution is compiled into an Open Packaging Conventions (OPC) zip container named `spo-migration-hub.sppkg`.
- **Target Framework**: SharePoint Framework (SPFx) v1.22.2
- **Supported Hosts**: SharePoint Online Modern Pages, Microsoft Teams Tab, Microsoft Viva Connections, SharePoint Full-Bleed Pages
- **Client Runtime**: Node.js v18 / v20 / v22; Webpack 5.105.4; TypeScript 5.8.3

### Permission Requirements
Unlike legacy server-side tools requiring Global Administrator or Tenant Administration roles:
- **Tenant App Catalog Deployment**: Requires **SharePoint Administrator** or **Global Administrator** to deploy and trust the `.sppkg` package once in the tenant catalog.
- **Site-Level App Catalog Deployment**: Requires **Site Collection Administrator** on the dedicated site collection (if using scoped site catalogs).
- **End-User / Migration Engineer Operation**: Standard **Member / Edit / Contribute** permissions on target Document Libraries. **Tenant Admin rights are NOT required** to run migrations or scan shares.

---

## 2. Deployment Methods

### Method A: Tenant App Catalog Deployment (Browser UI)

1. **Access App Catalog**:
   - Navigate to the Microsoft 365 Admin Center (`https://admin.microsoft.com`).
   - Go to **SharePoint Admin Center** > **More features** > **Apps** > **Open**.
   - URL typically: `https://<tenant>.sharepoint.com/sites/appcatalog/AppCatalog`.

2. **Upload Package**:
   - Click **Upload** or drag-and-drop:
     `c:\Users\jmarc\Desktop\FirebaseMigration\SharePoint WebPart\spo-migration-hub\sharepoint\solution\spo-migration-hub.sppkg`.

3. **Trust & Enable**:
   - In the **Enable app** dialog:
     - Check: *Enable this app and add it to all sites* (Tenant-Wide Deployment) **OR** leave unchecked for manual site installation.
     - Click **Enable app**.

4. **Add to Site Pages**:
   - Navigate to your target SharePoint site (e.g. `https://<tenant>.sharepoint.com/sites/MigrationOps`).
   - Click **+ New** > **Page**.
   - Select **Blank** layout.
   - Click `+` to add a web part, search for **SPO Migration Hub & Readiness Manager**.
   - Publish the page.

---

### Method B: Automated PowerShell Deployment (PnP.PowerShell)

Run the following automated deployment script in PowerShell:

```powershell
<#
.SYNOPSIS
    Automated Tenant Deployment for SPO Migration Hub
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$TenantAdminUrl = "https://contoso-admin.sharepoint.com",
    
    [Parameter(Mandatory = $false)]
    [string]$PackagePath = ".\sharepoint\solution\spo-migration-hub.sppkg",
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipFeatureDeployment = $true
)

Import-Module PnP.PowerShell -ErrorAction Stop

Write-Host "Connecting to SharePoint Online Admin: $TenantAdminUrl" -ForegroundColor Cyan
Connect-PnPOnline -Url $TenantAdminUrl -Interactive

Write-Host "Uploading $PackagePath to Tenant App Catalog..." -ForegroundColor Cyan
$app = Add-PnPApp -Path $PackagePath -Publish -Overwrite -SkipFeatureDeployment:$SkipFeatureDeployment

if ($app) {
    Write-Host "App package successfully published! App ID: $($app.Id)" -ForegroundColor Green
} else {
    Write-Error "Failed to publish package to App Catalog."
}
```

---

### Method C: Site-Collection App Catalog Deployment (Isolated Scoping)

For environments with strict organizational segregation:
1. Enable a Site-Level App Catalog on a dedicated site collection:
   ```powershell
   Add-PnPSiteCollectionAppCatalog -Site "https://contoso.sharepoint.com/sites/SandboxMigration"
   ```
2. Connect to the site and upload the package:
   ```powershell
   Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/SandboxMigration" -Interactive
   Add-PnPApp -Path ".\sharepoint\solution\spo-migration-hub.sppkg" -Publish -Overwrite
   ```
3. The Web Part is now exclusively available within `SandboxMigration` and cannot be seen or accessed by other site collections.

---

## 3. Configuration & Property Pane Settings

Once added to a Modern Page, open the Web Part Property Pane (pencil icon):

| Property Name | Type | Default | Operational Impact |
| :--- | :--- | :--- | :--- |
| `defaultEnvironment` | Dropdown | `Development` | Switches active governance profile: <br>• **Development**: 250 MB ceiling, 260 char paths <br>• **Test / QA**: 2 GB ceiling, 300 char paths <br>• **Staging / Pre-Prod**: 15 GB ceiling, 350 char paths <br>• **Production**: 250 GB ceiling, 400 char paths |
| `defaultTargetSiteUrl` | String | *Empty (Auto-detect)* | Target SharePoint Online site collection URL. When empty, defaults dynamically to current web. |
| `defaultTargetLibrary` | String | `Documents` | Primary document library destination for folders and uploads. |
| `defaultReplacementChar` | String | `_` | Substitution character for invalid characters (`#`, `%`, `&`, `~`, `{`, `}`, `+`, `;`, etc.). |
| `defaultTenantDomain` | String | `contoso.onmicrosoft.com`| Target Entra ID tenant domain for automatic UPN resolution in `UserMapping.csv`. |

---

## 4. Verification & Health Check

After deployment, perform this 3-step verification:
1. **Load Test**: Open the published page. Verify all 5 stages render and the HUD status pill displays `ENVIRONMENT PROFILE: READY`.
2. **REST API Authorization**: Navigate to **Stage 4 (Pipeline & Upload)** and click **Assess Target SPO Site**. Verify the storage quota, document library list, and safe path headroom calculate without HTTP 401 or 403 errors.
3. **Sandbox Isolation**: Verify that browser file uploads stage directly into the selected subfolder without touching root library files.

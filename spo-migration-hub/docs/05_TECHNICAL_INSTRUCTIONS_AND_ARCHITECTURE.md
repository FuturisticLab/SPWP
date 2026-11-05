# 05. Technical Instructions & Architectural Blueprint
## Deep-Dive System Architecture, State Machine & Execution Pipelines

---

## 1. High-Level Architecture & Emergency Operative Design

The platform combines a **client-side React/SPFx Web Part** with an optional **PowerShell 7 / WPF desktop automation engine**. Both share the exact same 19-rule Microsoft SharePoint Online compliance algorithms and data structures.

### Operational Context: Rapid Emergency Response
The architecture is purpose-built to function as a **rapid emergency operative** in conjunction with official Microsoft programs (SPMT, Migration Manager, FastTrack):
- **Zero Ingestion Lag**: Can be accessed immediately via any authenticated browser session without awaiting weeks of provisioning or agent installations.
- **Vulnerability Extraction**: Provides instant assessment, sanitization, and priority wave relocation of sensitive digital assets from legacy, compromised, or vulnerable-prone on-premises servers directly into SharePoint Online.
- **Fail-Safe Rollback**: Pre-execution Robocopy mirroring and reversible PowerShell scripts guarantee that original files can be restored if emergency cutover priorities shift.

```
+----------------------------------------------------------------------------------------------------+
|                                 MICROSOFT 365 CLIENT WORKSTATION                                   |
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  |                 SPFx WEB PART: spo-migration-hub (In-Browser Execution Engine)                |  |
|  |                                                                                              |  |
|  |  [Stage 1: Discovery]     [Stage 2: Sanitization]   [Stage 3: Permissions]  [Stage 4: Runner]|  |
|  |  - FileSystemAccess API    - Leaf-First Sorting     - NTFS ACL Matrix       - SPHttpClient   |  |
|  |  - 19 SPO Limits Checks   - Collision Resolvers    - Broken Scopes (>5000) - Recursive REST |  |
|  |  - SHA-256 Hashes         - Robocopy Mirror        - UserMapping.csv       - 250GB Benchmark|  |
|  |                                                                                              |  |
|  |  [Stage 5: Telemetry]     [Visual HUD / Modals]    [Export Engine]                           |  |
|  |  - Anomaly Sensor Grid    - Permissions Workspace  - HTML5 Standalone Dashboard             |  |
|  |  - Real-Time Console Logs - Dynamic Info Tooltips  - CSV / JSON Audit Sheets                 |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                          |                                                         |
|                     SPHttpClient (Browser Authenticated Session)                                   |
|                                          v                                                         |
|  +----------------------------------------------------------------------------------------------+  |
|  |                                SHAREPOINT ONLINE TENANT CLOUD                                |  |
|  |                                                                                              |  |
|  |  Site Collection: https://<tenant>.sharepoint.com/sites/<SiteName>                          |  |
|  |  Target Document Library: Documents / Shared Documents                                      |  |
|  |  Destination Subfolder:   MigrationStaging / Isolated Import                                 |  |
|  +----------------------------------------------------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Five-Stage Migration Lifecycle Architecture

### Stage 1: Inventory Discovery & SharePoint Readiness Assessment
- **Technology**: Native Browser File System Access API (`showDirectoryPicker`) for live client-side folder traversal, with fallback to sample enterprise inventory generators.
- **Rules Evaluated**:
  1. *File Size*: Compares against environment profile threshold (up to 250 GB for Production).
  2. *URL Length*: Computes estimated full SharePoint Online decoded URL:
     $$\text{Estimated Length} = \text{Base URL Length} + \text{Relative Path Length} + 1$$
     Flags any path exceeding **400 characters**.
  3. *Illegal Characters*: Checks for `" * : < > ? / \ |` and restricted characters `# % ~ & { } ^ [ ] + ;`.
  4. *Folder Semicolons*: Flags any directory containing `;` (prevents Win32 Office Backstage save errors).
  5. *Invalid Folder Prefixes*: Flags folders beginning with `゛` (U+309B) or `ဧ` (U+1018).
  6. *Periods & Spaces*: Detects leading/trailing spaces, trailing periods, and consecutive periods (`..`).
  7. *Office Lock Files*: Identifies and flags temporary owner lock files (`~$*`).
  8. *Reserved Names*: Detects POSIX/Windows reserved keywords (`CON`, `PRN`, `AUX`, `NUL`, `COM0-9`, `LPT0-9`, `_vti_*`, `.lock`, `desktop.ini`, `thumbs.db`, `.ds_store`).
  9. *Restricted Extensions*: Warns on `.tmp` and `.pst` files.

### Stage 2: Character Remediation & Path Shortening Engine
- **Leaf-First (Bottom-Up) Algorithm**:
  To prevent parent folder renames from invalidating child file paths, all candidate items are sorted by directory depth in descending order:
  $$\text{Depth} = \text{Count}(\text{Split}(\text{RelativePath}, \text{'\\'}))$$
  Children are sanitized and renamed before parent directory names are touched.
- **Collision Avoidance**: If proposed sanitized name exists in target directory, appends deterministic suffix (`_1`, `_2`, etc.) while preserving file extension.
- **Safety Mirror (Step 0 Robocopy)**:
  Generates multi-threaded, resilient Robocopy mirror commands (`/E /COPY:DAT /R:1 /W:1 /MT:8 /NP`) to protect original shares prior to renaming.
- **100% Reversible Rollback**:
  Automatically writes an `Undo_Remediation.ps1` script utilizing PowerShell `-LiteralPath` commands in reverse order.

### Stage 3: Permissions Assessment & Cloud Identity Alignment
- **Scope Analysis**: Evaluates NTFS Access Control Lists (ACLs) across all folders and files.
- **Broken Inheritance Tracking**: Counts explicit unique permission scopes. Flags warning if total unique scopes exceed Microsoft's **5,000 unique scopes per list threshold**.
- **Deny Rule Blocker**: Identifies explicit `Deny` Access Control Entries (ACEs). SharePoint Online does not support `Deny` permissions; flags items for architectural restructuring.
- **Identity Mapping (`UserMapping.csv`)**: Translates on-premises `DOMAIN\username` accounts to cloud Entra ID User Principal Names (`user@tenant.onmicrosoft.com`). Includes interactive modal UPN editor.

### Stage 4: SharePoint & Azure Ingestion Pipeline
- **Dual Execution Modes**:
  1. **Live In-Browser Runner**: Runs directly within the user's SharePoint session via `SPHttpClient` REST APIs. Recursively provisions folder hierarchy top-down, then streams file buffers directly into destination libraries without local scripts or Azure keys.
  2. **Enterprise SPMT / Azure Pipeline**: Generates PowerShell automation scripts utilizing `New-SPOMigrationPackage`, `ConvertTo-SPOMigrationTargetedPackage`, and `Set-SPOMigrationPackageAzureSource` for server-side bulk ingestion.
- **250 GB Benchmark Simulator**: Simulates high-speed enterprise waves, measuring transfer speed (MB/s), throughput (GB/hour), and HTTP 429 throttling back-off.

### Stage 5: Real-Time Anomaly Monitor & Telemetry Engine
- **Health Sensors**:
  - `Target Quota Sensor`: Triggers warning when available target storage falls below 10 GB.
  - `Path Bloat Sensor`: Detects when total URL length exceeds safe headroom limits.
  - `Throttling Sensor`: Monitors HTTP 429 / 503 response codes and initiates exponential back-off delays.
  - `Deny ACE Sensor`: Flags unsupported permissions before submission.
- **Audit Export**: Outputs full diagnostic telemetry into SIEM-compatible JSON and CSV formats.

---

## 3. SPHttpClient REST API Specifications

The in-browser runner communicates directly with SharePoint Online using native REST endpoints:

### Folder Provisioning
```http
POST {cleanSiteUrl}/_api/web/folders
Accept: application/json;odata=verbose
Content-Type: application/json;odata=verbose
X-RequestDigest: {digest}

{
  "__metadata": { "type": "SP.Folder" },
  "ServerRelativeUrl": "/sites/MigrationOps/Shared Documents/MigrationStaging/Department/SubFolder"
}
```

### Binary File Upload
```http
POST {cleanSiteUrl}/_api/web/GetFolderByServerRelativeUrl('{escapedFolderUrl}')/Files/add(url='{escapedFileName}',overwrite=true)
Accept: application/json;odata=verbose
Content-Type: application/octet-stream
X-RequestDigest: {digest}

[ArrayBuffer Binary Payload]
```

### Site Storage & Quota Discovery
```http
GET {cleanSiteUrl}/_api/site/usage
Accept: application/json;odata=nometadata

GET {cleanSiteUrl}/_api/web/lists?$filter=BaseTemplate eq 101 and Hidden eq false&$select=Id,Title,ItemCount,EnableVersioning,EnableMinorVersions,MajorVersionLimit,RootFolder/ServerRelativeUrl&$expand=RootFolder
Accept: application/json;odata=nometadata
```

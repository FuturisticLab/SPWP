# 06. Enterprise Security Hardening & Private Key Integration Guide
## Certificate-Based Authentication (CBA), Azure Key Vault & Secretless CI/CD

---

## 1. Executive Security Architecture Overview

For organizations operating under heightened compliance standards (e.g., NIST SP 800-207 Zero Trust, FedRAMP, HIPAA, ISO 27001), authenticating with traditional client secrets or interactive user passwords introduces key exposure and credential rotation risks.

This guide outlines how to configure **Certificate-Based Authentication (CBA)** utilizing asymmetric **RSA private keys (X.509 certificates)**, Azure Key Vault, and hardware-bound tokens.

```
+----------------------------------------------------------------------------------------------------+
|                               PRIVATE KEY & ZERO-SECRET ARCHITECTURE                               |
|                                                                                                    |
|  +------------------------------+     mTLS / RS256 JWT Signed Assertion     +--------------------+ |
|  | Admin Workstation / CI/CD    | ----------------------------------------> | Microsoft Entra ID | |
|  | Private Key (.pfx / KeyVault)|                                           | (Public Cert .cer) | |
|  +------------------------------+                                           +--------------------+ |
|                 |                                                                      |           |
|                 |                                         Scoped Access Token (OAuth2) |           |
|                 v                                                                      v           |
|  +-----------------------------------------------------------------------------------------------+ |
|  |               SharePoint Online Admin & Target Site Collections (Zero Stored Secrets)         | |
|  +-----------------------------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Generating the Enterprise X.509 Private Key Pair

You can generate a cryptographically resilient RSA 2048-bit or 4096-bit self-signed certificate using PowerShell:

```powershell
<#
.SYNOPSIS
    Generates a secure, password-protected private key (.pfx) and public cert (.cer)
#>
param(
    [string]$CertificateName = "SPOMigrationManager_EnterpriseAuth",
    [string]$ExportPath = "C:\SecureKeys",
    [int]$ValidityYears = 2
)

if (-not (Test-Path $ExportPath)) {
    New-Item -ItemType Directory -Path $ExportPath -Force | Out-Null
}

$password = Read-Host -Prompt "Enter secure password to protect the Private Key (.pfx)" -AsSecureString

Write-Host "Generating RSA 2048-bit Certificate..." -ForegroundColor Cyan
$cert = New-SelfSignedCertificate `
    -Subject "CN=$CertificateName" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -KeyExportPolicy Exportable `
    -KeySpec Signature `
    -KeyLength 2048 `
    -KeyAlgorithm RSA `
    -HashAlgorithm SHA256 `
    -NotAfter (Get-Date).AddYears($ValidityYears)

# Export Public Certificate (.cer) - Safe to upload to Microsoft Entra ID
$cerPath = Join-Path $ExportPath "$CertificateName.cer"
Export-Certificate -Cert $cert -FilePath $cerPath | Out-Null

# Export Encrypted Private Key (.pfx) - Store securely; NEVER commit to Git!
$pfxPath = Join-Path $ExportPath "$CertificateName.pfx"
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password | Out-Null

Write-Host "Certificate Pair Generated Successfully!" -ForegroundColor Green
Write-Host "Public Certificate (Upload to Entra ID): $cerPath"
Write-Host "Private Key (Store Securely):            $pfxPath"
Write-Host "Thumbprint:                             $($cert.Thumbprint)"
```

---

## 3. Registering the Application in Microsoft Entra ID (Azure AD)

1. Open the **Microsoft Entra Admin Center** (`https://entra.microsoft.com`).
2. Navigate to **Applications** > **App registrations** > **New registration**.
   - Name: `SPOMigrationManager-ServicePrincipal`
   - Supported account types: *Accounts in this organizational directory only (Single tenant)*.
   - Click **Register**.
3. Note the **Application (client) ID** and **Directory (tenant) ID**.
4. Upload the Public Certificate:
   - Go to **Certificates & secrets** > **Certificates** > **Upload certificate**.
   - Select the generated `.cer` file (`SPOMigrationManager_EnterpriseAuth.cer`).
   - Click **Add**.
5. Configure Scoped API Permissions:
   - Go to **API permissions** > **Add a permission** > **SharePoint**.
   - Select **Application permissions**.
   - Choose:
     - `Sites.Selected` *(Recommended: limits app access only to specific site collections)*, **OR**
     - `Sites.FullControl.All` *(For automated tenant-wide migration)*.
   - Click **Grant admin consent for <Tenant>**.

---

## 4. Connecting Securely via PnP PowerShell with Private Key

### Option A: Using the Local Machine Certificate Store (Recommended)
Once the certificate is imported into `Cert:\CurrentUser\My`, connection requires zero passwords in plaintext scripts:

```powershell
Import-Module PnP.PowerShell -ErrorAction Stop

$tenantId       = "your-tenant-guid-here"
$clientId       = "your-application-client-id"
$certThumbprint = "4F5B8B...YOUR_THUMBPRINT_HERE"
$targetSiteUrl  = "https://contoso.sharepoint.com/sites/MigrationOps"

Write-Host "Authenticating via Private Key Thumbprint..." -ForegroundColor Cyan

Connect-PnPOnline -Url $targetSiteUrl `
    -ClientId $clientId `
    -Tenant $tenantId `
    -Thumbprint $certThumbprint

Write-Host "Authenticated securely! Connected to: $((Get-PnPWeb).Title)" -ForegroundColor Green
```

### Option B: Using an Encrypted `.pfx` File with Protected Credentials
```powershell
$pfxPath = "C:\SecureKeys\SPOMigrationManager_EnterpriseAuth.pfx"
$pfxPassword = Read-Host -Prompt "Enter PFX Password" -AsSecureString

Connect-PnPOnline -Url $targetSiteUrl `
    -ClientId $clientId `
    -Tenant $tenantId `
    -CertificatePath $pfxPath `
    -CertificatePassword $pfxPassword
```

---

## 5. Integrating Private Keys with Azure Key Vault in CI/CD DevOps

To avoid storing `.pfx` files on local workstations or CI/CD runner disks, store the private key in **Azure Key Vault** and integrate via GitHub Actions or Azure DevOps:

### GitHub Actions Workflow (Zero Secret Disk Storage)
```yaml
name: Deploy via Azure Key Vault Certificate

on:
  workflow_dispatch:

jobs:
  secure-deploy:
    runs-on: windows-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Azure Login via OIDC (Zero Password)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Retrieve Certificate from Azure Key Vault
        uses: azure/powershell@v2
        with:
          azPSVersion: "latest"
          inlineScript: |
            $kvName = "kv-m365-migration-prod"
            $secretName = "SPOMigrationCert"
            $kvSecret = Get-AzKeyVaultSecret -VaultName $kvName -Name $secretName -AsPlainText
            $certBytes = [Convert]::FromBase64String($kvSecret)
            $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2(,$certBytes)
            
            Import-Module PnP.PowerShell -ErrorAction Stop
            Connect-PnPOnline -Url "${{ secrets.SPO_TENANT_ADMIN_URL }}" `
              -ClientId "${{ secrets.AZURE_CLIENT_ID }}" `
              -Tenant "${{ secrets.AZURE_TENANT_ID }}" `
              -Certificate $cert
              
            Write-Host "Deploying package to App Catalog..." -ForegroundColor Cyan
            Add-PnPApp -Path "./spo-migration-hub/sharepoint/solution/spo-migration-hub.sppkg" -Publish -Overwrite
```

---

## 6. Granular Site-Level Lockdown (`Sites.Selected`)

For highest security posture, avoid granting tenant-wide full control. Use Microsoft's `Sites.Selected` model to scope the private key's permissions strictly to the target migration site collection:

```powershell
<#
.SYNOPSIS
    Grants Write permissions strictly to the target migration site for the App ID
#>
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/MigrationSandbox" -Interactive

# Grant write access only to this specific site
Set-PnPAzureADAppSitePermission `
    -AppId "your-application-client-id" `
    -DisplayName "SPOMigrationManager" `
    -Permissions Write

# Verify granted permission
Get-PnPAzureADAppSitePermission
```

---

## 7. Security Best Practices Checklist

- [x] **Private Key Isolation**: Private keys (`.pfx`) are never checked into Git repositories (`.gitignore` enforces `*.pfx`, `*.cer`, `*.key`).
- [x] **Hardware-Bound Protection**: Production keys should reside in Azure Key Vault (Standard or Premium HSM-backed).
- [x] **Annual Rotation**: Configure automated alerts in Entra ID 30 days prior to certificate expiration.
- [x] **Principle of Least Privilege**: Use `Sites.Selected` instead of tenant-wide admin scopes whenever possible.
- [x] **Auditable Activity**: All actions taken via Certificate-Based Authentication are logged in the Microsoft 365 Unified Audit Log (UAL) under the Service Principal identity.

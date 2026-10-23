import * as React from 'react';
import styles from './SpoMigrationHub.module.scss';
import {
  IPermissionAuditItem,
  IUserMappingItem
} from './ISpoMigrationHubProps';
import {
  formatTimestampForFile,
  triggerBrowserDownload,
  exportUserMappingToCsvString,
  generateCollectNtfsPermissionsPs1,
  parseImportedPermissionsJson
} from './MigrationEngine';

export interface IPermissionsModalProps {
  isOpen: boolean;
  sourcePath: string;
  tenantDomain: string;
  permissions: IPermissionAuditItem[];
  userMappings: IUserMappingItem[];
  onClose: () => void;
  onUpdateMappingUpn: (id: string, newUpn: string, newStatus: IUserMappingItem['mappingStatus']) => void;
  onRegenerateSampleAcls: () => void;
  onSyncWithSharePointUsers: () => void;
  onImportPermissionsJson: (items: IPermissionAuditItem[]) => void;
}

export const PermissionsModal: React.FC<IPermissionsModalProps> = (props) => {
  const [activeSubTab, setActiveSubTab] = React.useState<'acl' | 'mapping' | 'inheritance'>('acl');
  const [riskFilter, setRiskFilter] = React.useState<'All' | 'Critical' | 'Warning'>('All');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  if (!props.isOpen) {
    return null;
  }

  const uniqueFolders = Array.from(new Set(props.permissions.map((p) => p.folderPath)));
  // Calculate unique folders with broken inheritance rather than raw ACE rows
  const brokenInheritanceFolders = Array.from(
    new Set(props.permissions.filter((p) => p.hasBrokenInheritance).map((p) => p.folderPath))
  );
  const brokenInheritanceCount = brokenInheritanceFolders.length;
  const orphanedCount = props.permissions.filter((p) => p.isOrphanedSid || p.isLocalAccount).length;
  const denyCount = props.permissions.filter((p) => p.isDenyAce).length;

  const filteredPermissions = props.permissions.filter((p) => {
    if (riskFilter === 'Critical') return p.riskLevel === 'Critical';
    if (riskFilter === 'Warning') return p.riskLevel === 'Warning' || p.riskLevel === 'Critical';
    return true;
  });

  // Deduplicate unique folders for Sub-Tab 3 table
  const uniqueFolderInheritanceRows = React.useMemo(() => {
    const map = new Map<string, IPermissionAuditItem>();
    for (const p of props.permissions) {
      if (!map.has(p.folderPath) || p.hasBrokenInheritance) {
        map.set(p.folderPath, p);
      }
    }
    return Array.from(map.values());
  }, [props.permissions]);

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('Selected JSON file exceeds the 25 MB safety limit.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '');
        const normalized = parseImportedPermissionsJson(text, props.sourcePath);
        if (normalized.length > 0) {
          props.onImportPermissionsJson(normalized);
        }
      } catch {
        // Log/handle invalid JSON
      } finally {
        e.target.value = '';
      }
    };
    reader.onerror = () => {
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalDialog}>
        <div className={styles.headerBar}>
          <div className={styles.titleGroup}>
            <h2 className={styles.mainTitle}>
              Permissions &amp; Identity Alignment — Dedicated Workspace
            </h2>
            <p className={styles.subtitle}>
              NTFS Access Control List (ACL) Inspection &bull; Active Directory to M365 Entra ID UPN Mapping &bull; 5,000 Unique Scope Check
            </p>
          </div>
          <div className={styles.headerControls}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleJsonUpload}
            />
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSlate}`}
              title="Import Audit: Import an offline NTFS permissions audit file exported by the Collect-NTFSPermissions.ps1 PowerShell script."
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              Import Permissions_Audit.json
              <span
                className={styles.infoIcon}
                title="Import Audit: Import an offline NTFS permissions audit file exported by the Collect-NTFSPermissions.ps1 PowerShell script."
              >
                ℹ
              </span>
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPurple}`}
              title="PowerShell Collector: Download the standalone PowerShell script to scan NTFS ACLs directly on the Windows file server."
              onClick={() => {
                const script = generateCollectNtfsPermissionsPs1(props.sourcePath);
                triggerBrowserDownload('Collect-NTFSPermissions.ps1', script);
              }}
            >
              Download Collect-NTFSPermissions.ps1
              <span
                className={styles.infoIcon}
                title="PowerShell Collector: Download the standalone PowerShell script to scan NTFS ACLs directly on the Windows file server."
              >
                ℹ
              </span>
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSuccess}`}
              title="Export Mapping: Export the current identity translation table as a CSV formatted for the SharePoint Migration Tool (SPMT)."
              onClick={() => {
                const ts = formatTimestampForFile();
                triggerBrowserDownload(
                  `UserMapping_${ts}.csv`,
                  exportUserMappingToCsvString(props.userMappings),
                  'text/csv;charset=utf-8'
                );
              }}
            >
              Export UserMapping.csv
              <span
                className={styles.infoIcon}
                title="Export Mapping: Export the current identity translation table as a CSV formatted for the SharePoint Migration Tool (SPMT)."
              >
                ℹ
              </span>
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              title="Export Permissions: Export the full permissions dataset including ACL entries, risk classifications, and SID information."
              onClick={() => {
                const ts = formatTimestampForFile();
                triggerBrowserDownload(
                  `Permissions_Audit_${ts}.json`,
                  JSON.stringify(props.permissions, null, 2),
                  'application/json'
                );
              }}
            >
              Export Permissions_Audit.json
              <span
                className={styles.infoIcon}
                title="Export Permissions: Export the full permissions dataset including ACL entries, risk classifications, and SID information."
              >
                ℹ
              </span>
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnDanger}`}
              onClick={props.onClose}
            >
              Close Window
            </button>
          </div>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.kpiGrid4}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiTitle}>
                Folders Audited
                <span
                  className={styles.infoIcon}
                  title="Folders Analyzed: Total unique folders analyzed for security permissions across the entire directory structure."
                >
                  ℹ
                </span>
              </span>
              <span className={styles.kpiValue}>{uniqueFolders.length}</span>
              <span className={styles.kpiSub}>{props.permissions.length} Total ACE Rules</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiTitle}>
                Broken Inheritance
                <span
                  className={styles.infoIcon}
                  title="Explicit Permission Scopes: Number of unique folders that do not inherit permissions from parent directories. Each breaks inheritance and creates a unique SharePoint security scope."
                >
                  ℹ
                </span>
              </span>
              <span className={styles.kpiValue} style={{ color: '#f59e0b' }}>
                {brokenInheritanceCount}
              </span>
              <span className={styles.kpiSub}>Unique Folders with Explicit ACLs</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiTitle}>
                Orphaned SIDs / Local
                <span
                  className={styles.infoIcon}
                  title="Unmapped Principals: Accounts with unresolvable security IDs (deleted users/groups) or local computer accounts that do not exist in Microsoft 365 Entra ID."
                >
                  ℹ
                </span>
              </span>
              <span className={styles.kpiValue} style={{ color: '#ef4444' }}>
                {orphanedCount}
              </span>
              <span className={styles.kpiSub}>Unresolvable in Entra ID</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiTitle}>
                Deny ACEs Flagged
                <span
                  className={styles.infoIcon}
                  title="Unsupported Deny Rules: Explicit Deny permission rules detected. SharePoint Online permissions are additive only; explicit Deny ACEs are unsupported and flagged as critical."
                >
                  ℹ
                </span>
              </span>
              <span className={styles.kpiValue} style={{ color: '#ef4444' }}>
                {denyCount}
              </span>
              <span className={styles.kpiSub}>Unsupported by SPO Roles</span>
            </div>
          </div>

          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              <button
                type="button"
                className={`${styles.btn} ${activeSubTab === 'acl' ? styles.btnPrimary : styles.btnSlate}`}
                title="ACL Table: View and filter all raw Access Control Entries, file system rights, and mapped SharePoint roles."
                onClick={() => setActiveSubTab('acl')}
              >
                1. NTFS ACL Matrix ({props.permissions.length})
                <span
                  className={styles.infoIcon}
                  title="ACL Table: View and filter all raw Access Control Entries, file system rights, and mapped SharePoint roles."
                >
                  ℹ
                </span>
              </button>
              <button
                type="button"
                className={`${styles.btn} ${activeSubTab === 'mapping' ? styles.btnPrimary : styles.btnSlate}`}
                title="UPN Mapping: Interactive editor to map on-premises domain accounts to cloud Microsoft 365 Entra ID User Principal Names (UPNs)."
                onClick={() => setActiveSubTab('mapping')}
              >
                2. Identity Mapping Editor ({props.userMappings.length})
                <span
                  className={styles.infoIcon}
                  title="UPN Mapping: Interactive editor to map on-premises domain accounts to cloud Microsoft 365 Entra ID User Principal Names (UPNs)."
                >
                  ℹ
                </span>
              </button>
              <button
                type="button"
                className={`${styles.btn} ${activeSubTab === 'inheritance' ? styles.btnPrimary : styles.btnSlate}`}
                title="5,000 Scope Limit: Microsoft SharePoint Online Limit: A document library has a hard threshold of 5,000 unique permission scopes. Folders exceeding this ceiling cause severe query degradation and sync failures."
                onClick={() => setActiveSubTab('inheritance')}
              >
                3. Broken Inheritance &amp; 5,000-Scope Check ({uniqueFolderInheritanceRows.length})
                <span
                  className={styles.infoIcon}
                  title="5,000 Scope Limit: Microsoft SharePoint Online Limit: A document library has a hard threshold of 5,000 unique permission scopes. Folders exceeding this ceiling cause severe query degradation and sync failures."
                >
                  ℹ
                </span>
              </button>
            </div>

            <div className={styles.filterGroup}>
              {activeSubTab === 'acl' && (
                <>
                  <span className={styles.fieldLabel}>
                    Risk Filter:
                    <span
                      className={styles.infoIcon}
                      title="Filter by Risk: Filter ACL rules by risk level (Critical Blockers, Warnings, or All)."
                    >
                      ℹ
                    </span>
                  </span>
                  <select
                    className={styles.darkSelect}
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value as 'All' | 'Critical' | 'Warning')}
                  >
                    <option value="All">All ACL Entries</option>
                    <option value="Warning">Warnings &amp; Critical Only</option>
                    <option value="Critical">Critical Blockers Only</option>
                  </select>
                </>
              )}
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                title="Live UPN Verification: Queries the target SharePoint site user information list via SPHttpClient to validate that mapped UPNs actually exist in the tenant."
                onClick={props.onSyncWithSharePointUsers}
              >
                Verify Identities Against Live SharePoint Site Users
                <span
                  className={styles.infoIcon}
                  title="Live UPN Verification: Queries the target SharePoint site user information list via SPHttpClient to validate that mapped UPNs actually exist in the tenant."
                >
                  ℹ
                </span>
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSlate}`}
                title="Sample Data Reset: Resets the permissions dataset back to the standard development test dataset containing known broken inheritance and orphaned SID edge cases."
                onClick={props.onRegenerateSampleAcls}
              >
                Reset Dev Sample ACLs
                <span
                  className={styles.infoIcon}
                  title="Sample Data Reset: Resets the permissions dataset back to the standard development test dataset containing known broken inheritance and orphaned SID edge cases."
                >
                  ℹ
                </span>
              </button>
            </div>
          </div>

          {activeSubTab === 'acl' && (
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Risk</th>
                    <th>Folder Path</th>
                    <th>NTFS Identity Reference</th>
                    <th>Access Type</th>
                    <th>NTFS Rights</th>
                    <th>Mapped SPO Role</th>
                    <th>Inherited</th>
                    <th>Unique Scopes</th>
                    <th>Risk Assessment Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPermissions.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span
                          className={
                            p.riskLevel === 'Critical'
                              ? styles.pillDanger
                              : p.riskLevel === 'Warning'
                              ? styles.pillWarn
                              : styles.pillClean
                          }
                        >
                          {p.riskLevel.toUpperCase()}
                        </span>
                      </td>
                      <td className={styles.monoText}>{p.folderPath}</td>
                      <td>
                        <strong>{p.identityReference}</strong>
                      </td>
                      <td>
                        <span className={p.isDenyAce ? styles.pillDanger : styles.pillClean}>
                          {p.accessControlType}
                        </span>
                      </td>
                      <td>{p.fileSystemRights}</td>
                      <td>{p.mappedSpoRole}</td>
                      <td>{p.isInherited ? 'Yes' : 'No (Explicit)'}</td>
                      <td>{p.uniqueAclCount}</td>
                      <td>{p.riskNotes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeSubTab === 'mapping' && (
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Source On-Premises Identity</th>
                    <th>Principal Classification</th>
                    <th>Target M365 Entra ID UPN (Editable)</th>
                    <th>Mapping Status</th>
                    <th>Notes / Group Type</th>
                  </tr>
                </thead>
                <tbody>
                  {props.userMappings.map((m) => (
                    <tr key={m.id}>
                      <td className={styles.monoText}>
                        <strong>{m.sourceIdentity}</strong>
                      </td>
                      <td>{m.accountType}</td>
                      <td>
                        <input
                          type="text"
                          className={styles.darkInput}
                          style={{ width: '100%', minWidth: '250px' }}
                          value={m.targetUpn}
                          placeholder="user@tenant.onmicrosoft.com"
                          onChange={(e) =>
                            props.onUpdateMappingUpn(
                              m.id,
                              e.target.value,
                              e.target.value.trim() ? 'Verified in SPO' : 'Unmapped (Exclude)'
                            )
                          }
                        />
                      </td>
                      <td>
                        <span
                          className={
                            m.mappingStatus === 'Verified in SPO' || m.mappingStatus === 'Auto-Mapped'
                              ? styles.pillClean
                              : m.mappingStatus === 'Needs Review'
                              ? styles.pillWarn
                              : styles.pillDanger
                          }
                        >
                          {m.mappingStatus}
                        </span>
                      </td>
                      <td>{m.department}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeSubTab === 'inheritance' && (
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Folder Path</th>
                    <th>Inheritance State</th>
                    <th>Unique ACL Scope Count</th>
                    <th>SPO 5,000 Scope Limit Check</th>
                    <th>Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueFolderInheritanceRows.map((p) => (
                    <tr key={`inh_${p.id}`}>
                      <td className={styles.monoText}>{p.folderPath}</td>
                      <td>
                        <span className={p.hasBrokenInheritance ? styles.pillWarn : styles.pillClean}>
                          {p.hasBrokenInheritance ? 'Broken Inheritance' : 'Inherited'}
                        </span>
                      </td>
                      <td>
                        <strong>{p.uniqueAclCount}</strong>
                      </td>
                      <td>
                        <span className={p.uniqueAclCount > 5000 ? styles.pillDanger : styles.pillClean}>
                          {p.uniqueAclCount > 5000 ? 'EXCEEDS 5,000 LIMIT' : 'Within 5,000 Limit'}
                        </span>
                      </td>
                      <td>
                        {p.uniqueAclCount > 5000
                          ? 'Consolidate folder permissions into M365 Groups or split into separate Document Libraries.'
                          : p.hasBrokenInheritance
                          ? 'Explicit folder permissions will be preserved in SharePoint Online.'
                          : 'Inherits permissions from parent library.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

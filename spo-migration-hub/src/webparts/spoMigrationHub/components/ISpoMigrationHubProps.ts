import { SPHttpClient } from '@microsoft/sp-http';

export type EnvironmentProfileKey =
  | 'Development'
  | 'Test / QA'
  | 'Staging / Pre-Prod'
  | 'Production';

export interface IEnvironmentProfileConfig {
  key: EnvironmentProfileKey;
  badgeLabel: string;
  badgeColor: string;
  maxFileSizeMB: number;
  maxPathLength: number;
  defaultSubfolder: string;
  defaultSiteSuffix: string;
  description: string;
}

export interface IInventoryItem {
  id: string;
  itemName: string;
  fullPath: string;
  relativePath: string;
  directoryPath: string;
  itemType: 'File' | 'Folder';
  extension: string;
  sizeBytes: number;
  sizeMB: number;
  pathLength: number;
  estimatedSpoUrlLength: number;
  depth: number;
  hasInvalidChars: boolean;
  invalidCharsFound: string;
  hasInvalidSubstrings: boolean;
  invalidSubstringsFound: string;
  hasBoundaryIssue: boolean;
  boundaryIssuesFound: string;
  isReservedName: boolean;
  exceedsPathLimit: boolean;
  exceedsSizeLimit: boolean;
  isFlagged: boolean;
  issueSummary: string;
  sha256Hash: string;
  lastModified: string;
  fileObject?: File;
}

export interface IRemediationPlanItem {
  id: string;
  itemType: 'File' | 'Folder';
  depth: number;
  currentName: string;
  proposedSanitizedName: string;
  originalFullPath: string;
  proposedFullPath: string;
  directoryPath: string;
  reason: string;
  status: 'Pending (Dry-Run)' | 'Remediated' | 'Skipped' | 'Failed';
  rollbackCommand: string;
  remediateCommand: string;
}

export interface IPermissionAuditItem {
  id: string;
  folderPath: string;
  identityReference: string;
  accessControlType: 'Allow' | 'Deny';
  fileSystemRights: string;
  mappedSpoRole: string;
  isInherited: boolean;
  hasBrokenInheritance: boolean;
  uniqueAclCount: number;
  isOrphanedSid: boolean;
  isLocalAccount: boolean;
  isDenyAce: boolean;
  riskLevel: 'Clean' | 'Warning' | 'Critical';
  riskNotes: string;
}

export interface IUserMappingItem {
  id: string;
  sourceIdentity: string;
  accountType: 'AD Domain User' | 'AD Security Group' | 'Orphaned SID' | 'Local Machine Account';
  targetUpn: string;
  mappingStatus: 'Verified in SPO' | 'Auto-Mapped' | 'Needs Review' | 'Unmapped (Exclude)';
  department: string;
}

export interface ISpoLibraryInfo {
  id: string;
  title: string;
  itemCount: number;
  serverRelativeUrl: string;
  enableVersioning: boolean;
  enableMinorVersions: boolean;
  majorVersionLimit: number;
}

export interface ITargetSpoAssessment {
  siteUrl: string;
  webTitle: string;
  connectionMode: 'Live SPHttpClient (Authenticated)' | 'Simulated Readiness Profile';
  totalStorageQuotaGB: number;
  usedStorageGB: number;
  freeStorageGB: number;
  freeStoragePercent: number;
  baseUrlLength: number;
  maxAllowedSpoUrlLength: number;
  safeRelativePathHeadroom: number;
  libraries: ISpoLibraryInfo[];
  selectedLibrary: string;
  selectedLibraryItemCount: number;
  listViewThresholdWarning: boolean;
  versioningWarning: boolean;
  readinessStatus: 'READY' | 'WARNING' | 'CRITICAL';
  readinessSummary: string;
}

export interface IBatchBenchmarkRow {
  batchNumber: number;
  batchName: string;
  fileCount: number;
  batchSizeGB: number;
  simulatedDurationSec: number;
  throughputMBps: number;
  projectedGBPerHour: number;
  interBatchPauseSec: number;
  throttleEvents429: number;
  status: string;
}

export interface IAnomalyEvent {
  id: string;
  timestamp: string;
  category: 'Storage Quota' | 'Source Hygiene' | 'Path Headroom' | 'Permissions & ACL' | 'SPO Throttling';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  metricValue: string;
  thresholdValue: string;
  description: string;
  recommendedAction: string;
}

export interface IActivityLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  stage: string;
  message: string;
}

export interface ISpoMigrationHubProps {
  spHttpClient: SPHttpClient;
  currentWebUrl: string;
  currentWebTitle: string;
  userDisplayName: string;
  userEmail: string;
  defaultEnvironment: EnvironmentProfileKey;
  defaultTargetSiteUrl: string;
  defaultTargetLibrary: string;
  defaultReplacementChar: string;
  defaultTenantDomain: string;
  isEditMode: boolean;
}

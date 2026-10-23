import {
  EnvironmentProfileKey,
  IEnvironmentProfileConfig,
  IInventoryItem,
  IRemediationPlanItem,
  IPermissionAuditItem,
  IUserMappingItem,
  ITargetSpoAssessment,
  ISpoLibraryInfo,
  IBatchBenchmarkRow,
  IAnomalyEvent
} from './ISpoMigrationHubProps';

export const ENVIRONMENT_PROFILES: Record<EnvironmentProfileKey, IEnvironmentProfileConfig> = {
  'Development': {
    key: 'Development',
    badgeLabel: 'DEV SANDBOX',
    badgeColor: '#0284c7',
    maxFileSizeMB: 250, // Updated from 50 to 250 MB (Official Microsoft List Attachment limit & pilot benchmark)
    maxPathLength: 260,
    defaultSubfolder: 'Dev_Pilot_Migration',
    defaultSiteSuffix: '/sites/Migration-Dev',
    description: 'Standard 250 MB list attachment threshold & 260-char path limits for rapid pilot testing & validation.'
  },
  'Test / QA': {
    key: 'Test / QA',
    badgeLabel: 'TEST / QA',
    badgeColor: '#8b5cf6',
    maxFileSizeMB: 2048, // 2 GB (matching OneNote & UAT threshold)
    maxPathLength: 300,
    defaultSubfolder: 'QA_Validation_Drop',
    defaultSiteSuffix: '/sites/Migration-QA',
    description: '2 GB / 300-char limits for UAT permission verification and dry-run validation.'
  },
  'Staging / Pre-Prod': {
    key: 'Staging / Pre-Prod',
    badgeLabel: 'STAGING / PRE-PROD',
    badgeColor: '#f59e0b',
    maxFileSizeMB: 15000, // 15 GB (matching Cross-Geo move limit)
    maxPathLength: 350,
    defaultSubfolder: 'Staging_Cutover_Rehearsal',
    defaultSiteSuffix: '/sites/Migration-Staging',
    description: '15 GB / 350-char limits for full dress rehearsal and 250 GB batch throughput benchmarking.'
  },
  'Production': {
    key: 'Production',
    badgeLabel: 'PRODUCTION CUTOVER',
    badgeColor: '#10b981',
    maxFileSizeMB: 250000, // 250 GB (250,000 MB - SharePoint Online maximum file size ceiling)
    maxPathLength: 400,
    defaultSubfolder: 'Production_Cutover',
    defaultSiteSuffix: '/sites/CorporateArchive',
    description: 'SharePoint Online ceiling (250 GB file size / 400-char URL limit) for final production cutover.'
  }
};

// SharePoint Online Strictly Prohibited & Restricted Characters (matching Microsoft Learn & Support)
// Strictly prohibited across all SharePoint Online / OneDrive: " * : < > ? / \ |
// Conditional / legacy restrictions: ~ # % & { } ^ [ ] + ;
const INVALID_CHARS_LIST: string[] = [
  '"', '*', ':', '<', '>', '?', '/', '\\', '|',
  '~', '#', '%', '&', '{', '}', '^', '[', ']', '+', ';'
];

const INVALID_SUBSTRINGS: string[] = ['_vti_', '.lock', 'desktop.ini', 'thumbs.db', '.ds_store'];

const BLOCKED_FILE_EXTENSIONS: string[] = ['.tmp', '.lock'];
const RESTRICTED_FILE_EXTENSIONS: string[] = ['.pst'];

const RESERVED_EXACT_NAMES: string[] = [
  'CON', 'PRN', 'AUX', 'NUL',
  'COM0', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT0', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
];

let _deterministicIdCounter = 1;

export function formatTimestampForFile(): string {
  const d = new Date();
  const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/**
 * Hardened PowerShell single-quote escaper:
 * Strips CR/LF/NUL control characters and doubles ASCII & Unicode curly single quotes.
 */
export function escapePsSingleQuotes(val: string): string {
  return String(val ?? '')
    .replace(/[\r\n\0]/g, ' ')
    .replace(/['\u2018\u2019\u201A\u201B]/g, "''");
}

/**
 * Escapes single quotes for SharePoint REST OData string literals inside ('...')
 */
export function escapeODataString(val: string): string {
  return String(val ?? '')
    .replace(/[\r\n\0]/g, '')
    .replace(/'/g, "''");
}

/**
 * Validates that a candidate SharePoint Site URL uses HTTPS and belongs to SharePoint Online or the current web host
 */
export function isValidSpoSiteUrl(candidateUrl: string, currentWebUrl?: string): boolean {
  try {
    const parsed = new URL(candidateUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (currentWebUrl) {
      try {
        const currentHost = new URL(currentWebUrl).hostname.toLowerCase();
        if (host === currentHost) return true;
      } catch {
        // Ignore invalid currentWebUrl in workbench
      }
    }
    return (
      host.endsWith('.sharepoint.com') ||
      host.endsWith('.sharepoint.us') ||
      host.endsWith('.sharepoint.de') ||
      host.endsWith('.sharepoint.cn')
    );
  } catch {
    return false;
  }
}

/**
 * Sanitizes a CSV cell against Spreadsheet Formula / DDE Injection (=, +, -, @, \t, \r)
 */
export function sanitizeCsvCell(val: string | number | boolean): string {
  if (typeof val === 'number' || typeof val === 'boolean') {
    return `"${String(val)}"`;
  }
  let str = String(val ?? '');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export async function computeSha256Hex(file: File): Promise<string> {
  try {
    if (file.size > 25 * 1024 * 1024) {
      return 'SKIPPED_LARGE_FILE';
    }
    const buffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => ('00' + b.toString(16)).slice(-2)).join('').toUpperCase();
  } catch {
    return 'HASH_UNAVAILABLE';
  }
}

export function evaluateSpoItemRules(
  itemName: string,
  fullPath: string,
  relativePath: string,
  directoryPath: string,
  itemType: 'File' | 'Folder',
  sizeBytes: number,
  maxFileSizeMB: number,
  maxPathLength: number,
  targetBaseUrlLength: number,
  sha256Hash: string = '',
  lastModified: string = new Date().toISOString(),
  fileObject?: File
): IInventoryItem {
  const safeName = String(itemName ?? 'Unnamed');
  const safeFullPath = String(fullPath ?? safeName);
  const safeRelPath = String(relativePath ?? safeName);
  const safeDirPath = String(directoryPath ?? '');
  const safeSizeBytes = Number.isFinite(sizeBytes) && sizeBytes >= 0 ? sizeBytes : 0;

  const foundInvalidChars: string[] = [];
  for (const ch of INVALID_CHARS_LIST) {
    if (safeName.indexOf(ch) !== -1) {
      foundInvalidChars.push(ch);
    }
  }

  const lowerName = safeName.toLowerCase();
  const foundSubstrings: string[] = [];
  for (const sub of INVALID_SUBSTRINGS) {
    if (lowerName.indexOf(sub) !== -1) {
      foundSubstrings.push(sub);
    }
  }

  const boundaryIssues: string[] = [];
  if (/^\s/.test(safeName)) boundaryIssues.push('Leading Space');
  if (/\s$/.test(safeName)) boundaryIssues.push('Trailing Space');
  if (/^\./.test(safeName)) boundaryIssues.push('Leading Period');
  if (/\.$/.test(safeName)) boundaryIssues.push('Trailing Period');
  if (/\.{2,}/.test(safeName)) boundaryIssues.push('Consecutive Periods (..)');

  const baseNameWithoutExt = safeName.replace(/\.[^/.]+$/, '').toUpperCase();
  const upperFull = safeName.toUpperCase();
  const isReservedName =
    RESERVED_EXACT_NAMES.indexOf(upperFull) !== -1 ||
    RESERVED_EXACT_NAMES.indexOf(baseNameWithoutExt) !== -1;

  const sizeMB = Math.round((safeSizeBytes / (1024 * 1024)) * 100) / 100;
  const normalizedRel = safeRelPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const pathLength = safeFullPath.length;
  const estimatedSpoUrlLength = targetBaseUrlLength + 1 + normalizedRel.length;
  const exceedsPathLimit = pathLength > maxPathLength || estimatedSpoUrlLength > maxPathLength;
  const exceedsSizeLimit = itemType === 'File' && sizeMB > maxFileSizeMB;

  const depth = normalizedRel.split('/').filter(Boolean).length;
  const extMatch = itemType === 'File' ? safeName.match(/\.[^/.]+$/) : null;
  const extLower = extMatch ? extMatch[0].toLowerCase() : '';

  // File type & name rules per official Microsoft Limits & Restrictions documentation:
  const isTempOfficeLock = safeName.startsWith('~$');
  const isBlockedExt = BLOCKED_FILE_EXTENSIONS.indexOf(extLower) !== -1;
  const isRestrictedExt = RESTRICTED_FILE_EXTENSIONS.indexOf(extLower) !== -1;
  const isRootForms = itemType === 'Folder' && (normalizedRel.toLowerCase() === 'forms' || (safeName.toLowerCase() === 'forms' && depth <= 1));
  const hasInvalidFolderPrefix = itemType === 'Folder' && (safeName.startsWith('\u309B') || safeName.startsWith('\u1018'));
  const isFolderWithSemicolon = itemType === 'Folder' && safeName.indexOf(';') !== -1;

  if (isTempOfficeLock) boundaryIssues.push('Blocked Temp File (Office ~$ lock)');
  if (isRootForms) boundaryIssues.push("Blocked Root Folder ('forms' at library root)");
  if (hasInvalidFolderPrefix) boundaryIssues.push('Invalid Folder Prefix (starts with ゛ or ဧ)');
  if (isFolderWithSemicolon) boundaryIssues.push("Folder Name Contains Semicolon ';' (Breaks Office Win32 Backstage)");

  const hasInvalidChars = foundInvalidChars.length > 0;
  const hasInvalidSubstrings = foundSubstrings.length > 0;
  const hasBoundaryIssue = boundaryIssues.length > 0;

  const issueParts: string[] = [];
  if (hasInvalidChars) issueParts.push(`Invalid Chars (${foundInvalidChars.join(' ')})`);
  if (hasInvalidSubstrings) issueParts.push(`Blocked Pattern (${foundSubstrings.join(', ')})`);
  if (hasBoundaryIssue) issueParts.push(boundaryIssues.join(', '));
  if (isReservedName) issueParts.push(`Reserved Device Name (${safeName})`);
  if (isBlockedExt) issueParts.push(`Blocked File Type (${extLower} does not sync)`);
  if (isRestrictedExt) issueParts.push(`Restricted File Type (${extLower} Outlook data file)`);
  if (exceedsPathLimit) issueParts.push(`Path > ${maxPathLength} (${Math.max(pathLength, estimatedSpoUrlLength)} chars)`);
  if (exceedsSizeLimit) issueParts.push(`Size > ${maxFileSizeMB} MB (${sizeMB} MB)`);

  const isFlagged = issueParts.length > 0 || isBlockedExt || isRestrictedExt;

  return {
    id: `${itemType}_${safeFullPath}`,
    itemName: safeName,
    fullPath: safeFullPath,
    relativePath: normalizedRel,
    directoryPath: safeDirPath,
    itemType,
    extension: extMatch ? extMatch[0].toLowerCase() : '',
    sizeBytes: safeSizeBytes,
    sizeMB,
    pathLength,
    estimatedSpoUrlLength,
    depth,
    hasInvalidChars,
    invalidCharsFound: foundInvalidChars.join(' '),
    hasInvalidSubstrings,
    invalidSubstringsFound: foundSubstrings.join(', '),
    hasBoundaryIssue,
    boundaryIssuesFound: boundaryIssues.join(', '),
    isReservedName,
    exceedsPathLimit,
    exceedsSizeLimit,
    isFlagged,
    issueSummary: isFlagged ? issueParts.join(' | ') : 'Clean (Ready for SPO)',
    sha256Hash: sha256Hash || (itemType === 'Folder' ? 'N/A (Folder)' : 'Not Computed'),
    lastModified,
    fileObject
  };
}

/**
 * Scans a FileSystemDirectoryHandle (File System Access API) allowing Chrome/Edge users
 * to select and stream an entire network share (UNC path or mapped network drive) into the web part.
 */
export async function scanFileSystemDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  maxFileSizeMB: number,
  maxPathLength: number,
  baseUrlLength: number,
  computeHashes: boolean,
  onProgress?: (count: number, currentItem: string) => void
): Promise<{ items: IInventoryItem[]; rootPathDisplay: string }> {
  const rootName = dirHandle.name || 'NetworkFileShare';
  const rootPathDisplay = `\\\\FileShare\\${rootName}`;
  const items: IInventoryItem[] = [];

  async function walk(
    currentDir: FileSystemDirectoryHandle,
    currentRelPath: string,
    currentDirPath: string
  ): Promise<void> {
    const dirAny = currentDir as unknown as { values: () => AsyncIterable<FileSystemHandle> };
    for await (const entry of dirAny.values()) {
      const entryName: string = entry.name;
      const relPath = currentRelPath ? `${currentRelPath}/${entryName}` : entryName;
      const fullPath = `${currentDirPath}\\${entryName}`;

      if (entry.kind === 'directory') {
        items.push(
          evaluateSpoItemRules(
            entryName,
            fullPath,
            relPath,
            currentDirPath,
            'Folder',
            0,
            maxFileSizeMB,
            maxPathLength,
            baseUrlLength,
            'N/A (Folder)'
          )
        );
        if (onProgress) onProgress(items.length, entryName);
        await walk(entry as FileSystemDirectoryHandle, relPath, fullPath);
      } else if (entry.kind === 'file') {
        const fileObj = await (entry as FileSystemFileHandle).getFile();
        const hash = computeHashes ? await computeSha256Hex(fileObj) : 'Not Computed';
        items.push(
          evaluateSpoItemRules(
            entryName,
            fullPath,
            relPath,
            currentDirPath,
            'File',
            fileObj.size,
            maxFileSizeMB,
            maxPathLength,
            baseUrlLength,
            hash,
            new Date(fileObj.lastModified).toISOString(),
            fileObj
          )
        );
        if (onProgress) onProgress(items.length, entryName);
      }
    }
  }

  await walk(dirHandle, '', rootPathDisplay);
  return { items, rootPathDisplay };
}

/**
 * Generates a realistic 5-level Dev Test Dataset matching DummyData-Generator.psm1
 */
export function generateMockDevDataset(
  rootPath: string,
  maxFileSizeMB: number,
  maxPathLength: number,
  targetBaseUrlLength: number,
  computeHashes: boolean
): IInventoryItem[] {
  const baseRoot = rootPath.replace(/[\\/]+$/, '') || 'C:\\MigrationSource\\DevTestShare';
  const mockSpecs: Array<{
    relPath: string;
    type: 'File' | 'Folder';
    sizeBytes: number;
    hash: string;
  }> = [
    { relPath: '01_Finance_Department', type: 'Folder', sizeBytes: 0, hash: '' },
    { relPath: '01_Finance_Department/Q1_Budget#2026_Final%.xlsx', type: 'File', sizeBytes: 4250000, hash: '8F4A2B9C10E3D745A119C04E6B32D19A8F4A2B9C10E3D745A119C04E6B32D19A' },
    { relPath: '01_Finance_Department/M&A_Analysis_~TempDraft.docx', type: 'File', sizeBytes: 1840000, hash: '3C91E7F04A12B68D55E2A019F47C8B323C91E7F04A12B68D55E2A019F47C8B32' },
    { relPath: '01_Finance_Department/AP_Ledger_2026_Clean.xlsx', type: 'File', sizeBytes: 3120000, hash: '7A11D2C94E88F301B5A6C290E41F82B17A11D2C94E88F301B5A6C290E41F82B1' },
    { relPath: '01_Finance_Department/ .LeadingAndTrailingSpaceReport .pdf', type: 'File', sizeBytes: 950000, hash: '1D44B8A92C03F711E6D2094A8C55E3011D44B8A92C03F711E6D2094A8C55E301' },
    { relPath: '01_Finance_Department/~$Executive_Compensation_Draft.xlsx', type: 'File', sizeBytes: 165000, hash: '3A12B4C5D6E7F809A1B2C3D4E5F6A7B83A12B4C5D6E7F809A1B2C3D4E5F6A7B8' },
    { relPath: '02_Engineering_CAD_Vault', type: 'Folder', sizeBytes: 0, hash: '' },
    { relPath: '02_Engineering_CAD_Vault/Project_Titan_{Rev_A+B}', type: 'Folder', sizeBytes: 0, hash: '' },
    { relPath: '02_Engineering_CAD_Vault/Project_Titan_{Rev_A+B}/Assembly_Drawing_[v2.4]^Final.dwg', type: 'File', sizeBytes: 68500000, hash: '9B20C4E81F33A709D412E8C05A66F1929B20C4E81F33A709D412E8C05A66F192' },
    { relPath: '02_Engineering_CAD_Vault/Project_Titan_{Rev_A+B}/CON.docx', type: 'File', sizeBytes: 215000, hash: '4E88A1C09F21B374D605E129C84A70F14E88A1C09F21B374D605E129C84A70F1' },
    { relPath: '02_Engineering_CAD_Vault/Project_Titan_{Rev_A+B}/LPT1.txt', type: 'File', sizeBytes: 18400, hash: '5F19D3B08A42C617E904F238B71C50E25F19D3B08A42C617E904F238B71C50E2' },
    { relPath: '02_Engineering_CAD_Vault/Project_Titan_{Rev_A+B}/thumbs.db', type: 'File', sizeBytes: 51200, hash: '6A20E4C19B53D728F015A349C82D61F36A20E4C19B53D728F015A349C82D61F3' },
    { relPath: '02_Engineering_CAD_Vault/Project_Titan_{Rev_A+B}/Build_Cache.tmp', type: 'File', sizeBytes: 85000, hash: '7B31F5D20C64E839A126B450D93E72A47B31F5D20C64E839A126B450D93E72A4' },
    { relPath: '03_Legal_&_Compliance', type: 'Folder', sizeBytes: 0, hash: '' },
    { relPath: '03_Legal_&_Compliance/Contract;Review_Archive', type: 'Folder', sizeBytes: 0, hash: '' },
    { relPath: '03_Legal_&_Compliance/_vti_cnf', type: 'Folder', sizeBytes: 0, hash: '' },
    { relPath: '03_Legal_&_Compliance/_vti_cnf/LegacyFrontPageMetadata.lock', type: 'File', sizeBytes: 12800, hash: '2B01F9D48C63E519A724B058D93E72A42B01F9D48C63E519A724B058D93E72A4' },
    { relPath: '03_Legal_&_Compliance/MSA_Contract_2026_Clean_Signed.pdf', type: 'File', sizeBytes: 5400000, hash: 'C410A8E92D37F612B805C941E72F83B5C410A8E92D37F612B805C941E72F83B5' },
    { relPath: '03_Legal_&_Compliance/NDA_Partner..Agreement..2026..docx', type: 'File', sizeBytes: 780000, hash: 'D521B9F03E48A723C916D052F83A94C6D521B9F03E48A723C916D052F83A94C6' },
    { relPath: '04_HR_Executive_Records', type: 'Folder', sizeBytes: 0, hash: '' },
    { relPath: '04_HR_Executive_Records/Employee_Handbook_2026_Clean.pdf', type: 'File', sizeBytes: 8900000, hash: 'E632C0A14F59B834D027E163A94B05D7E632C0A14F59B834D027E163A94B05D7' },
    { relPath: '04_HR_Executive_Records/desktop.ini', type: 'File', sizeBytes: 4096, hash: 'F743D1B25A60C945E138F274B05C16E8F743D1B25A60C945E138F274B05C16E8' },
    { relPath: '04_HR_Executive_Records/Legacy_Mail_Backup_2024.pst', type: 'File', sizeBytes: 285000000, hash: 'SKIPPED_LARGE_FILE' },
    {
      relPath: '05_Deep_Archive_Hierarchy/Division_NorthAmerica_Enterprise_Operations/Regional_Compliance_And_Regulatory_Audits_2020_2026/Subcommittee_Financial_Controls_SOX_Section_404_Evidence_Packages/Quarterly_Reconciliation_Workpapers_And_Signed_Attestations/Q4_Final_Consolidated_Audit_Trail_#9941_Reviewed_By_External_Auditors.xlsx',
      type: 'File',
      sizeBytes: 14200000,
      hash: 'A854E2C36B71D056F249A385C16D27F9A854E2C36B71D056F249A385C16D27F9'
    },
    { relPath: '06_Media_Training_Videos', type: 'Folder', sizeBytes: 0, hash: '' },
    { relPath: '06_Media_Training_Videos/Global_TownHall_4K_Master_Recording.mp4', type: 'File', sizeBytes: 612000000, hash: 'SKIPPED_LARGE_FILE' }
  ];

  return mockSpecs.map((spec) => {
    const parts = spec.relPath.split('/');
    const itemName = parts[parts.length - 1];
    const dirRel = parts.slice(0, -1).join('\\');
    const directoryPath = dirRel ? `${baseRoot}\\${dirRel}` : baseRoot;
    const fullPath = `${baseRoot}\\${spec.relPath.replace(/\//g, '\\')}`;
    return evaluateSpoItemRules(
      itemName,
      fullPath,
      spec.relPath,
      directoryPath,
      spec.type,
      spec.sizeBytes,
      maxFileSizeMB,
      maxPathLength,
      targetBaseUrlLength,
      computeHashes ? spec.hash : (spec.type === 'Folder' ? 'N/A (Folder)' : 'Not Computed')
    );
  });
}

/**
 * Generates an ASCII Directory Tree (.txt) matching Export-SPODirectoryTree in Inventory-Assessment.psm1
 */
export function buildAsciiDirectoryTree(
  items: IInventoryItem[],
  sourceRoot: string,
  envProfile: EnvironmentProfileKey
): string {
  const lines: string[] = [];
  const totalFiles = items.filter((i) => i.itemType === 'File').length;
  const totalFolders = items.filter((i) => i.itemType === 'Folder').length;
  const flaggedCount = items.filter((i) => i.isFlagged).length;

  lines.push('================================================================================');
  lines.push('  SHAREPOINT ONLINE MIGRATION MANAGER & READINESS HUB - DIRECTORY TREE');
  lines.push('================================================================================');
  lines.push(`  Generated At       : ${new Date().toISOString()}`);
  lines.push(`  Target Profile     : ${envProfile}`);
  lines.push(`  Source Root        : ${sourceRoot}`);
  lines.push(`  Total Items        : ${items.length} (${totalFolders} Folders, ${totalFiles} Files)`);
  lines.push(`  Flagged SPO Issues : ${flaggedCount}`);
  lines.push('================================================================================');
  lines.push('');
  lines.push(`[ROOT] ${sourceRoot}`);

  const sorted = [...items].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const lastIndexByParent = new Map<string, number>();
  sorted.forEach((item, idx) => {
    lastIndexByParent.set(item.directoryPath.toLowerCase(), idx);
  });

  sorted.forEach((item, idx) => {
    const isLastInParent = lastIndexByParent.get(item.directoryPath.toLowerCase()) === idx;
    const indent = '  '.repeat(Math.max(0, item.depth - 1));
    const connector = isLastInParent ? '`-- ' : '|-- ';
    const typeTag = item.itemType === 'Folder' ? '[DIR] ' : '[FILE]';
    const statusTag = item.isFlagged ? `[WARN: ${item.issueSummary}]` : '[CLEAN]';
    const sizeStr = item.itemType === 'File' ? ` (${item.sizeMB} MB)` : '';
    lines.push(`${indent}${connector}${typeTag} ${item.itemName}${sizeStr} ${statusTag}`);
  });

  lines.push('');
  lines.push('================================================================================');
  lines.push('  END OF DIRECTORY TREE');
  lines.push('================================================================================');
  return lines.join('\r\n');
}

/**
 * Stage 2: Sanitize a file or folder name matching Get-SanitizedName in Remediation-Engine.psm1
 * Zero dynamic RegExp construction (100% @rushstack/security/no-unsafe-regexp compliant).
 */
export function getSanitizedName(
  originalName: string,
  replacementChar: string = '_',
  shortenMaxChars: number = 0
): string {
  const candidateRep = replacementChar && replacementChar.length > 0 ? replacementChar[0] : '_';
  const rep = /^[a-zA-Z0-9_-]$/.test(candidateRep) ? candidateRep : '_';
  let name = String(originalName ?? '');

  // Strip temporary lock prefix ~$
  if (name.startsWith('~$')) {
    name = `${rep}${name.slice(2)}`;
  }

  // Strip invalid folder prefixes \u309B (゛) or \u1018 (ဧ)
  if (name.startsWith('\u309B') || name.startsWith('\u1018')) {
    name = `${rep}${name.slice(1)}`;
  }

  // Replace blocked substrings first
  name = name.replace(/_vti_/gi, `${rep}vti${rep}`);
  if (/\.lock$/i.test(name)) {
    name = name.replace(/\.lock$/i, `${rep}lock.txt`);
  }
  if (/^(desktop\.ini|thumbs\.db|\.ds_store)$/i.test(name)) {
    name = `${rep}archived_${name}.bak`;
  }

  // Replace all invalid SharePoint Online characters deterministically without dynamic RegExp
  for (const badChar of INVALID_CHARS_LIST) {
    if (name.indexOf(badChar) !== -1) {
      name = name.split(badChar).join(rep);
    }
  }

  // Collapse multiple consecutive periods
  name = name.replace(/\.{2,}/g, '.');

  // Trim leading/trailing spaces and periods
  name = name.replace(/^[\s.]+/, '').replace(/[\s.]+$/, '');

  // Collapse consecutive replacement characters deterministically without dynamic RegExp
  const doubleRep = `${rep}${rep}`;
  while (name.indexOf(doubleRep) !== -1) {
    name = name.split(doubleRep).join(rep);
  }

  // Check reserved device names (including with extension like CON.docx)
  const extMatch = name.match(/(\.[^/.]+)$/);
  const ext = extMatch ? extMatch[1] : '';
  const stem = ext ? name.slice(0, -ext.length) : name;

  if (RESERVED_EXACT_NAMES.indexOf(stem.toUpperCase()) !== -1) {
    name = `SPOSafe_${stem}${ext}`;
  }

  // Optional path shortening for deep leaf names
  if (shortenMaxChars > 12 && name.length > shortenMaxChars) {
    const keepLen = Math.max(8, shortenMaxChars - ext.length - 5);
    name = `${stem.substring(0, keepLen)}~1${ext}`;
  }

  if (!name || name.trim().length === 0) {
    name = `SPO_Unnamed_Item_${_deterministicIdCounter++}`;
  }

  return name;
}

/**
 * Builds a bottom-up (deepest depth first) remediation plan matching Remediation-Engine.psm1
 */
export function buildRemediationPlan(
  inventory: IInventoryItem[],
  replacementChar: string,
  autoShortenDeepPaths: boolean
): IRemediationPlanItem[] {
  const candidates = inventory.filter(
    (item) =>
      item.hasInvalidChars ||
      item.hasInvalidSubstrings ||
      item.hasBoundaryIssue ||
      item.isReservedName ||
      (autoShortenDeepPaths && item.exceedsPathLimit)
  );

  // Sort bottom-up (deepest items first, files before folders at same depth)
  const sorted = [...candidates].sort((a, b) => {
    if (b.depth !== a.depth) return b.depth - a.depth;
    if (a.itemType !== b.itemType) return a.itemType === 'File' ? -1 : 1;
    return a.fullPath.localeCompare(b.fullPath);
  });

  // Use Map instead of plain object to prevent prototype pollution (__proto__ / constructor)
  const usedNamesPerDir = new Map<string, Set<string>>();

  return sorted.map((item) => {
    const dirKey = item.directoryPath.toLowerCase();
    let dirSet = usedNamesPerDir.get(dirKey);
    if (!dirSet) {
      dirSet = new Set<string>();
      usedNamesPerDir.set(dirKey, dirSet);
    }

    let proposed = getSanitizedName(
      item.itemName,
      replacementChar,
      autoShortenDeepPaths && item.exceedsPathLimit ? 32 : 0
    );

    // Ensure collision safety in same directory
    if (dirSet.has(proposed.toLowerCase())) {
      const extMatch = proposed.match(/(\.[^/.]+)$/);
      const ext = extMatch ? extMatch[1] : '';
      const stem = ext ? proposed.slice(0, -ext.length) : proposed;
      let counter = 1;
      while (dirSet.has(`${stem}_${counter}${ext}`.toLowerCase())) {
        counter++;
      }
      proposed = `${stem}_${counter}${ext}`;
    }
    dirSet.add(proposed.toLowerCase());

    const proposedFullPath = `${item.directoryPath}\\${proposed}`;
    const escapedOrigPath = escapePsSingleQuotes(item.fullPath);
    const escapedProposedName = escapePsSingleQuotes(proposed);
    const escapedProposedFullPath = escapePsSingleQuotes(proposedFullPath);
    const escapedOriginalName = escapePsSingleQuotes(item.itemName);

    return {
      id: `rem_${item.id}`,
      itemType: item.itemType,
      depth: item.depth,
      currentName: item.itemName,
      proposedSanitizedName: proposed,
      originalFullPath: item.fullPath,
      proposedFullPath,
      directoryPath: item.directoryPath,
      reason: item.issueSummary,
      status: 'Pending (Dry-Run)',
      remediateCommand: `Rename-Item -LiteralPath '${escapedOrigPath}' -NewName '${escapedProposedName}' -ErrorAction Stop`,
      rollbackCommand: `Rename-Item -LiteralPath '${escapedProposedFullPath}' -NewName '${escapedOriginalName}' -ErrorAction Stop`
    };
  });
}

/**
 * Applies a bottom-up remediation plan to in-memory inventory items, propagating
 * renamed parent folders to all child items' directoryPath, relativePath, and fullPath.
 */
export function applyRemediationPlanToInventory(
  inventory: IInventoryItem[],
  remediationPlan: IRemediationPlanItem[],
  maxFileSizeMB: number,
  maxPathLength: number,
  baseUrlLength: number
): IInventoryItem[] {
  const leafRenameMap = new Map<string, string>();
  const folderRenames: Array<{ oldFull: string; newFull: string }> = [];

  for (const r of remediationPlan) {
    leafRenameMap.set(r.originalFullPath, r.proposedSanitizedName);
    if (r.itemType === 'Folder') {
      folderRenames.push({
        oldFull: r.originalFullPath,
        newFull: `${r.directoryPath}\\${r.proposedSanitizedName}`
      });
    }
  }

  // Sort folder renames deepest-first so nested folder paths rewrite cleanly
  folderRenames.sort((a, b) => b.oldFull.length - a.oldFull.length);

  const rewriteFolderSegments = (pathStr: string): string => {
    let updated = pathStr;
    for (const fr of folderRenames) {
      if (updated.toLowerCase() === fr.oldFull.toLowerCase()) {
        updated = fr.newFull;
      } else if (updated.toLowerCase().indexOf(`${fr.oldFull.toLowerCase()}\\`) === 0) {
        updated = `${fr.newFull}${updated.substring(fr.oldFull.length)}`;
      }
    }
    return updated;
  };

  return inventory.map((item) => {
    const newLeafName = leafRenameMap.get(item.fullPath) || item.itemName;
    const newDirPath = rewriteFolderSegments(item.directoryPath);
    const newFullPath = `${newDirPath}\\${newLeafName}`;

    // Reconstruct relativePath from updated segments
    const relSegments = item.relativePath.split('/').filter(Boolean);
    if (relSegments.length > 0) {
      relSegments[relSegments.length - 1] = newLeafName;
    }
    // Also sanitize any ancestor folder segments that were in remediationPlan
    const newRelPath = relSegments
      .map((seg, idx) => (idx < relSegments.length - 1 ? getSanitizedName(seg, '_') : seg))
      .join('/');

    return evaluateSpoItemRules(
      newLeafName,
      newFullPath,
      newRelPath,
      newDirPath,
      item.itemType,
      item.sizeBytes,
      maxFileSizeMB,
      maxPathLength,
      baseUrlLength,
      item.sha256Hash,
      item.lastModified,
      item.fileObject
    );
  });
}

export function generateRemediatePs1(
  plan: IRemediationPlanItem[],
  sourcePath: string = 'C:\\MigrationSource\\DevTestShare',
  backupDir: string = ''
): string {
  const escapedSource = escapePsSingleQuotes(sourcePath || 'C:\\MigrationSource\\DevTestShare');
  const escapedBackup = escapePsSingleQuotes(backupDir || '');
  const lines: string[] = [
    '# =============================================================================',
    '# SharePoint Online Migration Manager - Automated Bottom-Up Remediation Script',
    `# Generated At: ${new Date().toISOString()}`,
    `# Total Items : ${plan.length}`,
    '# Uses -LiteralPath and single-quoted strings to prevent command/wildcard injection',
    '# =============================================================================',
    '$ErrorActionPreference = "Stop"',
    '',
    '# =============================================================================',
    '# STEP 0: MANDATORY ROBOCOPY SOURCE BACKUP (RUNS BEFORE ANY FILE MODIFICATIONS)',
    '# =============================================================================',
    `$SourceDir = '${escapedSource}'`,
    `$CustomBackupDir = '${escapedBackup}'`,
    'if ($CustomBackupDir) {',
    '    $BackupTarget = $CustomBackupDir',
    '} else {',
    '    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"',
    '    $leafName = Split-Path -Leaf $SourceDir',
    '    $parent = Split-Path -Parent $SourceDir',
    '    $BackupTarget = if ($parent -and -not ($parent -match "^\\\\\\\\[^\\\\]+$") -and (Test-Path -LiteralPath $parent)) { Join-Path $parent "${leafName}_PreRemediation_Backup_$timestamp" } else { "C:\\SPOMigration_Backups\\${leafName}_Backup_$timestamp" }',
    '}',
    'Write-Host "Creating full pre-remediation mirror backup via Robocopy to: $BackupTarget" -ForegroundColor Yellow',
    'if (-not (Test-Path -LiteralPath $BackupTarget)) { New-Item -ItemType Directory -Path $BackupTarget -Force | Out-Null }',
    '$rcLog = Join-Path $BackupTarget "robocopy_backup.log"',
    'robocopy.exe "$SourceDir" "$BackupTarget" /E /COPY:DATSO /R:1 /W:1 /MT:8 /LOG:"$rcLog" /NP',
    'if ($LASTEXITCODE -eq 16) {',
    '    Write-Host "Robocopy exit code 16 (lacks SeBackupPrivilege rights). Retrying with standard /COPY:DAT..." -ForegroundColor Yellow',
    '    robocopy.exe "$SourceDir" "$BackupTarget" /E /COPY:DAT /R:1 /W:1 /MT:8 /LOG:"$rcLog" /NP',
    '}',
    'if ($LASTEXITCODE -gt 7) {',
    '    throw "Robocopy backup failed with exit code $LASTEXITCODE. Halting remediation to protect original files. Log: $rcLog"',
    '}',
    'Write-Host "Robocopy backup completed successfully (Exit Code: $LASTEXITCODE). Proceeding with bottom-up character rename..." -ForegroundColor Green',
    '',
    "Write-Host 'Starting SharePoint Online Bottom-Up Character Remediation...' -ForegroundColor Cyan",
    ''
  ];

  for (const item of plan) {
    const safeReason = String(item.reason ?? '').replace(/[\r\n\0]/g, ' ');
    const safeType = item.itemType === 'Folder' ? 'Folder' : 'File';
    const safeDepth = Number(item.depth) || 0;
    lines.push(`# [${safeType} | Depth ${safeDepth}] ${safeReason}`);
    lines.push(`if (Test-Path -LiteralPath '${escapePsSingleQuotes(item.originalFullPath)}') {`);
    lines.push(`    ${item.remediateCommand}`);
    lines.push(
      `    Write-Host '  [OK] Renamed: ${escapePsSingleQuotes(item.currentName)} -> ${escapePsSingleQuotes(item.proposedSanitizedName)}' -ForegroundColor Green`
    );
    lines.push('}');
    lines.push('');
  }

  lines.push("Write-Host 'Remediation complete.' -ForegroundColor Green");
  return lines.join('\r\n');
}

export function generateUndoRemediationPs1(plan: IRemediationPlanItem[]): string {
  const reversed = [...plan].reverse();
  const lines: string[] = [
    '# =============================================================================',
    '# SharePoint Online Migration Manager - Rollback (Undo_Remediation.ps1)',
    `# Generated At: ${new Date().toISOString()}`,
    '# Reverses renames top-down using -LiteralPath and single-quoted strings',
    '# =============================================================================',
    '$ErrorActionPreference = "Continue"',
    "Write-Host 'Starting Rollback of SharePoint Online Character Remediation...' -ForegroundColor Yellow",
    ''
  ];

  for (const item of reversed) {
    lines.push(`if (Test-Path -LiteralPath '${escapePsSingleQuotes(item.proposedFullPath)}') {`);
    lines.push(`    ${item.rollbackCommand}`);
    lines.push(
      `    Write-Host '  [RESTORED] ${escapePsSingleQuotes(item.proposedSanitizedName)} -> ${escapePsSingleQuotes(item.currentName)}' -ForegroundColor Cyan`
    );
    lines.push('}');
  }

  lines.push('');
  lines.push("Write-Host 'Rollback finished.' -ForegroundColor Green");
  return lines.join('\r\n');
}

export function generateBackupSharePs1(
  sourcePath: string = 'C:\\MigrationSource\\DevTestShare',
  backupDir: string = ''
): string {
  const escapedSource = escapePsSingleQuotes(sourcePath || 'C:\\MigrationSource\\DevTestShare');
  const escapedBackup = escapePsSingleQuotes(backupDir || '');
  return [
    '# =============================================================================',
    '# SharePoint Online Migration Manager - High-Speed Robocopy Source Share Mirror',
    `# Generated At: ${new Date().toISOString()}`,
    '# =============================================================================',
    '$ErrorActionPreference = "Stop"',
    `$SourceDir = '${escapedSource}'`,
    `$CustomBackupDir = '${escapedBackup}'`,
    'if ($CustomBackupDir) {',
    '    $BackupTarget = $CustomBackupDir',
    '} else {',
    '    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"',
    '    $leafName = Split-Path -Leaf $SourceDir',
    '    $parent = Split-Path -Parent $SourceDir',
    '    $BackupTarget = if ($parent -and -not ($parent -match "^\\\\\\\\[^\\\\]+$") -and (Test-Path -LiteralPath $parent)) { Join-Path $parent "${leafName}_PreRemediation_Backup_$timestamp" } else { "C:\\SPOMigration_Backups\\${leafName}_Backup_$timestamp" }',
    '}',
    'Write-Host "Creating full pre-remediation mirror backup via Robocopy..." -ForegroundColor Yellow',
    'Write-Host "  Source:      $SourceDir" -ForegroundColor Cyan',
    'Write-Host "  Destination: $BackupTarget" -ForegroundColor Cyan',
    'if (-not (Test-Path -LiteralPath $BackupTarget)) { New-Item -ItemType Directory -Path $BackupTarget -Force | Out-Null }',
    '$rcLog = Join-Path $BackupTarget "robocopy_backup.log"',
    'Write-Host "Executing Robocopy mirror (/E /COPY:DAT /R:1 /W:1 /MT:8)..." -ForegroundColor Yellow',
    'robocopy.exe "$SourceDir" "$BackupTarget" /E /COPY:DAT /R:1 /W:1 /MT:8 /LOG:"$rcLog" /NP',
    'if ($LASTEXITCODE -gt 7) {',
    '    Write-Host "Robocopy failed with exit code $LASTEXITCODE. See log: $rcLog" -ForegroundColor Red',
    '    exit $LASTEXITCODE',
    '}',
    'Write-Host "Robocopy backup completed successfully (Exit Code: $LASTEXITCODE)!" -ForegroundColor Green',
    'Write-Host "  Log File: $rcLog" -ForegroundColor Green',
    'Write-Host "Backup is ready. You can now proceed with remediation." -ForegroundColor Cyan'
  ].join('\r\n');
}

/**
 * Stage 3: Permissions & Identity Alignment Engine (matching Permissions-Assessment.psm1)
 */
export function generateMockPermissionsAudit(sourceRoot: string): IPermissionAuditItem[] {
  const base = sourceRoot.replace(/[\\/]+$/, '') || 'C:\\MigrationSource\\DevTestShare';
  const rawEntries: Array<{
    subPath: string;
    identity: string;
    access: 'Allow' | 'Deny';
    rights: string;
    inherited: boolean;
    brokenInheritance: boolean;
    uniqueCount: number;
  }> = [
    {
      subPath: '',
      identity: 'CONTOSO\\Domain Admins',
      access: 'Allow',
      rights: 'FullControl',
      inherited: false,
      brokenInheritance: false,
      uniqueCount: 4
    },
    {
      subPath: '01_Finance_Department',
      identity: 'CONTOSO\\j.miller',
      access: 'Allow',
      rights: 'Modify, Synchronize',
      inherited: false,
      brokenInheritance: true,
      uniqueCount: 18
    },
    {
      subPath: '01_Finance_Department',
      identity: 'CONTOSO\\s.connor',
      access: 'Allow',
      rights: 'ReadAndExecute, Synchronize',
      inherited: false,
      brokenInheritance: true,
      uniqueCount: 18
    },
    {
      subPath: '01_Finance_Department',
      identity: 'CONTOSO\\Contractor_Temp_Group',
      access: 'Deny',
      rights: 'FullControl',
      inherited: false,
      brokenInheritance: true,
      uniqueCount: 18
    },
    {
      subPath: '02_Engineering_CAD_Vault',
      identity: 'CONTOSO\\m.chen',
      access: 'Allow',
      rights: 'FullControl',
      inherited: true,
      brokenInheritance: false,
      uniqueCount: 6
    },
    {
      subPath: '02_Engineering_CAD_Vault\\Project_Titan_{Rev_A+B}',
      identity: 'S-1-5-21-384920194-294810294-109482910-1142',
      access: 'Allow',
      rights: 'Modify',
      inherited: false,
      brokenInheritance: true,
      uniqueCount: 42
    },
    {
      subPath: '03_Legal_&_Compliance',
      identity: 'CONTOSO\\a.patel',
      access: 'Allow',
      rights: 'FullControl',
      inherited: false,
      brokenInheritance: true,
      uniqueCount: 95
    },
    {
      subPath: '03_Legal_&_Compliance',
      identity: 'BUILTIN\\Administrators',
      access: 'Allow',
      rights: 'FullControl',
      inherited: true,
      brokenInheritance: true,
      uniqueCount: 95
    },
    {
      subPath: '04_HR_Executive_Records',
      identity: 'CONTOSO\\e.vance',
      access: 'Allow',
      rights: 'Modify, Synchronize',
      inherited: false,
      brokenInheritance: true,
      uniqueCount: 5120
    },
    {
      subPath: '04_HR_Executive_Records',
      identity: 'NT AUTHORITY\\Authenticated Users',
      access: 'Deny',
      rights: 'Write, Delete',
      inherited: false,
      brokenInheritance: true,
      uniqueCount: 5120
    },
    {
      subPath: '05_Deep_Archive_Hierarchy',
      identity: 'S-1-5-21-384920194-294810294-109482910-8831',
      access: 'Allow',
      rights: 'ReadAndExecute',
      inherited: false,
      brokenInheritance: true,
      uniqueCount: 14
    }
  ];

  return rawEntries.map((entry, idx) => {
    const folderPath = entry.subPath ? `${base}\\${entry.subPath}` : base;
    return evaluatePermissionEntry(
      `perm_${idx + 1}`,
      folderPath,
      entry.identity,
      entry.access,
      entry.rights,
      entry.inherited,
      entry.brokenInheritance,
      entry.uniqueCount
    );
  });
}

export function evaluatePermissionEntry(
  id: string,
  folderPath: string,
  identityReference: string,
  accessControlType: 'Allow' | 'Deny',
  fileSystemRights: string,
  isInherited: boolean,
  hasBrokenInheritance: boolean,
  uniqueAclCount: number
): IPermissionAuditItem {
  const safeIdentity = String(identityReference ?? 'Unknown');
  const safeFolder = String(folderPath ?? '');
  const safeRights = String(fileSystemRights ?? 'ReadAndExecute');
  const safeUniqueCount = Number.isFinite(uniqueAclCount) && uniqueAclCount >= 0 ? uniqueAclCount : 1;

  const isOrphanedSid = /^S-1-5-/i.test(safeIdentity);
  const isLocalAccount = /^(BUILTIN\\|NT AUTHORITY\\|NT SERVICE\\|LOCAL\\)/i.test(safeIdentity);
  const isDenyAce = accessControlType === 'Deny';

  let mappedSpoRole = 'Read (Viewer)';
  if (isDenyAce) {
    mappedSpoRole = 'UNSUPPORTED (SPO has no Deny Role)';
  } else if (/FullControl/i.test(safeRights)) {
    mappedSpoRole = 'Full Control (Site/Folder Owner)';
  } else if (/Modify|Write|Delete/i.test(safeRights)) {
    mappedSpoRole = 'Contribute / Edit (Member)';
  }

  const notes: string[] = [];
  let riskLevel: 'Clean' | 'Warning' | 'Critical' = 'Clean';

  if (isDenyAce) {
    riskLevel = 'Critical';
    notes.push('Deny ACE will be dropped by SharePoint Online (potential data exposure).');
  }
  if (isOrphanedSid) {
    riskLevel = 'Critical';
    notes.push('Orphaned SID (deleted AD user/group) cannot resolve in Entra ID.');
  }
  if (safeUniqueCount > 5000) {
    riskLevel = 'Critical';
    notes.push(`Exceeds SharePoint 5,000 unique ACL scope limit (${safeUniqueCount} scopes).`);
  }
  if (isLocalAccount) {
    if (riskLevel === 'Clean') riskLevel = 'Warning';
    notes.push('Local machine principal cannot be migrated to M365.');
  }
  if (hasBrokenInheritance && riskLevel === 'Clean') {
    riskLevel = 'Warning';
    notes.push('Broken NTFS inheritance creates unique SharePoint role assignment.');
  }
  if (notes.length === 0) {
    notes.push('Standard inherited AD permission — ready for Entra ID mapping.');
  }

  return {
    id,
    folderPath: safeFolder,
    identityReference: safeIdentity,
    accessControlType,
    fileSystemRights: safeRights,
    mappedSpoRole,
    isInherited: Boolean(isInherited),
    hasBrokenInheritance: Boolean(hasBrokenInheritance),
    uniqueAclCount: safeUniqueCount,
    isOrphanedSid,
    isLocalAccount,
    isDenyAce,
    riskLevel,
    riskNotes: notes.join(' ')
  };
}

export function buildUserMappingsFromPermissions(
  permissions: IPermissionAuditItem[],
  tenantDomain: string,
  knownSiteUserEmails: string[] = []
): IUserMappingItem[] {
  const cleanDomain = String(tenantDomain || 'contoso.onmicrosoft.com')
    .replace(/^@/, '')
    .trim();
  const seen = new Set<string>();
  const mappings: IUserMappingItem[] = [];

  for (const perm of permissions) {
    const key = perm.identityReference.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (perm.isOrphanedSid) {
      mappings.push({
        id: `map_${mappings.length + 1}`,
        sourceIdentity: perm.identityReference,
        accountType: 'Orphaned SID',
        targetUpn: '',
        mappingStatus: 'Unmapped (Exclude)',
        department: 'Deleted / Unresolvable SID'
      });
      continue;
    }

    if (perm.isLocalAccount) {
      mappings.push({
        id: `map_${mappings.length + 1}`,
        sourceIdentity: perm.identityReference,
        accountType: 'Local Machine Account',
        targetUpn: '',
        mappingStatus: 'Unmapped (Exclude)',
        department: 'Local Windows Principal'
      });
      continue;
    }

    const parts = perm.identityReference.split('\\');
    const samAccount = parts.length > 1 ? parts[1] : parts[0];
    const isGroup = /Admin|Group|Team|Dept/i.test(samAccount);
    const normalizedSam = samAccount.toLowerCase().replace(/[^a-z0-9._-]/g, '.');
    const candidateUpn = `${normalizedSam}@${cleanDomain}`;
    const isVerified = knownSiteUserEmails.some((e) => e.toLowerCase() === candidateUpn.toLowerCase());

    mappings.push({
      id: `map_${mappings.length + 1}`,
      sourceIdentity: perm.identityReference,
      accountType: isGroup ? 'AD Security Group' : 'AD Domain User',
      targetUpn: candidateUpn,
      mappingStatus: isVerified ? 'Verified in SPO' : isGroup ? 'Needs Review' : 'Auto-Mapped',
      department: isGroup ? 'Entra M365 Group / Security Group' : 'Active Directory User'
    });
  }

  return mappings;
}

export function generateCollectNtfsPermissionsPs1(sourcePath: string): string {
  const escapedSource = escapePsSingleQuotes(sourcePath || 'C:\\MigrationSource\\DevTestShare');
  return [
    '# =============================================================================',
    '# SharePoint Online Migration Hub - Companion NTFS Permissions Collector',
    '# Exports Permissions_Audit.json for direct import into the SPFx Web Part',
    '# =============================================================================',
    `param([string]$SourcePath = '${escapedSource}')`,
    '$ErrorActionPreference = "Continue"',
    '$results = [System.Collections.Generic.List[object]]::new()',
    '$folders = @((Get-Item -LiteralPath $SourcePath)) + @(Get-ChildItem -LiteralPath $SourcePath -Directory -Recurse -ErrorAction SilentlyContinue)',
    'foreach ($folder in $folders) {',
    '    try {',
    '        $acl = Get-Acl -LiteralPath $folder.FullName -ErrorAction Stop',
    '        $broken = $acl.AreAccessRulesProtected',
    '        foreach ($ace in $acl.Access) {',
    '            $results.Add([PSCustomObject]@{',
    '                folderPath = $folder.FullName',
    '                identityReference = $ace.IdentityReference.Value',
    '                accessControlType = $ace.AccessControlType.ToString()',
    '                fileSystemRights = $ace.FileSystemRights.ToString()',
    '                isInherited = $ace.IsInherited',
    '                hasBrokenInheritance = $broken',
    '                uniqueAclCount = $acl.Access.Count',
    '            })',
    '        }',
    '    } catch {}',
    '}',
    '$outFile = Join-Path (Get-Location) "Permissions_Audit_$(Get-Date -Format yyyyMMdd_HHmmss).json"',
    '$results | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $outFile -Encoding UTF8',
    "Write-Host ('Exported NTFS ACL audit to: ' + $outFile) -ForegroundColor Green"
  ].join('\r\n');
}

/**
 * Strongly-typed parser for imported Inventory JSON files (supports both SPFx array & PowerShell { Summary, Inventory })
 */
export function parseImportedInventoryJson(
  jsonText: string,
  maxFileSizeMB: number,
  maxPathLength: number,
  baseUrlLength: number
): { items: IInventoryItem[]; detectedScanRoot?: string } {
  const parsed: unknown = JSON.parse(jsonText);
  let rawArray: unknown[] = [];
  let detectedScanRoot: string | undefined;

  if (Array.isArray(parsed)) {
    rawArray = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.Inventory)) {
      rawArray = obj.Inventory;
    } else if (Array.isArray(obj.inventory)) {
      rawArray = obj.inventory;
    }
    if (obj.Summary && typeof obj.Summary === 'object') {
      const sum = obj.Summary as Record<string, unknown>;
      if (typeof sum.ScanRoot === 'string' && sum.ScanRoot.trim()) {
        detectedScanRoot = sum.ScanRoot.trim();
      }
    }
  }

  const capped = rawArray.slice(0, 25000);
  const items: IInventoryItem[] = [];

  for (const entry of capped) {
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;
    const itemName = String(rec.itemName ?? rec.ItemName ?? rec.Name ?? 'Unnamed');
    const fullPath = String(rec.fullPath ?? rec.FullPath ?? `C:\\MigrationSource\\${itemName}`);
    const relativePath = String(rec.relativePath ?? rec.RelativePath ?? itemName);
    const directoryPath = String(
      rec.directoryPath ?? rec.DirectoryPath ?? rec.ParentFolder ?? 'C:\\MigrationSource'
    );
    const rawType = String(rec.itemType ?? rec.ItemType ?? rec.Type ?? 'File');
    const itemType: 'File' | 'Folder' = rawType.toLowerCase() === 'folder' ? 'Folder' : 'File';
    const rawSize = Number(rec.sizeBytes ?? rec.SizeBytes ?? 0);
    const sizeBytes = Number.isFinite(rawSize) && rawSize >= 0 ? rawSize : 0;
    const sha256Hash = String(rec.sha256Hash ?? rec.SHA256Hash ?? rec.Hash ?? 'Imported');
    const lastModified = String(rec.lastModified ?? rec.LastWriteTime ?? new Date().toISOString());

    items.push(
      evaluateSpoItemRules(
        itemName,
        fullPath,
        relativePath,
        directoryPath,
        itemType,
        sizeBytes,
        maxFileSizeMB,
        maxPathLength,
        baseUrlLength,
        sha256Hash,
        lastModified
      )
    );
  }

  return { items, detectedScanRoot };
}

/**
 * Strongly-typed parser for imported Permissions JSON files (supports both flat arrays & PowerShell { ItemPermissions })
 */
export function parseImportedPermissionsJson(
  jsonText: string,
  defaultSourcePath: string
): IPermissionAuditItem[] {
  const parsed: unknown = JSON.parse(jsonText);
  const items: IPermissionAuditItem[] = [];

  if (Array.isArray(parsed)) {
    parsed.slice(0, 25000).forEach((entry, idx) => {
      if (!entry || typeof entry !== 'object') return;
      const r = entry as Record<string, unknown>;
      items.push(
        evaluatePermissionEntry(
          `imp_${idx + 1}`,
          String(r.folderPath ?? r.FolderPath ?? defaultSourcePath),
          String(r.identityReference ?? r.IdentityReference ?? 'CONTOSO\\User'),
          String(r.accessControlType ?? r.AccessControlType ?? 'Allow') === 'Deny' ? 'Deny' : 'Allow',
          String(r.fileSystemRights ?? r.FileSystemRights ?? 'ReadAndExecute'),
          Boolean(r.isInherited ?? r.IsInherited),
          Boolean(r.hasBrokenInheritance ?? r.InheritanceBroken),
          Number(r.uniqueAclCount ?? r.TotalRuleCount ?? 5)
        )
      );
    });
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.ItemPermissions)) {
      let counter = 1;
      for (const folderEntry of obj.ItemPermissions.slice(0, 5000)) {
        if (!folderEntry || typeof folderEntry !== 'object') continue;
        const f = folderEntry as Record<string, unknown>;
        const folderPath = String(f.Path ?? f.FolderPath ?? defaultSourcePath);
        const broken = Boolean(f.InheritanceBroken);
        const uniqueCount = Number(f.ExplicitRuleCount ?? f.TotalRuleCount ?? 5);
        const rules = Array.isArray(f.Rules) ? f.Rules : [];
        for (const ruleEntry of rules) {
          if (!ruleEntry || typeof ruleEntry !== 'object') continue;
          const rule = ruleEntry as Record<string, unknown>;
          items.push(
            evaluatePermissionEntry(
              `imp_${counter++}`,
              folderPath,
              String(rule.Identity ?? rule.IdentityReference ?? 'CONTOSO\\User'),
              String(rule.AccessType ?? rule.AccessControlType ?? 'Allow') === 'Deny' ? 'Deny' : 'Allow',
              String(rule.Rights ?? rule.FileSystemRights ?? 'ReadAndExecute'),
              Boolean(rule.IsInherited),
              broken,
              uniqueCount
            )
          );
        }
      }
    }
  }

  return items;
}

/**
 * Stage 4: Target SPO Environment Assessment & 50 GB Batch Benchmark
 */
export function calculateUrlHeadroom(
  siteUrl: string,
  libraryName: string,
  subfolder: string,
  maxAllowedUrlLength: number = 400
): { baseUrlLength: number; safeRelativePathHeadroom: number } {
  const cleanSite = (siteUrl || 'https://contoso.sharepoint.com/sites/Migration-Dev').replace(/\/+$/, '');
  const cleanLib = (libraryName || 'Documents').replace(/^\/+|\/+$/g, '');
  const cleanSub = (subfolder || '').replace(/^\/+|\/+$/g, '');
  const combinedBase = cleanSub ? `${cleanSite}/${cleanLib}/${cleanSub}` : `${cleanSite}/${cleanLib}`;
  const baseUrlLength = combinedBase.length;
  const safeRelativePathHeadroom = Math.max(0, maxAllowedUrlLength - baseUrlLength - 1);
  return { baseUrlLength, safeRelativePathHeadroom };
}

export function buildSimulatedTargetSpoAssessment(
  siteUrl: string,
  libraryName: string,
  subfolder: string,
  maxAllowedUrlLength: number
): ITargetSpoAssessment {
  const { baseUrlLength, safeRelativePathHeadroom } = calculateUrlHeadroom(
    siteUrl,
    libraryName,
    subfolder,
    maxAllowedUrlLength
  );

  const libraries: ISpoLibraryInfo[] = [
    {
      id: 'lib-1',
      title: libraryName || 'Documents',
      itemCount: 1420,
      serverRelativeUrl: '/sites/Migration-Dev/Shared Documents',
      enableVersioning: true,
      enableMinorVersions: false,
      majorVersionLimit: 500
    },
    {
      id: 'lib-2',
      title: 'Finance Archive',
      itemCount: 4820,
      serverRelativeUrl: '/sites/Migration-Dev/FinanceArchive',
      enableVersioning: true,
      enableMinorVersions: true,
      majorVersionLimit: 500
    },
    {
      id: 'lib-3',
      title: 'Engineering Vault',
      itemCount: 890,
      serverRelativeUrl: '/sites/Migration-Dev/EngineeringVault',
      enableVersioning: false,
      enableMinorVersions: false,
      majorVersionLimit: 100
    }
  ];

  return {
    siteUrl,
    webTitle: 'SharePoint Migration Target Site',
    connectionMode: 'Simulated Readiness Profile',
    totalStorageQuotaGB: 1024,
    usedStorageGB: 184.5,
    freeStorageGB: 839.5,
    freeStoragePercent: 82.0,
    baseUrlLength,
    maxAllowedSpoUrlLength: maxAllowedUrlLength,
    safeRelativePathHeadroom,
    libraries,
    selectedLibrary: libraryName || 'Documents',
    selectedLibraryItemCount: 1420,
    listViewThresholdWarning: false,
    versioningWarning: true,
    readinessStatus: safeRelativePathHeadroom < 100 ? 'WARNING' : 'READY',
    readinessSummary: `Target library '${libraryName || 'Documents'}' verified. Safe relative path headroom: ${safeRelativePathHeadroom} chars (Base URL: ${baseUrlLength} chars). Free quota: 839.5 GB (82%).`
  };
}

export function runBatchMigrationBenchmark(
  inventory: IInventoryItem[],
  batchSizeLimitGB: number = 50,
  interBatchPauseSec: number = 5
): IBatchBenchmarkRow[] {
  const files = inventory.filter((i) => i.itemType === 'File');
  const totalBytes = files.reduce((acc, f) => acc + f.sizeBytes, 0);
  const actualGB = totalBytes / (1024 * 1024 * 1024);

  const waves = [
    {
      name: `Wave 1 — Active Scanned Source (${files.length || 18} files)`,
      files: Math.max(files.length, 18),
      sizeGB: actualGB > 0.05 ? Math.round(actualGB * 100) / 100 : 12.4,
      mbps: 48.6,
      throttles: 0
    },
    {
      name: 'Wave 2 — Departmental Bulk Archive (50 GB Cap)',
      files: 14520,
      sizeGB: batchSizeLimitGB,
      mbps: 44.2,
      throttles: 0
    },
    {
      name: 'Wave 3 — High-Density Small Files Stress Test',
      files: 48900,
      sizeGB: 38.5,
      mbps: 31.8,
      throttles: 1
    },
    {
      name: 'Wave 4 — Large CAD / Media Binaries Wave',
      files: 2150,
      sizeGB: batchSizeLimitGB,
      mbps: 62.4,
      throttles: 0
    }
  ];

  return waves.map((w, idx) => {
    const sizeMB = w.sizeGB * 1024;
    const durationSec = Math.round((sizeMB / w.mbps) * 10) / 10;
    const projectedGBPerHour = Math.round(((w.mbps * 3600) / 1024) * 10) / 10;
    return {
      batchNumber: idx + 1,
      batchName: w.name,
      fileCount: w.files,
      batchSizeGB: w.sizeGB,
      simulatedDurationSec: durationSec,
      throughputMBps: w.mbps,
      projectedGBPerHour,
      interBatchPauseSec,
      throttleEvents429: w.throttles,
      status: w.throttles > 0 ? 'Completed (Auto-Backoff Applied)' : 'Optimal Throughput'
    };
  });
}

export function generateSpoAzureMigrationPs1(
  sourcePath: string,
  stagingDir: string,
  targetSiteUrl: string,
  targetLibrary: string,
  targetSubfolder: string,
  azureAccountName: string,
  azureContainerName: string,
  envProfile: EnvironmentProfileKey
): string {
  const safeProfile = String(envProfile ?? 'Development').replace(/[\r\n\0]/g, '');
  const sPath = escapePsSingleQuotes(sourcePath || 'C:\\MigrationSource\\DevTestShare');
  const stgPath = escapePsSingleQuotes(stagingDir || 'C:\\MigrationStaging\\SPO_Package');
  const site = escapePsSingleQuotes(targetSiteUrl || 'https://contoso.sharepoint.com/sites/Migration-Dev');
  const lib = escapePsSingleQuotes(targetLibrary || 'Documents');
  const sub = escapePsSingleQuotes(targetSubfolder || 'Dev_Pilot_Migration');
  const azAcct = escapePsSingleQuotes(azureAccountName || 'spomigrationstg01');
  const azCont = escapePsSingleQuotes(azureContainerName || 'spo-migration-waves');

  return [
    '# =============================================================================',
    `# SharePoint Online & Azure Migration Pipeline Script (${safeProfile})`,
    `# Generated At: ${new Date().toISOString()}`,
    '# Supports Microsoft.Online.SharePoint.PowerShell & PnP.PowerShell',
    '# =============================================================================',
    '$ErrorActionPreference = "Stop"',
    `$SourcePath      = '${sPath}'`,
    `$PackagePath     = '${stgPath}'`,
    `$TargetWebUrl    = '${site}'`,
    `$TargetLibrary   = '${lib}'`,
    `$TargetSubFolder = '${sub}'`,
    `$AzureAccount    = '${azAcct}'`,
    `$AzureContainer  = '${azCont}'`,
    `$AzurePkgCont    = '${azCont}-pkg'`,
    `$AzureQueue      = '${azCont}-queue'`,
    '',
    "Write-Host '1. Creating Local SPO Migration Package...' -ForegroundColor Cyan",
    'New-Item -ItemType Directory -Path $PackagePath -Force | Out-Null',
    'New-SPOMigrationPackage -SourceFilesPath $SourcePath -OutputPackagePath $PackagePath -IgnoreHidden -NoAdLookup -ErrorAction Stop',
    '',
    "Write-Host '2. Converting Package to Target SharePoint Library Schema...' -ForegroundColor Cyan",
    '$TargetedPath = Join-Path $PackagePath "Targeted"',
    'ConvertTo-SPOMigrationTargetedPackage -SourceFilesPath $SourcePath -SourcePackagePath $PackagePath -OutputPackagePath $TargetedPath -TargetWebUrl $TargetWebUrl -TargetDocumentLibraryPath $TargetLibrary -TargetDocumentLibrarySubFolderPath $TargetSubFolder -ErrorAction Stop',
    '',
    "Write-Host '3. Uploading Package to Azure Blob Staging & Submitting Job...' -ForegroundColor Cyan",
    '$SecureAzKey = Read-Host "Enter Azure Storage Account Key for $AzureAccount" -AsSecureString',
    '$Bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureAzKey)',
    'try {',
    '    $PlainAzKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto($Bstr)',
    '    $AzureSource = Set-SPOMigrationPackageAzureSource -SourceFilesPath $SourcePath -SourcePackagePath $TargetedPath -AccountName $AzureAccount -AccountKey $PlainAzKey -FileContainerName $AzureContainer -PackageContainerName $AzurePkgCont -AzureQueueName $AzureQueue -ErrorAction Stop',
    '    Submit-SPOMigrationJob -TargetWebUrl $TargetWebUrl -MigrationPackageAzureLocations $AzureSource -ErrorAction Stop',
    '} finally {',
    '    if ($Bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Bstr) }',
    '    $PlainAzKey = $null',
    '}',
    "Write-Host 'Migration job submitted to SharePoint Online timer queue!' -ForegroundColor Green"
  ].join('\r\n');
}

/**
 * Stage 5: Real-Time Anomaly Monitor (matching Anomaly-Monitor.psm1)
 */
export function evaluateAnomalies(
  inventory: IInventoryItem[],
  permissions: IPermissionAuditItem[],
  targetAssessment: ITargetSpoAssessment,
  benchmarks: IBatchBenchmarkRow[]
): IAnomalyEvent[] {
  const anomalies: IAnomalyEvent[] = [];
  const now = new Date().toISOString();

  // 1. Check Invalid Character Density (>10%)
  const totalItems = Math.max(1, inventory.length);
  const flaggedItems = inventory.filter((i) => i.isFlagged).length;
  const densityPct = Math.round((flaggedItems / totalItems) * 1000) / 10;

  if (densityPct > 10) {
    anomalies.push({
      id: 'anom_density',
      timestamp: now,
      category: 'Source Hygiene',
      severity: densityPct > 25 ? 'CRITICAL' : 'WARNING',
      metricValue: `${densityPct}% (${flaggedItems}/${inventory.length})`,
      thresholdValue: '< 10.0%',
      description: `High density of SharePoint Online naming/path blockers detected (${flaggedItems} of ${inventory.length} items flagged).`,
      recommendedAction: 'Run Stage 2 Character Remediation (Bottom-Up Rename) prior to packaging.'
    });
  } else {
    anomalies.push({
      id: 'anom_density_ok',
      timestamp: now,
      category: 'Source Hygiene',
      severity: 'INFO',
      metricValue: `${densityPct}% (${flaggedItems}/${inventory.length})`,
      thresholdValue: '< 10.0%',
      description: 'Source naming hygiene is within acceptable migration tolerance.',
      recommendedAction: 'Proceed with standard pre-flight packaging.'
    });
  }

  // 2. Check Target Storage Quota (<10 GB free)
  if (targetAssessment.freeStorageGB < 10) {
    anomalies.push({
      id: 'anom_quota',
      timestamp: now,
      category: 'Storage Quota',
      severity: 'CRITICAL',
      metricValue: `${targetAssessment.freeStorageGB} GB Free`,
      thresholdValue: '>= 10.0 GB Free',
      description: 'Target SharePoint Online site storage quota is critically low.',
      recommendedAction: 'Increase site storage quota in SharePoint Admin Center before starting migration waves.'
    });
  } else {
    anomalies.push({
      id: 'anom_quota_ok',
      timestamp: now,
      category: 'Storage Quota',
      severity: 'INFO',
      metricValue: `${targetAssessment.freeStorageGB} GB Free (${targetAssessment.freeStoragePercent}%)`,
      thresholdValue: '>= 10.0 GB Free',
      description: 'Target SharePoint site has sufficient free storage headroom.',
      recommendedAction: 'No quota adjustments required.'
    });
  }

  // 3. Check Path Headroom
  const deepCount = inventory.filter((i) => i.exceedsPathLimit).length;
  if (deepCount > 0 || targetAssessment.safeRelativePathHeadroom < 120) {
    anomalies.push({
      id: 'anom_path',
      timestamp: now,
      category: 'Path Headroom',
      severity: deepCount > 0 ? 'CRITICAL' : 'WARNING',
      metricValue: `${deepCount} Over-Limit | ${targetAssessment.safeRelativePathHeadroom} chars headroom`,
      thresholdValue: '0 Over-Limit | >= 120 chars',
      description: `${deepCount} source path(s) exceed the configured path length threshold or safe URL headroom.`,
      recommendedAction: 'Enable Auto-Shorten Deep Paths in Stage 2 or flatten top-level archive folders.'
    });
  }

  // 4. Check Permissions (Deny ACEs / Orphaned SIDs / >5,000 Unique Scopes)
  const denyCount = permissions.filter((p) => p.isDenyAce).length;
  const orphanCount = permissions.filter((p) => p.isOrphanedSid).length;
  const scopeSpike = permissions.some((p) => p.uniqueAclCount > 5000);

  if (denyCount > 0 || orphanCount > 0 || scopeSpike) {
    anomalies.push({
      id: 'anom_perms',
      timestamp: now,
      category: 'Permissions & ACL',
      severity: denyCount > 0 || scopeSpike ? 'CRITICAL' : 'WARNING',
      metricValue: `${denyCount} Deny ACEs | ${orphanCount} Orphaned SIDs`,
      thresholdValue: '0 Deny ACEs | < 5,000 Scopes',
      description: 'NTFS Deny rules, orphaned SIDs, or >5,000 unique ACL scopes detected in source hierarchy.',
      recommendedAction: 'Open Stage 3 Permissions Modal to map identities in UserMapping.csv and remove NTFS Deny ACEs.'
    });
  }

  // 5. Check SPO HTTP 429 Throttling in Benchmarks
  const total429 = benchmarks.reduce((acc, b) => acc + b.throttleEvents429, 0);
  if (total429 > 0) {
    anomalies.push({
      id: 'anom_429',
      timestamp: now,
      category: 'SPO Throttling',
      severity: 'WARNING',
      metricValue: `${total429} HTTP 429 Event(s)`,
      thresholdValue: '0 HTTP 429 Events',
      description: 'High-density small-file wave triggered SharePoint REST/CSOM 429 Retry-After backoff.',
      recommendedAction: 'Use Azure Blob Migration API pipeline for waves with >25,000 files and schedule during off-peak hours.'
    });
  }

  return anomalies;
}

/**
 * Stage 6: Standalone Zero-CDN HTML Executive Report Generator (matching HtmlReport-Generator.psm1)
 */
export function generateStandaloneHtmlReport(
  envProfile: EnvironmentProfileKey,
  sourcePath: string,
  inventory: IInventoryItem[],
  remediationPlan: IRemediationPlanItem[],
  permissions: IPermissionAuditItem[],
  userMappings: IUserMappingItem[],
  targetAssessment: ITargetSpoAssessment,
  benchmarks: IBatchBenchmarkRow[],
  anomalies: IAnomalyEvent[]
): string {
  const totalFiles = inventory.filter((i) => i.itemType === 'File').length;
  const totalFolders = inventory.filter((i) => i.itemType === 'Folder').length;
  const flaggedCount = inventory.filter((i) => i.isFlagged).length;
  const cleanCount = Math.max(0, inventory.length - flaggedCount);
  const readinessScore = inventory.length > 0 ? Math.round((cleanCount / inventory.length) * 100) : 100;
  const totalSizeMB = Math.round(inventory.reduce((acc, i) => acc + i.sizeMB, 0) * 100) / 100;

  const esc = (s: string | number): string =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const invRows = inventory
    .slice(0, 100)
    .map(
      (i) => `
      <tr>
        <td><span class="badge ${i.isFlagged ? 'warn' : 'ok'}">${i.isFlagged ? 'FLAGGED' : 'CLEAN'}</span></td>
        <td>${esc(i.itemType)}</td>
        <td><strong>${esc(i.itemName)}</strong><div class="sub">${esc(i.relativePath)}</div></td>
        <td>${esc(i.sizeMB)} MB</td>
        <td>${esc(i.pathLength)} / ${esc(i.estimatedSpoUrlLength)}</td>
        <td>${esc(i.issueSummary)}</td>
      </tr>`
    )
    .join('');

  const remRows = remediationPlan
    .slice(0, 100)
    .map(
      (r) => `
      <tr>
        <td>${esc(r.itemType)} (Depth ${esc(r.depth)})</td>
        <td style="color:#f87171">${esc(r.currentName)}</td>
        <td style="color:#34d399">${esc(r.proposedSanitizedName)}</td>
        <td>${esc(r.status)}</td>
        <td><code>${esc(r.rollbackCommand)}</code></td>
      </tr>`
    )
    .join('');

  const permRows = permissions
    .map(
      (p) => `
      <tr>
        <td><span class="badge ${p.riskLevel === 'Critical' ? 'crit' : p.riskLevel === 'Warning' ? 'warn' : 'ok'}">${esc(p.riskLevel)}</span></td>
        <td>${esc(p.folderPath)}</td>
        <td>${esc(p.identityReference)}</td>
        <td>${esc(p.accessControlType)} (${esc(p.fileSystemRights)})</td>
        <td>${esc(p.mappedSpoRole)}</td>
        <td>${esc(p.riskNotes)}</td>
      </tr>`
    )
    .join('');

  const anomRows = anomalies
    .map(
      (a) => `
      <tr>
        <td><span class="badge ${a.severity === 'CRITICAL' ? 'crit' : a.severity === 'WARNING' ? 'warn' : 'ok'}">${esc(a.severity)}</span></td>
        <td>${esc(a.category)}</td>
        <td>${esc(a.metricValue)}</td>
        <td>${esc(a.description)}</td>
        <td>${esc(a.recommendedAction)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>SPO Migration Readiness Executive Dashboard (${esc(envProfile)})</title>
  <style>
    body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #f8fafc; line-height: 1.5; }
    .container { max-width: 1360px; margin: 0 auto; padding: 28px; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { margin: 0 0 6px 0; font-size: 24px; color: #38bdf8; }
    .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 16px; }
    .kpi .label { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; }
    .kpi .val { font-size: 26px; font-weight: 700; margin-top: 6px; color: #f8fafc; }
    .section { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 20px; margin-bottom: 24px; }
    .section h2 { margin-top: 0; font-size: 16px; color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #334155; vertical-align: top; }
    th { color: #94a3b8; font-weight: 600; background: #0f172a; }
    .sub { font-size: 11px; color: #64748b; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    .badge.ok { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .badge.warn { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .badge.crit { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    code { font-family: Consolas, monospace; font-size: 11px; color: #cbd5e1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>SharePoint Online Migration Manager &amp; Readiness Hub</h1>
        <div style="color:#94a3b8;font-size:13px;">Source: ${esc(sourcePath)} &bull; Target Site: ${esc(targetAssessment.siteUrl)} &bull; Library: ${esc(targetAssessment.selectedLibrary)}</div>
      </div>
      <div style="text-align:right">
        <span class="badge ok" style="font-size:13px;padding:6px 12px;">Profile: ${esc(envProfile)}</span>
        <div style="color:#64748b;font-size:11px;margin-top:6px;">Generated: ${esc(new Date().toLocaleString())}</div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi"><div class="label">Readiness Score</div><div class="val" style="color:#10b981">${readinessScore}%</div></div>
      <div class="kpi"><div class="label">Total Scanned</div><div class="val">${inventory.length} <span style="font-size:13px;color:#94a3b8">(${totalFolders}D / ${totalFiles}F)</span></div></div>
      <div class="kpi"><div class="label">Flagged Blockers</div><div class="val" style="color:#f59e0b">${flaggedCount}</div></div>
      <div class="kpi"><div class="label">Source Volume</div><div class="val">${totalSizeMB} MB</div></div>
      <div class="kpi"><div class="label">Safe URL Headroom</div><div class="val" style="color:#38bdf8">${targetAssessment.safeRelativePathHeadroom} chars</div></div>
    </div>

    <div class="section">
      <h2>1. Active Anomalies &amp; Telemetry Recommendations (${anomalies.length})</h2>
      <table>
        <thead><tr><th>Severity</th><th>Category</th><th>Metric</th><th>Finding</th><th>Recommended Action</th></tr></thead>
        <tbody>${anomRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>2. Source Inventory &amp; SharePoint Rule Assessment (${inventory.length} Items)</h2>
      <table>
        <thead><tr><th>Status</th><th>Type</th><th>Name &amp; Relative Path</th><th>Size</th><th>Path / SPO URL Len</th><th>SharePoint Validation</th></tr></thead>
        <tbody>${invRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>3. Bottom-Up Character Remediation Plan &amp; Rollback Audit (${remediationPlan.length} Items)</h2>
      <table>
        <thead><tr><th>Type &amp; Depth</th><th>Original Name</th><th>Proposed Sanitized Name</th><th>Status</th><th>PowerShell Rollback Command</th></tr></thead>
        <tbody>${remRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>4. NTFS Permissions &amp; Identity Alignment (${permissions.length} ACLs / ${userMappings.length} Mapped Identities)</h2>
      <table>
        <thead><tr><th>Risk</th><th>Folder Path</th><th>NTFS Identity</th><th>Access / Rights</th><th>Mapped SPO Role</th><th>Assessment Notes</th></tr></thead>
        <tbody>${permRows}</tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers a browser file download with UTF-8 BOM support for CSV/TXT/PS1/JSON/HTML
 */
export function triggerBrowserDownload(
  filename: string,
  content: string,
  mimeType: string = 'text/plain;charset=utf-8'
): void {
  const isCsv = filename.toLowerCase().endsWith('.csv');
  const payload = isCsv ? `\uFEFF${content}` : content;
  const blob = new Blob([payload], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportInventoryToCsvString(items: IInventoryItem[]): string {
  const headers = [
    'ItemName',
    'ItemType',
    'RelativePath',
    'FullPath',
    'SizeMB',
    'PathLength',
    'EstimatedSpoUrlLength',
    'IsFlagged',
    'HasInvalidChars',
    'InvalidCharsFound',
    'IsReservedName',
    'ExceedsPathLimit',
    'ExceedsSizeLimit',
    'IssueSummary',
    'SHA256Hash'
  ];
  const rows = items.map((i) =>
    [
      sanitizeCsvCell(i.itemName),
      sanitizeCsvCell(i.itemType),
      sanitizeCsvCell(i.relativePath),
      sanitizeCsvCell(i.fullPath),
      sanitizeCsvCell(i.sizeMB),
      sanitizeCsvCell(i.pathLength),
      sanitizeCsvCell(i.estimatedSpoUrlLength),
      sanitizeCsvCell(i.isFlagged),
      sanitizeCsvCell(i.hasInvalidChars),
      sanitizeCsvCell(i.invalidCharsFound),
      sanitizeCsvCell(i.isReservedName),
      sanitizeCsvCell(i.exceedsPathLimit),
      sanitizeCsvCell(i.exceedsSizeLimit),
      sanitizeCsvCell(i.issueSummary),
      sanitizeCsvCell(i.sha256Hash)
    ].join(',')
  );
  return [headers.join(','), ...rows].join('\r\n');
}

export function exportCleanupSheetToCsvString(plan: IRemediationPlanItem[]): string {
  const headers = [
    'ItemType',
    'Depth',
    'CurrentName',
    'ProposedSanitizedName',
    'DirectoryPath',
    'OriginalFullPath',
    'ProposedFullPath',
    'Reason',
    'Status',
    'RollbackCommand'
  ];
  const rows = plan.map((r) =>
    [
      sanitizeCsvCell(r.itemType),
      sanitizeCsvCell(r.depth),
      sanitizeCsvCell(r.currentName),
      sanitizeCsvCell(r.proposedSanitizedName),
      sanitizeCsvCell(r.directoryPath),
      sanitizeCsvCell(r.originalFullPath),
      sanitizeCsvCell(r.proposedFullPath),
      sanitizeCsvCell(r.reason),
      sanitizeCsvCell(r.status),
      sanitizeCsvCell(r.rollbackCommand)
    ].join(',')
  );
  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Exports UserMapping.csv with Source,Target as the first two columns for direct compatibility
 * with ConvertTo-SPOMigrationTargetedPackage -UserMappingFile
 */
export function exportUserMappingToCsvString(mappings: IUserMappingItem[]): string {
  const headers = ['Source', 'Target', 'AccountType', 'MappingStatus', 'Department'];
  const rows = mappings.map((m) =>
    [
      sanitizeCsvCell(m.sourceIdentity),
      sanitizeCsvCell(m.targetUpn),
      sanitizeCsvCell(m.accountType),
      sanitizeCsvCell(m.mappingStatus),
      sanitizeCsvCell(m.department)
    ].join(',')
  );
  return [headers.join(','), ...rows].join('\r\n');
}

export function exportBenchmarksToCsvString(benchmarks: IBatchBenchmarkRow[]): string {
  const headers = [
    'BatchNumber',
    'BatchName',
    'FileCount',
    'BatchSizeGB',
    'SimulatedDurationSec',
    'ThroughputMBps',
    'ProjectedGBPerHour',
    'ThrottleEvents429',
    'Status'
  ];
  const rows = benchmarks.map((b) =>
    [
      sanitizeCsvCell(b.batchNumber),
      sanitizeCsvCell(b.batchName),
      sanitizeCsvCell(b.fileCount),
      sanitizeCsvCell(b.batchSizeGB),
      sanitizeCsvCell(b.simulatedDurationSec),
      sanitizeCsvCell(b.throughputMBps),
      sanitizeCsvCell(b.projectedGBPerHour),
      sanitizeCsvCell(b.throttleEvents429),
      sanitizeCsvCell(b.status)
    ].join(',')
  );
  return [headers.join(','), ...rows].join('\r\n');
}

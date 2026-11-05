import {
  sanitizeCsvCell,
  escapeODataString,
  escapePsSingleQuotes,
  isValidSpoSiteUrl,
  calculateUrlHeadroom,
  getSanitizedName,
  buildRemediationPlan,
  generateUndoRemediationPs1,
  evaluatePermissionEntry,
  evaluateAnomalies,
  ENVIRONMENT_PROFILES,
  formatTimestampForFile
} from './MigrationEngine';
import { IInventoryItem, ITargetSpoAssessment, IPermissionAuditItem, IBatchBenchmarkRow } from './ISpoMigrationHubProps';

describe('MigrationEngine Security & Threat Mitigations (Risk Analysis Verification)', () => {
  describe('SEC-01: CSV Formula Neutralization (sanitizeCsvCell)', () => {
    it('prepends single-quote to formula execution triggers (=, +, -, @)', () => {
      expect(sanitizeCsvCell('=cmd|\'/C calc\'!A1')).toBe('"\'=cmd|\'/C calc\'!A1"');
      expect(sanitizeCsvCell('+12345')).toBe('"\'12345"'.replace("'", "'+"));
      expect(sanitizeCsvCell('-5+5')).toBe('"\'5+5"'.replace("'", "'-"));
      expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe('"\'@SUM(A1:A10)"');
    });

    it('neutralizes tab and carriage return injections', () => {
      expect(sanitizeCsvCell('\tMaliciousTab')).toBe('"\'\tMaliciousTab"');
      expect(sanitizeCsvCell('\rMaliciousCR')).toBe('"\'\rMaliciousCR"');
    });

    it('escapes existing double quotes for standard RFC 4180 CSV compliance', () => {
      expect(sanitizeCsvCell('Normal "Quoted" String')).toBe('"Normal ""Quoted"" String"');
    });

    it('safely handles non-string primitives and undefined values', () => {
      expect(sanitizeCsvCell(42)).toBe('"42"');
      expect(sanitizeCsvCell(true)).toBe('"true"');
      expect(sanitizeCsvCell(false)).toBe('"false"');
      expect(sanitizeCsvCell(undefined)).toBe('""');
    });
  });

  describe('SEC-02: Zero-Key Environment Profile Architecture', () => {
    it('defines explicit resource limits for Dev, Test/QA, Staging, and Production profiles', () => {
      expect(ENVIRONMENT_PROFILES.Development.maxFileSizeMB).toBe(250);
      expect(ENVIRONMENT_PROFILES.Development.maxPathLength).toBe(260);

      expect(ENVIRONMENT_PROFILES['Test / QA'].maxFileSizeMB).toBe(2048);
      expect(ENVIRONMENT_PROFILES['Test / QA'].maxPathLength).toBe(300);

      expect(ENVIRONMENT_PROFILES['Staging / Pre-Prod'].maxFileSizeMB).toBe(15000);
      expect(ENVIRONMENT_PROFILES['Staging / Pre-Prod'].maxPathLength).toBe(350);

      expect(ENVIRONMENT_PROFILES.Production.maxFileSizeMB).toBe(250000);
      expect(ENVIRONMENT_PROFILES.Production.maxPathLength).toBe(400);
    });
  });

  describe('SEC-03: OData REST Filter Injection (escapeODataString)', () => {
    it('doubles single quotes to prevent OData escaping', () => {
      expect(escapeODataString("O'Connor")).toBe("O''Connor");
      expect(escapeODataString("Documents' Confidential")).toBe("Documents'' Confidential");
    });

    it('strips null bytes and newline control characters', () => {
      expect(escapeODataString("Test\0Library\r\nName")).toBe("TestLibraryName");
    });

    it('handles empty or nullish values without error', () => {
      expect(escapeODataString('')).toBe('');
      expect(escapeODataString(undefined as unknown as string)).toBe('');
    });
  });

  describe('SEC-04: Target SPO Site URL Validation (isValidSpoSiteUrl)', () => {
    it('accepts legitimate Microsoft 365 SharePoint Online tenant URLs', () => {
      expect(isValidSpoSiteUrl('https://contoso.sharepoint.com')).toBe(true);
      expect(isValidSpoSiteUrl('https://tenant.sharepoint.us')).toBe(true);
      expect(isValidSpoSiteUrl('https://corp.sharepoint.de')).toBe(true);
      expect(isValidSpoSiteUrl('https://org.sharepoint.cn')).toBe(true);
    });

    it('rejects unencrypted HTTP URLs', () => {
      expect(isValidSpoSiteUrl('http://contoso.sharepoint.com')).toBe(false);
    });

    it('rejects external/arbitrary attacker domains and spoofed subdomains', () => {
      expect(isValidSpoSiteUrl('https://evil-attacker.com')).toBe(false);
      expect(isValidSpoSiteUrl('https://contoso.sharepoint.com.attacker.com')).toBe(false);
      expect(isValidSpoSiteUrl('not-a-valid-url')).toBe(false);
    });

    it('allows matching current web host in developer workbench', () => {
      expect(isValidSpoSiteUrl('https://localhost:4321', 'https://localhost:4321/temp/workbench.html')).toBe(true);
    });
  });

  describe('DAT-01: Leaf-First Topological Ordering (buildRemediationPlan & Rollback)', () => {
    const mockInventory: IInventoryItem[] = [
      {
        id: '1',
        itemName: 'Root#Folder',
        fullPath: 'C:\\Share\\Root#Folder',
        relativePath: 'Root#Folder',
        directoryPath: 'C:\\Share',
        itemType: 'Folder',
        extension: '',
        sizeBytes: 0,
        sizeMB: 0,
        pathLength: 20,
        estimatedSpoUrlLength: 60,
        depth: 1,
        hasInvalidChars: true,
        invalidCharsFound: '#',
        hasInvalidSubstrings: false,
        invalidSubstringsFound: '',
        hasBoundaryIssue: false,
        boundaryIssuesFound: '',
        isReservedName: false,
        exceedsPathLimit: false,
        exceedsSizeLimit: false,
        isFlagged: true,
        issueSummary: 'Invalid Chars (#)',
        sha256Hash: 'N/A',
        lastModified: '2026-01-01'
      },
      {
        id: '2',
        itemName: 'SubFolder%',
        fullPath: 'C:\\Share\\Root#Folder\\SubFolder%',
        relativePath: 'Root#Folder/SubFolder%',
        directoryPath: 'C:\\Share\\Root#Folder',
        itemType: 'Folder',
        extension: '',
        sizeBytes: 0,
        sizeMB: 0,
        pathLength: 35,
        estimatedSpoUrlLength: 75,
        depth: 2,
        hasInvalidChars: true,
        invalidCharsFound: '%',
        hasInvalidSubstrings: false,
        invalidSubstringsFound: '',
        hasBoundaryIssue: false,
        boundaryIssuesFound: '',
        isReservedName: false,
        exceedsPathLimit: false,
        exceedsSizeLimit: false,
        isFlagged: true,
        issueSummary: 'Invalid Chars (%)',
        sha256Hash: 'N/A',
        lastModified: '2026-01-01'
      },
      {
        id: '3',
        itemName: 'LeafFile&.docx',
        fullPath: 'C:\\Share\\Root#Folder\\SubFolder%\\LeafFile&.docx',
        relativePath: 'Root#Folder/SubFolder%/LeafFile&.docx',
        directoryPath: 'C:\\Share\\Root#Folder\\SubFolder%',
        itemType: 'File',
        extension: '.docx',
        sizeBytes: 1024,
        sizeMB: 0.01,
        pathLength: 50,
        estimatedSpoUrlLength: 90,
        depth: 3,
        hasInvalidChars: true,
        invalidCharsFound: '&',
        hasInvalidSubstrings: false,
        invalidSubstringsFound: '',
        hasBoundaryIssue: false,
        boundaryIssuesFound: '',
        isReservedName: false,
        exceedsPathLimit: false,
        exceedsSizeLimit: false,
        isFlagged: true,
        issueSummary: 'Invalid Chars (&)',
        sha256Hash: 'ABC123HASH',
        lastModified: '2026-01-01'
      }
    ];

    it('sorts remediation plan strictly bottom-up (deepest items first)', () => {
      const plan = buildRemediationPlan(mockInventory, '_', true);
      expect(plan.length).toBe(3);
      // Deepest item (depth 3) must be remediated first
      expect(plan[0].currentName).toBe('LeafFile&.docx');
      expect(plan[0].depth).toBe(3);
      // Intermediate depth 2
      expect(plan[1].currentName).toBe('SubFolder%');
      expect(plan[1].depth).toBe(2);
      // Root depth 1 remediated last
      expect(plan[2].currentName).toBe('Root#Folder');
      expect(plan[2].depth).toBe(1);
    });

    it('inverts order in generateUndoRemediationPs1 to restore top-down safely without orphans', () => {
      const plan = buildRemediationPlan(mockInventory, '_', true);
      const undoScript = generateUndoRemediationPs1(plan);
      expect(undoScript).toContain('Rollback (Undo_Remediation.ps1)');
      // The first item in the rollback script must be the root folder (depth 1), not the leaf
      const rootFolderIdx = undoScript.indexOf('Root#Folder');
      const leafFileIdx = undoScript.indexOf('LeafFile');
      expect(rootFolderIdx).toBeLessThan(leafFileIdx);
    });
  });

  describe('TEN-02: 400-Character SharePoint URL Headroom (calculateUrlHeadroom)', () => {
    it('correctly calculates remaining safe relative path headroom', () => {
      const { baseUrlLength, safeRelativePathHeadroom } =
        calculateUrlHeadroom('https://contoso.sharepoint.com/sites/Marketing', 'Documents', 'Subfolder', 400);

      expect(baseUrlLength).toBeGreaterThan(0);
      expect(safeRelativePathHeadroom).toBe(400 - baseUrlLength - 1);
      expect(safeRelativePathHeadroom).toBeGreaterThan(100);
    });

    it('flags critical alert when tenant URL + library leaves less than 80 chars headroom', () => {
      const longSite = 'https://contoso.sharepoint.com/sites/' + 'a'.repeat(270);
      const { safeRelativePathHeadroom } =
        calculateUrlHeadroom(longSite, 'ExtremelyLongDocumentLibraryNameDirectory', 'NestedSubfolder', 400);

      expect(safeRelativePathHeadroom).toBeLessThan(80);
    });
  });

  describe('SharePoint Online 19 Naming Rules & Win32 Sanitization (getSanitizedName)', () => {
    it('replaces all prohibited characters (~ " # % & * : < > ? / \\ { | })', () => {
      const dirty = 'Report:2026*Q1<Draft>#"Test"&Notes?|Final{1}.xlsx';
      const clean = getSanitizedName(dirty, '_');
      expect(clean).not.toMatch(/[~"#%&*:<>\?/\\\{\|\}]/);
      expect(clean.endsWith('.xlsx')).toBe(true);
    });

    it('trims leading and trailing whitespace and periods', () => {
      expect(getSanitizedName('  Quarterly Report.docx  ', '_')).toBe('Quarterly Report.docx');
      expect(getSanitizedName('.HiddenFile.txt', '_')).toBe('HiddenFile.txt');
      expect(getSanitizedName('TrailingPeriod.', '_')).toBe('TrailingPeriod');
    });

    it('replaces Win32 reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)', () => {
      expect(getSanitizedName('CON.txt', '_')).toBe('SPOSafe_CON.txt');
      expect(getSanitizedName('aux.docx', '_')).toBe('SPOSafe_aux.docx');
      expect(getSanitizedName('PRN', '_')).toBe('SPOSafe_PRN');
      expect(getSanitizedName('COM1.log', '_')).toBe('SPOSafe_COM1.log');
    });

    it('handles temporary Office lock prefixes (~$)', () => {
      expect(getSanitizedName('~$Budget.xlsx', '_')).toBe('_Budget.xlsx');
    });
  });

  describe('TEN-01: 5,000 Unique Permission Scope Ceiling (evaluateAnomalies & evaluatePermissionEntry)', () => {
    it('correctly maps and flags Deny ACEs and orphaned SIDs', () => {
      const denyEntry = evaluatePermissionEntry(
        'perm_1',
        'C:\\Share\\Finance',
        'CONTOSO\\Contractors',
        'Deny',
        'FullControl',
        false,
        true,
        15
      );
      expect(denyEntry.isDenyAce).toBe(true);
      expect(denyEntry.riskLevel).toBe('Critical');

      const orphanEntry = evaluatePermissionEntry(
        'perm_2',
        'C:\\Share\\HR',
        'S-1-5-21-123456789-987654321-1001',
        'Allow',
        'Read',
        false,
        false,
        5
      );
      expect(orphanEntry.isOrphanedSid).toBe(true);
      expect(orphanEntry.riskLevel).toBe('Critical');
    });

    it('raises CRITICAL anomaly when unique permission scopes exceed 5,000 threshold', () => {
      const highScopePerm: IPermissionAuditItem = {
        id: 'perm_scope_5001',
        folderPath: 'C:\\Share\\MassiveAclDir',
        identityReference: 'CONTOSO\\Marketing',
        accessControlType: 'Allow',
        fileSystemRights: 'Modify',
        mappedSpoRole: 'Contribute',
        isInherited: false,
        hasBrokenInheritance: true,
        uniqueAclCount: 5200,
        isOrphanedSid: false,
        isLocalAccount: false,
        isDenyAce: false,
        riskLevel: 'Critical',
        riskNotes: 'Exceeds 5,000 unique permission scope ceiling'
      };

      const dummyTarget: ITargetSpoAssessment = {
        siteUrl: 'https://contoso.sharepoint.com/sites/Test',
        webTitle: 'Test Site',
        connectionMode: 'Simulated Readiness Profile',
        totalStorageQuotaGB: 1000,
        usedStorageGB: 100,
        freeStorageGB: 900,
        freeStoragePercent: 90,
        baseUrlLength: 45,
        maxAllowedSpoUrlLength: 400,
        safeRelativePathHeadroom: 250,
        libraries: [],
        selectedLibrary: 'Documents',
        selectedLibraryItemCount: 10,
        listViewThresholdWarning: false,
        versioningWarning: false,
        readinessStatus: 'READY',
        readinessSummary: 'Ready'
      };

      const anomalies = evaluateAnomalies([], [highScopePerm], dummyTarget, []);
      const permAnomaly = anomalies.find((a) => a.category === 'Permissions & ACL');
      expect(permAnomaly).toBeDefined();
      expect(permAnomaly?.severity).toBe('CRITICAL');
      expect(permAnomaly?.thresholdValue).toContain('< 5,000 Scopes');
    });
  });

  describe('OPS-01: Telemetry & Benchmark 429 Resistance', () => {
    it('detects HTTP 429 throttling anomalies from migration waves', () => {
      const benchmarkWith429: IBatchBenchmarkRow[] = [
        {
          batchNumber: 1,
          batchName: 'Wave 1 (Dev Validation)',
          fileCount: 250,
          batchSizeGB: 5,
          simulatedDurationSec: 15,
          throughputMBps: 3.33,
          projectedGBPerHour: 12.0,
          interBatchPauseSec: 2,
          throttleEvents429: 4,
          status: 'WARNING'
        }
      ];

      const dummyTarget: ITargetSpoAssessment = {
        siteUrl: 'https://contoso.sharepoint.com/sites/Test',
        webTitle: 'Test Site',
        connectionMode: 'Simulated Readiness Profile',
        totalStorageQuotaGB: 1000,
        usedStorageGB: 100,
        freeStorageGB: 900,
        freeStoragePercent: 90,
        baseUrlLength: 45,
        maxAllowedSpoUrlLength: 400,
        safeRelativePathHeadroom: 250,
        libraries: [],
        selectedLibrary: 'Documents',
        selectedLibraryItemCount: 10,
        listViewThresholdWarning: false,
        versioningWarning: false,
        readinessStatus: 'READY',
        readinessSummary: 'Ready'
      };

      const anomalies = evaluateAnomalies([], [], dummyTarget, benchmarkWith429);
      const throttleAnomaly = anomalies.find((a) => a.category === 'SPO Throttling');
      expect(throttleAnomaly).toBeDefined();
      expect(throttleAnomaly?.severity).toBe('WARNING');
      expect(throttleAnomaly?.metricValue).toContain('4 HTTP 429 Event(s)');
    });
  });

  describe('Utility & Formatting Security', () => {
    it('escapes single quotes in PowerShell command strings safely', () => {
      expect(escapePsSingleQuotes("C:\\Share\\O'Reilly\\Book.pdf")).toBe("C:\\Share\\O''Reilly\\Book.pdf");
      expect(escapePsSingleQuotes("Path with \u2018curly quotes\u2019")).toBe("Path with ''curly quotes''");
    });

    it('generates consistent ISO-derived timestamps for output files', () => {
      const ts = formatTimestampForFile();
      expect(ts).toMatch(/^\d{8}_\d{6}$/);
    });
  });
});

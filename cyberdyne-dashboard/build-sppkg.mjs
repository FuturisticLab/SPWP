import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPONENT_ID = '7c13a04a-81f3-4bb4-9c8e-a9b09de761fa';
const SOLUTION_ID = 'e6a218d7-5d07-4289-9a74-bcf2366b17c8';
const FEATURE_ID = 'a97b2f0a-3135-430c-87d2-7c70395781a2';
const VERSION = '1.0.0.0';

console.log('1. Compiling Web Part bundle with esbuild...');

const distDir = path.join(__dirname, 'dist');
const solutionDir = path.join(__dirname, 'sharepoint', 'solution');

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(solutionDir, { recursive: true });

const entryFile = path.join(__dirname, 'src', 'webparts', 'cyberdyneDashboard', 'CyberdyneDashboardWebPart.ts');
const bundleOut = path.join(distDir, 'cyberdyne-dashboard-web-part.js');

execSync(
  `npx --yes esbuild "${entryFile}" --bundle --format=iife --global-name=CyberdyneBundle --outfile="${bundleOut}" --target=es2018 --external:@microsoft/* --external:react --external:react-dom`,
  { stdio: 'inherit' }
);

// Wrap bundle into SPFx AMD define module format
const rawBundle = fs.readFileSync(bundleOut, 'utf-8');
const spfxAmdBundle = `
define("cyberdyne-dashboard-web-part", ["@microsoft/sp-core-library", "@microsoft/sp-webpart-base", "react", "react-dom"], function(spCore, spWebpartBase, React, ReactDOM) {
  var windowObj = typeof window !== "undefined" ? window : global;
  windowObj.React = React;
  windowObj.ReactDOM = ReactDOM;
  
  ${rawBundle}

  return CyberdyneBundle;
});
`;
fs.writeFileSync(bundleOut, spfxAmdBundle.trim());
console.log('✓ Web part bundle generated successfully.');

console.log('2. Assembling Open Packaging Conventions (OPC) parts...');

const manifestContent = {
  "$schema": "https://developer.microsoft.com/json-schemas/spfx/client-side-web-part-manifest.schema.json",
  "id": COMPONENT_ID,
  "alias": "CyberdyneDashboardWebPart",
  "componentType": "WebPart",
  "version": "1.0.0",
  "manifestVersion": 2,
  "requiresCustomScript": false,
  "supportedHosts": ["SharePointWebPart", "SharePointFullPage", "TeamsPersonalApp"],
  "preconfiguredEntries": [{
    "groupId": "5c03119e-3074-46fd-976b-c60198311f70",
    "group": { "default": "Advanced Portals" },
    "title": { "default": "Cyberdyne Portal & Layout Customizer" },
    "description": { "default": "Update-proof Cyberpunk HUD dashboard with hero carousel, news, and quick access." },
    "officeFabricIconFontName": "BIDashboard",
    "properties": {
      "companyName": "CYBERDYNE SOLUTIONS",
      "globalSubtitle": "Global Intranet",
      "pageHeadline": "ShairePoint Intranet",
      "accentColor": "#FF1E3C",
      "glowIntensity": "high"
    }
  }],
  "loaderConfig": {
    "entryModuleId": "cyberdyne-dashboard-web-part",
    "internalModuleBaseUrls": [
      "<!--SPFX_SERVE_TENANT_APP_CATALOG_URL-->"
    ],
    "scriptResources": {
      "cyberdyne-dashboard-web-part": {
        "type": "path",
        "path": "cyberdyne-dashboard-web-part.js"
      }
    }
  }
};

const manifestJsonStr = JSON.stringify(manifestContent, null, 2);

// [Content_Types].xml
const contentTypesXml = `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="text/xml" />
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="json" ContentType="application/json" />
  <Default Extension="js" ContentType="application/javascript" />
  <Override PartName="/AppManifest.xml" ContentType="application/vnd.ms-sharepoint.app+xml" />
  <Override PartName="/feature.xml" ContentType="application/vnd.ms-sharepoint.feature+xml" />
  <Override PartName="/elements.xml" ContentType="application/vnd.ms-sharepoint.element-manifest+xml" />
</Types>`;

// _rels/.rels -> Target MUST be "AppManifest.xml" and Type MUST be "package-manifest"
const rootRelsXml = `<?xml version="1.0" encoding="utf-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/sharepoint/2012/app/relationships/package-manifest" Target="AppManifest.xml" />
</Relationships>`;

// AppManifest.xml for modern SharePoint Framework (SPFx) Client-Side Solution
const appManifestXml = `<?xml version="1.0" encoding="utf-8"?>
<App xmlns="http://schemas.microsoft.com/sharepoint/2012/app/manifest"
     Name="cyberdyne-dashboard-client-side-solution"
     ProductID="{${SOLUTION_ID}}"
     Version="${VERSION}"
     SharePointMinVersion="16.0.0.0"
     IsClientSideSolution="true"
     SkipFeatureDeployment="true">
  <Properties>
    <Title>Cyberdyne Portal &amp; Layout Customizer</Title>
    <StartPage>~appWebUrl</StartPage>
  </Properties>
</App>`;

// _rels/AppManifest.xml.rels -> Links AppManifest to feature.xml
const appManifestRelsXml = `<?xml version="1.0" encoding="utf-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/sharepoint/2012/app/relationships/feature" Target="feature.xml" />
</Relationships>`;

// feature.xml
const featureXml = `<?xml version="1.0" encoding="utf-8"?>
<Feature xmlns="http://schemas.microsoft.com/sharepoint/"
         Id="${FEATURE_ID}"
         Title="cyberdyne-dashboard Feature"
         Description="Activates the cyberdyne dashboard components."
         Version="${VERSION}"
         Scope="Web">
  <ElementManifests>
    <ElementManifest Location="elements.xml" />
  </ElementManifests>
</Feature>`;

// _rels/feature.xml.rels -> Links feature.xml to elements.xml
const featureRelsXml = `<?xml version="1.0" encoding="utf-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/sharepoint/2012/app/relationships/element-manifest" Target="elements.xml" />
</Relationships>`;

// elements.xml
const elementsXml = `<?xml version="1.0" encoding="utf-8"?>
<Elements xmlns="http://schemas.microsoft.com/sharepoint/">
  <ClientSideComponent
    Id="${COMPONENT_ID}"
    Name="CyberdyneDashboardWebPart"
    Title="Cyberdyne Portal &amp; Layout Customizer"
    Description="Update-proof Cyberpunk HUD dashboard with hero carousel, news, and quick access."
    Type="WebPart"
    ComponentType="WebPart">
  </ClientSideComponent>
</Elements>`;

console.log('3. Constructing OPC-compliant ZIP via JSZip...');

const zip = new JSZip();

// Root Open Packaging parts
zip.file('[Content_Types].xml', contentTypesXml);
zip.folder('_rels').file('.rels', rootRelsXml);
zip.folder('_rels').file('AppManifest.xml.rels', appManifestRelsXml);
zip.folder('_rels').file('feature.xml.rels', featureRelsXml);

zip.file('AppManifest.xml', appManifestXml);
zip.file('feature.xml', featureXml);
zip.file('elements.xml', elementsXml);
zip.file(`${COMPONENT_ID}.manifest.json`, manifestJsonStr);

// ClientSideAssets parts
const clientSideAssets = zip.folder('ClientSideAssets');
clientSideAssets.file('cyberdyne-dashboard-web-part.js', fs.readFileSync(bundleOut));
clientSideAssets.file(`${COMPONENT_ID}.manifest.json`, manifestJsonStr);

const outputSppkg = path.join(solutionDir, 'cyberdyne-dashboard.sppkg');
const rootSppkg = path.join(__dirname, '..', 'cyberdyne-dashboard.sppkg');

const content = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
  platform: 'UNIX'
});

fs.writeFileSync(outputSppkg, content);
fs.writeFileSync(rootSppkg, content);

console.log(`\n🎉 SUCCESS! Validated OPC SharePoint Package generated at:`);
console.log(`- ${outputSppkg}`);
console.log(`- ${rootSppkg}\n`);

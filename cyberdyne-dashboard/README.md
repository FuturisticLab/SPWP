# Cyberdyne HUD Dashboard (Update-Proof SPFx Architecture)

This solution implements the **Cyberdyne Solutions Dark HUD Portal** matching the target design, engineered specifically to be **100% resilient to Microsoft 365 / SharePoint Online background updates**.

---

## 🛡️ Why This Architecture Is Update-Proof

1. **Scoped Component Boundaries:**
   - Styles are fully encapsulated using CSS Modules (`CyberdyneDashboard.module.scss`).
   - The solution **does not** touch, manipulate, or inject CSS overrides into Microsoft's uncontracted DOM classes (`.sp-pageLayout`, `#spSiteHeader`, `.CanvasComponent`, etc.).
2. **Contracted SPFx Lifecycle & APIs:**
   - Uses Microsoft's officially supported SharePoint Framework (SPFx 1.18+ / 1.19+).
   - Retrieves user identity and tenant context through official `this.context.pageContext` contracts.
3. **Single Part App Page & Web Part Flexibility:**
   - Manifest declares `supportedHosts: ["SharePointWebPart", "SharePointFullPage", "TeamsPersonalApp"]`.
   - When configured as a **Single Part App Page**, SharePoint hides native page padding and hands the entire canvas to this web part, giving you complete visual control natively.

---

## 🚀 Instant Local Preview

You can inspect and test the interactive UI immediately in your browser:
- Open [`preview.html`](./preview.html) in any web browser (Chrome, Edge, Firefox).
- All neon glow animations, responsive grids, search box, and buttons are active.

---

## 📦 Building and Packaging for SharePoint Online

When ready to deploy into your Microsoft 365 Tenant App Catalog:

```bash
# 1. Install dependencies
npm install

# 2. Build and bundle for production
gulp bundle --ship

# 3. Package the SPFx solution package (.sppkg)
gulp package-solution --ship
```

The resulting package will be created at:
`sharepoint/solution/cyberdyne-dashboard-webpart.sppkg`

---

## ⚙️ Deploying in SharePoint Online

1. Go to your **SharePoint Tenant App Catalog** (`https://<tenant>.sharepoint.com/sites/appcatalog`).
2. Drag and drop `cyberdyne-dashboard-webpart.sppkg` into **Apps for SharePoint** and click **Deploy**.
3. In your target SharePoint Site:
   - To use as a **Full-Screen Portal**: Click **New > Page**, select **Single Part App Page**, choose **Cyberdyne Portal & Layout Customizer**.
   - To use as a **Web Part**: Add the web part to any modern page canvas zone.
4. Open the Web Part Property Pane to customize:
   - Neon Accent Color (Hex)
   - Ambient Glow Intensity (Low / Medium / High)
   - Company & Subtitle Branding
   - Hero Banner Slides and CTA Links
   - Toggle visibility of Directory, Trending Topics, and Events widgets.

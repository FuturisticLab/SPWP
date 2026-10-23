# Smart Welcome Hub — Architecture & Auto-Redirect Flow

## Visual Architecture & Flow Overview

![Smart Welcome Hub Architecture & Auto-Redirect Flow](./smart-welcome-hub-architecture-flow.jpg)

---

## Step-by-Step Decision Flowchart Image

![Smart Welcome Hub Decision Flowchart](./smart-welcome-hub-flowchart.png)

---

## 1. System Architecture Diagram (Mermaid)

```mermaid
flowchart LR
    subgraph M365["Azure Entra ID & Microsoft 365"]
        ENTRA["Entra User Directory\n• Department\n• Office / City / Country"]
        SPGROUPS["SharePoint Site Groups\n• Membership Titles"]
    end

    subgraph API["Zero-Approval Dual API Layer"]
        GRAPH["Microsoft Graph API\nGET /v1.0/me"]
        SPREST["SharePoint REST API\n• SP.UserProfiles.PeopleManager\n• /_api/web/currentuser/groups\n• /_api/web?$select=Title"]
    end

    subgraph ADMIN["SharePoint Property Pane (Admin)"]
        RULES["Rules List\nKeyword | Page Name | URL"]
        TIMING["Redirect Delay (0–10s)\n& Optional Fallback URL"]
    end

    subgraph WEBPART["Smart Welcome Hub SPFx Web Part"]
        HUD["Single-Row Telemetry HUD\n• SYS.ONLINE // PORTAL:SECURE\n• PROFILE AUTHORIZATION\n• KITT LED Scanner (fades on verify)"]
        ENGINE["Rule Matching Engine\nTop-to-Bottom (, = OR, + = AND)"]
        SAFETY["Safety Assurance Gate\n• sanitizeRedirectUrl (XSS/Origin)\n• isSamePageUrl (No Loop)\n• Edit Mode & ?noredirect=1\n• HTTP HEAD 404/500 Check"]
    end

    subgraph PORTALS["Target SharePoint Pages"]
        HR["/sites/hr\n(HR Portal)"]
        FIN["/sites/finance\n(Finance Hub)"]
        LOC["/sites/ny-office\n(Regional Portal)"]
    end

    ENTRA --> GRAPH
    ENTRA --> SPREST
    SPGROUPS --> SPREST
    GRAPH -->|Primary| WEBPART
    SPREST -->|Automatic Backfill & Heartbeat| WEBPART
    RULES --> ENGINE
    TIMING --> SAFETY
    HUD --> ENGINE --> SAFETY
    SAFETY -->|3s Countdown → Redirect| HR
    SAFETY -->|3s Countdown → Redirect| FIN
    SAFETY -->|3s Countdown → Redirect| LOC
```

---

## 2. Step-by-Step Decision & Safety Flowchart (Mermaid)

```mermaid
flowchart TD
    START(["User Opens SharePoint Page"]) --> LIVE["Live Connectivity & Session Check\n• navigator.onLine\n• HTTPS check\n• GET /_api/web?$select=Title (4s timeout)"]
    LIVE --> LED["KITT Red LED Slider Sweeps\n→ Flashes Green & Fades Out\n(IDENTITY VERIFIED. ACCESS GRANTED.)"]
    LED --> PROFILE["Load User Attributes\nDepartment + Location + SP Groups"]
    PROFILE --> PARSE["Read Property Pane Rules Top-to-Bottom\nFormat: Keyword | Page Name | Target URL"]
    PARSE --> MATCH{"Does User Profile\nMatch a Rule?"}

    MATCH -- "Yes (First Match Wins)" --> DEST["Select Rule's Target URL & Page Name"]
    MATCH -- "No Match" --> FALLBACK{"Is Fallback URL\nConfigured?"}

    FALLBACK -- "No (Blank)" --> STAY(["Stay on Current Page\n(Greeting Only)"])
    FALLBACK -- "Yes" --> DEST

    DEST --> EDITCHECK{"In SP Edit Mode or\n?Mode=Edit / ?noredirect=1?"}
    EDITCHECK -- "Yes" --> PAUSE_EDIT(["Pause Auto-Redirect\n(Shows paused in edit mode)"])
    EDITCHECK -- "No" --> SAMEPAGE{"Is Target URL the\nCurrent Page?"}

    SAMEPAGE -- "Yes" --> PAUSE_SAME(["Prevent Infinite Loop\n(Shows current page)"])
    SAMEPAGE -- "No" --> COUNTDOWN["Start Countdown (e.g. 3s)\nUser can click 'Stay' to cancel"]

    COUNTDOWN --> USERSTAY{"Did User Click\n'Stay'?"}
    USERSTAY -- "Yes" --> PAUSE_USER(["Cancel Redirect\n(Manual link remains clickable)"])
    USERSTAY -- "No (Timer Reaches 0s)" --> SANITIZE{"Is URL Safe?\n(sanitizeRedirectUrl)"}

    SANITIZE -- "No (Unsafe Scheme/Domain)" --> WARN_URL(["Block & Show Alert"])
    SANITIZE -- "Yes" --> HEADCHECK["Pre-Flight HTTP HEAD Request\nto Target URL (4s timeout)"]

    HEADCHECK --> IS404{"Does Target Return\n404 or 500+?"}
    IS404 -- "Yes" --> WARN_404(["Stop Redirect & Show Warning\n(Prevents broken 404 page)"])
    IS404 -- "No (Page Exists)" --> GO(["window.location.replace(Target URL)"])
```

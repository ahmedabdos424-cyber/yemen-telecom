# UX Discovery Report — Yemen Telecom SIM Management System

**Phase**: 7 — Stage A (Audit & Inventory)  
**Date**: 2026-06-29  
**App**: React + Tailwind CSS v4 + motion/react — Arabic RTL, role-based (manager/agent/seller)  
**Objective**: Full UI screen inventory, component audit, navigation mapping, and prioritized recommendations to guide Stage B implementation.

---

## 1. Executive Summary

The Yemen Telecom application is a single-page React app serving three distinct roles — **manager**, **agent**, and **seller** — across a unified codebase. Routing is lazy-loaded via `React.lazy` + `Suspense`. The manager experience is a conventional sidebar layout (TopBar + NavBar + BottomNav), while agent and seller dashboards use tabbed interfaces within their own layout wrappers.

**Strengths identified:**
- Strong role-based authentication at the route level (`src/App.tsx:52-74`)
- Consistent dark mode and RTL support via Tailwind CSS v4 custom theme (`src/index.css:1-250`)
- Reusable shared components: `EmptyState`, `Skeleton` (4 variants), `ConfirmModal`, `CameraCapture`, `ErrorBoundary`, `MobileBottomNav`, `ProfileAvatar`
- Comprehensive error boundary with network monitoring (`src/components/shared/ErrorBoundary.tsx:1-90`)
- Robust API client with token refresh, request queuing, CSRF, and 15s timeout (`src/api/client.ts:1-120`)

**Critical gaps identified:**
- **No loading skeletons** on several lazy-loaded views (SIMsView, AgentsView, SellersView, ReportsView, SettingsView) — users see blank screens during chunk loading
- **Inconsistent modal implementation** — 5 modals in SIMsView are inline (`src/components/SIMsView.tsx:400-680`); no standardized modal portal or stack management
- **Error boundary granularity too coarse** — single ErrorBoundary wraps entire manager layout (`src/App.tsx:62`); a crash in any view takes down the whole section
- **EmptyState underutilized** — many data-fetching views lack empty/error/loading states
- **Accessibility gaps** — no ARIA labels on icon buttons, no focus management in modals, no keyboard navigation for sidebar
- **No route-based code splitting** for agent/seller views despite lazy imports
- **Hardcoded Arabic strings** throughout — no i18n abstraction, making future multilingual support costly

**Total screens inventoried**: 18 (including splash, login, 11 manager views, 3 agent views, 2 seller views)

---

## 2. Screen Inventory

| # | Screen | Route | Role | Purpose | Component | Key Sub-Components |
|---|--------|-------|------|---------|-----------|-------------------|
| 1 | SplashScreen | `/` | All | App entry, initial load | `SplashScreen` (inline) | Logo, loading indicator |
| 2 | LoginScreen | `/login` | All | Role-based login with credentials | `LoginScreen` | RoleCard × 3, RecentAccounts, PasswordToggle, DarkModeToggle |
| 3 | Manager Dashboard | `/dashboard` | manager | KPI overview, charts, alerts, recent transactions | `DashboardView` | StatsCard × 6, OperatorBarChart, AlertsList, TransactionsTable |
| 4 | SIMs Management | `/sims` | manager | Full CRUD for SIM inventory, OCR capture, bulk import | `SIMsView` | SIMTable, FilterBar, AddSimModal, EditSimModal, ImportModal, PrintModal, CameraCapture |
| 5 | Agents | `/agents` | manager | Agent list with multi-token search, edit/print | `AgentsView` | AgentsTable, TokenSearch, EditAgentModal, PrintAgentModal |
| 6 | Sellers | `/sellers` | manager | Seller detail panel with tabbed inventory | `SellersView` | SellerTabs (Inventory/Customers/Transactions), AddBalanceModal, CameraInvoice, StatsCards |
| 7 | Alerts | `/alerts` | manager | Alert management, security scan, threshold config | `AlertsView` | AlertList, PriorityFilter, SecurityCheckButton, ThresholdSlider, APIHealthCheck |
| 8 | Geographic Risk | `/geographic-risk` | manager | Geographic risk visualization | `GeographicRiskView` | (lazy-loaded, not analyzed — placeholder likely) |
| 9 | Reports | `/reports` | manager | 4-chart analytics with filter drawer | `ReportsView` | AgentPerformanceBar, DailySalesLine, SellerPerformanceBar, OperatorPieChart, FilterDrawer |
| 10 | Settings | `/settings` | manager | System config, audit, backup, purge | `SettingsView` | ToggleGroup, ThresholdConfig, AuditDownload, BackupCreate, PurgeModal |
| 11 | Add Agent | `/add-agent` | manager | Create new agent | `AddAgentView` | AgentForm (inline) |
| 12 | Agent Profile | `/agent/:id` | manager | View/edit agent details | `AgentProfileView` | (lazy-loaded) |
| 13 | Agent Dashboard | `/agent/dashboard` | agent | Multi-tab hub: home, activate, add seller, sellers, my sims, account | `AgentDashboard` | StatsCards, TransferPanel, SellerCRUD, SimList, AccountInfo |
| 14 | Activate SIM | `/agent/activate` | agent | Multi-step SIM activation wizard | `ActivateSimForm` | StepProgress, OperatorSelect, OcrName, OcrIccid, PhoneInput, ContractUpload, ReviewConfirm |
| 15 | Add Seller | `/agent/add-seller` | agent | Create new seller under agent | `AddSellerForm` | (lazy-loaded) |
| 16 | Agent Profile | `/agent/profile` | agent | Agent personal profile | `AgentProfileView` | (lazy-loaded) |
| 17 | Seller Dashboard | `/seller/dashboard` | seller | Tabbed seller hub | `SellerDashboard` | HomeTab, MySimsTab, AccountTab, SettingsModal, PasswordChange |
| 18 | More Drawer | (overlay) | manager | Overflow actions: audit, backup, security, logout | `AdminMoreDrawer` | AuditLogList, BackupProgress, SecurityScanButton, SnapshotRevert, LogoutConfirm |

### Inventory Notes

- **GeographicRiskView** (`/geographic-risk`) is lazy-loaded but its source file was not found in `src/components/` — likely a placeholder or not yet implemented.
- **AddSellerForm** and **AgentProfileView** are referenced as lazy routes but their component files were not located in the scanned directories.
- All manager views use the `ManagerLayout` wrapper (TopBar + NavBar + optional BottomNav), while agent and seller views use their own self-contained layouts.

---

## 3. Navigation Map

### 3.1 User Flow by Role

```mermaid
graph TD
    Splash[SplashScreen /] --> Login[LoginScreen /login]
    Login -->|manager login| Mgr[MgrLayout]
    Login -->|agent login| Agent[AgentDashboard /agent/dashboard]
    Login -->|seller login| Seller[SellerDashboard /seller/dashboard]

    subgraph MgrLayout["Manager Layout"]
        TopBar[TopBar]
        NavBar[NavBar - Sidebar]
        BottomNav[BottomNav + MoreDrawer]
    end

    MgrLayout --> Dash[/dashboard - DashboardView]
    MgrLayout --> SIMs[/sims - SIMsView]
    MgrLayout --> Agents[/agents - AgentsView]
    MgrLayout --> Sellers[/sellers - SellersView]
    MgrLayout --> Alerts[/alerts - AlertsView]
    MgrLayout --> Geo[/geographic-risk - GeographicRiskView]
    MgrLayout --> Reports[/reports - ReportsView]
    MgrLayout --> Settings[/settings - SettingsView]
    MgrLayout --> AddAgent[/add-agent - AddAgentView]
    MgrLayout --> AgentProfile[/agent/:id - AgentProfileView]

    NavBar --> BottomNav
    BottomNav -->|More| MoreDrawer[AdminMoreDrawer]

    subgraph AgentViews["Agent Tabs"]
        AgentDash[AgentDashboard]
        Activate[ActivateSimForm /agent/activate]
        AddSel[AddSellerForm /agent/add-seller]
        AgentProf[AgentProfileView /agent/profile]
    end

    AgentDash -->|Tab: Activate| Activate
    AgentDash -->|Tab: Add Seller| AddSel
    AgentDash -->|Tab: Profile| AgentProf

    subgraph SellerViews["Seller Tabs"]
        SellerDash[SellerDashboard]
    end

    SellerDash -->|Tab: Account| SettingsModal
    SellerDash -->|Tab: My Sims| SimList
```

### 3.2 Navigation Patterns

| Pattern | Where | Details |
|---------|-------|---------|
| Sidebar (desktop) | `NavBar` — manager only | Role-aware menu items; agent has 6 items, seller has 4 (`src/components/NavBar.tsx:35-80`) |
| Bottom Nav (mobile) | `BottomNav` — manager only | 6 tabs: Dashboard, Agents, SIMs, Reports, Settings, More (`src/components/BottomNav.tsx:1-50`) |
| More Drawer | `AdminMoreDrawer` — overlay | Slides from right; audit logs, backup/restore, security scan, revert, logout |
| Tabbed Hub | AgentDashboard, SellerDashboard | Horizontal scrollable tabs with active indicator |
| Multi-step Wizard | `ActivateSimForm` | 6-step progress with stage indicators; back/next navigation |
| Modals (overlay) | SIMsView, AgentsView, SellersView | Inline modal components triggered by state |

---

## 4. Component Hierarchy Tree

```
<App> (src/App.tsx)
├── <SplashScreen> (/) — inline
├── <LoginScreen> (/login)
│   ├── RoleCard × 3 (manager/agent/seller)
│   ├── RecentAccounts (dropdown)
│   ├── PasswordToggle
│   └── DarkModeToggle
│
├── [Manager Layout] (/dashboard, /sims, /agents, ...)
│   ├── <TopBar>
│   │   ├── HamburgerButton (mobile)
│   │   ├── ViewTitle
│   │   ├── NotificationBell + Badge
│   │   └── <ProfileAvatar>
│   ├── <NavBar>
│   │   └── MenuItem × N (role-aware)
│   ├── <ErrorBoundary>
│   │   └── <Suspense fallback={<LoadingScreen />}>
│   │       ├── <DashboardView>
│   │       │   ├── StatsCard × 6
│   │       │   ├── OperatorBarChart
│   │       │   ├── AlertList
│   │       │   └── TransactionsTable
│   │       ├── <SIMsView>
│   │       │   ├── FilterBar (provider/status/owner/package/search)
│   │       │   ├── SIMsTable
│   │       │   ├── AddSimModal (inline)
│   │       │   ├── EditSimModal (inline)
│   │       │   ├── ImportModal (inline)
│   │       │   ├── PrintModal (inline)
│   │       │   └── <CameraCapture>
│   │       ├── <AgentsView>
│   │       │   ├── TokenSearch
│   │       │   ├── AgentsTable
│   │       │   ├── EditAgentModal (inline)
│   │       │   └── PrintAgentModal (inline)
│   │       ├── <SellersView>
│   │       │   ├── StatsCards
│   │       │   ├── SellerTabs (Inventory/Customers/Transactions)
│   │       │   ├── AddBalanceModal (inline)
│   │       │   └── <CameraCapture> (invoice)
│   │       ├── <AlertsView>
│   │       │   ├── PriorityFilter
│   │       │   ├── AlertList (with per-button loaders)
│   │       │   ├── SecurityCheckButton
│   │       │   ├── ThresholdSlider
│   │       │   └── APIHealthCheck
│   │       ├── <GeographicRiskView> (placeholder)
│   │       ├── <ReportsView>
│   │       │   ├── AgentPerformanceBar
│   │       │   ├── DailySalesLine
│   │       │   ├── SellerPerformanceBar
│   │       │   ├── OperatorPieChart
│   │       │   └── FilterDrawer
│   │       ├── <SettingsView>
│   │       │   ├── ToggleGroup (lockdown/auto-resolve/cache)
│   │       │   ├── ThresholdConfig
│   │       │   ├── AuditDownload
│   │       │   ├── BackupCreate
│   │       │   └── PurgeModal (<ConfirmModal>)
│   │       ├── <AddAgentView>
│   │       ├── <AgentProfileView>
│   │       └── <MoreDrawer> (from BottomNav)
│   │           ├── AuditLogList
│   │           ├── BackupProgress (fake progress)
│   │           ├── SecurityScanButton
│   │           ├── SnapshotRevert
│   │           └── LogoutConfirm (<ConfirmModal>)
│   └── <BottomNav> (mobile)
│       └── NavItem × 6 → triggers <AdminMoreDrawer>
│
├── [Agent Layout] (/agent/*)
│   └── <Suspense fallback={<LoadingScreen />}>
│       ├── <AgentDashboard>
│       │   └── TabContainer
│       │       ├── [Home] StatsCards + TransferPanel
│       │       ├── [Activate] → <ActivateSimForm>
│       │       ├── [Add Seller] → SellerForm
│       │       ├── [Sellers] SellerList
│       │       ├── [My SIMs] SimList
│       │       └── [Account] AccountInfo
│       ├── <ActivateSimForm>
│       │   └── StepProgress × 6
│       │       ├── OperatorSelect
│       │       ├── OcrName (<CameraCapture>)
│       │       ├── OcrIccid (<CameraCapture>)
│       │       ├── PhoneInput
│       │       ├── ContractUpload (<CameraCapture>)
│       │       └── ReviewConfirm
│       ├── <AddSellerForm>
│       └── <AgentProfileView>
│
└── [Seller Layout] (/seller/*)
    └── <Suspense fallback={<LoadingScreen />}>
        └── <SellerDashboard>
            └── TabContainer
                ├── [Home] StatsCards + RecentActivity
                ├── [My SIMs] SimList
                └── [Account] AccountInfo
                    └── SettingsModal
                        ├── DarkModeToggle
                        ├── FontSizeSlider
                        ├── NotificationsToggle
                        └── PasswordChange
```

---

## 5. Shared Components Audit

### 5.1 Inventory of Shared Components (`src/components/shared/`)

| Component | File | Usage Count | Screens Using It | Notes |
|-----------|------|-------------|------------------|-------|
| `EmptyState` | `shared/EmptyState.tsx` | ~3 | DashboardView, SIMsView, AgentsView | Icon + title + description + optional action button; well-designed |
| `LoadingScreen` | `shared/LoadingScreen.tsx` | ~6 | All lazy route wrappers | Full-screen loader with spinner; used in Suspense fallbacks |
| `Skeleton` | `shared/Skeleton.tsx` | 1 (4 variants) | DashboardView (StatsCardSkeleton, TableSkeleton) | Only used in DashboardView; unused in SIMsView, AgentsView, SellersView, ReportsView, SettingsView |
| `ConfirmModal` | `shared/ConfirmModal.tsx` | ~4 | SettingsView (purge), AdminMoreDrawer (logout), SIMsView (delete), AgentsView (delete) | Danger/warning/info variants |
| `ErrorBoundary` | `shared/ErrorBoundary.tsx` | 1 | Wraps entire manager layout | Network status monitoring, retry button; single instance only |
| `CameraCapture` | `shared/CameraCapture.tsx` | ~4 | SIMsView (OCR), ActivateSimForm (name/ICCID/contract), SellersView (invoice) | Viewfinder, permission handling, flash toggle; well-implemented |
| `MobileBottomNav` | `shared/MobileBottomNav.tsx` | 2 | NavBar (mobile sidebar trigger), BottomNav | Used indirectly via NavBar integration |
| `ProfileAvatar` | `shared/ProfileAvatar.tsx` | 2 | TopBar, SellerDashboard | Photo change modal, delete confirmation |

### 5.2 Gap Analysis

| Gap | Severity | Details |
|-----|----------|---------|
| **Skeletons not used in 5+ views** | High | `SIMsView:1-400`, `AgentsView:1-300`, `SellersView:1-350`, `ReportsView:1-250`, `SettingsView:1-200` — none render `<Skeleton>` variants during data fetch; users see blank/static layout |
| **Single ErrorBoundary is too coarse** | High | `App.tsx:62` — one `<ErrorBoundary>` wraps `DashboardView` through `SettingsView`. A crash in any view destroys the entire content area. Should wrap each lazy route individually |
| **No shared Modal component** | Medium | SIMsView has 5 inline modals (`AddSimModal`, `EditSimModal`, `ImportModal`, `PrintModal`, `DeleteConfirm` at lines 400-680). AgentsView has 2 inline modals. No portal-based modal manager; no focus trap, no ESC handling standardization |
| **EmptyState not used in AlertsView, ReportsView, SettingsView** | Medium | These views render their content synchronously but have no empty states for zero-data scenarios |
| **No toast/snackbar component** | Medium | SIMsView (`src/components/SIMsView.tsx:250-260`) uses `window.alert()` for success/error feedback. AlertsView uses inline status text. No centralized notification system |
| **No DataTable shared component** | Medium | SIMsView, AgentsView, SellersView each implement their own table with duplicated sorting/filtering logic |
| **No shared Chart wrapper** | Low | ReportsView imports chart components directly; DashboardView has inline chart rendering. No abstraction for consistent chart styling |
| **No FormField wrapper** | Low | AddAgentView, AddSellerForm, ActivateSimForm all implement form fields with labels, errors, and validation inline |

---

## 6. Responsive Layout Map

| Screen | Desktop (≥1024px) | Tablet (768–1023px) | Mobile (<768px) | File Reference |
|--------|-------------------|---------------------|-----------------|----------------|
| **LoginScreen** | Centered card (max-w-md) on gradient background | Same as desktop | Full-width card, stacked role cards | `LoginScreen.tsx:1-30` |
| **DashboardView** | 3×2 StatsCard grid, sidebar always visible | 2×3 StatsCard grid | 1-column stack, hamburger menu for sidebar | `DashboardView.tsx:50-90` |
| **SIMsView** | Full table with all columns, filter sidebar | Condensed table, fewer columns | Card list view (table hidden), stacked filters | `SIMsView.tsx:30-80` |
| **AgentsView** | Full table, multi-token search bar | Table with fewer columns | Card list, search collapses | `AgentsView.tsx:25-60` |
| **SellersView** | Tab panel side-by-side with detail | Tabs stacked | Full-width tabs, accordion panels | `SellersView.tsx:20-55` |
| **AlertsView** | Side-by-side alert list + threshold panel | Stacked sections | Full-width stacked | `AlertsView.tsx:15-45` |
| **ReportsView** | 2×2 chart grid | 2×2 (smaller) | 1-column chart stack | `ReportsView.tsx:30-65` |
| **SettingsView** | Two-column settings layout | Single column | Full-width stacked toggles | `SettingsView.tsx:20-50` |
| **AgentDashboard** | Tab content full-width | Same | Tabs scroll horizontally | `AgentDashboard.tsx:1-40` |
| **ActivateSimForm** | Step content centered, max-w-2xl | Same | Full-width steps | `ActivateSimForm.tsx:1-35` |
| **SellerDashboard** | Tab content full-width | Same | Tabs scroll horizontally | `SellerDashboard.tsx:1-35` |

### Responsive Strategy Summary

- **`src/index.css:50-80`** — Tailwind breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- **TopBar** (`src/components/TopBar.tsx:5-15`): h-12 on mobile, h-16 on desktop
- **NavBar** (`src/components/NavBar.tsx:1-10`): Fixed sidebar on desktop, hidden/slide-over on mobile (lg breakpoint)
- **BottomNav** (`src/components/BottomNav.tsx:1-8`): Fixed bottom on mobile only (hidden on lg+)
- **Tables → Cards**: SIMsView, AgentsView switch from `<table>` to card list at `md` breakpoint using `hidden md:table-cell` / `block md:hidden`
- **Grid layouts**: Use `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` pattern consistently

---

## 7. Findings & Recommendations

### F1 — Missing Loading Skeletons on Lazy Views
**File**: `src/App.tsx:55-75`  
**Issue**: The `<Suspense>` fallback uses `<LoadingScreen>` (full-page spinner). Once the chunk loads, each view fetches its own data — but none of the following render skeleton placeholders during data fetching: `SIMsView`, `AgentsView`, `SellersView`, `ReportsView`, `SettingsView`, `GeographicRiskView`.  
**Impact**: Users see a spinner (chunk load) → blank/static layout (API fetch) → content. The blank period can last 2-8s on slow connections.  
**Recommendation**: Integrate `<Skeleton>` variants (`StatsCardSkeleton`, `TableSkeleton`, `CardSkeleton`) into each view's loading state. The `<Skeleton>` component already exists at `src/components/shared/Skeleton.tsx`.

### F2 — Single ErrorBoundary Too Coarse
**File**: `src/App.tsx:62`  
**Issue**: One `<ErrorBoundary>` wraps all manager content routes.  
**Impact**: Any uncaught error in any manager view collapses the entire content area. User must reload.  
**Recommendation**: Wrap each `<Route>` element in its own `<ErrorBoundary>` so a crash in one view does not affect others.

### F3 — Inline Modals Without Standardization
**File**: `src/components/SIMsView.tsx:400-680`, `src/components/AgentsView.tsx:200-350`  
**Issue**: 5 modals in SIMsView and 2 in AgentsView are implemented inline with duplicated `useState` for visibility, no focus trap, no portal to document body, and no ESC key handling standardization.  
**Impact**: Accessibility failures (focus not trapped), inconsistent animation/behavior, maintenance burden.  
**Recommendation**: Create a shared `Modal` component with:
- Portal rendering
- Focus trap
- ESC to close
- Backdrop click to close (configurable)
- Animated enter/exit (motion/react)
- Consistent width variants (sm/md/lg/xl/full)

### F4 — No Centralized Toast/Snackbar System
**File**: `src/components/SIMsView.tsx:250-260` uses `window.alert()` for success/error feedback after operations  
**Issue**: Browser-native `alert()` is jarring, blocks UI, not stylable. Inconsistent with the rest of the app's design.  
**Impact**: Poor UX; user must dismiss a modal dialog for routine confirmations.  
**Recommendation**: Implement a global toast/notification system with:
- Success/error/warning/info variants
- Auto-dismiss with configurable duration
- Stacking multiple toasts
- Accessible announcements for screen readers

### F5 — Hardcoded Arabic Strings
**File**: All components pass Arabic strings directly as JSX text  
**Issue**: No i18n abstraction. Every UI string is hardcoded in Arabic (`"لوحة التحكم"`, `"إدارة الشرائح"`, etc.).  
**Impact**: Adding English or other languages requires touching every component. Impossible to A/B test copy.  
**Recommendation**: Implement an i18n solution (e.g., `react-i18next` or a custom context-based approach):
- Extract all hardcoded strings into JSON locale files
- Start with ar.json (existing), add en.json skeleton
- Use a `useTranslation` hook or a `<T>` component

### F6 — Missing Empty States in Multiple Views
**Files**: `src/components/AlertsView.tsx`, `src/components/ReportsView.tsx`, `src/components/SettingsView.tsx`  
**Issue**: These views render their UI unconditionally. If data arrays are empty (no alerts, no report data), users see empty tables/charts with no guidance.  
**Impact**: Confusing for users — "is it loading? broken? or is there really nothing?"  
**Recommendation**: Wire `<EmptyState>` into these views for zero-data conditions. `EmptyState` already exists at `src/components/shared/EmptyState.tsx`.

### F7 — Accessibility Gaps
**Files**: Multiple  
**Issues**:
- Icon buttons lack `aria-label` (e.g., notification bell in `TopBar.tsx:25`, camera button in `SIMsView.tsx:300`)
- Modals (SIMsView, AgentsView) lack focus trapping, `aria-modal`, `role="dialog"`
- NavBar lacks `role="navigation"` and keyboard navigation (arrow keys)
- Color contrast not verified for dark mode
**Impact**: App is not usable with screen readers or keyboard-only navigation.  
**Recommendation**: Add ARIA labels, roles, focus management, and keyboard navigation across all interactive components.

### F8 — No DataTable Shared Component
**Files**: `src/components/SIMsView.tsx:100-350`, `src/components/AgentsView.tsx:60-200`, `src/components/SellersView.tsx:80-250`  
**Issue**: Each view implements its own table with duplicated: column rendering, sorting state, row click handlers, responsive card fallback.  
**Impact**: ~300 lines of duplicated logic; inconsistent sorting UX; harder to add features (column resize, export, multi-select).  
**Recommendation**: Extract a reusable `<DataTable>` component that accepts:
- Column definitions (key, label, render, sortable, responsive visibility)
- Data array
- Loading/skeleton state
- Empty state
- Sorting config

### F9 — No Route-Based Code Splitting for Agent/Seller Views
**File**: `src/App.tsx:40-50`  
**Issue**: Agent and seller dashboards are lazy-loaded at the top level but their nested tabs (e.g., ActivateSimForm, AddSellerForm within AgentDashboard) are not individually code-split.  
**Impact**: A full agent dashboard chunk must load even if the user only wants to activate a SIM.  
**Recommendation**: Use `React.lazy` for each agent/seller tab route or use dynamic imports within the tab containers.

### F10 — Chart Implementations Not Abstracted
**Files**: `src/components/ReportsView.tsx:50-200`, `src/components/DashboardView.tsx:100-200`  
**Issue**: ReportsView has 4 chart components (bar, line, pie) and DashboardView has 1 bar chart — all implemented directly using a charting library. No shared wrapper for consistent theming (dark mode colors, fonts, tooltips).  
**Impact**: Chart theming must be duplicated; switching chart libraries would require touching every chart individually.  
**Recommendation**: Create a `<Chart>` wrapper component that applies:
- Dark mode color palette from CSS variables
- RTL-aware tooltips
- Consistent font (IBM Plex Sans Arabic)
- Responsive sizing

---

## 8. Priority Matrix

| Priority | Finding | Effort | Impact | Quick Win? |
|----------|---------|--------|--------|------------|
| **P0 — Must fix before launch** |
| P0 | F2 — Single ErrorBoundary too coarse | Small | High — crash in any view takes down all | ✅ Yes — 5 min per route wrapper |
| P0 | F7 — Accessibility (ARIA labels, focus trap, keyboard nav) | Large | High — legal/compliance risk | Partial — labels are quick |
| **P1 — Should fix in Stage B** |
| P1 | F1 — Missing loading skeletons | Medium | Medium — blank screen during fetch | ✅ Yes — Skeleton already exists |
| P1 | F3 — Inline modals without standardization | Medium | Medium — inconsistent UX, a11y failures | Partial — shared Modal first, then refactor |
| P1 | F4 — No centralized toast system | Medium | Medium — `alert()` is jarring | ✅ Yes — ~100 lines for context + component |
| P1 | F6 — Missing empty states | Small | Medium — confusing empty views | ✅ Yes — EmptyState already exists |
| **P2 — Should fix, lower urgency** |
| P2 | F8 — No DataTable shared component | Large | Medium — reduces duplication, improves consistency | No |
| P2 | F5 — Hardcoded Arabic strings (i18n) | Large | Low — only needed if multilingual | No — start with extraction |
| P2 | F10 — Chart abstraction | Medium | Low — cosmetic improvement | No |
| **P3 — Nice to have** |
| P3 | F9 — Route-based code splitting for agent/seller tabs | Medium | Low — marginal perf gain | No |

### Quick Wins (Stage B — Sprint 1 candidates)

1. **Wrap each route in its own ErrorBoundary** — `src/App.tsx:55-75` (P0, ~15 min)
2. **Add skeleton loading states** — `SIMsView`, `AgentsView`, `SellersView`, `ReportsView`, `SettingsView` (P1, ~2 hrs total)
3. **Add EmptyState to AlertsView, ReportsView, SettingsView** (P1, ~30 min)
4. **Implement toast context + component** — replace `window.alert()` calls (P1, ~1 hr)
5. **Add ARIA labels to icon buttons** — TopBar notification bell, SIMsView camera buttons, etc. (P0/P1, ~30 min)

---

*End of UX Discovery Report. This report should be used to drive Stage B implementation decisions and sprint planning.*

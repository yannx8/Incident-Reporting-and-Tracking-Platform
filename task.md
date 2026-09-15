# Nexus Incidents Tasks

## Status
- [x] Monorepo architecture mapping to packages/backend and packages/frontend
- [x] Backend Express, Prisma, TypeScript setup
- [x] Frontend React, Vite, Leaflet, Recharts setup
- [x] Database migration on nexus_incidents
- [x] Verification of builds, tests, and API communication

## Phase 1 — Foundations
- [x] Install dependencies: leaflet, react-leaflet, @types/leaflet
- [x] Modify tailwind.config.js (apply the blue palette)
- [x] Update src/index.css
- [x] Update src/types/index.ts
- [x] Update src/api/mockData.ts
- [x] Update src/store/useAppStore.ts

## Phase 2 — Core Components
- [x] Create src/components/Toast.tsx
- [x] Create src/components/ConfirmDialog.tsx
- [x] Modify src/components/Header.tsx (add notifications & role switcher)
- [x] Create src/components/NotificationsPanel.tsx

## Phase 3 — Functional Modals
- [x] Create src/components/CreateIncidentModal.tsx
- [x] Create src/components/AssignModal.tsx
- [x] Create src/components/SiteFormModal.tsx
- [x] Create src/components/TeamFormModal.tsx

## Phase 4 - Functional Pages
- [x] Create/Modify src/pages/DashboardPage.tsx
- [x] Create/Modify src/pages/IncidentsPage.tsx
- [x] Create/Modify src/components/IncidentDrawer.tsx
- [x] Create/Modify src/pages/TeamsPage.tsx
- [x] Create/Modify src/pages/SitesPage.tsx
- [x] Create/Modify src/pages/SettingsPage.tsx

## Phase 5 — Live Map
- [x] Create src/pages/MapPage.tsx

## Phase 6 - Polish
- [x] Ensure all breakpoints and responsive adaptations from Section 10 are applied.
- [x] Implement missing features from Section 11 (Resolution & Acceptance workflow).
- [x] Update App.tsx to include the ToastContainer.
- [x] Verify empty states, error states, and animations.
- [x] Run pnpm build to ensure full application compiles successfully.

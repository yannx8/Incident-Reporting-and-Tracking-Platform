# Project Tasks

## Incident Reporting & Tracking Platform MVP
- [x] GIT-8: Database Domain Model
- [x] GIT-13/32: Authentication Base
- [x] GIT-18: Incident Creation & Listing Base

## Remaining Backend Endpoints
- [x] Implement Assignment Acceptance (GIT-19)
  - [x] Add `updateAssignmentStatusSchema` to `incidents.schema.ts`
  - [x] Add `updateAssignmentStatus` to `incidents.controller.ts`
  - [x] Route `PATCH /incidents/:id/assignments/:assignmentId/status`
- [x] Implement Progress Updates (GIT-24)
  - [x] Add `createProgressUpdateSchema` to `incidents.schema.ts`
  - [x] Add `createProgressUpdate` to `incidents.controller.ts`
  - [x] Route `POST /incidents/:id/progress-updates`
- [x] Implement Incident Resolution & Closure (GIT-26, GIT-40)
  - [x] Add `resolveIncident` and `closeIncident` to `incidents.controller.ts`
  - [x] Route `POST /incidents/:id/resolve` and `POST /incidents/:id/close`
- [x] Implement Incident Comments (GIT-37)
  - [x] Add `createCommentSchema` to `incidents.schema.ts`
  - [x] Add `addComment` to `incidents.controller.ts`
  - [x] Route `POST /incidents/:id/comments`
- [x] Implement Advanced Incident List Filtering (GIT-35)
  - [x] Add `listIncidentsQuerySchema` to `incidents.schema.ts`
  - [x] Update `listIncidents` in `incidents.controller.ts` to support filtering and search
- [x] Test & Validate
  - [x] Write integration tests for new endpoints in `packages/backend/src/modules/incidents/__tests__`

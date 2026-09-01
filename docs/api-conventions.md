# API Conventions

> **GIT-9** — Sprint 0B: Technical Foundation & Quality
>
> These conventions apply to all backend API routes implemented in subsequent sprints.
> All developers must follow them consistently.

---

## 1. Base URL

All API routes are prefixed:

```
/api/v1
```

---

## 2. Resource Naming

- Plural nouns, kebab-case path segments.
- Sub-resources are nested under their parent.

```
/api/v1/incidents
/api/v1/incidents/:incidentId
/api/v1/incidents/:incidentId/assignments
/api/v1/incidents/:incidentId/comments
/api/v1/sites
/api/v1/sites/:siteId
```

---

## 3. HTTP Methods

| Method | Semantics |
|---|---|
| `GET` | Read one or many resources (idempotent, no body) |
| `POST` | Create a new resource |
| `PATCH` | Partial update of an existing resource |
| `PUT` | Full replacement (used only where semantically appropriate) |
| `DELETE` | Delete a resource |

---

## 4. Organization Scoping in URLs

Organization context is resolved from the **authenticated session** — not from URL parameters.

API routes do not expose a client-controlled `:organizationId` segment for scoping. The backend derives the organization from `req.user.organizationId` set by the authentication middleware.

```
✅  GET /api/v1/incidents          ← scope from session
❌  GET /api/v1/organizations/:id/incidents  ← do not use for scoping
```

---

## 5. Success Responses

### Single resource

```http
HTTP 200 OK
Content-Type: application/json

{
  "data": {
    "id": "abc123",
    "title": "Spill in corridor B3",
    "status": "NEW"
  }
}
```

### Collection (paginated)

```http
HTTP 200 OK
Content-Type: application/json

{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 84,
    "totalPages": 5
  }
}
```

### Created

```http
HTTP 201 Created
Location: /api/v1/incidents/abc123
Content-Type: application/json

{
  "data": { ... }
}
```

### Deleted / no content

```http
HTTP 204 No Content
```

---

## 6. Error Responses

All errors use a consistent envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": []
  }
}
```

`details` is present only when there is per-field context (e.g. validation errors). It is omitted or empty for all other error types.

---

### 6.1 Validation Error — 400

Returned when the request body, query parameters, or path parameters fail validation.

```http
HTTP 400 Bad Request

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body is invalid",
    "details": [
      { "field": "title", "message": "Title is required" },
      { "field": "severity", "message": "Must be one of: LOW, MEDIUM, HIGH, CRITICAL" }
    ]
  }
}
```

Validation is performed before the request reaches the service layer. The service layer may assume inputs are valid.

---

### 6.2 Authentication Failure — 401

Returned when the request carries no valid session/token, or when the token has expired.

```http
HTTP 401 Unauthorized

{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required"
  }
}
```

---

### 6.3 Authorization Failure — 403

Returned when the authenticated user does not have permission to perform the action.

```http
HTTP 403 Forbidden

{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions for this operation"
  }
}
```

Do not reveal whether the resource exists in a 403 response (avoid information disclosure). Where appropriate, return 404 instead.

---

### 6.4 Not Found — 404

Returned when the resource does not exist **or** when it exists but is outside the authenticated user's organization scope (to prevent enumeration).

```http
HTTP 404 Not Found

{
  "error": {
    "code": "NOT_FOUND",
    "message": "Incident not found"
  }
}
```

---

### 6.5 Conflict / Invalid State Transition — 409

Returned when the request is structurally valid but conflicts with the current resource state.

```http
HTTP 409 Conflict

{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Cannot transition from RESOLVED to ASSIGNED"
  }
}
```

Other conflict scenarios (e.g. duplicate unique value):

```http
HTTP 409 Conflict

{
  "error": {
    "code": "CONFLICT",
    "message": "A site with this name already exists"
  }
}
```

---

### 6.6 Internal Server Error — 500

Returned for unexpected errors. Do not leak stack traces or internal details in production.

```http
HTTP 500 Internal Server Error

{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## 7. Pagination

All collection endpoints support **offset pagination** via query parameters.

| Parameter | Type | Default | Max |
|---|---|---|---|
| `page` | integer ≥ 1 | 1 | — |
| `pageSize` | integer 1–100 | 20 | 100 |

Example:

```
GET /api/v1/incidents?page=2&pageSize=20
```

Response always includes the `pagination` object (see §5).

---

## 8. Filtering

Filters are expressed as query parameters.

```
GET /api/v1/incidents?status=NEW&severity=HIGH&siteId=abc123
```

Rules:
- Filter parameters are validated server-side (unknown parameters return `400 VALIDATION_ERROR`).
- All active filters are ANDed together.
- Filtering is always within the authenticated organization's scope.

---

## 9. Request Validation

- Validation runs before the service layer, in the router or dedicated middleware.
- Preferred library: **Zod** (confirmed at implementation time).
- All request inputs (body, query, params) are validated against a schema.
- Invalid inputs return `400 VALIDATION_ERROR` with a `details` array.
- The service layer trusts that its inputs are valid; it must not repeat schema validation.

---

## 10. Error Code Reference

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Schema or business-rule validation failed |
| `UNAUTHENTICATED` | 401 | No valid session or token |
| `FORBIDDEN` | 403 | Authenticated but not authorized |
| `NOT_FOUND` | 404 | Resource not found or out of scope |
| `CONFLICT` | 409 | Duplicate or conflicting resource |
| `INVALID_STATE_TRANSITION` | 409 | State machine violation |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

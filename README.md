# Incident Reporting & Tracking Platform

A modular monolith for reporting and tracking workplace incidents.

**Stack:** React + TypeScript → Node.js + Express → Prisma → PostgreSQL

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 |
| pnpm | ≥ 9 |

Install pnpm if you don't have it:

```bash
npm install -g pnpm
```

---

## Installation

```bash
# Clone the repository
git clone https://github.com/yannx8/Incident-Reporting-and-Tracking-Platform.git
cd Incident-Reporting-and-Tracking-Platform

# Install all dependencies (frontend + backend)
pnpm install
```

---

## Environment Setup

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your local values
# (DATABASE_URL is commented out — not needed until the database sprint)
```

---

## Development

Start the backend server (port 3000):

```bash
pnpm dev:backend
```

Start the frontend dev server (port 5173):

```bash
pnpm dev:frontend
```

The frontend proxies `/api` requests to the backend automatically.

---

## Commands

### Lint

```bash
pnpm lint          # Check for lint errors
pnpm lint:fix      # Auto-fix lint errors
```

### Format

```bash
pnpm format        # Format all source files
pnpm format:check  # Check formatting without writing
```

### Type Check

```bash
pnpm typecheck     # Run tsc --noEmit across all packages
```

### Test

```bash
pnpm test          # Run all tests
```

### Build

```bash
pnpm build         # Production builds for all packages
```

---

## Project Structure

```
.
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions CI (PRs to main)
├── packages/
│   ├── backend/            # Node.js + Express + TypeScript
│   │   └── src/
│   │       ├── app.ts      # Express app (no server.listen)
│   │       ├── server.ts   # Entry point
│   │       └── routes/
│   │           └── health.ts
│   └── frontend/           # React + TypeScript + Vite
│       └── src/
│           ├── main.tsx
│           └── App.tsx
├── .env.example            # Safe environment template
├── .eslintrc.json          # Shared ESLint config
├── .prettierrc             # Prettier config
├── tsconfig.base.json      # Shared TypeScript base config
├── package.json            # Workspace root + shared scripts
└── pnpm-workspace.yaml
```

---

## CI

GitHub Actions CI runs automatically on all pull requests to `main`.

Pipeline: **install → lint → typecheck → test → build**

Status is visible on each pull request.

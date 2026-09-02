# Incident Reporting & Tracking Platform

A secure, multi-tenant modular monolith for reporting, tracking, and managing workplace safety and operational incidents.

**Stack:** React + TypeScript + Vite → Node.js + Express + TypeScript → Prisma ORM → PostgreSQL

---

## Key Highlights & Architecture

- **Multi-Tenant Data Isolation:** Composite foreign keys `(id, organizationId)` enforce strict tenant boundaries directly at the PostgreSQL schema level, preventing cross-tenant leakage.
- **Organization-Scoped Authorization:** Context-aware RBAC engine supporting `ADMINISTRATOR`, `RESPONSABLE`, and `USER` roles with site-scoping and status-driven mutation guards.
- **Immutable Audit Trail:** Dedicated `AuditEvent` logging tracking actor, incident lifecycle changes, actions, and timestamped state diffs for compliance.
- **Modular Monolith Workspace:** pnpm monorepo containing decoupled `backend` and `frontend` packages sharing unified linting, formatting, and TypeScript configurations.

---

## Prerequisites

| Tool | Required Version | Purpose |
|------|------------------|---------|
| **Node.js** | ≥ 20.0.0 | JavaScript runtime |
| **pnpm** | ≥ 9.0.0 | Package manager & monorepo workspace |
| **PostgreSQL** | ≥ 15 | Relational database (local instance or Docker) |

Install pnpm globally if you don't already have it:

```bash
npm install -g pnpm
```

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/yannx8/Incident-Reporting-and-Tracking-Platform.git
cd Incident-Reporting-and-Tracking-Platform
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Environment configuration

Copy the template environment file:

```bash
# On Linux/macOS
cp .env.example .env

# On Windows PowerShell
Copy-Item .env.example .env
```

Ensure your `.env` contains valid connection settings for your local PostgreSQL instance:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/incident_db"
```

### 4. Database initialization

Generate the Prisma client and apply database migrations:

```bash
# Generate Prisma Client types
pnpm --filter backend prisma:generate

# Apply migrations to your local database
pnpm --filter backend prisma:migrate:dev
```

---

## Development

Start both servers concurrently in separate terminals:

### Backend server (Express API on port `3000`):

```bash
pnpm dev:backend
```

- Health check endpoint: `GET http://localhost:3000/health`

### Frontend dev server (Vite on port `5173`):

```bash
pnpm dev:frontend
```

The frontend automatically proxies `/api` requests to the backend at `http://localhost:3000`.

---

## Workspace Commands

### Development

| Command | Description |
|---------|-------------|
| `pnpm dev:backend` | Starts backend development server with hot-reload via `tsx watch` |
| `pnpm dev:frontend` | Starts Vite React frontend development server |

### Code Quality & Testing

| Command | Description |
|---------|-------------|
| `pnpm lint` | Runs ESLint across all TypeScript packages (`--max-warnings 0`) |
| `pnpm lint:fix` | Automatically fixes ESLint warnings and errors |
| `pnpm format` | Formats all files (`.ts`, `.tsx`, `.json`, `.md`) with Prettier |
| `pnpm format:check` | Checks formatting without modifying files |
| `pnpm typecheck` | Runs `tsc --noEmit` across all workspace packages |
| `pnpm test` | Runs Vitest unit and integration test suites across packages |
| `pnpm build` | Compiles production builds for both backend and frontend |

### Database & Prisma (`packages/backend`)

| Command | Description |
|---------|-------------|
| `pnpm --filter backend prisma:generate` | Generates the Prisma Client based on `schema.prisma` |
| `pnpm --filter backend prisma:migrate:dev` | Runs database migrations in development mode |
| `pnpm --filter backend prisma:migrate:deploy` | Applies pending migrations in production or CI environments |
| `pnpm --filter backend prisma:validate` | Validates Prisma schema syntax and relation constraints |
| `pnpm --filter backend prisma:format` | Formats the Prisma schema file |

---

## Project Structure

```
.
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI pipeline
├── docs/
│   └── database-domain-model.md # Authoritative domain model, ERD & tenant security reference
├── packages/
│   ├── backend/               # Node.js + Express + TypeScript API
│   │   ├── prisma/
│   │   │   └── schema.prisma  # PostgreSQL schema with composite FK tenant enforcement
│   │   └── src/
│   │       ├── app.ts         # Express application configuration
│   │       ├── server.ts      # HTTP server entry point
│   │       ├── authz/         # Organization-scoped authorization & RBAC guards
│   │       ├── routes/        # API route handlers
│   │       └── __tests__/     # Vitest unit & integration tests
│   └── frontend/              # React 18 + TypeScript + Vite UI
│       └── src/
│           ├── App.tsx        # Root React component
│           └── main.tsx       # React DOM entry point
├── .env.example               # Environment variables template
├── .eslintrc.json             # Shared ESLint configuration
├── .prettierrc                # Prettier code formatting rules
├── tsconfig.base.json         # Base TypeScript configuration
├── package.json               # Root monorepo scripts & dependencies
└── pnpm-workspace.yaml        # pnpm workspace definition
```

---

## Documentation

- **[Database Domain Model](docs/database-domain-model.md):** Complete technical specifications, Entity-Relationship Diagram (ERD), composite foreign key tenant isolation mechanics, and authorization matrix.

---

## Continuous Integration (CI)

GitHub Actions automatically executes on all pull requests targeting the `main` branch:

$$\text{install} \longrightarrow \text{lint} \longrightarrow \text{typecheck} \longrightarrow \text{test} \longrightarrow \text{build}$$

Build status and test results are reported on each PR.

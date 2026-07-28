# Reliable Kanban Board

A production-deployed Kanban application demonstrating authenticated data access, optimistic UI, rollback, concurrency control, relational persistence, and automated testing.

## Live demo

- Web: https://kanban-board-psi-taupe.vercel.app
- API health: https://kanban-board-api-xdda.onrender.com/health
- Repository: https://github.com/Dmitrii-Lobanov/kanban-board
- [Related Medium article](https://medium.com/@dmitriilobanov3/frontend-system-design-in-practice-building-a-reliable-kanban-board-in-react-9dc9f488a69f)

The API runs on Render's free tier, so its first request after inactivity may take several seconds.

## What it demonstrates

- Clerk sign-up, sign-in, and protected API requests
- User-scoped workspaces and boards
- Create, edit, move, assign, prioritize, and delete tasks
- Optimistic updates with rollback and inline failure states
- Version-based conflict detection for concurrent mutations
- Stable column keys across the database and API boundary
- PostgreSQL persistence through Prisma migrations
- Shared TypeScript API contracts
- Unit, component, API integration, and database integration tests
- GitHub Actions CI and separate frontend/API deployments

## Architecture

```text
Browser
  |
  | Clerk session token
  v
React + Vite (Vercel)
  |
  | authenticated REST requests
  v
NestJS + Fastify (Render)
  |
  | Prisma
  v
PostgreSQL (Render)
```

The monorepo is organized as follows:

```text
apps/
  api/                  NestJS API, Prisma schema, migrations, tests
  web/                  React application and component tests
packages/
  contracts/            Shared request and response contracts
docs/                    Implementation notes and roadmap
```

The backend owns persistence models and maps Prisma values to an explicit API contract:

| Prisma        | API           |
| ------------- | ------------- |
| `TODO`        | `todo`        |
| `IN_PROGRESS` | `in-progress` |
| `DONE`        | `done`        |

The frontend uses these stable keys for behavior and treats column titles as display-only content.

## Tech stack

| Area           | Technology                                              |
| -------------- | ------------------------------------------------------- |
| Frontend       | React 19, TypeScript, Vite, TanStack Query, CSS Modules |
| Backend        | NestJS, Fastify, TypeScript                             |
| Data           | PostgreSQL, Prisma                                      |
| Authentication | Clerk                                                   |
| Testing        | Jest, Vitest, React Testing Library                     |
| Delivery       | GitHub Actions, Vercel, Render, Docker Compose          |

## Run locally

### Prerequisites

- Node.js 22+
- Docker with Docker Compose
- A Clerk application

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example files and replace the Clerk placeholders with values from your Clerk application:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

The API requires:

```dotenv
DATABASE_URL="postgresql://kanban:kanban@localhost:5433/kanban?schema=public"
CLERK_SECRET_KEY="your_clerk_secret_key"
CLERK_AUTHORIZED_PARTIES="http://localhost:5173"
```

The web application requires:

```dotenv
VITE_API_URL="http://localhost:3000"
VITE_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
```

Never commit real secret keys. Vite variables are included in the browser bundle, so only the Clerk publishable key belongs in `VITE_*` configuration.

### 3. Start PostgreSQL and apply migrations

```bash
docker compose up -d postgres
npm exec --workspace @kanban-board/api -- prisma migrate deploy
npm exec --workspace @kanban-board/api -- prisma generate
```

`prisma migrate deploy` applies existing migrations without creating or resetting data.

### 4. Start the API and web application

Run these in separate terminals:

```bash
npm run start:dev --workspace @kanban-board/api
```

```bash
npm run dev:web
```

Open http://localhost:5173. The API health endpoint is available at http://localhost:3000/health.

## Verification

Run the standard local quality gate:

```bash
npm run check
```

It checks formatting and linting, runs API and frontend tests, and builds the web application. Build every workspace with:

```bash
npm run build
```

### PostgreSQL integration tests

Database integration tests use an isolated, ephemeral `kanban_test` database on port `5434`. The test setup refuses to run against another database name.

```bash
docker compose --profile test up -d --wait postgres-test
DATABASE_URL='postgresql://kanban:kanban@localhost:5434/kanban_test?schema=public' npm exec --workspace @kanban-board/api -- prisma migrate deploy
TEST_DATABASE_URL='postgresql://kanban:kanban@localhost:5434/kanban_test?schema=public' npm run test:integration
```

## Reliability decisions

- **Optimistic mutations:** the UI updates immediately, then confirms or rolls back based on the API response.
- **Per-task mutation state:** independent task operations do not unnecessarily block the entire board.
- **Optimistic concurrency:** task versions prevent stale clients from silently overwriting newer changes.
- **Authorization at the service boundary:** authenticated users only receive and mutate data available through their workspace membership.
- **Explicit API mapping:** persistence enums and database records do not leak directly into frontend behavior.
- **Isolated database tests:** integration tests run against a dedicated database and are included in CI.

## Deployment

- The React application is built and hosted by Vercel.
- The NestJS API and PostgreSQL database are hosted by Render.
- Render applies committed Prisma migrations when the service starts.
- Production origins are explicitly allowed by both CORS and Clerk token verification.

Deployment secrets are configured in the hosting dashboards and are not stored in this repository.

## Further improvements

- Browser-level Playwright tests for the authenticated production flow
- Responsive and accessibility audit
- Structured production logging and error monitoring
- Board management and workspace invitations

## License

MIT

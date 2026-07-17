# Kanban Board --- Full-Stack Implementation Roadmap

> Goal: evolve the current frontend-focused Kanban Board into a
> production-quality full-stack portfolio project demonstrating frontend
> architecture, backend engineering, authentication, testing, and
> deployment.

------------------------------------------------------------------------

# Vision

The project should demonstrate:

-   Production-oriented frontend architecture
-   Real backend with persistent storage
-   Authentication and authorization
-   Optimistic updates with server persistence
-   Version-based concurrency control
-   Comprehensive testing strategy
-   CI/CD
-   Production deployment

------------------------------------------------------------------------

# Tech Stack

## Frontend

-   React 19
-   TypeScript
-   Vite
-   TanStack Query
-   React Router
-   Storybook
-   Playwright
-   Vitest
-   React Testing Library
-   MSW

## Backend

-   Node.js
-   NestJS (Fastify adapter)
-   Prisma
-   PostgreSQL
-   Swagger/OpenAPI
-   Docker

## Shared

-   npm Workspaces
-   Shared DTOs / Zod schemas
-   GitHub Actions

------------------------------------------------------------------------

# Repository Structure

``` text
kanban-board/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   └── contracts/
├── prisma/
├── docker-compose.yml
└── package.json
```

------------------------------------------------------------------------

# Database Model

-   User
-   Session
-   Workspace
-   WorkspaceMember
-   Board
-   Column
-   Task

Task should contain:

-   position
-   assigneeId
-   version
-   timestamps

------------------------------------------------------------------------

# Phase 1 --- Monorepo

## Tasks

-   Convert to npm workspaces
-   Move frontend into apps/web
-   Create NestJS backend
-   Create shared contracts package
-   Verify existing tests

Deliverable:

-   Existing application works without behavioral changes.

------------------------------------------------------------------------

# Phase 2 --- Database

## Tasks

-   Configure PostgreSQL
-   Configure Prisma
-   Initial migration
-   Seed database
-   Health endpoint

Deliverable:

-   API connected to PostgreSQL.

------------------------------------------------------------------------

# Phase 3 --- REST API

Modules:

-   Auth
-   Boards
-   Columns
-   Tasks
-   Users

Endpoints:

-   Auth
-   Boards CRUD
-   Columns CRUD
-   Tasks CRUD
-   Move task endpoint

Deliverable:

-   Frontend data comes from backend.

------------------------------------------------------------------------

# Phase 4 --- Frontend Integration

## Tasks

-   Add TanStack Query
-   Replace mocked API
-   Preserve optimistic updates
-   Preserve rollback
-   Preserve per-task loading
-   Loading & error states

Deliverable:

-   Refresh persists data.

------------------------------------------------------------------------

# Phase 5 --- Authentication

Implement:

-   Register
-   Login
-   Logout
-   Refresh tokens
-   Auth guard
-   Protected routes

Security:

-   HttpOnly refresh cookie
-   Access token in memory
-   Argon2 password hashing

Deliverable:

-   User-specific boards.

------------------------------------------------------------------------

# Phase 6 --- Board Features

Implement:

-   Create board
-   Rename board
-   Delete board
-   Create column
-   Rename column
-   Delete column
-   Create task
-   Edit task
-   Delete task
-   Assign users
-   Reorder tasks

------------------------------------------------------------------------

# Phase 7 --- Concurrency

Implement optimistic concurrency.

Every task contains a version field.

On stale updates:

-   Return HTTP 409
-   Rollback UI
-   Refetch data
-   Notify user

------------------------------------------------------------------------

# Phase 8 --- Authorization

Roles:

-   Owner
-   Member
-   Viewer

Permissions enforced on backend and reflected in UI.

------------------------------------------------------------------------

# Phase 9 --- Storybook

Stories:

-   TaskCard
-   Column
-   Board
-   Login
-   Registration
-   Error states
-   Loading states
-   Permission states

Include:

-   MSW
-   Interaction tests
-   Accessibility checks

------------------------------------------------------------------------

# Phase 10 --- Playwright

Critical scenarios:

1.  Register
2.  Login
3.  Create board
4.  Create task
5.  Move task
6.  Reload
7.  Search
8.  Filter
9.  Logout
10. Permission checks
11. Conflict handling

------------------------------------------------------------------------

# Phase 11 --- Backend Tests

Unit:

-   Services
-   Guards
-   Utilities

Integration:

-   Auth
-   Board
-   Task movement
-   Permissions

------------------------------------------------------------------------

# Phase 12 --- CI/CD

Pipeline:

-   Format
-   Lint
-   Type check
-   Unit tests
-   Integration tests
-   Storybook build
-   Playwright
-   Production build

------------------------------------------------------------------------

# Phase 13 --- Deployment

Frontend:

-   Vercel

Backend:

-   Railway or Render

Database:

-   PostgreSQL

Documentation:

-   Swagger
-   Architecture diagrams
-   Demo account

------------------------------------------------------------------------

# Milestones

## Milestone 1

Persistent Kanban

## Milestone 2

Authentication

## Milestone 3

Complete board management

## Milestone 4

Production reliability

## Milestone 5

Portfolio polish

------------------------------------------------------------------------

# Future Enhancements

-   WebSockets
-   Offline mode
-   Telemetry
-   Monitoring
-   Activity log
-   Comments
-   Attachments
-   Notifications
-   Audit history

------------------------------------------------------------------------

# Recommended Next Step

Build the first vertical slice:

1.  PostgreSQL
2.  Prisma
3.  GET board endpoint
4.  PATCH task position endpoint
5.  Connect frontend
6.  Verify optimistic updates still work

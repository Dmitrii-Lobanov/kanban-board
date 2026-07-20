# Reliable Kanban Board

> A production-oriented Kanban application built with React, TypeScript, NestJS, and PostgreSQL, demonstrating frontend architecture, optimistic UI, backend engineering, authentication, concurrency control, and production-grade testing.

This project accompanies the Medium article **Designing and Implementing a Reliable Kanban Board in React: Optimistic Updates, Concurrency, and State Modeling**.

The repository started as a frontend architecture case study and is now evolving into a complete full-stack application following a documented implementation roadmap. The goal is not to build another CRUD demo, but to showcase engineering decisions behind a production-ready collaborative application.

---

## 🚀 Live Demo

https://kanban-board-psi-taupe.vercel.app/

> Currently demonstrates the frontend implementation. The backend integration is under active development.

## 💻 GitHub Repository

https://github.com/Dmitrii-Lobanov/kanban-board

## 📝 Medium Article

https://medium.com/@dmitriilobanov3/frontend-system-design-in-practice-building-a-reliable-kanban-board-in-react-9dc9f488a69f

---

# Current Status

The project is being implemented incrementally.

✅ React frontend

✅ Optimistic updates

✅ Rollback

✅ Per-task concurrency

✅ Accessibility

✅ Unit & integration tests

✅ GitHub Actions

✅ npm workspaces

🚧 NestJS backend

🚧 PostgreSQL

🚧 Prisma

🚧 Authentication

🚧 Storybook

🚧 Playwright

---

# Project Structure

```text
kanban-board/
│
├── apps/
│   ├── web/                 React application
│   └── api/                 NestJS API (coming next)
│
├── packages/
│   └── contracts/           Shared DTOs and schemas
│
├── docs/
│   └── KANBAN_IMPLEMENTATION_PLAN.md
│
├── package.json
└── tsconfig.json
```

---

# Why this project?

Most Kanban tutorials demonstrate drag-and-drop.

Real production applications require significantly more engineering:

- optimistic UI
- rollback
- concurrent mutations
- backend consistency
- authentication
- authorization
- conflict detection
- maintainable architecture
- reliable testing
- deployment

This repository documents the implementation of those concerns step by step.

---

# Frontend Features

- ✅ Optimistic UI updates
- ✅ Automatic rollback
- ✅ Per-task pending state
- ✅ Concurrent mutations
- ✅ Native HTML Drag & Drop
- ✅ Accessible keyboard movement
- ✅ Search
- ✅ Filtering
- ✅ Derived state
- ✅ Inline task errors
- ✅ Unit tests
- ✅ Integration tests

---

# Full-Stack Roadmap

The repository is being expanded into a production-oriented architecture.

## Phase 1

- npm workspaces
- monorepo
- frontend migration

## Phase 2

- PostgreSQL
- Prisma
- database schema

## Phase 3

- NestJS REST API

## Phase 4

- Real persistence

## Phase 5

- Authentication

## Phase 6

- Board management

## Phase 7

- Optimistic concurrency

## Phase 8

- Authorization

## Phase 9

- Storybook

## Phase 10

- Playwright

---

# Frontend Architecture

```text
apps/web/src
│
├── api
├── components
├── domain
├── hooks
├── data
└── test
```

Presentation, business logic, asynchronous mutations, and state transformations are separated to keep the application predictable and maintainable.

---

# State Model

Instead of storing multiple collections, the application keeps a single task collection and derives every UI representation.

| State | Purpose |
|--------|----------|
| confirmedTasks | Server-confirmed state |
| optimisticTasks | Temporary optimistic UI |
| pendingTaskIds | Per-task loading |
| taskErrors | Inline errors |
| searchQuery | Search |
| assigneeFilter | Filtering |

---

# Optimistic Update Flow

```text
User action
      │
      ▼
Optimistic update
      │
      ▼
REST request
      │
 ┌────┴────┐
 │         │
 ▼         ▼
Success  Failure
 │         │
 ▼         ▼
Persist  Rollback
            │
            ▼
     Inline error
```

---

# Tech Stack

## Frontend

- React 19
- TypeScript
- Vite
- CSS Modules
- Vitest
- React Testing Library

## Backend (in progress)

- NestJS
- Fastify
- Prisma
- PostgreSQL

## Tooling

- npm Workspaces
- ESLint
- Prettier
- GitHub Actions

---

# Running Locally

Install dependencies

```bash
npm install
```

Start the frontend

```bash
npm run dev:web
```

Build

```bash
npm run build:web
```

Run tests

```bash
npm run test:run
```

Run the complete validation pipeline

```bash
npm run check
```

---

# Current CI

Every push runs:

- formatting
- linting
- tests
- production build

GitHub Actions will later be extended with backend integration tests and Playwright.

---

# Upcoming Features

- Authentication
- PostgreSQL persistence
- Prisma
- Board sharing
- Role-based permissions
- Optimistic concurrency
- Storybook
- Playwright
- Docker
- Deployment

---

# Documentation

- `docs/KANBAN_IMPLEMENTATION_PLAN.md` — complete implementation roadmap
- Medium article (coming soon)

---

# License

MIT
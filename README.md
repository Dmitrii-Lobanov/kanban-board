# Reliable Kanban Board

> A production-minded Kanban board built with **React 19** and **TypeScript** demonstrating optimistic updates, rollback, per-task concurrency, derived state, accessibility, and clean frontend architecture.

This project accompanies the Medium article **Designing and Implementing a Reliable Kanban Board in React: Optimistic Updates, Concurrency, and State Modeling**. Rather than focusing on drag-and-drop alone, it explores the engineering challenges involved in building a reliable interactive application: optimistic UI, concurrent mutations, rollback, state consistency, and maintainable frontend architecture.

---

## 🚀 Live Demo

**https://kanban-board-psi-taupe.vercel.app/**

## 💻 GitHub Repository

**https://github.com/Dmitrii-Lobanov/kanban-board**

## 📝 Medium Article

Coming soon.

---

# Preview

> ![alt text](/src/assets/image.png)

---

# Why this project?

Most Kanban tutorials demonstrate how to move cards between columns.

Real production applications are considerably more complex.

A reliable Kanban board must answer questions like:

- How should the UI respond before the server confirms a change?
- How should optimistic updates be rolled back?
- How can multiple tasks be updated concurrently?
- How should failures be communicated without affecting unrelated tasks?
- How can filtering remain consistent while optimistic updates are in progress?
- How can drag-and-drop and button interactions share the same business logic?

This project demonstrates one possible production-oriented solution to these problems.

---

# Features

- ✅ Optimistic UI updates
- ✅ Automatic rollback after failed requests
- ✅ Per-task pending state
- ✅ Concurrent task updates
- ✅ Native HTML Drag and Drop
- ✅ Accessible button-based movement
- ✅ Search by title
- ✅ Filter by assignee
- ✅ Combined search and filtering
- ✅ Single source of truth
- ✅ Derived task groups
- ✅ Inline task-level error handling
- ✅ Accessible loading feedback
- ✅ TypeScript throughout
- ✅ Unit tests
- ✅ Integration tests
- ✅ GitHub Actions CI

---

# Architecture

```text
src
│
├── api
│   └── tasks.ts
│
├── components
│   ├── KanbanBoard
│   ├── KanbanBoardColumn
│   ├── TaskCard
│   └── TaskFilters
│
├── hooks
│   └── useTaskStatusMutation
│
├── domain
│   ├── task.ts
│   └── taskUtils.ts
│
├── data
│   └── initialTasks.ts
│
└── test
```

The application separates presentation, business logic, asynchronous mutations, and pure state transformations.

---

# State Model

Instead of maintaining multiple task collections, the application stores a single task array and derives every UI representation from it.

| State             | Purpose                     |
| ----------------- | --------------------------- |
| `confirmedTasks`  | Last server-confirmed state |
| `optimisticTasks` | Temporary optimistic UI     |
| `pendingTaskIds`  | Per-task loading state      |
| `taskErrors`      | Inline mutation errors      |
| `searchQuery`     | Title search                |
| `assigneeFilter`  | Assignee filtering          |

This separation keeps the UI predictable while supporting optimistic updates and concurrent mutations.

---

# Optimistic Update Flow

```text
User moves a task
        │
        ▼
Optimistic update
        │
        ▼
API request
        │
 ┌──────┴─────────┐
 │                │
 ▼                ▼
Success        Failure
 │                │
 ▼                ▼
Persist      Roll back
state            │
                 ▼
          Show inline error
```

---

# Key Engineering Decisions

### Single Source of Truth

The application stores one collection of tasks.

Columns, filtered views, and visible task groups are derived rather than stored separately, avoiding synchronization issues and duplicated state.

---

### Optimistic Updates

The UI updates immediately using React's `useOptimistic`.

Only after the asynchronous request succeeds is the confirmed state updated.

If the request fails, the optimistic state automatically rolls back.

---

### Per-Task Concurrency

Instead of using a global loading flag, the application tracks pending operations with a `Set<string>` of task IDs.

This allows:

- multiple tasks to update simultaneously
- only affected tasks to become disabled
- duplicate updates for the same task to be prevented

---

### Shared Mutation Pipeline

Button-based movement and drag-and-drop both delegate to the same mutation handler.

All validation, optimistic updates, rollback, and error handling therefore exist in a single place.

---

### Derived Views

Filtering happens before task grouping.

```
tasks
   │
   ▼
filtered tasks
   │
   ▼
grouped by status
   │
   ▼
rendered columns
```

No duplicated state is required.

---

# Tech Stack

- React 19
- TypeScript
- Vite
- CSS Modules
- React Hooks
- useOptimistic
- useTransition
- Vitest
- React Testing Library
- ESLint
- Prettier
- GitHub Actions

---

# Running Locally

Install dependencies

```bash
npm install
```

Start the development server

```bash
npm run dev
```

---

# Available Scripts

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run build
```

Creates a production build.

```bash
npm run preview
```

Runs the production build locally.

```bash
npm run lint
```

Runs ESLint.

```bash
npm run lint:fix
```

Automatically fixes lint issues.

```bash
npm run format
```

Formats the project with Prettier.

```bash
npm run format:check
```

Checks formatting.

```bash
npm run test
```

Runs tests in watch mode.

```bash
npm run test:run
```

Runs all tests once.

```bash
npm run check
```

Runs the complete validation pipeline:

- formatting
- linting
- tests
- production build

---

# Testing Strategy

## Unit Tests

- immutable task updates
- filtering
- grouping
- derived state

## Integration Tests

- optimistic updates
- rollback after failure
- per-task pending state
- concurrent mutations
- search
- assignee filtering
- inline errors
- drag-and-drop interactions

---

# Accessibility

The implementation includes:

- semantic landmarks
- keyboard-accessible task movement
- `aria-live` loading announcements
- `role="alert"` for task errors
- `aria-busy`
- semantic headings
- button-based movement as an accessible alternative to native drag-and-drop

---

# Future Improvements

The current implementation intentionally focuses on frontend architecture.

Potential production enhancements include:

- task ordering within columns
- server-side persistence
- request versioning
- retry support
- request cancellation
- WebSocket synchronization
- conflict resolution
- role-based permissions
- virtualization
- offline support
- caching
- telemetry
- monitoring

---

# CI

Every push and pull request automatically runs:

- Prettier
- ESLint
- Unit tests
- Integration tests
- Production build

using GitHub Actions.

---

# Related Resources

- 🚀 Live Demo: https://kanban-board-psi-taupe.vercel.app/
- 💻 GitHub Repository: https://github.com/Dmitrii-Lobanov/kanban-board
- 📝 Medium Article: Coming soon.

---

# License

MIT

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup          # Install deps + generate Prisma client + run migrations
npm run dev            # Start dev server (Next.js 15 + Turbopack, port 3000)
npm run build          # Production build
npm run lint           # ESLint
npm run test           # Run all tests (Vitest)
npx vitest run src/lib/__tests__/file-system.test.ts   # Run a single test file
npm run db:reset       # Reset database (prisma migrate reset --force)
```

All npm scripts prepend `NODE_OPTIONS='--require ./node-compat.cjs'` to fix Node 25's experimental Web Storage API breaking SSR.

## Architecture

**UIGen** is an AI-powered React component generator with a three-panel IDE layout: Chat (left 35%) | Preview + Code Editor (right 65%).

### Stack

- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4
- Prisma + SQLite (`prisma/dev.db`), Vercel AI SDK, `@ai-sdk/anthropic`
- shadcn/ui (Radix primitives), Monaco editor, `@babel/standalone` for live preview

### Path alias

`@/*` maps to `src/*` throughout the codebase.

### Server/Client split

- **Server Components** (`src/app/page.tsx`, `src/app/[projectId]/page.tsx`): Auth checks, data fetching, redirects.
- **Server Actions** (`src/actions/`): Auth (signUp/signIn/signOut), project CRUD. All use `getSession()`.
- **Client Components** (`src/app/main-content.tsx`): Wraps UI in two React context providers — `FileSystemProvider` and `ChatProvider`.

### Routes

- `/` — Landing. Redirects authenticated users to their latest project; renders anonymous editor otherwise.
- `/[projectId]` — Project page. Requires auth.
- `POST /api/chat` — AI streaming endpoint (intentionally unprotected to allow anonymous use).

### AI Chat Flow

1. Client `ChatProvider` (`useChat` from `@ai-sdk/react`) sends `{ messages, files, projectId }` to `/api/chat`.
2. Server reconstructs `VirtualFileSystem` from serialized files, prepends system prompt with Anthropic cache control.
3. `streamText` calls Claude with two tools: `str_replace_editor` and `file_manager` (up to 40 tool steps).
4. Client-side `onToolCall` in `FileSystemContext` mirrors mutations on the client VFS for real-time UI updates.
5. On finish, if authenticated, messages and file system state are saved to DB as JSON on `Project`.

### Model selection (`src/lib/provider.ts`)

- With `ANTHROPIC_API_KEY`: uses `claude-haiku-4-5`.
- Without: uses `MockLanguageModel` that generates hardcoded components (Counter/Form/Card).

### Virtual File System (`src/lib/file-system.ts`)

In-memory tree (`VirtualFileSystem` class) with flat `Map<string, FileNode>` index. No disk I/O. Serialized as JSON in `Project.data`. Round-trips: DB → client → server (per chat request) → DB.

### Auth (`src/lib/auth.ts`)

Stateless JWT via `jose`. 7-day expiry, HS256, stored in `httpOnly` cookie `auth-token`. Passwords hashed with `bcrypt` (10 rounds). Anonymous users' work is tracked in `sessionStorage` (`src/lib/anon-work-tracker.ts`) and migrated on sign-up.

### Preview (`src/components/preview/PreviewFrame.tsx`)

Babel transforms JSX → browser-ready JS with import maps pointing to `esm.sh` (React 19 + Tailwind CDN). Rendered in an iframe via `srcdoc`.

### AI Tools (`src/lib/tools/`)

- `str_replace_editor`: view, create, str_replace, insert operations on VFS files.
- `file_manager`: rename, delete operations. Uses Vercel AI SDK `tool()` helper.

## Code Style

- Use comments sparingly. Only comment complex code.

## Testing

- Vitest + `@testing-library/react` + `jsdom` + `@testing-library/user-event`
- Tests are co-located in `__tests__/` folders next to source files
- Heavy use of `vi.mock()` for isolation; `renderHook` with wrapper for context tests
- No snapshot testing

## Database

SQLite via Prisma. Two models: `User` and `Project`. File system and chat messages stored as JSON strings on `Project` (no separate tables). Always reference `prisma/schema.prisma` for the current data structure before working with database models. Generated client output at `src/generated/prisma`.

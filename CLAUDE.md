# Parsed — Project Rules

## What is Parsed

AI-powered document chat tool. Upload PDF, DOCX, TXT, or Markdown files — ask anything about them.
Parsed extracts text, embeds it into Pinecone, and uses Claude to answer questions with source citations.

**Tagline:** Upload any document. Ask anything.

---

## Key Documents

| Document | Path |
|---|---|
| Product Spec | `docs/product-spec.md` |
| App Implementation | `docs/app-implementation.md` |
| Tech Stack | `docs/tech-stack.md` |
| MCP Setup | `docs/mcp-setup.md` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (new-york, neutral, CSS variables) |
| Auth | Better Auth |
| Database | PostgreSQL via Neon + Drizzle ORM |
| File Storage | Vercel Blob |
| Vector DB | Pinecone (index: `parsed`, 1536 dims, cosine) |
| Embeddings | OpenAI `text-embedding-3-small` |
| LLM | Anthropic Claude 3.5 Sonnet |
| AI Streaming | Vercel AI SDK |
| Package Manager | npm |
| Deployment | Vercel |

---

## Folder Structure

```
src/
├── app/
│   ├── (auth)/                          # Auth pages (login, register)
│   ├── (app)/
│   │   ├── layout.tsx                   # App shell with sidebar
│   │   ├── page.tsx                     # Dashboard
│   │   ├── folders/[id]/page.tsx        # Folder view
│   │   ├── files/[id]/page.tsx          # File view + chat panel
│   │   └── chat/page.tsx                # Multi-file chat
│   └── api/
│       ├── auth/[...all]/route.ts       # Better Auth handler
│       ├── folders/route.ts             # GET list, POST create
│       ├── folders/[id]/route.ts        # GET, PUT, DELETE
│       ├── files/route.ts               # GET list, POST upload
│       ├── files/[id]/route.ts          # GET, DELETE
│       ├── files/[id]/process/route.ts  # POST re-embed
│       └── chat/route.ts                # POST streaming RAG
│
├── components/
│   ├── ui/                              # shadcn auto-generated — never edit manually
│   ├── layout/                          # Sidebar, Header, AppShell, FolderTree
│   ├── folders/                         # FolderCard, FolderMoveModal
│   ├── files/                           # FileUploader, FileCard, FileViewer, FileList, TagInput
│   └── chat/                            # ChatPanel, ChatMessage, ChatScopeBar, SourceCard, ChatInput
│
├── lib/
│   ├── auth.ts                          # Better Auth server config
│   ├── auth-client.ts                   # Better Auth client
│   ├── database.ts                      # Drizzle client (Neon)
│   ├── utils.ts                         # cn() and helpers
│   ├── pinecone.ts                      # Pinecone client + upsert/delete helpers
│   ├── embeddings.ts                    # OpenAI embed function
│   ├── rag.ts                           # RAG pipeline — retrieve + generate
│   ├── chunker.ts                       # Text chunking (~500 tokens, 50 overlap)
│   ├── storage.ts                       # Vercel Blob upload/delete
│   └── parsers/
│       ├── index.ts                     # Router: picks parser by file type
│       ├── pdf.ts                       # pdf-parse wrapper
│       ├── docx.ts                      # mammoth wrapper
│       └── text.ts                      # TXT / MD reader
│
├── db/
│   ├── schema.ts                        # App schema barrel (folders, files, file_chunks)
│   └── auth-schema.ts                   # Better Auth generated — never edit manually
│
├── hooks/
│   ├── useFiles.ts
│   └── useChat.ts
│
├── providers/
│   └── QueryProvider.tsx                # TanStack Query provider
│
├── types/
│   ├── index.ts                         # Barrel export
│   └── *.types.ts                       # Domain types
│
└── middleware.ts                        # Auth route protection
```

---

## Database Schema

```
folders       — id, userId, name, parentId (self-ref FK, null = root), createdAt, updatedAt
files         — id, userId, folderId (null = root), name, type, size, blobUrl, status, tags[], createdAt, updatedAt
file_chunks   — id, fileId, chunkIndex, content, pineconeId
```

`status` values: `uploading` → `processing` → `ready` | `error`

Auth tables in `src/db/auth-schema.ts` (users, sessions, accounts, verifications) — managed by Better Auth, never edit manually.

Drizzle config: snake_case, schemas from `src/db/schema.ts` + `src/db/auth-schema.ts`, migrations in `./migrations`.

---

## Pinecone

Index: `parsed` — 768 dims, cosine metric, namespace per user (`userId`).

Vector metadata per chunk:
```
fileId, fileName, fileType, folderId, folderPath, chunkIndex, tags[], preview (first 200 chars)
```

---

## File Processing Pipeline

```
Upload → Vercel Blob → Extract text → Chunk → Embed → Pinecone upsert → status = ready
```

Parser routing by file type:
- `.pdf`  → `pdf-parse`
- `.docx` → `mammoth`
- `.txt`  → native read
- `.md`   → native read

Always check `file.status === "ready"` before allowing chat on a file.

---

## API Routes

```
GET  /api/files                → list files (?folderId=)
POST /api/files                → upload (multipart/form-data) + trigger processing
GET  /api/files/:id            → metadata + status
DEL  /api/files/:id            → delete file + Blob + Pinecone vectors
POST /api/files/:id/process    → re-trigger extraction + embedding

GET  /api/folders              → full folder tree for authed user
POST /api/folders              → create { name, parentId? }
PUT  /api/folders/:id          → rename { name }
DEL  /api/folders/:id          → { strategy: "move-to-root" | "delete-all" }

POST /api/chat                 → streaming RAG
                                 body: { query, fileIds?, folderId?, tags? }
                                 returns: SSE stream + sources[]
```

---

## Conventions

### Components
- Add shadcn components via CLI: `npx shadcn@latest add <component>`
- Never edit `src/components/ui/` manually
- Every component folder has an `index.ts` barrel re-exporting all named exports
- Import from barrel, never from the file directly:
  ```ts
  import { FileCard } from "@/components/files"          // correct
  import { FileCard } from "@/components/files/FileCard" // avoid
  ```
- Use `cn()` from `@/lib/utils` for all class merging — never string concatenation

### Drizzle ORM
- Schema files: `src/db/schemas/*.schema.ts` → re-exported from `src/db/schema.ts`
- Always export `$inferSelect` and `$inferInsert` types
- Migration workflow: edit schema → `npm run db:generate` → `npm run db:migrate`
- Casing: snake_case (configured in `drizzle.config.ts`)

### Better Auth
- Server: `src/lib/auth.ts` — Drizzle adapter
- Client: `src/lib/auth-client.ts` — `createAuthClient`
- API route: `src/app/api/auth/[...all]/route.ts`
- Auth tables always in `src/db/auth-schema.ts` — generated, not handwritten

### Database Connection
- `src/lib/database.ts` auto-detects Neon vs local Postgres by URL
- Neon URL (contains `neon.tech`) → `@neondatabase/serverless` HTTP driver
- Local URL → `postgres.js` with connection pooling

---

## Scripts

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # ESLint
npm run ts:check      # TypeScript check (no emit)
npm run db:generate   # Generate migration files from schema changes
npm run db:migrate    # Apply migrations to the database
# Never use db:push — always use generate + migrate
npm run db:studio     # Drizzle Studio
npm run auth:generate # Regenerate Better Auth schema
```

---

## Environment Variables

```bash
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
BLOB_READ_WRITE_TOKEN=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX_NAME=parsed
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## MCP — Context7

Context7 resolves up-to-date library docs on demand.
Config: `.mcp.json` (Claude Code) + `.cursor/mcp.json` (Cursor) — both at project root.

**Lookup order:**
1. Use existing knowledge if confident
2. Query Context7 if unsure about a library API or behavior
3. Web search only if Context7 does not resolve it

Do not web search for anything covered by the libraries listed below.

| Library | Context7 URL |
|---|---|
| Next.js | `https://context7.com/vercel/next.js` |
| Better Auth | `https://context7.com/better-auth/better-auth` |
| shadcn/ui | `https://context7.com/shadcn-ui/ui` |
| React | `https://context7.com/websites/react_dev` |
| Drizzle ORM | `https://context7.com/drizzle-team/drizzle-orm-docs` |
| Tailwind CSS | `https://context7.com/tailwindlabs/tailwindcss.com` |
| TanStack Query | `https://context7.com/websites/tanstack_query` |
| Zod | `https://context7.com/websites/zod_dev` |
| Vercel AI SDK | `https://context7.com/vercel/ai` |
| Pinecone | `https://context7.com/pinecone-io/pinecone-ts-client` |

---

## Modes

### Default Mode
Used unless explicitly told otherwise. All standard rules apply.

### Strict Mode
Activated when the user writes any of: `STRICT` `CRITICAL CHANGE` `REFACTOR CORE` `BUG INVESTIGATION MODE`

**Pre-change:**
- Grep ALL usages before modifying shared functions, components, types, or configs
- Trace the full execution path
- Identify upstream and downstream impact
- Verify framework behavior if not 100% certain

**During change:**
- Modify only what is necessary
- Maintain backward compatibility unless explicitly told to break it
- Match existing patterns exactly

**Post-change:**
- Verify all call sites still work
- Check for unused imports, dead references, broken dependencies
- If bulk edit, confirm old patterns no longer exist
- Show proof (grep results, logs, test output)

---

## Priority Order

When making decisions or trade-offs, apply in this order:

1. **Correctness** — does it work correctly?
2. **Root cause** — is the actual problem solved, not just the symptom?
3. **Minimal change surface** — fewest files and lines touched
4. **Codebase consistency** — matches existing patterns
5. **Performance** — only optimise when correctness is confirmed

---

## AI Rules

### Verification
- After any find-and-replace or bulk edit, grep for both old and new patterns to confirm all occurrences changed. Never report done without a verification search.
- After modifying code, check for unused imports, dead references, and broken dependencies.
- When fixing a bug, trace the full execution path before writing code. Do not assume how the framework calls your code — verify it.

### Communication
- No fluff. No emojis unless asked. Just answer.
- Do not explain what you're about to do — just do it. Narrate only when the user needs to make a decision.
- If the user is incorrect, correct them directly.
- When reporting changes, show proof (grep results, test output) not just claims.

### Research Priority (follow this order — do not skip steps)

1. **Use existing knowledge first.** If confident about the answer, just answer. Do not look anything up.
2. **Check Context7 second.** If unsure about a library API, signature, or behavior — query Context7 before anything else. Do not web search first.
3. **Web search last resort only.** Only if Context7 does not resolve the question. Do not default to web search.

Never run a search for something you already know. Every unnecessary lookup adds latency and token cost.

### Problem Solving
- Fix the root cause, not symptoms. If a fix fails on first try, stop and re-analyze before retrying.
- Before implementing, identify all locations that need changes (grep first, edit second). Partial fixes are worse than no fix.

### Code Quality
- Match existing code style, patterns, and conventions. Do not introduce new patterns unless explicitly asked.
- Prefer the simplest solution. No abstractions or utilities for one-time operations.
- Do not add comments, docstrings, or type annotations to code you didn't change.

### Workflow
- Read before edit. Always.
- One problem at a time. Do not bundle unrelated changes.
- Verify each step works before moving to the next.

### Interpreting User Intent
- Understand the intent, not just the literal words. If genuinely ambiguous, ask one clarifying question.
- If a request would break existing functionality, flag it before implementing.
- Do not silently add scope beyond what was asked. Mention it briefly and let the user decide.

### Protecting Existing Code
- Do not delete or rewrite code you don't fully understand. Read more context first.
- When touching a function, check who calls it. When touching a component, check who renders it.
- Grep for all usages before changing function signatures.

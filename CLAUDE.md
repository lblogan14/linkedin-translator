# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LLM-powered LinkedIn post translator with two directions:
- **Decode** — paste a LinkedIn post → plain-English meaning + cringe score (0–100) + detected manipulation tactics.
- **Inflate** — plain sentence → LinkedIn-style post, with a style picker and a 1–5 cringe-intensity dial.

## Commands

```bash
pnpm install          # bootstrap the workspace
pnpm dev              # run api (:8787) + web (:5173) in parallel
pnpm dev:backend      # backend only (tsx watch)
pnpm dev:frontend     # frontend only (vite)
pnpm build            # build all packages (shared → api → web via `pnpm -r`)
pnpm typecheck        # type-check every package (no emit)
pnpm clean            # remove dist across packages
```

Per-package scripts run via `pnpm --filter <name> <script>` (e.g. `pnpm --filter @linkedin-translator/backend build`). There is **no test runner and no linter** configured — `pnpm typecheck` is the only verification gate.

Requires Node 20+ and pnpm 10+. Config lives in a single root `.env` (copy `.env.example`); `apps/backend/src/env.ts` loads it regardless of cwd. The app fails fast at startup if the selected provider's API key is missing.

## Architecture

pnpm monorepo, all TypeScript. Three packages:

- **`packages/shared`** — Zod schemas + inferred types. This is the **single source of truth for the API ⇄ web contract** (`DecodeResult`, `GenerateRequest`, `GenerateResult`, `Tactic`, etc.). Both apps import from `@linkedin-translator/shared`. Change a shape here, not in either app. It must be built before the API typechecks against it (`pnpm -r build` handles ordering).
- **`apps/backend`** — Fastify 5 server. Routes in `server.ts` are thin: validate with a shared Zod schema, invoke a LangGraph, return. The graphs live in `src/graphs/`.
- **`apps/frontend`** — React 18 + Vite 6. Hand-written CSS design system in `styles.css` (no Tailwind/UI lib). Vite proxies `/api/*` → `:8787` in dev, so there's no CORS handling needed locally.

### Provider-agnostic LLM (important)

The LLM is **never hardcoded to one vendor.** `apps/backend/src/env.ts` picks a provider from `LLM_PROVIDER` (`google` | `openai` | `anthropic`) and `apps/backend/src/llm.ts` exposes `makeModel()` — an async factory that **lazy-imports** only the selected `@langchain/*` provider and returns an abstract `BaseChatModel`. Consequences:

- Call sites must `await makeModel(...)`.
- `withStructuredOutput` needs an explicit generic because the factory's return type is the abstract base (see `label` in `generator.ts`).
- Web-search grounding only runs when the provider has native search — gated by `nativeWebSearch` in `env.ts` (currently only `google`). `enableWebSearch` is the AND of the env flag and provider capability.
- **Do not brand the codebase to Gemini/any single vendor** in code, UI, comments, or docs. Per-provider model-id strings scoped under their provider config (e.g. `gemini-2.5-flash`) are fine; vendor branding elsewhere is not.

### LangGraph graphs

Built with the `Annotation.Root` state API (not `StateSchema`).

- **Decoder** (`graphs/decoder.ts`) — single `analyze` node using the model's structured-output mode to extract plain meaning + cringe score + tactics.
- **Generator** (`graphs/generator.ts`) — `(conditional) enrich → draft → refine → label`. A conditional entry route runs `enrich` (web-search grounding) only when search is requested and enabled; otherwise straight to `draft`. `refine` is a reflection pass (fresh critic sharpens hook/intensity without changing meaning) — this loop is the reason it's a graph, not a single call. `label` is structured-output and **non-essential**: on failure it falls back to scraping `#hashtags` from the post text. Nodes use `retryPolicy: { maxAttempts: 2 }`.

### Frontend design intent

Editorial neo-brutalist 2026 aesthetic: paper/ink palette, hard offset shadows, red redaction accent, monospace = "truth". Deliberately not AI-generic — research current design trends before changing the visual system. Masthead attribution reads "Powered by binliu14". Local history is persisted to `localStorage` (`history.ts`).

# The LinkedIn Translator

> Decode the cringe. Two LLM-powered translators in one app:
>
> 1. **Decode** — paste a LinkedIn post and get the honest, plain-English version, a **cringe score (0–100)**, and the exact manipulation tactics being used on you (broetry, humblebrag, hustle porn, engagement bait…).
> 2. **Inflate** — write a plain sentence and turn it into a LinkedIn-style post, with a **style picker** and a **cringe-intensity dial (1–5)**.

100% TypeScript, pnpm monorepo. Built by **binliu14**. The LLM is **provider-agnostic** via **LangChain + LangGraph** — pick Google (Gemini), OpenAI, or Anthropic with one env var. UI is a hand-built, editorial neo-brutalist React app — no gradient-soup, no AI-generic look.

---

## Why this exists

People perform on LinkedIn: small events get inflated into grand lessons, boasts get disguised as humility, and text gets line-broken to game the "see more" algorithm. The Decoder reveals the plain message underneath and names the technique. The Inflator lets you do it on purpose (for satire, or to see how the sausage is made).

---

## Stack

| Layer | Tech |
|-------|------|
| Monorepo | pnpm workspaces |
| Shared contract | `packages/shared` — Zod schemas + types shared by API & web |
| Backend | `apps/backend` — Fastify 5 + LangGraph graphs + pluggable LangChain chat model |
| Frontend | `apps/frontend` — React 18 + Vite 6, hand-written CSS design system |
| LLM | Provider-agnostic: **google** / **openai** / **anthropic** (select via `LLM_PROVIDER`). Native web-search grounding where the provider supports it. |

### How LangGraph is used

- **Decoder graph**: `analyze` node → structured extraction (plain meaning + cringe score + detected tactics) via the model's structured-output mode.
- **Generator graph**: `(conditional) enrich → draft → refine → label`. The conditional **enrich** node grounds the post in a real fact via the provider's native web search; the **refine** node is a reflection pass that sharpens the hook to match the requested intensity. This loop is why it's a graph and not a single call.

---

## Prerequisites

- **Node.js 20+** (built/tested on Node 22)
- **pnpm 10+**
- An API key for **one** LLM provider:
  - **google** — free from <https://aistudio.google.com/apikey>
  - **openai** — <https://platform.openai.com/api-keys>
  - **anthropic** — <https://console.anthropic.com/>

---

## Setup

```bash
# 1. install
pnpm install

# 2. configure — copy the example env and add your key
cp .env.example .env
#   then edit .env: choose LLM_PROVIDER and set that provider's API key
```

`.env` (at the repo root) controls both apps:

| Var | Default | Notes |
|-----|---------|-------|
| `LLM_PROVIDER` | `google` | One of `google` \| `openai` \| `anthropic`. |
| `LLM_MODEL` | per-provider | Override the model id. Defaults: `gemini-2.5-flash` / `gpt-4o-mini` / `claude-haiku-4-5-20251001`. |
| `GOOGLE_API_KEY` | — | Required when `LLM_PROVIDER=google`. |
| `OPENAI_API_KEY` | — | Required when `LLM_PROVIDER=openai`. |
| `ANTHROPIC_API_KEY` | — | Required when `LLM_PROVIDER=anthropic`. |
| `ENABLE_WEB_SEARCH` | `true` | Generator search grounding — only active on providers with native search (currently `google`). |
| `PORT` | `8787` | API port (the web dev server proxies `/api` to it). |

---

## Run (development)

```bash
pnpm dev
```

Starts both apps in parallel:

- **Web**: <http://localhost:5173>
- **API**: <http://localhost:8787> (health check: `/api/health`)

The Vite dev server proxies `/api/*` to the backend, so there's no CORS fuss in dev.

Run them individually if you prefer:

```bash
pnpm dev:backend
pnpm dev:frontend
```

---

## Build (production)

```bash
pnpm build        # builds shared → api → web
pnpm typecheck    # type-check everything
```

- API output: `apps/backend/dist` → run with `node apps/backend/dist/server.js`
- Web output: `apps/frontend/dist` → static files; serve behind any static host / reverse-proxy the API.

---

## API reference

### `POST /api/decode`
```jsonc
// request
{ "text": "Humbled and honored to announce..." }

// response (DecodeResult)
{
  "plainMeaning": "I got a promotion.",
  "tldr": "Look how successful I am.",
  "cringeScore": 78,
  "cringeLabel": "Heavy broetry",
  "tactics": [
    { "type": "humblebrag", "severity": 80, "evidence": "Humbled and honored", "explanation": "..." }
  ]
}
```

### `POST /api/generate`
```jsonc
// request (GenerateRequest)
{
  "text": "I got a new job.",
  "style": "broetry",          // broetry | thought-leader | story-time | hot-take | gratitude | hiring
  "intensity": 3,              // 1 (subtle) .. 5 (maximum cringe)
  "addHashtags": true,
  "addEmojis": true,
  "useWebSearch": false
}

// response (GenerateResult)
{
  "post": "I almost didn't share this...\n\n...",
  "styleUsed": "broetry",
  "intensity": 3,
  "hashtags": ["#grateful", "#newbeginnings"],
  "tacticsApplied": ["broetry", "faux-vulnerability"],
  "sources": []
}
```

### `GET /api/health`
Returns `{ ok, provider, model, webSearch }`.

---

## Project layout

```
linkedin-translator/
├── pnpm-workspace.yaml
├── .env.example
├── packages/
│   └── shared/          # Zod schemas + types (the API ⇄ web contract)
└── apps/
    ├── backend/
    │   └── src/
    │       ├── server.ts        # Fastify routes
    │       ├── env.ts           # env loading/validation
    │       ├── llm.ts           # provider-agnostic chat-model factory
    │       ├── prompts.ts       # system + user prompts
    │       ├── search.ts        # best-effort provider-native web-search grounding
    │       └── graphs/
    │           ├── decoder.ts   # LangGraph: analyze
    │           └── generator.ts # LangGraph: enrich → draft → refine → label
    └── frontend/
        └── src/
            ├── App.tsx          # two modes, history
            ├── components.tsx   # cringe meter, tactic cards, copy, outputs
            ├── api.ts           # fetch client
            ├── history.ts       # localStorage history hook
            └── styles.css       # editorial neo-brutalist design system
```

---

## Feature checklist

- [x] Decode a LinkedIn post → plain English
- [x] Inflate a plain sentence → LinkedIn post
- [x] Cringe decoder + 0–100 score + tactic tags
- [x] Tone/style picker + 1–5 intensity dial
- [x] Side-by-side input/output + one-click copy
- [x] Local history (saved in the browser)
- [x] Optional web-search grounding for generated posts (provider-native)
- [x] Pluggable LLM provider (google / openai / anthropic)

## Credits

Built by **binliu14**.

## Ideas for later

- Streaming token output (LangGraph `messages` stream → live typing).
- "Cringe leaderboard" of the most over-the-top generations.
- Browser extension: decode any post inline on linkedin.com.
- Shareable result cards (export the cringe report as an image).

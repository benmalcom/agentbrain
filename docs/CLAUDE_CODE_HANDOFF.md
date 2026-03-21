# AgentBrain — Claude Code Handoff

## Mission
Build AgentBrain from scratch: a TypeScript monorepo CLI + MCP server that generates smart context docs for coding agents (Claude Code, Cursor, Windsurf).

---

## What You Are Building

A tool developers run in their repo to give their coding agent full codebase awareness.

Three commands:
```bash
agentbrain init        # crawl repo → generate context.md, dependency-map.md, patterns.md
agentbrain standards   # generate CLAUDE.md / .cursorrules / .windsurfrules
agentbrain handoff     # git diff → handoff.md for session continuity
agentbrain config      # set/view API key
```

Also ships as an MCP server with four tools:
- `load_context` — load context docs at session start
- `load_standards` — load coding standards mid-session
- `save_handoff` — save handoff at session end
- `scan_repo` — inspect repo structure (no API key needed)

---

## Monorepo Structure

```
agentbrain/
├── package.json              ← npm workspaces root
├── turbo.json                ← Turborepo pipeline
├── tsconfig.base.json        ← shared TS config
├── .prettierrc
├── .gitignore
├── README.md
└── packages/
    ├── core/                 ← shared intelligence layer
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts          ← public exports
    │       ├── types.ts          ← all shared types
    │       ├── ai/
    │       │   └── client.ts     ← provider-agnostic AI wrapper
    │       ├── crawler/
    │       │   └── index.ts      ← repo scanner + file scoring
    │       ├── context/
    │       │   └── index.ts      ← chunk+merge context generator
    │       ├── standards/
    │       │   └── index.ts      ← standards file generator
    │       ├── handoff/
    │       │   └── index.ts      ← git diff → handoff generator
    │       ├── cache/
    │       │   └── index.ts      ← git-hash cache invalidation
    │       └── utils/
    │           └── config.ts     ← API key storage
    │
    ├── cli/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts          ← commander entry point
    │       ├── display.ts        ← chalk + ora UI helpers
    │       └── commands/
    │           ├── init.ts
    │           ├── standards.ts
    │           ├── handoff.ts
    │           └── config.ts
    │
    └── mcp-server/
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── index.ts          ← MCP server entry
            └── tools/
                ├── load-context.ts
                ├── load-standards.ts
                ├── save-handoff.ts
                └── scan-repo.ts
```

---

## Tech Stack

| Concern | Package |
|---|---|
| Monorepo | npm workspaces + Turborepo |
| Language | TypeScript 5.x, ESM (`"type": "module"`) |
| AI calls | `@anthropic-ai/sdk` + `openai` |
| MCP server | `@modelcontextprotocol/sdk` |
| CLI framework | `commander` |
| CLI prompts | `inquirer` v10 |
| CLI UI | `chalk` v5 + `ora` v8 + `cli-table3` |
| Module resolution | `NodeNext` |

---

## Key Architecture Decisions

### 1. BYOK (Bring Your Own Key)
- Users supply their own Anthropic or OpenAI API key
- Key stored locally at `~/.agentbrain/config.json` with `0600` permissions
- Also reads from `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` env vars (env takes priority)
- Auto-detect provider from key prefix: `sk-ant-` = Anthropic, `sk-` = OpenAI

### 2. Tiered Model Selection
Never use one model for everything. Split by task:
```
File-level summarisation  →  fast model  (Haiku / GPT-4o-mini)
Context synthesis         →  mid model   (Sonnet / GPT-4o)
Spec reasoning            →  smart model (Opus / GPT-4.1)  ← sparingly
```

### 3. Chunk + Merge Strategy
Never summarise an entire repo in one call:
```
Scan file tree (no AI)
→ Filter relevant files (no AI, scored by relevance)
→ Summarise each file independently (fast model, batched with concurrency=5)
→ Merge summaries into context.md (mid model)
→ Generate dependency-map.md (mid model)
→ Generate patterns.md (mid model)
```

### 4. Cache-First (git-hash invalidation)
```
agentbrain init runs
→ Check .agentbrain/cache.json, compare gitHash to HEAD
→ Cache valid → return cached docs (zero tokens spent)
→ Cache invalid → regenerate, write new cache
```
Cache stored at `{repoPath}/.agentbrain/cache.json` — add to .gitignore automatically.

### 5. MCP Mode (zero cost)
Users with Claude Desktop / Cursor / Windsurf subscriptions (no API key) can connect the MCP server. Their agent's subscription does the compute, AgentBrain costs $0.

---

## Core Types (implement these exactly)

```typescript
// types.ts

export type AIProvider = 'anthropic' | 'openai'
export type ModelTier = 'fast' | 'mid' | 'smart'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  models: {
    fast: string    // claude-haiku-4-5-20251001 / gpt-4o-mini
    mid: string     // claude-sonnet-4-6 / gpt-4o
    smart: string   // claude-opus-4-6 / gpt-4.1
  }
}

export interface FileEntry {
  path: string      // relative to repo root
  size: number      // bytes
  language: string  // detected from extension
  summary?: string  // AI generated (fast model)
}

export interface RepoScanResult {
  root: string
  totalFiles: number
  relevantFiles: FileEntry[]
  gitHash: string   // HEAD commit hash — cache key
  scannedAt: string
}

export interface ContextDoc {
  type: 'context' | 'dependency-map' | 'patterns' | 'handoff' | 'standards'
  content: string
  generatedAt: string
  gitHash: string
  tokenCount: number
}

export interface GenerateContextOptions {
  repoPath: string
  aiConfig: AIConfig
  maxFiles?: number
  useCache?: boolean
  onProgress?: (msg: string) => void
}

export interface GenerateStandardsOptions {
  repoPath: string
  aiConfig: AIConfig
  stackAnswers: StackAnswers
  agents: AgentTarget[]
}

export interface GenerateHandoffOptions {
  repoPath: string
  aiConfig: AIConfig
  goal?: string
}

export interface StackAnswers {
  language: string
  framework: string
  testingLib: string
  styleGuide: string
  antiPatterns: string[]
  architectureNotes: string
}

export type AgentTarget = 'claude-code' | 'cursor' | 'windsurf'

export interface StandardsOutput {
  'claude-code'?: string
  cursor?: string
  windsurf?: string
}

export interface CacheEntry {
  gitHash: string
  docs: Partial<Record<ContextDoc['type'], ContextDoc>>
  savedAt: string
}

export interface CostEstimate {
  tokens: number
  usd: number
  breakdown: { label: string; tokens: number }[]
}
```

---

## File Crawler Rules

Files to always include (regardless of score):
```
README.md, README.mdx, package.json, pyproject.toml,
Cargo.toml, go.mod, CLAUDE.md, .cursorrules, .windsurfrules
```

Directories/patterns to always ignore:
```
node_modules, dist, build, .git, .next, __pycache__,
coverage, .turbo, .cache, vendor, .env, .env.*,
*.lock, pnpm-lock.yaml, yarn.lock, package-lock.json
```

Supported code extensions (only scan these):
```
.ts .tsx .js .jsx .mjs .cjs
.py .rs .go .java .kt .swift
.rb .php .cs .cpp .c .h
.md .mdx .json .yaml .yml .toml
.graphql .gql .prisma .sql
```

Relevance scoring (higher = more relevant):
- Always-include files: +100
- Entry points (index, main, app, server): +50
- Config files (.config.ts, .setup.ts): +30
- Penalty per directory depth: -3 per level
- Test files: -10
- Files scoring < 0: excluded

---

## Agent Standards File Paths

```typescript
export const AGENT_FILE_PATHS: Record<AgentTarget, string> = {
  'claude-code': 'CLAUDE.md',
  'cursor': '.cursor/rules',
  'windsurf': '.windsurfrules',
}
```

---

## CLI UX Requirements

### init command flow:
1. Detect API key (env → stored config → prompt user)
2. Auto-detect provider from key prefix, show which models will be used
3. Scan repo, show file count + table of selected files (max 8 shown)
4. Show cost estimate with breakdown BEFORE generating
5. Confirm prompt: "Generate context docs? (y/n)"
6. Generate with spinner showing progress
7. Write to `{repoPath}/agentbrain/` directory
8. Show output summary with file paths
9. Show actual cost spent
10. Print snippet: "Add to your CLAUDE.md: @agentbrain/context.md"

### Cost estimate display:
```
  Cost estimate:
    File summaries (23 files × fast model): ~12,000 tokens
    Context synthesis (mid model): ~5,000 tokens
  → Total: ~17,000 tokens (~$0.04)
```

### Token estimate after actual generation:
```
  ✓ context.md            — full repo intelligence
  ✓ dependency-map.md     — service relationships
  ✓ patterns.md           — coding patterns

  Actual cost: ~17,432 tokens (~$0.0261)
```

---

## MCP Server Tool Schemas

### load_context
```
Input:  { repo_path: string, force_refresh?: boolean }
Output: Combined context.md + dependency-map.md + patterns.md as text
Note:   Cached by git hash — repeat calls free
```

### load_standards
```
Input:  { repo_path: string, agent: 'claude-code' | 'cursor' | 'windsurf' }
Output: Contents of the standards file for that agent
Note:   Reads from disk — no AI call needed
```

### save_handoff
```
Input:  { repo_path: string, goal?: string }
Output: Handoff doc content + saves to agentbrain/handoff.md
Note:   Reads git diff + recent commits, generates with mid model
```

### scan_repo
```
Input:  { repo_path: string, max_files?: number }
Output: File list with languages and sizes
Note:   No API key required — pure file analysis
```

---

## Spec-First Rules (IMPORTANT — follow these yourself)

- Propose approach before writing code
- No quick hacks — think at a higher level
- No hard-coded values in multiple places
- Always consider edge cases
- Do not introduce unrequested changes
- One task at a time — complete and verify before moving on

---

## Build Order

Work through packages in this order:

**Step 1 — Root monorepo setup**
- `package.json` (npm workspaces)
- `turbo.json`
- `tsconfig.base.json`
- `.prettierrc`, `.gitignore`, `README.md`

**Step 2 — `packages/core`**
- `package.json`, `tsconfig.json`
- `src/types.ts`
- `src/ai/client.ts`
- `src/crawler/index.ts`
- `src/cache/index.ts`
- `src/utils/config.ts`
- `src/context/index.ts`
- `src/standards/index.ts`
- `src/handoff/index.ts`
- `src/index.ts`
- Verify: `npx tsc -p packages/core/tsconfig.json --noEmit` → 0 errors

**Step 3 — `packages/cli`**
- `package.json`, `tsconfig.json`
- `src/display.ts`
- `src/commands/config.ts`
- `src/commands/init.ts`
- `src/commands/standards.ts`
- `src/commands/handoff.ts`
- `src/index.ts`
- Verify: `npx tsc -p packages/cli/tsconfig.json --noEmit` → 0 errors

**Step 4 — `packages/mcp-server`**
- `package.json`, `tsconfig.json`
- `src/tools/scan-repo.ts`
- `src/tools/load-standards.ts`
- `src/tools/load-context.ts`
- `src/tools/save-handoff.ts`
- `src/index.ts`
- Verify: `npx tsc -p packages/mcp-server/tsconfig.json --noEmit` → 0 errors

**Step 5 — Full build + smoke test**
```bash
npm install
npm run build
# Test CLI runs
node packages/cli/dist/index.js --help
node packages/mcp-server/dist/index.js --help
```

---

## Done Criteria

The scaffold is complete when:

- [ ] `npm run build` completes with 0 TypeScript errors across all packages
- [ ] `node packages/cli/dist/index.js --help` shows all 4 commands
- [ ] `node packages/cli/dist/index.js init --dry-run --path .` runs without crashing
- [ ] `node packages/mcp-server/dist/index.js` starts without crashing
- [ ] All files in the structure above exist and are non-empty
- [ ] `.agentbrain/` is in `.gitignore`
- [ ] `~/.agentbrain/config.json` is created with correct permissions on first config set

---

## Notes for Claude Code

- Use ESM throughout (`"type": "module"`, import with `.js` extensions)
- `module: NodeNext` and `moduleResolution: NodeNext` in all tsconfigs
- Build `core` before `cli` and `mcp-server` (workspace dependency)
- Inquirer v10 API is different from v8 — use per-question `prompt()` calls or typed arrays
- `chalk`, `ora`, `globby` are ESM-only — no `require()`
- MCP SDK: use `@modelcontextprotocol/sdk/server/index.js` and `@modelcontextprotocol/sdk/server/stdio.js`
- File permissions: `~/.agentbrain/` dir = `0700`, config file = `0600`
- Always add `.agentbrain/` to repo `.gitignore` automatically when writing cache

---

## First Message to Send Claude Code

Paste this exactly:

```
Please read this handoff document carefully before writing any code:
[paste the full contents of this file]

Start with Step 1 (root monorepo setup). After each step, run the verification command and confirm 0 errors before proceeding to the next step. Do not write all files at once — complete and verify each step in order.
```

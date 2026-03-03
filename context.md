# Revelio — Master Project Prompt

---

## What Are We Building?

**Revelio** is a self-hosted, open source, AI-powered Pull Request reviewer for GitHub.

It integrates with your repositories via a GitHub App, listens for PR events via webhooks, and posts intelligent code review comments directly on the PR — like a senior engineer would. The key differentiator is philosophy: **Revelio only flags things that actually matter**. No nitpicks. No style complaints. No formatting noise. Only bugs, security issues, logic errors, and architectural concerns worth stopping a merge for.

It is model-agnostic by design: teams bring their own API key and choose their LLM (Claude, GPT-4, Gemini, or any future provider). It runs entirely locally with a single `docker compose up`, and is architected to deploy to AWS with zero structural changes — using CDK-defined infrastructure that mirrors the local setup 1:1.

---

## Purpose

- Give developers and small teams access to senior-level AI code review without paying for a SaaS subscription
- Produce a real, production-grade open source project that demonstrates system design, clean architecture, LLM integration, and cloud infrastructure skills
- Serve as a learning project and portfolio piece covering: event-driven backend design, provider abstraction patterns, diff parsing, prompt engineering, and AWS infrastructure-as-code

---

## Scope (v1 — 2 weeks)

**In scope:**

- GitHub App setup and webhook receiver (Fastify)
- Async job queue (BullMQ + Redis locally, SQS on AWS)
- PR diff fetching and intelligent chunking for large PRs
- LLM provider abstraction with Claude, OpenAI, and Gemini implementations
- Prompt engineering focused on high-signal, low-noise review
- GitHub PR review comments posted back via API
- Per-repo configuration via `.revelio.yml`
- AWS CDK infrastructure stack mirroring local architecture
- Docker Compose for local development
- Unit tests for core logic (chunker, parser, factory)
- README with architecture diagram and setup guide

**Out of scope for v1:**

- Web dashboard or UI
- Multi-repo management interface
- Custom model fine-tuning
- PR summary generation
- Slack/email notifications
- Billing or usage tracking

---

## Architecture Rules

### 1. Local mirrors AWS — always

The local development stack and the AWS production stack must be structurally identical. Every component has a direct equivalent:

| Local            | AWS                  |
| ---------------- | -------------------- |
| Fastify on :3000 | API Gateway + Lambda |
| BullMQ + Redis   | SQS Queue            |
| Worker process   | ECS Fargate          |
| `.env` file      | SSM Parameter Store  |
| `docker-compose` | CDK stack            |

No shortcuts that only work locally. If it doesn't translate to AWS, don't do it.

### 2. The LLM layer is always behind an interface

No provider SDK (Anthropic, OpenAI, Gemini) is ever imported outside of `src/llm/providers/`. The rest of the application only ever interacts with `LLMProvider`. This makes provider swaps a config change, not a code change.

### 3. Config is always validated at startup

`.revelio.yml` is parsed and validated via a Zod schema before any work begins. If config is invalid, fail loudly with a clear error. Never silently ignore bad config.

### 4. Jobs are idempotent

Each review job carries enough data to be safely retried. The same PR + commit SHA should produce the same review if reprocessed. Use `jobId` deduplication in BullMQ to prevent double-reviews on the same commit.

### 5. Fail gracefully, log verbosely

Network calls to GitHub and LLM providers will fail. Wrap them, retry with exponential backoff (BullMQ handles this), and log enough context to debug without exposing secrets. Never crash the worker on a single bad job.

### 6. GitHub interaction is always wrapped

No direct Octokit calls outside of `src/github/`. All GitHub API interactions go through the client wrapper — this centralizes auth, error handling, and rate limit awareness.

---

## Code Conventions

### TypeScript

- Strict mode on. No `any`. Use `unknown` and narrow it.
- Prefer `type` over `interface` for data shapes; use `interface` only for things that will be implemented (like `LLMProvider`)
- All async functions return explicit Promise types
- No barrel `index.ts` re-exports unless the module has 3+ public exports

### Naming

- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions and variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Types and interfaces: `PascalCase`

### Error handling

- Use typed error classes where relevant (e.g. `GitHubAuthError`, `ProviderError`)
- Never swallow errors silently — always log with context before re-throwing or recovering
- Worker failures are handled by BullMQ retry policy, not try/catch suppression

### Imports

- Absolute imports from `src/` root (configure `tsconfig` paths)
- Group imports: node built-ins → third party → internal, separated by blank lines

### Comments

- No comments explaining _what_ the code does — the code should be readable enough
- Comments explain _why_: non-obvious decisions, tradeoffs, constraints
- Every module's entry point gets a one-paragraph JSDoc explaining its responsibility

---

## Project Phases

---

### Phase 0 — Foundation

**Goal:** Repo is set up, runs locally, webhook is receiving events.

**Tasks:**

1. Initialize repo with `package.json`, `tsconfig.json`, `.eslintrc`, `.gitignore`
2. Create full folder structure as defined in `STRUCTURE.md`
3. Set up Docker Compose with Redis service
4. Create the Fastify server in `src/index.ts` with a `/health` and `/webhook` route
5. Register a GitHub App (go to GitHub → Settings → Developer settings → GitHub Apps)
   - Set webhook URL to `http://localhost:3000/webhook` (use ngrok to expose)
   - Request permissions: `pull_requests: write`, `contents: read`
   - Subscribe to events: `pull_request`
   - Download the private key `.pem` file
6. Implement webhook signature verification in `src/webhook/handler.ts`
7. Log incoming events to confirm the pipeline is working end to end

**Exit criteria:** A PR opened on a test repo logs the event in the terminal.

---

### Phase 1 — Queue + Job Pipeline

**Goal:** Webhook events are enqueued and workers process jobs reliably.

**Tasks:**

1. Define `ReviewJobData` type in `src/queue/jobs.ts`
2. Implement `createReviewQueue()` and `enqueueReview()` in `src/queue/queue.ts`
3. Connect webhook handler to queue: on valid PR event → enqueue job
4. Implement `src/worker.ts` with a BullMQ Worker consuming the `"review"` queue
5. Configure retry policy: 3 attempts, exponential backoff, dead-letter logging
6. Add job deduplication by `jobId` = `owner/repo#prNumber@shortSha`
7. Verify queue processing: open a PR → see job logged in worker output

**Exit criteria:** Opening or pushing to a PR reliably creates and processes a job. Duplicate commits do not create duplicate jobs.

---

### Phase 2 — GitHub Integration + Diff Fetching

**Goal:** Worker can fetch the full PR diff and metadata from GitHub.

**Tasks:**

1. Implement `GitHubClient` in `src/github/client.ts`
   - GitHub App authentication using `@octokit/auth-app`
   - Installation token generation per job (each install gets its own token)
   - Wrap all calls with error handling and rate limit awareness
2. Implement `fetchPRDiff()` in `src/github/diff.ts`
   - Fetch raw unified diff via `GET /repos/{owner}/{repo}/pulls/{pull_number}` with `Accept: application/vnd.github.v3.diff`
   - Handle edge cases: empty PRs, binary-only changes, PRs with 0 changed files
3. Implement `postReview()` in `src/review/poster.ts`
   - Use GitHub's Reviews API (`POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews`)
   - Support posting inline comments at specific file + line positions
   - Handle the case of a clean PR (no comments → post a passing review)

**Exit criteria:** Worker fetches a real diff from a real PR and logs it. Poster can submit a test review comment.

---

### Phase 3 — Diff Chunker

**Goal:** Any PR size is handled correctly without losing context.

**Tasks:**

1. Implement `chunkDiff()` in `src/diff/chunker.ts`
   - Split by file first, then by hunk within each file
   - Always attach the file header to every chunk (so the LLM knows what file it's reviewing)
   - Respect `maxChunkLines` config value
   - Skip binary files and generated files early
2. Implement `inferLanguage()` helper from file extension
3. Write unit tests in `tests/diff/chunker.test.ts`:
   - Small diff → single chunk
   - Large diff → multiple chunks, all with correct filename
   - Binary file → skipped
   - Empty diff → empty array

**Exit criteria:** All tests pass. A 2000-line diff across 5 files produces the expected number of chunks, each with correct metadata.

---

### Phase 4 — LLM Provider Abstraction

**Goal:** Any LLM can be used interchangeably with a single env var change.

**Tasks:**

1. Define `LLMProvider` interface and supporting types in `src/llm/types.ts`
2. Implement `ClaudeProvider` in `src/llm/providers/claude.ts`
3. Implement `OpenAIProvider` in `src/llm/providers/openai.ts`
4. Implement `GeminiProvider` in `src/llm/providers/gemini.ts`
5. Implement `createProvider()` and `createProviderFromEnv()` in `src/llm/factory.ts`
6. Write unit tests in `tests/llm/factory.test.ts`:
   - Correct provider returned for each `LLM_PROVIDER` value
   - Throws on missing API key
   - Throws on unknown provider name

**Exit criteria:** Switching `LLM_PROVIDER=openai` in `.env` routes all completions to GPT-4 with zero other changes. All factory tests pass.

---

### Phase 5 — Review Engine

**Goal:** Diffs are reviewed by the LLM and comments are filtered and posted.

**Tasks:**

1. Write the system prompt in `src/review/prompt.ts`
   - Instructs the model to only flag: `bug`, `security`, `logic`, `architecture`
   - Explicitly instructs the model to ignore style, formatting, naming, nitpicks
   - Specifies strict JSON-only output format with schema
   - Include few-shot examples of what a good comment looks like vs. what to ignore
2. Implement `buildUserPrompt()` — injects chunk content, filename, language, active categories, and min severity
3. Implement `parseReviewResponse()` in `src/review/parser.ts`
   - Validate output with Zod schema
   - Strip markdown fences if model adds them
   - Filter by `minSeverity`
   - Warn and skip malformed entries instead of crashing
4. Write unit tests in `tests/review/parser.test.ts`:
   - Valid JSON → correct comments
   - Severity filtering works correctly
   - Malformed entries are skipped
   - Markdown fences are stripped
   - Empty array response is handled
5. Wire everything together in `src/worker.ts`:
   - For each non-ignored chunk: prompt → parse → collect comments
   - Post single consolidated review to GitHub

**Exit criteria:** A real PR with a deliberate bug gets a review comment pointing to the exact file and line. A clean PR gets a passing review with no comments.

---

### Phase 6 — Config System

**Goal:** Teams can configure Revelio's behavior per repo via `.revelio.yml`.

**Tasks:**

1. Define config schema with Zod in `src/config/schema.ts`:
   - `review.categories`: array of allowed categories
   - `review.ignore`: glob patterns for files to skip
   - `review.maxChunkLines`: max lines per diff chunk
   - `review.minSeverity`: minimum severity threshold
2. Implement `loadConfig()` in `src/config/loader.ts`
   - Fetch `.revelio.yml` from the repo root via GitHub API
   - Fall back to sensible defaults if file doesn't exist
   - Validate with Zod; throw with a helpful message if invalid
3. Update worker to load config per job before processing

**Exit criteria:** Adding `.revelio.yml` to a repo changes review behavior (e.g. ignoring test files, raising severity threshold).

---

### Phase 7 — AWS Infrastructure

**Goal:** The CDK stack fully describes the production AWS deployment.

**Tasks:**

1. Initialize CDK app in `infra/` with `npm install aws-cdk-lib constructs`
2. Implement `RevelioStack` in `infra/lib/revelio-stack.ts`:
   - **API Gateway** → webhook Lambda (replaces Fastify)
   - **SQS Queue** with DLQ (replaces BullMQ + Redis)
   - **SSM Parameter Store** entries for all secrets (replaces `.env`)
   - **ECS Fargate** task definition for the worker (replaces local worker process)
   - **IAM roles** with least-privilege policies for each component
   - **CloudWatch** log groups for structured logging
3. Add `cdk.json` and document how to deploy in README
4. Do NOT actually deploy — the stack is the deliverable, not the running infra

**Exit criteria:** `cdk synth` produces a valid CloudFormation template with no errors. The architecture diagram in the README matches the CDK stack exactly.

---

### Phase 8 — Polish + Open Source Readiness

**Goal:** The repo is ready to be public, starred, and used by others.

**Tasks:**

1. **README.md** — complete guide including:
   - What Revelio is and why it exists (the no-nitpicks philosophy)
   - Architecture diagram (ASCII or Mermaid)
   - Prerequisites and GitHub App setup walkthrough
   - One-command local start: `docker compose up`
   - `.revelio.yml` reference with all options documented
   - Local ↔ AWS equivalence table
   - Contributing guide stub
2. **Demo** — create a demo repo with intentional bugs in PRs, include GIF or screenshot in README showing Revelio catching them
3. **`.revelio.yml.example`** — fully commented, copy-paste ready
4. **`CONTRIBUTING.md`** — how to add a new LLM provider (the main contribution path)
5. **`LICENSE`** — MIT
6. **GitHub Actions** — CI pipeline: lint + test on every PR

**Exit criteria:** Someone with no prior context can clone the repo, follow the README, and have Revelio reviewing their PRs within 30 minutes.

---

## What Success Looks Like

A recruiter or senior engineer reading this repo should be able to see, without explanation:

- **System design thinking** — event-driven architecture, async queue, decoupled components
- **Abstraction discipline** — the provider pattern, the config system, the GitHub wrapper
- **Production mindset** — idempotent jobs, retry policies, secret management, IaC
- **Pragmatic engineering** — runs locally in one command, no over-engineering, no premature optimization
- **Ownership** — clean README, tests on the interesting logic, thoughtful commit history

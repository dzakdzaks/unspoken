# Agentic Workspace

Role-based autonomous delivery pipeline for Unspoken, powered by the [Cursor SDK](https://cursor.com/docs/sdk/typescript) and GitHub Issues.

## Architecture

```
GitHub Issue (agent:pipeline + stage:*)
    │
    ▼
orchestrator.ts (tick loop)
    │
    ├── PM → Designer → Architect → [HUMAN: approve spec]
    ├── Engineer (worktree) → Reviewer
    ├── QA → Automation QA → [HUMAN: merge PR]
    └── done
```

Each role is a Cursor SDK agent with a playbook in `agents/skills/`. Artifacts accumulate in `.agent-workspace/<issue#>/`.

## Prerequisites

1. **Cursor API key** — mint at [Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations), add to `.env.local`:
   ```
   CURSOR_API_KEY=cursor_...
   GITHUB_REPO=dzakdzaks/unspoken
   ```

2. **GitHub CLI** — authenticate:
   ```bash
   gh auth login
   ```

3. **Dependencies** — already in devDependencies (`@cursor/sdk`, `vitest`).

## Quick start

```bash
# Seed pipeline labels + a test issue
bun run agents:seed

# Have the PM propose new backlog issues (PRD scan, propose-only by default)
bun run agents:groom

# Run one pipeline tick (processes all open agent:pipeline issues)
bun run agents:tick

# Watch mode (tick every 60s)
bun run agents:watch

# Dry-run (no SDK calls, no GitHub writes)
bun run agents:tick -- --dry-run --issue 1
```

## PM auto-creating issues (`agents:groom`)

The Product Manager can generate new backlog issues instead of you writing them
by hand. It reads `PRD.md` (Risks / Open Questions / Future Considerations),
checks existing open issues to avoid duplicates, and proposes up to 3 new ones.

```bash
# Propose issues from the PRD (prints proposals, creates nothing)
bun run agents:groom

# Focus on a theme
bun run agents:groom -- --goal "improve first-time user onboarding"

# Actually create the proposed issues (stage:backlog, agent:pipeline)
bun run agents:groom -- --confirm

# Preview the prompt only (no SDK call)
bun run agents:groom -- --dry-run
```

Safety: proposals are **review-first** — nothing is created without `--confirm`.
Capped at 3 issues per run and deduped against existing open issue titles.
Created issues land at `stage:backlog`, so the normal `agents:tick` grooming
flow picks them up next.

## Pipeline stages (GitHub labels)

| Label | Role | Next stage |
|-------|------|------------|
| `stage:backlog` | Product Manager | `stage:design` |
| `stage:design` | UI/UX Designer | `stage:spec` |
| `stage:spec` | Architect | stays (human gate) |
| `approved:spec` | *(human adds)* | enables Engineer |
| `stage:in-progress` | Software Engineer | `stage:review` |
| `stage:review` | Code Reviewer | `stage:qa` or back to `in-progress` |
| `stage:qa` | QA → Automation QA | stays (human merge gate) |
| `stage:done` | — | terminal |

### Human gates

1. **Spec approval** — after Architect writes `spec.md`, either:
   - Add label `approved:spec`, or
   - Set `agent_approved_spec: true` in the issue body frontmatter.
2. **PR merge** — after Automation QA passes tests, review and merge the draft PR manually.

### State tracking (labels + frontmatter fallback)

Primary state uses GitHub labels (`stage:*`, `approved:spec`, `needs:human`).

If label creation is unavailable (limited repo permissions), the pipeline falls back to YAML frontmatter in the issue body:

```yaml
---
agent_stage: backlog
agent_approved_spec: false
agent_needs_human: false
agent_review_retry: 0
---
```

The orchestrator reads labels first, then frontmatter. Stage updates always write frontmatter; labels are applied when the token has permission.

### Escalation

- Review retries capped at 3 → label `needs:human` added, pipeline stops.

## Creating a new issue

```bash
gh issue create \
  --repo dzakdzaks/unspoken \
  --title "Your feature title" \
  --body "Description and acceptance criteria" \
  --label "agent:pipeline" \
  --label "stage:backlog"
```

Or use `bun run agents:seed` for a pre-built test issue.

## File layout

```
agents/
  orchestrator.ts      # Main tick loop
  seed.ts              # Label + test issue seeding
  lib/
    config.ts          # Env, paths, limits
    github.ts          # gh CLI wrappers
    cursor.ts          # Cursor SDK runRole()
    worktree.ts        # Per-issue git worktrees
    stages.ts          # Label state machine
    artifacts.ts       # .agent-workspace/ helpers
    verify.ts          # lint/build/test gates
  roles/
    index.ts           # Role handlers + prompt builders
  skills/
    pm.md              # Role playbooks (injected into prompts)
    designer.md
    architect.md
    engineer.md
    reviewer.md
    qa.md
    automation-qa.md
.agent-workspace/      # Committed artifacts per issue
.agent-worktrees/      # Ephemeral engineer worktrees (gitignored)
```

## Verification gates

| Role | Must pass before advancing |
|------|---------------------------|
| Engineer | `bun run lint`, `bun run build`, draft PR exists |
| Automation QA | `bun run test` |
| Reviewer | APPROVE or REQUEST CHANGES (max 3 retries) |

## Cost control

- Uses `composer-2.5` model by default.
- One agent run per role per tick per issue.
- Worktrees isolate parallel issues (max 5 concurrent).

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `CURSOR_API_KEY is required` | Add key to `.env.local` |
| `gh auth status failed` | Run `gh auth login` |
| Engineer stuck | Check worktree at `.agent-worktrees/issue-N/` |
| Spec gate | Add `approved:spec` label manually |
| `needs:human` | Review issue comments, fix blocker, remove label |

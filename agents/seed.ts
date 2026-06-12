import { stringifyFrontmatter } from "./lib/frontmatter";
import {
  APPROVED_SPEC_LABEL,
  NEEDS_HUMAN_LABEL,
  ALL_PIPELINE_LABELS,
  stageLabel,
} from "./lib/stages";
import { ensureLabel, createIssue, ghAvailable, GhError } from "./lib/github";
import { GITHUB_REPO } from "./lib/config";
import { isMainModule } from "./lib/runtime";

const LABEL_META: Record<string, { color: string; description: string }> = {
  "agent:pipeline": {
    color: "5319E7",
    description: "Issue is managed by the agentic workspace pipeline",
  },
  [APPROVED_SPEC_LABEL]: {
    color: "0E8A16",
    description: "Human approved the technical spec — engineer may proceed",
  },
  [NEEDS_HUMAN_LABEL]: {
    color: "D93F0B",
    description: "Pipeline blocked — requires human intervention",
  },
  [stageLabel("backlog")]: {
    color: "EDEDED",
    description: "Awaiting PM grooming",
  },
  [stageLabel("design")]: {
    color: "C5DEF5",
    description: "Awaiting UI/UX design",
  },
  [stageLabel("spec")]: {
    color: "FEF2C0",
    description: "Awaiting architect spec (human approval gate)",
  },
  [stageLabel("in-progress")]: {
    color: "BFD4F2",
    description: "Engineer implementing",
  },
  [stageLabel("review")]: {
    color: "FBCA04",
    description: "Code review in progress",
  },
  [stageLabel("qa")]: {
    color: "D4C5F9",
    description: "QA and automation (human merge gate)",
  },
  [stageLabel("done")]: {
    color: "0E8A16",
    description: "Completed and merged",
  },
};

export function seedLabels(dryRun = false): { created: number; skipped: number } {
  if (!dryRun && !ghAvailable()) {
    throw new GhError(
      "GitHub CLI not authenticated. Run: gh auth login",
      1,
      ""
    );
  }

  let created = 0;
  let skipped = 0;

  for (const label of ALL_PIPELINE_LABELS) {
    const meta = LABEL_META[label] ?? {
      color: "BFDADC",
      description: "Agent pipeline label",
    };
    console.log(`${dryRun ? "[dry-run] " : ""}label: ${label}`);
    if (!dryRun) {
      const ok = ensureLabel(label, meta.color, meta.description);
      if (ok) created++;
      else {
        skipped++;
        console.warn(`  skipped (no label API permission): ${label}`);
      }
    }
  }

  if (skipped > 0) {
    console.warn(
      "\nLabel creation unavailable — pipeline uses issue body frontmatter as fallback."
    );
    console.warn(
      "Set agent_stage in issue body, or ask repo admin to create labels once."
    );
  }

  console.log(`Labels ready for ${GITHUB_REPO} (created=${created} skipped=${skipped})`);
  return { created, skipped };
}

export function seedTestIssue(dryRun = false): void {
  seedLabels(dryRun);

  const title = "[agent-test] Add TranslationResultSchema validation tests";
  const body =
    stringifyFrontmatter({
      agent_stage: "backlog",
      agent_approved_spec: false,
      agent_needs_human: false,
      agent_review_retry: 0,
    }) +
    `## Agent pipeline test issue

This issue exercises the full agentic workspace pipeline.

**Goal:** Add Vitest unit tests for \`TranslationResultSchema\` in \`lib/schema.ts\` (addresses PRD R5).

**Do not merge automatically** — human gates apply at spec approval and PR merge.

### Acceptance criteria
1. Vitest tests cover valid and invalid decode payloads.
2. \`bun run test\` passes in CI.
3. No changes to production behavior beyond test additions.

### Human gates
- Set \`agent_approved_spec: true\` in frontmatter (or add \`approved:spec\` label) after reviewing spec.md.
- Merge the PR manually after QA passes.
`;

  if (dryRun) {
    console.log("[dry-run] Would create issue:", title);
    return;
  }

  const issue = createIssue({
    title,
    body,
    labels: [],
  });

  console.log(`Created test issue #${issue.number}`);
  console.log(`https://github.com/${GITHUB_REPO}/issues/${issue.number}`);
}

function parseArgs(): { dryRun: boolean; labelsOnly: boolean } {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    labelsOnly: args.includes("--labels-only"),
  };
}

if (isMainModule(import.meta.url)) {
  const { dryRun, labelsOnly } = parseArgs();
  try {
    if (labelsOnly) {
      seedLabels(dryRun);
    } else {
      seedTestIssue(dryRun);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { REPO_ROOT, skillsPath } from "./lib/config";
import { runAgentPrompt } from "./lib/cursor";
import {
  listPipelineIssues,
  createIssue,
  ghAvailable,
  GhError,
  ensureLabel,
} from "./lib/github";
import { stageLabel } from "./lib/stages";
import { stringifyFrontmatter } from "./lib/frontmatter";
import { isMainModule } from "./lib/runtime";

const MAX_PROPOSALS = 3;

interface ProposedIssue {
  title: string;
  body: string;
  rationale?: string;
}

function loadPrd(): string {
  const path = join(REPO_ROOT, "PRD.md");
  if (!existsSync(path)) return "(PRD.md not found)";
  return readFileSync(path, "utf-8");
}

function loadIntakeSkill(): string {
  const path = skillsPath("pm-intake");
  if (!existsSync(path)) {
    throw new Error(`Missing skill playbook: ${path}`);
  }
  return readFileSync(path, "utf-8");
}

function listOpenIssueTitles(): string[] {
  try {
    return listPipelineIssues().map((i) => i.title);
  } catch {
    return [];
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/^\[[^\]]*\]\s*/, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isDuplicate(title: string, existing: string[]): boolean {
  const norm = normalizeTitle(title);
  return existing.some((e) => {
    const en = normalizeTitle(e);
    return en === norm || en.includes(norm) || norm.includes(en);
  });
}

function extractJsonArray(text: string): ProposedIssue[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON array found in agent output.");
  }
  const parsed = JSON.parse(candidate.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("Agent output is not an array.");
  return parsed
    .filter((p) => p && typeof p.title === "string" && typeof p.body === "string")
    .map((p) => ({
      title: String(p.title).trim(),
      body: String(p.body).trim(),
      rationale: p.rationale ? String(p.rationale).trim() : undefined,
    }));
}

function buildIntakePrompt(goal: string | undefined, existing: string[]): string {
  const skill = loadIntakeSkill();
  const prd = loadPrd();
  const goalBlock = goal
    ? `## Focus goal\n${goal}\n`
    : "## Focus goal\n(none — scan the PRD broadly for the highest-value unaddressed work)\n";
  const existingBlock =
    existing.length > 0
      ? existing.map((t) => `- ${t}`).join("\n")
      : "(no existing open pipeline issues)";

  return `# Role playbook

${skill}

---

# Current task

Propose up to ${MAX_PROPOSALS} new pipeline issues.

${goalBlock}

## Existing open issue titles (do NOT duplicate)
${existingBlock}

## PRD
${prd}

Return ONLY the JSON array described in the playbook.`;
}

function issueBody(proposal: ProposedIssue): string {
  const fm = stringifyFrontmatter({
    agent_stage: "backlog",
    agent_approved_spec: false,
    agent_needs_human: false,
    agent_review_retry: 0,
  });
  const rationale = proposal.rationale
    ? `\n\n_Rationale: ${proposal.rationale}_`
    : "";
  return `${fm}${proposal.body}${rationale}\n`;
}

function ensurePipelineLabels(): boolean {
  const pipeline = ensureLabel(
    "agent:pipeline",
    "5319E7",
    "Issue is managed by the agentic workspace pipeline"
  );
  const backlog = ensureLabel(
    stageLabel("backlog"),
    "EDEDED",
    "Awaiting PM grooming"
  );
  return pipeline && backlog;
}

export async function groom(options: {
  goal?: string;
  confirm: boolean;
  dryRun: boolean;
}): Promise<void> {
  const { goal, confirm, dryRun } = options;

  if (!dryRun && !ghAvailable()) {
    throw new GhError("GitHub CLI not authenticated. Run: gh auth login", 1, "");
  }

  const existing = listOpenIssueTitles();
  const prompt = buildIntakePrompt(goal, existing);

  if (dryRun) {
    console.log("[dry-run] PM intake prompt preview:\n");
    console.log(prompt.slice(0, 800) + "\n...");
    return;
  }

  console.log("Running PM intake agent...");
  const result = await runAgentPrompt({
    fullPrompt: prompt,
    cwd: REPO_ROOT,
    label: "pm-intake",
  });

  if (result.status === "error") {
    throw new Error(`PM intake failed: ${result.result}`);
  }

  let proposals: ProposedIssue[];
  try {
    proposals = extractJsonArray(result.result);
  } catch (err) {
    console.error("Could not parse agent output as JSON.\n");
    console.error(result.result);
    throw err;
  }

  const deduped = proposals
    .filter((p) => !isDuplicate(p.title, existing))
    .slice(0, MAX_PROPOSALS);

  if (deduped.length === 0) {
    console.log("No new (non-duplicate) issues proposed.");
    return;
  }

  console.log(`\nProposed ${deduped.length} issue(s):\n`);
  deduped.forEach((p, i) => {
    console.log(`${i + 1}. ${p.title}`);
    console.log(`   ${p.body.replace(/\n/g, " ")}`);
    if (p.rationale) console.log(`   Rationale: ${p.rationale}`);
    console.log("");
  });

  if (!confirm) {
    console.log(
      "Dry proposal only. Re-run with --confirm to create these issues:\n  bun run agents:groom -- --confirm"
    );
    return;
  }

  const labelsOk = ensurePipelineLabels();

  for (const proposal of deduped) {
    const created = createIssue({
      title: proposal.title,
      body: issueBody(proposal),
      labels: labelsOk ? ["agent:pipeline", stageLabel("backlog")] : [],
    });
    console.log(`Created #${created.number}: ${proposal.title}`);
  }

  console.log(
    `\nDone. ${deduped.length} issue(s) created at stage:backlog. Run "bun run agents:tick" to start grooming.`
  );
}

function parseArgs(): { goal?: string; confirm: boolean; dryRun: boolean } {
  const args = process.argv.slice(2);
  const goalIdx = args.indexOf("--goal");
  return {
    goal: goalIdx !== -1 ? args[goalIdx + 1] : undefined,
    confirm: args.includes("--confirm"),
    dryRun: args.includes("--dry-run"),
  };
}

if (isMainModule(import.meta.url)) {
  const { goal, confirm, dryRun } = parseArgs();
  groom({ goal, confirm, dryRun }).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

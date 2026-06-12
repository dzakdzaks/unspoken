import { spawnSync } from "child_process";
import { GITHUB_REPO } from "./config";
import { mergeFrontmatter, parseFrontmatter } from "./frontmatter";
import {
  APPROVED_SPEC_LABEL,
  NEEDS_HUMAN_LABEL,
} from "./stages";

export interface GhIssue {
  number: number;
  title: string;
  body: string;
  labels: { name: string }[];
  state: string;
}

export interface GhPullRequest {
  number: number;
  state: string;
  merged: boolean;
  headRefName: string;
  url: string;
}

export class GhError extends Error {
  constructor(
    message: string,
    readonly exitCode: number,
    readonly stderr: string
  ) {
    super(message);
    this.name = "GhError";
  }
}

function gh(args: string[]): string {
  const result = spawnSync("gh", args, {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    throw new GhError(
      `gh not available: ${result.error.message}`,
      127,
      result.error.message
    );
  }

  if (result.status !== 0) {
    throw new GhError(
      `gh ${args.join(" ")} failed`,
      result.status ?? 1,
      result.stderr?.trim() ?? ""
    );
  }

  return result.stdout.trim();
}

export function ghAvailable(): boolean {
  const result = spawnSync("gh", ["auth", "status"], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0;
}

export function listPipelineIssues(): GhIssue[] {
  const out = gh([
    "issue",
    "list",
    "--repo",
    GITHUB_REPO,
    "--state",
    "open",
    "--json",
    "number,title,body,labels,state",
    "--limit",
    "100",
  ]);
  const all = JSON.parse(out) as GhIssue[];
  return all.filter((issue) => {
    const labels = issue.labels.map((l) => l.name);
    if (labels.includes("agent:pipeline")) return true;
    const { frontmatter } = parseFrontmatter(issue.body ?? "");
    return Boolean(frontmatter.agent_stage);
  });
}

export function getIssue(number: number): GhIssue {
  const out = gh([
    "issue",
    "view",
    String(number),
    "--repo",
    GITHUB_REPO,
    "--json",
    "number,title,body,labels,state",
  ]);
  return JSON.parse(out) as GhIssue;
}

export function createIssue(input: {
  title: string;
  body: string;
  labels: string[];
}): GhIssue {
  const args = [
    "issue",
    "create",
    "--repo",
    GITHUB_REPO,
    "--title",
    input.title,
    "--body",
    input.body,
  ];
  for (const label of input.labels) {
    args.push("--label", label);
  }
  const url = gh(args);
  const match = url.match(/\/issues\/(\d+)/);
  if (!match) {
    throw new Error(`Could not parse issue number from: ${url}`);
  }
  return getIssue(parseInt(match[1], 10));
}

export function commentIssue(number: number, body: string): void {
  gh([
    "issue",
    "comment",
    String(number),
    "--repo",
    GITHUB_REPO,
    "--body",
    body,
  ]);
}

export function setIssueLabels(number: number, labels: string[]): void {
  gh([
    "issue",
    "edit",
    String(number),
    "--repo",
    GITHUB_REPO,
    "--add-label",
    labels.join(","),
  ]);
}

export function replaceStageLabel(number: number, stage: string): void {
  const issue = getIssue(number);
  const currentLabels = issue.labels.map((l) => l.name);
  const stageLabels = currentLabels.filter((l) => l.startsWith("stage:"));
  const args = ["issue", "edit", String(number), "--repo", GITHUB_REPO];

  for (const old of stageLabels) {
    if (old !== stage) args.push("--remove-label", old);
  }
  if (!currentLabels.includes(stage)) args.push("--add-label", stage);

  if (args.length > 5) gh(args);
}

export function ensureLabel(name: string, color: string, description: string): boolean {
  const check = spawnSync(
    "gh",
    [
      "label",
      "list",
      "--repo",
      GITHUB_REPO,
      "--search",
      name,
      "--json",
      "name",
    ],
    { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }
  );
  if (check.status === 0) {
    try {
      const labels = JSON.parse(check.stdout) as { name: string }[];
      if (labels.some((label) => label.name === name)) return true;
    } catch {
      // Fall through to create; gh will return a clear error if this fails.
    }
  }

  const create = spawnSync(
    "gh",
    [
      "label",
      "create",
      name,
      "--repo",
      GITHUB_REPO,
      "--color",
      color,
      "--description",
      description,
    ],
    { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }
  );
  return create.status === 0;
}

export function updateIssueBody(number: number, body: string): void {
  gh([
    "issue",
    "edit",
    String(number),
    "--repo",
    GITHUB_REPO,
    "--body",
    body,
  ]);
}

export function updateIssueStage(number: number, stage: string): void {
  const issue = getIssue(number);
  const nextBody = mergeFrontmatter(issue.body ?? "", {
    agent_stage: stage.replace(/^stage:/, ""),
  });
  updateIssueBody(number, nextBody);

  const label = stage.startsWith("stage:") ? stage : `stage:${stage}`;
  if (ensureLabel(label, "BFDADC", "Agent pipeline stage")) {
    replaceStageLabel(number, label);
  }
}

export function updateIssueFlags(
  number: number,
  flags: {
    approvedSpec?: boolean;
    needsHuman?: boolean;
    reviewRetry?: number;
  }
): void {
  const issue = getIssue(number);
  const patch: Record<string, boolean | number | string> = {};
  if (flags.approvedSpec !== undefined)
    patch.agent_approved_spec = flags.approvedSpec;
  if (flags.needsHuman !== undefined) patch.agent_needs_human = flags.needsHuman;
  if (flags.reviewRetry !== undefined)
    patch.agent_review_retry = flags.reviewRetry;
  const nextBody = mergeFrontmatter(issue.body ?? "", patch);
  updateIssueBody(number, nextBody);

  if (flags.approvedSpec) {
    ensureLabel(APPROVED_SPEC_LABEL, "0E8A16", "Spec approved");
    setIssueLabels(number, [APPROVED_SPEC_LABEL]);
  }
  if (flags.needsHuman) {
    ensureLabel(NEEDS_HUMAN_LABEL, "D93F0B", "Needs human");
    setIssueLabels(number, [NEEDS_HUMAN_LABEL]);
  }
}

export function listPullRequestsForIssue(issueNumber: number): GhPullRequest[] {
  const branch = `agent/issue-${issueNumber}`;
  const out = gh([
    "pr",
    "list",
    "--repo",
    GITHUB_REPO,
    "--head",
    branch,
    "--state",
    "all",
    "--json",
    "number,state,mergedAt,headRefName,url",
    "--limit",
    "10",
  ]);
  const parsed = JSON.parse(out) as (Omit<GhPullRequest, "merged"> & {
    mergedAt: string | null;
  })[];
  return parsed.map((pr) => ({
    number: pr.number,
    state: pr.state,
    merged: pr.mergedAt !== null || pr.state === "MERGED",
    headRefName: pr.headRefName,
    url: pr.url,
  }));
}

export function createPullRequest(input: {
  title: string;
  body: string;
  head: string;
  base?: string;
  draft?: boolean;
}): GhPullRequest {
  const args = [
    "pr",
    "create",
    "--repo",
    GITHUB_REPO,
    "--title",
    input.title,
    "--body",
    input.body,
    "--head",
    input.head,
    "--base",
    input.base ?? "main",
  ];
  if (input.draft) args.push("--draft");
  const url = gh(args);
  const match = url.match(/\/pull\/(\d+)/);
  if (!match) throw new Error(`Could not parse PR number from: ${url}`);
  const out = gh([
    "pr",
    "view",
    String(match[1]),
    "--repo",
    GITHUB_REPO,
    "--json",
    "number,state,merged,headRefName,url",
  ]);
  return JSON.parse(out) as GhPullRequest;
}

export function getPullRequest(number: number): GhPullRequest {
  const out = gh([
    "pr",
    "view",
    String(number),
    "--repo",
    GITHUB_REPO,
    "--json",
    "number,state,merged,headRefName,url",
  ]);
  return JSON.parse(out) as GhPullRequest;
}

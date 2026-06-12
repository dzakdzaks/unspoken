import { parseFrontmatter } from "./frontmatter";

export const STAGE_LABEL_PREFIX = "stage:";

export const STAGES = [
  "backlog",
  "design",
  "spec",
  "in-progress",
  "review",
  "qa",
  "done",
] as const;

export type Stage = (typeof STAGES)[number];

export const APPROVED_SPEC_LABEL = "approved:spec";
export const NEEDS_HUMAN_LABEL = "needs:human";
export const REVIEW_RETRY_PREFIX = "retry:review:";

export const ALL_PIPELINE_LABELS = [
  ...STAGES.map((s) => stageLabel(s)),
  APPROVED_SPEC_LABEL,
  NEEDS_HUMAN_LABEL,
  "agent:pipeline",
] as const;

export function stageLabel(stage: Stage): string {
  return `${STAGE_LABEL_PREFIX}${stage}`;
}

export function parseStage(labels: string[]): Stage | null {
  const match = labels.find((l) => l.startsWith(STAGE_LABEL_PREFIX));
  if (!match) return null;
  const stage = match.slice(STAGE_LABEL_PREFIX.length) as Stage;
  return STAGES.includes(stage) ? stage : null;
}

export function getReviewRetryCount(labels: string[]): number {
  const match = labels.find((l) => l.startsWith(REVIEW_RETRY_PREFIX));
  if (!match) return 0;
  return parseInt(match.slice(REVIEW_RETRY_PREFIX.length), 10) || 0;
}

export function reviewRetryLabel(count: number): string {
  return `${REVIEW_RETRY_PREFIX}${count}`;
}

export interface IssueContext {
  number: number;
  title: string;
  body: string;
  labels: string[];
  stage: Stage | null;
  hasApprovedSpec: boolean;
  needsHuman: boolean;
  reviewRetryCount: number;
}

export function buildIssueContext(issue: {
  number: number;
  title: string;
  body: string;
  labels: { name: string }[];
}): IssueContext {
  const labels = issue.labels.map((l) => l.name);
  const { frontmatter, content } = parseFrontmatter(issue.body ?? "");

  const stageFromLabel = parseStage(labels);
  const stageFromFm = frontmatter.agent_stage as Stage | undefined;
  const stage =
    stageFromLabel ??
    (stageFromFm && STAGES.includes(stageFromFm as Stage)
      ? (stageFromFm as Stage)
      : null);

  return {
    number: issue.number,
    title: issue.title,
    body: content,
    labels,
    stage,
    hasApprovedSpec:
      labels.includes(APPROVED_SPEC_LABEL) ||
      frontmatter.agent_approved_spec === true,
    needsHuman:
      labels.includes(NEEDS_HUMAN_LABEL) ||
      frontmatter.agent_needs_human === true,
    reviewRetryCount:
      getReviewRetryCount(labels) || frontmatter.agent_review_retry || 0,
  };
}

export type RoleId =
  | "pm"
  | "designer"
  | "architect"
  | "engineer"
  | "reviewer"
  | "qa"
  | "automation-qa";

export interface StageRoute {
  role: RoleId;
  blocked?: boolean;
  blockedReason?: string;
}

export function routeStage(
  ctx: IssueContext,
  artifacts: { hasSpec: boolean; hasTestPlan: boolean }
): StageRoute | null {
  if (ctx.needsHuman) return null;
  if (!ctx.stage) return null;

  switch (ctx.stage) {
    case "backlog":
      return { role: "pm" };
    case "design":
      return { role: "designer" };
    case "spec":
      if (!artifacts.hasSpec) return { role: "architect" };
      if (!ctx.hasApprovedSpec) {
        return {
          role: "architect",
          blocked: true,
          blockedReason:
            "Spec written. Waiting for human to add approved:spec label.",
        };
      }
      return { role: "engineer" };
    case "in-progress":
      return { role: "engineer" };
    case "review":
      return { role: "reviewer" };
    case "qa":
      if (!artifacts.hasTestPlan) return { role: "qa" };
      return { role: "automation-qa" };
    case "done":
      return null;
    default:
      return null;
  }
}

export function nextStageAfterRole(
  role: RoleId,
  outcome: "success" | "changes-requested"
): Stage | null {
  switch (role) {
    case "pm":
      return "design";
    case "designer":
      return "spec";
    case "architect":
      return "spec";
    case "engineer":
      return "review";
    case "reviewer":
      return outcome === "changes-requested" ? "in-progress" : "qa";
    case "qa":
      return "qa";
    case "automation-qa":
      return "qa";
    default:
      return null;
  }
}

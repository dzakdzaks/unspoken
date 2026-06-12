import type { RoleHandler } from "./types";
import type { IssueContext } from "../lib/stages";
import { artifactPath } from "../lib/artifacts";
import { worktreeBranch } from "../lib/config";
import {
  listPullRequestsForIssue,
  createPullRequest,
} from "../lib/github";
import { verifyEngineer, verifyAutomationQa } from "../lib/verify";
import { existsSync } from "fs";

function issueHeader(ctx: IssueContext): string {
  return `Issue #${ctx.number}: ${ctx.title}\n\n${ctx.body}`;
}

export const pmRole: RoleHandler = {
  id: "pm",
  usesWorktree: false,
  buildPrompt(ctx) {
    return `${issueHeader(ctx)}

Write requirements to: ${artifactPath(ctx.number, "requirements")}

Read PRD.md at repo root for product context.`;
  },
};

export const designerRole: RoleHandler = {
  id: "designer",
  usesWorktree: false,
  buildPrompt(ctx) {
    return `${issueHeader(ctx)}

Requirements: ${artifactPath(ctx.number, "requirements")}
Write design to: ${artifactPath(ctx.number, "design")}

Read DESIGN.MD at repo root for design system context.`;
  },
};

export const architectRole: RoleHandler = {
  id: "architect",
  usesWorktree: false,
  buildPrompt(ctx) {
    return `${issueHeader(ctx)}

Requirements: ${artifactPath(ctx.number, "requirements")}
Design: ${artifactPath(ctx.number, "design")}
Write spec to: ${artifactPath(ctx.number, "spec")}

After writing spec, comment on the issue that spec is ready and awaiting human approval (approved:spec label).`;
  },
};

export const engineerRole: RoleHandler = {
  id: "engineer",
  usesWorktree: true,
  buildPrompt(ctx) {
    const branch = worktreeBranch(ctx.number);
    return `${issueHeader(ctx)}

Spec: ${artifactPath(ctx.number, "spec")}
Requirements: ${artifactPath(ctx.number, "requirements")}
Design: ${artifactPath(ctx.number, "design")}

Implement in this worktree. Branch: ${branch}
Push and open a draft PR linked to issue #${ctx.number}.`;
  },
  async preCheck(ctx, cwd) {
    const prs = listPullRequestsForIssue(ctx.number);
    const openPr = prs.find((p) => p.state === "OPEN" && !p.merged);
    if (!openPr) return null;

    const checks = verifyEngineer(cwd);
    const failed = checks.filter((c) => !c.ok);
    if (failed.length > 0) return null;

    return {
      success: true,
      outcome: "success",
      message: `Engineer work already complete (PR ${openPr.url}); skipping re-run.`,
    };
  },
  async postCheck(ctx, cwd) {
    const checks = verifyEngineer(cwd);
    const failed = checks.filter((c) => !c.ok);
    if (failed.length > 0) {
      return {
        success: false,
        message: `Engineer verification failed:\n${failed.map((f) => `${f.command}: ${f.output}`).join("\n")}`,
      };
    }

    const specPath = artifactPath(ctx.number, "spec");
    if (!existsSync(specPath)) {
      return {
        success: false,
        message: "Spec artifact missing after engineer run.",
      };
    }

    let prs = listPullRequestsForIssue(ctx.number);
    if (prs.length === 0) {
      const branch = worktreeBranch(ctx.number);
      try {
        createPullRequest({
          title: `[agent] ${ctx.title}`,
          body: `Automated implementation for #${ctx.number}.\n\nCloses #${ctx.number}`,
          head: branch,
          draft: true,
        });
        prs = listPullRequestsForIssue(ctx.number);
      } catch {
        return {
          success: false,
          message:
            "Lint/build passed but no PR found. Engineer must push branch and open draft PR.",
        };
      }
    }

    if (prs.length === 0) {
      return {
        success: false,
        message: "Could not create or find PR for issue.",
      };
    }

    return {
      success: true,
      outcome: "success",
      message: `Engineer done. PR: ${prs[0].url}`,
    };
  },
};

export const reviewerRole: RoleHandler = {
  id: "reviewer",
  usesWorktree: true,
  buildPrompt(ctx) {
    const prs = listPullRequestsForIssue(ctx.number);
    const prInfo =
      prs.length > 0
        ? `PR #${prs[0].number}: ${prs[0].url}`
        : "No PR found — review will fail.";

    return `${issueHeader(ctx)}

Spec: ${artifactPath(ctx.number, "spec")}
Requirements: ${artifactPath(ctx.number, "requirements")}
${prInfo}

Review the PR diff against spec and requirements.
Post review comment with APPROVE or REQUEST CHANGES.`;
  },
  parseOutcome(agentResult) {
    const lower = agentResult.toLowerCase();
    if (
      lower.includes("request changes") ||
      lower.includes("changes requested")
    ) {
      return {
        success: true,
        outcome: "changes-requested",
        message: "Reviewer requested changes.",
      };
    }
    if (lower.includes("approve")) {
      return {
        success: true,
        outcome: "success",
        message: "Reviewer approved.",
      };
    }
    return {
      success: true,
      outcome: "success",
      message: "Review completed (defaulting to approve).",
    };
  },
};

export const qaRole: RoleHandler = {
  id: "qa",
  usesWorktree: true,
  buildPrompt(ctx) {
    return `${issueHeader(ctx)}

Requirements: ${artifactPath(ctx.number, "requirements")}
Spec: ${artifactPath(ctx.number, "spec")}
Write test plan to: ${artifactPath(ctx.number, "testPlan")}`;
  },
};

export const automationQaRole: RoleHandler = {
  id: "automation-qa",
  usesWorktree: true,
  buildPrompt(ctx) {
    return `${issueHeader(ctx)}

Test plan: ${artifactPath(ctx.number, "testPlan")}
Spec: ${artifactPath(ctx.number, "spec")}

Implement automated tests and ensure bun run test passes.`;
  },
  async postCheck(_ctx, cwd) {
    const checks = verifyAutomationQa(cwd);
    const failed = checks.filter((c) => !c.ok);
    if (failed.length > 0) {
      return {
        success: false,
        message: `Test verification failed:\n${failed.map((f) => `${f.command}: ${f.output}`).join("\n")}`,
      };
    }
    return {
      success: true,
      outcome: "success",
      message: "All automated tests pass. Ready for human merge.",
      skipTransition: true,
    };
  },
};

export const ROLE_HANDLERS: Record<string, RoleHandler> = {
  pm: pmRole,
  designer: designerRole,
  architect: architectRole,
  engineer: engineerRole,
  reviewer: reviewerRole,
  qa: qaRole,
  "automation-qa": automationQaRole,
};

export function getRoleHandler(roleId: string): RoleHandler {
  const handler = ROLE_HANDLERS[roleId];
  if (!handler) throw new Error(`Unknown role: ${roleId}`);
  return handler;
}

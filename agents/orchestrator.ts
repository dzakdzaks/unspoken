import {
  listPipelineIssues,
  commentIssue,
  listPullRequestsForIssue,
  ghAvailable,
  GhError,
  updateIssueStage,
  updateIssueFlags,
} from "./lib/github";
import {
  routeStage,
  nextStageAfterRole,
  stageLabel,
  buildIssueContext,
  type IssueContext,
} from "./lib/stages";
import { getArtifactState } from "./lib/artifacts";
import { runRole } from "./lib/cursor";
import { getRoleHandler } from "./roles";
import { resolveCwd, syncWorktreeArtifacts } from "./lib/worktree";
import { MAX_REVIEW_RETRIES } from "./lib/config";
import { isMainModule } from "./lib/runtime";

export interface TickOptions {
  dryRun?: boolean;
  issueNumber?: number;
}

export interface TickResult {
  processed: number;
  skipped: number;
  errors: string[];
}

async function processIssue(
  ctx: IssueContext,
  dryRun: boolean
): Promise<{ status: "processed" | "skipped" | "error"; message: string }> {
  if (ctx.stage === "done") {
    return { status: "skipped", message: `#${ctx.number} already done` };
  }

  if (ctx.stage === "qa") {
    const prs = listPullRequestsForIssue(ctx.number);
    const merged = prs.find((p) => p.merged);
    if (merged) {
      if (!dryRun) {
        updateIssueStage(ctx.number, "done");
        commentIssue(
          ctx.number,
          `PR #${merged.number} merged. Moving to **stage:done**.`
        );
      }
      return {
        status: "processed",
        message: `#${ctx.number} PR merged → done`,
      };
    }
  }

  const artifacts = getArtifactState(ctx.number);
  const route = routeStage(ctx, {
    hasSpec: artifacts.hasSpec,
    hasTestPlan: artifacts.hasTestPlan,
  });

  if (!route) {
    return { status: "skipped", message: `#${ctx.number} no route` };
  }

  if (route.blocked) {
    return {
      status: "skipped",
      message: `#${ctx.number} blocked: ${route.blockedReason}`,
    };
  }

  const handler = getRoleHandler(route.role);

  if (ctx.stage === "spec" && ctx.hasApprovedSpec && artifacts.hasSpec) {
    if (!dryRun) {
      updateIssueStage(ctx.number, "in-progress");
    }
  }

  const cwd = resolveCwd(route.role, ctx.number, handler.usesWorktree);
  if (handler.usesWorktree) {
    syncWorktreeArtifacts(ctx.number);
  }

  console.log(`\n→ Issue #${ctx.number} | stage:${ctx.stage} | role:${route.role}`);

  let execution: {
    success: boolean;
    outcome?: "success" | "changes-requested";
    message: string;
    skipTransition?: boolean;
  } | null = null;

  if (handler.preCheck && !dryRun) {
    const pre = await handler.preCheck(ctx, cwd);
    if (pre) {
      console.log(`  preCheck short-circuit: ${pre.message}`);
      execution = pre;
    }
  }

  if (!execution) {
    const agentResult = await runRole({
      roleId: route.role,
      prompt: handler.buildPrompt(ctx),
      cwd,
      dryRun,
    });

    if (agentResult.status === "error") {
      const prefix = agentResult.startupError ? "Startup error" : "Run error";
      return {
        status: "error",
        message: `#${ctx.number} ${prefix}: ${agentResult.result}`,
      };
    }

    console.log(`  run=${agentResult.runId} agent=${agentResult.agentId ?? "n/a"}`);

    execution = handler.parseOutcome
      ? handler.parseOutcome(agentResult.result)
      : {
          success: true,
          outcome: "success" as const,
          message: `${route.role} completed.`,
        };

    if (handler.postCheck) {
      const check = await handler.postCheck(ctx, cwd);
      if (check) execution = check;
    }
  }

  if (!execution.success) {
    return { status: "error", message: `#${ctx.number} ${execution.message}` };
  }

  if (execution.skipTransition) {
    if (!dryRun) {
      commentIssue(ctx.number, execution.message);
    }
    return { status: "processed", message: `#${ctx.number} ${execution.message}` };
  }

  const outcome = execution.outcome ?? "success";
  let nextStage = nextStageAfterRole(route.role, outcome);

  if (route.role === "reviewer" && outcome === "changes-requested") {
    const nextRetry = ctx.reviewRetryCount + 1;
    if (nextRetry > MAX_REVIEW_RETRIES) {
      if (!dryRun) {
        updateIssueFlags(ctx.number, { needsHuman: true });
        commentIssue(
          ctx.number,
          `Review retry limit (${MAX_REVIEW_RETRIES}) exceeded. Added **needs:human**.`
        );
      }
      return {
        status: "processed",
        message: `#${ctx.number} review retries exceeded → needs:human`,
      };
    }
    if (!dryRun) {
      updateIssueFlags(ctx.number, { reviewRetry: nextRetry });
    }
  }

  if (route.role === "architect") {
    nextStage = "spec";
  }

  if (nextStage && ctx.stage !== nextStage) {
    if (!dryRun) {
      updateIssueStage(ctx.number, nextStage);
      commentIssue(
        ctx.number,
        `**${route.role}** complete. Advanced to **${stageLabel(nextStage)}**.\n\n${execution.message}`
      );
    }
  } else if (!dryRun) {
    commentIssue(ctx.number, `**${route.role}** complete.\n\n${execution.message}`);
  }

  return {
    status: "processed",
    message: `#${ctx.number} ${route.role} → ${nextStage ?? ctx.stage}`,
  };
}

export async function tick(options: TickOptions = {}): Promise<TickResult> {
  const { dryRun = false, issueNumber } = options;
  const result: TickResult = { processed: 0, skipped: 0, errors: [] };

  if (!dryRun && !ghAvailable()) {
    throw new GhError(
      "GitHub CLI not authenticated. Run: gh auth login",
      1,
      "gh auth status failed"
    );
  }

  let issues;
  if (issueNumber) {
    const { getIssue } = await import("./lib/github");
    if (dryRun) {
      try {
        issues = [getIssue(issueNumber)];
      } catch {
        console.log(
          `[dry-run] Could not fetch issue #${issueNumber}; using mock context`
        );
        issues = [
          {
            number: issueNumber,
            title: "Dry run test issue",
            body: "Test body for pipeline dry-run.",
            labels: [{ name: "agent:pipeline" }, { name: "stage:backlog" }],
            state: "OPEN",
          },
        ];
      }
    } else {
      issues = [getIssue(issueNumber)];
    }
  } else {
    issues = dryRun ? [] : listPipelineIssues();
  }

  for (const issue of issues) {
    const ctx = buildIssueContext(issue);
    try {
      const outcome = await processIssue(ctx, dryRun);
      if (outcome.status === "processed") result.processed++;
      else if (outcome.status === "skipped") result.skipped++;
      else {
        result.errors.push(outcome.message);
      }
      console.log(`  ${outcome.message}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`#${issue.number}: ${msg}`);
      console.error(`  ERROR: ${msg}`);
    }
  }

  return result;
}

export async function watch(options: Omit<TickOptions, "issueNumber"> = {}) {
  const { WATCH_INTERVAL_MS } = await import("./lib/config");
  console.log(`Watching pipeline every ${WATCH_INTERVAL_MS / 1000}s…`);
  for (;;) {
    const result = await tick(options);
    console.log(
      `\nTick: processed=${result.processed} skipped=${result.skipped} errors=${result.errors.length}`
    );
    await new Promise((r) => setTimeout(r, WATCH_INTERVAL_MS));
  }
}

function parseArgs(): {
  dryRun: boolean;
  watch: boolean;
  issueNumber?: number;
} {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    watch: args.includes("--watch"),
    issueNumber: (() => {
      const idx = args.indexOf("--issue");
      if (idx === -1 || !args[idx + 1]) return undefined;
      return parseInt(args[idx + 1], 10);
    })(),
  };
}

if (isMainModule(import.meta.url)) {
  const { dryRun, watch: doWatch, issueNumber } = parseArgs();
  if (doWatch) {
    watch({ dryRun }).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  } else {
    tick({ dryRun, issueNumber })
      .then((r) => {
        console.log(
          `\nDone: processed=${r.processed} skipped=${r.skipped} errors=${r.errors.length}`
        );
        if (r.errors.length > 0) process.exit(2);
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }
}

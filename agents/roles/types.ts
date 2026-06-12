import type { IssueContext, RoleId } from "../lib/stages";

export interface RoleExecutionResult {
  success: boolean;
  outcome?: "success" | "changes-requested";
  message: string;
  skipTransition?: boolean;
}

export interface RoleHandler {
  id: RoleId;
  usesWorktree: boolean;
  buildPrompt(ctx: IssueContext): string;
  preCheck?(
    ctx: IssueContext,
    cwd: string
  ): Promise<RoleExecutionResult | null>;
  postCheck?(
    ctx: IssueContext,
    cwd: string
  ): Promise<RoleExecutionResult | null>;
  parseOutcome?(agentResult: string): RoleExecutionResult;
}

export function defaultParseOutcome(agentResult: string): RoleExecutionResult {
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
  return {
    success: true,
    outcome: "success",
    message: "Role completed successfully.",
  };
}

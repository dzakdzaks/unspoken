import { readFileSync, existsSync } from "fs";
import { Agent, CursorAgentError } from "@cursor/sdk";
import { MODELS, requireCursorApiKey, skillsPath } from "./config";
import type { RoleId } from "./stages";

export interface RunRoleOptions {
  roleId: RoleId;
  prompt: string;
  cwd: string;
  dryRun?: boolean;
  model?: string;
}

export interface RunRoleResult {
  status: "finished" | "error";
  result: string;
  runId: string;
  agentId?: string;
  startupError?: boolean;
}

export function loadSkill(roleId: RoleId): string {
  const path = skillsPath(roleId);
  if (!existsSync(path)) {
    throw new Error(`Missing skill playbook: ${path}`);
  }
  return readFileSync(path, "utf-8");
}

export function buildRolePrompt(
  roleId: RoleId,
  taskPrompt: string
): string {
  const skill = loadSkill(roleId);
  return `# Role playbook\n\n${skill}\n\n---\n\n# Current task\n\n${taskPrompt}`;
}

const NETWORK_ERROR_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "ECONNREFUSED",
]);

const MAX_STARTUP_ATTEMPTS = 3;

function isRetryableStartupError(err: unknown): boolean {
  if (err instanceof CursorAgentError) return err.isRetryable;
  if (!(err instanceof Error)) return false;

  const code = (err as NodeJS.ErrnoException).code;
  return Boolean(code && NETWORK_ERROR_CODES.has(code));
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as NodeJS.ErrnoException).code;
    return code ? `${err.message} (${code})` : err.message;
  }
  return String(err);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runRole(options: RunRoleOptions): Promise<RunRoleResult> {
  const { roleId, prompt, cwd, dryRun = false, model = MODELS.default } =
    options;

  const fullPrompt = buildRolePrompt(roleId, prompt);

  if (dryRun) {
    console.log(`[dry-run] ${roleId} @ ${cwd}`);
    console.log(fullPrompt.slice(0, 500) + "...");
    return {
      status: "finished",
      result: `[dry-run] ${roleId} completed`,
      runId: "dry-run",
    };
  }

  const apiKey = requireCursorApiKey(false);

  for (let attempt = 1; attempt <= MAX_STARTUP_ATTEMPTS; attempt++) {
    try {
      const result = await Agent.prompt(fullPrompt, {
        apiKey,
        model: { id: model },
        local: {
          cwd,
          settingSources: [],
        },
      });

      if (result.status === "error") {
        return {
          status: "error",
          result: result.result ?? "Agent run failed",
          runId: result.id ?? "unknown",
        };
      }

      return {
        status: "finished",
        result: result.result ?? "",
        runId: result.id ?? "unknown",
      };
    } catch (err) {
      const retryable = isRetryableStartupError(err);
      if (retryable && attempt < MAX_STARTUP_ATTEMPTS) {
        const delayMs = 1_000 * attempt;
        console.warn(
          `Cursor SDK startup failed for ${roleId} (attempt ${attempt}/${MAX_STARTUP_ATTEMPTS}): ${errorMessage(
            err
          )}. Retrying in ${delayMs}ms...`
        );
        await sleep(delayMs);
        continue;
      }

      return {
        status: "error",
        result: `Cursor SDK startup failed after ${attempt} attempt(s): ${errorMessage(
          err
        )}`,
        runId: "startup-error",
        startupError: true,
      };
    }
  }

  return {
    status: "error",
    result: "Cursor SDK startup failed without an error",
    runId: "startup-error",
    startupError: true,
  };
}

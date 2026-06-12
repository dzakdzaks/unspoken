import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const LIB_DIR = dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = join(LIB_DIR, "..");
export const REPO_ROOT = join(AGENTS_DIR, "..");

export const GITHUB_REPO = process.env.GITHUB_REPO ?? "dzakdzaks/unspoken";
export const CURSOR_API_KEY =
  process.env.CURSOR_API_KEY ?? loadEnvLocal("CURSOR_API_KEY");

export const MAX_REVIEW_RETRIES = 3;
export const MAX_CONCURRENT_WORKTREES = 5;
export const WATCH_INTERVAL_MS = 60_000;

export const MODELS = {
  default: "composer-2.5",
  triage: "composer-2.5",
} as const;

function loadEnvLocal(key: string): string | undefined {
  const envPath = join(REPO_ROOT, ".env.local");
  if (!existsSync(envPath)) return undefined;

  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    if (k !== key) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return undefined;
}

export function requireCursorApiKey(dryRun: boolean): string {
  if (dryRun) return "dry-run-key";
  if (!CURSOR_API_KEY) {
    throw new Error(
      "CURSOR_API_KEY is required. Add it to .env.local or export it."
    );
  }
  return CURSOR_API_KEY;
}

export function artifactDir(issueNumber: number): string {
  return join(REPO_ROOT, ".agent-workspace", String(issueNumber));
}

export function worktreesRoot(): string {
  return join(REPO_ROOT, ".agent-worktrees");
}

export function worktreePath(issueNumber: number): string {
  return join(worktreesRoot(), `issue-${issueNumber}`);
}

export function worktreeBranch(issueNumber: number): string {
  return `agent/issue-${issueNumber}`;
}

export function skillsPath(roleId: string): string {
  return join(AGENTS_DIR, "skills", `${roleId}.md`);
}

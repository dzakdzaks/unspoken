import { cpSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
import {
  REPO_ROOT,
  artifactDir,
  worktreeBranch,
  worktreePath,
  worktreesRoot,
  MAX_CONCURRENT_WORKTREES,
} from "./config";
import { listPipelineIssues } from "./github";

function git(args: string[], cwd = REPO_ROOT): void {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${result.stderr?.trim() ?? "unknown error"}`
    );
  }
}

function countWorktrees(): number {
  if (!existsSync(worktreesRoot())) return 0;
  return spawnSync("git", ["worktree", "list"], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  })
    .stdout.split("\n")
    .filter((line) => line.includes(".agent-worktrees/")).length;
}

export function ensureWorktree(issueNumber: number): string {
  const path = worktreePath(issueNumber);
  const branch = worktreeBranch(issueNumber);

  if (existsSync(path)) return path;

  if (countWorktrees() >= MAX_CONCURRENT_WORKTREES) {
    throw new Error(
      `Max concurrent worktrees (${MAX_CONCURRENT_WORKTREES}) reached. Finish or remove an active issue first.`
    );
  }

  mkdirSync(worktreesRoot(), { recursive: true });

  const branchExists =
    spawnSync("git", ["show-ref", "--verify", `refs/heads/${branch}`], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    }).status === 0;

  if (branchExists) {
    git(["worktree", "add", path, branch]);
  } else {
    git(["worktree", "add", "-b", branch, path, "main"]);
  }

  return path;
}

export function removeWorktree(issueNumber: number): void {
  const path = worktreePath(issueNumber);
  if (!existsSync(path)) return;
  git(["worktree", "remove", "--force", path]);
}

export function resolveCwd(
  role: string,
  issueNumber: number,
  useWorktree: boolean
): string {
  if (!useWorktree) return REPO_ROOT;
  return ensureWorktree(issueNumber);
}

export function syncWorktreeArtifacts(issueNumber: number): void {
  const wt = worktreePath(issueNumber);
  if (!existsSync(wt)) return;

  const source = artifactDir(issueNumber);
  if (!existsSync(source)) return;

  const dest = join(wt, ".agent-workspace", String(issueNumber));
  mkdirSync(dest, { recursive: true });
  cpSync(source, dest, { recursive: true });
}

export function listActiveWorktreeIssues(): number[] {
  const issues = listPipelineIssues();
  return issues
    .map((i) => i.number)
    .filter((n) => existsSync(worktreePath(n)));
}

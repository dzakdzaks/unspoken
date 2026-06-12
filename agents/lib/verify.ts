import { spawnSync } from "child_process";

export interface VerifyResult {
  ok: boolean;
  command: string;
  output: string;
}

function run(command: string[], cwd: string): VerifyResult {
  const result = spawnSync("bun", command, {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
  return {
    ok: result.status === 0,
    command: `bun ${command.join(" ")}`,
    output: output.trim(),
  };
}

export function verifyLint(cwd: string): VerifyResult {
  return run(["run", "lint"], cwd);
}

export function verifyBuild(cwd: string): VerifyResult {
  return run(["run", "build"], cwd);
}

export function verifyTest(cwd: string): VerifyResult {
  return run(["run", "test"], cwd);
}

export function verifyEngineer(cwd: string): VerifyResult[] {
  return [verifyLint(cwd), verifyBuild(cwd)];
}

export function verifyAutomationQa(cwd: string): VerifyResult[] {
  return [verifyTest(cwd)];
}

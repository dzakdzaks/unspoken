import { existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import { artifactDir } from "./config";

export interface ArtifactState {
  hasRequirements: boolean;
  hasDesign: boolean;
  hasSpec: boolean;
  hasTestPlan: boolean;
}

const FILES = {
  requirements: "requirements.md",
  design: "design.md",
  spec: "spec.md",
  testPlan: "test-plan.md",
} as const;

export function ensureArtifactDir(issueNumber: number): string {
  const dir = artifactDir(issueNumber);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function artifactPath(
  issueNumber: number,
  file: keyof typeof FILES
): string {
  return join(ensureArtifactDir(issueNumber), FILES[file]);
}

export function readArtifact(
  issueNumber: number,
  file: keyof typeof FILES
): string | null {
  const path = artifactPath(issueNumber, file);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf-8");
}

export function getArtifactState(issueNumber: number): ArtifactState {
  const dir = artifactDir(issueNumber);
  const exists = (name: string) => existsSync(join(dir, name));
  return {
    hasRequirements: exists(FILES.requirements),
    hasDesign: exists(FILES.design),
    hasSpec: exists(FILES.spec),
    hasTestPlan: exists(FILES.testPlan),
  };
}

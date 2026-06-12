import { resolve } from "path";
import { fileURLToPath } from "url";

export function isMainModule(metaUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return resolve(entry) === fileURLToPath(metaUrl);
}

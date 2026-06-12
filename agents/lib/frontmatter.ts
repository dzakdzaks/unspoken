export interface IssueFrontmatter {
  agent_stage?: string;
  agent_approved_spec?: boolean;
  agent_needs_human?: boolean;
  agent_review_retry?: number;
}

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?/;

export function parseFrontmatter(body: string): {
  frontmatter: IssueFrontmatter;
  content: string;
} {
  const match = body.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, content: body };
  }

  const frontmatter: IssueFrontmatter = {};
  for (const line of match[1].split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colon = trimmed.indexOf(":");
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    const raw = trimmed.slice(colon + 1).trim();
    if (key === "agent_stage") frontmatter.agent_stage = raw;
    if (key === "agent_approved_spec")
      frontmatter.agent_approved_spec = raw === "true";
    if (key === "agent_needs_human")
      frontmatter.agent_needs_human = raw === "true";
    if (key === "agent_review_retry")
      frontmatter.agent_review_retry = parseInt(raw, 10) || 0;
  }

  return {
    frontmatter,
    content: body.slice(match[0].length),
  };
}

export function stringifyFrontmatter(fm: IssueFrontmatter): string {
  const lines = ["---"];
  if (fm.agent_stage !== undefined) lines.push(`agent_stage: ${fm.agent_stage}`);
  if (fm.agent_approved_spec !== undefined)
    lines.push(`agent_approved_spec: ${fm.agent_approved_spec}`);
  if (fm.agent_needs_human !== undefined)
    lines.push(`agent_needs_human: ${fm.agent_needs_human}`);
  if (fm.agent_review_retry !== undefined)
    lines.push(`agent_review_retry: ${fm.agent_review_retry}`);
  lines.push("---", "");
  return lines.join("\n");
}

export function mergeFrontmatter(
  body: string,
  patch: Partial<IssueFrontmatter>
): string {
  const { frontmatter, content } = parseFrontmatter(body);
  const merged = { ...frontmatter, ...patch };
  return stringifyFrontmatter(merged) + content;
}

export function stageFromFrontmatter(fm: IssueFrontmatter): string | null {
  return fm.agent_stage ?? null;
}

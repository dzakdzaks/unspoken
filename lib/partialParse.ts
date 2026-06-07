export type PartialResult = {
  raw_input?: string;
  translation?: string;
  translationPartial?: string;
  underlying_need?: string;
  urgency_level?: number;
  action_plan?: string[];
};

function unescapeJson(s: string): string {
  return s
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}

function extractCompleteString(text: string, field: string): string | undefined {
  const m = text.match(new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\[\\s\\S])*?)"`));
  return m ? unescapeJson(m[1]) : undefined;
}

function extractPartialString(text: string, field: string): string | undefined {
  // Only extract partial if the field is in progress (opening quote found, closing quote not yet)
  const openMatch = text.match(new RegExp(`"${field}"\\s*:\\s*"([\\s\\S]*)$`));
  if (!openMatch) return undefined;
  // Strip any trailing characters that look like the rest of JSON
  // The capture is everything after the opening quote to end of accumulated text
  return unescapeJson(openMatch[1]);
}

export function parsePartialTranslation(rawText: string): PartialResult {
  const result: PartialResult = {};

  result.raw_input = extractCompleteString(rawText, 'raw_input');

  // Translation: show partial streaming text while the field is being written
  const translation = extractCompleteString(rawText, 'translation');
  if (translation !== undefined) {
    result.translation = translation;
  } else {
    result.translationPartial = extractPartialString(rawText, 'translation');
  }

  result.underlying_need = extractCompleteString(rawText, 'underlying_need');

  const urgencyMatch = rawText.match(/"urgency_level"\s*:\s*(\d)/);
  if (urgencyMatch) result.urgency_level = parseInt(urgencyMatch[1], 10);

  // Try the complete closed array first, then fall back to an unclosed one
  // so action plan items appear incrementally during streaming.
  const planMatch =
    rawText.match(/"action_plan"\s*:\s*\[([\s\S]*?)\]/) ??
    rawText.match(/"action_plan"\s*:\s*\[([\s\S]*)$/);
  if (planMatch) {
    const items = [...planMatch[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)];
    if (items.length) result.action_plan = items.map((m) => unescapeJson(m[1]));
  }

  return result;
}

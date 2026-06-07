import { GoogleGenAI } from "@google/genai";

interface CacheEntry {
  name: string;
  expiresAt: number;
}

const GEMINI_CACHE_TTL_MS = 55 * 60 * 1000;
const geminiPromptCaches = new Map<string, CacheEntry>();

/**
 * Best-effort Gemini context cache for immutable system instructions.
 * Falls back to undefined when caching is unavailable (e.g. below min token size).
 */
export async function resolveGeminiCachedContent(
  client: GoogleGenAI,
  model: string,
  systemPrompt: string,
  cacheKey: string
): Promise<string | undefined> {
  const storeKey = `${model}:${cacheKey}`;
  const existing = geminiPromptCaches.get(storeKey);
  if (existing && existing.expiresAt > Date.now()) {
    return existing.name;
  }

  try {
    const cache = await client.caches.create({
      model,
      config: {
        systemInstruction: systemPrompt,
        contents: [{ role: "user", parts: [{ text: "Context cache bootstrap." }] }],
        ttl: "3600s",
        displayName: `unspoken-${cacheKey}`,
      },
    });

    if (!cache.name) return undefined;

    geminiPromptCaches.set(storeKey, {
      name: cache.name,
      expiresAt: Date.now() + GEMINI_CACHE_TTL_MS,
    });
    return cache.name;
  } catch {
    return undefined;
  }
}

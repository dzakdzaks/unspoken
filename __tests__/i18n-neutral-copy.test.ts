import { describe, it, expect } from "vitest";
import { translations } from "@/lib/i18n/translations";
import { TranslateRequestSchema } from "@/lib/schema";
import { getSystemPrompt, getSuggestionsSystemPrompt } from "@/lib/prompt";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SHE_HER_PATTERN = /\b(she|her)\b/i;
const GENDERED_PROMPT_PATTERN = /text her|she's still/i;

function collectStringValues(obj: unknown): string[] {
  if (typeof obj === "string") return [obj];
  if (Array.isArray(obj)) return obj.flatMap(collectStringValues);
  if (obj !== null && typeof obj === "object") {
    return Object.values(obj).flatMap(collectStringValues);
  }
  return [];
}

function collectKeyPaths(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object" || typeof obj === "function") {
    return prefix ? [prefix] : [];
  }
  if (Array.isArray(obj)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return collectKeyPaths(value, path);
    }
    return [path];
  });
}

const EN_SCOPED_KEYS: Record<string, string> = {
  "meta.title": "Unspoken — Decode What They Really Meant",
  "meta.ogDescription": "Finally understand what your partner really meant.",
  "header.tagline":
    "Type what your partner said. Find out what they really meant.",
  "input.label": "What'd they say or do?",
  "input.ariaLabel": "Describe what your partner said or did",
  "results.decodedSignal": "What They Really Meant",
  "results.underlyingNeed": "What They Actually Need",
  "streaming.phase.decoding": "Unpacking what they meant...",
  "streaming.phase.identifying": "Finding what they need...",
  "urgency.1.desc":
    "No tension here. They're being straight with you — relax, nothing to worry about.",
  "urgency.3.label": "Check in with them",
  "urgency.3.desc":
    "Something's off. They've got a need that's going unmet — better address it soon before it snowballs.",
  "urgency.5.desc":
    "They've hit their limit. Stop what you're doing and deal with this right now — this can't wait.",
  "errors.emptyInput": "Tell me what they said or did first!",
};

const ID_SCOPED_KEYS: Record<string, string> = {
  "input.label": "Pasanganmu bilang atau ngelakuin apa?",
  "input.ariaLabel": "Ceritain apa yang pasanganmu bilang atau lakuin",
  "results.underlyingNeed": "Yang Sebenarnya Dibutuhkan",
  "streaming.phase.identifying": "Cari tahu apa yang pasanganmu butuhin...",
  "errors.emptyInput":
    "Ceritain dulu dong apa yang pasanganmu bilang atau lakuin!",
};

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

describe("Issue #4 — neutral decode dashboard copy", () => {
  describe("AT-01 — EN scoped keys have zero she/her", () => {
    for (const [path, expected] of Object.entries(EN_SCOPED_KEYS)) {
      it(`${path} matches spec`, () => {
        expect(getByPath(translations.en as Record<string, unknown>, path)).toBe(
          expected
        );
      });
    }

    it("no she/her in any EN translation string value", () => {
      const matches = collectStringValues(translations.en).filter((value) =>
        SHE_HER_PATTERN.test(value)
      );
      expect(matches).toEqual([]);
    });
  });

  describe("AT-02 — dashboard header keys are gender-neutral", () => {
    it("uses neutral decoded signal and underlying need headers", () => {
      expect(translations.en.results.decodedSignal).toBe(
        "What They Really Meant"
      );
      expect(translations.en.results.underlyingNeed).toBe(
        "What They Actually Need"
      );
    });
  });

  describe("AT-03 — accessibility-facing input strings", () => {
    it("EN and ID aria labels use neutral partner framing", () => {
      expect(translations.en.input.ariaLabel).toBe(
        "Describe what your partner said or did"
      );
      expect(translations.id.input.ariaLabel).toBe(
        "Ceritain apa yang pasanganmu bilang atau lakuin"
      );
    });
  });

  describe("AT-04 — ID scoped keys match spec", () => {
    for (const [path, expected] of Object.entries(ID_SCOPED_KEYS)) {
      it(`${path} matches spec`, () => {
        expect(getByPath(translations.id as Record<string, unknown>, path)).toBe(
          expected
        );
      });
    }

    it("underlying need header avoids female-specific phrasing", () => {
      expect(translations.id.results.underlyingNeed).not.toContain(
        "Dia Sebenarnya"
      );
    });
  });

  describe("AT-05 — TranslateRequestSchema empty-input message", () => {
    it("returns neutral partner validation copy", () => {
      const result = TranslateRequestSchema.safeParse({ input: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Please describe what your partner said or did."
        );
      }
    });
  });

  describe("AT-06 — prompt EN examples are gender-neutral", () => {
    const systemPrompt = getSystemPrompt("en");
    const suggestPrompt = getSuggestionsSystemPrompt("en");

    it("BASE_EN follow_ups example uses they/them", () => {
      expect(systemPrompt).toContain("What should I text them?");
      expect(systemPrompt).toContain("What if they're still upset?");
      expect(systemPrompt).not.toMatch(GENDERED_PROMPT_PATTERN);
    });

    it("SUGGEST_EN example uses they/them", () => {
      expect(suggestPrompt).toContain("What if they're still mad?");
      expect(suggestPrompt).not.toMatch(GENDERED_PROMPT_PATTERN);
    });
  });

  describe("AT-07 — intentional guardrail exception preserved", () => {
    it('keeps "she said X" in on_topic guardrail', () => {
      const promptSource = readFileSync(
        join(import.meta.dirname, "../lib/prompt.ts"),
        "utf8"
      );
      expect(promptSource).toContain('"she said X"');
    });
  });

  describe("AT-08 — i18n key structure unchanged", () => {
    it("EN and ID share identical top-level keys", () => {
      expect(Object.keys(translations.en).sort()).toEqual(
        Object.keys(translations.id).sort()
      );
    });

    it("EN and ID share identical nested key paths", () => {
      expect(collectKeyPaths(translations.en).sort()).toEqual(
        collectKeyPaths(translations.id).sort()
      );
    });

    it("scoped nested sections retain expected sub-keys", () => {
      expect(Object.keys(translations.en.results).sort()).toEqual(
        Object.keys(translations.id.results).sort()
      );
      expect(Object.keys(translations.en.streaming.phase).sort()).toEqual(
        Object.keys(translations.id.streaming.phase).sort()
      );
      expect(Object.keys(translations.en.urgency).sort()).toEqual(
        Object.keys(translations.id.urgency).sort()
      );
      expect(Object.keys(translations.en.errors).sort()).toEqual(
        Object.keys(translations.id.errors).sort()
      );
    });
  });
});

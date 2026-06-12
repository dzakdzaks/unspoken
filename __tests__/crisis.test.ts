import { describe, it, expect } from "vitest";
import { getCrisisResources } from "@/lib/crisis/resources";
import { resolveCrisisLocale } from "@/lib/crisis/locale";
import { CrisisDetectionSchema } from "@/lib/schema";

describe("getCrisisResources", () => {
  it("returns at least two EN resources with id, name, and tel or url", () => {
    const resources = getCrisisResources("en");
    expect(resources.length).toBeGreaterThanOrEqual(2);
    for (const r of resources) {
      expect(r.id).toBeTruthy();
      expect(r.name).toBeTruthy();
      expect(r.tel || r.url).toBeTruthy();
    }
  });

  it("returns ID resources without US numbers", () => {
    const resources = getCrisisResources("id");
    expect(resources.length).toBeGreaterThanOrEqual(2);
    for (const r of resources) {
      expect(r.tel ?? "").not.toMatch(/^\+1/);
      expect(r.tel ?? "").not.toBe("988");
    }
  });
});

describe("resolveCrisisLocale", () => {
  it("prefers message locale when it differs from room locale", () => {
    expect(resolveCrisisLocale("dia pukul aku", "en", "id")).toBe("id");
    expect(resolveCrisisLocale("he hit me", "id", "en")).toBe("en");
  });

  it("uses room locale when message locale matches", () => {
    expect(resolveCrisisLocale("he hit me", "en", "en")).toBe("en");
    expect(resolveCrisisLocale("dia pukul aku", "id", "id")).toBe("id");
  });
});

describe("CrisisDetectionSchema", () => {
  it("parses valid shapes", () => {
    expect(
      CrisisDetectionSchema.safeParse({
        high_risk: true,
        message_locale: "en",
      }).success,
    ).toBe(true);
    expect(
      CrisisDetectionSchema.safeParse({
        high_risk: false,
        message_locale: "id",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid shapes", () => {
    expect(
      CrisisDetectionSchema.safeParse({ high_risk: "yes", message_locale: "en" })
        .success,
    ).toBe(false);
    expect(
      CrisisDetectionSchema.safeParse({ high_risk: true, message_locale: "fr" })
        .success,
    ).toBe(false);
  });
});

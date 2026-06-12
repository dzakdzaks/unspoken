import type { Locale } from "@/lib/i18n/translations";
import type { CrisisResource } from "./types";

export const CRISIS_RESOURCES_VERSION = "2026-06-13";

const EN_RESOURCES: CrisisResource[] = [
  {
    id: "ndvh",
    name: "National Domestic Violence Hotline",
    subtitle: "24/7 support for abuse in relationships",
    tel: "+18007997233",
    url: "https://www.thehotline.org",
  },
  {
    id: "988",
    name: "988 Suicide & Crisis Lifeline",
    subtitle: "24/7 support if you're in crisis or worried about someone",
    tel: "988",
    url: "https://988lifeline.org",
  },
];

const ID_RESOURCES: CrisisResource[] = [
  {
    id: "sapa129",
    name: "SAPA 129",
    subtitle: "Layanan pelaporan & perlindungan korban kekerasan (KemenPPPA)",
    tel: "129",
    url: "https://s.id/sapa129",
  },
  {
    id: "healing119",
    name: "Healing119.id",
    subtitle: "Dukungan kesehatan jiwa 24 jam (Kemenkes)",
    // Voice support via 119 ext. 8 — see https://healing119.id
    url: "https://healing119.id",
  },
];

export function getCrisisResources(locale: Locale): CrisisResource[] {
  return locale === "id" ? ID_RESOURCES : EN_RESOURCES;
}

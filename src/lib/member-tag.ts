/**
 * Member Tagging Utilities
 * Formats member display names with standardized institution prefix tags:
 * - police: OPD - {nickname}
 * - medical: OMC - {nickname}
 * - mechanic: OCG - {nickname}
 * - restaurant: RESTO - {nickname}
 *
 * Ensures idempotent behavior and prevents double-tagging if the tag/institution name
 * is already present in the Discord nickname.
 */

const TAG_PREFIX_REGEX =
  /^[!~*•@\s]*(?:\[(?:OPD|OMC|OCG|RESTO|POLICE|MEDIS|MECHANIC|EMS|BENGKEL|RESTAURANT)\]|\((?:OPD|OMC|OCG|RESTO|POLICE|MEDIS|MECHANIC|EMS|BENGKEL|RESTAURANT)\)|(?:ASSISTANT\s+OFFICER|CHIEF\s+OF\s+POLICE|HIGHWAY\s+PATROL|SERVERS?\s+RESTO|PETINGGI\s+(?:MEDIS|RESTO|BENGKEL|POLISI)|OFFICER|SERGEANT|SERGENT|LIEUTENANT|CAPTAIN|CHIEF|CADET|KADET|SWAT|OPD|OMC|OCG|RESTO|POLICE|POLISI|POL|ORP|MEDIS|MEDICAL|EMS|DOKTER|DOCTOR|PARAMEDIC|PERAWAT|MEKANIK|MECHANIC|MECH|BENGKEL|TUNER|RESTAURANT)(?:\s*(?:[#№]?\d+|I{1,3}|IV|V))?)\s*(?:[-:|–—~•.]\s*|\s+)/i;

const BRACKET_PREFIX_REGEX =
  /^[!~*•@\s]*(?:\[|\()(?:OPD|OMC|OCG|RESTO|POLICE|MEDIS|MECHANIC|EMS|BENGKEL|RESTAURANT)(?:\s*(?:[#№]?\d+|I{1,3}|IV|V))?(?:\]|\))\s*/i;

const TRAILING_TAG_REGEX =
  /\s*(?:\[|\()(?:OPD|OMC|OCG|RESTO|POLICE|MEDIS|MECHANIC|EMS|BENGKEL|RESTAURANT)(?:\s*(?:[#№]?\d+|I{1,3}|IV|V))?(?:\]|\))\s*$/i;

/**
 * Returns the standardized institution tag prefix (OPD, OMC, OCG, RESTO).
 */
export function getInstitutionTag(slugOrId: string | null | undefined): string | null {
  if (!slugOrId) return null;
  const s = slugOrId.toLowerCase().replace(/^inst-/, "");
  if (s.includes("pol") || s === "opd") return "OPD";
  if (s.includes("med") || s.includes("ems") || s === "omc" || s.includes("hosp")) return "OMC";
  if (s.includes("mech") || s.includes("bengkel") || s === "ocg") return "OCG";
  if (s.includes("resto") || s.includes("restaurant")) return "RESTO";
  return null;
}

/**
 * Strips known institution prefix tags, rank titles, and rank tiers from a nickname
 * to recover the base Discord nickname.
 */
export function stripInstitutionTags(rawName: string | null | undefined): string {
  if (!rawName) return "";
  let clean = rawName.trim();
  clean = clean.replace(TRAILING_TAG_REGEX, "").trim();

  for (let i = 0; i < 5; i++) {
    let next = clean.replace(TAG_PREFIX_REGEX, "").trim();
    if (next === clean) {
      next = clean.replace(BRACKET_PREFIX_REGEX, "").trim();
    }
    if (next === clean || next.length === 0) break;
    clean = next;
  }

  // Strip standalone leading rank tier/number + separator if still present (e.g. "1 - Mine" or "1. Mine")
  clean = clean.replace(/^(?:[#№]?\d+|I{1,3}|IV|V)\s*[-:|–—~•.]\s*/i, "").trim();

  return clean;
}

/**
 * Formats a member's display name according to their institution tag:
 * - police = OPD - {nickname discord}
 * - Medis = OMC - {nickname discord}
 * - mechanic = OCG - {nickname discord}
 * - resto = RESTO - {nickname discord}
 *
 * Prevents double-tagging if the tag/institution is already present in the Discord nickname.
 */
export function formatInstitutionMemberName(
  rawName: string | null | undefined,
  institutionSlugOrId: string | null | undefined
): string {
  if (!rawName) return "";
  const tag = getInstitutionTag(institutionSlugOrId);
  if (!tag) return rawName.trim();

  const cleanBaseName = stripInstitutionTags(rawName);

  if (!cleanBaseName) {
    return tag;
  }

  return `${tag} - ${cleanBaseName}`;
}

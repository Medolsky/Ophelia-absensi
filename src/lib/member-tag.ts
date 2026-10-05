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
  /^(?:\[(?:OPD|OMC|OCG|RESTO|POLICE|MEDIS|MECHANIC|EMS|BENGKEL|RESTAURANT)\]|\((?:OPD|OMC|OCG|RESTO|POLICE|MEDIS|MECHANIC|EMS|BENGKEL|RESTAURANT)\)|(?:OPD|OMC|OCG|RESTO|POLICE|POLISI|POL|ORP|OFFICER|SWAT|CHIEF|MEDIS|MEDICAL|EMS|DOKTER|DOCTOR|PARAMEDIC|MEKANIK|MECHANIC|BENGKEL|TUNER|RESTAURANT|SERVERS?\s+RESTO))\s*(?:[-:|–—]\s*|\s+)/i;

const BRACKET_PREFIX_REGEX =
  /^(?:\[|\()(?:OPD|OMC|OCG|RESTO|POLICE|MEDIS|MECHANIC|EMS|BENGKEL|RESTAURANT)(?:\]|\))\s*/i;

const TRAILING_TAG_REGEX =
  /\s*(?:\[|\()(?:OPD|OMC|OCG|RESTO|POLICE|MEDIS|MECHANIC|EMS|BENGKEL|RESTAURANT)(?:\]|\))\s*$/i;

/**
 * Returns the standardized institution tag prefix (OPD, OMC, OCG, RESTO).
 */
export function getInstitutionTag(slugOrId: string | null | undefined): string | null {
  if (!slugOrId) return null;
  const s = slugOrId.toLowerCase().replace(/^inst-/, "");
  if (s.includes("pol") || s === "opd") return "OPD";
  if (s.includes("med") || s.includes("ems") || s === "omc") return "OMC";
  if (s.includes("mech") || s.includes("bengkel") || s === "ocg") return "OCG";
  if (s.includes("resto") || s.includes("restaurant")) return "RESTO";
  return null;
}

/**
 * Strips known institution prefix tags from a nickname to recover the base name.
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

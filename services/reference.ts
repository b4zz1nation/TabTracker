import * as SQLite from "expo-sqlite";

export type ReferenceKind = "lend" | "tab";

const HEX_12_REGEX = /^[0-9a-f]{12}$/;

function getRandomBytes(length: number) {
  const bytes = new Uint8Array(length);

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    crypto.getRandomValues(bytes);
    return bytes;
  }

  for (let index = 0; index < length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }

  return bytes;
}

function legacyFormatReference(kind: ReferenceKind, id: number) {
  const prefix = kind === "lend" ? "LND" : "TAB";
  return `${prefix}-${id.toString().padStart(6, "0")}`;
}

export function isReferenceCode(value?: string | null) {
  return !!value && HEX_12_REGEX.test(value.trim());
}

export function formatReference(kind: ReferenceKind, id: number) {
  return legacyFormatReference(kind, id);
}

export function generateReferenceCode(_kind: ReferenceKind, now = Date.now()) {
  const bytes = getRandomBytes(3);
  const timePart = (now % 0xffffff).toString(16).padStart(6, "0");
  const randomPart = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return `${timePart}${randomPart}`;
}

export function getReferenceLabel(
  kind: ReferenceKind,
  id: number,
  referenceCode?: string | null,
) {
  if (referenceCode && referenceCode.trim()) {
    const normalized = referenceCode.trim().toUpperCase();
    return normalized.match(/.{1,4}/g)?.join(" ") ?? normalized;
  }

  return legacyFormatReference(kind, id);
}

export async function createUniqueReferenceForKind(
  db: SQLite.SQLiteDatabase,
  kind: ReferenceKind,
) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const referenceCode = generateReferenceCode(kind);
    const existingLend = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM lends WHERE reference_code = ? LIMIT 1",
      [referenceCode],
    );
    const existingCreditor = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM creditors WHERE reference_code = ? LIMIT 1",
      [referenceCode],
    );

    if (!existingLend && !existingCreditor) {
      return referenceCode;
    }
  }

  throw new Error(`FAILED_TO_GENERATE_${kind.toUpperCase()}_REFERENCE`);
}

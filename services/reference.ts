import * as SQLite from "expo-sqlite";

export type ReferenceKind = "lend" | "tab";

const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function bytesToUuid(bytes: Uint8Array) {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

function legacyFormatReference(kind: ReferenceKind, id: number) {
  const prefix = kind === "lend" ? "LND" : "TAB";
  return `${prefix}-${id.toString().padStart(6, "0")}`;
}

export function isUuidV7(value?: string | null) {
  return !!value && UUID_V7_REGEX.test(value.trim());
}

export function formatReference(kind: ReferenceKind, id: number) {
  return legacyFormatReference(kind, id);
}

export function generateReferenceCode(_kind: ReferenceKind, now = Date.now()) {
  const bytes = getRandomBytes(16);
  const timestamp = now;

  bytes[0] = (timestamp / 0x10000000000) & 0xff;
  bytes[1] = (timestamp / 0x100000000) & 0xff;
  bytes[2] = (timestamp / 0x1000000) & 0xff;
  bytes[3] = (timestamp / 0x10000) & 0xff;
  bytes[4] = (timestamp / 0x100) & 0xff;
  bytes[5] = timestamp & 0xff;

  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return bytesToUuid(bytes);
}

export function getReferenceLabel(
  kind: ReferenceKind,
  id: number,
  referenceCode?: string | null,
) {
  return referenceCode && referenceCode.trim()
    ? referenceCode
    : legacyFormatReference(kind, id);
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

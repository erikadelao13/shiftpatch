import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// No `server-only` import: prisma/seed.ts runs this under tsx, outside Next.
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const PREFIX = "scrypt1";

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt);
  return `${PREFIX}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [prefix, saltHex, keyHex] = stored.split("$");
  if (prefix !== PREFIX || !saltHex || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const actual = await derive(password, Buffer.from(saltHex, "hex"));
  return timingSafeEqual(actual, expected);
}

let dummyHash: Promise<string> | undefined;

// Same scrypt cost as a real check, so response time doesn't reveal whether an
// email exists.
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword("shiftpatch-dummy-password");
  await verifyPassword(password, await dummyHash);
}

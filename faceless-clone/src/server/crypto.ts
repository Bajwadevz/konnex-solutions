import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

function secret() {
  const value = process.env.APP_SECRET || "";
  if (value.length < 16) throw new Error("APP_SECRET must be at least 16 characters.");
  return value;
}

function key() {
  return scryptSync(secret(), "faceless-reels-v1", 32);
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string) {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function signState(payload: Record<string, string>) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: String(Date.now() + 10 * 60 * 1000) })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readState(token: string) {
  const [body, sig] = token.split(".");
  if (!body || !sig) throw new Error("OAuth state was missing.");
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("OAuth state was invalid.");
  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<string, string>;
  if (Number(parsed.exp) < Date.now()) throw new Error("OAuth state expired. Try connecting again.");
  return parsed;
}

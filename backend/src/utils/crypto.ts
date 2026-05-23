import crypto from "crypto";

const getKey = () => {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("Missing ENCRYPTION_KEY");
  }
  const isHex = /^[0-9a-fA-F]+$/.test(raw) && raw.length === 64;
  if (isHex) {
    return Buffer.from(raw, "hex");
  }
  return Buffer.from(raw, "base64");
};

export const encryptSecret = (value: string) => {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), encrypted.toString("base64"), tag.toString("base64")].join(":");
};

export const decryptSecret = (payload: string) => {
  const [ivB64, dataB64, tagB64] = payload.split(":");
  if (!ivB64 || !dataB64 || !tagB64) {
    throw new Error("Invalid encrypted payload");
  }
  const key = getKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};

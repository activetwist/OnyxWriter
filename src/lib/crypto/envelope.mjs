import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const ENVELOPE_VERSION = 1;
export const WRAPPED_KEY_VERSION = 1;
export const AES_GCM_ALG = "AES-256-GCM";
export const SCRYPT_PARAMS = Object.freeze({
  name: "scrypt",
  saltLength: 16,
  keyLength: 32,
  N: 16384,
  r: 8,
  p: 1,
});

export class OnyxCryptoError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "OnyxCryptoError";
    this.code = code;
    this.details = details;
  }
}

export function generateBundleDataKey() {
  return randomBytes(32);
}

export function sha256Hex(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return createHash("sha256").update(buffer).digest("hex");
}

export function constantTimeEqualHex(left, right) {
  const leftBuffer = Buffer.from(String(left), "hex");
  const rightBuffer = Buffer.from(String(right), "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function wrapBundleDataKey(passphrase, dataKey, options = {}) {
  const key = Buffer.from(dataKey);
  if (key.length !== 32) throw new OnyxCryptoError("invalid_key", "Bundle data key must be 32 bytes.");
  const salt = options.salt ? decodeBase64(options.salt) : randomBytes(SCRYPT_PARAMS.saltLength);
  const params = { ...SCRYPT_PARAMS, ...(options.kdf ?? {}) };
  const wrappingKey = deriveWrappingKey(passphrase, salt, params);
  const envelope = encryptBytes(wrappingKey, key, Buffer.from("onyxwriter:data-key:v1"));
  return {
    version: WRAPPED_KEY_VERSION,
    kdf: {
      name: params.name,
      salt: encodeBase64(salt),
      keyLength: params.keyLength,
      N: params.N,
      r: params.r,
      p: params.p,
    },
    wrappedKey: envelope,
  };
}

export function unwrapBundleDataKey(passphrase, wrapped) {
  if (!wrapped || wrapped.version !== WRAPPED_KEY_VERSION) {
    throw new OnyxCryptoError("unsupported_key_wrap", "Unsupported wrapped key version.");
  }
  const salt = decodeBase64(wrapped.kdf?.salt);
  const wrappingKey = deriveWrappingKey(passphrase, salt, wrapped.kdf);
  try {
    const dataKey = decryptBytes(wrappingKey, wrapped.wrappedKey, Buffer.from("onyxwriter:data-key:v1"));
    if (dataKey.length !== 32) throw new OnyxCryptoError("invalid_key", "Unwrapped bundle data key has invalid length.");
    return dataKey;
  } catch (error) {
    if (error instanceof OnyxCryptoError) throw error;
    throw new OnyxCryptoError("unlock_failed", "Unable to unlock encrypted bundle with the supplied passphrase.");
  }
}

export function encryptJson(dataKey, value, aad = "") {
  return encryptBytes(dataKey, Buffer.from(JSON.stringify(value), "utf8"), Buffer.from(aad));
}

export function decryptJson(dataKey, envelope, aad = "") {
  const bytes = decryptBytes(dataKey, envelope, Buffer.from(aad));
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new OnyxCryptoError("decode_failed", "Encrypted JSON payload could not be decoded.", { cause: String(error) });
  }
}

export function encryptText(dataKey, text, aad = "") {
  return encryptBytes(dataKey, Buffer.from(String(text), "utf8"), Buffer.from(aad));
}

export function decryptText(dataKey, envelope, aad = "") {
  return decryptBytes(dataKey, envelope, Buffer.from(aad)).toString("utf8");
}

export function encryptBytes(dataKey, plaintext, aad = Buffer.alloc(0)) {
  const key = Buffer.from(dataKey);
  if (key.length !== 32) throw new OnyxCryptoError("invalid_key", "AES-256-GCM requires a 32-byte key.");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  if (aad.length) cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    kind: "onyx.crypto.envelope",
    version: ENVELOPE_VERSION,
    alg: AES_GCM_ALG,
    nonce: encodeBase64(nonce),
    tag: encodeBase64(tag),
    ciphertext: encodeBase64(ciphertext),
  };
}

export function decryptBytes(dataKey, envelope, aad = Buffer.alloc(0)) {
  if (!envelope || envelope.version !== ENVELOPE_VERSION || envelope.alg !== AES_GCM_ALG) {
    throw new OnyxCryptoError("unsupported_envelope", "Unsupported encrypted envelope.");
  }
  const key = Buffer.from(dataKey);
  if (key.length !== 32) throw new OnyxCryptoError("invalid_key", "AES-256-GCM requires a 32-byte key.");
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, decodeBase64(envelope.nonce));
    if (aad.length) decipher.setAAD(aad);
    decipher.setAuthTag(decodeBase64(envelope.tag));
    return Buffer.concat([decipher.update(decodeBase64(envelope.ciphertext)), decipher.final()]);
  } catch {
    throw new OnyxCryptoError("decrypt_failed", "Encrypted payload failed authentication or could not be decrypted.");
  }
}

export function encodeBase64(value) {
  return Buffer.from(value).toString("base64");
}

export function decodeBase64(value) {
  if (!value || typeof value !== "string") throw new OnyxCryptoError("decode_failed", "Missing base64 value.");
  return Buffer.from(value, "base64");
}

function deriveWrappingKey(passphrase, salt, params = SCRYPT_PARAMS) {
  if (!passphrase || typeof passphrase !== "string") {
    throw new OnyxCryptoError("missing_passphrase", "A non-empty passphrase is required.");
  }
  if (params?.name !== "scrypt") throw new OnyxCryptoError("unsupported_kdf", "Unsupported key derivation function.");
  return scryptSync(passphrase, salt, params.keyLength ?? 32, {
    N: params.N ?? SCRYPT_PARAMS.N,
    r: params.r ?? SCRYPT_PARAMS.r,
    p: params.p ?? SCRYPT_PARAMS.p,
  });
}

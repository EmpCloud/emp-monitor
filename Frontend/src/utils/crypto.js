/**
 * Replicates PHP's openssl_encrypt($password, $algorithm, $key, 0, $iv).
 * flags=0 → output is base64-encoded (not raw bytes).
 * Uses the built-in Web Crypto API — no external dependencies.
 */
export async function encryptPassword(password) {
  const keyStr = import.meta.env.VITE_CRYPTO_PASSWORD ?? "";
  const ivStr  = import.meta.env.VITE_PASSWORD_IV ?? "";

  const enc = new TextEncoder();

  // PHP OpenSSL pads key/IV with null bytes to the required length.
  // AES-256-CBC: 32-byte key, 16-byte IV.
  const keyBytes = new Uint8Array(32);
  keyBytes.set(enc.encode(keyStr).slice(0, 32));

  const ivBytes = new Uint8Array(16);
  ivBytes.set(enc.encode(ivStr).slice(0, 16));

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CBC" },
    false,
    ["encrypt"]
  );

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-CBC", iv: ivBytes },
    cryptoKey,
    enc.encode(password)
  );

  // Convert ArrayBuffer → base64 (same output as PHP flags=0)
  const bytes = new Uint8Array(encrypted);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

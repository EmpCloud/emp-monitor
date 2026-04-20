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

/**
 * Decrypt AES-256-CBC password in IV:hex format (backend format).
 * Backend sends passwords as "IV_hex:ciphertext_hex"
 */
export async function decryptPassword(encryptedData) {
  if (!encryptedData || typeof encryptedData !== 'string') return '';

  try {
    const keyStr = import.meta.env.VITE_CRYPTO_PASSWORD ?? "";
    const parts = encryptedData.split(':');
    if (parts.length !== 2) return '';

    const [ivHex, ciphertextHex] = parts;

    // Convert hex strings to bytes
    const ivBytes = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const ciphertextBytes = new Uint8Array(ciphertextHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    // Prepare key (same as encryptPassword)
    const enc = new TextEncoder();
    const keyBytes = new Uint8Array(32);
    keyBytes.set(enc.encode(keyStr).slice(0, 32));

    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-CBC", iv: ivBytes },
      cryptoKey,
      ciphertextBytes
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('Password decryption failed:', e);
    return '';
  }
}

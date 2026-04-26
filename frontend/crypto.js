async function getKey(secret) {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt','decrypt']);
}

async function encrypt(plain, secret) {
  const key = await getKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, enc.encode(plain));
  return JSON.stringify({
    iv: Array.from(iv),
    cipher: Array.from(new Uint8Array(cipher))
  });
}

async function decrypt(cipherStr, secret) {
  const key = await getKey(secret);
  const { iv, cipher } = JSON.parse(cipherStr);
  const dec = await crypto.subtle.decrypt(
    { name:'AES-GCM', iv:new Uint8Array(iv) },
    key,
    new Uint8Array(cipher)
  );
  return new TextDecoder().decode(dec);
}

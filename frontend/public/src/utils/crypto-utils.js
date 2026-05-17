export async function encryptMasterKey(masterKey) {
    const encoder = new TextEncoder();
    const data = encoder.encode(masterKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  async function generateAESKey(masterKey, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(masterKey),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  export async function encryptNoteContent(content, masterKey, noteId) {
    try {
      const encoder = new TextEncoder();
      const key = await generateAESKey(masterKey, noteId);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(content)
      );
      const encryptedArray = Array.from(new Uint8Array(encrypted));
      const ivArray = Array.from(iv);
      return JSON.stringify({
        iv: ivArray,
        data: encryptedArray
      });
    } catch (error) {
      console.error('加密失败:', error);
      return btoa(encodeURIComponent(content));
    }
  }
  
  export async function decryptNoteContent(encryptedData, masterKey, noteId) {
    try {
      const decoder = new TextDecoder();
      const { iv, data } = JSON.parse(encryptedData);
      const key = await generateAESKey(masterKey, noteId);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        new Uint8Array(data)
      );
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('解密失败:', error);
      try {
        return decodeURIComponent(atob(encryptedData));
      } catch {
        return encryptedData;
      }
    }
  }
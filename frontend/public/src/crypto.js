// ==============================================
// 加密笔记 - 加密工具库（V2.2.4 终极修复版）
// 基于Web Crypto API实现AES-256-GCM加密
// 与后端PBKDF2_ITERATIONS配置保持一致
// ==============================================

window.cryptoUtils = {
    /**
     * 将字符串转换为ArrayBuffer
     * @param {string} str - 输入字符串
     * @returns {Uint8Array} 字节数组
     */
    stringToArrayBuffer(str) {
      return new TextEncoder().encode(str);
    },
  
    /**
     * 将ArrayBuffer转换为字符串
     * @param {Uint8Array} buffer - 字节数组
     * @returns {string} 输出字符串
     */
    arrayBufferToString(buffer) {
      return new TextDecoder().decode(buffer);
    },
  
    /**
     * 将ArrayBuffer转换为Base64字符串
     * @param {Uint8Array} buffer - 字节数组
     * @returns {string} Base64编码字符串
     */
    arrayBufferToBase64(buffer) {
      return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
    },
  
    /**
     * 将Base64字符串转换为ArrayBuffer
     * @param {string} base64 - Base64编码字符串
     * @returns {Uint8Array} 字节数组
     */
    base64ToArrayBuffer(base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    },
  
    /**
     * 从密码派生加密密钥（与后端配置一致）
     * @param {string} password - 用户主密钥
     * @param {Uint8Array} salt - 盐值
     * @returns {CryptoKey} 加密密钥
     */
    async deriveKey(password, salt) {
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        this.stringToArrayBuffer(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
  
      return await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000, // 与后端PBKDF2_ITERATIONS配置一致
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    },
  
    /**
     * 加密文本
     * @param {string} plaintext - 明文
     * @param {string} password - 用户主密钥
     * @returns {string} 加密后的Base64字符串（包含盐和IV）
     */
    async encrypt(plaintext, password) {
      if (!plaintext || !password) return '';
  
      // 生成随机盐和IV
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
      // 派生密钥
      const key = await this.deriveKey(password, salt);
  
      // 加密
      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        this.stringToArrayBuffer(plaintext)
      );
  
      // 组合盐、IV和密文
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  
      // 转换为Base64返回
      return this.arrayBufferToBase64(combined);
    },
  
    /**
     * 解密文本
     * @param {string} ciphertext - 加密后的Base64字符串
     * @param {string} password - 用户主密钥
     * @returns {string} 明文
     */
    async decrypt(ciphertext, password) {
      if (!ciphertext || !password) return '';
  
      try {
        // 解码Base64
        const combined = this.base64ToArrayBuffer(ciphertext);
  
        // 提取盐、IV和密文
        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const data = combined.slice(28);
  
        // 派生密钥
        const key = await this.deriveKey(password, salt);
  
        // 解密
        const decrypted = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          data
        );
  
        return this.arrayBufferToString(decrypted);
      } catch (e) {
        console.error('解密失败:', e);
        return '';
      }
    },
  
    /**
     * 计算密码的SHA-256哈希
     * @param {string} password - 用户主密钥
     * @returns {string} Base64编码的哈希值
     */
    async getKeyHash(password) {
      if (!password) return '';
  
      const hash = await window.crypto.subtle.digest(
        'SHA-256',
        this.stringToArrayBuffer(password)
      );
  
      return this.arrayBufferToBase64(new Uint8Array(hash));
    },
  
    /**
     * 生成随机恢复码
     * @returns {string} 16位恢复码
     */
    generateRecoveryCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      const array = new Uint8Array(16);
      window.crypto.getRandomValues(array);
      
      for (let i = 0; i < 16; i++) {
        code += chars[array[i] % chars.length];
        if ((i + 1) % 4 === 0 && i < 15) {
          code += '-';
        }
      }
      
      return code;
    }
  };
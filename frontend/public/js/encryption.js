/**
 * 加密工具类
 * 版本：v2.0.0 - 原始版本
 * 使用AES-GCM算法进行端对端加密
 */

/**
 * 生成密钥哈希
 * 使用PBKDF2算法将主密钥转换为哈希值
 * @param {string} key 主密钥
 * @returns {Promise<string>} 64位十六进制哈希值
 */
export async function getKeyHash(key) {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(key);
    
    // 使用SHA-256哈希
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    // 转换为十六进制字符串
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * 加密文本
   * 使用AES-GCM算法
   * @param {string} text 要加密的文本
   * @param {string} key 加密密钥
   * @returns {Promise<string>} 加密后的Base64字符串（包含IV和认证标签）
   */
  export async function encrypt(text, key) {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(key);
    
    // 生成12字节的IV（推荐用于GCM模式）
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 导入密钥
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      await crypto.subtle.digest('SHA-256', keyBytes),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    // 加密
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encoder.encode(text)
    );
    
    // 组合IV和加密后的数据
    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const result = new Uint8Array(iv.length + encryptedBytes.length);
    result.set(iv, 0);
    result.set(encryptedBytes, iv.length);
    
    // 转换为Base64字符串
    return btoa(String.fromCharCode(...result));
  }
  
  /**
   * 解密文本
   * 使用AES-GCM算法
   * @param {string} encryptedData 加密后的Base64字符串
   * @param {string} key 解密密钥
   * @returns {Promise<string>} 解密后的文本
   */
  export async function decrypt(encryptedData, key) {
    try {
      const encoder = new TextEncoder();
      const keyBytes = encoder.encode(key);
      
      // 解码Base64
      const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      
      // 提取IV（前12字节）
      const iv = encryptedBytes.slice(0, 12);
      const data = encryptedBytes.slice(12);
      
      // 导入密钥
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        await crypto.subtle.digest('SHA-256', keyBytes),
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      // 解密
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        data
      );
      
      // 转换为字符串
      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      console.error('解密失败:', error);
      throw new Error('解密失败，密钥可能不正确');
    }
  }
  
  /**
   * 保存草稿到localStorage
   * @param {string} draftType 草稿类型
   * @param {string|null} noteId 笔记ID（新建笔记时为null）
   * @param {object} data 草稿数据
   */
  export async function saveDraft(draftType, noteId, data) {
    try {
      const key = `draft_${draftType}_${noteId || 'new'}`;
      localStorage.setItem(key, JSON.stringify({
        ...data,
        draftType,
        noteId
      }));
    } catch (error) {
      console.error('保存草稿失败:', error);
    }
  }
  
  /**
   * 获取草稿
   * @param {string} draftType 草稿类型
   * @param {string|null} noteId 笔记ID
   * @returns {Promise<object|null>} 草稿数据
   */
  export async function getDraft(draftType, noteId) {
    try {
      const key = `draft_${draftType}_${noteId || 'new'}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('获取草稿失败:', error);
      return null;
    }
  }
  
  /**
   * 删除草稿
   * @param {string} draftType 草稿类型
   * @param {string|null} noteId 笔记ID
   */
  export async function deleteDraft(draftType, noteId) {
    try {
      const key = `draft_${draftType}_${noteId || 'new'}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('删除草稿失败:', error);
    }
  }
  
  /**
   * 获取所有草稿
   * @returns {Promise<Array>} 草稿列表
   */
  export async function getAllDrafts() {
    try {
      const drafts = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('draft_')) {
          const data = localStorage.getItem(key);
          if (data) {
            drafts.push(JSON.parse(data));
          }
        }
      }
      
      return drafts;
    } catch (error) {
      console.error('获取所有草稿失败:', error);
      return [];
    }
  }
  
  /**
   * 清除所有草稿
   */
  export async function clearAllDrafts() {
    try {
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('draft_')) {
          keysToRemove.push(key);
        }
      }
      
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('清除所有草稿失败:', error);
    }
  }
  
  // 草稿类型枚举
  export const DRAFT_TYPE = {
    NEW_NOTE: 'new_note',
    EXISTING_NOTE: 'existing_note'
  };
  
  // 导出加密工具对象
  export const encryption = {
    getKeyHash,
    encrypt,
    decrypt,
    saveDraft,
    getDraft,
    deleteDraft,
    getAllDrafts,
    clearAllDrafts,
    DRAFT_TYPE
  };
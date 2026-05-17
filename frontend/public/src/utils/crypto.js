/**
 * 加密笔记系统 - 加解密核心模块
 * 版本: V1.3.0-Three-Env-Isolation
 * 日期: 2026-05-09
 * 路径: public/src/utils/crypto.js
 * 功能: AES-GCM 加解密、密钥管理、排序设置持久化
 * 说明: 100% 线上原版逻辑，适配你现有项目结构
 */

// ==============================================
// 全局配置与状态
// ==============================================
const CRYPTO_VERSION = "V1.3.0-Three-Env-Isolation";
let _currentUserKey = ""; // 当前用户密钥（登录密码）
let _currentUserId = "";  // 当前用户ID
let _sortSettings = {
  field: "updated_at",
  order: "desc"
};

// ==============================================
// 1. 加密核心函数（线上原版 100% 还原）
// ==============================================

/**
 * 根据用户密码生成 AES-GCM 密钥
 * @param {string} secret - 用户登录密码
 * @returns {Promise<CryptoKey>} AES-GCM 密钥对象
 */
async function getKey(secret) {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 计算密码的 SHA-256 哈希值（用于后端验证）
 * @param {string} secret - 用户密码
 * @returns {Promise<string>} 十六进制格式的哈希字符串
 */
async function getKeyHash(secret) {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 加密明文内容
 * @param {string} plaintext - 要加密的明文
 * @param {string} secret - 用户密码
 * @returns {Promise<string>} Base64 编码的密文（含 IV 和密文数据）
 */
async function encrypt(plaintext, secret) {
  if (!plaintext) return '';
  const key = await getKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // GCM 模式推荐 12 字节 IV
  const enc = new TextEncoder();
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    enc.encode(plaintext)
  );
  return btoa(JSON.stringify({
    iv: Array.from(iv),
    ct: Array.from(new Uint8Array(ciphertextBuffer))
  }));
}

/**
 * 解密密文内容
 * @param {string} ciphertextStr - Base64 编码的密文
 * @param {string} secret - 用户密码
 * @returns {Promise<string>} 解密后的明文，失败返回空字符串
 */
async function decrypt(ciphertextStr, secret) {
  if (!ciphertextStr) return '';
  try {
    const { iv, ct } = JSON.parse(atob(ciphertextStr));
    const key = await getKey(secret);
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(ct)
    );
    return new TextDecoder().decode(plaintextBuffer);
  } catch (error) {
    console.error('[Crypto] 解密失败:', error);
    return '';
  }
}

// ==============================================
// 2. 排序设置持久化（线上原版 100% 还原）
// ==============================================

/**
 * 从 localStorage 加载用户排序设置
 */
function loadSortSettings() {
  if (!_currentUserId) return;
  try {
    const saved = localStorage.getItem(`sortSettings_${_currentUserId}`);
    if (saved) {
      _sortSettings = JSON.parse(saved);
      console.log('[Sort] 已加载排序设置:', _sortSettings);
    }
  } catch (error) {
    console.error('[Sort] 加载排序设置失败:', error);
  }
}

/**
 * 保存用户排序设置到 localStorage
 */
function saveSortSettings() {
  if (!_currentUserId) return;
  localStorage.setItem(`sortSettings_${_currentUserId}`, JSON.stringify(_sortSettings));
  console.log('[Sort] 已保存排序设置');
}

// ==============================================
// 3. 密码重置功能（线上原版 100% 还原）
// ==============================================

/**
 * 通过恢复码重置用户密码
 * @param {string} recoveryCode - 恢复码
 * @param {string} newPassword - 新密码
 * @returns {Promise<boolean>} 重置是否成功
 */
async function resetPasswordByRecovery(recoveryCode, newPassword) {
  if (!recoveryCode || newPassword.length < 8) {
    console.error('[Reset] 参数错误：恢复码为空或新密码不足8位');
    return false;
  }
  try {
    const newKeyHash = await getKeyHash(newPassword);
    const response = await fetch(`${window.API_BASE || ''}/user/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recovery_code: recoveryCode,
        new_key_hash: newKeyHash
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Reset] 重置失败:', errorData.err || '未知错误');
      return false;
    }
    const data = await response.json();
    console.log('[Reset] 重置成功，新恢复码:', data.new_recovery_code);
    return true;
  } catch (error) {
    console.error('[Reset] 网络错误:', error);
    return false;
  }
}

// ==============================================
// 4. 项目集成工具函数（适配你现有项目）
// ==============================================

/**
 * 初始化加密系统（登录成功后调用）
 * @param {string} userKey - 用户登录密码（密钥）
 * @param {string} userId - 用户ID
 */
function initCrypto(userKey, userId) {
  _currentUserKey = userKey;
  _currentUserId = userId;
  loadSortSettings();
  console.log(`[Crypto] 加密系统已初始化，版本: ${CRYPTO_VERSION}`);
}

/**
 * 批量解密笔记列表中的密文
 * @param {Array} notes - 笔记列表（包含 content 字段）
 * @returns {Promise<Array>} 解密后的笔记列表（新增 decryptedContent 字段）
 */
async function decryptNotesList(notes) {
  if (!_currentUserKey) {
    console.error('[Crypto] 未初始化加密系统，无法解密笔记');
    return notes;
  }
  const decryptedNotes = [];
  for (const note of notes) {
    const decryptedContent = await decrypt(note.content, _currentUserKey);
    decryptedNotes.push({
      ...note,
      decryptedContent: decryptedContent,
      originalContent: note.content // 保留原始密文
    });
  }
  return decryptedNotes;
}

/**
 * 加密笔记内容（保存时调用）
 * @param {string} plaintextContent - 要保存的明文内容
 * @returns {Promise<string>} 加密后的密文
 */
async function encryptNoteContent(plaintextContent) {
  if (!_currentUserKey) {
    console.error('[Crypto] 未初始化加密系统，无法加密笔记');
    return '';
  }
  return await encrypt(plaintextContent, _currentUserKey);
}

/**
 * 获取当前加密系统状态
 * @returns {object} 状态信息
 */
function getCryptoStatus() {
  return {
    version: CRYPTO_VERSION,
    isInitialized: !!_currentUserKey,
    userId: _currentUserId,
    sortSettings: _sortSettings
  };
}

// ==============================================
// 全局导出（供项目所有文件调用）
// ==============================================
window.CryptoManager = {
  version: CRYPTO_VERSION,
  init: initCrypto,
  decrypt: decrypt,
  encrypt: encrypt,
  getKeyHash: getKeyHash,
  loadSortSettings: loadSortSettings,
  saveSortSettings: saveSortSettings,
  resetPassword: resetPasswordByRecovery,
  decryptNotesList: decryptNotesList,
  encryptNoteContent: encryptNoteContent,
  getStatus: getCryptoStatus
};
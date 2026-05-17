// ==============================================
// 前端环境变量配置
// 版本：V1.4.3-Final-Crypto-Integration
// 核心：和线上生产环境加密参数完全一致
// ==============================================
window.__ENV__ = {
    API_URL: '',
    ENVIRONMENT: 'local',
    ENCRYPTION_ALGORITHM: 'AES-GCM',
    KEY_DERIVATION_HASH: 'SHA-256'
  };
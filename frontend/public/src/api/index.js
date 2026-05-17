// ==============================================
// API请求基础配置
// 版本：V1.4.3-Final-Crypto-Integration
// 功能：自动适配所有环境的API地址
// 本地：用相对路径（/api），因为前后端同端口
// 测试/线上：用__env.js里配置的完整域名
// ==============================================

/**
 * 自动获取当前环境的API基础地址
 * @returns {string} API基础地址
 */
export const API_BASE_URL = (() => {
    // 本地环境判断：hostname是127.0.0.1或localhost
    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
      // 本地用相对路径，因为前后端同端口，不需要跨域
      return '';
    }
    // 测试/线上环境：用__env.js里配置的地址
    return window.__ENV__?.API_URL || '';
  })();
  
  /**
   * 统一API请求封装
   * @param {string} url - 请求路径（不含API_BASE_URL）
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 解析后的JSON响应
   */
  export async function apiRequest(url, options = {}) {
    // 拼接完整URL
    const fullUrl = `${API_BASE_URL}${url}`;
    // 从localStorage获取token
    const token = window.localStorage.getItem('note_token');
  
    try {
      const response = await fetch(fullUrl, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          // 自动添加Authorization头
          'Authorization': token ? `Bearer ${token}` : '',
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
  
      const result = await response.json();
      console.log('API请求结果:', url, result);
      
      if (!response.ok) {
        throw new Error(result.message || '请求失败');
      }
      
      return result;
    } catch (err) {
      console.error('API请求失败:', url, err);
      throw err;
    }
  }
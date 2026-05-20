/**
 * API请求工具类
 * 版本：v2.0.0 - 原始版本
 */

// API基础地址
const API_BASE = '';

/**
 * 通用API请求函数
 * @param {string} url 请求地址
 * @param {object} options 请求选项
 * @returns {Promise<object>} 响应数据
 */
async function request(url, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin'
  };

  // 添加认证令牌
  const token = localStorage.getItem('token');
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  try {
    const response = await fetch(`${API_BASE}${url}`, finalOptions);
    
    // 解析响应
    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error('服务器返回了无效的响应格式');
    }

    if (!response.ok) {
      throw new Error(data.message || `请求失败: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API请求失败:', error);
    throw error;
  }
}

/**
 * 认证相关API
 */
export const auth = {
  /**
   * 用户登录/注册
   * @param {object} data 登录数据
   * @returns {Promise<object>} 登录结果
   */
  async login(data) {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * 刷新令牌
   * @returns {Promise<object>} 刷新结果
   */
  async refresh() {
    return request('/api/auth/refresh', {
      method: 'POST'
    });
  },

  /**
   * 使用恢复码重置主密钥
   * @param {object} data 重置数据
   * @returns {Promise<object>} 重置结果
   */
  async resetKey(data) {
    return request('/api/auth/reset-key', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * 生成新的恢复码
   * @returns {Promise<object>} 生成结果
   */
  async generateRecoveryCode() {
    return request('/api/auth/generate-recovery-code', {
      method: 'POST'
    });
  }
};

/**
 * 笔记相关API
 */
export const notes = {
  /**
   * 获取所有笔记
   * @returns {Promise<object>} 笔记列表
   */
  async getAll() {
    return request('/api/notes', {
      method: 'GET'
    });
  },

  /**
   * 创建新笔记
   * @param {object} data 笔记数据
   * @returns {Promise<object>} 创建结果
   */
  async create(data) {
    return request('/api/notes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * 获取单条笔记
   * @param {string} id 笔记ID
   * @returns {Promise<object>} 笔记详情
   */
  async getById(id) {
    return request(`/api/notes/${id}`, {
      method: 'GET'
    });
  },

  /**
   * 更新笔记
   * @param {string} id 笔记ID
   * @param {object} data 笔记数据
   * @returns {Promise<object>} 更新结果
   */
  async update(id, data) {
    return request(`/api/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * 删除笔记
   * @param {string} id 笔记ID
   * @returns {Promise<object>} 删除结果
   */
  async delete(id) {
    return request(`/api/notes/${id}`, {
      method: 'DELETE'
    });
  }
};

/**
 * 分类相关API
 */
export const categories = {
  /**
   * 获取所有分类
   * @returns {Promise<object>} 分类列表
   */
  async getAll() {
    return request('/api/categories', {
      method: 'GET'
    });
  },

  /**
   * 创建新分类
   * @param {object} data 分类数据
   * @returns {Promise<object>} 创建结果
   */
  async create(data) {
    return request('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * 更新分类
   * @param {string} id 分类ID
   * @param {object} data 分类数据
   * @returns {Promise<object>} 更新结果
   */
  async update(id, data) {
    return request(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * 删除分类
   * @param {string} id 分类ID
   * @returns {Promise<object>} 删除结果
   */
  async delete(id) {
    return request(`/api/categories/${id}`, {
      method: 'DELETE'
    });
  }
};

// 导出API对象
export const api = {
  auth,
  notes,
  categories
};
/**
 * 认证相关API接口
 * 对应后端：/api/auth/*
 */

import Config from '../config.js';

export const authApi = {
    /**
     * 用户登录
     * @param {string} username - 用户名
     * @param {string} password - 密码
     * @param {boolean} remember - 是否记住登录状态
     * @returns {Promise} 登录结果
     */
    async login(username, password, remember = false) {
        const response = await fetch(Config.API_ENDPOINTS.AUTH.LOGIN, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                password,
                remember
            })
        });
        
        if (!response.ok) {
            throw new Error(`登录失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 用户注册
     * @param {string} username - 用户名
     * @param {string} email - 邮箱
     * @param {string} password - 密码
     * @param {string} recoveryCode - 恢复码
     * @returns {Promise} 注册结果
     */
    async register(username, email, password, recoveryCode) {
        const response = await fetch(Config.API_ENDPOINTS.AUTH.REGISTER, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                email,
                password,
                recovery_code: recoveryCode
            })
        });
        
        if (!response.ok) {
            throw new Error(`注册失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 用户注销
     * @returns {Promise} 注销结果
     */
    async logout() {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        
        const response = await fetch(Config.API_ENDPOINTS.AUTH.LOGOUT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        // 无论成功与否，都清除本地token
        localStorage.removeItem(Config.STORAGE.KEYS.TOKEN);
        localStorage.removeItem(Config.STORAGE.KEYS.USER);
        
        if (!response.ok) {
            throw new Error(`注销失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 验证Token
     * @returns {Promise} 验证结果
     */
    async verify() {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        
        if (!token) {
            throw new Error('未找到认证令牌');
        }
        
        const response = await fetch(Config.API_ENDPOINTS.AUTH.VERIFY, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            // Token无效，清除本地存储
            if (response.status === 401) {
                localStorage.removeItem(Config.STORAGE.KEYS.TOKEN);
                localStorage.removeItem(Config.STORAGE.KEYS.USER);
            }
            throw new Error(`Token验证失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 密码恢复
     * @param {string} email - 邮箱
     * @param {string} recoveryCode - 恢复码
     * @returns {Promise} 恢复结果
     */
    async recovery(email, recoveryCode) {
        const response = await fetch(Config.API_ENDPOINTS.AUTH.RECOVERY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                recovery_code: recoveryCode
            })
        });
        
        if (!response.ok) {
            throw new Error(`密码恢复失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 检查登录状态
     * @returns {boolean} 是否已登录
     */
    isLoggedIn() {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const user = localStorage.getItem(Config.STORAGE.KEYS.USER);
        
        return !!(token && user);
    },
    
    /**
     * 获取当前用户
     * @returns {Object|null} 用户信息
     */
    getCurrentUser() {
        const userStr = localStorage.getItem(Config.STORAGE.KEYS.USER);
        if (!userStr) return null;
        
        try {
            return JSON.parse(userStr);
        } catch (error) {
            console.error('解析用户信息失败:', error);
            return null;
        }
    },
    
    /**
     * 保存登录信息
     * @param {string} token - JWT令牌
     * @param {Object} user - 用户信息
     * @param {boolean} remember - 是否记住登录状态
     */
    saveAuthData(token, user, remember = false) {
        localStorage.setItem(Config.STORAGE.KEYS.TOKEN, token);
        localStorage.setItem(Config.STORAGE.KEYS.USER, JSON.stringify(user));
        
        if (remember) {
            // 设置长期存储
            const expiration = new Date();
            expiration.setDate(expiration.getDate() + 30); // 30天有效期
            document.cookie = `auth_token=${token}; expires=${expiration.toUTCString()}; path=/`;
        }
    },
    
    /**
     * 清除登录信息
     */
    clearAuthData() {
        localStorage.removeItem(Config.STORAGE.KEYS.TOKEN);
        localStorage.removeItem(Config.STORAGE.KEYS.USER);
        
        // 清除cookie
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
};
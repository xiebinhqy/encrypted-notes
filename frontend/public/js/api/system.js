/**
 * 系统相关API接口
 * 对应后端：/api/system/*
 */

import Config from '../config.js';

export const systemApi = {
    /**
     * 获取系统统计
     * @returns {Promise} 系统统计
     */
    async stats() {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = Config.API_ENDPOINTS.SYSTEM.STATS;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`获取系统统计失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 创建备份
     * @returns {Promise} 备份结果
     */
    async backup() {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = Config.API_ENDPOINTS.SYSTEM.BACKUP;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`创建备份失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 导出数据
     * @param {string} format - 导出格式 (json, markdown, pdf)
     * @returns {Promise} 导出结果
     */
    async exportData(format = 'json') {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = `${Config.API_ENDPOINTS.SYSTEM.EXPORT}?format=${format}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`导出数据失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 获取系统设置
     * @returns {Promise} 系统设置
     */
    async getSettings() {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = Config.API_ENDPOINTS.SYSTEM.SETTINGS;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`获取系统设置失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 更新系统设置
     * @param {Object} settings - 设置数据
     * @returns {Promise} 更新结果
     */
    async updateSettings(settings) {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = Config.API_ENDPOINTS.SYSTEM.SETTINGS;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) {
            throw new Error(`更新系统设置失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 清理系统缓存
     * @returns {Promise} 清理结果
     */
    async clearCache() {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = '/api/system/clear-cache';
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`清理缓存失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 检查系统更新
     * @returns {Promise} 更新信息
     */
    async checkUpdates() {
        const url = '/api/system/updates';
        
        const response = await fetch(url, {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error(`检查更新失败: ${response.status}`);
        }
        
        return await response.json();
    }
};
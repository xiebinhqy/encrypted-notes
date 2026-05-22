/**
 * 笔记相关API接口
 * 对应后端：/api/notes/*
 */

import Config from '../config.js';

export const notesApi = {
    /**
     * 创建新笔记
     * @param {Object} noteData - 笔记数据
     * @returns {Promise} 创建结果
     */
    async create(noteData) {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = Config.API_ENDPOINTS.NOTES.CREATE;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(noteData)
        });
        
        if (!response.ok) {
            throw new Error(`创建笔记失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 获取笔记列表
     * @param {Object} params - 查询参数
     * @param {string} params.category - 分类ID
     * @param {string} params.tag - 标签
     * @param {string} params.status - 状态
     * @param {number} params.page - 页码
     * @param {number} params.limit - 每页数量
     * @returns {Promise} 笔记列表
     */
    async list(params = {}) {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const queryParams = new URLSearchParams(params);
        const url = `${Config.API_ENDPOINTS.NOTES.LIST}?${queryParams.toString()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`获取笔记列表失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 获取单个笔记
     * @param {string} id - 笔记ID
     * @returns {Promise} 笔记详情
     */
    async get(id) {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = Config.getApiUrl(Config.API_ENDPOINTS.NOTES.GET, { id });
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`获取笔记失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 更新笔记
     * @param {string} id - 笔记ID
     * @param {Object} noteData - 笔记数据
     * @returns {Promise} 更新结果
     */
    async update(id, noteData) {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = Config.getApiUrl(Config.API_ENDPOINTS.NOTES.UPDATE, { id });
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(noteData)
        });
        
        if (!response.ok) {
            throw new Error(`更新笔记失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 删除笔记
     * @param {string} id - 笔记ID
     * @returns {Promise} 删除结果
     */
    async delete(id) {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = Config.getApiUrl(Config.API_ENDPOINTS.NOTES.DELETE, { id });
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`删除笔记失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 搜索笔记
     * @param {string} query - 搜索关键词
     * @param {Object} options - 搜索选项
     * @returns {Promise} 搜索结果
     */
    async search(query, options = {}) {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = `${Config.API_ENDPOINTS.NOTES.SEARCH}?query=${encodeURIComponent(query)}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`搜索笔记失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 获取笔记统计
     * @returns {Promise} 统计信息
     */
    async stats() {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = Config.API_ENDPOINTS.NOTES.STATS;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`获取笔记统计失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 批量操作
     * @param {Array} operations - 批量操作数组
     * @returns {Promise} 批量操作结果
     */
    async batch(operations) {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        
        // 如果离线，将操作加入离线队列
        if (!Config.isOnline()) {
            return this._addToOfflineQueue(operations);
        }
        
        const response = await fetch('/api/notes/batch', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ operations })
        });
        
        if (!response.ok) {
            throw new Error(`批量操作失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 添加到离线队列
     * @param {Array} operations - 操作数组
     * @returns {Promise} 本地操作结果
     */
    async _addToOfflineQueue(operations) {
        const queue = JSON.parse(localStorage.getItem(Config.STORAGE.KEYS.OFFLINE_QUEUE) || '[]');
        const timestamp = Date.now();
        
        operations.forEach(operation => {
            queue.push({
                ...operation,
                _id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                _timestamp: timestamp,
                _status: 'pending',
                _retryCount: 0
            });
        });
        
        localStorage.setItem(Config.STORAGE.KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
        
        return {
            success: true,
            message: '操作已加入离线队列',
            count: operations.length,
            offline: true
        };
    }
};
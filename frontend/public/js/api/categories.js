/**
 * 分类相关API接口
 * 对应后端：/api/categories/*
 */

import Config from '../config.js';

export const categoriesApi = {
    /**
     * 获取分类列表
     * @returns {Promise} 分类列表
     */
    async list() {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = Config.API_ENDPOINTS.CATEGORIES.LIST;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`获取分类列表失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 创建分类
     * @param {Object} categoryData - 分类数据
     * @returns {Promise} 创建结果
     */
    async create(categoryData) {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = Config.API_ENDPOINTS.CATEGORIES.CREATE;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(categoryData)
        });
        
        if (!response.ok) {
            throw new Error(`创建分类失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 更新分类
     * @param {string} id - 分类ID
     * @param {Object} categoryData - 分类数据
     * @returns {Promise} 更新结果
     */
    async update(id, categoryData) {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = Config.getApiUrl(Config.API_ENDPOINTS.CATEGORIES.UPDATE, { id });
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(categoryData)
        });
        
        if (!response.ok) {
            throw new Error(`更新分类失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 删除分类
     * @param {string} id - 分类ID
     * @returns {Promise} 删除结果
     */
    async delete(id) {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = Config.getApiUrl(Config.API_ENDPOINTS.CATEGORIES.DELETE, { id });
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`删除分类失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 获取分类统计
     * @returns {Promise} 分类统计
     */
    async stats() {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = '/api/categories/stats';
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`获取分类统计失败: ${response.status}`);
        }
        
        return await response.json();
    }
};
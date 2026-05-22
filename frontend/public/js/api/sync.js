/**
 * 同步相关API接口
 * 对应后端：/api/sync/*
 */

import Config from '../config.js';

export const syncApi = {
    /**
     * 推送本地更改到服务器
     * @param {Array} changes - 本地更改列表
     * @returns {Promise} 同步结果
     */
    async push(changes) {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = Config.API_ENDPOINTS.SYNC.PUSH;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ changes })
        });
        
        if (!response.ok) {
            throw new Error(`推送更改失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 从服务器拉取更新
     * @param {number} lastSyncTime - 上次同步时间戳
     * @returns {Promise} 服务器更新
     */
    async pull(lastSyncTime) {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = `${Config.API_ENDPOINTS.SYNC.PULL}?lastSync=${lastSyncTime}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`拉取更新失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 处理同步冲突
     * @param {Array} conflicts - 冲突列表
     * @returns {Promise} 冲突解决结果
     */
    async resolveConflicts(conflicts) {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = Config.API_ENDPOINTS.SYNC.CONFLICTS;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ conflicts })
        });
        
        if (!response.ok) {
            throw new Error(`解决冲突失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 获取同步状态
     * @returns {Promise} 同步状态
     */
    async status() {
        const token = localStorage.getItem(Config.STORAGE.KEYS.TOKEN);
        const url = Config.API_ENDPOINTS.SYNC.STATUS;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`获取同步状态失败: ${response.status}`);
        }
        
        return await response.json();
    },
    
    /**
     * 开始后台同步
     * @returns {Promise} 同步结果
     */
    async startBackgroundSync() {
        if ('sync' in registration) {
            try {
                await registration.sync.register('sync-notes');
                return { success: true, message: '后台同步已注册' };
            } catch (error) {
                console.error('后台同步注册失败:', error);
                return { success: false, error: error.message };
            }
        }
        return { success: false, error: '后台同步不可用' };
    }
};
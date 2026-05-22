/**
 * 离线管理模块
 * 作用：处理应用在离线状态下的数据同步和队列管理
 * 注意：这是一个模拟版本，实际项目中需要与IndexedDB等本地数据库集成
 */

class OfflineManager {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.isInitialized = false;
        
        // 事件监听器
        this.listeners = {
            'queue:added': [],
            'queue:processed': [],
            'queue:cleared': [],
            'sync:start': [],
            'sync:complete': [],
            'sync:error': []
        };
    }
    
    /**
     * 初始化离线管理器
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            // 从本地存储加载队列
            this.queue = Utils.storage.get('offline_queue', []);
            
            console.log(`[离线管理] 初始化完成，队列中有 ${this.queue.length} 项`);
            
            // 监听网络状态变化
            this.setupNetworkListeners();
            
            // 监听应用可见性变化
            this.setupVisibilityListeners();
            
            this.isInitialized = true;
            this.emit('initialized', { queueSize: this.queue.length });
            
        } catch (error) {
            console.error('[离线管理] 初始化失败:', error);
        }
    }
    
    /**
     * 设置网络状态监听
     */
    setupNetworkListeners() {
        // 监听在线状态
        window.addEventListener('online', () => {
            console.log('[离线管理] 网络已连接');
            this.emit('network:online');
            
            // 网络恢复时自动处理队列
            this.processQueue();
        });
        
        // 监听离线状态
        window.addEventListener('offline', () => {
            console.log('[离线管理] 网络已断开');
            this.emit('network:offline');
        });
    }
    
    /**
     * 设置可见性监听
     */
    setupVisibilityListeners() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && Config.isOnline()) {
                // 应用变为可见且在线时，处理队列
                this.processQueue();
            }
        });
    }
    
    /**
     * 添加任务到队列
     * @param {string} action - 操作类型
     * @param {Object} data - 任务数据
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 队列项
     */
    async addToQueue(action, data, options = {}) {
        const queueItem = {
            id: Utils.generateId('queue'),
            action,
            data,
            timestamp: new Date().toISOString(),
            retries: 0,
            maxRetries: options.maxRetries || 3,
            priority: options.priority || 'normal', // high, normal, low
            metadata: options.metadata || {}
        };
        
        // 添加到队列
        this.queue.push(queueItem);
        
        // 按优先级排序
        this.sortQueue();
        
        // 保存到本地存储
        await this.saveQueue();
        
        console.log(`[离线管理] 添加到队列: ${action}`, data);
        this.emit('queue:added', queueItem);
        
        // 如果在线，立即处理队列
        if (Config.isOnline() && options.processImmediately !== false) {
            this.processQueue();
        }
        
        return queueItem;
    }
    
    /**
     * 对队列进行排序
     */
    sortQueue() {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        this.queue.sort((a, b) => {
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return new Date(a.timestamp) - new Date(b.timestamp);
        });
    }
    
    /**
     * 处理队列
     */
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0 || !Config.isOnline()) {
            return;
        }
        
        this.isProcessing = true;
        this.emit('sync:start', { queueSize: this.queue.length });
        
        console.log(`[离线管理] 开始处理队列，共 ${this.queue.length} 项`);
        
        try {
            let successCount = 0;
            let errorCount = 0;
            const maxBatchSize = Config.SYNC.BATCH_SIZE;
            
            // 分批处理，防止一次处理太多
            while (this.queue.length > 0 && successCount + errorCount < maxBatchSize) {
                const item = this.queue[0];
                
                try {
                    await this.processQueueItem(item);
                    successCount++;
                    
                    // 移除已处理项
                    this.queue.shift();
                    
                } catch (error) {
                    errorCount++;
                    
                    // 重试逻辑
                    if (item.retries < item.maxRetries) {
                        item.retries++;
                        item.lastError = error.message;
                        item.nextRetry = Date.now() + (Config.SYNC.RETRY_DELAY * item.retries);
                        console.log(`[离线管理] 重试任务 ${item.id} (${item.retries}/${item.maxRetries})`);
                    } else {
                        // 重试次数用尽，移到失败队列
                        console.error(`[离线管理] 任务失败: ${item.id}`, error);
                        await this.moveToFailedQueue(item, error);
                        this.queue.shift();
                    }
                }
                
                // 保存队列状态
                await this.saveQueue();
            }
            
            console.log(`[离线管理] 队列处理完成，成功: ${successCount}, 失败: ${errorCount}`);
            this.emit('sync:complete', { successCount, errorCount, remaining: this.queue.length });
            
        } catch (error) {
            console.error('[离线管理] 队列处理失败:', error);
            this.emit('sync:error', error);
            
        } finally {
            this.isProcessing = false;
            
            // 如果还有未处理项，计划下次处理
            if (this.queue.length > 0) {
                setTimeout(() => this.processQueue(), 5000);
            }
        }
    }
    
    /**
     * 处理单个队列项
     * @param {Object} item - 队列项
     */
    async processQueueItem(item) {
        console.log(`[离线管理] 处理任务: ${item.action}`, item.data);
        
        // 模拟API调用延迟
        await Utils.sleep(300);
        
        switch (item.action) {
            case 'create_note':
                // 这里应该是真实的API调用
                // await Api.notes.create(item.data);
                console.log(`[离线管理] 创建笔记: ${item.data.title}`);
                break;
                
            case 'update_note':
                // await Api.notes.update(item.data.id, item.data);
                console.log(`[离线管理] 更新笔记: ${item.data.id}`);
                break;
                
            case 'delete_note':
                // await Api.notes.delete(item.data.id);
                console.log(`[离线管理] 删除笔记: ${item.data.id}`);
                break;
                
            case 'create_category':
                // await Api.categories.create(item.data);
                console.log(`[离线管理] 创建分类: ${item.data.name}`);
                break;
                
            case 'update_category':
                // await Api.categories.update(item.data.id, item.data);
                console.log(`[离线管理] 更新分类: ${item.data.id}`);
                break;
                
            case 'delete_category':
                // await Api.categories.delete(item.data.id);
                console.log(`[离线管理] 删除分类: ${item.data.id}`);
                break;
                
            case 'update_settings':
                // await Api.settings.update(item.data);
                console.log(`[离线管理] 更新设置`);
                break;
                
            default:
                console.warn(`[离线管理] 未知操作类型: ${item.action}`);
        }
        
        this.emit('queue:processed', item);
    }
    
    /**
     * 移动到失败队列
     * @param {Object} item - 队列项
     * @param {Error} error - 错误对象
     */
    async moveToFailedQueue(item, error) {
        const failedItem = {
            ...item,
            failedAt: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack
            }
        };
        
        const failedQueue = Utils.storage.get('offline_failed_queue', []);
        failedQueue.push(failedItem);
        Utils.storage.set('offline_failed_queue', failedQueue);
        
        this.emit('queue:failed', failedItem);
    }
    
    /**
     * 保存队列到本地存储
     */
    async saveQueue() {
        return Utils.storage.set('offline_queue', this.queue);
    }
    
    /**
     * 获取队列状态
     * @returns {Object} 队列状态
     */
    getQueueStatus() {
        return {
            total: this.queue.length,
            processing: this.isProcessing,
            items: this.queue.map(item => ({
                id: item.id,
                action: item.action,
                timestamp: item.timestamp,
                retries: item.retries,
                priority: item.priority
            })),
            byPriority: {
                high: this.queue.filter(item => item.priority === 'high').length,
                normal: this.queue.filter(item => item.priority === 'normal').length,
                low: this.queue.filter(item => item.priority === 'low').length
            }
        };
    }
    
    /**
     * 获取失败队列
     * @returns {Array} 失败队列
     */
    getFailedQueue() {
        return Utils.storage.get('offline_failed_queue', []);
    }
    
    /**
     * 清除失败队列
     */
    async clearFailedQueue() {
        Utils.storage.set('offline_failed_queue', []);
        this.emit('queue:failed:cleared');
    }
    
    /**
     * 重试失败队列
     */
    async retryFailedQueue() {
        const failedQueue = this.getFailedQueue();
        
        for (const item of failedQueue) {
            await this.addToQueue(item.action, item.data, {
                priority: 'high',
                maxRetries: item.maxRetries
            });
        }
        
        await this.clearFailedQueue();
    }
    
    /**
     * 清空队列
     */
    async clearQueue() {
        this.queue = [];
        await this.saveQueue();
        this.emit('queue:cleared');
    }
    
    /**
     * 事件监听
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    
    /**
     * 移除事件监听
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (!this.listeners[event]) return;
        const index = this.listeners[event].indexOf(callback);
        if (index > -1) {
            this.listeners[event].splice(index, 1);
        }
    }
    
    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {any} data - 事件数据
     */
    emit(event, data = null) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[离线管理] 事件处理错误: ${event}`, error);
                }
            });
        }
    }
    
    /**
     * 检查是否有待同步数据
     * @returns {boolean} 是否有待同步数据
     */
    hasPendingSync() {
        return this.queue.length > 0;
    }
    
    /**
     * 获取最后同步时间
     * @returns {string|null} 最后同步时间
     */
    getLastSyncTime() {
        return Utils.storage.get('last_sync_time');
    }
    
    /**
     * 更新最后同步时间
     */
    updateLastSyncTime() {
        Utils.storage.set('last_sync_time', new Date().toISOString());
    }
}

// 创建单例实例
const offlineManager = new OfflineManager();

// 初始化
offlineManager.init();

// 暴露到全局
if (typeof window !== 'undefined') {
    window.OfflineManager = offlineManager;
}

// 导出（如果支持ES6模块）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = offlineManager;
}
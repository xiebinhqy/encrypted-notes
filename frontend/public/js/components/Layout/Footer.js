/**
 * 页脚组件
 * 包含版权信息、快速链接、系统状态等
 */

import Config from '../../config.js';
import Utils from '../../core/utils.js';

export class Footer {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.state = {
            currentYear: new Date().getFullYear(),
            version: Config.APP_VERSION,
            systemStatus: 'normal', // normal, warning, error
            lastSyncTime: null,
            onlineUsers: 1
        };
        
        this.init();
    }
    
    /**
     * 初始化组件
     */
    init() {
        // 从本地存储加载最后同步时间
        this.loadLastSyncTime();
        
        // 监听系统事件
        this.setupEventListeners();
    }
    
    /**
     * 从本地存储加载最后同步时间
     */
    loadLastSyncTime() {
        const syncState = Utils.storage.get(Config.STORAGE.KEYS.SYNC_STATE, {});
        if (syncState.lastSync) {
            this.state.lastSyncTime = syncState.lastSync;
        }
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听同步完成事件
        document.addEventListener('sync:complete', (e) => {
            this.handleSyncComplete(e.detail);
        });
        
        // 监听系统状态变化
        document.addEventListener('app:status-change', (e) => {
            this.handleStatusChange(e.detail);
        });
    }
    
    /**
     * 渲染组件
     */
    async render(container) {
        this.container = container;
        
        // 渲染页脚结构
        container.innerHTML = this.getTemplate();
        
        // 缓存DOM元素
        this.cacheElements();
        
        // 绑定事件
        this.bindEvents();
        
        // 更新状态显示
        this.updateStatus();
        
        // 开始实时更新
        this.startRealTimeUpdates();
    }
    
    /**
     * 获取模板
     */
    getTemplate() {
        return `
            <footer class="footer bg-dark-light border-t border-dark-lighter px-6 py-4">
                <div class="footer-content max-w-7xl mx-auto">
                    <div class="footer-main flex flex-col md:flex-row items-center justify-between gap-4">
                        <!-- 左侧：版权信息 -->
                        <div class="footer-left text-center md:text-left">
                            <div class="copyright text-sm text-gray-400">
                                © ${this.state.currentYear} 我的加密笔记. 所有数据均受端对端加密保护.
                            </div>
                            <div class="version text-xs text-gray-500 mt-1">
                                v${this.state.version} | 安全级别: 最高
                            </div>
                        </div>
                        
                        <!-- 中间：快速链接 -->
                        <div class="footer-center">
                            <div class="footer-links flex items-center gap-4 text-sm">
                                <a href="/privacy" class="footer-link text-gray-400 hover:text-white transition-colors">
                                    隐私政策
                                </a>
                                <a href="/terms" class="footer-link text-gray-400 hover:text-white transition-colors">
                                    服务条款
                                </a>
                                <a href="/help" class="footer-link text-gray-400 hover:text-white transition-colors">
                                    帮助中心
                                </a>
                                <a href="/about" class="footer-link text-gray-400 hover:text-white transition-colors">
                                    关于我们
                                </a>
                            </div>
                        </div>
                        
                        <!-- 右侧：系统状态 -->
                        <div class="footer-right">
                            <div class="system-status flex items-center gap-3 text-sm">
                                <!-- 在线状态 -->
                                <div class="online-status flex items-center gap-1.5">
                                    <div class="status-dot w-2 h-2 rounded-full ${navigator.onLine ? 'bg-emerald-400' : 'bg-gray-400'}"></div>
                                    <span class="status-text text-gray-400">${navigator.onLine ? '在线' : '离线'}</span>
                                </div>
                                
                                <!-- 最后同步时间 -->
                                <div class="sync-status flex items-center gap-1.5 ${this.state.lastSyncTime ? '' : 'hidden'}">
                                    <i class="fas fa-sync-alt text-gray-400 text-xs"></i>
                                    <span class="sync-text text-gray-400 text-xs">${this.state.lastSyncTime ? Utils.formatDate(this.state.lastSyncTime, 'time') : '--:--'}</span>
                                </div>
                                
                                <!-- 在线用户数 -->
                                <div class="online-users flex items-center gap-1.5">
                                    <i class="fas fa-users text-gray-400 text-xs"></i>
                                    <span class="users-count text-gray-400 text-xs">${this.state.onlineUsers}</span>
                                </div>
                                
                                <!-- 系统状态指示器 -->
                                <div class="system-health flex items-center gap-1.5 cursor-help" title="系统健康状态">
                                    <div class="health-dot w-2 h-2 rounded-full ${this.getStatusColor()}"></div>
                                    <span class="health-text text-gray-400 text-xs">${this.getStatusText()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 底部：额外信息 -->
                    <div class="footer-bottom mt-4 pt-3 border-t border-dark-lighter border-dashed text-center">
                        <div class="additional-info text-xs text-gray-500">
                            <p>本应用使用端对端加密技术，您的数据仅存储在本地和您自己的加密空间。</p>
                            <p class="mt-1">推荐使用 Chrome 90+ 或 Firefox 88+ 浏览器以获得最佳体验</p>
                        </div>
                    </div>
                </div>
            </footer>
        `;
    }
    
    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.onlineStatus = this.container.querySelector('.online-status');
        this.syncStatus = this.container.querySelector('.sync-status');
        this.syncText = this.container.querySelector('.sync-text');
        this.healthDot = this.container.querySelector('.health-dot');
        this.healthText = this.container.querySelector('.health-text');
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 网络状态变化
        window.addEventListener('online', () => this.updateOnlineStatus(true));
        window.addEventListener('offline', () => this.updateOnlineStatus(false));
        
        // 点击健康状态指示器
        const healthIndicator = this.container.querySelector('.system-health');
        if (healthIndicator) {
            healthIndicator.addEventListener('click', () => this.showSystemStatus());
        }
        
        // 点击同步状态
        if (this.syncStatus) {
            this.syncStatus.addEventListener('click', () => this.triggerManualSync());
        }
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }
    
    /**
     * 获取状态颜色
     */
    getStatusColor() {
        switch (this.state.systemStatus) {
            case 'normal': return 'bg-emerald-400';
            case 'warning': return 'bg-amber-400';
            case 'error': return 'bg-red-400';
            default: return 'bg-gray-400';
        }
    }
    
    /**
     * 获取状态文本
     */
    getStatusText() {
        switch (this.state.systemStatus) {
            case 'normal': return '正常';
            case 'warning': return '警告';
            case 'error': return '错误';
            default: return '未知';
        }
    }
    
    /**
     * 更新状态显示
     */
    updateStatus() {
        // 更新在线状态
        this.updateOnlineStatus(navigator.onLine);
        
        // 更新健康状态
        if (this.healthDot && this.healthText) {
            this.healthDot.className = `health-dot w-2 h-2 rounded-full ${this.getStatusColor()}`;
            this.healthText.textContent = this.getStatusText();
        }
        
        // 更新同步时间
        if (this.syncText && this.state.lastSyncTime) {
            this.syncText.textContent = Utils.formatDate(this.state.lastSyncTime, 'time');
        }
    }
    
    /**
     * 更新在线状态
     */
    updateOnlineStatus(isOnline) {
        if (this.onlineStatus) {
            const statusDot = this.onlineStatus.querySelector('.status-dot');
            const statusText = this.onlineStatus.querySelector('.status-text');
            
            if (statusDot) {
                statusDot.className = `status-dot w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-gray-400'}`;
            }
            
            if (statusText) {
                statusText.textContent = isOnline ? '在线' : '离线';
            }
        }
    }
    
    /**
     * 开始实时更新
     */
    startRealTimeUpdates() {
        // 每秒更新一次时间
        this.timeInterval = setInterval(() => {
            if (this.state.lastSyncTime) {
                this.updateSyncTimeDisplay();
            }
        }, 1000);
        
        // 每30秒更新一次在线用户数（模拟）
        this.userInterval = setInterval(() => {
            this.updateOnlineUsers();
        }, 30000);
        
        // 每5分钟检查一次系统状态
        this.statusInterval = setInterval(() => {
            this.checkSystemStatus();
        }, 300000);
    }
    
    /**
     * 更新同步时间显示
     */
    updateSyncTimeDisplay() {
        if (this.syncText && this.state.lastSyncTime) {
            this.syncText.textContent = Utils.formatDate(this.state.lastSyncTime, 'time');
        }
    }
    
    /**
     * 更新在线用户数
     */
    updateOnlineUsers() {
        // 模拟在线用户数变化
        const change = Math.random() > 0.5 ? 1 : -1;
        const newCount = Math.max(1, this.state.onlineUsers + change);
        
        if (newCount !== this.state.onlineUsers) {
            this.state.onlineUsers = newCount;
            
            const usersCount = this.container.querySelector('.users-count');
            if (usersCount) {
                usersCount.textContent = newCount;
                
                // 添加动画效果
                usersCount.classList.add('scale-110');
                setTimeout(() => {
                    usersCount.classList.remove('scale-110');
                }, 300);
            }
        }
    }
    
    /**
     * 检查系统状态
     */
    checkSystemStatus() {
        // 模拟系统状态检查
        const statuses = ['normal', 'warning', 'normal', 'normal'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        if (randomStatus !== this.state.systemStatus) {
            this.state.systemStatus = randomStatus;
            this.updateStatus();
            
            // 如果状态变为警告或错误，显示通知
            if (randomStatus === 'warning' || randomStatus === 'error') {
                this.showStatusNotification(randomStatus);
            }
        }
    }
    
    /**
     * 处理同步完成事件
     */
    handleSyncComplete(detail) {
        if (detail && detail.timestamp) {
            this.state.lastSyncTime = detail.timestamp;
            
            // 保存到本地存储
            Utils.storage.set(Config.STORAGE.KEYS.SYNC_STATE, {
                lastSync: detail.timestamp
            });
            
            // 更新显示
            this.updateSyncTimeDisplay();
            
            // 显示同步状态
            if (this.syncStatus) {
                this.syncStatus.classList.remove('hidden');
                
                // 添加动画效果
                this.syncStatus.classList.add('text-emerald-400');
                setTimeout(() => {
                    this.syncStatus.classList.remove('text-emerald-400');
                }, 2000);
            }
        }
    }
    
    /**
     * 处理状态变化事件
     */
    handleStatusChange(detail) {
        if (detail && detail.status) {
            this.state.systemStatus = detail.status;
            this.updateStatus();
        }
    }
    
    /**
     * 显示系统状态弹窗
     */
    showSystemStatus() {
        const statusInfo = {
            normal: {
                title: '系统运行正常',
                message: '所有服务运行正常，您可以放心使用。',
                icon: 'fa-check-circle',
                color: 'emerald'
            },
            warning: {
                title: '系统警告',
                message: '检测到部分服务响应缓慢，但不影响核心功能。',
                icon: 'fa-exclamation-triangle',
                color: 'amber'
            },
            error: {
                title: '系统错误',
                message: '检测到服务异常，部分功能可能不可用。',
                icon: 'fa-exclamation-circle',
                color: 'red'
            }
        };
        
        const info = statusInfo[this.state.systemStatus] || statusInfo.normal;
        
        this.app.showNotification(`
            <div class="text-left">
                <h4 class="font-semibold text-white mb-1">${info.title}</h4>
                <p class="text-gray-300 text-sm">${info.message}</p>
                <div class="mt-2 text-xs text-gray-400">
                    <div class="flex items-center justify-between">
                        <span>在线用户: ${this.state.onlineUsers}</span>
                        <span>最后同步: ${this.state.lastSyncTime ? Utils.formatDate(this.state.lastSyncTime, 'datetime') : '从未同步'}</span>
                    </div>
                </div>
            </div>
        `, this.state.systemStatus, 5000);
    }
    
    /**
     * 显示状态通知
     */
    showStatusNotification(status) {
        const messages = {
            warning: '系统检测到潜在问题，建议保存您的工作。',
            error: '系统遇到错误，部分功能可能受限。'
        };
        
        if (messages[status]) {
            this.app.showNotification(messages[status], status, 10000);
        }
    }
    
    /**
     * 触发手动同步
     */
    async triggerManualSync() {
        try {
            this.app.showNotification('正在手动同步数据...', 'info');
            
            // 触发同步事件
            document.dispatchEvent(new CustomEvent('sync:manual'));
            
            // 模拟同步延迟
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            this.app.showNotification('数据同步完成', 'success');
            
        } catch (error) {
            console.error('手动同步失败:', error);
            this.app.showNotification('同步失败，请检查网络连接', 'error');
        }
    }
    
    /**
     * 处理键盘事件
     */
    handleKeydown(event) {
        // Ctrl+Alt+S 手动同步
        if ((event.ctrlKey || event.metaKey) && event.altKey && event.key === 's') {
            event.preventDefault();
            this.triggerManualSync();
        }
        
        // F1 显示系统状态
        if (event.key === 'F1') {
            event.preventDefault();
            this.showSystemStatus();
        }
    }
    
    /**
     * 页面显示时的回调
     */
    onShow() {
        console.log('[页脚] 组件显示');
        this.updateStatus();
    }
    
    /**
     * 页面隐藏时的回调
     */
    onHide() {
        console.log('[页脚] 组件隐藏');
        
        // 清理定时器
        if (this.timeInterval) {
            clearInterval(this.timeInterval);
            this.timeInterval = null;
        }
        
        if (this.userInterval) {
            clearInterval(this.userInterval);
            this.userInterval = null;
        }
        
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
    }
}
/**
 * 仪表盘页面组件
 * 包含数据看板、统计图表、实时日志等功能
 */

import Api from '../api/index.js';
import OfflineManager from '../core/offline.js';
import Utils from '../core/utils.js';
import Config from '../config.js';

class DashboardPage {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.charts = {
            noteTrend: null,
            categoryPie: null,
            activity: null,
            tag: null
        };
        this.stats = {
            notes: 0,
            categories: 0,
            tags: 0,
            drafts: 0,
            trash: 0
        };
        this.autoRefreshInterval = null;
    }
    
    /**
     * 渲染页面
     */
    async render(container) {
        this.container = container;
        
        // 渲染页面结构
        container.innerHTML = this.getTemplate();
        
        // 初始化页面
        await this.init();
        
        // 绑定事件
        this.bindEvents();
    }
    
    /**
     * 获取页面模板
     */
    getTemplate() {
        return `
            <div class="dashboard-page p-5 space-y-5">
                <!-- 面包屑和标题 -->
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-2xl font-bold text-white mb-1">数据看板</h1>
                        <p class="text-gray-400 text-sm">概览你的笔记数据和最近更新</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="export-btn px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors flex items-center space-x-2">
                            <i class="fa-solid fa-arrow-down-wide-short"></i>
                            <span>导出报表</span>
                        </button>
                        <button class="filter-btn px-3 py-1.5 bg-dark-lighter hover:bg-dark text-gray-300 text-sm rounded-lg transition-colors flex items-center space-x-2">
                            <i class="fa-solid fa-filter"></i>
                            <span>筛选</span>
                        </button>
                    </div>
                </div>
                
                <!-- 说明区域 -->
                <div class="dashboard-info bg-dark-light rounded-xl p-5 border border-dark-lighter">
                    <h2 class="text-lg font-semibold text-white mb-3">
                        <i class="fa-solid fa-info-circle text-indigo-400 mr-2"></i>数据看板说明
                    </h2>
                    <p class="text-gray-300 mb-2">欢迎使用数据看板！这里提供了您的笔记数据的全面概览。通过此面板，您可以：</p>
                    <ul class="text-gray-300 mb-3">
                        <li>查看笔记、分类、标签的统计信息</li>
                        <li>了解笔记创建和修改的趋势</li>
                        <li>管理待保存的草稿和回收站内容</li>
                        <li>查看最近的活动和更新</li>
                    </ul>
                    <p class="text-gray-300 text-sm">提示：点击各个卡片可以查看详细信息和更多操作选项。</p>
                </div>
                
                <!-- 指标卡片行 -->
                <div class="stats-grid grid grid-cols-5 gap-3">
                    ${this.getStatsCards()}
                </div>
                
                <!-- 图表区域 -->
                <div class="charts-grid grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- 左侧图表区域 -->
                    <div class="lg:col-span-2">
                        <div class="trend-chart-container bg-dark-light rounded-xl p-4 border border-dark-lighter">
                            <div class="flex items-center justify-between mb-4">
                                <h2 class="text-lg font-semibold text-white">笔记创建趋势</h2>
                                <div class="time-filters flex space-x-1 text-xs text-gray-400">
                                    <button class="time-filter active" data-period="week">周</button>
                                    <button class="time-filter" data-period="month">月</button>
                                    <button class="time-filter" data-period="year">年</button>
                                </div>
                            </div>
                            <div class="chart-wrapper h-[280px]">
                                <canvas id="noteTrendChart"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 右侧最近更新 -->
                    <div class="recent-updates bg-dark-light rounded-xl p-4 border border-dark-lighter">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-lg font-semibold text-white">最近更新</h2>
                            <a href="#" class="view-all text-xs text-indigo-400 hover:underline">查看全部 &gt;</a>
                        </div>
                        <div class="updates-list space-y-3 max-h-[250px] overflow-y-auto">
                            <!-- 动态加载 -->
                        </div>
                    </div>
                </div>
                
                <!-- 底部统计区域 -->
                <div class="bottom-stats grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- 分类分布 -->
                    <div class="category-chart bg-dark-light rounded-xl p-4 border border-dark-lighter">
                        <h2 class="text-lg font-semibold text-white mb-4">分类分布</h2>
                        <div class="chart-wrapper h-[220px]">
                            <canvas id="categoryPieChart"></canvas>
                        </div>
                    </div>
                    
                    <!-- 最近活动 -->
                    <div class="recent-activities bg-dark-light rounded-xl p-4 border border-dark-lighter">
                        <h2 class="text-lg font-semibold text-white mb-4">最近活动</h2>
                        <div class="activities-list space-y-3 max-h-[180px] overflow-y-auto">
                            <!-- 动态加载 -->
                        </div>
                    </div>
                    
                    <!-- 实时日志 -->
                    <div class="realtime-log bg-dark-light rounded-xl p-4 border border-dark-lighter">
                        <h2 class="text-lg font-semibold text-white mb-4">实时日志</h2>
                        <div class="log-container h-[180px] overflow-y-auto" id="realtime-log">
                            <!-- 动态加载 -->
                        </div>
                    </div>
                </div>
                
                <!-- 离线状态指示器 -->
                <div class="offline-status hidden mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div class="flex items-center text-yellow-400">
                        <i class="fa-solid fa-wifi-slash mr-2"></i>
                        <span>离线模式：数据将在网络恢复后同步</span>
                        <span class="ml-auto text-sm">待同步操作: <span class="pending-count">0</span></span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取统计卡片HTML
     */
    getStatsCards() {
        return `
            <!-- 总笔记数 -->
            <div class="stat-card bg-dark-light rounded-xl p-5 border border-dark-lighter card-transition" data-stat="notes">
                <div class="flex items-start justify-between">
                    <div>
                        <p class="text-gray-400 text-xs font-medium uppercase tracking-wider">总笔记数</p>
                        <h3 class="text-2xl font-bold text-white mt-1 mb-2 stat-value" data-target="0">0</h3>
                        <div class="trend text-xs text-emerald-400 font-medium">
                            <i class="fa-solid fa-arrow-up mr-1 text-[10px]"></i>
                            <span>加载中...</span>
                        </div>
                    </div>
                    <div class="stat-icon w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <i class="fa-solid fa-file-lines text-base"></i>
                    </div>
                </div>
            </div>
            
            <!-- 总分类数 -->
            <div class="stat-card bg-dark-light rounded-xl p-5 border border-dark-lighter card-transition" data-stat="categories">
                <div class="flex items-start justify-between">
                    <div>
                        <p class="text-gray-400 text-xs font-medium uppercase tracking-wider">总分类数</p>
                        <h3 class="text-2xl font-bold text-white mt-1 mb-2 stat-value" data-target="0">0</h3>
                        <div class="trend text-xs text-emerald-400 font-medium">
                            <i class="fa-solid fa-arrow-up mr-1 text-[10px]"></i>
                            <span>加载中...</span>
                        </div>
                    </div>
                    <div class="stat-icon w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <i class="fa-solid fa-folder-tree text-base"></i>
                    </div>
                </div>
            </div>
            
            <!-- 总标签数 -->
            <div class="stat-card bg-dark-light rounded-xl p-5 border border-dark-lighter card-transition" data-stat="tags">
                <div class="flex items-start justify-between">
                    <div>
                        <p class="text-gray-400 text-xs font-medium uppercase tracking-wider">总标签数</p>
                        <h3 class="text-2xl font-bold text-white mt-1 mb-2 stat-value" data-target="0">0</h3>
                        <div class="trend text-xs text-gray-500 font-medium">
                            <i class="fa-solid fa-minus mr-1 text-[10px]"></i>
                            <span>加载中...</span>
                        </div>
                    </div>
                    <div class="stat-icon w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <i class="fa-solid fa-tag text-base"></i>
                    </div>
                </div>
            </div>
            
            <!-- 待保存草稿 -->
            <div class="stat-card bg-dark-light rounded-xl p-5 border border-dark-lighter card-transition" data-stat="drafts">
                <div class="flex items-start justify-between">
                    <div>
                        <p class="text-gray-400 text-xs font-medium uppercase tracking-wider">待保存草稿</p>
                        <h3 class="text-2xl font-bold text-white mt-1 mb-2 stat-value" data-target="0">0</h3>
                        <div class="trend text-xs text-amber-400 font-medium">
                            <i class="fa-solid fa-triangle-exclamation mr-1 text-[10px]"></i>
                            <span>加载中...</span>
                        </div>
                    </div>
                    <div class="stat-icon w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                        <i class="fa-solid fa-pen-nib text-base"></i>
                    </div>
                </div>
            </div>
            
            <!-- 回收站 -->
            <div class="stat-card bg-dark-light rounded-xl p-5 border border-dark-lighter card-transition" data-stat="trash">
                <div class="flex items-start justify-between">
                    <div>
                        <p class="text-gray-400 text-xs font-medium uppercase tracking-wider">回收站</p>
                        <h3 class="text-2xl font-bold text-white mt-1 mb-2 stat-value" data-target="0">0</h3>
                        <div class="trend text-xs text-emerald-400 font-medium">
                            <i class="fa-solid fa-check mr-1 text-[10px]"></i>
                            <span>加载中...</span>
                        </div>
                    </div>
                    <div class="stat-icon w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
                        <i class="fa-solid fa-trash-can-arrow-up text-base"></i>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 初始化页面
     */
    async init() {
        try {
            // 加载统计数据
            await this.loadStats();
            
            // 初始化图表
            this.initCharts();
            
            // 加载最近更新
            await this.loadRecentUpdates();
            
            // 加载最近活动
            await this.loadRecentActivities();
            
            // 初始化实时日志
            this.initRealtimeLog();
            
            // 检查离线状态
            this.checkOfflineStatus();
            
            // 设置自动刷新
            this.startAutoRefresh();
            
            // 监听离线状态变化
            this.setupOfflineListeners();
            
        } catch (error) {
            console.error('[仪表盘] 初始化失败:', error);
            this.showError('加载仪表盘数据失败');
        }
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 时间筛选
        this.container.querySelectorAll('.time-filter').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleTimeFilter(e));
        });
        
        // 导出按钮
        this.container.querySelector('.export-btn').addEventListener('click', () => this.exportReport());
        
        // 筛选按钮
        this.container.querySelector('.filter-btn').addEventListener('click', () => this.openFilter());
        
        // 查看全部
        this.container.querySelector('.view-all').addEventListener('click', (e) => {
            e.preventDefault();
            this.app.router.navigate('events');
        });
        
        // 统计卡片点击
        this.container.querySelectorAll('.stat-card').forEach(card => {
            card.addEventListener('click', (e) => this.handleStatCardClick(e));
        });
    }
    
    /**
     * 加载统计数据
     */
    async loadStats() {
        try {
            // 从API获取统计数据
            const stats = await Api.notes.stats();
            this.stats = { ...this.stats, ...stats };
            
            // 更新UI
            this.updateStatsUI();
            
        } catch (error) {
            console.error('[仪表盘] 获取统计失败:', error);
            
            // 如果离线，从本地存储获取
            if (!Config.isOnline()) {
                this.loadStatsFromLocal();
            }
        }
    }
    
    /**
     * 从本地存储加载统计
     */
    loadStatsFromLocal() {
        const localStats = Utils.storage.get('dashboard_stats', {});
        this.stats = { ...this.stats, ...localStats };
        this.updateStatsUI();
    }
    
    /**
     * 更新统计UI
     */
    updateStatsUI() {
        // 更新每个统计卡片
        Object.entries(this.stats).forEach(([key, value]) => {
            const card = this.container.querySelector(`.stat-card[data-stat="${key}"]`);
            if (card) {
                const valueEl = card.querySelector('.stat-value');
                if (valueEl) {
                    this.animateCount(valueEl, value);
                }
            }
        });
    }
    
    /**
     * 数字动画
     */
    animateCount(element, target) {
        const current = parseInt(element.textContent) || 0;
        const diff = target - current;
        const duration = 500; // 动画时长
        const steps = 20;
        const step = diff / steps;
        let currentStep = 0;
        
        const timer = setInterval(() => {
            currentStep++;
            const newValue = Math.round(current + (step * currentStep));
            element.textContent = newValue;
            
            if (currentStep >= steps) {
                element.textContent = target;
                clearInterval(timer);
            }
        }, duration / steps);
    }
    
    /**
     * 初始化图表
     */
    initCharts() {
        // 初始化趋势图
        this.initTrendChart();
        
        // 初始化分类饼图
        this.initCategoryChart();
    }
    
    /**
     * 初始化趋势图
     */
    initTrendChart() {
        const ctx = this.container.querySelector('#noteTrendChart');
        if (!ctx) return;
        
        // 销毁现有图表
        if (this.charts.noteTrend) {
            this.charts.noteTrend.destroy();
        }
        
        this.charts.noteTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
                datasets: [{
                    label: '笔记创建数',
                    data: [12, 19, 8, 15, 12, 16, 10],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
    }
    
    /**
     * 初始化分类饼图
     */
    initCategoryChart() {
        const ctx = this.container.querySelector('#categoryPieChart');
        if (!ctx) return;
        
        // 销毁现有图表
        if (this.charts.categoryPie) {
            this.charts.categoryPie.destroy();
        }
        
        this.charts.categoryPie = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['重要', '个人', '工作', '学习', '其他'],
                datasets: [{
                    data: [25, 20, 30, 15, 10],
                    backgroundColor: [
                        '#3b82f6', // 蓝色
                        '#8b5cf6', // 紫色
                        '#10b981', // 绿色
                        '#f59e0b', // 橙色
                        '#94a3b8'  // 灰色
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#94a3b8',
                            padding: 20
                        }
                    }
                }
            }
        });
    }
    
    /**
     * 加载最近更新
     */
    async loadRecentUpdates() {
        const container = this.container.querySelector('.updates-list');
        if (!container) return;
        
        // 模拟数据
        const updates = [
            {
                id: 1,
                title: '测试日志',
                category: '测试分类',
                edits: 4,
                time: '5天前',
                color: 'rose'
            },
            {
                id: 2,
                title: 'linux-脚本',
                category: '脚本分类',
                edits: 6,
                time: '9天前',
                color: 'amber'
            },
            {
                id: 3,
                title: '项目文档',
                category: '工作',
                edits: 2,
                time: '3天前',
                color: 'violet'
            }
        ];
        
        container.innerHTML = updates.map(update => `
            <div class="update-item flex items-start space-x-3 p-3 bg-dark rounded-lg border border-dark-lighter hover:border-${update.color}-500/50 transition-colors cursor-pointer group">
                <div class="update-icon w-7 h-7 rounded-lg bg-${update.color}-500/10 flex items-center justify-center text-${update.color}-400 flex-shrink-0">
                    <i class="fa-solid fa-file-pen text-sm"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-medium text-white truncate group-hover:text-${update.color}-400 transition-colors">${update.title}</h4>
                    <div class="flex items-center mt-1">
                        <span class="text-xs text-gray-400 bg-dark-lighter px-2 py-0.5 rounded mr-2">${update.category}</span>
                        <span class="text-xs text-gray-500">修改${update.edits}次</span>
                    </div>
                    <div class="flex items-center justify-between mt-1">
                        <span class="text-xs text-gray-500">${update.time}</span>
                        <div class="actions flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="view-btn text-gray-400 hover:text-white text-xs" data-id="${update.id}">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button class="delete-btn text-gray-400 hover:text-red-400 text-xs" data-id="${update.id}">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        // 绑定事件
        container.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.viewNote(e.target.dataset.id));
        });
        
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteNote(e.target.dataset.id));
        });
    }
    
    /**
     * 加载最近活动
     */
    async loadRecentActivities() {
        const container = this.container.querySelector('.activities-list');
        if (!container) return;
        
        // 模拟数据
        const activities = [
            {
                type: 'edit',
                text: '编辑了笔记',
                target: '测试日志',
                time: '5天前',
                color: 'blue'
            },
            {
                type: 'create',
                text: '创建了新笔记',
                target: 'linux-脚本',
                time: '9天前',
                color: 'green'
            },
            {
                type: 'category',
                text: '创建了新分类',
                target: '脚本分类',
                time: '12天前',
                color: 'purple'
            },
            {
                type: 'delete',
                text: '删除了笔记',
                target: '旧测试笔记',
                time: '15天前',
                color: 'red'
            }
        ];
        
        container.innerHTML = activities.map(activity => `
            <div class="activity-item flex items-start space-x-3">
                <div class="activity-icon w-5 h-5 rounded-full bg-${activity.color}-500/20 flex items-center justify-center text-${activity.color}-400 flex-shrink-0">
                    <i class="fa-solid fa-${activity.type === 'edit' ? 'pencil' : activity.type === 'create' ? 'plus' : activity.type === 'category' ? 'folder-plus' : 'trash'} text-[10px]"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-300 truncate">${activity.text} <span class="text-white font-medium">${activity.target}</span></p>
                    <p class="text-xs text-gray-500 mt-0.5">${activity.time}</p>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * 初始化实时日志
     */
    initRealtimeLog() {
        const container = this.container.querySelector('#realtime-log');
        if (!container) return;
        
        // 初始日志
        const initialLogs = [
            { time: '21:58:38', level: 'info', message: '系统初始化完成' },
            { time: '21:58:39', level: 'success', message: '数据库连接成功' },
            { time: '21:58:40', level: 'info', message: '加载用户数据完成' },
            { time: '21:58:41', level: 'info', message: '渲染数据看板完成' },
            { time: '21:58:42', level: 'success', message: '加密连接已建立' }
        ];
        
        container.innerHTML = initialLogs.map(log => this.createLogEntry(log)).join('');
        
        // 模拟实时日志
        this.startRealtimeLog();
    }
    
    /**
     * 创建日志条目
     */
    createLogEntry(log) {
        const levelClass = {
            info: 'log-info',
            success: 'log-success',
            warning: 'log-warning',
            error: 'log-error'
        }[log.level] || 'log-info';
        
        return `
            <div class="log-entry py-2 border-b border-dark-lighter last:border-b-0">
                <span class="log-time text-gray-500 text-xs mr-2">[${log.time}]</span>
                <span class="${levelClass} text-xs font-mono">${log.level.toUpperCase()}</span>
                <span class="log-message text-gray-300 text-xs ml-2">${log.message}</span>
            </div>
        `;
    }
    
    /**
     * 开始实时日志
     */
    startRealtimeLog() {
        // 模拟实时日志更新
        setInterval(() => {
            if (Math.random() > 0.7) { // 30%概率添加新日志
                this.addLogEntry({
                    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                    level: ['info', 'success', 'warning'][Math.floor(Math.random() * 3)],
                    message: this.getRandomLogMessage()
                });
            }
        }, 5000);
    }
    
    /**
     * 添加日志条目
     */
    addLogEntry(log) {
        const container = this.container.querySelector('#realtime-log');
        if (!container) return;
        
        const entry = this.createLogEntry(log);
        container.insertAdjacentHTML('afterbegin', entry);
        
        // 保持日志数量
        const entries = container.querySelectorAll('.log-entry');
        if (entries.length > 10) {
            entries[entries.length - 1].remove();
        }
    }
    
    /**
     * 获取随机日志消息
     */
    getRandomLogMessage() {
        const messages = [
            '同步检查完成',
            '缓存已更新',
            '用户活动记录',
            '系统状态正常',
            '安全检查通过',
            '数据备份中',
            '清理临时文件',
            '更新检查完成'
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }
    
    /**
     * 处理时间筛选
     */
    handleTimeFilter(event) {
        const button = event.currentTarget;
        const period = button.dataset.period;
        
        // 更新激活状态
        this.container.querySelectorAll('.time-filter').forEach(btn => {
            btn.classList.remove('active', 'bg-indigo-600', 'text-white');
            btn.classList.add('hover:bg-dark-lighter', 'text-gray-400');
        });
        
        button.classList.add('active', 'bg-indigo-600', 'text-white');
        button.classList.remove('hover:bg-dark-lighter', 'text-gray-400');
        
        // 重新加载图表数据
        this.loadChartData(period);
    }
    
    /**
     * 加载图表数据
     */
    async loadChartData(period) {
        // 这里应该调用API获取指定时间段的数据
        console.log(`加载 ${period} 数据`);
        
        // 模拟API调用延迟
        await Utils.delay(500);
        
        // 更新图表
        this.updateCharts(period);
    }
    
    /**
     * 更新图表
     */
    updateCharts(period) {
        // 根据时间段更新图表数据
        const dataMap = {
            week: [5, 8, 12, 9, 15, 11, 7],
            month: [45, 52, 38, 61, 55, 48, 42, 50, 47, 53, 49, 51],
            year: [120, 135, 110, 145, 130, 125, 140, 155, 145, 150, 140, 135]
        };
        
        if (this.charts.noteTrend && dataMap[period]) {
            this.charts.noteTrend.data.datasets[0].data = dataMap[period];
            this.charts.noteTrend.update();
        }
    }
    
    /**
     * 导出报表
     */
    async exportReport() {
        try {
            this.app.showNotification('正在生成报表...', 'info');
            
            // 获取当前统计数据
            const reportData = {
                timestamp: new Date().toISOString(),
                stats: this.stats,
                charts: {
                    trend: this.charts.noteTrend?.data,
                    categories: this.charts.categoryPie?.data
                }
            };
            
            // 生成JSON文件
            const jsonStr = JSON.stringify(reportData, null, 2);
            const filename = `dashboard-report-${new Date().toISOString().split('T')[0]}.json`;
            
            Utils.downloadFile(jsonStr, filename, 'application/json');
            
            this.app.showNotification('报表已导出', 'success');
            
        } catch (error) {
            console.error('[仪表盘] 导出失败:', error);
            this.app.showError('导出报表失败');
        }
    }
    
    /**
     * 打开筛选
     */
    openFilter() {
        this.app.showNotification('筛选功能开发中', 'info');
    }
    
    /**
     * 处理统计卡片点击
     */
    handleStatCardClick(event) {
        const card = event.currentTarget;
        const statType = card.dataset.stat;
        
        switch (statType) {
            case 'notes':
                this.app.router.navigate('notes');
                break;
            case 'categories':
                this.app.showNotification('打开分类管理', 'info');
                break;
            case 'drafts':
                this.app.showNotification('打开草稿管理', 'info');
                break;
            case 'trash':
                this.app.showNotification('打开回收站', 'info');
                break;
        }
    }
    
    /**
     * 查看笔记
     */
    viewNote(noteId) {
        console.log('查看笔记:', noteId);
        this.app.showNotification(`打开笔记 ${noteId}`, 'info');
    }
    
    /**
     * 删除笔记
     */
    deleteNote(noteId) {
        if (confirm('确定要删除这个笔记吗？')) {
            console.log('删除笔记:', noteId);
            this.app.showNotification('笔记已删除', 'success');
        }
    }
    
    /**
     * 检查离线状态
     */
    checkOfflineStatus() {
        const offlineStatus = this.container.querySelector('.offline-status');
        if (!offlineStatus) return;
        
        if (!Config.isOnline()) {
            offlineStatus.classList.remove('hidden');
            const pendingCount = OfflineManager.getSyncStatus().pending;
            offlineStatus.querySelector('.pending-count').textContent = pendingCount;
        } else {
            offlineStatus.classList.add('hidden');
        }
    }
    
    /**
     * 设置离线监听
     */
    setupOfflineListeners() {
        // 监听网络状态变化
        window.addEventListener('online', () => {
            this.container.querySelector('.offline-status')?.classList.add('hidden');
        });
        
        window.addEventListener('offline', () => {
            this.container.querySelector('.offline-status')?.classList.remove('hidden');
        });
        
        // 监听离线管理器事件
        OfflineManager.addListener((event, data) => {
            if (event === 'sync_start' || event === 'sync_complete') {
                const pendingCount = OfflineManager.getSyncStatus().pending;
                const countEl = this.container.querySelector('.pending-count');
                if (countEl) {
                    countEl.textContent = pendingCount;
                }
            }
        });
    }
    
    /**
     * 开始自动刷新
     */
    startAutoRefresh() {
        // 每分钟刷新一次数据
        this.autoRefreshInterval = setInterval(async () => {
            if (Config.isOnline()) {
                await this.loadStats();
            }
        }, 60 * 1000);
    }
    
    /**
     * 显示错误
     */
    showError(message) {
        const errorEl = document.createElement('div');
        errorEl.className = 'error-message bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4';
        errorEl.innerHTML = `
            <div class="flex items-center">
                <i class="fa-solid fa-exclamation-circle mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        const container = this.container.querySelector('.dashboard-page');
        container.insertBefore(errorEl, container.firstChild);
        
        // 5秒后自动移除
        setTimeout(() => errorEl.remove(), 5000);
    }
    
    /**
     * 页面显示时的回调
     */
    onShow() {
        console.log('[仪表盘] 页面显示');
        // 重新检查离线状态
        this.checkOfflineStatus();
    }
    
    /**
     * 页面隐藏时的回调
     */
    onHide() {
        console.log('[仪表盘] 页面隐藏');
        // 清理定时器
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
        
        // 清理图表
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
    }
}

export default DashboardPage;
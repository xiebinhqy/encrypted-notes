/**
 * 侧边栏组件
 * 负责导航菜单、分类管理、笔记列表等功能
 */

import { Utils} from '../../core/utils.js';
import { Config}  from '../../config.js';
import { Api } from '../../api/index.js';
import { OfflineManager } from '../../core/offline.js';

export class Sidebar {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.state = {
            collapsed: false,
            activeNav: 'dashboard',
            categories: [],
            recentNotes: [],
            isSyncing: false,
            syncStatus: null
        };
        
        this.init();
    }
    
    /**
     * 初始化侧边栏
     */
    async init() {
        // 从本地存储加载状态
        this.loadState();
        
        // 监听状态变化
        this.setupListeners();
        
        // 加载初始数据
        await this.loadData();
    }
    
    /**
     * 从本地存储加载状态
     */
    loadState() {
        const savedState = Utils.storage.get('sidebar_state', {});
        this.state = { ...this.state, ...savedState };
    }
    
    /**
     * 保存状态到本地存储
     */
    saveState() {
        Utils.storage.set('sidebar_state', {
            collapsed: this.state.collapsed,
            activeNav: this.state.activeNav
        });
    }
    
    /**
     * 设置监听器
     */
    setupListeners() {
        // 监听离线管理器事件
        OfflineManager.addListener((event, data) => {
            if (event === 'sync_start') {
                this.state.isSyncing = true;
                this.updateSyncStatus();
            } else if (event === 'sync_complete') {
                this.state.isSyncing = false;
                this.state.syncStatus = data;
                this.updateSyncStatus();
                
                // 同步完成后重新加载数据
                if (data && data.success) {
                    this.loadData();
                }
            }
        });
        
        // 监听路由变化
        document.addEventListener('app:page-change', (e) => {
            this.handlePageChange(e.detail);
        });
        
        // 监听离线状态
        window.addEventListener('online', () => this.updateNetworkStatus());
        window.addEventListener('offline', () => this.updateNetworkStatus());
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => this.handleResize());
    }
    
    /**
     * 处理页面变化
     */
    handlePageChange(detail) {
        if (detail && detail.route) {
            this.state.activeNav = detail.route;
            this.updateActiveNav();
        }
    }
    
    /**
     * 处理窗口大小变化
     */
    handleResize() {
        // 在小屏幕上自动折叠侧边栏
        if (window.innerWidth < 1024 && !this.state.collapsed) {
            this.toggleCollapse(true);
        }
    }
    
    /**
     * 加载数据
     */
    async loadData() {
        try {
            // 加载分类
            await this.loadCategories();
            
            // 加载最近笔记
            await this.loadRecentNotes();
            
        } catch (error) {
            console.error('[侧边栏] 加载数据失败:', error);
        }
    }
    
    /**
     * 加载分类
     */
    async loadCategories() {
        if (!Config.isOnline()) {
            // 离线模式下从本地存储加载
            this.state.categories = Utils.storage.get('local_categories', []);
            this.renderCategories();
            return;
        }
        
        try {
            const response = await Api.categories.list();
            this.state.categories = response.data || [];
            
            // 保存到本地存储
            Utils.storage.set('local_categories', this.state.categories);
            
            this.renderCategories();
        } catch (error) {
            console.error('[侧边栏] 加载分类失败:', error);
            this.state.categories = Utils.storage.get('local_categories', []);
            this.renderCategories();
        }
    }
    
    /**
     * 加载最近笔记
     */
    async loadRecentNotes() {
        if (!Config.isOnline()) {
            // 离线模式下从本地存储加载
            this.state.recentNotes = Utils.storage.get('local_recent_notes', []);
            this.renderRecentNotes();
            return;
        }
        
        try {
            const response = await Api.notes.list({
                limit: 5,
                order: 'updated_at',
                orderDir: 'desc'
            });
            
            this.state.recentNotes = response.data || [];
            
            // 保存到本地存储
            Utils.storage.set('local_recent_notes', this.state.recentNotes);
            
            this.renderRecentNotes();
        } catch (error) {
            console.error('[侧边栏] 加载最近笔记失败:', error);
            this.state.recentNotes = Utils.storage.get('local_recent_notes', []);
            this.renderRecentNotes();
        }
    }
    
    /**
     * 渲染组件
     */
    async render(container) {
        this.container = container;
        
        // 渲染侧边栏结构
        container.innerHTML = this.getTemplate();
        
        // 缓存DOM元素
        this.cacheElements();
        
        // 绑定事件
        this.bindEvents();
        
        // 更新状态
        this.updateActiveNav();
        this.updateNetworkStatus();
        this.updateSyncStatus();
        
        // 渲染动态内容
        this.renderCategories();
        this.renderRecentNotes();
    }
    
    /**
     * 获取模板
     */
    getTemplate() {
        return `
            <div class="sidebar ${this.state.collapsed ? 'collapsed' : ''} w-64 bg-dark-light border-r border-dark-lighter flex flex-col transition-all duration-300 flex-shrink-0">
                <!-- Logo区域 -->
                <div class="sidebar-header p-4 border-b border-dark-lighter flex items-center space-x-3">
                    <div class="logo w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
                        <i class="fa-solid fa-lock text-white text-xl"></i>
                    </div>
                    <div class="logo-text flex-1 overflow-hidden transition-opacity duration-300 ${this.state.collapsed ? 'opacity-0 w-0' : 'opacity-100'}">
                        <h1 class="text-xl font-bold text-white tracking-tight truncate">我的加密笔记</h1>
                        <p class="text-gray-400 text-xs truncate">v5.1.0</p>
                    </div>
                    <button class="toggle-btn text-gray-400 hover:text-white transition-colors flex-shrink-0" title="${this.state.collapsed ? '展开' : '折叠'}">
                        <i class="fa-solid ${this.state.collapsed ? 'fa-chevron-right' : 'fa-chevron-left'}"></i>
                    </button>
                </div>
                
                <!-- 导航菜单 -->
                <nav class="sidebar-nav flex-1 overflow-y-auto p-4 space-y-1">
                    <!-- 主导航 -->
                    <div class="nav-section mb-4">
                        <h3 class="section-title text-xs uppercase text-gray-500 font-semibold mb-2 px-3 truncate ${this.state.collapsed ? 'opacity-0' : 'opacity-100'} transition-opacity">导航</h3>
                        <div class="nav-items space-y-1">
                            ${this.getNavItems()}
                        </div>
                    </div>
                    
                    <!-- 分类导航 -->
                    <div class="nav-section categories-section">
                        <div class="section-header flex items-center justify-between mb-2">
                            <h3 class="section-title text-xs uppercase text-gray-500 font-semibold px-3 truncate ${this.state.collapsed ? 'opacity-0' : 'opacity-100'} transition-opacity">分类</h3>
                            <button class="add-category-btn text-gray-500 hover:text-white text-xs ${this.state.collapsed ? 'hidden' : ''}" title="添加分类">
                                <i class="fa-solid fa-plus"></i>
                            </button>
                        </div>
                        <div class="categories-list">
                            <!-- 动态加载分类 -->
                        </div>
                    </div>
                    
                    <!-- 最近笔记 -->
                    <div class="nav-section recent-notes-section ${this.state.collapsed ? 'hidden' : ''}">
                        <h3 class="section-title text-xs uppercase text-gray-500 font-semibold mb-2 px-3">最近笔记</h3>
                        <div class="recent-notes-list">
                            <!-- 动态加载最近笔记 -->
                        </div>
                    </div>
                </nav>
                
                <!-- 底部区域 -->
                <div class="sidebar-footer border-t border-dark-lighter">
                    <!-- 网络状态 -->
                    <div class="network-status px-4 py-2 border-b border-dark-lighter flex items-center space-x-2 text-xs text-gray-400 ${this.state.collapsed ? 'justify-center' : ''}">
                        <i class="fa-solid fa-wifi ${Config.isOnline() ? 'text-emerald-400' : 'text-gray-400'}"></i>
                        ${!this.state.collapsed ? `
                            <span class="truncate">状态:</span>
                            <span class="status-text ${Config.isOnline() ? 'text-emerald-400' : 'text-gray-400'} truncate">${Config.isOnline() ? '已连接' : '离线'}</span>
                        ` : ''}
                    </div>
                    
                    <!-- 同步状态 -->
                    <div class="sync-status px-4 py-2 border-b border-dark-lighter ${this.state.collapsed ? 'hidden' : ''}">
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-gray-400">同步</span>
                            <div class="flex items-center space-x-1">
                                <div class="sync-indicator w-2 h-2 rounded-full ${this.state.isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}"></div>
                                <span class="sync-text text-gray-300">${this.state.isSyncing ? '同步中' : '已同步'}</span>
                            </div>
                        </div>
                        ${this.state.syncStatus ? `
                            <div class="sync-details text-xs text-gray-500 mt-1">
                                <span class="pending-count">${this.state.syncStatus.pending || 0}</span> 待同步
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- 用户信息 -->
                    <div class="user-info p-4 flex items-center space-x-3 bg-dark-light ${this.state.collapsed ? 'justify-center' : ''}">
                        <img src="https://picsum.photos/40/40?random=1" alt="用户头像" 
                             class="user-avatar w-10 h-10 rounded-full ring-2 ring-indigo-500/50 flex-shrink-0">
                        ${!this.state.collapsed ? `
                            <div class="user-details flex-1 min-w-0">
                                <p class="user-name text-sm font-medium text-white truncate">管理员</p>
                                <p class="user-email text-xs text-gray-400 truncate">admin@example.com</p>
                            </div>
                            <button class="logout-btn text-gray-400 hover:text-white transition-colors" title="退出登录">
                                <i class="fa-solid fa-right-from-bracket"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取导航项
     */
    getNavItems() {
        const navItems = [
            { id: 'dashboard', icon: 'fa-gauge-high', label: '仪表盘', badge: null },
            { id: 'drafts', icon: 'fa-file-pen', label: '草稿管理', badge: { count: 3, type: 'warning' } },
            { id: 'trash', icon: 'fa-trash-can', label: '回收站', badge: { count: 0, type: 'success' } },
            { id: 'all-notes', icon: 'fa-book', label: '全部笔记', badge: null },
            { id: 'platform', icon: 'fa-cube', label: '个人平台', badge: null, external: true }
        ];
        
        return navItems.map(item => `
            <a href="${item.external ? 'platform.html' : '#'}" 
               class="nav-item ${this.state.collapsed ? 'justify-center' : ''} ${item.id === this.state.activeNav ? 'active' : ''}"
               data-nav="${item.id}"
               ${item.external ? '' : 'onclick="event.preventDefault()"'}>
                <div class="nav-icon w-5 h-5 flex items-center justify-center text-gray-300">
                    <i class="fa-solid ${item.icon}"></i>
                </div>
                ${!this.state.collapsed ? `
                    <span class="nav-label text-sm text-gray-300 truncate">${item.label}</span>
                    ${item.badge ? this.getBadgeHtml(item.badge) : ''}
                ` : ''}
            </a>
        `).join('');
    }
    
    /**
     * 获取徽章HTML
     */
    getBadgeHtml(badge) {
        if (!badge || badge.count === 0) return '';
        
        const typeClasses = {
            warning: 'bg-amber-500/20 text-amber-400',
            success: 'bg-emerald-500/20 text-emerald-400',
            danger: 'bg-red-500/20 text-red-400',
            info: 'bg-blue-500/20 text-blue-400'
        };
        
        return `
            <span class="nav-badge ${typeClasses[badge.type] || typeClasses.info} text-xs px-1.5 py-0.5 rounded ml-auto">
                ${badge.count}
            </span>
        `;
    }
    
    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.toggleBtn = this.container.querySelector('.toggle-btn');
        this.navItems = this.container.querySelectorAll('.nav-item');
        this.addCategoryBtn = this.container.querySelector('.add-category-btn');
        this.logoutBtn = this.container.querySelector('.logout-btn');
        this.categoriesList = this.container.querySelector('.categories-list');
        this.recentNotesList = this.container.querySelector('.recent-notes-list');
        this.networkStatusEl = this.container.querySelector('.network-status');
        this.syncStatusEl = this.container.querySelector('.sync-status');
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 切换折叠状态
        this.toggleBtn.addEventListener('click', () => this.toggleCollapse());
        
        // 导航项点击
        this.navItems.forEach(item => {
            if (!item.getAttribute('href')?.startsWith('http')) {
                item.addEventListener('click', (e) => this.handleNavClick(e));
            }
        });
        
        // 添加分类
        if (this.addCategoryBtn) {
            this.addCategoryBtn.addEventListener('click', () => this.handleAddCategory());
        }
        
        // 退出登录
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        // 点击外部关闭折叠的侧边栏
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }
    
    /**
     * 处理导航点击
     */
    handleNavClick(event) {
        const navItem = event.currentTarget;
        const navId = navItem.dataset.nav;
        
        // 更新活动导航
        this.state.activeNav = navId;
        this.updateActiveNav();
        
        // 触发路由导航
        switch (navId) {
            case 'dashboard':
                this.app.router.navigate('dashboard');
                break;
            case 'drafts':
                this.showModal('draft-manager');
                break;
            case 'trash':
                this.showModal('trash');
                break;
            case 'all-notes':
                this.showModal('all-notes');
                break;
        }
        
        // 在小屏幕上自动折叠侧边栏
        if (window.innerWidth < 768) {
            this.toggleCollapse(true);
        }
    }
    
    /**
     * 处理添加分类
     */
    handleAddCategory() {
        this.showModal('new-category');
    }
    
    /**
     * 处理退出登录
     */
    async handleLogout() {
        if (confirm('确定要退出登录吗？所有未保存的更改将丢失。')) {
            try {
                // 先尝试同步离线数据
                if (OfflineManager.getSyncStatus().pending > 0) {
                    await OfflineManager.manualSync();
                }
                
                // 执行登出
                await Api.auth.logout();
                
                // 重定向到登录页
                window.location.href = '/login.html';
                
            } catch (error) {
                console.error('[侧边栏] 登出失败:', error);
                this.app.showNotification('登出失败，请重试', 'error');
            }
        }
    }
    
    /**
     * 处理外部点击
     */
    handleOutsideClick(event) {
        // 如果侧边栏是折叠状态且点击了外部区域，展开侧边栏
        if (this.state.collapsed && 
            !this.container.contains(event.target) &&
            window.innerWidth >= 768) {
            this.toggleCollapse(false);
        }
    }
    
    /**
     * 处理键盘按键
     */
    handleKeydown(event) {
        // Ctrl+B 切换侧边栏
        if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
            event.preventDefault();
            this.toggleCollapse();
        }
        
        // ESC 键在侧边栏折叠时展开
        if (event.key === 'Escape' && this.state.collapsed) {
            this.toggleCollapse(false);
        }
    }
    
    /**
     * 切换折叠状态
     */
    toggleCollapse(forceCollapse = null) {
        const willCollapse = forceCollapse !== null ? forceCollapse : !this.state.collapsed;
        this.state.collapsed = willCollapse;
        
        // 更新容器类
        this.container.firstElementChild.classList.toggle('collapsed', willCollapse);
        
        // 更新图标
        const icon = this.toggleBtn.querySelector('i');
        icon.classList.toggle('fa-chevron-left', !willCollapse);
        icon.classList.toggle('fa-chevron-right', willCollapse);
        
        // 更新标题
        this.toggleBtn.title = willCollapse ? '展开' : '折叠';
        
        // 更新文本元素的可见性
        const textElements = this.container.querySelectorAll('.logo-text, .section-title, .sync-status, .recent-notes-section, .add-category-btn');
        textElements.forEach(el => {
            if (willCollapse) {
                el.classList.add('hidden', 'opacity-0');
            } else {
                el.classList.remove('hidden', 'opacity-0');
            }
        });
        
        // 更新导航项
        this.navItems.forEach(item => {
            if (willCollapse) {
                item.classList.add('justify-center');
            } else {
                item.classList.remove('justify-center');
            }
        });
        
        // 更新用户信息
        const userInfo = this.container.querySelector('.user-info');
        if (willCollapse) {
            userInfo.classList.add('justify-center');
        } else {
            userInfo.classList.remove('justify-center');
        }
        
        // 更新网络状态
        const networkStatus = this.container.querySelector('.network-status');
        if (willCollapse) {
            networkStatus.classList.add('justify-center');
        } else {
            networkStatus.classList.remove('justify-center');
        }
        
        // 触发事件
        this.app.triggerEvent('sidebar:toggle', { collapsed: willCollapse });
        
        // 保存状态
        this.saveState();
    }
    
    /**
     * 更新活动导航
     */
    updateActiveNav() {
        this.navItems.forEach(item => {
            const navId = item.dataset.nav;
            if (navId === this.state.activeNav) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    /**
     * 更新网络状态
     */
    updateNetworkStatus() {
        if (!this.networkStatusEl) return;
        
        const isOnline = Config.isOnline();
        const statusIcon = this.networkStatusEl.querySelector('i');
        const statusText = this.networkStatusEl.querySelector('.status-text');
        
        if (statusIcon) {
            statusIcon.className = `fa-solid fa-wifi ${isOnline ? 'text-emerald-400' : 'text-gray-400'}`;
        }
        
        if (statusText) {
            statusText.textContent = isOnline ? '已连接' : '离线';
            statusText.className = `status-text ${isOnline ? 'text-emerald-400' : 'text-gray-400'} truncate`;
        }
    }
    
    /**
     * 更新同步状态
     */
    updateSyncStatus() {
        if (!this.syncStatusEl) return;
        
        const syncIndicator = this.syncStatusEl.querySelector('.sync-indicator');
        const syncText = this.syncStatusEl.querySelector('.sync-text');
        const syncDetails = this.syncStatusEl.querySelector('.sync-details');
        
        if (syncIndicator) {
            syncIndicator.className = `sync-indicator w-2 h-2 rounded-full ${this.state.isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`;
        }
        
        if (syncText) {
            syncText.textContent = this.state.isSyncing ? '同步中' : '已同步';
        }
        
        if (syncDetails) {
            const pendingCount = OfflineManager.getSyncStatus().pending;
            syncDetails.querySelector('.pending-count').textContent = pendingCount;
        }
    }
    
    /**
     * 渲染分类
     */
    renderCategories() {
        if (!this.categoriesList) return;
        
        // 如果侧边栏折叠，不渲染分类列表
        if (this.state.collapsed) {
            this.categoriesList.innerHTML = '';
            return;
        }
        
        // 模拟分类数据
        const categories = this.state.categories.length > 0 ? this.state.categories : [
            { id: 'important', name: '重要!重要!重要', color: '#3b82f6', count: 2 },
            { id: 'important2', name: '重要', color: '#a855f7', count: 1 },
            { id: 'personal', name: '个人数据', color: '#ec4899', count: 3 },
            { id: 'email', name: '邮箱', color: '#f97316', count: 4 },
            { id: 'gitlab', name: 'gitlab', color: '#10b981', count: 2 },
            { id: 'git', name: 'git', color: '#8b5cf6', count: 1 }
        ];
        
        this.categoriesList.innerHTML = categories.map(category => `
            <div class="category-item flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-dark-lighter hover:text-white transition-all cursor-pointer"
                 data-category="${category.id}"
                 data-category-name="${category.name}"
                 data-category-color="${category.color}">
                <span class="color-indicator w-2 h-2 rounded-full" style="background-color: ${category.color}"></span>
                <span class="category-name text-sm truncate flex-1">${category.name}</span>
                <span class="category-count text-xs text-gray-500">${category.count || 0}</span>
            </div>
        `).join('');
        
        // 绑定分类点击事件
        this.categoriesList.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleCategoryClick(e));
        });
    }
    
    /**
     * 渲染最近笔记
     */
    renderRecentNotes() {
        if (!this.recentNotesList) return;
        
        // 如果侧边栏折叠，不渲染最近笔记
        if (this.state.collapsed) {
            this.recentNotesList.innerHTML = '';
            return;
        }
        
        // 模拟最近笔记数据
        const recentNotes = this.state.recentNotes.length > 0 ? this.state.recentNotes : [
            { id: 1, title: '测试日志', category: '测试分类', updated_at: Date.now() - 5 * 24 * 60 * 60 * 1000, edits: 4 },
            { id: 2, title: 'linux-脚本', category: '脚本分类', updated_at: Date.now() - 9 * 24 * 60 * 60 * 1000, edits: 6 },
            { id: 3, title: '项目文档', category: '工作', updated_at: Date.now() - 3 * 24 * 60 * 60 * 1000, edits: 2 }
        ];
        
        this.recentNotesList.innerHTML = recentNotes.map(note => `
            <div class="recent-note-item p-3 bg-dark rounded-lg border border-dark-lighter hover:border-indigo-500/50 transition-colors cursor-pointer mb-2"
                 data-note-id="${note.id}">
                <h4 class="text-sm font-medium text-white truncate mb-1">${note.title}</h4>
                <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-400">${note.category}</span>
                    <span class="text-gray-500">${Utils.formatDate(note.updated_at, 'relative')}</span>
                </div>
            </div>
        `).join('');
        
        // 绑定笔记点击事件
        this.recentNotesList.querySelectorAll('.recent-note-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleRecentNoteClick(e));
        });
    }
    
    /**
     * 处理分类点击
     */
    handleCategoryClick(event) {
        const categoryItem = event.currentTarget;
        const categoryId = categoryItem.dataset.category;
        const categoryName = categoryItem.dataset.categoryName;
        const categoryColor = categoryItem.dataset.categoryColor;
        
        // 显示分类笔记弹窗
        this.showModal('category', {
            id: categoryId,
            name: categoryName,
            color: categoryColor
        });
    }
    
    /**
     * 处理最近笔记点击
     */
    handleRecentNoteClick(event) {
        const noteItem = event.currentTarget;
        const noteId = noteItem.dataset.noteId;
        
        // 显示笔记编辑弹窗
        this.showModal('edit-note', { id: noteId });
    }
    
    /**
     * 显示弹窗
     */
    showModal(modalType, data = null) {
        this.app.triggerEvent('modal:show', { type: modalType, data });
    }
    
    /**
     * 添加新分类
     */
    async addCategory(name, color = '#3b82f6') {
        try {
            const newCategory = {
                id: Utils.generateId('cat_'),
                name,
                color,
                count: 0
            };
            
            // 添加到状态
            this.state.categories.push(newCategory);
            
            // 更新UI
            this.renderCategories();
            
            // 保存到本地存储
            Utils.storage.set('local_categories', this.state.categories);
            
            // 如果在线，同步到服务器
            if (Config.isOnline()) {
                await Api.categories.create({
                    name,
                    color
                });
            } else {
                // 离线模式下加入同步队列
                await OfflineManager.addToQueue('create_category', {
                    name,
                    color
                });
            }
            
            this.app.showNotification(`分类 "${name}" 已创建`, 'success');
            
        } catch (error) {
            console.error('[侧边栏] 添加分类失败:', error);
            this.app.showNotification('添加分类失败', 'error');
        }
    }
    
    /**
     * 更新分类
     */
    async updateCategory(categoryId, updates) {
        try {
            const categoryIndex = this.state.categories.findIndex(cat => cat.id === categoryId);
            if (categoryIndex === -1) return;
            
            // 更新状态
            this.state.categories[categoryIndex] = {
                ...this.state.categories[categoryIndex],
                ...updates
            };
            
            // 更新UI
            this.renderCategories();
            
            // 保存到本地存储
            Utils.storage.set('local_categories', this.state.categories);
            
            this.app.showNotification('分类已更新', 'success');
            
        } catch (error) {
            console.error('[侧边栏] 更新分类失败:', error);
            this.app.showNotification('更新分类失败', 'error');
        }
    }
    
    /**
     * 删除分类
     */
    async deleteCategory(categoryId) {
        try {
            // 从状态中移除
            this.state.categories = this.state.categories.filter(cat => cat.id !== categoryId);
            
            // 更新UI
            this.renderCategories();
            
            // 保存到本地存储
            Utils.storage.set('local_categories', this.state.categories);
            
            this.app.showNotification('分类已删除', 'success');
            
        } catch (error) {
            console.error('[侧边栏] 删除分类失败:', error);
            this.app.showNotification('删除分类失败', 'error');
        }
    }
    
    /**
     * 获取当前状态
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * 获取分类列表
     */
    getCategories() {
        return [...this.state.categories];
    }
    
    /**
     * 获取最近笔记
     */
    getRecentNotes() {
        return [...this.state.recentNotes];
    }
    
    /**
     * 页面显示时的回调
     */
    onShow() {
        console.log('[侧边栏] 组件显示');
        // 检查网络状态
        this.updateNetworkStatus();
    }
    
    /**
     * 页面隐藏时的回调
     */
    onHide() {
        console.log('[侧边栏] 组件隐藏');
    }
}
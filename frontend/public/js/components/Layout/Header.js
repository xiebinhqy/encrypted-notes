/**
 * 顶部导航组件
 * 包含用户菜单、新建笔记、主题切换、通知、搜索等功能
 */

import Utils from '../../core/utils.js';
import Config from '../../config.js';
import Api from '../../api/index.js';
import OfflineManager from '../../core/offline.js';

export class Header {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.state = {
            currentTime: this.getCurrentTime(),
            showNewNoteDropdown: false,
            showUserDropdown: false,
            showSearch: false,
            notifications: [],
            unreadNotifications: 3,
            searchQuery: '',
            theme: localStorage.getItem('theme') || 'dark',
            isOnline: Config.isOnline()
        };
        
        this.init();
    }
    
    /**
     * 初始化组件
     */
    async init() {
        // 设置定时器更新时间
        this.startClock();
        
        // 加载通知
        await this.loadNotifications();
        
        // 设置监听器
        this.setupListeners();
    }
    
    /**
     * 设置监听器
     */
    setupListeners() {
        // 监听网络状态
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            this.updateOnlineStatus();
        });
        
        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            this.updateOnlineStatus();
        });
        
        // 监听主题变化
        document.addEventListener('app:theme-change', (e) => {
            this.handleThemeChange(e.detail);
        });
        
        // 监听文档点击（关闭下拉菜单）
        document.addEventListener('click', (e) => this.handleDocumentClick(e));
        
        // 监听键盘事件
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }
    
    /**
     * 渲染组件
     */
    async render(container) {
        this.container = container;
        
        // 渲染头部结构
        container.innerHTML = this.getTemplate();
        
        // 缓存DOM元素
        this.cacheElements();
        
        // 绑定事件
        this.bindEvents();
        
        // 更新时间显示
        this.updateTime();
        
        // 更新在线状态
        this.updateOnlineStatus();
    }
    
    /**
     * 获取模板
     */
    getTemplate() {
        return `
            <header class="header bg-dark-light border-b border-dark-lighter px-6 py-4 flex items-center justify-between z-10">
                <!-- 左侧占位 -->
                <div class="header-left w-1/4">
                    <!-- 搜索框（可选） -->
                </div>
                
                <!-- 中间导航选项卡 -->
                <div class="header-center flex space-x-8 justify-center items-center w-1/2">
                    ${this.getNavTabs()}
                </div>
                
                <!-- 右侧功能区 -->
                <div class="header-right flex items-center space-x-4 w-1/4 justify-end">
                    <!-- 时间显示 -->
                    <span id="current-time" class="time-display text-gray-400 text-sm">${this.state.currentTime}</span>
                    
                    <!-- 搜索按钮（移动端） -->
                    <button class="search-btn p-2 rounded-lg hover:bg-dark-lighter text-gray-400 transition-colors lg:hidden">
                        <i class="fa-solid fa-search"></i>
                    </button>
                    
                    <!-- 新建笔记按钮（带下拉） -->
                    <div class="new-note-container relative">
                        <button class="new-note-btn px-4 py-2 text-white text-sm rounded-lg transition-all flex items-center space-x-2 new-note-toggle"
                                style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
                            <i class="fa-solid fa-plus"></i>
                            <span>新建笔记</span>
                            <i class="fa-solid fa-chevron-down text-xs ml-1"></i>
                        </button>
                        
                        <!-- 新建笔记下拉菜单 -->
                        <div class="new-note-dropdown absolute right-0 mt-2 bg-dark-lighter rounded-lg shadow-xl py-1 hidden border border-dark-lighter z-50 min-w-48">
                            <button class="new-note-item w-full text-left px-4 py-3 text-gray-300 hover:bg-dark hover:text-white transition-colors flex items-center space-x-3">
                                <i class="fa-solid fa-file-lines w-4 text-center"></i>
                                <span>新建笔记</span>
                            </button>
                            <button class="new-category-item w-full text-left px-4 py-3 text-gray-300 hover:bg-dark hover:text-white transition-colors flex items-center space-x-3">
                                <i class="fa-solid fa-folder-plus w-4 text-center"></i>
                                <span>新建分类</span>
                            </button>
                            <button class="new-tag-item w-full text-left px-4 py-3 text-gray-300 hover:bg-dark hover:text-white transition-colors flex items-center space-x-3">
                                <i class="fa-solid fa-tag w-4 text-center"></i>
                                <span>新建标签</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- 主题切换 -->
                    <button class="theme-toggle p-2 rounded-lg hover:bg-dark-lighter text-gray-400 transition-colors" title="切换主题">
                        <i class="fa-solid ${this.state.theme === 'dark' ? 'fa-sun' : 'fa-moon'}"></i>
                    </button>
                    
                    <!-- 通知按钮 -->
                    <div class="notification-container relative">
                        <button class="notification-btn p-2 rounded-lg hover:bg-dark-lighter text-gray-400 transition-colors relative">
                            <i class="fa-regular fa-bell"></i>
                            ${this.state.unreadNotifications > 0 ? `
                                <span class="notification-badge absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                            ` : ''}
                        </button>
                        
                        <!-- 通知下拉菜单 -->
                        <div class="notification-dropdown absolute right-0 mt-2 bg-dark-lighter rounded-lg shadow-xl py-1 hidden border border-dark-lighter z-50 w-80 max-h-96 overflow-hidden">
                            <div class="notification-header px-4 py-3 border-b border-dark-lighter">
                                <h3 class="text-white font-medium">通知</h3>
                                <div class="flex items-center justify-between mt-1">
                                    <span class="text-gray-400 text-sm">${this.state.unreadNotifications} 条未读</span>
                                    <button class="mark-all-read text-indigo-400 hover:text-indigo-300 text-sm">
                                        标记全部已读
                                    </button>
                                </div>
                            </div>
                            <div class="notification-list max-h-72 overflow-y-auto">
                                ${this.getNotificationItems()}
                            </div>
                            <div class="notification-footer px-4 py-2 border-t border-dark-lighter">
                                <button class="view-all-notifications w-full text-center text-gray-400 hover:text-white text-sm py-1">
                                    查看所有通知
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 用户菜单 -->
                    <div class="user-menu-container relative group">
                        <img src="https://picsum.photos/32/32?random=1" alt="用户头像" 
                             class="user-avatar w-8 h-8 rounded-full cursor-pointer ring-2 ring-transparent group-hover:ring-indigo-500/50 transition-all user-menu-toggle">
                        
                        <!-- 用户下拉菜单 -->
                        <div class="user-dropdown absolute right-0 mt-2 w-48 bg-dark-lighter rounded-lg shadow-xl py-1 hidden border border-dark-lighter z-50">
                            <div class="user-info px-4 py-3 border-b border-dark-lighter">
                                <p class="text-white font-medium text-sm">管理员</p>
                                <p class="text-gray-400 text-xs truncate">admin@example.com</p>
                            </div>
                            <button class="user-profile-item w-full text-left px-4 py-2 text-gray-300 hover:bg-dark hover:text-white transition-colors text-sm">
                                <i class="fa-solid fa-user mr-2 w-4 text-center"></i>
                                个人资料
                            </button>
                            <button class="user-settings-item w-full text-left px-4 py-2 text-gray-300 hover:bg-dark hover:text-white transition-colors text-sm">
                                <i class="fa-solid fa-gear mr-2 w-4 text-center"></i>
                                账户设置
                            </button>
                            <div class="border-t border-dark-lighter my-1"></div>
                            <button class="user-logout-item w-full text-left px-4 py-2 text-gray-300 hover:bg-dark hover:text-red-400 transition-colors text-sm">
                                <i class="fa-solid fa-right-from-bracket mr-2 w-4 text-center"></i>
                                退出登录
                            </button>
                        </div>
                    </div>
                    
                    <!-- 在线状态指示器 -->
                    <div class="online-status ${this.state.isOnline ? 'online' : 'offline'} hidden">
                        <div class="status-indicator w-2 h-2 rounded-full ${this.state.isOnline ? 'bg-emerald-400' : 'bg-gray-400'}"></div>
                        <span class="status-text text-xs text-gray-400 ml-1">${this.state.isOnline ? '在线' : '离线'}</span>
                    </div>
                </div>
                
                <!-- 搜索模态框（移动端） -->
                <div id="search-modal" class="search-modal fixed inset-0 bg-dark/80 backdrop-blur-sm z-50 hidden items-center justify-center p-4">
                    <div class="search-modal-content bg-dark-light rounded-2xl p-4 w-full max-w-lg">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-semibold text-white">搜索笔记</h3>
                            <button class="search-modal-close text-gray-400 hover:text-white">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </div>
                        <div class="relative">
                            <input type="text" id="mobile-search-input" 
                                   class="w-full bg-dark border border-dark-lighter rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pl-10"
                                   placeholder="搜索笔记、分类、标签...">
                            <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        </div>
                    </div>
                </div>
            </header>
        `;
    }
    
    /**
     * 获取导航选项卡
     */
    getNavTabs() {
        const tabs = [
            { id: 'dashboard', label: '数据看板', active: true },
            { id: 'system', label: '系统' },
            { id: 'analysis', label: '分析' },
            { id: 'events', label: '事件' },
            { id: 'login', label: '登录' },
            { id: 'settings', label: '设置' }
        ];
        
        return tabs.map(tab => `
            <button class="nav-tab text-${tab.active ? 'indigo-400 border-b-2 border-indigo-400' : 'gray-400 hover:text-white'} pb-1 font-medium text-base transition-all"
                    data-tab="${tab.id}">
                ${tab.label}
            </button>
        `).join('');
    }
    
    /**
     * 获取通知项
     */
    getNotificationItems() {
        const notifications = this.state.notifications.length > 0 ? this.state.notifications : [
            { id: 1, title: '数据同步完成', message: '您的12条笔记已完成跨设备同步', time: '5分钟前', read: false, type: 'success' },
            { id: 2, title: '恢复码已生成', message: '请妥善保管您的恢复码，仅可使用一次', time: '1小时前', read: false, type: 'warning' },
            { id: 3, title: '账号安全提醒', message: '检测到新设备登录，请确认是否为本人操作', time: '1天前', read: true, type: 'info' },
            { id: 4, title: '系统更新可用', message: '新版本v5.2.0已发布，建议更新', time: '2天前', read: true, type: 'info' }
        ];
        
        return notifications.map(notification => `
            <div class="notification-item px-4 py-3 border-b border-dark-lighter hover:bg-dark/50 transition-colors cursor-pointer ${notification.read ? 'opacity-70' : ''}"
                 data-id="${notification.id}">
                <div class="flex justify-between items-start">
                    <h4 class="text-white font-medium text-sm">${notification.title}</h4>
                    <span class="text-gray-400 text-xs">${notification.time}</span>
                </div>
                <p class="text-gray-300 text-xs mt-1">${notification.message}</p>
                ${!notification.read ? '<div class="unread-dot w-1.5 h-1.5 bg-indigo-400 rounded-full mt-2"></div>' : ''}
            </div>
        `).join('');
    }
    
    /**
     * 缓存DOM元素
     */
    cacheElements() {
        // 时间显示
        this.timeDisplay = this.container.querySelector('#current-time');
        
        // 搜索相关
        this.searchBtn = this.container.querySelector('.search-btn');
        this.searchModal = this.container.querySelector('#search-modal');
        this.searchModalClose = this.container.querySelector('.search-modal-close');
        this.mobileSearchInput = this.container.querySelector('#mobile-search-input');
        
        // 新建笔记相关
        this.newNoteToggle = this.container.querySelector('.new-note-toggle');
        this.newNoteDropdown = this.container.querySelector('.new-note-dropdown');
        this.newNoteItem = this.container.querySelector('.new-note-item');
        this.newCategoryItem = this.container.querySelector('.new-category-item');
        this.newTagItem = this.container.querySelector('.new-tag-item');
        
        // 主题切换
        this.themeToggle = this.container.querySelector('.theme-toggle');
        
        // 通知相关
        this.notificationBtn = this.container.querySelector('.notification-btn');
        this.notificationDropdown = this.container.querySelector('.notification-dropdown');
        this.markAllReadBtn = this.container.querySelector('.mark-all-read');
        this.viewAllNotificationsBtn = this.container.querySelector('.view-all-notifications');
        
        // 用户菜单相关
        this.userMenuToggle = this.container.querySelector('.user-menu-toggle');
        this.userDropdown = this.container.querySelector('.user-dropdown');
        this.userProfileItem = this.container.querySelector('.user-profile-item');
        this.userSettingsItem = this.container.querySelector('.user-settings-item');
        this.userLogoutItem = this.container.querySelector('.user-logout-item');
        
        // 导航选项卡
        this.navTabs = this.container.querySelectorAll('.nav-tab');
        
        // 在线状态
        this.onlineStatus = this.container.querySelector('.online-status');
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 搜索按钮
        if (this.searchBtn) {
            this.searchBtn.addEventListener('click', () => this.showSearchModal());
        }
        
        if (this.searchModalClose) {
            this.searchModalClose.addEventListener('click', () => this.hideSearchModal());
        }
        
        if (this.mobileSearchInput) {
            this.mobileSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(this.mobileSearchInput.value);
                }
            });
        }
        
        // 新建笔记下拉菜单
        if (this.newNoteToggle) {
            this.newNoteToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNewNoteDropdown();
            });
        }
        
        if (this.newNoteItem) {
            this.newNoteItem.addEventListener('click', () => this.handleNewNote());
        }
        
        if (this.newCategoryItem) {
            this.newCategoryItem.addEventListener('click', () => this.handleNewCategory());
        }
        
        if (this.newTagItem) {
            this.newTagItem.addEventListener('click', () => this.handleNewTag());
        }
        
        // 主题切换
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // 通知菜单
        if (this.notificationBtn) {
            this.notificationBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNotificationDropdown();
            });
        }
        
        if (this.markAllReadBtn) {
            this.markAllReadBtn.addEventListener('click', () => this.markAllNotificationsAsRead());
        }
        
        if (this.viewAllNotificationsBtn) {
            this.viewAllNotificationsBtn.addEventListener('click', () => this.viewAllNotifications());
        }
        
        // 用户菜单
        if (this.userMenuToggle) {
            this.userMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserDropdown();
            });
        }
        
        if (this.userProfileItem) {
            this.userProfileItem.addEventListener('click', () => this.showUserProfile());
        }
        
        if (this.userSettingsItem) {
            this.userSettingsItem.addEventListener('click', () => this.showUserSettings());
        }
        
        if (this.userLogoutItem) {
            this.userLogoutItem.addEventListener('click', () => this.handleLogout());
        }
        
        // 导航选项卡
        this.navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.handleNavTabClick(e));
        });
        
        // 点击通知项
        this.container.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleNotificationClick(e));
        });
    }
    
    /**
     * 开始时钟
     */
    startClock() {
        // 立即更新一次
        this.updateTime();
        
        // 每秒更新一次
        this.clockInterval = setInterval(() => {
            this.updateTime();
        }, 1000);
    }
    
    /**
     * 更新时间显示
     */
    updateTime() {
        this.state.currentTime = this.getCurrentTime();
        
        if (this.timeDisplay) {
            this.timeDisplay.textContent = this.state.currentTime;
        }
    }
    
    /**
     * 获取当前时间
     */
    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('zh-CN', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    /**
     * 加载通知
     */
    async loadNotifications() {
        try {
            // 这里可以调用API获取通知
            // const response = await Api.notifications.list();
            // this.state.notifications = response.data || [];
            // this.state.unreadNotifications = response.unread || 0;
            
        } catch (error) {
            console.error('[头部导航] 加载通知失败:', error);
        }
    }
    
    /**
     * 切换新建笔记下拉菜单
     */
    toggleNewNoteDropdown() {
        this.state.showNewNoteDropdown = !this.state.showNewNoteDropdown;
        
        if (this.newNoteDropdown) {
            if (this.state.showNewNoteDropdown) {
                this.newNoteDropdown.classList.remove('hidden');
                this.newNoteDropdown.classList.add('block');
            } else {
                this.newNoteDropdown.classList.remove('block');
                this.newNoteDropdown.classList.add('hidden');
            }
        }
        
        // 关闭其他下拉菜单
        this.closeOtherDropdowns('newNote');
    }
    
    /**
     * 切换通知下拉菜单
     */
    toggleNotificationDropdown() {
        this.state.showNotificationDropdown = !this.state.showNotificationDropdown;
        
        if (this.notificationDropdown) {
            if (this.state.showNotificationDropdown) {
                this.notificationDropdown.classList.remove('hidden');
                this.notificationDropdown.classList.add('block');
            } else {
                this.notificationDropdown.classList.remove('block');
                this.notificationDropdown.classList.add('hidden');
            }
        }
        
        // 关闭其他下拉菜单
        this.closeOtherDropdowns('notification');
    }
    
    /**
     * 切换用户下拉菜单
     */
    toggleUserDropdown() {
        this.state.showUserDropdown = !this.state.showUserDropdown;
        
        if (this.userDropdown) {
            if (this.state.showUserDropdown) {
                this.userDropdown.classList.remove('hidden');
                this.userDropdown.classList.add('block');
            } else {
                this.userDropdown.classList.remove('block');
                this.userDropdown.classList.add('hidden');
            }
        }
        
        // 关闭其他下拉菜单
        this.closeOtherDropdowns('user');
    }
    
    /**
     * 关闭其他下拉菜单
     */
    closeOtherDropdowns(currentDropdown) {
        if (currentDropdown !== 'newNote' && this.newNoteDropdown) {
            this.newNoteDropdown.classList.remove('block');
            this.newNoteDropdown.classList.add('hidden');
            this.state.showNewNoteDropdown = false;
        }
        
        if (currentDropdown !== 'notification' && this.notificationDropdown) {
            this.notificationDropdown.classList.remove('block');
            this.notificationDropdown.classList.add('hidden');
            this.state.showNotificationDropdown = false;
        }
        
        if (currentDropdown !== 'user' && this.userDropdown) {
            this.userDropdown.classList.remove('block');
            this.userDropdown.classList.add('hidden');
            this.state.showUserDropdown = false;
        }
    }
    
    /**
     * 处理文档点击（关闭下拉菜单）
     */
    handleDocumentClick(event) {
        // 如果点击的不是下拉菜单相关元素，关闭所有下拉菜单
        if (!event.target.closest('.new-note-container') && 
            !event.target.closest('.notification-container') && 
            !event.target.closest('.user-menu-container')) {
            this.closeAllDropdowns();
        }
    }
    
    /**
     * 关闭所有下拉菜单
     */
    closeAllDropdowns() {
        this.state.showNewNoteDropdown = false;
        this.state.showNotificationDropdown = false;
        this.state.showUserDropdown = false;
        
        if (this.newNoteDropdown) {
            this.newNoteDropdown.classList.remove('block');
            this.newNoteDropdown.classList.add('hidden');
        }
        
        if (this.notificationDropdown) {
            this.notificationDropdown.classList.remove('block');
            this.notificationDropdown.classList.add('hidden');
        }
        
        if (this.userDropdown) {
            this.userDropdown.classList.remove('block');
            this.userDropdown.classList.add('hidden');
        }
    }
    
    /**
     * 处理键盘事件
     */
    handleKeydown(event) {
        // Ctrl+N 新建笔记
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            this.handleNewNote();
        }
        
        // Ctrl+Shift+N 新建分类
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'N') {
            event.preventDefault();
            this.handleNewCategory();
        }
        
        // Ctrl+K 搜索
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            this.showSearchModal();
        }
        
        // ESC 关闭所有下拉菜单
        if (event.key === 'Escape') {
            this.closeAllDropdowns();
            this.hideSearchModal();
        }
    }
    
    /**
     * 显示搜索模态框
     */
    showSearchModal() {
        if (this.searchModal) {
            this.searchModal.classList.remove('hidden');
            this.searchModal.classList.add('flex');
            
            // 聚焦到搜索框
            setTimeout(() => {
                if (this.mobileSearchInput) {
                    this.mobileSearchInput.focus();
                }
            }, 100);
        }
    }
    
    /**
     * 隐藏搜索模态框
     */
    hideSearchModal() {
        if (this.searchModal) {
            this.searchModal.classList.add('hidden');
            this.searchModal.classList.remove('flex');
            
            // 清空搜索框
            if (this.mobileSearchInput) {
                this.mobileSearchInput.value = '';
            }
        }
    }
    
    /**
     * 执行搜索
     */
    performSearch(query) {
        if (!query.trim()) return;
        
        console.log('执行搜索:', query);
        
        // 触发搜索事件
        this.app.triggerEvent('search:perform', { query });
        
        // 隐藏搜索模态框
        this.hideSearchModal();
        
        // 显示搜索结果
        this.app.showNotification(`搜索: ${query}`, 'info');
    }
    
    /**
     * 处理新建笔记
     */
    handleNewNote() {
        this.closeAllDropdowns();
        
        // 触发新建笔记事件
        this.app.triggerEvent('note:new', {});
        
        this.app.showNotification('打开新建笔记编辑器', 'info');
    }
    
    /**
     * 处理新建分类
     */
    handleNewCategory() {
        this.closeAllDropdowns();
        
        // 触发新建分类事件
        this.app.triggerEvent('category:new', {});
        
        this.app.showNotification('打开新建分类对话框', 'info');
    }
    
    /**
     * 处理新建标签
     */
    handleNewTag() {
        this.closeAllDropdowns();
        
        // 触发新建标签事件
        this.app.triggerEvent('tag:new', {});
        
        this.app.showNotification('打开新建标签对话框', 'info');
    }
    
    /**
     * 切换主题
     */
    toggleTheme() {
        const newTheme = this.state.theme === 'dark' ? 'light' : 'dark';
        this.state.theme = newTheme;
        
        // 更新图标
        const icon = this.themeToggle.querySelector('i');
        icon.classList.toggle('fa-sun', newTheme === 'dark');
        icon.classList.toggle('fa-moon', newTheme === 'light');
        
        // 更新标题
        this.themeToggle.title = `切换到${newTheme === 'dark' ? '深色' : '浅色'}主题`;
        
        // 保存到本地存储
        localStorage.setItem('theme', newTheme);
        
        // 触发主题变化事件
        this.app.triggerEvent('app:theme-change', newTheme);
        
        this.app.showNotification(`已切换到${newTheme === 'dark' ? '深色' : '浅色'}主题`, 'success');
    }
    
    /**
     * 处理主题变化
     */
    handleThemeChange(theme) {
        this.state.theme = theme;
        
        // 更新图标
        if (this.themeToggle) {
            const icon = this.themeToggle.querySelector('i');
            icon.className = `fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`;
        }
    }
    
    /**
     * 标记所有通知为已读
     */
    async markAllNotificationsAsRead() {
        try {
            this.state.unreadNotifications = 0;
            
            // 更新UI
            this.updateNotificationBadge();
            
            // 更新通知项样式
            this.container.querySelectorAll('.notification-item').forEach(item => {
                item.classList.add('opacity-70');
                const unreadDot = item.querySelector('.unread-dot');
                if (unreadDot) {
                    unreadDot.remove();
                }
            });
            
            this.app.showNotification('所有通知已标记为已读', 'success');
            
        } catch (error) {
            console.error('[头部导航] 标记通知为已读失败:', error);
            this.app.showNotification('操作失败，请重试', 'error');
        }
    }
    
    /**
     * 查看所有通知
     */
    viewAllNotifications() {
        this.closeAllDropdowns();
        
        // 导航到通知页面
        this.app.router.navigate('events');
        
        this.app.showNotification('打开通知中心', 'info');
    }
    
    /**
     * 处理通知点击
     */
    handleNotificationClick(event) {
        const notificationItem = event.currentTarget;
        const notificationId = notificationItem.dataset.id;
        
        // 标记为已读
        if (!notificationItem.classList.contains('opacity-70')) {
            notificationItem.classList.add('opacity-70');
            const unreadDot = notificationItem.querySelector('.unread-dot');
            if (unreadDot) {
                unreadDot.remove();
            }
            
            // 更新未读计数
            if (this.state.unreadNotifications > 0) {
                this.state.unreadNotifications--;
                this.updateNotificationBadge();
            }
        }
        
        // 关闭下拉菜单
        this.closeAllDropdowns();
        
        console.log('打开通知:', notificationId);
        this.app.showNotification('处理通知点击', 'info');
    }
    
    /**
     * 更新通知徽章
     */
    updateNotificationBadge() {
        const badge = this.container.querySelector('.notification-badge');
        
        if (this.state.unreadNotifications > 0) {
            if (!badge) {
                // 添加徽章
                const badgeHtml = '<span class="notification-badge absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>';
                this.notificationBtn.insertAdjacentHTML('beforeend', badgeHtml);
            }
        } else {
            // 移除徽章
            if (badge) {
                badge.remove();
            }
        }
    }
    
    /**
     * 显示用户资料
     */
    showUserProfile() {
        this.closeAllDropdowns();
        
        // 触发用户资料事件
        this.app.triggerEvent('user:profile', {});
        
        this.app.showNotification('打开个人资料', 'info');
    }
    
    /**
     * 显示用户设置
     */
    showUserSettings() {
        this.closeAllDropdowns();
        
        // 导航到设置页面
        this.app.router.navigate('settings');
        
        this.app.showNotification('打开账户设置', 'info');
    }
    
    /**
     * 处理登出
     */
    async handleLogout() {
        this.closeAllDropdowns();
        
        if (confirm('确定要退出登录吗？所有未保存的更改将丢失。')) {
            try {
                // 触发登出事件
                document.dispatchEvent(new CustomEvent('app:logout'));
            } catch (error) {
                console.error('[头部导航] 登出失败:', error);
                this.app.showNotification('登出失败，请重试', 'error');
            }
        }
    }
    
    /**
     * 处理导航选项卡点击
     */
    handleNavTabClick(event) {
        const tab = event.currentTarget;
        const tabId = tab.dataset.tab;
        
        // 更新活动选项卡
        this.navTabs.forEach(t => {
            t.classList.remove('text-indigo-400', 'border-b-2', 'border-indigo-400');
            t.classList.add('text-gray-400', 'hover:text-white');
        });
        
        tab.classList.add('text-indigo-400', 'border-b-2', 'border-indigo-400');
        tab.classList.remove('text-gray-400', 'hover:text-white');
        
        // 导航到对应页面
        this.app.router.navigate(tabId);
    }
    
    /**
     * 更新在线状态
     */
    updateOnlineStatus() {
        if (this.onlineStatus) {
            const statusIndicator = this.onlineStatus.querySelector('.status-indicator');
            const statusText = this.onlineStatus.querySelector('.status-text');
            
            if (statusIndicator) {
                statusIndicator.className = `status-indicator w-2 h-2 rounded-full ${this.state.isOnline ? 'bg-emerald-400' : 'bg-gray-400'}`;
            }
            
            if (statusText) {
                statusText.textContent = this.state.isOnline ? '在线' : '离线';
            }
            
            // 显示/隐藏状态指示器
            if (!this.state.isOnline) {
                this.onlineStatus.classList.remove('hidden');
            } else {
                this.onlineStatus.classList.add('hidden');
            }
        }
    }
    
    /**
     * 页面显示时的回调
     */
    onShow() {
        console.log('[头部导航] 组件显示');
        
        // 开始时钟
        this.startClock();
        
        // 更新在线状态
        this.updateOnlineStatus();
    }
    
    /**
     * 页面隐藏时的回调
     */
    onHide() {
        console.log('[头部导航] 组件隐藏');
        
        // 停止时钟
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
        
        // 关闭所有下拉菜单
        this.closeAllDropdowns();
    }
}
/**
 * 私人笔记应用 - 主入口文件
 * 作用：初始化并整合所有组件，管理应用路由和状态
 * 注意：这是应用的启动点，所有页面和组件的枢纽
 */

// ==================== 动态导入所有组件 ====================
// 注意：这里使用动态导入以确保所有组件在需要时可用
// 您可以通过修改这里来添加或移除组件

// 布局组件
import { Sidebar } from './components/Layout/Sidebar.js';
import { Header } from './components/Layout/Header.js';
import { Footer } from './components/Layout/Footer.js';

// 页面组件
import { NotesPage } from './components/Pages/NotesPage.js';
import { SettingsPage } from './components/Pages/SettingsPage.js';
import { CategoriesPage } from './components/Pages/CategoriesPage.js';

// 工具组件
import { Notify } from './components/Common/Notification.js';
import { Loader } from './components/Common/Loading.js';

// 模态框组件（通过 modals.js 统一导出）
import { Modal, ConfirmModal, NoteModal, CategoryModal, SettingsModal } from './components/Modals/modals.js';

/**
 * 私人笔记应用主类
 * 管理整个应用的状态、路由和组件生命周期
 */
class NoteApp {
    constructor() {
        // 应用状态
        this.currentPage = null;
        this.isInitialized = false;
        this.isLoading = false;
        
        // 组件实例存储
        this.components = {
            layout: {
                sidebar: null,
                header: null,
                footer: null
            },
            pages: {
                notes: null,
                settings: null,
                categories: null
            },
            modals: {
                note: null,
                category: null,
                settings: null
            }
        };
        
        // 应用数据
        this.state = {
            user: null,
            theme: Config.getCurrentTheme(),
            online: Config.isOnline(),
            lastSync: null,
            preferences: {}
        };
        
        // 绑定方法
        this.init = this.init.bind(this);
        this.handleNavigation = this.handleNavigation.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handleThemeChange = this.handleThemeChange.bind(this);
        
        console.log('📱 私人笔记应用实例已创建');
    }
    
    /**
     * 初始化应用
     * 这是应用的启动入口
     */
    async init() {
        if (this.isInitialized) {
            console.warn('应用已经初始化过了');
            return;
        }
        
        console.log('🚀 正在初始化私人笔记应用...');
        
        try {
            // 显示加载状态
            this.showLoading('正在加载应用...');
            
            // 1. 加载用户数据
            await this.loadUserData();
            
            // 2. 初始化布局组件
            await this.initLayoutComponents();
            
            // 3. 初始化事件监听
            this.initEventListeners();
            
            // 4. 初始化页面路由
            await this.initRouting();
            
            // 5. 隐藏加载状态
            this.hideLoading();
            
            // 6. 标记为已初始化
            this.isInitialized = true;
            
            // 7. 显示欢迎消息
            this.showWelcomeMessage();
            
            console.log('✅ 应用初始化完成！');
            console.log('📊 应用状态:', this.getAppState());
            
        } catch (error) {
            console.error('❌ 应用初始化失败:', error);
            this.showError('应用初始化失败', error.message);
        }
    }
    
    /**
     * 显示加载状态
     */
    showLoading(message = '加载中...') {
        this.isLoading = true;
        
        // 如果有加载器组件，使用它
        if (typeof Loader !== 'undefined') {
            Loader.show(message);
        } else {
            // 否则使用简单的DOM操作
            const appContent = document.getElementById('app-content');
            if (appContent) {
                appContent.innerHTML = `
                    <div class="app-loading-overlay">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i>
                        </div>
                        <div class="loading-message">${message}</div>
                    </div>
                `;
            }
        }
        
        // 隐藏全局加载指示器
        const globalLoading = document.getElementById('app-loading');
        if (globalLoading) {
            globalLoading.classList.add('hidden');
        }
    }
    
    /**
     * 隐藏加载状态
     */
    hideLoading() {
        this.isLoading = false;
        
        if (typeof Loader !== 'undefined') {
            Loader.hide();
        }
    }
    
    /**
     * 显示错误
     */
    showError(title, message) {
        const appContent = document.getElementById('app-content');
        if (appContent) {
            appContent.innerHTML = `
                <div class="app-error">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h2>${title}</h2>
                    <p>${message}</p>
                    <div class="error-actions">
                        <button class="btn btn-primary" onclick="location.reload()">
                            重新加载
                        </button>
                        <button class="btn btn-secondary" onclick="window.app.init()">
                            重试初始化
                        </button>
                    </div>
                </div>
            `;
        }
        
        Notify.error(title, message);
    }
    
    /**
     * 加载用户数据
     */
    async loadUserData() {
        console.log('👤 正在加载用户数据...');
        
        try {
            // 模拟用户数据加载
            await Utils.sleep(500);
            
            // 这里应该是真实的API调用
            // const response = await Api.auth.getCurrentUser();
            
            // 使用模拟数据
            this.state.user = {
                id: 'user_1',
                username: 'demo',
                email: 'demo@example.com',
                name: '演示用户',
                avatar: Config.getDefaultAvatar('演示用户'),
                createdAt: '2024-01-01T00:00:00Z'
            };
            
            // 加载用户偏好设置
            this.state.preferences = Utils.storage.get('user_preferences', {
                theme: 'dark',
                language: 'zh-CN',
                autoSave: true,
                itemsPerPage: 20
            });
            
            // 应用用户偏好
            this.applyUserPreferences();
            
            console.log('✅ 用户数据加载完成:', this.state.user);
            
        } catch (error) {
            console.error('用户数据加载失败:', error);
            // 使用默认用户
            this.state.user = {
                id: 'guest',
                username: 'guest',
                name: '访客用户',
                avatar: Config.getDefaultAvatar('访客')
            };
        }
    }
    
    /**
     * 应用用户偏好设置
     */
    applyUserPreferences() {
        const { preferences } = this.state;
        
        // 应用主题
        if (preferences.theme) {
            Config.setTheme(preferences.theme);
            this.state.theme = preferences.theme;
        }
        
        // 应用语言
        if (preferences.language) {
            Config.setLanguage(preferences.language);
        }
        
        console.log('✅ 用户偏好设置已应用:', preferences);
    }
    
    /**
     * 初始化布局组件
     */
    async initLayoutComponents() {
        console.log('🔄 正在初始化布局组件...');
        
        // 1. 初始化侧边栏
        this.components.layout.sidebar = new Sidebar({
            appName: Config.APP_NAME,
            appVersion: Config.APP_VERSION,
            user: this.state.user,
            navigation: [
                { id: 'notes', label: '所有笔记', icon: 'fas fa-sticky-note', badge: 3 },
                { id: 'categories', label: '分类管理', icon: 'fas fa-folder', badge: 4 },
                { id: 'starred', label: '收藏夹', icon: 'fas fa-star', badge: 2 },
                { id: 'recent', label: '最近', icon: 'fas fa-history' },
                { id: 'trash', label: '回收站', icon: 'fas fa-trash' }
            ],
            bottomMenu: [
                { id: 'settings', label: '设置', icon: 'fas fa-cog' },
                { id: 'help', label: '帮助', icon: 'fas fa-question-circle' }
            ],
            onNavClick: (itemId) => this.handleNavigation(itemId)
        });
        
        // 渲染侧边栏
        this.components.layout.sidebar.renderTo('#app-sidebar');
        
        // 2. 初始化顶部导航
        this.components.layout.header = new Header({
            title: Config.APP_NAME,
            showSearch: true,
            showUserMenu: true,
            user: this.state.user,
            quickActions: [
                { id: 'new-note', label: '新建笔记', icon: 'fas fa-plus' },
                { id: 'sync', label: '立即同步', icon: 'fas fa-sync-alt' },
                { id: 'backup', label: '创建备份', icon: 'fas fa-save' }
            ],
            onSearch: (query) => this.handleSearch(query),
            onMenuClick: (action) => this.handleHeaderAction(action)
        });
        
        // 渲染顶部导航
        this.components.layout.header.renderTo('#app-header');
        
        // 3. 初始化页脚
        this.components.layout.footer = new Footer({
            appName: Config.APP_NAME,
            version: Config.APP_VERSION,
            copyright: `© ${new Date().getFullYear()} ${Config.APP_NAME}`,
            links: [
                { text: '隐私政策', url: '#', external: false },
                { text: '使用条款', url: '#', external: false },
                { text: '帮助中心', url: '#', external: false },
                { text: 'GitHub', url: 'https://github.com', external: true }
            ],
            showStatus: true,
            status: {
                online: Config.isOnline(),
                lastSync: OfflineManager.getLastSyncTime(),
                version: Config.APP_VERSION
            },
            onStatusClick: () => this.showSystemStatus()
        });
        
        // 渲染页脚
        this.components.layout.footer.renderTo('#app-footer');
        
        console.log('✅ 布局组件初始化完成');
    }
    
    /**
     * 初始化事件监听
     */
    initEventListeners() {
        console.log('🎯 正在初始化事件监听...');
        
        // 监听网络状态变化
        window.addEventListener('online', () => {
            this.state.online = true;
            this.components.layout.footer?.updateStatus({ online: true });
            Notify.info('网络已连接', '可以正常同步数据了');
            
            // 自动同步
            if (OfflineManager.hasPendingSync()) {
                OfflineManager.processQueue();
            }
        });
        
        window.addEventListener('offline', () => {
            this.state.online = false;
            this.components.layout.footer?.updateStatus({ online: false });
            Notify.warning('网络已断开', '正在使用离线模式');
        });
        
        // 监听主题变化
        document.addEventListener('theme:changed', (event) => {
            this.state.theme = event.detail.theme;
            this.components.layout.sidebar?.updateTheme(this.state.theme);
            this.components.layout.header?.updateTheme(this.state.theme);
        });
        
        // 监听键盘快捷键
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });
        
        // 监听URL hash变化（浏览器前进/后退）
        window.addEventListener('hashchange', () => {
            const page = window.location.hash.replace('#', '') || 'notes';
            if (this.currentPage !== page) {
                this.loadPage(page);
            }
        });
        
        // 监听同步事件
        document.addEventListener('sync:complete', () => {
            this.components.layout.footer?.updateStatus({
                lastSync: new Date().toISOString()
            });
        });
        
        console.log('✅ 事件监听初始化完成');
    }
    
    /**
     * 初始化路由
     */
    async initRouting() {
        console.log('📍 正在初始化路由...');
        
        // 获取当前页面（从URL hash或默认）
        const page = this.getCurrentPage();
        
        // 加载对应页面
        await this.loadPage(page);
        
        console.log('✅ 路由初始化完成，当前页面:', page);
    }
    
    /**
     * 获取当前页面
     */
    getCurrentPage() {
        // 从URL hash获取页面，默认为notes
        const hash = window.location.hash.replace('#', '');
        return hash || 'notes';
    }
    
    /**
     * 加载页面
     */
    async loadPage(pageId) {
        console.log(`📄 正在加载页面: ${pageId}`);
        
        // 如果正在显示同一页面，不重复加载
        if (this.currentPage === pageId && this.components.pages[pageId]) {
            return;
        }
        
        // 如果正在加载中，等待完成
        if (this.isLoading) {
            console.log('⏳ 正在加载中，稍后重试...');
            setTimeout(() => this.loadPage(pageId), 100);
            return;
        }
        
        // 显示页面加载状态
        this.showLoading(`正在加载${this.getPageTitle(pageId)}...`);
        
        try {
            // 隐藏当前页面
            if (this.currentPage && this.components.pages[this.currentPage]) {
                this.components.pages[this.currentPage].onHide?.();
            }
            
            // 更新URL hash
            window.location.hash = pageId;
            
            // 更新当前页面
            this.currentPage = pageId;
            
            // 更新侧边栏选中状态
            this.components.layout.sidebar?.setActiveItem(pageId);
            
            // 获取内容容器
            const contentContainer = document.getElementById('app-content');
            if (!contentContainer) {
                throw new Error('找不到内容容器 #app-content');
            }
            
            // 创建或获取页面实例
            let page = this.components.pages[pageId];
            
            if (!page) {
                // 根据页面ID创建对应的页面组件
                page = this.createPageComponent(pageId);
                this.components.pages[pageId] = page;
            }
            
            // 渲染页面
            await page.render(contentContainer);
            
            // 调用页面显示回调
            page.onShow?.();
            
            // 更新页面标题
            this.updatePageTitle(pageId);
            
            console.log(`✅ 页面加载完成: ${pageId}`);
            
        } catch (error) {
            console.error(`❌ 页面加载失败: ${pageId}`, error);
            
            // 显示错误页面
            const contentContainer = document.getElementById('app-content');
            if (contentContainer) {
                contentContainer.innerHTML = `
                    <div class="page-error">
                        <div class="error-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h2>页面加载失败</h2>
                        <p>${error.message}</p>
                        <div class="error-actions">
                            <button class="btn btn-primary" onclick="window.app.loadPage('${pageId}')">
                                重新加载
                            </button>
                            <button class="btn btn-secondary" onclick="window.app.loadPage('notes')">
                                返回首页
                            </button>
                        </div>
                    </div>
                `;
            }
            
            Notify.error(`页面加载失败: ${pageId}`, error.message);
            
        } finally {
            // 隐藏加载状态
            this.hideLoading();
        }
    }
    
    /**
     * 创建页面组件实例
     */
    createPageComponent(pageId) {
        switch (pageId) {
            case 'notes':
                return new NotesPage(this, {
                    id: 'notes-page',
                    title: '所有笔记',
                    icon: 'fas fa-sticky-note',
                    defaultView: 'list',
                    itemsPerPage: 20,
                    enableSearch: true,
                    enableFilters: true,
                    enableSort: true,
                    enableBulkActions: true,
                    autoRefresh: true,
                    refreshInterval: 30000,
                    onNoteClick: (note) => this.openNoteEditor(note),
                    onNoteCreate: (note) => this.handleNoteCreated(note),
                    onNoteUpdate: (note) => this.handleNoteUpdated(note),
                    onNoteDelete: (noteId) => this.handleNoteDeleted(noteId)
                });
                
            case 'settings':
                return new SettingsPage(this, {
                    id: 'settings-page',
                    title: '设置',
                    icon: 'fas fa-cog',
                    defaultSection: 'general',
                    autoSave: true,
                    saveDelay: 1000,
                    onSave: (settings) => this.handleSettingsSaved(settings),
                    onReset: (defaultSettings) => this.handleSettingsReset(defaultSettings)
                });
                
            case 'categories':
                return new CategoriesPage(this, {
                    id: 'categories-page',
                    title: '分类管理',
                    icon: 'fas fa-folder',
                    viewMode: 'tree',
                    showCounts: true,
                    showIcons: true,
                    showColors: true,
                    enableDragDrop: true,
                    enableBulkActions: true,
                    maxDepth: 3,
                    onCategoryClick: (category) => this.handleCategoryClick(category),
                    onCategoryCreate: (category) => this.handleCategoryCreated(category),
                    onCategoryUpdate: (category) => this.handleCategoryUpdated(category),
                    onCategoryDelete: (categoryId) => this.handleCategoryDeleted(categoryId),
                    onCategoryMove: (sourceId, targetId, position) => 
                        this.handleCategoryMoved(sourceId, targetId, position)
                });
                
            default:
                throw new Error(`未知的页面类型: ${pageId}`);
        }
    }
    
    /**
     * 获取页面标题
     */
    getPageTitle(pageId) {
        const titles = {
            notes: '笔记',
            settings: '设置',
            categories: '分类',
            starred: '收藏夹',
            recent: '最近',
            trash: '回收站'
        };
        return titles[pageId] || '页面';
    }
    
    /**
     * 更新页面标题
     */
    updatePageTitle(pageId) {
        const pageTitle = this.getPageTitle(pageId);
        document.title = `${pageTitle} - ${Config.APP_NAME}`;
        
        // 更新头部标题
        this.components.layout.header?.updateTitle(pageTitle);
    }
    
    /**
     * 处理导航
     */
    handleNavigation(itemId) {
        console.log(`📍 导航到: ${itemId}`);
        
        // 如果是页面导航
        if (['notes', 'settings', 'categories'].includes(itemId)) {
            this.loadPage(itemId);
            return;
        }
        
        // 处理其他导航项
        switch (itemId) {
            case 'starred':
                this.loadPage('notes');
                // 稍后应用筛选
                setTimeout(() => {
                    if (this.components.pages.notes) {
                        this.components.pages.notes.setFilter('starred', true);
                    }
                }, 100);
                break;
                
            case 'recent':
                this.loadPage('notes');
                // 稍后应用排序
                setTimeout(() => {
                    if (this.components.pages.notes) {
                        this.components.pages.notes.state.sortBy = 'updated';
                        this.components.pages.notes.state.sortOrder = 'desc';
                        this.components.pages.notes.applyFiltersAndSort();
                    }
                }, 100);
                break;
                
            case 'trash':
                Notify.info('回收站', '功能开发中...');
                break;
                
            case 'help':
                this.showHelpModal();
                break;
                
            default:
                console.warn(`未知的导航项: ${itemId}`);
        }
    }
    
    /**
     * 处理搜索
     */
    handleSearch(query) {
        console.log(`🔍 搜索: ${query}`);
        
        if (this.currentPage === 'notes' && this.components.pages.notes) {
            // 如果在笔记页面，直接搜索
            this.components.pages.notes.state.searchQuery = query;
            this.components.pages.notes.applySearch();
        } else {
            // 否则跳转到笔记页面并搜索
            this.loadPage('notes');
            // 稍后设置搜索词
            setTimeout(() => {
                if (this.components.pages.notes) {
                    this.components.pages.notes.state.searchQuery = query;
                    this.components.pages.notes.applySearch();
                }
            }, 100);
        }
    }
    
    /**
     * 处理头部操作
     */
    handleHeaderAction(action) {
        console.log(`🔘 头部操作: ${action}`);
        
        switch (action) {
            case 'new-note':
                this.createNewNote();
                break;
                
            case 'sync':
                this.manualSync();
                break;
                
            case 'backup':
                this.createBackup();
                break;
                
            case 'profile':
                this.showProfileModal();
                break;
                
            case 'logout':
                this.logout();
                break;
                
            case 'theme':
                this.toggleTheme();
                break;
                
            default:
                console.warn(`未知的头部操作: ${action}`);
        }
    }
    
    /**
     * 处理键盘快捷键
     */
    handleKeyboardShortcuts(event) {
        // 忽略输入框中的按键
        if (event.target.tagName === 'INPUT' || 
            event.target.tagName === 'TEXTAREA' ||
            event.target.isContentEditable) {
            return;
        }
        
        const ctrl = event.ctrlKey || event.metaKey;
        
        // 全局快捷键
        switch (event.key) {
            case 'n':
                if (ctrl) {
                    event.preventDefault();
                    this.createNewNote();
                }
                break;
                
            case 'f':
                if (ctrl) {
                    event.preventDefault();
                    this.components.layout.header?.focusSearch();
                }
                break;
                
            case 's':
                if (ctrl) {
                    event.preventDefault();
                    this.manualSync();
                }
                break;
                
            case 'b':
                if (ctrl) {
                    event.preventDefault();
                    this.createBackup();
                }
                break;
                
            case ',':
                if (ctrl) {
                    event.preventDefault();
                    this.loadPage('settings');
                }
                break;
                
            case 'Escape':
                // 关闭所有模态框
                Modal.closeAll();
                break;
                
            case '?':
                if (ctrl) {
                    event.preventDefault();
                    this.showHelpModal();
                }
                break;
        }
        
        // 页面特定快捷键
        if (this.currentPage && this.components.pages[this.currentPage]) {
            this.components.pages[this.currentPage].handleKeyboardShortcuts?.(event);
        }
    }
    
    /**
     * 处理主题变化
     */
    handleThemeChange(theme) {
        Config.setTheme(theme);
        this.state.theme = theme;
        this.state.preferences.theme = theme;
        Utils.storage.set('user_preferences', this.state.preferences);
        
        Notify.success('主题已切换', `已切换到${theme === 'dark' ? '深色' : '浅色'}主题`);
    }
    
    /**
     * 创建新笔记
     */
    createNewNote() {
        console.log('📝 创建新笔记');
        
        const modal = new NoteModal({
            noteData: {
                title: '',
                content: '',
                category: '',
                tags: [],
                isEncrypted: this.state.preferences.encryptByDefault || true
            },
            categories: this.getCategories(),
            onSave: (note) => {
                this.handleNoteCreated(note);
            },
            onCancel: () => {
                console.log('取消创建笔记');
            }
        });
        
        modal.open();
    }
    
    /**
     * 打开笔记编辑器
     */
    openNoteEditor(note) {
        console.log(`📄 打开笔记编辑器: ${note.id}`);
        
        const modal = new NoteModal({
            noteId: note.id,
            noteData: note,
            categories: this.getCategories(),
            onSave: (updatedNote) => {
                this.handleNoteUpdated(updatedNote);
            },
            onDelete: (noteId) => {
                this.handleNoteDeleted(noteId);
            }
        });
        
        modal.open();
    }
    
    /**
     * 获取分类列表
     */
    getCategories() {
        // 这里应该从API获取，暂时返回空数组
        return [];
    }
    
    /**
     * 处理笔记创建
     */
    handleNoteCreated(note) {
        console.log(`✅ 笔记创建成功: ${note.id}`);
        Notify.success('笔记创建成功', note.title);
        
        // 触发事件
        document.dispatchEvent(new CustomEvent('note:created', {
            detail: { note }
        }));
        
        // 如果当前在笔记页面，刷新列表
        if (this.currentPage === 'notes' && this.components.pages.notes) {
            this.components.pages.notes.handleNoteCreated(note);
        }
    }
    
    /**
     * 处理笔记更新
     */
    handleNoteUpdated(note) {
        console.log(`✅ 笔记更新成功: ${note.id}`);
        
        // 触发事件
        document.dispatchEvent(new CustomEvent('note:updated', {
            detail: { note }
        }));
        
        // 如果当前在笔记页面，刷新列表
        if (this.currentPage === 'notes' && this.components.pages.notes) {
            this.components.pages.notes.handleNoteUpdated(note);
        }
    }
    
    /**
     * 处理笔记删除
     */
    handleNoteDeleted(noteId) {
        console.log(`🗑️ 笔记删除: ${noteId}`);
        
        // 触发事件
        document.dispatchEvent(new CustomEvent('note:deleted', {
            detail: { noteId }
        }));
        
        // 如果当前在笔记页面，刷新列表
        if (this.currentPage === 'notes' && this.components.pages.notes) {
            this.components.pages.notes.handleNoteDeleted(noteId);
        }
    }
    
    /**
     * 处理分类点击
     */
    handleCategoryClick(category) {
        console.log(`📁 点击分类: ${category.name}`);
        
        // 跳转到笔记页面并筛选该分类
        this.loadPage('notes');
        
        setTimeout(() => {
            if (this.components.pages.notes) {
                this.components.pages.notes.setFilter('category', category.id);
            }
        }, 100);
    }
    
    /**
     * 处理分类创建
     */
    handleCategoryCreated(category) {
        console.log(`✅ 分类创建成功: ${category.name}`);
        Notify.success('分类创建成功', category.name);
        
        // 触发事件
        document.dispatchEvent(new CustomEvent('category:created', {
            detail: { category }
        }));
    }
    
    /**
     * 处理分类更新
     */
    handleCategoryUpdated(category) {
        console.log(`✅ 分类更新成功: ${category.name}`);
        
        // 触发事件
        document.dispatchEvent(new CustomEvent('category:updated', {
            detail: { category }
        }));
    }
    
    /**
     * 处理分类删除
     */
    handleCategoryDeleted(categoryId) {
        console.log(`🗑️ 分类删除: ${categoryId}`);
        
        // 触发事件
        document.dispatchEvent(new CustomEvent('category:deleted', {
            detail: { categoryId }
        }));
    }
    
    /**
     * 处理分类移动
     */
    handleCategoryMoved(sourceId, targetId, position) {
        console.log(`📦 分类移动: ${sourceId} -> ${targetId} (${position})`);
        
        // 触发事件
        document.dispatchEvent(new CustomEvent('category:moved', {
            detail: { sourceId, targetId, position }
        }));
    }
    
    /**
     * 处理设置保存
     */
    handleSettingsSaved(settings) {
        console.log('✅ 设置保存成功', settings);
        
        // 应用设置
        this.applySettings(settings);
        
        // 保存到偏好设置
        this.state.preferences = { ...this.state.preferences, ...settings.general };
        Utils.storage.set('user_preferences', this.state.preferences);
        
        Notify.success('设置已保存', '您的偏好设置已更新');
    }
    
    /**
     * 处理设置重置
     */
    handleSettingsReset(defaultSettings) {
        console.log('🔄 设置已重置为默认值');
        
        // 应用默认设置
        this.applySettings(defaultSettings);
        
        // 重置偏好设置
        this.state.preferences = defaultSettings.general;
        Utils.storage.set('user_preferences', this.state.preferences);
        
        Notify.success('设置已重置', '已恢复为默认设置');
    }
    
    /**
     * 应用设置
     */
    applySettings(settings) {
        // 应用主题设置
        if (settings.general?.theme) {
            this.handleThemeChange(settings.general.theme);
        }
        
        // 应用其他设置...
        // 这里可以根据需要添加其他设置的应用逻辑
    }
    
    /**
     * 手动同步
     */
    async manualSync() {
        console.log('🔄 手动同步数据');
        
        if (!Config.isOnline()) {
            Notify.warning('网络未连接', '请检查网络连接后重试');
            return;
        }
        
        try {
            const loader = Loader.show('正在同步数据...');
            
            // 处理离线队列
            await OfflineManager.processQueue();
            
            // 触发同步事件
            document.dispatchEvent(new CustomEvent('sync:manual'));
            
            // 更新最后同步时间
            OfflineManager.updateLastSyncTime();
            this.components.layout.footer?.updateStatus({
                lastSync: new Date().toISOString()
            });
            
            loader.hide();
            Notify.success('同步完成', '数据已同步到服务器');
            
        } catch (error) {
            console.error('同步失败:', error);
            Notify.error('同步失败', error.message);
        }
    }
    
    /**
     * 创建备份
     */
    async createBackup() {
        console.log('💾 创建备份');
        
        ConfirmModal.show({
            title: '创建备份',
            message: '确定要创建数据备份吗？',
            confirmText: '创建',
            onConfirm: async () => {
                try {
                    const loader = Loader.show('正在创建备份...');
                    
                    // 模拟备份过程
                    await Utils.sleep(1000);
                    
                    // 这里应该是真实的备份逻辑
                    const backupData = {
                        notes: [],
                        categories: [],
                        settings: this.state.preferences,
                        backupTime: new Date().toISOString(),
                        version: Config.APP_VERSION
                    };
                    
                    // 保存备份
                    const backups = Utils.storage.get('backups', []);
                    backups.unshift({
                        id: `backup_${Date.now()}`,
                        name: `手动备份_${new Date().toLocaleDateString()}`,
                        ...backupData
                    });
                    
                    // 只保留最近的10个备份
                    if (backups.length > 10) {
                        backups.length = 10;
                    }
                    
                    Utils.storage.set('backups', backups);
                    
                    loader.hide();
                    Notify.success('备份创建成功', '数据已备份到本地');
                    
                } catch (error) {
                    console.error('备份失败:', error);
                    Notify.error('备份失败', error.message);
                }
            }
        });
    }
    
    /**
     * 显示帮助模态框
     */
    showHelpModal() {
        const helpContent = `
            <div class="help-content">
                <h3>快捷键参考</h3>
                <ul>
                    <li><kbd>Ctrl/Cmd + N</kbd> - 新建笔记</li>
                    <li><kbd>Ctrl/Cmd + F</kbd> - 搜索</li>
                    <li><kbd>Ctrl/Cmd + S</kbd> - 同步数据</li>
                    <li><kbd>Ctrl/Cmd + B</kbd> - 创建备份</li>
                    <li><kbd>Ctrl/Cmd + ,</kbd> - 打开设置</li>
                    <li><kbd>Ctrl/Cmd + ?</kbd> - 显示帮助</li>
                    <li><kbd>Esc</kbd> - 关闭模态框</li>
                </ul>
                
                <h3>功能介绍</h3>
                <ul>
                    <li><strong>笔记管理</strong> - 创建、编辑、删除笔记，支持加密</li>
                    <li><strong>分类管理</strong> - 组织笔记到分类，支持拖拽排序</li>
                    <li><strong>设置</strong> - 自定义应用外观和行为</li>
                    <li><strong>离线支持</strong> - 无网络时也可使用</li>
                    <li><strong>数据同步</strong> - 多设备间同步笔记</li>
                </ul>
                
                <h3>使用提示</h3>
                <ul>
                    <li>使用星标标记重要笔记</li>
                    <li>为笔记添加标签便于搜索</li>
                    <li>定期备份重要数据</li>
                    <li>启用加密保护敏感信息</li>
                </ul>
            </div>
        `;
        
        Modal.show({
            title: '帮助与快捷键',
            content: helpContent,
            size: 'lg',
            showFooter: false
        });
    }
    
    /**
     * 显示个人资料模态框
     */
    showProfileModal() {
        const { user } = this.state;
        
        const profileContent = `
            <div class="profile-content">
                <div class="profile-header">
                    <div class="profile-avatar">
                        <img src="${user.avatar}" alt="${user.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=128'">
                    </div>
                    <div class="profile-info">
                        <h3>${user.name}</h3>
                        <p>${user.email}</p>
                        <p class="text-muted">用户ID: ${user.id}</p>
                    </div>
                </div>
                
                <div class="profile-stats">
                    <div class="stat-item">
                        <div class="stat-value">${this.components.pages.notes?.state.stats.total || 0}</div>
                        <div class="stat-label">笔记</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${this.components.pages.notes?.state.stats.starred || 0}</div>
                        <div class="stat-label">星标</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${this.components.pages.categories?.state.stats.total || 0}</div>
                        <div class="stat-label">分类</div>
                    </div>
                </div>
                
                <div class="profile-actions">
                    <button class="btn btn-secondary btn-block" onclick="window.app.editProfile()">
                        编辑资料
                    </button>
                </div>
            </div>
        `;
        
        Modal.show({
            title: '个人资料',
            content: profileContent,
            size: 'md',
            footer: `
                <button class="btn btn-primary" onclick="window.app.editProfile()">
                    编辑资料
                </button>
                <button class="btn btn-secondary" data-dismiss="modal">
                    关闭
                </button>
            `
        });
    }
    
    /**
     * 编辑个人资料
     */
    editProfile() {
        Notify.info('编辑资料', '功能开发中...');
    }
    
    /**
     * 显示系统状态
     */
    showSystemStatus() {
        const statusContent = `
            <div class="system-status">
                <div class="status-item">
                    <span class="status-label">应用版本:</span>
                    <span class="status-value">${Config.APP_VERSION}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">网络状态:</span>
                    <span class="status-value ${Config.isOnline() ? 'online' : 'offline'}">
                        ${Config.isOnline() ? '在线' : '离线'}
                    </span>
                </div>
                <div class="status-item">
                    <span class="status-label">当前主题:</span>
                    <span class="status-value">${this.state.theme}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">最后同步:</span>
                    <span class="status-value">${Utils.formatDate(OfflineManager.getLastSyncTime()) || '从未同步'}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">待同步任务:</span>
                    <span class="status-value">${OfflineManager.getQueueStatus().total}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">本地存储:</span>
                    <span class="status-value">正常</span>
                </div>
                
                <div class="status-actions">
                    <button class="btn btn-sm btn-secondary" onclick="window.app.manualSync()">
                        立即同步
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="window.app.checkForUpdates()">
                        检查更新
                    </button>
                </div>
            </div>
        `;
        
        Modal.show({
            title: '系统状态',
            content: statusContent,
            size: 'md',
            showFooter: false
        });
    }
    
    /**
     * 检查更新
     */
    checkForUpdates() {
        Notify.info('检查更新', '当前已是最新版本');
    }
    
    /**
     * 切换主题
     */
    toggleTheme() {
        const newTheme = this.state.theme === 'dark' ? 'light' : 'dark';
        this.handleThemeChange(newTheme);
    }
    
    /**
     * 退出登录
     */
    logout() {
        ConfirmModal.show({
            title: '确认退出',
            message: '确定要退出登录吗？',
            confirmText: '退出',
            confirmType: 'danger',
            onConfirm: async () => {
                try {
                    const loader = Loader.show('正在退出...');
                    
                    // 模拟退出过程
                    await Utils.sleep(500);
                    
                    // 这里应该是真实的登出逻辑
                    // await Api.auth.logout();
                    
                    // 清除用户数据
                    this.state.user = null;
                    Utils.storage.remove('user_token');
                    Utils.storage.remove('user_preferences');
                    
                    loader.hide();
                    
                    // 重新加载页面
                    Notify.success('已退出登录', '正在重新加载页面...');
                    setTimeout(() => location.reload(), 1000);
                    
                } catch (error) {
                    console.error('退出失败:', error);
                    Notify.error('退出失败', error.message);
                }
            }
        });
    }
    
    /**
     * 显示欢迎消息
     */
    showWelcomeMessage() {
        // 只在首次加载时显示
        const hasSeenWelcome = Utils.storage.get('has_seen_welcome', false);
        
        if (!hasSeenWelcome) {
            setTimeout(() => {
                Notify.success(
                    '欢迎使用我的加密笔记！',
                    '开始记录您的想法和灵感吧。',
                    { duration: 5000 }
                );
                
                Utils.storage.set('has_seen_welcome', true);
            }, 1000);
        }
    }
    
    /**
     * 获取应用状态
     */
    getAppState() {
        return {
            initialized: this.isInitialized,
            currentPage: this.currentPage,
            user: this.state.user,
            theme: this.state.theme,
            online: this.state.online,
            preferences: this.state.preferences,
            offlineQueue: OfflineManager.getQueueStatus(),
            components: {
                layout: Object.keys(this.components.layout).filter(key => this.components.layout[key] !== null),
                pages: Object.keys(this.components.pages).filter(key => this.components.pages[key] !== null)
            }
        };
    }
    
    /**
     * 销毁应用
     */
    destroy() {
        console.log('🧹 正在销毁应用...');
        
        // 销毁页面组件
        Object.values(this.components.pages).forEach(page => {
            if (page && typeof page.destroy === 'function') {
                page.destroy();
            }
        });
        
        // 销毁布局组件
        Object.values(this.components.layout).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        });
        
        // 清除引用
        this.components = {
            layout: { sidebar: null, header: null, footer: null },
            pages: { notes: null, settings: null, categories: null },
            modals: { note: null, category: null, settings: null }
        };
        
        this.isInitialized = false;
        this.currentPage = null;
        
        console.log('✅ 应用已销毁');
    }
}

// ==================== 应用启动 ====================

// 创建全局应用实例
window.app = new NoteApp();

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM加载完成，开始初始化应用');
    
    // 添加一些初始样式
    const style = document.createElement('style');
    style.textContent = `
        /* 应用加载样式 */
        .app-loading-overlay {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 2rem;
            text-align: center;
            color: var(--text-secondary);
        }
        
        .app-loading-overlay .loading-spinner {
            font-size: 3rem;
            color: var(--primary-color);
            margin-bottom: 1rem;
        }
        
        .app-loading-overlay .loading-message {
            font-size: 1rem;
        }
        
        /* 错误页面样式 */
        .app-error, .page-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 2rem;
            text-align: center;
        }
        
        .app-error .error-icon,
        .page-error .error-icon {
            font-size: 4rem;
            color: var(--danger-color);
            margin-bottom: 1.5rem;
            opacity: 0.7;
        }
        
        .app-error h2,
        .page-error h2 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: var(--text-primary);
        }
        
        .app-error p,
        .page-error p {
            font-size: 1rem;
            color: var(--text-secondary);
            margin-bottom: 2rem;
            max-width: 400px;
            line-height: 1.5;
        }
        
        .error-actions {
            display: flex;
            gap: 1rem;
        }
        
        /* 帮助内容样式 */
        .help-content {
            padding: 0.5rem;
        }
        
        .help-content h3 {
            margin-top: 1.5rem;
            margin-bottom: 1rem;
            font-size: 1.1rem;
            color: var(--text-primary);
        }
        
        .help-content h3:first-child {
            margin-top: 0;
        }
        
        .help-content ul {
            margin-left: 1.5rem;
            margin-bottom: 1.5rem;
        }
        
        .help-content li {
            margin-bottom: 0.5rem;
            line-height: 1.5;
        }
        
        .help-content kbd {
            display: inline-block;
            padding: 0.2rem 0.4rem;
            font-family: var(--font-mono);
            font-size: 0.85em;
            background-color: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 0.25rem;
            box-shadow: 0 1px 1px rgba(0,0,0,0.1);
        }
        
        /* 个人资料样式 */
        .profile-content {
            padding: 0.5rem;
        }
        
        .profile-header {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .profile-avatar img {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid var(--primary-light);
        }
        
        .profile-info h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.25rem;
            color: var(--text-primary);
        }
        
        .profile-info p {
            margin-bottom: 0.25rem;
            color: var(--text-secondary);
        }
        
        .profile-stats {
            display: flex;
            justify-content: space-around;
            margin-bottom: 2rem;
            padding: 1.5rem 0;
            border-top: 1px solid var(--border-color);
            border-bottom: 1px solid var(--border-color);
        }
        
        .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .stat-value {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .stat-label {
            font-size: 0.875rem;
            color: var(--text-tertiary);
            margin-top: 0.25rem;
        }
        
        .profile-actions {
            margin-top: 1rem;
        }
        
        /* 系统状态样式 */
        .system-status {
            padding: 0.5rem;
        }
        
        .status-item {
            display: flex;
            justify-content: space-between;
            padding: 0.75rem 0;
            border-bottom: 1px solid var(--border-color);
        }
        
        .status-item:last-child {
            border-bottom: none;
        }
        
        .status-label {
            color: var(--text-secondary);
        }
        
        .status-value {
            font-weight: 500;
            color: var(--text-primary);
        }
        
        .status-value.online {
            color: var(--success-color);
        }
        
        .status-value.offline {
            color: var(--danger-color);
        }
        
        .status-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 1.5rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border-color);
        }
    `;
    document.head.appendChild(style);
    
    // 初始化应用
    window.app.init().catch(error => {
        console.error('应用启动失败:', error);
        document.body.innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <h2>应用启动失败</h2>
                <p>${error.message}</p>
                <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem;">
                    重新加载
                </button>
            </div>
        `;
    });
});

// 导出应用类（如果支持模块）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NoteApp };
}


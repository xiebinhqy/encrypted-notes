/**
 * 笔记列表组件
 * 显示所有笔记的列表，支持搜索、筛选、排序、批量操作等功能
 */

import Utils from '../../core/utils.js';
import Config from '../../config.js';
import Api from '../../api/index.js';
import OfflineManager from '../../core/offline.js';

export class NoteList {
    constructor(app, options = {}) {
        this.app = app;
        this.container = null;
        this.options = {
            viewMode: 'grid', // 'grid', 'list', 'compact'
            sortBy: 'updated_at',
            sortOrder: 'desc',
            pageSize: 20,
            showFilters: true,
            showSearch: true,
            showStats: true,
            enableMultiSelect: false,
            enableDragDrop: true,
            autoRefresh: true,
            autoRefreshInterval: 30000,
            ...options
        };
        
        this.state = {
            notes: [],
            filteredNotes: [],
            selectedNotes: new Set(),
            searchQuery: '',
            filters: {
                category: '',
                tags: [],
                encrypted: null,
                starred: null,
                dateRange: null
            },
            sortOptions: [
                { id: 'updated_at', label: '最近更新', icon: 'fa-clock' },
                { id: 'created_at', label: '创建时间', icon: 'fa-calendar-plus' },
                { id: 'title', label: '标题', icon: 'fa-font' },
                { id: 'word_count', label: '字数', icon: 'fa-text-width' }
            ],
            currentPage: 1,
            totalPages: 1,
            totalNotes: 0,
            isLoading: false,
            isRefreshing: false,
            hasMore: true,
            stats: {
                total: 0,
                encrypted: 0,
                starred: 0,
                byCategory: {},
                recent: 0
            }
        };
        
        this.refreshInterval = null;
        this.scrollHandler = null;
        this.init();
    }
    
    /**
     * 初始化组件
     */
    async init() {
        // 从本地存储加载配置
        this.loadConfig();
        
        // 设置事件监听器
        this.setupEventListeners();
        
        // 加载初始数据
        await this.loadData();
    }
    
    /**
     * 加载配置
     */
    loadConfig() {
        const savedConfig = Utils.storage.get('note_list_config', {});
        this.options = { ...this.options, ...savedConfig };
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听笔记相关事件
        document.addEventListener('note:created', (e) => this.handleNoteCreated(e.detail));
        document.addEventListener('note:updated', (e) => this.handleNoteUpdated(e.detail));
        document.addEventListener('note:deleted', (e) => this.handleNoteDeleted(e.detail));
        document.addEventListener('note:saved', (e) => this.handleNoteSaved(e.detail));
        
        // 监听同步事件
        document.addEventListener('sync:complete', () => this.handleSyncComplete());
        
        // 监听分类变化
        document.addEventListener('category:updated', () => this.refreshData());
        
        // 监听网络状态
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // 监听键盘事件
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }
    
    /**
     * 渲染组件
     */
    async render(container) {
        this.container = container;
        
        // 渲染列表结构
        container.innerHTML = this.getTemplate();
        
        // 缓存DOM元素
        this.cacheElements();
        
        // 绑定事件
        this.bindEvents();
        
        // 初始化虚拟滚动
        this.initVirtualScroll();
        
        // 开始自动刷新
        if (this.options.autoRefresh) {
            this.startAutoRefresh();
        }
        
        console.log('[笔记列表] 组件渲染完成');
    }
    
    /**
     * 获取模板
     */
    getTemplate() {
        return `
            <div class="note-list-container">
                <!-- 工具栏 -->
                <div class="list-toolbar">
                    ${this.getToolbarTemplate()}
                </div>
                
                <!-- 搜索和筛选区域 -->
                ${this.options.showSearch || this.options.showFilters ? this.getFilterTemplate() : ''}
                
                <!-- 统计数据 -->
                ${this.options.showStats ? this.getStatsTemplate() : ''}
                
                <!-- 列表主体 -->
                <div class="list-main">
                    <!-- 多选操作栏 -->
                    ${this.options.enableMultiSelect ? this.getMultiSelectToolbar() : ''}
                    
                    <!-- 视图切换 -->
                    <div class="view-controls">
                        ${this.getViewControlsTemplate()}
                    </div>
                    
                    <!-- 笔记列表 -->
                    <div class="notes-container ${this.options.viewMode}-view" id="notes-container">
                        ${this.getNotesListTemplate()}
                    </div>
                    
                    <!-- 加载更多 -->
                    ${this.state.hasMore ? this.getLoadMoreTemplate() : ''}
                    
                    <!-- 空状态 -->
                    ${this.state.filteredNotes.length === 0 && !this.state.isLoading ? this.getEmptyStateTemplate() : ''}
                    
                    <!-- 加载状态 -->
                    ${this.state.isLoading ? this.getLoadingTemplate() : ''}
                </div>
                
                <!-- 分页控件 -->
                ${this.state.totalPages > 1 ? this.getPaginationTemplate() : ''}
            </div>
        `;
    }
    
    /**
     * 获取工具栏模板
     */
    getToolbarTemplate() {
        return `
            <div class="toolbar-content">
                <!-- 左侧：批量操作 -->
                <div class="toolbar-left">
                    ${this.options.enableMultiSelect ? `
                        <div class="toolbar-group">
                            <button class="toolbar-btn multi-select-toggle" title="多选模式 (Ctrl+Shift+M)">
                                <i class="fas fa-check-square"></i>
                                <span class="btn-text">多选</span>
                            </button>
                        </div>
                        
                        <div class="toolbar-divider"></div>
                    ` : ''}
                    
                    <!-- 新建笔记 -->
                    <div class="toolbar-group">
                        <button class="toolbar-btn new-note" title="新建笔记 (Ctrl+N)">
                            <i class="fas fa-plus"></i>
                            <span class="btn-text">新建笔记</span>
                        </button>
                    </div>
                    
                    <!-- 导入导出 -->
                    <div class="toolbar-group">
                        <button class="toolbar-btn import-notes" title="导入笔记">
                            <i class="fas fa-file-import"></i>
                        </button>
                        <button class="toolbar-btn export-notes" title="导出笔记">
                            <i class="fas fa-file-export"></i>
                        </button>
                    </div>
                </div>
                
                <!-- 右侧：刷新和设置 -->
                <div class="toolbar-right">
                    <!-- 刷新 -->
                    <div class="toolbar-group">
                        <button class="toolbar-btn refresh-list ${this.state.isRefreshing ? 'refreshing' : ''}" title="刷新列表 (F5)">
                            <i class="fas fa-${this.state.isRefreshing ? 'spinner fa-spin' : 'sync-alt'}"></i>
                        </button>
                    </div>
                    
                    <div class="toolbar-divider"></div>
                    
                    <!-- 显示设置 -->
                    <div class="toolbar-group">
                        <button class="toolbar-btn list-settings" title="列表设置">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取筛选模板
     */
    getFilterTemplate() {
        return `
            <div class="list-filters">
                <!-- 搜索框 -->
                ${this.options.showSearch ? `
                    <div class="search-container">
                        <div class="search-input-container">
                            <i class="fas fa-search search-icon"></i>
                            <input type="text" 
                                   class="search-input" 
                                   placeholder="搜索笔记标题、内容、标签..."
                                   value="${this.state.searchQuery}"
                                   autocomplete="off">
                            ${this.state.searchQuery ? `
                                <button class="search-clear" title="清除搜索">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                        </div>
                        <button class="search-advanced-btn" title="高级搜索">
                            <i class="fas fa-sliders-h"></i>
                        </button>
                    </div>
                ` : ''}
                
                <!-- 筛选器 -->
                ${this.options.showFilters ? `
                    <div class="filter-container">
                        <!-- 分类筛选 -->
                        <div class="filter-group">
                            <select class="filter-select category-filter">
                                <option value="">所有分类</option>
                                <option value="work" ${this.state.filters.category === 'work' ? 'selected' : ''}>工作</option>
                                <option value="personal" ${this.state.filters.category === 'personal' ? 'selected' : ''}>个人</option>
                                <option value="study" ${this.state.filters.category === 'study' ? 'selected' : ''}>学习</option>
                            </select>
                        </div>
                        
                        <!-- 标签筛选 -->
                        <div class="filter-group">
                            <select class="filter-select tags-filter" multiple>
                                <option value="important" ${this.state.filters.tags.includes('important') ? 'selected' : ''}>重要</option>
                                <option value="todo" ${this.state.filters.tags.includes('todo') ? 'selected' : ''}>待办</option>
                                <option value="archive" ${this.state.filters.tags.includes('archive') ? 'selected' : ''}>归档</option>
                            </select>
                        </div>
                        
                        <!-- 加密状态 -->
                        <div class="filter-group">
                            <select class="filter-select encryption-filter">
                                <option value="">所有加密状态</option>
                                <option value="encrypted" ${this.state.filters.encrypted === true ? 'selected' : ''}>已加密</option>
                                <option value="unencrypted" ${this.state.filters.encrypted === false ? 'selected' : ''}>未加密</option>
                            </select>
                        </div>
                        
                        <!-- 收藏状态 -->
                        <div class="filter-group">
                            <select class="filter-select starred-filter">
                                <option value="">所有收藏状态</option>
                                <option value="starred" ${this.state.filters.starred === true ? 'selected' : ''}>已收藏</option>
                                <option value="unstarred" ${this.state.filters.starred === false ? 'selected' : ''}>未收藏</option>
                            </select>
                        </div>
                        
                        <!-- 日期范围 -->
                        <div class="filter-group">
                            <select class="filter-select date-filter">
                                <option value="">所有时间</option>
                                <option value="today" ${this.state.filters.dateRange === 'today' ? 'selected' : ''}>今天</option>
                                <option value="week" ${this.state.filters.dateRange === 'week' ? 'selected' : ''}>本周</option>
                                <option value="month" ${this.state.filters.dateRange === 'month' ? 'selected' : ''}>本月</option>
                            </select>
                        </div>
                        
                        <!-- 清除筛选 -->
                        ${this.hasActiveFilters() ? `
                            <button class="filter-clear-btn" title="清除所有筛选">
                                清除筛选
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 获取统计模板
     */
    getStatsTemplate() {
        return `
            <div class="list-stats">
                <div class="stats-grid">
                    <!-- 总笔记数 -->
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-file-alt"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.state.stats.total}</div>
                            <div class="stat-label">总笔记数</div>
                        </div>
                    </div>
                    
                    <!-- 已加密 -->
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-lock"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.state.stats.encrypted}</div>
                            <div class="stat-label">已加密</div>
                        </div>
                    </div>
                    
                    <!-- 已收藏 -->
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-star"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.state.stats.starred}</div>
                            <div class="stat-label">已收藏</div>
                        </div>
                    </div>
                    
                    <!-- 最近更新 -->
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-history"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${this.state.stats.recent}</div>
                            <div class="stat-label">最近7天</div>
                        </div>
                    </div>
                </div>
                
                <!-- 分类分布 -->
                ${Object.keys(this.state.stats.byCategory).length > 0 ? `
                    <div class="category-stats">
                        <h4 class="stats-title">分类分布</h4>
                        <div class="category-bars">
                            ${Object.entries(this.state.stats.byCategory)
                                .slice(0, 5)
                                .map(([category, count]) => `
                                <div class="category-bar">
                                    <span class="category-name">${category}</span>
                                    <div class="bar-container">
                                        <div class="bar-fill" style="width: ${(count / this.state.stats.total) * 100}%"></div>
                                    </div>
                                    <span class="category-count">${count}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 获取多选工具栏模板
     */
    getMultiSelectToolbar() {
        const selectedCount = this.state.selectedNotes.size;
        
        if (selectedCount === 0) return '';
        
        return `
            <div class="multi-select-toolbar">
                <div class="multi-select-info">
                    <i class="fas fa-check-circle"></i>
                    <span>已选择 <strong>${selectedCount}</strong> 个笔记</span>
                </div>
                
                <div class="multi-select-actions">
                    <button class="multi-select-btn" title="添加到分类">
                        <i class="fas fa-folder"></i>
                        <span>分类</span>
                    </button>
                    
                    <button class="multi-select-btn" title="添加标签">
                        <i class="fas fa-tag"></i>
                        <span>标签</span>
                    </button>
                    
                    <button class="multi-select-btn" title="导出选中笔记">
                        <i class="fas fa-download"></i>
                        <span>导出</span>
                    </button>
                    
                    <button class="multi-select-btn delete-selected" title="删除选中笔记">
                        <i class="fas fa-trash"></i>
                        <span>删除</span>
                    </button>
                    
                    <button class="multi-select-btn cancel-selection" title="取消选择">
                        <i class="fas fa-times"></i>
                        <span>取消</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取视图控制模板
     */
    getViewControlsTemplate() {
        return `
            <div class="view-controls-content">
                <!-- 排序 -->
                <div class="sort-controls">
                    <span class="sort-label">排序:</span>
                    <div class="sort-options">
                        ${this.state.sortOptions.map(option => `
                            <button class="sort-option ${this.options.sortBy === option.id ? 'active' : ''} ${this.options.sortOrder}"
                                    data-sort="${option.id}"
                                    title="${option.label}">
                                <i class="fas ${option.icon}"></i>
                                <span>${option.label}</span>
                                ${this.options.sortBy === option.id ? `
                                    <i class="fas fa-${this.options.sortOrder === 'desc' ? 'sort-down' : 'sort-up'}"></i>
                                ` : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <!-- 视图模式 -->
                <div class="view-mode-controls">
                    <button class="view-mode-btn ${this.options.viewMode === 'grid' ? 'active' : ''}" 
                            data-mode="grid" 
                            title="网格视图">
                        <i class="fas fa-th-large"></i>
                    </button>
                    <button class="view-mode-btn ${this.options.viewMode === 'list' ? 'active' : ''}" 
                            data-mode="list" 
                            title="列表视图">
                        <i class="fas fa-list"></i>
                    </button>
                    <button class="view-mode-btn ${this.options.viewMode === 'compact' ? 'active' : ''}" 
                            data-mode="compact" 
                            title="紧凑视图">
                        <i class="fas fa-bars"></i>
                    </button>
                </div>
                
                <!-- 显示设置 -->
                <div class="display-settings">
                    <button class="display-settings-btn" title="显示设置">
                        <i class="fas fa-sliders-h"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取笔记列表模板
     */
    getNotesListTemplate() {
        if (this.state.filteredNotes.length === 0) {
            return '';
        }
        
        const notes = this.getCurrentPageNotes();
        
        switch (this.options.viewMode) {
            case 'grid':
                return this.getGridViewTemplate(notes);
            case 'list':
                return this.getListViewTemplate(notes);
            case 'compact':
                return this.getCompactViewTemplate(notes);
            default:
                return this.getGridViewTemplate(notes);
        }
    }
    
    /**
     * 获取网格视图模板
     */
    getGridViewTemplate(notes) {
        return `
            <div class="notes-grid">
                ${notes.map(note => this.getNoteCardTemplate(note)).join('')}
            </div>
        `;
    }
    
    /**
     * 获取列表视图模板
     */
    getListViewTemplate(notes) {
        return `
            <div class="notes-list">
                ${notes.map(note => this.getNoteListItemTemplate(note)).join('')}
            </div>
        `;
    }
    
    /**
     * 获取紧凑视图模板
     */
    getCompactViewTemplate(notes) {
        return `
            <div class="notes-compact">
                <table class="compact-table">
                    <thead>
                        <tr>
                            ${this.options.enableMultiSelect ? '<th class="select-column"></th>' : ''}
                            <th class="title-column">标题</th>
                            <th class="category-column">分类</th>
                            <th class="tags-column">标签</th>
                            <th class="date-column">更新时间</th>
                            <th class="actions-column">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${notes.map(note => this.getCompactRowTemplate(note)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    /**
     * 获取笔记卡片模板
     */
    getNoteCardTemplate(note) {
        const isSelected = this.state.selectedNotes.has(note.id);
        const previewText = this.getNotePreview(note.content, 100);
        const updateTime = Utils.formatDate(note.updated_at, 'relative');
        
        return `
            <div class="note-card ${isSelected ? 'selected' : ''}" 
                 data-note-id="${note.id}"
                 draggable="${this.options.enableDragDrop}">
                
                <!-- 选择框 -->
                ${this.options.enableMultiSelect ? `
                    <div class="note-selector">
                        <input type="checkbox" 
                               class="note-checkbox" 
                               data-note-id="${note.id}"
                               ${isSelected ? 'checked' : ''}>
                    </div>
                ` : ''}
                
                <!-- 卡片头部 -->
                <div class="card-header">
                    <!-- 加密状态 -->
                    ${note.isEncrypted ? `
                        <div class="card-badge encrypted" title="已加密">
                            <i class="fas fa-lock"></i>
                        </div>
                    ` : ''}
                    
                    <!-- 收藏状态 -->
                    ${note.starred ? `
                        <div class="card-badge starred" title="已收藏">
                            <i class="fas fa-star"></i>
                        </div>
                    ` : ''}
                    
                    <!-- 分类标签 -->
                    ${note.category ? `
                        <div class="card-badge category" style="background-color: ${this.getCategoryColor(note.category)}">
                            ${note.category}
                        </div>
                    ` : ''}
                    
                    <!-- 快速操作 -->
                    <div class="card-actions">
                        <button class="card-action-btn quick-edit" data-note-id="${note.id}" title="快速编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="card-action-btn more-actions" data-note-id="${note.id}" title="更多操作">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>
                
                <!-- 卡片内容 -->
                <div class="card-body">
                    <!-- 标题 -->
                    <h3 class="card-title" title="${note.title}">
                        ${note.title || '未命名笔记'}
                    </h3>
                    
                    <!-- 预览 -->
                    <p class="card-preview">
                        ${previewText}
                    </p>
                    
                    <!-- 标签 -->
                    ${note.tags && note.tags.length > 0 ? `
                        <div class="card-tags">
                            ${note.tags.slice(0, 3).map(tag => `
                                <span class="card-tag">${tag}</span>
                            `).join('')}
                            ${note.tags.length > 3 ? `<span class="card-tag-more">+${note.tags.length - 3}</span>` : ''}
                        </div>
                    ` : ''}
                </div>
                
                <!-- 卡片底部 -->
                <div class="card-footer">
                    <!-- 统计信息 -->
                    <div class="card-stats">
                        <span class="stat-item" title="字数">
                            <i class="fas fa-text-width"></i>
                            <span>${note.word_count || 0}</span>
                        </span>
                        <span class="stat-item" title="更新时间">
                            <i class="fas fa-clock"></i>
                            <span>${updateTime}</span>
                        </span>
                    </div>
                    
                    <!-- 操作按钮 -->
                    <div class="card-footer-actions">
                        <button class="footer-action-btn open-note" data-note-id="${note.id}" title="打开笔记">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                        ${note.isEncrypted ? `
                            <button class="footer-action-btn decrypt-preview" data-note-id="${note.id}" title="解密预览">
                                <i class="fas fa-key"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取笔记列表项模板
     */
    getNoteListItemTemplate(note) {
        const isSelected = this.state.selectedNotes.has(note.id);
        const previewText = this.getNotePreview(note.content, 150);
        const updateTime = Utils.formatDate(note.updated_at, 'relative');
        
        return `
            <div class="note-list-item ${isSelected ? 'selected' : ''}" 
                 data-note-id="${note.id}"
                 draggable="${this.options.enableDragDrop}">
                
                <!-- 选择框 -->
                ${this.options.enableMultiSelect ? `
                    <div class="item-selector">
                        <input type="checkbox" 
                               class="note-checkbox" 
                               data-note-id="${note.id}"
                               ${isSelected ? 'checked' : ''}>
                    </div>
                ` : ''}
                
                <!-- 左侧：图标和状态 -->
                <div class="item-left">
                    <!-- 加密图标 -->
                    ${note.isEncrypted ? `
                        <div class="item-icon encrypted" title="已加密">
                            <i class="fas fa-lock"></i>
                        </div>
                    ` : `
                        <div class="item-icon">
                            <i class="fas fa-file-alt"></i>
                        </div>
                    `}
                    
                    <!-- 收藏按钮 -->
                    <button class="item-star-btn ${note.starred ? 'starred' : ''}" 
                            data-note-id="${note.id}"
                            title="${note.starred ? '取消收藏' : '收藏'}">
                        <i class="fas fa-star"></i>
                    </button>
                </div>
                
                <!-- 中间：内容 -->
                <div class="item-content">
                    <!-- 标题行 -->
                    <div class="item-header">
                        <h3 class="item-title" title="${note.title}">
                            ${note.title || '未命名笔记'}
                        </h3>
                        
                        <!-- 分类标签 -->
                        ${note.category ? `
                            <span class="item-category" style="background-color: ${this.getCategoryColor(note.category)}">
                                ${note.category}
                            </span>
                        ` : ''}
                        
                        <!-- 标签 -->
                        ${note.tags && note.tags.length > 0 ? `
                            <div class="item-tags">
                                ${note.tags.slice(0, 2).map(tag => `
                                    <span class="item-tag">${tag}</span>
                                `).join('')}
                                ${note.tags.length > 2 ? `<span class="item-tag-more">+${note.tags.length - 2}</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- 预览 -->
                    <p class="item-preview" title="${previewText}">
                        ${previewText}
                    </p>
                    
                    <!-- 元数据 -->
                    <div class="item-meta">
                        <span class="meta-item">
                            <i class="fas fa-text-width"></i>
                            <span>${note.word_count || 0} 字</span>
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span>${updateTime}</span>
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>${Utils.formatDate(note.created_at, 'date')}</span>
                        </span>
                    </div>
                </div>
                
                <!-- 右侧：操作 -->
                <div class="item-actions">
                    <button class="item-action-btn open-note" data-note-id="${note.id}" title="打开笔记">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button class="item-action-btn quick-edit" data-note-id="${note.id}" title="快速编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${note.isEncrypted ? `
                        <button class="item-action-btn decrypt-preview" data-note-id="${note.id}" title="解密预览">
                            <i class="fas fa-key"></i>
                        </button>
                    ` : ''}
                    <button class="item-action-btn more-actions" data-note-id="${note.id}" title="更多操作">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取紧凑行模板
     */
    getCompactRowTemplate(note) {
        const isSelected = this.state.selectedNotes.has(note.id);
        const updateTime = Utils.formatDate(note.updated_at, 'relative');
        
        return `
            <tr class="compact-row ${isSelected ? 'selected' : ''}" data-note-id="${note.id}">
                <!-- 选择框 -->
                ${this.options.enableMultiSelect ? `
                    <td class="select-column">
                        <input type="checkbox" 
                               class="note-checkbox" 
                               data-note-id="${note.id}"
                               ${isSelected ? 'checked' : ''}>
                    </td>
                ` : ''}
                
                <!-- 标题 -->
                <td class="title-column">
                    <div class="compact-title">
                        ${note.isEncrypted ? '<i class="fas fa-lock encrypted-icon" title="已加密"></i>' : ''}
                        ${note.starred ? '<i class="fas fa-star starred-icon" title="已收藏"></i>' : ''}
                        <span class="title-text" title="${note.title}">${note.title || '未命名笔记'}</span>
                    </div>
                </td>
                
                <!-- 分类 -->
                <td class="category-column">
                    ${note.category ? `
                        <span class="compact-category">${note.category}</span>
                    ` : '-'}
                </td>
                
                <!-- 标签 -->
                <td class="tags-column">
                    ${note.tags && note.tags.length > 0 ? `
                        <div class="compact-tags">
                            ${note.tags.slice(0, 2).map(tag => `
                                <span class="compact-tag">${tag}</span>
                            `).join('')}
                            ${note.tags.length > 2 ? `<span class="tag-count">+${note.tags.length - 2}</span>` : ''}
                        </div>
                    ` : '-'}
                </td>
                
                <!-- 更新时间 -->
                <td class="date-column">
                    <span class="compact-date" title="${new Date(note.updated_at).toLocaleString()}">
                        ${updateTime}
                    </span>
                </td>
                
                <!-- 操作 -->
                <td class="actions-column">
                    <div class="compact-actions">
                        <button class="compact-action-btn open-note" data-note-id="${note.id}" title="打开">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                        <button class="compact-action-btn more-actions" data-note-id="${note.id}" title="更多">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    /**
     * 获取加载更多模板
     */
    getLoadMoreTemplate() {
        return `
            <div class="load-more-container">
                <button class="load-more-btn" ${this.state.isLoading ? 'disabled' : ''}>
                    ${this.state.isLoading ? `
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>加载中...</span>
                    ` : `
                        <i class="fas fa-redo"></i>
                        <span>加载更多</span>
                    `}
                </button>
            </div>
        `;
    }
    
    /**
     * 获取空状态模板
     */
    getEmptyStateTemplate() {
        const hasSearchQuery = this.state.searchQuery.trim() !== '';
        const hasActiveFilters = this.hasActiveFilters();
        
        if (hasSearchQuery || hasActiveFilters) {
            return `
                <div class="empty-state filtered">
                    <div class="empty-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <h3 class="empty-title">未找到匹配的笔记</h3>
                    <p class="empty-message">
                        当前筛选条件下没有找到笔记，请尝试：
                    </p>
                    <div class="empty-actions">
                        ${hasSearchQuery ? `
                            <button class="empty-action-btn clear-search">
                                清除搜索
                            </button>
                        ` : ''}
                        ${hasActiveFilters ? `
                            <button class="empty-action-btn clear-filters">
                                清除筛选
                            </button>
                        ` : ''}
                        <button class="empty-action-btn new-note">
                            新建笔记
                        </button>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-file-alt"></i>
                </div>
                <h3 class="empty-title">还没有笔记</h3>
                <p class="empty-message">
                    开始创建您的第一个加密笔记吧！
                </p>
                <div class="empty-actions">
                    <button class="empty-action-btn new-note">
                        <i class="fas fa-plus"></i>
                        <span>新建笔记</span>
                    </button>
                    <button class="empty-action-btn import-notes">
                        <i class="fas fa-file-import"></i>
                        <span>导入笔记</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取加载模板
     */
    getLoadingTemplate() {
        return `
            <div class="loading-state">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <p class="loading-text">正在加载笔记...</p>
            </div>
        `;
    }
    
    /**
     * 获取分页模板
     */
    getPaginationTemplate() {
        const { currentPage, totalPages } = this.state;
        const pages = this.getPaginationRange();
        
        return `
            <div class="pagination-container">
                <nav class="pagination" role="navigation">
                    <!-- 上一页 -->
                    <button class="pagination-btn prev ${currentPage === 1 ? 'disabled' : ''}"
                            ${currentPage === 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i>
                        <span>上一页</span>
                    </button>
                    
                    <!-- 页码 -->
                    <div class="pagination-pages">
                        ${pages.map(page => {
                            if (page === '...') {
                                return '<span class="pagination-ellipsis">...</span>';
                            }
                            
                            return `
                                <button class="pagination-page ${page === currentPage ? 'active' : ''}"
                                        data-page="${page}">
                                    ${page}
                                </button>
                            `;
                        }).join('')}
                    </div>
                    
                    <!-- 下一页 -->
                    <button class="pagination-btn next ${currentPage === totalPages ? 'disabled' : ''}"
                            ${currentPage === totalPages ? 'disabled' : ''}>
                        <span>下一页</span>
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    
                    <!-- 跳转 -->
                    <div class="pagination-jump">
                        <span>跳转到</span>
                        <input type="number" 
                               class="jump-input" 
                               min="1" 
                               max="${totalPages}"
                               value="${currentPage}">
                        <button class="jump-btn">跳转</button>
                    </div>
                </nav>
            </div>
        `;
    }
    
    /**
     * 获取当前页的笔记
     */
    getCurrentPageNotes() {
        const startIndex = (this.state.currentPage - 1) * this.options.pageSize;
        const endIndex = startIndex + this.options.pageSize;
        
        return this.state.filteredNotes.slice(startIndex, endIndex);
    }
    
    /**
     * 获取笔记预览
     */
    getNotePreview(content, maxLength = 100) {
        if (!content) return '暂无内容';
        
        // 移除Markdown标记
        let plainText = content
            .replace(/[#*`~\[\]()]/g, '')
            .replace(/\n+/g, ' ')
            .trim();
        
        // 截断
        if (plainText.length > maxLength) {
            plainText = plainText.substring(0, maxLength) + '...';
        }
        
        return plainText || '暂无内容';
    }
    
    /**
     * 获取分类颜色
     */
    getCategoryColor(category) {
        const colors = {
            'work': '#3b82f6',
            'personal': '#8b5cf6',
            'study': '#10b981',
            'default': '#64748b'
        };
        
        return colors[category] || colors.default;
    }
    
    /**
     * 获取分页范围
     */
    getPaginationRange() {
        const { currentPage, totalPages } = this.state;
        const delta = 2;
        const range = [];
        const rangeWithDots = [];
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                range.push(i);
            }
        }
        
        let prev = 0;
        for (const i of range) {
            if (prev) {
                if (i - prev === 2) {
                    rangeWithDots.push(prev + 1);
                } else if (i - prev !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            prev = i;
        }
        
        return rangeWithDots;
    }
    
    /**
     * 检查是否有激活的筛选
     */
    hasActiveFilters() {
        const { filters } = this.state;
        return (
            filters.category !== '' ||
            filters.tags.length > 0 ||
            filters.encrypted !== null ||
            filters.starred !== null ||
            filters.dateRange !== null
        );
    }
    
    /**
     * 缓存DOM元素
     */
    cacheElements() {
        // 搜索相关
        this.searchInput = this.container.querySelector('.search-input');
        this.searchClear = this.container.querySelector('.search-clear');
        this.searchAdvancedBtn = this.container.querySelector('.search-advanced-btn');
        
        // 筛选相关
        this.categoryFilter = this.container.querySelector('.category-filter');
        this.tagsFilter = this.container.querySelector('.tags-filter');
        this.encryptionFilter = this.container.querySelector('.encryption-filter');
        this.starredFilter = this.container.querySelector('.starred-filter');
        this.dateFilter = this.container.querySelector('.date-filter');
        this.filterClearBtn = this.container.querySelector('.filter-clear-btn');
        
        // 工具栏按钮
        this.newNoteBtn = this.container.querySelector('.new-note');
        this.importBtn = this.container.querySelector('.import-notes');
        this.exportBtn = this.container.querySelector('.export-notes');
        this.refreshBtn = this.container.querySelector('.refresh-list');
        this.settingsBtn = this.container.querySelector('.list-settings');
        this.multiSelectToggle = this.container.querySelector('.multi-select-toggle');
        
        // 视图控制
        this.sortOptions = this.container.querySelectorAll('.sort-option');
        this.viewModeBtns = this.container.querySelectorAll('.view-mode-btn');
        
        // 多选工具栏
        this.deleteSelectedBtn = this.container.querySelector('.delete-selected');
        this.cancelSelectionBtn = this.container.querySelector('.cancel-selection');
        
        // 分页
        this.prevPageBtn = this.container.querySelector('.pagination-btn.prev');
        this.nextPageBtn = this.container.querySelector('.pagination-btn.next');
        this.pageBtns = this.container.querySelectorAll('.pagination-page');
        this.jumpInput = this.container.querySelector('.jump-input');
        this.jumpBtn = this.container.querySelector('.jump-btn');
        
        // 加载更多
        this.loadMoreBtn = this.container.querySelector('.load-more-btn');
        
        // 空状态按钮
        this.emptyNewNoteBtn = this.container.querySelector('.empty-state .new-note');
        this.emptyImportBtn = this.container.querySelector('.empty-state .import-notes');
        this.clearSearchBtn = this.container.querySelector('.clear-search');
        this.clearFiltersBtn = this.container.querySelector('.clear-filters');
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 搜索事件
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.applyFilters();
            });
        }
        
        if (this.searchClear) {
            this.searchClear.addEventListener('click', () => this.clearSearch());
        }
        
        if (this.searchAdvancedBtn) {
            this.searchAdvancedBtn.addEventListener('click', () => this.showAdvancedSearch());
        }
        
        // 筛选事件
        if (this.categoryFilter) {
            this.categoryFilter.addEventListener('change', () => this.applyFilters());
        }
        
        if (this.tagsFilter) {
            this.tagsFilter.addEventListener('change', () => this.applyFilters());
        }
        
        if (this.encryptionFilter) {
            this.encryptionFilter.addEventListener('change', () => this.applyFilters());
        }
        
        if (this.starredFilter) {
            this.starredFilter.addEventListener('change', () => this.applyFilters());
        }
        
        if (this.dateFilter) {
            this.dateFilter.addEventListener('change', () => this.applyFilters());
        }
        
        if (this.filterClearBtn) {
            this.filterClearBtn.addEventListener('click', () => this.clearAllFilters());
        }
        
        // 工具栏按钮
        if (this.newNoteBtn) {
            this.newNoteBtn.addEventListener('click', () => this.createNewNote());
        }
        
        if (this.importBtn) {
            this.importBtn.addEventListener('click', () => this.importNotes());
        }
        
        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => this.exportNotes());
        }
        
        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', () => this.refreshData());
        }
        
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => this.showSettings());
        }
        
        if (this.multiSelectToggle) {
            this.multiSelectToggle.addEventListener('click', () => this.toggleMultiSelect());
        }
        
        // 视图控制
        this.sortOptions.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleSortChange(e));
        });
        
        this.viewModeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchViewMode(e.target.dataset.mode));
        });
        
        // 笔记点击事件
        this.container.addEventListener('click', (e) => this.handleNoteClick(e));
        
        // 复选框事件
        this.container.addEventListener('change', (e) => {
            if (e.target.classList.contains('note-checkbox')) {
                this.handleNoteSelection(e.target);
            }
        });
        
        // 分页事件
        if (this.prevPageBtn) {
            this.prevPageBtn.addEventListener('click', () => this.goToPage(this.state.currentPage - 1));
        }
        
        if (this.nextPageBtn) {
            this.nextPageBtn.addEventListener('click', () => this.goToPage(this.state.currentPage + 1));
        }
        
        if (this.jumpBtn) {
            this.jumpBtn.addEventListener('click', () => this.handleJumpToPage());
        }
        
        if (this.jumpInput) {
            this.jumpInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleJumpToPage();
            });
        }
        
        // 加载更多
        if (this.loadMoreBtn) {
            this.loadMoreBtn.addEventListener('click', () => this.loadMore());
        }
        
        // 空状态按钮
        if (this.emptyNewNoteBtn) {
            this.emptyNewNoteBtn.addEventListener('click', () => this.createNewNote());
        }
        
        if (this.emptyImportBtn) {
            this.emptyImportBtn.addEventListener('click', () => this.importNotes());
        }
        
        if (this.clearSearchBtn) {
            this.clearSearchBtn.addEventListener('click', () => this.clearSearch());
        }
        
        if (this.clearFiltersBtn) {
            this.clearFiltersBtn.addEventListener('click', () => this.clearAllFilters());
        }
        
        // 拖放事件
        if (this.options.enableDragDrop) {
            this.setupDragAndDrop();
        }
        
        // 滚动事件
        this.setupScrollHandling();
    }
    
    /**
     * 初始化虚拟滚动
     */
    initVirtualScroll() {
        // 如果需要虚拟滚动，在这里初始化
    }
    
    /**
     * 设置滚动处理
     */
    setupScrollHandling() {
        const container = this.container.querySelector('#notes-container');
        if (!container) return;
        
        this.scrollHandler = () => {
            if (this.shouldLoadMoreOnScroll()) {
                this.loadMore();
            }
        };
        
        container.addEventListener('scroll', this.scrollHandler);
    }
    
    /**
     * 设置拖放
     */
    setupDragAndDrop() {
        const container = this.container.querySelector('#notes-container');
        if (!container) return;
        
        container.addEventListener('dragstart', (e) => this.handleDragStart(e));
        container.addEventListener('dragover', (e) => this.handleDragOver(e));
        container.addEventListener('drop', (e) => this.handleDrop(e));
        container.addEventListener('dragend', (e) => this.handleDragEnd(e));
    }
    
    /**
     * 加载数据
     */
    async loadData(forceRefresh = false) {
        if (this.state.isLoading && !forceRefresh) return;
        
        this.state.isLoading = true;
        this.updateLoadingState();
        
        try {
            let notes = [];
            
            if (Config.isOnline() || forceRefresh) {
                // 从API加载
                const result = await Api.notes.list({
                    page: this.state.currentPage,
                    pageSize: this.options.pageSize,
                    sortBy: this.options.sortBy,
                    sortOrder: this.options.sortOrder,
                    search: this.state.searchQuery,
                    category: this.state.filters.category,
                    tags: this.state.filters.tags,
                    encrypted: this.state.filters.encrypted,
                    starred: this.state.filters.starred
                });
                
                if (result.success) {
                    notes = result.data.notes || [];
                    this.state.totalNotes = result.data.total || notes.length;
                    this.state.totalPages = Math.ceil(this.state.totalNotes / this.options.pageSize);
                    
                    // 保存到本地存储
                    this.saveNotesToLocal(notes);
                }
            } else {
                // 从本地存储加载
                notes = this.loadNotesFromLocal();
                this.state.totalNotes = notes.length;
                this.state.totalPages = Math.ceil(this.state.totalNotes / this.options.pageSize);
            }
            
            // 更新状态
            this.state.notes = notes;
            this.applyFilters(); // 这会更新 filteredNotes
            
            // 更新统计
            this.updateStats();
            
            // 更新UI
            this.updateNotesDisplay();
            
        } catch (error) {
            console.error('[笔记列表] 加载数据失败:', error);
            this.app.showNotification('加载笔记列表失败', 'error');
        } finally {
            this.state.isLoading = false;
            this.state.isRefreshing = false;
            this.updateLoadingState();
        }
    }
    
    /**
     * 保存笔记到本地存储
     */
    saveNotesToLocal(notes) {
        const localNotes = Utils.storage.get('local_notes', {});
        
        notes.forEach(note => {
            localNotes[note.id] = note;
        });
        
        Utils.storage.set('local_notes', localNotes);
    }
    
    /**
     * 从本地存储加载笔记
     */
    loadNotesFromLocal() {
        const localNotes = Utils.storage.get('local_notes', {});
        return Object.values(localNotes);
    }
    
    /**
     * 刷新数据
     */
    async refreshData() {
        this.state.isRefreshing = true;
        this.updateLoadingState();
        
        await this.loadData(true);
        
        this.app.showNotification('列表已刷新', 'success');
    }
    
    /**
     * 加载更多
     */
    async loadMore() {
        if (this.state.isLoading || !this.state.hasMore) return;
        
        this.state.currentPage++;
        this.state.isLoading = true;
        this.updateLoadingState();
        
        try {
            const result = await Api.notes.list({
                page: this.state.currentPage,
                pageSize: this.options.pageSize,
                sortBy: this.options.sortBy,
                sortOrder: this.options.sortOrder
            });
            
            if (result.success) {
                const newNotes = result.data.notes || [];
                this.state.notes = [...this.state.notes, ...newNotes];
                this.state.hasMore = newNotes.length === this.options.pageSize;
                
                this.applyFilters();
                this.updateNotesDisplay();
            }
        } catch (error) {
            console.error('[笔记列表] 加载更多失败:', error);
            this.state.currentPage--; // 回退页码
        } finally {
            this.state.isLoading = false;
            this.updateLoadingState();
        }
    }
    
    /**
     * 更新统计
     */
    updateStats() {
        const stats = {
            total: this.state.notes.length,
            encrypted: 0,
            starred: 0,
            byCategory: {},
            recent: 0
        };
        
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        this.state.notes.forEach(note => {
            if (note.isEncrypted) stats.encrypted++;
            if (note.starred) stats.starred++;
            
            if (note.category) {
                stats.byCategory[note.category] = (stats.byCategory[note.category] || 0) + 1;
            }
            
            if (new Date(note.updated_at) > oneWeekAgo) {
                stats.recent++;
            }
        });
        
        this.state.stats = stats;
        this.updateStatsDisplay();
    }
    
    /**
     * 应用筛选
     */
    applyFilters() {
        let filtered = [...this.state.notes];
        
        // 搜索筛选
        if (this.state.searchQuery) {
            const query = this.state.searchQuery.toLowerCase();
            filtered = filtered.filter(note => 
                note.title?.toLowerCase().includes(query) ||
                note.content?.toLowerCase().includes(query) ||
                note.tags?.some(tag => tag.toLowerCase().includes(query))
            );
        }
        
        // 分类筛选
        if (this.state.filters.category) {
            filtered = filtered.filter(note => note.category === this.state.filters.category);
        }
        
        // 标签筛选
        if (this.state.filters.tags.length > 0) {
            filtered = filtered.filter(note => 
                note.tags && this.state.filters.tags.every(tag => note.tags.includes(tag))
            );
        }
        
        // 加密状态筛选
        if (this.state.filters.encrypted !== null) {
            filtered = filtered.filter(note => note.isEncrypted === this.state.filters.encrypted);
        }
        
        // 收藏状态筛选
        if (this.state.filters.starred !== null) {
            filtered = filtered.filter(note => note.starred === this.state.filters.starred);
        }
        
        // 日期范围筛选
        if (this.state.filters.dateRange) {
            const now = new Date();
            let startDate = new Date();
            
            switch (this.state.filters.dateRange) {
                case 'today':
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(now.getMonth() - 1);
                    break;
            }
            
            filtered = filtered.filter(note => {
                const noteDate = new Date(note.updated_at);
                return noteDate >= startDate;
            });
        }
        
        // 排序
        filtered.sort((a, b) => {
            let aValue = a[this.options.sortBy] || 0;
            let bValue = b[this.options.sortBy] || 0;
            
            if (this.options.sortBy.includes('_at')) {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            }
            
            if (this.options.sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
        
        this.state.filteredNotes = filtered;
        this.state.currentPage = 1;
        this.state.totalPages = Math.ceil(filtered.length / this.options.pageSize);
        
        this.updateNotesDisplay();
        this.updatePagination();
    }
    
    /**
     * 处理搜索输入
     */
    handleSearchInput(event) {
        this.state.searchQuery = event.target.value;
        
        // 防抖
        clearTimeout(this.searchDebounce);
        this.searchDebounce = setTimeout(() => {
            this.applyFilters();
        }, 300);
    }
    
    /**
     * 清除搜索
     */
    clearSearch() {
        this.state.searchQuery = '';
        if (this.searchInput) this.searchInput.value = '';
        this.applyFilters();
    }
    
    /**
     * 显示高级搜索
     */
    showAdvancedSearch() {
        this.app.showNotification('高级搜索功能开发中', 'info');
    }
    
    /**
     * 清除所有筛选
     */
    clearAllFilters() {
        this.state.filters = {
            category: '',
            tags: [],
            encrypted: null,
            starred: null,
            dateRange: null
        };
        
        this.state.searchQuery = '';
        
        // 更新UI
        if (this.searchInput) this.searchInput.value = '';
        if (this.categoryFilter) this.categoryFilter.value = '';
        if (this.tagsFilter) this.tagsFilter.value = '';
        if (this.encryptionFilter) this.encryptionFilter.value = '';
        if (this.starredFilter) this.starredFilter.value = '';
        if (this.dateFilter) this.dateFilter.value = '';
        
        this.applyFilters();
    }
    
    /**
     * 处理排序变化
     */
    handleSortChange(event) {
        const button = event.currentTarget;
        const sortBy = button.dataset.sort;
        
        if (this.options.sortBy === sortBy) {
            // 切换排序方向
            this.options.sortOrder = this.options.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.options.sortBy = sortBy;
            this.options.sortOrder = 'desc'; // 默认降序
        }
        
        // 更新按钮状态
        this.sortOptions.forEach(btn => {
            btn.classList.remove('active', 'asc', 'desc');
            if (btn.dataset.sort === this.options.sortBy) {
                btn.classList.add('active', this.options.sortOrder);
            }
        });
        
        this.applyFilters();
        this.saveConfig();
    }
    
    /**
     * 切换视图模式
     */
    switchViewMode(mode) {
        this.options.viewMode = mode;
        
        // 更新按钮状态
        this.viewModeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // 更新容器类
        const container = this.container.querySelector('#notes-container');
        if (container) {
            container.className = `notes-container ${mode}-view`;
        }
        
        this.updateNotesDisplay();
        this.saveConfig();
    }
    
    /**
     * 切换多选模式
     */
    toggleMultiSelect() {
        this.options.enableMultiSelect = !this.options.enableMultiSelect;
        
        if (this.multiSelectToggle) {
            this.multiSelectToggle.classList.toggle('active', this.options.enableMultiSelect);
        }
        
        // 清除选择
        this.state.selectedNotes.clear();
        
        this.updateNotesDisplay();
        this.saveConfig();
    }
    
    /**
     * 处理笔记点击
     */
    handleNoteClick(event) {
        const target = event.target;
        
        // 检查是否是笔记点击
        const noteCard = target.closest('.note-card, .note-list-item, .compact-row');
        if (noteCard) {
            const noteId = noteCard.dataset.noteId;
            if (noteId) {
                this.openNote(noteId);
            }
            return;
        }
        
        // 检查操作按钮
        const actionBtn = target.closest('.open-note, .quick-edit, .more-actions');
        if (actionBtn) {
            const noteId = actionBtn.dataset.noteId;
            const action = actionBtn.classList.contains('open-note') ? 'open' :
                          actionBtn.classList.contains('quick-edit') ? 'edit' : 'more';
            
            if (noteId) {
                this.handleNoteAction(noteId, action);
            }
            event.stopPropagation();
            return;
        }
    }
    
    /**
     * 处理笔记选择
     */
    handleNoteSelection(checkbox) {
        const noteId = checkbox.dataset.noteId;
        
        if (checkbox.checked) {
            this.state.selectedNotes.add(noteId);
        } else {
            this.state.selectedNotes.delete(noteId);
        }
        
        this.updateMultiSelectToolbar();
    }
    
    /**
     * 打开笔记
     */
    openNote(noteId) {
        this.app.triggerEvent('note:open', { id: noteId });
    }
    
    /**
     * 处理笔记操作
     */
    handleNoteAction(noteId, action) {
        switch (action) {
            case 'open':
                this.openNote(noteId);
                break;
            case 'edit':
                this.app.triggerEvent('note:edit', { id: noteId });
                break;
            case 'more':
                this.showNoteContextMenu(noteId);
                break;
        }
    }
    
    /**
     * 显示笔记上下文菜单
     */
    showNoteContextMenu(noteId) {
        // 这里可以显示一个上下文菜单
        console.log(`显示笔记 ${noteId} 的上下文菜单`);
    }
    
    /**
     * 创建新笔记
     */
    createNewNote() {
        this.app.triggerEvent('note:new', {});
    }
    
    /**
     * 导入笔记
     */
    importNotes() {
        this.app.showNotification('导入功能开发中', 'info');
    }
    
    /**
     * 导出笔记
     */
    exportNotes() {
        this.app.showNotification('导出功能开发中', 'info');
    }
    
    /**
     * 显示设置
     */
    showSettings() {
        this.app.showNotification('列表设置功能开发中', 'info');
    }
    
    /**
     * 转到指定页
     */
    goToPage(page) {
        if (page < 1 || page > this.state.totalPages || page === this.state.currentPage) {
            return;
        }
        
        this.state.currentPage = page;
        this.applyFilters();
        this.updatePagination();
        
        // 滚动到顶部
        const container = this.container.querySelector('#notes-container');
        if (container) {
            container.scrollTop = 0;
        }
    }
    
    /**
     * 处理跳转页面
     */
    handleJumpToPage() {
        if (!this.jumpInput) return;
        
        const page = parseInt(this.jumpInput.value);
        if (page >= 1 && page <= this.state.totalPages) {
            this.goToPage(page);
        }
    }
    
    /**
     * 开始自动刷新
     */
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && Config.isOnline()) {
                this.refreshData();
            }
        }, this.options.autoRefreshInterval);
    }
    
    /**
     * 处理拖放事件
     */
    handleDragStart(event) {
        const noteCard = event.target.closest('[data-note-id]');
        if (!noteCard) return;
        
        const noteId = noteCard.dataset.noteId;
        if (noteId) {
            event.dataTransfer.setData('text/plain', noteId);
            event.dataTransfer.effectAllowed = 'move';
            
            noteCard.classList.add('dragging');
        }
    }
    
    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }
    
    async handleDrop(event) {
        event.preventDefault();
        
        const noteId = event.dataTransfer.getData('text/plain');
        const dropTarget = event.target.closest('[data-note-id]');
        
        if (noteId && dropTarget) {
            const targetNoteId = dropTarget.dataset.noteId;
            // 这里可以实现笔记重新排序逻辑
            console.log(`将笔记 ${noteId} 移动到笔记 ${targetNoteId} 附近`);
        }
    }
    
    handleDragEnd(event) {
        const noteCard = event.target.closest('[data-note-id]');
        if (noteCard) {
            noteCard.classList.remove('dragging');
        }
    }
    
    /**
     * 处理键盘事件
     */
    handleKeydown(event) {
        // 刷新 F5
        if (event.key === 'F5') {
            event.preventDefault();
            this.refreshData();
        }
        
        // 新建笔记 Ctrl+N
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            this.createNewNote();
        }
        
        // 搜索 Ctrl+F
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            if (this.searchInput) {
                this.searchInput.focus();
                this.searchInput.select();
            }
        }
        
        // 多选模式 Ctrl+Shift+M
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'M') {
            event.preventDefault();
            this.toggleMultiSelect();
        }
        
        // 全选 Ctrl+A
        if ((event.ctrlKey || event.metaKey) && event.key === 'a' && this.options.enableMultiSelect) {
            event.preventDefault();
            this.selectAllNotes();
        }
        
        // 退出键取消选择
        if (event.key === 'Escape') {
            this.state.selectedNotes.clear();
            this.updateMultiSelectToolbar();
            this.updateNotesDisplay();
        }
    }
    
    /**
     * 全选笔记
     */
    selectAllNotes() {
        this.state.filteredNotes.forEach(note => {
            this.state.selectedNotes.add(note.id);
        });
        
        this.updateMultiSelectToolbar();
        this.updateNotesDisplay();
    }
    
    /**
     * 处理笔记创建事件
     */
    handleNoteCreated(detail) {
        if (detail.note) {
            this.state.notes.unshift(detail.note);
            this.applyFilters();
            this.updateStats();
        }
    }
    
    /**
     * 处理笔记更新事件
     */
    handleNoteUpdated(detail) {
        if (detail.note) {
            const index = this.state.notes.findIndex(n => n.id === detail.note.id);
            if (index !== -1) {
                this.state.notes[index] = { ...this.state.notes[index], ...detail.note };
                this.applyFilters();
                this.updateStats();
            }
        }
    }
    
    /**
     * 处理笔记删除事件
     */
    handleNoteDeleted(detail) {
        if (detail.noteId) {
            this.state.notes = this.state.notes.filter(n => n.id !== detail.noteId);
            this.state.selectedNotes.delete(detail.noteId);
            this.applyFilters();
            this.updateStats();
        }
    }
    
    /**
     * 处理笔记保存事件
     */
    handleNoteSaved(detail) {
        if (detail.note) {
            const index = this.state.notes.findIndex(n => n.id === detail.note.id);
            if (index !== -1) {
                this.state.notes[index] = detail.note;
            } else {
                this.state.notes.unshift(detail.note);
            }
            
            this.applyFilters();
            this.updateStats();
        }
    }
    
    /**
     * 处理同步完成事件
     */
    handleSyncComplete() {
        this.refreshData();
    }
    
    /**
     * 处理在线状态
     */
    handleOnline() {
        this.refreshData();
    }
    
    handleOffline() {
        // 离线模式不需要特殊处理
    }
    
    /**
     * 更新加载状态
     */
    updateLoadingState() {
        if (this.refreshBtn) {
            const icon = this.refreshBtn.querySelector('i');
            if (this.state.isRefreshing) {
                icon.className = 'fas fa-spinner fa-spin';
                this.refreshBtn.classList.add('refreshing');
            } else {
                icon.className = 'fas fa-sync-alt';
                this.refreshBtn.classList.remove('refreshing');
            }
        }
        
        if (this.loadMoreBtn) {
            this.loadMoreBtn.disabled = this.state.isLoading;
        }
    }
    
    /**
     * 更新笔记显示
     */
    updateNotesDisplay() {
        const container = this.container.querySelector('#notes-container');
        if (!container) return;
        
        // 更新列表内容
        const notesList = this.getNotesListTemplate();
        const notesContainer = container.querySelector('.notes-grid, .notes-list, .notes-compact');
        
        if (notesContainer) {
            notesContainer.innerHTML = notesList;
        } else {
            const viewClass = this.options.viewMode === 'grid' ? 'notes-grid' :
                             this.options.viewMode === 'list' ? 'notes-list' : 'notes-compact';
            
            container.innerHTML = `
                <div class="${viewClass}">
                    ${notesList}
                </div>
            `;
        }
        
        // 更新多选工具栏
        this.updateMultiSelectToolbar();
        
        // 更新空状态
        this.updateEmptyState();
    }
    
    /**
     * 更新统计显示
     */
    updateStatsDisplay() {
        const statsContainer = this.container.querySelector('.list-stats');
        if (statsContainer) {
            statsContainer.innerHTML = this.getStatsTemplate();
        }
    }
    
    /**
     * 更新多选工具栏
     */
    updateMultiSelectToolbar() {
        const toolbar = this.container.querySelector('.multi-select-toolbar');
        const newToolbar = this.getMultiSelectToolbar();
        
        if (newToolbar && this.state.selectedNotes.size > 0) {
            if (toolbar) {
                toolbar.innerHTML = newToolbar;
            } else {
                const mainContainer = this.container.querySelector('.list-main');
                if (mainContainer) {
                    mainContainer.insertAdjacentHTML('afterbegin', newToolbar);
                }
            }
        } else if (toolbar) {
            toolbar.remove();
        }
    }
    
    /**
     * 更新空状态
     */
    updateEmptyState() {
        const emptyState = this.container.querySelector('.empty-state');
        const notesContainer = this.container.querySelector('#notes-container');
        
        if (this.state.filteredNotes.length === 0 && !this.state.isLoading) {
            const newEmptyState = this.getEmptyStateTemplate();
            
            if (emptyState) {
                emptyState.outerHTML = newEmptyState;
            } else if (notesContainer) {
                notesContainer.insertAdjacentHTML('beforeend', newEmptyState);
            }
        } else if (emptyState) {
            emptyState.remove();
        }
    }
    
    /**
     * 更新分页
     */
    updatePagination() {
        const paginationContainer = this.container.querySelector('.pagination-container');
        const newPagination = this.getPaginationTemplate();
        
        if (newPagination) {
            if (paginationContainer) {
                paginationContainer.outerHTML = newPagination;
            } else {
                const mainContainer = this.container.querySelector('.list-main');
                if (mainContainer) {
                    mainContainer.insertAdjacentHTML('beforeend', newPagination);
                }
            }
        } else if (paginationContainer) {
            paginationContainer.remove();
        }
    }
    
    /**
     * 保存配置
     */
    saveConfig() {
        Utils.storage.set('note_list_config', this.options);
    }
    
    /**
     * 检查是否应该滚动加载更多
     */
    shouldLoadMoreOnScroll() {
        if (!this.state.hasMore || this.state.isLoading) return false;
        
        const container = this.container.querySelector('#notes-container');
        if (!container) return false;
        
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        
        return scrollTop + clientHeight >= scrollHeight - 100;
    }
    
    /**
     * 页面显示时的回调
     */
    onShow() {
        console.log('[笔记列表] 组件显示');
        
        // 恢复自动刷新
        if (this.options.autoRefresh) {
            this.startAutoRefresh();
        }
        
        // 刷新数据
        this.refreshData();
    }
    
    /**
     * 页面隐藏时的回调
     */
    onHide() {
        console.log('[笔记列表] 组件隐藏');
        
        // 停止自动刷新
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        // 停止滚动监听
        if (this.scrollHandler) {
            const container = this.container.querySelector('#notes-container');
            if (container) {
                container.removeEventListener('scroll', this.scrollHandler);
            }
        }
        
        // 保存配置
        this.saveConfig();
    }
    
    /**
     * 获取当前状态
     */
    getState() {
        return {
            notes: this.state.notes,
            filteredNotes: this.state.filteredNotes,
            selectedNotes: Array.from(this.state.selectedNotes),
            searchQuery: this.state.searchQuery,
            filters: this.state.filters,
            currentPage: this.state.currentPage,
            totalPages: this.state.totalPages,
            totalNotes: this.state.totalNotes,
            stats: this.state.stats
        };
    }
    
    /**
     * 设置笔记数据
     */
    setNotesData(notes) {
        this.state.notes = notes;
        this.applyFilters();
        this.updateStats();
    }
}
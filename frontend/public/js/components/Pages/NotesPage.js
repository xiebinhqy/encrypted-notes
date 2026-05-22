/**
 * 笔记列表页面组件
 * 显示所有笔记的列表，支持搜索、筛选、排序、多种视图模式和批量操作
 */

import Utils from '../../core/utils.js';
import Config from '../../config.js';
import Api from '../../api/index.js';
import OfflineManager from '../../core/offline.js';
import { NoteList } from '../Editor/NoteList.js';
import { Modal } from '../Modals/modals.js';
import { NoteModal } from '../Modals/modals.js';
import { EmptyStateUtil } from '../Common/EmptyState.js';
import { Notify } from '../Common/Notification.js';
import { Loader } from '../Common/Loading.js';

export class NotesPage {
    constructor(app, options = {}) {
        this.app = app;
        this.options = {
            id: 'notes-page',
            title: '所有笔记',
            icon: 'fas fa-sticky-note',
            defaultView: 'list', // 'list', 'grid', 'compact'
            defaultSort: 'updated', // 'created', 'updated', 'title', 'category'
            defaultSortOrder: 'desc', // 'asc', 'desc'
            itemsPerPage: 20,
            enableSearch: true,
            enableFilters: true,
            enableSort: true,
            enableBulkActions: true,
            enableTags: true,
            enableCategories: true,
            showStats: true,
            autoRefresh: true,
            refreshInterval: 30000, // 30秒
            classes: {
                container: '',
                header: '',
                toolbar: '',
                content: '',
                sidebar: '',
                stats: ''
            },
            onNoteClick: null,
            onNoteCreate: null,
            onNoteUpdate: null,
            onNoteDelete: null,
            onBulkAction: null,
            ...options
        };
        
        this.state = {
            notes: [],
            filteredNotes: [],
            categories: [],
            tags: [],
            isLoading: true,
            isRefreshing: false,
            searchQuery: '',
            activeFilters: {
                category: null,
                tag: null,
                starred: false,
                encrypted: null,
                dateRange: null
            },
            sortBy: this.options.defaultSort,
            sortOrder: this.options.defaultSortOrder,
            viewMode: this.options.defaultView,
            selectedNotes: new Set(),
            currentPage: 1,
            totalPages: 1,
            stats: {
                total: 0,
                starred: 0,
                encrypted: 0,
                byCategory: {},
                byTag: {}
            }
        };
        
        this.container = null;
        this.noteList = null;
        this.searchInput = null;
        this.emptyState = null;
        this.refreshInterval = null;
        
        this.init();
    }
    
    /**
     * 初始化笔记页面
     */
    init() {
        console.log('[笔记页面] 初始化完成');
    }
    
    /**
     * 渲染页面
     */
    async render(container) {
        this.container = container;
        
        // 显示加载状态
        container.innerHTML = this.getLoadingTemplate();
        
        try {
            // 加载初始数据
            await this.loadInitialData();
            
            // 渲染页面结构
            container.innerHTML = this.getTemplate();
            
            // 缓存DOM元素
            this.cacheElements();
            
            // 初始化组件
            await this.initComponents();
            
            // 绑定事件
            this.bindEvents();
            
            // 开始自动刷新
            if (this.options.autoRefresh) {
                this.startAutoRefresh();
            }
            
            console.log('[笔记页面] 渲染完成');
            
        } catch (error) {
            console.error('[笔记页面] 渲染失败:', error);
            this.showError('加载笔记失败', error.message);
        }
    }
    
    /**
     * 获取加载模板
     */
    getLoadingTemplate() {
        return `
            <div class="notes-page-loading">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="loading-text">加载笔记中...</div>
            </div>
        `;
    }
    
    /**
     * 获取页面模板
     */
    getTemplate() {
        return `
            <div class="notes-page ${this.options.classes.container || ''}">
                <!-- 页面头部 -->
                <div class="notes-header ${this.options.classes.header || ''}">
                    <div class="header-left">
                        <h1 class="page-title">
                            <i class="${this.options.icon}"></i>
                            ${this.options.title}
                        </h1>
                        
                        <!-- 新建笔记按钮 -->
                        <button class="btn btn-primary btn-new-note">
                            <i class="fas fa-plus"></i>
                            新建笔记
                        </button>
                    </div>
                    
                    <div class="header-right">
                        <!-- 批量操作 -->
                        ${this.options.enableBulkActions ? this.getBulkActionsTemplate() : ''}
                        
                        <!-- 统计数据 -->
                        ${this.options.showStats ? this.getStatsTemplate() : ''}
                    </div>
                </div>
                
                <!-- 工具栏 -->
                <div class="notes-toolbar ${this.options.classes.toolbar || ''}">
                    <div class="toolbar-left">
                        <!-- 搜索框 -->
                        ${this.options.enableSearch ? this.getSearchTemplate() : ''}
                        
                        <!-- 筛选按钮 -->
                        ${this.options.enableFilters ? this.getFilterButtonsTemplate() : ''}
                    </div>
                    
                    <div class="toolbar-right">
                        <!-- 排序选项 -->
                        ${this.options.enableSort ? this.getSortTemplate() : ''}
                        
                        <!-- 视图切换 -->
                        <div class="view-toggle">
                            <button class="view-btn ${this.state.viewMode === 'list' ? 'active' : ''}" 
                                    data-view="list" 
                                    title="列表视图">
                                <i class="fas fa-list"></i>
                            </button>
                            <button class="view-btn ${this.state.viewMode === 'grid' ? 'active' : ''}" 
                                    data-view="grid" 
                                    title="网格视图">
                                <i class="fas fa-th"></i>
                            </button>
                            <button class="view-btn ${this.state.viewMode === 'compact' ? 'active' : ''}" 
                                    data-view="compact" 
                                    title="紧凑视图">
                                <i class="fas fa-grip-lines"></i>
                            </button>
                        </div>
                        
                        <!-- 刷新按钮 -->
                        <button class="btn btn-icon btn-refresh" title="刷新">
                            <i class="fas fa-sync-alt ${this.state.isRefreshing ? 'fa-spin' : ''}"></i>
                        </button>
                    </div>
                </div>
                
                <!-- 筛选面板 -->
                ${this.options.enableFilters ? this.getFiltersPanelTemplate() : ''}
                
                <!-- 页面主体 -->
                <div class="notes-body">
                    <!-- 侧边栏 -->
                    ${this.options.enableFilters || this.options.enableCategories ? this.getSidebarTemplate() : ''}
                    
                    <!-- 内容区域 -->
                    <div class="notes-content ${this.options.classes.content || ''}">
                        <!-- 笔记列表容器 -->
                        <div class="notes-list-container"></div>
                        
                        <!-- 分页 -->
                        ${this.state.totalPages > 1 ? this.getPaginationTemplate() : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取批量操作模板
     */
    getBulkActionsTemplate() {
        const selectedCount = this.state.selectedNotes.size;
        
        if (selectedCount === 0) {
            return '';
        }
        
        return `
            <div class="bulk-actions">
                <span class="selected-count">已选择 ${selectedCount} 项</span>
                <div class="bulk-buttons">
                    <button class="btn btn-secondary btn-bulk-star" title="标记星标">
                        <i class="fas fa-star"></i>
                    </button>
                    <button class="btn btn-secondary btn-bulk-category" title="移动分类">
                        <i class="fas fa-folder"></i>
                    </button>
                    <button class="btn btn-secondary btn-bulk-tag" title="添加标签">
                        <i class="fas fa-tag"></i>
                    </button>
                    <button class="btn btn-danger btn-bulk-delete" title="删除选中">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-icon btn-bulk-clear" title="取消选择">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取统计模板
     */
    getStatsTemplate() {
        return `
            <div class="notes-stats ${this.options.classes.stats || ''}">
                <div class="stat-item">
                    <i class="fas fa-sticky-note"></i>
                    <span class="stat-value">${this.state.stats.total}</span>
                    <span class="stat-label">笔记</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-star"></i>
                    <span class="stat-value">${this.state.stats.starred}</span>
                    <span class="stat-label">星标</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-lock"></i>
                    <span class="stat-value">${this.state.stats.encrypted}</span>
                    <span class="stat-label">加密</span>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取搜索模板
     */
    getSearchTemplate() {
        return `
            <div class="search-box">
                <div class="search-icon">
                    <i class="fas fa-search"></i>
                </div>
                <input type="search" 
                       class="search-input" 
                       placeholder="搜索笔记..."
                       value="${Utils.escapeHtml(this.state.searchQuery)}">
                ${this.state.searchQuery ? `
                    <button class="search-clear" title="清除搜索">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 获取筛选按钮模板
     */
    getFilterButtonsTemplate() {
        const activeFilters = Object.values(this.state.activeFilters).filter(f => f !== null).length;
        
        return `
            <div class="filter-buttons">
                <button class="btn btn-secondary btn-toggle-filters ${activeFilters > 0 ? 'active' : ''}">
                    <i class="fas fa-filter"></i>
                    筛选
                    ${activeFilters > 0 ? `<span class="filter-count">${activeFilters}</span>` : ''}
                </button>
                
                ${this.state.activeFilters.category ? `
                    <button class="btn btn-filter-tag" data-filter="category">
                        ${this.state.activeFilters.category}
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
                
                ${this.state.activeFilters.tag ? `
                    <button class="btn btn-filter-tag" data-filter="tag">
                        ${this.state.activeFilters.tag}
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
                
                ${this.state.activeFilters.starred ? `
                    <button class="btn btn-filter-tag" data-filter="starred">
                        <i class="fas fa-star"></i>
                        星标
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
                
                ${this.state.activeFilters.encrypted !== null ? `
                    <button class="btn btn-filter-tag" data-filter="encrypted">
                        <i class="fas fa-lock"></i>
                        ${this.state.activeFilters.encrypted ? '加密' : '未加密'}
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 获取排序模板
     */
    getSortTemplate() {
        return `
            <div class="sort-options">
                <select class="form-control sort-select">
                    <option value="updated_desc" ${this.state.sortBy === 'updated' && this.state.sortOrder === 'desc' ? 'selected' : ''}>
                        最近更新
                    </option>
                    <option value="created_desc" ${this.state.sortBy === 'created' && this.state.sortOrder === 'desc' ? 'selected' : ''}>
                        最近创建
                    </option>
                    <option value="title_asc" ${this.state.sortBy === 'title' && this.state.sortOrder === 'asc' ? 'selected' : ''}>
                        标题 A-Z
                    </option>
                    <option value="title_desc" ${this.state.sortBy === 'title' && this.state.sortOrder === 'desc' ? 'selected' : ''}>
                        标题 Z-A
                    </option>
                    <option value="category_asc" ${this.state.sortBy === 'category' && this.state.sortOrder === 'asc' ? 'selected' : ''}>
                        分类
                    </option>
                </select>
            </div>
        `;
    }
    
    /**
     * 获取筛选面板模板
     */
    getFiltersPanelTemplate() {
        return `
            <div class="filters-panel" style="display: none;">
                <div class="filters-header">
                    <h3>筛选笔记</h3>
                    <button class="btn btn-icon btn-close-filters">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="filters-content">
                    <!-- 分类筛选 -->
                    <div class="filter-group">
                        <h4 class="filter-title">分类</h4>
                        <div class="filter-options">
                            <button class="filter-option ${!this.state.activeFilters.category ? 'active' : ''}" 
                                    data-filter="category" 
                                    data-value="">
                                全部
                            </button>
                            ${this.state.categories.map(category => `
                                <button class="filter-option ${this.state.activeFilters.category === category.id ? 'active' : ''}" 
                                        data-filter="category" 
                                        data-value="${category.id}">
                                    ${category.name}
                                    <span class="option-count">${this.state.stats.byCategory[category.id] || 0}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- 标签筛选 -->
                    ${this.options.enableTags ? `
                        <div class="filter-group">
                            <h4 class="filter-title">标签</h4>
                            <div class="filter-options tags">
                                <button class="filter-option ${!this.state.activeFilters.tag ? 'active' : ''}" 
                                        data-filter="tag" 
                                        data-value="">
                                    全部
                                </button>
                                ${this.state.tags.map(tag => `
                                    <button class="filter-option ${this.state.activeFilters.tag === tag ? 'active' : ''}" 
                                            data-filter="tag" 
                                            data-value="${tag}">
                                        ${tag}
                                        <span class="option-count">${this.state.stats.byTag[tag] || 0}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- 星标筛选 -->
                    <div class="filter-group">
                        <h4 class="filter-title">星标</h4>
                        <div class="filter-options">
                            <button class="filter-option ${this.state.activeFilters.starred === false ? 'active' : ''}" 
                                    data-filter="starred" 
                                    data-value="false">
                                全部
                            </button>
                            <button class="filter-option ${this.state.activeFilters.starred === true ? 'active' : ''}" 
                                    data-filter="starred" 
                                    data-value="true">
                                仅星标
                            </button>
                        </div>
                    </div>
                    
                    <!-- 加密筛选 -->
                    <div class="filter-group">
                        <h4 class="filter-title">加密</h4>
                        <div class="filter-options">
                            <button class="filter-option ${this.state.activeFilters.encrypted === null ? 'active' : ''}" 
                                    data-filter="encrypted" 
                                    data-value="">
                                全部
                            </button>
                            <button class="filter-option ${this.state.activeFilters.encrypted === true ? 'active' : ''}" 
                                    data-filter="encrypted" 
                                    data-value="true">
                                仅加密
                            </button>
                            <button class="filter-option ${this.state.activeFilters.encrypted === false ? 'active' : ''}" 
                                    data-filter="encrypted" 
                                    data-value="false">
                                未加密
                            </button>
                        </div>
                    </div>
                    
                    <!-- 日期范围 -->
                    <div class="filter-group">
                        <h4 class="filter-title">日期范围</h4>
                        <div class="date-range">
                            <div class="form-group">
                                <label>开始日期</label>
                                <input type="date" class="form-control date-start">
                            </div>
                            <div class="form-group">
                                <label>结束日期</label>
                                <input type="date" class="form-control date-end">
                            </div>
                            <button class="btn btn-secondary btn-apply-date">应用</button>
                            <button class="btn btn-text btn-clear-date">清除</button>
                        </div>
                    </div>
                    
                    <!-- 操作按钮 -->
                    <div class="filter-actions">
                        <button class="btn btn-secondary btn-clear-filters">清除所有筛选</button>
                        <button class="btn btn-primary btn-apply-filters">应用筛选</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取侧边栏模板
     */
    getSidebarTemplate() {
        return `
            <div class="notes-sidebar ${this.options.classes.sidebar || ''}">
                <!-- 分类列表 -->
                ${this.options.enableCategories ? `
                    <div class="sidebar-section">
                        <h3 class="sidebar-title">分类</h3>
                        <div class="categories-list">
                            <button class="category-item ${!this.state.activeFilters.category ? 'active' : ''}" 
                                    data-category="">
                                <i class="fas fa-folder"></i>
                                <span class="category-name">所有分类</span>
                                <span class="category-count">${this.state.stats.total}</span>
                            </button>
                            ${this.state.categories.map(category => `
                                <button class="category-item ${this.state.activeFilters.category === category.id ? 'active' : ''}" 
                                        data-category="${category.id}">
                                    <i class="fas fa-folder" style="color: ${category.color || '#6366f1'}"></i>
                                    <span class="category-name">${category.name}</span>
                                    <span class="category-count">${this.state.stats.byCategory[category.id] || 0}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- 标签云 -->
                ${this.options.enableTags && this.state.tags.length > 0 ? `
                    <div class="sidebar-section">
                        <h3 class="sidebar-title">常用标签</h3>
                        <div class="tags-cloud">
                            ${this.state.tags.slice(0, 10).map(tag => `
                                <button class="tag ${this.state.activeFilters.tag === tag ? 'active' : ''}" 
                                        data-tag="${tag}">
                                    ${tag}
                                    <span class="tag-count">${this.state.stats.byTag[tag] || 0}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- 快速操作 -->
                <div class="sidebar-section">
                    <h3 class="sidebar-title">快速操作</h3>
                    <div class="quick-actions">
                        <button class="quick-action" data-action="starred">
                            <i class="fas fa-star"></i>
                            星标笔记
                        </button>
                        <button class="quick-action" data-action="encrypted">
                            <i class="fas fa-lock"></i>
                            加密笔记
                        </button>
                        <button class="quick-action" data-action="recent">
                            <i class="fas fa-clock"></i>
                            最近编辑
                        </button>
                        <button class="quick-action" data-action="trash">
                            <i class="fas fa-trash"></i>
                            回收站
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取分页模板
     */
    getPaginationTemplate() {
        return `
            <div class="notes-pagination">
                <button class="pagination-btn ${this.state.currentPage === 1 ? 'disabled' : ''}" 
                        data-page="1" 
                        title="第一页">
                    <i class="fas fa-angle-double-left"></i>
                </button>
                <button class="pagination-btn ${this.state.currentPage === 1 ? 'disabled' : ''}" 
                        data-page="${this.state.currentPage - 1}" 
                        title="上一页">
                    <i class="fas fa-angle-left"></i>
                </button>
                
                <div class="pagination-pages">
                    ${this.getPageNumbers().map(page => `
                        <button class="pagination-page ${page === this.state.currentPage ? 'active' : ''}" 
                                data-page="${page}">
                            ${page}
                        </button>
                    `).join('')}
                </div>
                
                <button class="pagination-btn ${this.state.currentPage === this.state.totalPages ? 'disabled' : ''}" 
                        data-page="${this.state.currentPage + 1}" 
                        title="下一页">
                    <i class="fas fa-angle-right"></i>
                </button>
                <button class="pagination-btn ${this.state.currentPage === this.state.totalPages ? 'disabled' : ''}" 
                        data-page="${this.state.totalPages}" 
                        title="最后一页">
                    <i class="fas fa-angle-double-right"></i>
                </button>
            </div>
        `;
    }
    
    /**
     * 获取页面数字
     */
    getPageNumbers() {
        const current = this.state.currentPage;
        const total = this.state.totalPages;
        const pages = [];
        
        if (total <= 7) {
            // 显示所有页面
            for (let i = 1; i <= total; i++) {
                pages.push(i);
            }
        } else {
            // 显示部分页面
            if (current <= 4) {
                // 靠近开始
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(total);
            } else if (current >= total - 3) {
                // 靠近结束
                pages.push(1);
                pages.push('...');
                for (let i = total - 4; i <= total; i++) pages.push(i);
            } else {
                // 在中间
                pages.push(1);
                pages.push('...');
                pages.push(current - 1);
                pages.push(current);
                pages.push(current + 1);
                pages.push('...');
                pages.push(total);
            }
        }
        
        return pages;
    }
    
    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.searchInput = this.container.querySelector('.search-input');
        this.notesListContainer = this.container.querySelector('.notes-list-container');
        this.filtersPanel = this.container.querySelector('.filters-panel');
        this.emptyStateContainer = this.container.querySelector('.empty-state-container');
    }
    
    /**
     * 初始化组件
     */
    async initComponents() {
        // 初始化笔记列表
        this.initNoteList();
        
        // 更新空状态
        this.updateEmptyState();
    }
    
    /**
     * 初始化笔记列表
     */
    initNoteList() {
        this.noteList = new NoteList({
            notes: this.state.filteredNotes,
            viewMode: this.state.viewMode,
            selectable: this.options.enableBulkActions,
            onNoteClick: (note) => this.handleNoteClick(note),
            onNoteStar: (note) => this.toggleStar(note),
            onNoteSelect: (noteId, selected) => this.handleNoteSelect(noteId, selected)
        });
        
        this.noteList.renderTo(this.notesListContainer);
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 新建笔记按钮
        const newNoteBtn = this.container.querySelector('.btn-new-note');
        if (newNoteBtn) {
            newNoteBtn.addEventListener('click', () => this.createNewNote());
        }
        
        // 搜索框
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.applySearch();
                }
            });
        }
        
        // 搜索清除按钮
        const searchClear = this.container.querySelector('.search-clear');
        if (searchClear) {
            searchClear.addEventListener('click', () => this.clearSearch());
        }
        
        // 筛选按钮
        const toggleFiltersBtn = this.container.querySelector('.btn-toggle-filters');
        if (toggleFiltersBtn) {
            toggleFiltersBtn.addEventListener('click', () => this.toggleFiltersPanel());
        }
        
        // 关闭筛选面板
        const closeFiltersBtn = this.container.querySelector('.btn-close-filters');
        if (closeFiltersBtn) {
            closeFiltersBtn.addEventListener('click', () => this.closeFiltersPanel());
        }
        
        // 筛选标签移除
        const filterTags = this.container.querySelectorAll('.btn-filter-tag');
        filterTags.forEach(tag => {
            tag.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.clearFilter(filter);
            });
        });
        
        // 排序选择
        const sortSelect = this.container.querySelector('.sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => this.handleSortChange(e));
        }
        
        // 视图切换
        const viewButtons = this.container.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });
        
        // 刷新按钮
        const refreshBtn = this.container.querySelector('.btn-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshNotes());
        }
        
        // 批量操作按钮
        this.bindBulkActions();
        
        // 筛选选项
        this.bindFilterOptions();
        
        // 侧边栏事件
        this.bindSidebarEvents();
        
        // 分页事件
        this.bindPaginationEvents();
        
        // 应用筛选按钮
        const applyFiltersBtn = this.container.querySelector('.btn-apply-filters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        }
        
        // 清除筛选按钮
        const clearFiltersBtn = this.container.querySelector('.btn-clear-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearAllFilters());
        }
        
        // 全局事件监听
        this.setupGlobalListeners();
    }
    
    /**
     * 绑定批量操作
     */
    bindBulkActions() {
        // 批量星标
        const bulkStarBtn = this.container.querySelector('.btn-bulk-star');
        if (bulkStarBtn) {
            bulkStarBtn.addEventListener('click', () => this.bulkStar());
        }
        
        // 批量删除
        const bulkDeleteBtn = this.container.querySelector('.btn-bulk-delete');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => this.bulkDelete());
        }
        
        // 清除选择
        const bulkClearBtn = this.container.querySelector('.btn-bulk-clear');
        if (bulkClearBtn) {
            bulkClearBtn.addEventListener('click', () => this.clearSelection());
        }
    }
    
    /**
     * 绑定筛选选项
     */
    bindFilterOptions() {
        // 分类筛选
        const categoryOptions = this.container.querySelectorAll('[data-filter="category"]');
        categoryOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const value = e.currentTarget.dataset.value;
                this.setFilter('category', value || null);
            });
        });
        
        // 标签筛选
        const tagOptions = this.container.querySelectorAll('[data-filter="tag"]');
        tagOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const value = e.currentTarget.dataset.value;
                this.setFilter('tag', value || null);
            });
        });
        
        // 星标筛选
        const starredOptions = this.container.querySelectorAll('[data-filter="starred"]');
        starredOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const value = e.currentTarget.dataset.value;
                this.setFilter('starred', value === 'true');
            });
        });
        
        // 加密筛选
        const encryptedOptions = this.container.querySelectorAll('[data-filter="encrypted"]');
        encryptedOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const value = e.currentTarget.dataset.value;
                this.setFilter('encrypted', value === '' ? null : value === 'true');
            });
        });
        
        // 日期范围应用
        const applyDateBtn = this.container.querySelector('.btn-apply-date');
        if (applyDateBtn) {
            applyDateBtn.addEventListener('click', () => this.applyDateRange());
        }
        
        // 日期范围清除
        const clearDateBtn = this.container.querySelector('.btn-clear-date');
        if (clearDateBtn) {
            clearDateBtn.addEventListener('click', () => this.clearDateRange());
        }
    }
    
    /**
     * 绑定侧边栏事件
     */
    bindSidebarEvents() {
        // 分类点击
        const categoryItems = this.container.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.setFilter('category', category || null);
            });
        });
        
        // 标签点击
        const tagItems = this.container.querySelectorAll('.tag');
        tagItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const tag = e.currentTarget.dataset.tag;
                this.setFilter('tag', tag || null);
            });
        });
        
        // 快速操作
        const quickActions = this.container.querySelectorAll('.quick-action');
        quickActions.forEach(action => {
            action.addEventListener('click', (e) => {
                const actionType = e.currentTarget.dataset.action;
                this.handleQuickAction(actionType);
            });
        });
    }
    
    /**
     * 绑定分页事件
     */
    bindPaginationEvents() {
        const paginationBtns = this.container.querySelectorAll('.pagination-btn, .pagination-page');
        paginationBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                if (page && page !== '...') {
                    this.goToPage(parseInt(page));
                }
            });
        });
    }
    
    /**
     * 设置全局监听
     */
    setupGlobalListeners() {
        // 笔记创建事件
        document.addEventListener('note:created', (e) => {
            this.handleNoteCreated(e.detail.note);
        });
        
        // 笔记更新事件
        document.addEventListener('note:updated', (e) => {
            this.handleNoteUpdated(e.detail.note);
        });
        
        // 笔记删除事件
        document.addEventListener('note:deleted', (e) => {
            this.handleNoteDeleted(e.detail.noteId);
        });
        
        // 同步完成事件
        document.addEventListener('sync:complete', () => {
            this.refreshNotes();
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }
    
    /**
     * 加载初始数据
     */
    async loadInitialData() {
        this.state.isLoading = true;
        
        try {
            // 并行加载数据
            const [notes, categories] = await Promise.all([
                this.loadNotes(),
                this.loadCategories()
            ]);
            
            this.state.notes = notes;
            this.state.categories = categories;
            
            // 提取标签
            this.extractTags();
            
            // 计算统计
            this.calculateStats();
            
            // 应用当前筛选和排序
            this.applyFiltersAndSort();
            
            this.state.isLoading = false;
            
        } catch (error) {
            this.state.isLoading = false;
            throw error;
        }
    }
    
    /**
     * 加载笔记
     */
    async loadNotes() {
        try {
            if (Config.isOnline()) {
                const response = await Api.notes.getAll();
                if (response.success) {
                    return response.data || [];
                }
            } else {
                // 离线模式：从本地存储加载
                const notes = Utils.storage.get('notes', []);
                return notes;
            }
        } catch (error) {
            console.error('[笔记页面] 加载笔记失败:', error);
            return [];
        }
    }
    
    /**
     * 加载分类
     */
    async loadCategories() {
        try {
            if (Config.isOnline()) {
                const response = await Api.categories.getAll();
                if (response.success) {
                    return response.data || [];
                }
            } else {
                // 离线模式：从本地存储加载
                const categories = Utils.storage.get('categories', []);
                return categories;
            }
        } catch (error) {
            console.error('[笔记页面] 加载分类失败:', error);
            return [];
        }
    }
    
    /**
     * 提取标签
     */
    extractTags() {
        const tagsSet = new Set();
        
        this.state.notes.forEach(note => {
            if (note.tags && Array.isArray(note.tags)) {
                note.tags.forEach(tag => tagsSet.add(tag));
            }
        });
        
        this.state.tags = Array.from(tagsSet).sort();
    }
    
    /**
     * 计算统计
     */
    calculateStats() {
        const stats = {
            total: this.state.notes.length,
            starred: 0,
            encrypted: 0,
            byCategory: {},
            byTag: {}
        };
        
        this.state.notes.forEach(note => {
            // 星标统计
            if (note.starred) {
                stats.starred++;
            }
            
            // 加密统计
            if (note.isEncrypted) {
                stats.encrypted++;
            }
            
            // 分类统计
            if (note.category) {
                stats.byCategory[note.category] = (stats.byCategory[note.category] || 0) + 1;
            }
            
            // 标签统计
            if (note.tags) {
                note.tags.forEach(tag => {
                    stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
                });
            }
        });
        
        this.state.stats = stats;
    }
    
    /**
     * 应用筛选和排序
     */
    applyFiltersAndSort() {
        // 应用筛选
        let filtered = this.state.notes;
        
        // 搜索筛选
        if (this.state.searchQuery) {
            const query = this.state.searchQuery.toLowerCase();
            filtered = filtered.filter(note => 
                note.title.toLowerCase().includes(query) ||
                note.content.toLowerCase().includes(query) ||
                (note.tags && note.tags.some(tag => tag.toLowerCase().includes(query)))
            );
        }
        
        // 分类筛选
        if (this.state.activeFilters.category) {
            filtered = filtered.filter(note => note.category === this.state.activeFilters.category);
        }
        
        // 标签筛选
        if (this.state.activeFilters.tag) {
            filtered = filtered.filter(note => 
                note.tags && note.tags.includes(this.state.activeFilters.tag)
            );
        }
        
        // 星标筛选
        if (this.state.activeFilters.starred !== false) {
            filtered = filtered.filter(note => note.starred === true);
        }
        
        // 加密筛选
        if (this.state.activeFilters.encrypted !== null) {
            filtered = filtered.filter(note => note.isEncrypted === this.state.activeFilters.encrypted);
        }
        
        // 日期范围筛选
        if (this.state.activeFilters.dateRange) {
            const { start, end } = this.state.activeFilters.dateRange;
            filtered = filtered.filter(note => {
                const noteDate = new Date(note.updatedAt || note.createdAt);
                return (!start || noteDate >= start) && (!end || noteDate <= end);
            });
        }
        
        // 应用排序
        filtered.sort((a, b) => {
            let comparison = 0;
            
            switch (this.state.sortBy) {
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'category':
                    comparison = (a.category || '').localeCompare(b.category || '');
                    break;
                case 'created':
                    comparison = new Date(a.createdAt) - new Date(b.createdAt);
                    break;
                case 'updated':
                default:
                    comparison = new Date(a.updatedAt) - new Date(b.updatedAt);
                    break;
            }
            
            return this.state.sortOrder === 'desc' ? -comparison : comparison;
        });
        
        this.state.filteredNotes = filtered;
        
        // 计算分页
        this.calculatePagination();
        
        // 更新笔记列表
        this.updateNoteList();
        
        // 更新统计显示
        this.updateStatsDisplay();
        
        // 更新空状态
        this.updateEmptyState();
    }
    
    /**
     * 计算分页
     */
    calculatePagination() {
        const totalItems = this.state.filteredNotes.length;
        this.state.totalPages = Math.ceil(totalItems / this.options.itemsPerPage);
        
        if (this.state.currentPage > this.state.totalPages) {
            this.state.currentPage = Math.max(1, this.state.totalPages);
        }
    }
    
    /**
     * 更新笔记列表
     */
    updateNoteList() {
        if (!this.noteList) return;
        
        // 获取当前页的笔记
        const startIndex = (this.state.currentPage - 1) * this.options.itemsPerPage;
        const endIndex = startIndex + this.options.itemsPerPage;
        const pageNotes = this.state.filteredNotes.slice(startIndex, endIndex);
        
        // 更新笔记列表
        this.noteList.update({
            notes: pageNotes,
            viewMode: this.state.viewMode
        });
    }
    
    /**
     * 更新统计显示
     */
    updateStatsDisplay() {
        const statsElements = this.container.querySelectorAll('.stat-value');
        if (statsElements.length >= 3) {
            statsElements[0].textContent = this.state.stats.total;
            statsElements[1].textContent = this.state.stats.starred;
            statsElements[2].textContent = this.state.stats.encrypted;
        }
    }
    
    /**
     * 更新空状态
     */
    updateEmptyState() {
        if (this.state.filteredNotes.length === 0) {
            if (!this.emptyState) {
                this.emptyState = EmptyStateUtil.create({
                    type: this.state.searchQuery || Object.values(this.state.activeFilters).some(f => f !== null) ? 
                          'no-results' : 'no-data',
                    title: this.state.searchQuery ? '无搜索结果' : '还没有笔记',
                    message: this.state.searchQuery ? 
                          '尝试不同的搜索词或清除筛选条件' : 
                          '开始创建您的第一个笔记吧！',
                    showActions: true,
                    actions: [
                        {
                            text: '新建笔记',
                            type: 'primary',
                            icon: 'fas fa-plus',
                            action: () => this.createNewNote()
                        },
                        ...(this.state.searchQuery || Object.values(this.state.activeFilters).some(f => f !== null) ? [{
                            text: '清除搜索/筛选',
                            type: 'secondary',
                            icon: 'fas fa-times',
                            action: () => {
                                this.clearSearch();
                                this.clearAllFilters();
                            }
                        }] : [])
                    ]
                });
                
                this.emptyState.renderTo(this.notesListContainer);
            } else {
                this.emptyState.update({
                    type: this.state.searchQuery || Object.values(this.state.activeFilters).some(f => f !== null) ? 
                          'no-results' : 'no-data',
                    title: this.state.searchQuery ? '无搜索结果' : '还没有笔记',
                    message: this.state.searchQuery ? 
                          '尝试不同的搜索词或清除筛选条件' : 
                          '开始创建您的第一个笔记吧！'
                });
            }
        } else if (this.emptyState) {
            this.emptyState.hide();
        }
    }
    
    /**
     * 处理搜索输入
     */
    handleSearchInput(event) {
        this.state.searchQuery = event.target.value;
        
        // 实时搜索（防抖）
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.applySearch();
        }, 300);
    }
    
    /**
     * 应用搜索
     */
    applySearch() {
        this.state.currentPage = 1;
        this.applyFiltersAndSort();
    }
    
    /**
     * 清除搜索
     */
    clearSearch() {
        this.state.searchQuery = '';
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        this.applySearch();
    }
    
    /**
     * 切换筛选面板
     */
    toggleFiltersPanel() {
        if (this.filtersPanel) {
            const isVisible = this.filtersPanel.style.display !== 'none';
            this.filtersPanel.style.display = isVisible ? 'none' : 'block';
        }
    }
    
    /**
     * 关闭筛选面板
     */
    closeFiltersPanel() {
        if (this.filtersPanel) {
            this.filtersPanel.style.display = 'none';
        }
    }
    
    /**
     * 设置筛选
     */
    setFilter(type, value) {
        this.state.activeFilters[type] = value;
        this.state.currentPage = 1;
        this.applyFiltersAndSort();
        this.updateFilterButtons();
    }
    
    /**
     * 清除筛选
     */
    clearFilter(type) {
        this.setFilter(type, null);
    }
    
    /**
     * 应用所有筛选
     */
    applyFilters() {
        this.closeFiltersPanel();
        this.state.currentPage = 1;
        this.applyFiltersAndSort();
        this.updateFilterButtons();
    }
    
    /**
     * 清除所有筛选
     */
    clearAllFilters() {
        this.state.activeFilters = {
            category: null,
            tag: null,
            starred: false,
            encrypted: null,
            dateRange: null
        };
        
        // 清除日期输入
        const dateStart = this.container.querySelector('.date-start');
        const dateEnd = this.container.querySelector('.date-end');
        if (dateStart) dateStart.value = '';
        if (dateEnd) dateEnd.value = '';
        
        this.applyFilters();
    }
    
    /**
     * 应用日期范围
     */
    applyDateRange() {
        const dateStart = this.container.querySelector('.date-start');
        const dateEnd = this.container.querySelector('.date-end');
        
        if (dateStart && dateEnd) {
            const start = dateStart.value ? new Date(dateStart.value) : null;
            const end = dateEnd.value ? new Date(dateEnd.value) : null;
            
            if (start || end) {
                this.state.activeFilters.dateRange = { start, end };
                this.applyFilters();
            }
        }
    }
    
    /**
     * 清除日期范围
     */
    clearDateRange() {
        this.state.activeFilters.dateRange = null;
        const dateStart = this.container.querySelector('.date-start');
        const dateEnd = this.container.querySelector('.date-end');
        if (dateStart) dateStart.value = '';
        if (dateEnd) dateEnd.value = '';
    }
    
    /**
     * 更新筛选按钮
     */
    updateFilterButtons() {
        // 重新渲染筛选按钮区域
        const filterButtonsContainer = this.container.querySelector('.filter-buttons');
        if (filterButtonsContainer) {
            filterButtonsContainer.innerHTML = this.getFilterButtonsTemplate();
            this.bindFilterButtons();
        }
        
        // 更新筛选面板中的选中状态
        this.updateFilterPanelSelection();
    }
    
    /**
     * 绑定筛选按钮
     */
    bindFilterButtons() {
        const filterTags = this.container.querySelectorAll('.btn-filter-tag');
        filterTags.forEach(tag => {
            tag.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.clearFilter(filter);
            });
        });
        
        const toggleFiltersBtn = this.container.querySelector('.btn-toggle-filters');
        if (toggleFiltersBtn) {
            toggleFiltersBtn.addEventListener('click', () => this.toggleFiltersPanel());
        }
    }
    
    /**
     * 更新筛选面板选择状态
     */
    updateFilterPanelSelection() {
        // 更新分类选项
        const categoryOptions = this.container.querySelectorAll('[data-filter="category"]');
        categoryOptions.forEach(option => {
            const isActive = option.dataset.value === (this.state.activeFilters.category || '');
            option.classList.toggle('active', isActive);
        });
        
        // 更新标签选项
        const tagOptions = this.container.querySelectorAll('[data-filter="tag"]');
        tagOptions.forEach(option => {
            const isActive = option.dataset.value === (this.state.activeFilters.tag || '');
            option.classList.toggle('active', isActive);
        });
        
        // 更新星标选项
        const starredOptions = this.container.querySelectorAll('[data-filter="starred"]');
        starredOptions.forEach(option => {
            const isActive = (option.dataset.value === 'true' && this.state.activeFilters.starred === true) ||
                            (option.dataset.value === 'false' && this.state.activeFilters.starred === false);
            option.classList.toggle('active', isActive);
        });
        
        // 更新加密选项
        const encryptedOptions = this.container.querySelectorAll('[data-filter="encrypted"]');
        encryptedOptions.forEach(option => {
            const isActive = (option.dataset.value === '' && this.state.activeFilters.encrypted === null) ||
                            (option.dataset.value === 'true' && this.state.activeFilters.encrypted === true) ||
                            (option.dataset.value === 'false' && this.state.activeFilters.encrypted === false);
            option.classList.toggle('active', isActive);
        });
    }
    
    /**
     * 处理排序变化
     */
    handleSortChange(event) {
        const [sortBy, sortOrder] = event.target.value.split('_');
        this.state.sortBy = sortBy;
        this.state.sortOrder = sortOrder;
        this.applyFiltersAndSort();
    }
    
    /**
     * 切换视图
     */
    switchView(view) {
        this.state.viewMode = view;
        
        // 更新按钮状态
        const viewButtons = this.container.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // 更新笔记列表
        if (this.noteList) {
            this.noteList.update({ viewMode: view });
        }
    }
    
    /**
     * 刷新笔记
     */
    async refreshNotes() {
        if (this.state.isRefreshing) return;
        
        this.state.isRefreshing = true;
        
        // 更新刷新按钮状态
        const refreshBtn = this.container.querySelector('.btn-refresh');
        if (refreshBtn) {
            const icon = refreshBtn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-sync-alt fa-spin';
            }
        }
        
        try {
            await this.loadInitialData();
            Notify.success('笔记已刷新');
        } catch (error) {
            console.error('[笔记页面] 刷新失败:', error);
            Notify.error('刷新失败', error.message);
        } finally {
            this.state.isRefreshing = false;
            
            // 恢复刷新按钮状态
            if (refreshBtn) {
                const icon = refreshBtn.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-sync-alt';
                }
            }
        }
    }
    
    /**
     * 开始自动刷新
     */
    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.refreshNotes();
            }
        }, this.options.refreshInterval);
    }
    
    /**
     * 停止自动刷新
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
    
    /**
     * 处理笔记点击
     */
    handleNoteClick(note) {
        if (this.options.onNoteClick) {
            this.options.onNoteClick(note, this);
        } else {
            // 默认行为：打开笔记编辑器
            this.openNoteEditor(note);
        }
    }
    
    /**
     * 打开笔记编辑器
     */
    openNoteEditor(note) {
        const modal = new NoteModal({
            noteId: note.id,
            noteData: note,
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
     * 创建新笔记
     */
    createNewNote() {
        const modal = new NoteModal({
            noteData: {
                title: '',
                content: '',
                category: '',
                tags: [],
                isEncrypted: this.state.settings?.privacy?.encryptByDefault ?? true
            },
            onSave: (newNote) => {
                this.handleNoteCreated(newNote);
                
                if (this.options.onNoteCreate) {
                    this.options.onNoteCreate(newNote, this);
                }
            }
        });
        
        modal.open();
    }
    
    /**
     * 处理笔记创建
     */
    handleNoteCreated(note) {
        // 添加到笔记列表
        this.state.notes.unshift(note);
        
        // 更新统计
        this.calculateStats();
        
        // 应用筛选和排序
        this.applyFiltersAndSort();
        
        // 触发事件
        document.dispatchEvent(new CustomEvent('note:created', {
            detail: { note }
        }));
    }
    
    /**
     * 处理笔记更新
     */
    handleNoteUpdated(updatedNote) {
        // 更新笔记
        const index = this.state.notes.findIndex(n => n.id === updatedNote.id);
        if (index !== -1) {
            this.state.notes[index] = updatedNote;
        }
        
        // 更新统计
        this.calculateStats();
        
        // 应用筛选和排序
        this.applyFiltersAndSort();
        
        // 触发事件
        document.dispatchEvent(new CustomEvent('note:updated', {
            detail: { note: updatedNote }
        }));
        
        if (this.options.onNoteUpdate) {
            this.options.onNoteUpdate(updatedNote, this);
        }
    }
    
    /**
     * 处理笔记删除
     */
    handleNoteDeleted(noteId) {
        // 从笔记列表中移除
        this.state.notes = this.state.notes.filter(n => n.id !== noteId);
        
        // 从选中中移除
        this.state.selectedNotes.delete(noteId);
        
        // 更新统计
        this.calculateStats();
        
        // 应用筛选和排序
        this.applyFiltersAndSort();
        
        // 触发事件
        document.dispatchEvent(new CustomEvent('note:deleted', {
            detail: { noteId }
        }));
        
        if (this.options.onNoteDelete) {
            this.options.onNoteDelete(noteId, this);
        }
    }
    
    /**
     * 切换星标
     */
    async toggleStar(note) {
        const updatedNote = { ...note, starred: !note.starred };
        
        try {
            if (Config.isOnline()) {
                await Api.notes.update(note.id, updatedNote);
            } else {
                await OfflineManager.addToQueue('update_note', updatedNote);
            }
            
            this.handleNoteUpdated(updatedNote);
            Notify.success(updatedNote.starred ? '已添加到星标' : '已从星标移除');
            
        } catch (error) {
            console.error('[笔记页面] 切换星标失败:', error);
            Notify.error('操作失败', error.message);
        }
    }
    
    /**
     * 处理笔记选择
     */
    handleNoteSelect(noteId, selected) {
        if (selected) {
            this.state.selectedNotes.add(noteId);
        } else {
            this.state.selectedNotes.delete(noteId);
        }
        
        // 更新批量操作区域
        this.updateBulkActions();
    }
    
    /**
     * 更新批量操作区域
     */
    updateBulkActions() {
        const bulkActions = this.container.querySelector('.bulk-actions');
        const selectedCount = this.state.selectedNotes.size;
        
        if (selectedCount > 0) {
            if (!bulkActions) {
                // 插入批量操作区域
                const headerRight = this.container.querySelector('.header-right');
                if (headerRight) {
                    headerRight.insertAdjacentHTML('afterbegin', this.getBulkActionsTemplate());
                    this.bindBulkActions();
                }
            } else {
                // 更新选中数量
                const countElement = bulkActions.querySelector('.selected-count');
                if (countElement) {
                    countElement.textContent = `已选择 ${selectedCount} 项`;
                }
            }
        } else if (bulkActions) {
            // 移除批量操作区域
            bulkActions.remove();
        }
    }
    
    /**
     * 批量星标
     */
    async bulkStar() {
        const noteIds = Array.from(this.state.selectedNotes);
        const loader = Loader.wrap(async () => {
            for (const noteId of noteIds) {
                const note = this.state.notes.find(n => n.id === noteId);
                if (note) {
                    const updatedNote = { ...note, starred: true };
                    
                    if (Config.isOnline()) {
                        await Api.notes.update(noteId, updatedNote);
                    } else {
                        await OfflineManager.addToQueue('update_note', updatedNote);
                    }
                    
                    this.handleNoteUpdated(updatedNote);
                }
            }
            
            this.clearSelection();
            Notify.success(`已为 ${noteIds.length} 个笔记添加星标`);
        }, {
            text: '处理中...',
            successText: '操作完成'
        });
        
        await loader();
    }
    
    /**
     * 批量删除
     */
    async bulkDelete() {
        const noteIds = Array.from(this.state.selectedNotes);
        
        Modal.confirm({
            title: '确认删除',
            message: `确定要删除选中的 ${noteIds.length} 个笔记吗？此操作不可撤销。`,
            confirmText: '删除',
            confirmType: 'danger',
            onConfirm: async () => {
                const loader = Loader.wrap(async () => {
                    for (const noteId of noteIds) {
                        if (Config.isOnline()) {
                            await Api.notes.delete(noteId);
                        } else {
                            await OfflineManager.addToQueue('delete_note', { id: noteId });
                        }
                        
                        this.handleNoteDeleted(noteId);
                    }
                    
                    this.clearSelection();
                    Notify.success(`已删除 ${noteIds.length} 个笔记`);
                }, {
                    text: '删除中...',
                    successText: '删除完成'
                });
                
                await loader();
            }
        });
    }
    
    /**
     * 清除选择
     */
    clearSelection() {
        this.state.selectedNotes.clear();
        this.updateBulkActions();
        
        // 通知笔记列表清除选择
        if (this.noteList) {
            this.noteList.clearSelection();
        }
    }
    
    /**
     * 处理快速操作
     */
    handleQuickAction(action) {
        switch (action) {
            case 'starred':
                this.setFilter('starred', true);
                break;
            case 'encrypted':
                this.setFilter('encrypted', true);
                break;
            case 'recent':
                this.state.sortBy = 'updated';
                this.state.sortOrder = 'desc';
                this.applyFiltersAndSort();
                break;
            case 'trash':
                // 这里可以跳转到回收站页面
                console.log('跳转到回收站');
                break;
        }
    }
    
    /**
     * 转到页面
     */
    goToPage(page) {
        if (page < 1 || page > this.state.totalPages || page === this.state.currentPage) {
            return;
        }
        
        this.state.currentPage = page;
        this.updateNoteList();
        this.updatePagination();
    }
    
    /**
     * 更新分页
     */
    updatePagination() {
        const pagination = this.container.querySelector('.notes-pagination');
        if (pagination) {
            pagination.innerHTML = this.getPaginationTemplate();
            this.bindPaginationEvents();
        }
    }
    
    /**
     * 处理键盘快捷键
     */
    handleKeyboardShortcuts(event) {
        // 仅在当前页面激活时处理
        if (!this.container || !this.container.parentNode) return;
        
        // 忽略输入框中的按键
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (event.key) {
            case 'n':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.createNewNote();
                }
                break;
                
            case 'f':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    if (this.searchInput) {
                        this.searchInput.focus();
                        this.searchInput.select();
                    }
                }
                break;
                
            case 'r':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.refreshNotes();
                }
                break;
                
            case 'Escape':
                this.clearSelection();
                this.clearSearch();
                break;
        }
    }
    
    /**
     * 显示错误
     */
    showError(title, message) {
        this.container.innerHTML = `
            <div class="notes-page-error">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h2>${title}</h2>
                <p>${message}</p>
                <button class="btn btn-primary btn-retry">重试</button>
            </div>
        `;
        
        const retryBtn = this.container.querySelector('.btn-retry');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.render(this.container));
        }
    }
    
    /**
     * 页面显示时的回调
     */
    onShow() {
        console.log('[笔记页面] 页面显示');
        
        // 开始自动刷新
        if (this.options.autoRefresh) {
            this.startAutoRefresh();
        }
        
        // 刷新数据
        this.refreshNotes();
    }
    
    /**
     * 页面隐藏时的回调
     */
    onHide() {
        console.log('[笔记页面] 页面隐藏');
        
        // 停止自动刷新
        this.stopAutoRefresh();
        
        // 清除选择
        this.clearSelection();
    }
    
    /**
     * 获取当前状态
     */
    getState() {
        return {
            notes: this.state.notes,
            filteredNotes: this.state.filteredNotes,
            searchQuery: this.state.searchQuery,
            activeFilters: this.state.activeFilters,
            sortBy: this.state.sortBy,
            sortOrder: this.state.sortOrder,
            viewMode: this.state.viewMode,
            selectedNotes: Array.from(this.state.selectedNotes),
            currentPage: this.state.currentPage,
            totalPages: this.state.totalPages,
            stats: this.state.stats
        };
    }
    
    /**
     * 销毁页面
     */
    destroy() {
        // 停止自动刷新
        this.stopAutoRefresh();
        
        // 清除定时器
        clearTimeout(this.searchTimeout);
        
        // 销毁笔记列表
        if (this.noteList) {
            this.noteList.destroy();
        }
        
        // 销毁空状态
        if (this.emptyState) {
            this.emptyState.destroy();
        }
        
        // 从DOM移除
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // 清理引用
        this.container = null;
        this.noteList = null;
        this.searchInput = null;
        this.emptyState = null;
        this.filtersPanel = null;
        
        console.log('[笔记页面] 已销毁');
    }
}
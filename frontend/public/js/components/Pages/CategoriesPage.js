/**
 * 分类管理页面组件
 * 管理笔记分类，支持树形结构、拖拽排序、颜色标记、图标设置等功能
 */

import Utils from '../../core/utils.js';
import Config from '../../config.js';
import Api from '../../api/index.js';
import OfflineManager from '../../core/offline.js';
import { Modal } from '../Modals/modals.js';
import { CategoryModal } from '../Modals/modals.js';
import { EmptyStateUtil } from '../Common/EmptyState.js';
import { Notify } from '../Common/Notification.js';
import { Loader } from '../Common/Loading.js';

export class CategoriesPage {
    constructor(app, options = {}) {
        this.app = app;
        this.options = {
            id: 'categories-page',
            title: '分类管理',
            icon: 'fas fa-folder',
            viewMode: 'tree', // 'tree', 'list', 'grid'
            showCounts: true,
            showIcons: true,
            showColors: true,
            enableDragDrop: true,
            enableBulkActions: true,
            enableSearch: true,
            maxDepth: 3, // 最大嵌套深度
            defaultColor: '#6366f1',
            defaultIcon: 'fas fa-folder',
            classes: {
                container: '',
                header: '',
                toolbar: '',
                content: '',
                sidebar: '',
                category: ''
            },
            onCategoryClick: null,
            onCategoryCreate: null,
            onCategoryUpdate: null,
            onCategoryDelete: null,
            onCategoryMove: null,
            onBulkAction: null,
            ...options
        };
        
        this.state = {
            categories: [],
            filteredCategories: [],
            isLoading: true,
            isDragging: false,
            searchQuery: '',
            selectedCategory: null,
            expandedCategories: new Set(),
            selectedCategories: new Set(),
            dragState: {
                sourceId: null,
                targetId: null,
                position: null // 'before', 'after', 'inside'
            },
            stats: {
                total: 0,
                byColor: {},
                notesCount: {}
            }
        };
        
        this.container = null;
        this.categoryTree = null;
        this.searchInput = null;
        this.emptyState = null;
        this.dragElement = null;
        
        this.init();
    }
    
    /**
     * 初始化分类页面
     */
    init() {
        console.log('[分类页面] 初始化完成');
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
            
            console.log('[分类页面] 渲染完成');
            
        } catch (error) {
            console.error('[分类页面] 渲染失败:', error);
            this.showError('加载分类失败', error.message);
        }
    }
    
    /**
     * 获取加载模板
     */
    getLoadingTemplate() {
        return `
            <div class="categories-page-loading">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="loading-text">加载分类中...</div>
            </div>
        `;
    }
    
    /**
     * 获取页面模板
     */
    getTemplate() {
        return `
            <div class="categories-page ${this.options.classes.container || ''}">
                <!-- 页面头部 -->
                <div class="categories-header ${this.options.classes.header || ''}">
                    <div class="header-left">
                        <h1 class="page-title">
                            <i class="${this.options.icon}"></i>
                            ${this.options.title}
                        </h1>
                        
                        <!-- 新建分类按钮 -->
                        <button class="btn btn-primary btn-new-category">
                            <i class="fas fa-plus"></i>
                            新建分类
                        </button>
                    </div>
                    
                    <div class="header-right">
                        <!-- 批量操作 -->
                        ${this.options.enableBulkActions ? this.getBulkActionsTemplate() : ''}
                        
                        <!-- 视图切换 -->
                        <div class="view-toggle">
                            <button class="view-btn ${this.options.viewMode === 'tree' ? 'active' : ''}" 
                                    data-view="tree" 
                                    title="树形视图">
                                <i class="fas fa-sitemap"></i>
                            </button>
                            <button class="view-btn ${this.options.viewMode === 'list' ? 'active' : ''}" 
                                    data-view="list" 
                                    title="列表视图">
                                <i class="fas fa-list"></i>
                            </button>
                            <button class="view-btn ${this.options.viewMode === 'grid' ? 'active' : ''}" 
                                    data-view="grid" 
                                    title="网格视图">
                                <i class="fas fa-th"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- 工具栏 -->
                <div class="categories-toolbar ${this.options.classes.toolbar || ''}">
                    <div class="toolbar-left">
                        <!-- 搜索框 -->
                        ${this.options.enableSearch ? this.getSearchTemplate() : ''}
                        
                        <!-- 筛选选项 -->
                        <div class="filter-options">
                            <div class="form-check form-check-inline">
                                <input type="checkbox" 
                                       id="filter-show-counts" 
                                       class="form-check-input" 
                                       ${this.options.showCounts ? 'checked' : ''}>
                                <label for="filter-show-counts" class="form-check-label">
                                    显示笔记数量
                                </label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input type="checkbox" 
                                       id="filter-show-icons" 
                                       class="form-check-input" 
                                       ${this.options.showIcons ? 'checked' : ''}>
                                <label for="filter-show-icons" class="form-check-label">
                                    显示图标
                                </label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input type="checkbox" 
                                       id="filter-show-colors" 
                                       class="form-check-input" 
                                       ${this.options.showColors ? 'checked' : ''}>
                                <label for="filter-show-colors" class="form-check-label">
                                    显示颜色
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="toolbar-right">
                        <!-- 操作按钮 -->
                        <div class="action-buttons">
                            <button class="btn btn-secondary btn-expand-all" title="展开全部">
                                <i class="fas fa-expand-alt"></i>
                            </button>
                            <button class="btn btn-secondary btn-collapse-all" title="折叠全部">
                                <i class="fas fa-compress-alt"></i>
                            </button>
                            <button class="btn btn-secondary btn-refresh" title="刷新">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- 页面主体 -->
                <div class="categories-body">
                    <!-- 侧边栏（统计信息） -->
                    <div class="categories-sidebar ${this.options.classes.sidebar || ''}">
                        ${this.getSidebarTemplate()}
                    </div>
                    
                    <!-- 内容区域 -->
                    <div class="categories-content ${this.options.classes.content || ''}">
                        <!-- 分类列表/树容器 -->
                        <div class="categories-container">
                            ${this.getCategoriesTemplate()}
                        </div>
                        
                        <!-- 空状态 -->
                        <div class="empty-state-container"></div>
                    </div>
                </div>
                
                <!-- 拖拽占位符 -->
                ${this.options.enableDragDrop ? '<div class="drag-placeholder" style="display: none;"></div>' : ''}
            </div>
        `;
    }
    
    /**
     * 获取批量操作模板
     */
    getBulkActionsTemplate() {
        const selectedCount = this.state.selectedCategories.size;
        
        if (selectedCount === 0) {
            return '';
        }
        
        return `
            <div class="bulk-actions">
                <span class="selected-count">已选择 ${selectedCount} 项</span>
                <div class="bulk-buttons">
                    <button class="btn btn-secondary btn-bulk-edit" title="批量编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-secondary btn-bulk-color" title="批量设置颜色">
                        <i class="fas fa-palette"></i>
                    </button>
                    <button class="btn btn-danger btn-bulk-delete" title="批量删除">
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
                       placeholder="搜索分类..."
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
     * 获取侧边栏模板
     */
    getSidebarTemplate() {
        return `
            <div class="sidebar-sections">
                <!-- 统计信息 -->
                <div class="sidebar-section">
                    <h3 class="sidebar-title">统计信息</h3>
                    <div class="stats-info">
                        <div class="stat-item">
                            <i class="fas fa-folder"></i>
                            <div class="stat-content">
                                <div class="stat-value">${this.state.stats.total}</div>
                                <div class="stat-label">分类总数</div>
                            </div>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-sticky-note"></i>
                            <div class="stat-content">
                                <div class="stat-value">${this.getTotalNotesCount()}</div>
                                <div class="stat-label">笔记总数</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 颜色分布 -->
                ${Object.keys(this.state.stats.byColor).length > 0 ? `
                    <div class="sidebar-section">
                        <h3 class="sidebar-title">颜色分布</h3>
                        <div class="color-distribution">
                            ${Object.entries(this.state.stats.byColor).map(([color, count]) => `
                                <div class="color-item">
                                    <div class="color-swatch" style="background-color: ${color}"></div>
                                    <div class="color-info">
                                        <div class="color-count">${count}</div>
                                        <div class="color-label">个分类</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- 快捷操作 -->
                <div class="sidebar-section">
                    <h3 class="sidebar-title">快捷操作</h3>
                    <div class="quick-actions">
                        <button class="quick-action" data-action="uncategorized">
                            <i class="fas fa-question-circle"></i>
                            未分类笔记
                        </button>
                        <button class="quick-action" data-action="duplicates">
                            <i class="fas fa-copy"></i>
                            重复分类
                        </button>
                        <button class="quick-action" data-action="export">
                            <i class="fas fa-download"></i>
                            导出分类
                        </button>
                        <button class="quick-action" data-action="import">
                            <i class="fas fa-upload"></i>
                            导入分类
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取分类模板
     */
    getCategoriesTemplate() {
        if (this.state.isLoading) {
            return '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';
        }
        
        if (this.state.filteredCategories.length === 0) {
            return ''; // 空状态会单独处理
        }
        
        switch (this.options.viewMode) {
            case 'tree':
                return this.getTreeTemplate();
            case 'list':
                return this.getListTemplate();
            case 'grid':
                return this.getGridTemplate();
            default:
                return this.getTreeTemplate();
        }
    }
    
    /**
     * 获取树形模板
     */
    getTreeTemplate() {
        // 构建树形结构
        const tree = this.buildCategoryTree();
        
        return `
            <div class="categories-tree">
                ${this.renderTreeNodes(tree)}
            </div>
        `;
    }
    
    /**
     * 获取列表模板
     */
    getListTemplate() {
        return `
            <div class="categories-list">
                ${this.state.filteredCategories.map(category => this.getCategoryItemTemplate(category)).join('')}
            </div>
        `;
    }
    
    /**
     * 获取网格模板
     */
    getGridTemplate() {
        return `
            <div class="categories-grid">
                ${this.state.filteredCategories.map(category => this.getCategoryCardTemplate(category)).join('')}
            </div>
        `;
    }
    
    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.searchInput = this.container.querySelector('.search-input');
        this.categoriesContainer = this.container.querySelector('.categories-container');
        this.emptyStateContainer = this.container.querySelector('.empty-state-container');
        this.dragPlaceholder = this.container.querySelector('.drag-placeholder');
    }
    
    /**
     * 初始化组件
     */
    async initComponents() {
        // 更新空状态
        this.updateEmptyState();
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 新建分类按钮
        const newCategoryBtn = this.container.querySelector('.btn-new-category');
        if (newCategoryBtn) {
            newCategoryBtn.addEventListener('click', () => this.createNewCategory());
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
        
        // 视图切换
        const viewButtons = this.container.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });
        
        // 筛选选项
        this.bindFilterOptions();
        
        // 操作按钮
        this.bindActionButtons();
        
        // 批量操作按钮
        this.bindBulkActions();
        
        // 侧边栏快捷操作
        this.bindSidebarActions();
        
        // 分类项事件
        this.bindCategoryEvents();
        
        // 拖拽事件
        if (this.options.enableDragDrop) {
            this.setupDragDrop();
        }
        
        // 全局事件监听
        this.setupGlobalListeners();
    }
    
    /**
     * 绑定筛选选项
     */
    bindFilterOptions() {
        const showCounts = this.container.querySelector('#filter-show-counts');
        const showIcons = this.container.querySelector('#filter-show-icons');
        const showColors = this.container.querySelector('#filter-show-colors');
        
        if (showCounts) {
            showCounts.addEventListener('change', (e) => {
                this.options.showCounts = e.target.checked;
                this.renderCategories();
            });
        }
        
        if (showIcons) {
            showIcons.addEventListener('change', (e) => {
                this.options.showIcons = e.target.checked;
                this.renderCategories();
            });
        }
        
        if (showColors) {
            showColors.addEventListener('change', (e) => {
                this.options.showColors = e.target.checked;
                this.renderCategories();
            });
        }
    }
    
    /**
     * 绑定操作按钮
     */
    bindActionButtons() {
        // 展开全部
        const expandAllBtn = this.container.querySelector('.btn-expand-all');
        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', () => this.expandAll());
        }
        
        // 折叠全部
        const collapseAllBtn = this.container.querySelector('.btn-collapse-all');
        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', () => this.collapseAll());
        }
        
        // 刷新按钮
        const refreshBtn = this.container.querySelector('.btn-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshCategories());
        }
    }
    
    /**
     * 绑定批量操作
     */
    bindBulkActions() {
        // 批量编辑
        const bulkEditBtn = this.container.querySelector('.btn-bulk-edit');
        if (bulkEditBtn) {
            bulkEditBtn.addEventListener('click', () => this.bulkEdit());
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
     * 绑定侧边栏操作
     */
    bindSidebarActions() {
        const quickActions = this.container.querySelectorAll('.quick-action');
        quickActions.forEach(action => {
            action.addEventListener('click', (e) => {
                const actionType = e.currentTarget.dataset.action;
                this.handleQuickAction(actionType);
            });
        });
    }
    
    /**
     * 绑定分类事件
     */
    bindCategoryEvents() {
        // 展开/折叠
        const toggleBtns = this.container.querySelectorAll('.category-toggle');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const categoryId = e.currentTarget.dataset.id;
                this.toggleCategory(categoryId);
            });
        });
        
        // 分类点击
        const categoryItems = this.container.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.category-toggle') || 
                    e.target.closest('.category-checkbox') ||
                    e.target.closest('.category-action')) {
                    return;
                }
                
                const categoryId = e.currentTarget.dataset.id;
                this.handleCategoryClick(categoryId);
            });
        });
        
        // 复选框选择
        const checkboxes = this.container.querySelectorAll('.category-checkbox input');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const categoryId = e.target.value;
                const selected = e.target.checked;
                this.handleCategorySelect(categoryId, selected);
            });
        });
        
        // 操作按钮
        const actionButtons = this.container.querySelectorAll('.category-action');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const categoryId = e.currentTarget.dataset.id;
                const action = e.currentTarget.dataset.action;
                this.handleCategoryAction(categoryId, action);
            });
        });
    }
    
    /**
     * 设置全局监听
     */
    setupGlobalListeners() {
        // 分类创建事件
        document.addEventListener('category:created', (e) => {
            this.handleCategoryCreated(e.detail.category);
        });
        
        // 分类更新事件
        document.addEventListener('category:updated', (e) => {
            this.handleCategoryUpdated(e.detail.category);
        });
        
        // 分类删除事件
        document.addEventListener('category:deleted', (e) => {
            this.handleCategoryDeleted(e.detail.categoryId);
        });
        
        // 同步完成事件
        document.addEventListener('sync:complete', () => {
            this.refreshCategories();
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }
    
    /**
     * 设置拖拽功能
     */
    setupDragDrop() {
        if (!this.options.enableDragDrop) return;
        
        const container = this.categoriesContainer;
        if (!container) return;
        
        // 设置可拖拽的分类项
        const draggableItems = container.querySelectorAll('.category-item[draggable="true"]');
        draggableItems.forEach(item => {
            this.setupDragEvents(item);
        });
        
        // 设置放置区域
        this.setupDropZones();
    }
    
    /**
     * 设置拖拽事件
     */
    setupDragEvents(element) {
        element.setAttribute('draggable', 'true');
        
        element.addEventListener('dragstart', (e) => this.handleDragStart(e));
        element.addEventListener('dragend', (e) => this.handleDragEnd(e));
        
        // 设置放置目标
        element.addEventListener('dragover', (e) => this.handleDragOver(e));
        element.addEventListener('dragenter', (e) => this.handleDragEnter(e));
        element.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        element.addEventListener('drop', (e) => this.handleDrop(e));
    }
    
    /**
     * 设置放置区域
     */
    setupDropZones() {
        // 容器本身也是放置区域
        if (this.categoriesContainer) {
            this.categoriesContainer.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.categoriesContainer.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            this.categoriesContainer.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            this.categoriesContainer.addEventListener('drop', (e) => this.handleDrop(e));
        }
    }
    
    /**
     * 加载初始数据
     */
    async loadInitialData() {
        this.state.isLoading = true;
        
        try {
            // 加载分类
            const categories = await this.loadCategories();
            this.state.categories = categories;
            
            // 加载笔记统计
            await this.loadNotesCount();
            
            // 计算统计
            this.calculateStats();
            
            // 应用搜索筛选
            this.applySearchFilter();
            
            this.state.isLoading = false;
            
        } catch (error) {
            this.state.isLoading = false;
            throw error;
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
            console.error('[分类页面] 加载分类失败:', error);
            return [];
        }
    }
    
    /**
     * 加载笔记数量统计
     */
    async loadNotesCount() {
        try {
            if (Config.isOnline()) {
                const response = await Api.notes.getCountByCategory();
                if (response.success) {
                    this.state.stats.notesCount = response.data || {};
                }
            } else {
                // 离线模式：从本地笔记计算
                const notes = Utils.storage.get('notes', []);
                const counts = {};
                
                notes.forEach(note => {
                    if (note.category) {
                        counts[note.category] = (counts[note.category] || 0) + 1;
                    }
                });
                
                this.state.stats.notesCount = counts;
            }
        } catch (error) {
            console.error('[分类页面] 加载笔记统计失败:', error);
            this.state.stats.notesCount = {};
        }
    }
    
    /**
     * 计算统计
     */
    calculateStats() {
        const stats = {
            total: this.state.categories.length,
            byColor: {},
            notesCount: this.state.stats.notesCount
        };
        
        this.state.categories.forEach(category => {
            // 颜色统计
            if (category.color) {
                stats.byColor[category.color] = (stats.byColor[category.color] || 0) + 1;
            }
        });
        
        this.state.stats = stats;
    }
    
    /**
     * 获取笔记总数
     */
    getTotalNotesCount() {
        return Object.values(this.state.stats.notesCount).reduce((sum, count) => sum + count, 0);
    }
    
    /**
     * 构建分类树
     */
    buildCategoryTree() {
        const categories = [...this.state.filteredCategories];
        const tree = [];
        const map = {};
        
        // 创建映射
        categories.forEach(category => {
            map[category.id] = { ...category, children: [] };
        });
        
        // 构建树
        categories.forEach(category => {
            if (category.parentId && map[category.parentId]) {
                map[category.parentId].children.push(map[category.id]);
            } else {
                tree.push(map[category.id]);
            }
        });
        
        // 排序子节点
        const sortChildren = (node) => {
            if (node.children.length > 0) {
                node.children.sort((a, b) => (a.order || 0) - (b.order || 0));
                node.children.forEach(child => sortChildren(child));
            }
        };
        
        tree.forEach(root => sortChildren(root));
        tree.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        return tree;
    }
    
    /**
     * 渲染树节点
     */
    renderTreeNodes(nodes, depth = 0) {
        if (depth >= this.options.maxDepth) {
            return '';
        }
        
        return nodes.map(node => {
            const isExpanded = this.state.expandedCategories.has(node.id);
            const hasChildren = node.children && node.children.length > 0;
            const notesCount = this.state.stats.notesCount[node.id] || 0;
            
            return `
                <div class="tree-node" data-depth="${depth}">
                    <div class="category-item ${this.options.classes.category || ''} 
                                         ${this.state.selectedCategory === node.id ? 'selected' : ''}
                                         ${this.state.selectedCategories.has(node.id) ? 'checked' : ''}"
                         data-id="${node.id}"
                         draggable="${this.options.enableDragDrop}">
                        
                        <!-- 缩进 -->
                        <div class="category-indent" style="width: ${depth * 20}px"></div>
                        
                        <!-- 展开/折叠按钮 -->
                        ${hasChildren ? `
                            <button class="category-toggle" data-id="${node.id}">
                                <i class="fas fa-chevron-${isExpanded ? 'down' : 'right'}"></i>
                            </button>
                        ` : '<div class="category-toggle-placeholder"></div>'}
                        
                        <!-- 复选框 -->
                        ${this.options.enableBulkActions ? `
                            <div class="category-checkbox">
                                <input type="checkbox" 
                                       value="${node.id}"
                                       ${this.state.selectedCategories.has(node.id) ? 'checked' : ''}>
                            </div>
                        ` : ''}
                        
                        <!-- 图标 -->
                        ${this.options.showIcons ? `
                            <div class="category-icon" style="color: ${node.color || this.options.defaultColor}">
                                <i class="${node.icon || this.options.defaultIcon}"></i>
                            </div>
                        ` : ''}
                        
                        <!-- 颜色标记 -->
                        ${this.options.showColors && node.color ? `
                            <div class="category-color" style="background-color: ${node.color}"></div>
                        ` : ''}
                        
                        <!-- 分类信息 -->
                        <div class="category-info">
                            <div class="category-name">${node.name}</div>
                            ${node.description ? `
                                <div class="category-description">${node.description}</div>
                            ` : ''}
                        </div>
                        
                        <!-- 笔记数量 -->
                        ${this.options.showCounts ? `
                            <div class="category-count">
                                <span class="count-badge">${notesCount}</span>
                            </div>
                        ` : ''}
                        
                        <!-- 操作按钮 -->
                        <div class="category-actions">
                            <button class="category-action" data-id="${node.id}" data-action="edit" title="编辑">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="category-action" data-id="${node.id}" data-action="delete" title="删除">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- 子节点 -->
                    ${hasChildren && isExpanded ? `
                        <div class="tree-children">
                            ${this.renderTreeNodes(node.children, depth + 1)}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
    
    /**
     * 获取分类项模板
     */
    getCategoryItemTemplate(category) {
        const notesCount = this.state.stats.notesCount[category.id] || 0;
        
        return `
            <div class="category-item list-item ${this.options.classes.category || ''}
                                         ${this.state.selectedCategory === category.id ? 'selected' : ''}
                                         ${this.state.selectedCategories.has(category.id) ? 'checked' : ''}"
                 data-id="${category.id}">
                
                <!-- 复选框 -->
                ${this.options.enableBulkActions ? `
                    <div class="category-checkbox">
                        <input type="checkbox" 
                               value="${category.id}"
                               ${this.state.selectedCategories.has(category.id) ? 'checked' : ''}>
                    </div>
                ` : ''}
                
                <!-- 图标 -->
                ${this.options.showIcons ? `
                    <div class="category-icon" style="color: ${category.color || this.options.defaultColor}">
                        <i class="${category.icon || this.options.defaultIcon}"></i>
                    </div>
                ` : ''}
                
                <!-- 颜色标记 -->
                ${this.options.showColors && category.color ? `
                    <div class="category-color" style="background-color: ${category.color}"></div>
                ` : ''}
                
                <!-- 分类信息 -->
                <div class="category-info">
                    <div class="category-name">${category.name}</div>
                    ${category.description ? `
                        <div class="category-description">${category.description}</div>
                    ` : ''}
                    ${category.parentId ? `
                        <div class="category-parent">
                            <i class="fas fa-level-up-alt"></i>
                            ${this.getCategoryName(category.parentId)}
                        </div>
                    ` : ''}
                </div>
                
                <!-- 笔记数量 -->
                ${this.options.showCounts ? `
                    <div class="category-count">
                        <span class="count-badge">${notesCount}</span>
                    </div>
                ` : ''}
                
                <!-- 操作按钮 -->
                <div class="category-actions">
                    <button class="category-action" data-id="${category.id}" data-action="edit" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="category-action" data-id="${category.id}" data-action="delete" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取分类卡片模板
     */
    getCategoryCardTemplate(category) {
        const notesCount = this.state.stats.notesCount[category.id] || 0;
        
        return `
            <div class="category-card ${this.options.classes.category || ''}
                                 ${this.state.selectedCategory === category.id ? 'selected' : ''}
                                 ${this.state.selectedCategories.has(category.id) ? 'checked' : ''}"
                 data-id="${category.id}"
                 style="border-color: ${category.color || this.options.defaultColor}">
                
                <!-- 卡片头部 -->
                <div class="card-header">
                    <!-- 复选框 -->
                    ${this.options.enableBulkActions ? `
                        <div class="category-checkbox">
                            <input type="checkbox" 
                                   value="${category.id}"
                                   ${this.state.selectedCategories.has(category.id) ? 'checked' : ''}>
                        </div>
                    ` : ''}
                    
                    <!-- 操作按钮 -->
                    <div class="card-actions">
                        <button class="card-action" data-id="${category.id}" data-action="edit" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="card-action" data-id="${category.id}" data-action="delete" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <!-- 卡片内容 -->
                <div class="card-content">
                    <!-- 图标 -->
                    ${this.options.showIcons ? `
                        <div class="card-icon" style="color: ${category.color || this.options.defaultColor}">
                            <i class="${category.icon || this.options.defaultIcon}"></i>
                        </div>
                    ` : ''}
                    
                    <!-- 分类名称 -->
                    <h3 class="card-title">${category.name}</h3>
                    
                    <!-- 描述 -->
                    ${category.description ? `
                        <p class="card-description">${category.description}</p>
                    ` : ''}
                    
                    <!-- 笔记数量 -->
                    ${this.options.showCounts ? `
                        <div class="card-count">
                            <i class="fas fa-sticky-note"></i>
                            <span>${notesCount} 个笔记</span>
                        </div>
                    ` : ''}
                    
                    <!-- 父分类 -->
                    ${category.parentId ? `
                        <div class="card-parent">
                            <i class="fas fa-folder"></i>
                            <span>${this.getCategoryName(category.parentId)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <!-- 卡片底部 -->
                <div class="card-footer">
                    <div class="card-color" style="background-color: ${category.color || this.options.defaultColor}"></div>
                    <div class="card-updated">
                        更新于 ${Utils.formatDate(category.updatedAt, 'relative')}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 根据ID获取分类名称
     */
    getCategoryName(categoryId) {
        const category = this.state.categories.find(c => c.id === categoryId);
        return category ? category.name : '未知分类';
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
        this.applySearchFilter();
        this.renderCategories();
        this.updateEmptyState();
    }
    
    /**
     * 应用搜索筛选
     */
    applySearchFilter() {
        if (!this.state.searchQuery) {
            this.state.filteredCategories = [...this.state.categories];
            return;
        }
        
        const query = this.state.searchQuery.toLowerCase();
        this.state.filteredCategories = this.state.categories.filter(category => 
            category.name.toLowerCase().includes(query) ||
            (category.description && category.description.toLowerCase().includes(query))
        );
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
     * 切换视图
     */
    switchView(view) {
        this.options.viewMode = view;
        
        // 更新按钮状态
        const viewButtons = this.container.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // 重新渲染分类
        this.renderCategories();
    }
    
    /**
     * 渲染分类
     */
    renderCategories() {
        if (!this.categoriesContainer) return;
        
        this.categoriesContainer.innerHTML = this.getCategoriesTemplate();
        
        // 重新绑定事件
        this.bindCategoryEvents();
        
        // 重新设置拖拽
        if (this.options.enableDragDrop) {
            this.setupDragDrop();
        }
    }
    
    /**
     * 更新空状态
     */
    updateEmptyState() {
        if (this.state.filteredCategories.length === 0) {
            if (!this.emptyState) {
                this.emptyState = EmptyStateUtil.create({
                    type: this.state.searchQuery ? 'no-results' : 'no-data',
                    title: this.state.searchQuery ? '无搜索结果' : '还没有分类',
                    message: this.state.searchQuery ? 
                          '尝试不同的搜索词' : 
                          '创建分类来组织您的笔记吧！',
                    showActions: true,
                    actions: [
                        {
                            text: '新建分类',
                            type: 'primary',
                            icon: 'fas fa-plus',
                            action: () => this.createNewCategory()
                        },
                        ...(this.state.searchQuery ? [{
                            text: '清除搜索',
                            type: 'secondary',
                            icon: 'fas fa-times',
                            action: () => this.clearSearch()
                        }] : [])
                    ]
                });
                
                this.emptyState.renderTo(this.emptyStateContainer);
            } else {
                this.emptyState.update({
                    type: this.state.searchQuery ? 'no-results' : 'no-data',
                    title: this.state.searchQuery ? '无搜索结果' : '还没有分类',
                    message: this.state.searchQuery ? 
                          '尝试不同的搜索词' : 
                          '创建分类来组织您的笔记吧！'
                });
            }
        } else if (this.emptyState) {
            this.emptyState.hide();
        }
    }
    
    /**
     * 展开全部
     */
    expandAll() {
        this.state.categories.forEach(category => {
            this.state.expandedCategories.add(category.id);
        });
        this.renderCategories();
    }
    
    /**
     * 折叠全部
     */
    collapseAll() {
        this.state.expandedCategories.clear();
        this.renderCategories();
    }
    
    /**
     * 刷新分类
     */
    async refreshCategories() {
        try {
            await this.loadInitialData();
            this.renderCategories();
            Notify.success('分类已刷新');
        } catch (error) {
            console.error('[分类页面] 刷新失败:', error);
            Notify.error('刷新失败', error.message);
        }
    }
    
    /**
     * 切换分类展开状态
     */
    toggleCategory(categoryId) {
        if (this.state.expandedCategories.has(categoryId)) {
            this.state.expandedCategories.delete(categoryId);
        } else {
            this.state.expandedCategories.add(categoryId);
        }
        this.renderCategories();
    }
    
    /**
     * 处理分类点击
     */
    handleCategoryClick(categoryId) {
        this.state.selectedCategory = categoryId;
        
        if (this.options.onCategoryClick) {
            const category = this.state.categories.find(c => c.id === categoryId);
            this.options.onCategoryClick(category, this);
        } else {
            // 默认行为：高亮选中
            this.renderCategories();
        }
    }
    
    /**
     * 处理分类选择
     */
    handleCategorySelect(categoryId, selected) {
        if (selected) {
            this.state.selectedCategories.add(categoryId);
        } else {
            this.state.selectedCategories.delete(categoryId);
        }
        
        // 更新批量操作区域
        this.updateBulkActions();
    }
    
    /**
     * 更新批量操作区域
     */
    updateBulkActions() {
        const bulkActions = this.container.querySelector('.bulk-actions');
        const selectedCount = this.state.selectedCategories.size;
        
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
     * 处理分类操作
     */
    handleCategoryAction(categoryId, action) {
        const category = this.state.categories.find(c => c.id === categoryId);
        if (!category) return;
        
        switch (action) {
            case 'edit':
                this.editCategory(category);
                break;
            case 'delete':
                this.deleteCategory(category);
                break;
        }
    }
    
    /**
     * 创建新分类
     */
    createNewCategory(parentId = null) {
        const modal = new CategoryModal({
            categoryData: {
                name: '',
                description: '',
                color: this.options.defaultColor,
                icon: this.options.defaultIcon,
                parentId: parentId
            },
            categories: this.state.categories,
            onSave: (newCategory) => {
                this.handleCategoryCreated(newCategory);
                
                if (this.options.onCategoryCreate) {
                    this.options.onCategoryCreate(newCategory, this);
                }
            }
        });
        
        modal.open();
    }
    
    /**
     * 编辑分类
     */
    editCategory(category) {
        const modal = new CategoryModal({
            categoryId: category.id,
            categoryData: category,
            categories: this.state.categories,
            onSave: (updatedCategory) => {
                this.handleCategoryUpdated(updatedCategory);
                
                if (this.options.onCategoryUpdate) {
                    this.options.onCategoryUpdate(updatedCategory, this);
                }
            }
        });
        
        modal.open();
    }
    
    /**
     * 删除分类
     */
    deleteCategory(category) {
        Modal.confirm({
            title: '删除分类',
            message: `确定要删除分类 "${category.name}" 吗？此操作将影响该分类下的所有笔记。`,
            confirmText: '删除',
            confirmType: 'danger',
            onConfirm: async () => {
                try {
                    if (Config.isOnline()) {
                        await Api.categories.delete(category.id);
                    } else {
                        await OfflineManager.addToQueue('delete_category', { id: category.id });
                    }
                    
                    this.handleCategoryDeleted(category.id);
                    Notify.success(`分类 "${category.name}" 已删除`);
                    
                } catch (error) {
                    console.error('[分类页面] 删除分类失败:', error);
                    Notify.error('删除失败', error.message);
                }
            }
        });
    }
    
    /**
     * 处理分类创建
     */
    handleCategoryCreated(category) {
        // 添加到分类列表
        this.state.categories.push(category);
        
        // 更新统计
        this.calculateStats();
        
        // 应用搜索筛选
        this.applySearchFilter();
        
        // 重新渲染
        this.renderCategories();
        this.updateEmptyState();
        
        // 触发事件
        document.dispatchEvent(new CustomEvent('category:created', {
            detail: { category }
        }));
    }
    
    /**
     * 处理分类更新
     */
    handleCategoryUpdated(updatedCategory) {
        // 更新分类
        const index = this.state.categories.findIndex(c => c.id === updatedCategory.id);
        if (index !== -1) {
            this.state.categories[index] = updatedCategory;
        }
        
        // 更新统计
        this.calculateStats();
        
        // 应用搜索筛选
        this.applySearchFilter();
        
        // 重新渲染
        this.renderCategories();
        
        // 触发事件
        document.dispatchEvent(new CustomEvent('category:updated', {
            detail: { category: updatedCategory }
        }));
    }
    
    /**
     * 处理分类删除
     */
    handleCategoryDeleted(categoryId) {
        // 从分类列表中移除
        this.state.categories = this.state.categories.filter(c => c.id !== categoryId);
        
        // 从选中中移除
        this.state.selectedCategories.delete(categoryId);
        this.state.expandedCategories.delete(categoryId);
        
        // 更新统计
        this.calculateStats();
        
        // 应用搜索筛选
        this.applySearchFilter();
        
        // 重新渲染
        this.renderCategories();
        this.updateEmptyState();
        
        // 触发事件
        document.dispatchEvent(new CustomEvent('category:deleted', {
            detail: { categoryId }
        }));
        
        if (this.options.onCategoryDelete) {
            this.options.onCategoryDelete(categoryId, this);
        }
    }
    
    /**
     * 批量编辑
     */
    async bulkEdit() {
        const categoryIds = Array.from(this.state.selectedCategories);
        
        Modal.prompt({
            title: '批量编辑分类',
            message: '为选中的分类设置新颜色：',
            inputType: 'color',
            defaultValue: this.options.defaultColor,
            onConfirm: async (color) => {
                const loader = Loader.wrap(async () => {
                    for (const categoryId of categoryIds) {
                        const category = this.state.categories.find(c => c.id === categoryId);
                        if (category) {
                            const updatedCategory = { ...category, color };
                            
                            if (Config.isOnline()) {
                                await Api.categories.update(categoryId, updatedCategory);
                            } else {
                                await OfflineManager.addToQueue('update_category', updatedCategory);
                            }
                            
                            this.handleCategoryUpdated(updatedCategory);
                        }
                    }
                    
                    this.clearSelection();
                    Notify.success(`已更新 ${categoryIds.length} 个分类的颜色`);
                }, {
                    text: '处理中...',
                    successText: '操作完成'
                });
                
                await loader();
            }
        });
    }
    
    /**
     * 批量删除
     */
    async bulkDelete() {
        const categoryIds = Array.from(this.state.selectedCategories);
        const categoryNames = categoryIds.map(id => {
            const category = this.state.categories.find(c => c.id === id);
            return category ? category.name : '未知分类';
        });
        
        Modal.confirm({
            title: '批量删除分类',
            message: `确定要删除选中的 ${categoryIds.length} 个分类吗？<br>${categoryNames.slice(0, 5).join(', ')}${categoryNames.length > 5 ? '...' : ''}`,
            confirmText: '删除',
            confirmType: 'danger',
            onConfirm: async () => {
                const loader = Loader.wrap(async () => {
                    for (const categoryId of categoryIds) {
                        if (Config.isOnline()) {
                            await Api.categories.delete(categoryId);
                        } else {
                            await OfflineManager.addToQueue('delete_category', { id: categoryId });
                        }
                        
                        this.handleCategoryDeleted(categoryId);
                    }
                    
                    this.clearSelection();
                    Notify.success(`已删除 ${categoryIds.length} 个分类`);
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
        this.state.selectedCategories.clear();
        this.updateBulkActions();
        
        // 清除所有复选框
        const checkboxes = this.container.querySelectorAll('.category-checkbox input');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    }
    
    /**
     * 处理快捷操作
     */
    handleQuickAction(action) {
        switch (action) {
            case 'uncategorized':
                // 这里可以跳转到未分类笔记页面
                console.log('跳转到未分类笔记');
                break;
            case 'duplicates':
                this.findDuplicateCategories();
                break;
            case 'export':
                this.exportCategories();
                break;
            case 'import':
                this.importCategories();
                break;
        }
    }
    
    /**
     * 查找重复分类
     */
    findDuplicateCategories() {
        const nameMap = {};
        const duplicates = [];
        
        this.state.categories.forEach(category => {
            if (nameMap[category.name]) {
                duplicates.push(category);
            } else {
                nameMap[category.name] = category;
            }
        });
        
        if (duplicates.length > 0) {
            const message = `找到 ${duplicates.length} 个重复分类：\n` + 
                          duplicates.map(c => `• ${c.name}`).join('\n');
            
            Modal.alert({
                title: '重复分类',
                message: message
            });
        } else {
            Notify.info('未找到重复分类');
        }
    }
    
    /**
     * 导出分类
     */
    exportCategories() {
        try {
            const data = {
                categories: this.state.categories,
                version: Config.APP_VERSION,
                exportDate: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `categories-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            Notify.success('分类导出成功');
            
        } catch (error) {
            console.error('[分类页面] 导出分类失败:', error);
            Notify.error('导出失败', error.message);
        }
    }
    
    /**
     * 导入分类
     */
    async importCategories() {
        Modal.confirm({
            title: '导入分类',
            message: '导入分类将覆盖现有分类，是否继续？',
            confirmText: '导入',
            confirmType: 'warning',
            onConfirm: async () => {
                try {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    
                    input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        
                        const loader = Loader.wrap(async () => {
                            const text = await file.text();
                            const data = JSON.parse(text);
                            
                            // 验证数据格式
                            if (!data.categories) {
                                throw new Error('无效的数据文件格式');
                            }
                            
                            // 更新分类
                            this.state.categories = data.categories;
                            
                            // 更新统计
                            this.calculateStats();
                            
                            // 应用搜索筛选
                            this.applySearchFilter();
                            
                            // 重新渲染
                            this.renderCategories();
                            this.updateEmptyState();
                            
                            Notify.success('分类导入成功');
                        }, {
                            text: '导入中...',
                            successText: '导入完成'
                        });
                        
                        await loader();
                    };
                    
                    input.click();
                    
                } catch (error) {
                    console.error('[分类页面] 导入分类失败:', error);
                    Notify.error('导入失败', error.message);
                }
            }
        });
    }
    
    /**
     * 处理拖拽开始
     */
    handleDragStart(event) {
        this.state.isDragging = true;
        this.state.dragState.sourceId = event.currentTarget.dataset.id;
        
        // 设置拖拽图片
        const dragElement = event.currentTarget.cloneNode(true);
        dragElement.style.width = `${event.currentTarget.offsetWidth}px`;
        dragElement.style.opacity = '0.7';
        dragElement.style.position = 'absolute';
        dragElement.style.top = '-1000px';
        document.body.appendChild(dragElement);
        
        event.dataTransfer.setDragImage(dragElement, 20, 20);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', event.currentTarget.dataset.id);
        
        this.dragElement = dragElement;
        
        // 添加拖拽样式
        event.currentTarget.classList.add('dragging');
    }
    
    /**
     * 处理拖拽结束
     */
    handleDragEnd(event) {
        this.state.isDragging = false;
        this.state.dragState = { sourceId: null, targetId: null, position: null };
        
        // 移除拖拽元素
        if (this.dragElement) {
            this.dragElement.remove();
            this.dragElement = null;
        }
        
        // 移除拖拽样式
        const draggingElements = this.container.querySelectorAll('.dragging');
        draggingElements.forEach(el => el.classList.remove('dragging'));
        
        // 隐藏占位符
        if (this.dragPlaceholder) {
            this.dragPlaceholder.style.display = 'none';
        }
    }
    
    /**
     * 处理拖拽经过
     */
    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }
    
    /**
     * 处理拖拽进入
     */
    handleDragEnter(event) {
        event.preventDefault();
        
        const target = event.currentTarget;
        if (target.classList.contains('category-item')) {
            const targetId = target.dataset.id;
            if (targetId !== this.state.dragState.sourceId) {
                this.state.dragState.targetId = targetId;
                
                // 计算放置位置
                const rect = target.getBoundingClientRect();
                const relativeY = event.clientY - rect.top;
                
                if (relativeY < rect.height / 3) {
                    this.state.dragState.position = 'before';
                } else if (relativeY > (rect.height * 2) / 3) {
                    this.state.dragState.position = 'after';
                } else {
                    this.state.dragState.position = 'inside';
                }
                
                // 显示占位符
                this.showDragPlaceholder(target, this.state.dragState.position);
            }
        }
    }
    
    /**
     * 处理拖拽离开
     */
    handleDragLeave(event) {
        // 隐藏占位符
        if (this.dragPlaceholder) {
            this.dragPlaceholder.style.display = 'none';
        }
    }
    
    /**
     * 处理放置
     */
    async handleDrop(event) {
        event.preventDefault();
        
        const sourceId = this.state.dragState.sourceId;
        const targetId = this.state.dragState.targetId;
        const position = this.state.dragState.position;
        
        if (!sourceId || !targetId || sourceId === targetId) {
            return;
        }
        
        try {
            await this.moveCategory(sourceId, targetId, position);
            Notify.success('分类移动成功');
        } catch (error) {
            console.error('[分类页面] 移动分类失败:', error);
            Notify.error('移动失败', error.message);
        }
    }
    
    /**
     * 显示拖拽占位符
     */
    showDragPlaceholder(target, position) {
        if (!this.dragPlaceholder) return;
        
        const targetRect = target.getBoundingClientRect();
        const containerRect = this.categoriesContainer.getBoundingClientRect();
        
        this.dragPlaceholder.style.display = 'block';
        this.dragPlaceholder.style.position = 'absolute';
        
        switch (position) {
            case 'before':
                this.dragPlaceholder.style.top = `${targetRect.top - containerRect.top}px`;
                this.dragPlaceholder.style.left = `${targetRect.left - containerRect.left}px`;
                this.dragPlaceholder.style.width = `${targetRect.width}px`;
                this.dragPlaceholder.style.height = '2px';
                break;
            case 'after':
                this.dragPlaceholder.style.top = `${targetRect.bottom - containerRect.top}px`;
                this.dragPlaceholder.style.left = `${targetRect.left - containerRect.left}px`;
                this.dragPlaceholder.style.width = `${targetRect.width}px`;
                this.dragPlaceholder.style.height = '2px';
                break;
            case 'inside':
                this.dragPlaceholder.style.top = `${targetRect.top - containerRect.top}px`;
                this.dragPlaceholder.style.left = `${targetRect.left - containerRect.left}px`;
                this.dragPlaceholder.style.width = `${targetRect.width}px`;
                this.dragPlaceholder.style.height = `${targetRect.height}px`;
                this.dragPlaceholder.style.opacity = '0.3';
                break;
        }
    }
    
    /**
     * 移动分类
     */
    async moveCategory(sourceId, targetId, position) {
        const sourceCategory = this.state.categories.find(c => c.id === sourceId);
        const targetCategory = this.state.categories.find(c => c.id === targetId);
        
        if (!sourceCategory || !targetCategory) {
            throw new Error('分类不存在');
        }
        
        // 检查循环引用
        if (this.wouldCreateCycle(sourceId, targetId, position)) {
            throw new Error('不能将分类移动到其子分类中');
        }
        
        // 更新父分类和顺序
        let updatedCategory = { ...sourceCategory };
        
        if (position === 'inside') {
            // 移动到目标分类内部
            updatedCategory.parentId = targetId;
            updatedCategory.order = 0;
        } else {
            // 移动到目标分类前后
            updatedCategory.parentId = targetCategory.parentId;
            
            // 获取兄弟分类并重新排序
            const siblings = this.state.categories.filter(c => 
                c.parentId === targetCategory.parentId && c.id !== sourceId
            );
            
            const targetIndex = siblings.findIndex(c => c.id === targetId);
            if (targetIndex !== -1) {
                if (position === 'before') {
                    updatedCategory.order = targetCategory.order - 1;
                } else {
                    updatedCategory.order = targetCategory.order + 1;
                }
            }
        }
        
        // 保存更新
        if (Config.isOnline()) {
            await Api.categories.update(sourceId, updatedCategory);
        } else {
            await OfflineManager.addToQueue('update_category', updatedCategory);
        }
        
        this.handleCategoryUpdated(updatedCategory);
        
        if (this.options.onCategoryMove) {
            this.options.onCategoryMove(sourceId, targetId, position, this);
        }
    }
    
    /**
     * 检查是否会创建循环引用
     */
    wouldCreateCycle(sourceId, targetId, position) {
        if (position !== 'inside') {
            return false;
        }
        
        // 检查目标分类是否是源分类的子分类
        const checkChildren = (parentId) => {
            const children = this.state.categories.filter(c => c.parentId === parentId);
            for (const child of children) {
                if (child.id === sourceId) {
                    return true;
                }
                if (checkChildren(child.id)) {
                    return true;
                }
            }
            return false;
        };
        
        return checkChildren(sourceId);
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
                    this.createNewCategory();
                }
                break;
                
            case 'Delete':
            case 'Backspace':
                if (this.state.selectedCategories.size > 0) {
                    event.preventDefault();
                    this.bulkDelete();
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
            <div class="categories-page-error">
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
        console.log('[分类页面] 页面显示');
        
        // 刷新数据
        this.refreshCategories();
    }
    
    /**
     * 页面隐藏时的回调
     */
    onHide() {
        console.log('[分类页面] 页面隐藏');
        
        // 清除选择
        this.clearSelection();
    }
    
    /**
     * 获取当前状态
     */
    getState() {
        return {
            categories: this.state.categories,
            filteredCategories: this.state.filteredCategories,
            searchQuery: this.state.searchQuery,
            selectedCategory: this.state.selectedCategory,
            selectedCategories: Array.from(this.state.selectedCategories),
            expandedCategories: Array.from(this.state.expandedCategories),
            stats: this.state.stats
        };
    }
    
    /**
     * 销毁页面
     */
    destroy() {
        // 清除定时器
        clearTimeout(this.searchTimeout);
        
        // 移除拖拽元素
        if (this.dragElement) {
            this.dragElement.remove();
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
        this.categoriesContainer = null;
        this.searchInput = null;
        this.emptyState = null;
        this.dragPlaceholder = null;
        
        console.log('[分类页面] 已销毁');
    }
}
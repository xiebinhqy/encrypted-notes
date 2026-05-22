/**
 * 笔记编辑器组件
 * 支持Markdown、富文本编辑，实时预览，语法高亮等功能
 */

import Utils from '../../core/utils.js';
import Config from '../../config.js';
import Api from '../../api/index.js';
import OfflineManager from '../../core/offline.js';

export class NoteEditor {
    constructor(app, options = {}) {
        this.app = app;
        this.container = null;
        this.options = {
            mode: 'markdown', // 'markdown', 'rich-text', 'split'
            theme: 'dark',
            autoSave: true,
            autoSaveInterval: 5000,
            showToolbar: true,
            showStatusBar: true,
            enableFullscreen: true,
            enableSpellCheck: true,
            enableAutoComplete: true,
            ...options
        };
        
        this.state = {
            id: null,
            title: '',
            content: '',
            category: '',
            tags: [],
            isEncrypted: true,
            isDirty: false,
            isSaving: false,
            isFullscreen: false,
            wordCount: 0,
            charCount: 0,
            lastSaveTime: null,
            lastAutoSaveTime: null,
            previewHtml: '',
            cursorPosition: 0,
            selectionRange: null
        };
        
        this.autoSaveTimer = null;
        this.debounceTimer = null;
        this.isInitialized = false;
        
        this.init();
    }
    
    /**
     * 初始化编辑器
     */
    async init() {
        // 加载编辑器配置
        this.loadConfig();
        
        // 初始化事件监听
        this.setupEventListeners();
        
        // 初始化Markdown解析器
        await this.initMarkdownParser();
        
        this.isInitialized = true;
    }
    
    /**
     * 加载配置
     */
    loadConfig() {
        const savedConfig = Utils.storage.get('editor_config', {});
        this.options = { ...this.options, ...savedConfig };
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听主题变化
        document.addEventListener('app:theme-change', (e) => {
            this.handleThemeChange(e.detail);
        });
        
        // 监听键盘事件
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
        
        // 监听离线状态
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }
    
    /**
     * 初始化Markdown解析器
     */
    async initMarkdownParser() {
        // 这里可以动态加载Markdown解析库
        // 目前先使用简单的实现
        console.log('[编辑器] Markdown解析器初始化完成');
    }
    
    /**
     * 渲染组件
     */
    async render(container) {
        this.container = container;
        
        // 渲染编辑器结构
        container.innerHTML = this.getTemplate();
        
        // 缓存DOM元素
        this.cacheElements();
        
        // 绑定事件
        this.bindEvents();
        
        // 初始化编辑器实例
        await this.initEditorInstance();
        
        // 如果启用了自动保存，启动定时器
        if (this.options.autoSave) {
            this.startAutoSave();
        }
        
        // 更新状态栏
        this.updateStatusBar();
        
        console.log('[编辑器] 组件渲染完成');
    }
    
    /**
     * 获取模板
     */
    getTemplate() {
        const isSplitMode = this.options.mode === 'split';
        const isPreviewOnly = this.options.mode === 'preview';
        const isEditOnly = this.options.mode === 'edit';
        
        return `
            <div class="note-editor ${this.state.isFullscreen ? 'fullscreen' : ''}" data-note-id="${this.state.id || ''}">
                <!-- 编辑器工具栏 -->
                ${this.options.showToolbar ? this.getToolbarTemplate() : ''}
                
                <!-- 编辑器主体 -->
                <div class="editor-main">
                    <!-- 编辑区域 -->
                    <div class="editor-content ${isSplitMode ? 'split' : ''} ${isPreviewOnly ? 'preview-only' : ''}">
                        <!-- 左侧编辑区 -->
                        <div class="edit-area ${isSplitMode ? 'split-view' : 'full-view'} ${isPreviewOnly ? 'hidden' : ''}">
                            <!-- 标题输入 -->
                            <div class="title-container mb-4">
                                <input type="text" 
                                       id="note-title-input" 
                                       class="note-title-input" 
                                       placeholder="输入笔记标题" 
                                       value="${Utils.escapeHtml(this.state.title)}"
                                       maxlength="200">
                                <div class="title-actions">
                                    <button class="title-action-btn encrypt-toggle ${this.state.isEncrypted ? 'active' : ''}" 
                                            title="${this.state.isEncrypted ? '已加密' : '未加密'}">
                                        <i class="fas fa-${this.state.isEncrypted ? 'lock' : 'lock-open'}"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- 编辑器工具栏（内联） -->
                            <div class="inline-toolbar">
                                ${this.getInlineToolbarTemplate()}
                            </div>
                            
                            <!-- 编辑器容器 -->
                            <div class="editor-container">
                                <textarea id="note-content-editor" 
                                          class="note-content-editor"
                                          placeholder="开始输入笔记内容...&#10;&#10;支持Markdown语法：&#10;# 标题&#10;## 二级标题&#10;**粗体** *斜体*&#10;- 列表项&#10;1. 有序列表&#10;> 引用&#10;\`\`\`代码块\`\`\`&#10;[链接](url) ![图片](url)"
                                          spellcheck="${this.options.enableSpellCheck}"
                                          autocomplete="${this.options.enableAutoComplete ? 'on' : 'off'}">${Utils.escapeHtml(this.state.content)}</textarea>
                                <div class="editor-placeholder">开始输入笔记内容...</div>
                            </div>
                        </div>
                        
                        <!-- 分割线（分割模式时显示） -->
                        ${isSplitMode ? '<div class="editor-splitter"></div>' : ''}
                        
                        <!-- 右侧预览区 -->
                        <div class="preview-area ${isSplitMode ? 'split-view' : 'full-view'} ${isEditOnly ? 'hidden' : ''}">
                            <div class="preview-header">
                                <h3 class="preview-title">预览</h3>
                                <div class="preview-actions">
                                    <button class="preview-action-btn refresh-preview" title="刷新预览">
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                    <button class="preview-action-btn export-html" title="导出为HTML">
                                        <i class="fas fa-download"></i>
                                    </button>
                                </div>
                            </div>
                            <div id="note-preview" class="note-preview">
                                ${this.state.previewHtml || '<div class="preview-empty">输入内容后预览将在此显示</div>'}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 编辑器状态栏 -->
                ${this.options.showStatusBar ? this.getStatusBarTemplate() : ''}
                
                <!-- 标签和分类区域 -->
                <div class="editor-metadata">
                    ${this.getMetadataTemplate()}
                </div>
            </div>
        `;
    }
    
    /**
     * 获取工具栏模板
     */
    getToolbarTemplate() {
        return `
            <div class="editor-toolbar">
                <!-- 左侧：文件操作 -->
                <div class="toolbar-left">
                    <div class="toolbar-group">
                        <button class="toolbar-btn new-note" title="新建笔记 (Ctrl+N)">
                            <i class="fas fa-file"></i>
                            <span class="btn-text">新建</span>
                        </button>
                        <button class="toolbar-btn save-note ${this.state.isSaving ? 'saving' : ''}" title="保存笔记 (Ctrl+S)">
                            <i class="fas fa-${this.state.isSaving ? 'spinner fa-spin' : 'save'}"></i>
                            <span class="btn-text">${this.state.isSaving ? '保存中...' : '保存'}</span>
                        </button>
                        <button class="toolbar-btn save-as" title="另存为">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    
                    <div class="toolbar-divider"></div>
                    
                    <!-- 编辑操作 -->
                    <div class="toolbar-group">
                        <button class="toolbar-btn undo" title="撤销 (Ctrl+Z)">
                            <i class="fas fa-undo"></i>
                        </button>
                        <button class="toolbar-btn redo" title="重做 (Ctrl+Y)">
                            <i class="fas fa-redo"></i>
                        </button>
                    </div>
                    
                    <div class="toolbar-divider"></div>
                    
                    <!-- 格式操作 -->
                    <div class="toolbar-group">
                        <button class="toolbar-btn" data-format="bold" title="粗体 (Ctrl+B)">
                            <i class="fas fa-bold"></i>
                        </button>
                        <button class="toolbar-btn" data-format="italic" title="斜体 (Ctrl+I)">
                            <i class="fas fa-italic"></i>
                        </button>
                        <button class="toolbar-btn" data-format="underline" title="下划线 (Ctrl+U)">
                            <i class="fas fa-underline"></i>
                        </button>
                        <button class="toolbar-btn" data-format="strikethrough" title="删除线">
                            <i class="fas fa-strikethrough"></i>
                        </button>
                    </div>
                </div>
                
                <!-- 中间：模式切换和搜索 -->
                <div class="toolbar-center">
                    <!-- 编辑模式切换 -->
                    <div class="mode-switcher">
                        <button class="mode-btn ${this.options.mode === 'edit' ? 'active' : ''}" data-mode="edit" title="仅编辑">
                            <i class="fas fa-edit"></i>
                            <span>编辑</span>
                        </button>
                        <button class="mode-btn ${this.options.mode === 'split' ? 'active' : ''}" data-mode="split" title="分割视图">
                            <i class="fas fa-columns"></i>
                            <span>分割</span>
                        </button>
                        <button class="mode-btn ${this.options.mode === 'preview' ? 'active' : ''}" data-mode="preview" title="仅预览">
                            <i class="fas fa-eye"></i>
                            <span>预览</span>
                        </button>
                    </div>
                    
                    <!-- 搜索框 -->
                    <div class="search-box">
                        <input type="text" class="search-input" placeholder="在笔记中搜索...">
                        <button class="search-btn" title="搜索 (Ctrl+F)">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>
                
                <!-- 右侧：工具和设置 -->
                <div class="toolbar-right">
                    <!-- 插入菜单 -->
                    <div class="toolbar-group">
                        <button class="toolbar-btn insert-menu" title="插入内容">
                            <i class="fas fa-plus"></i>
                            <span>插入</span>
                        </button>
                    </div>
                    
                    <div class="toolbar-divider"></div>
                    
                    <!-- 更多工具 -->
                    <div class="toolbar-group">
                        <button class="toolbar-btn word-count" title="字数统计">
                            <i class="fas fa-text-width"></i>
                            <span id="word-count-display">${this.state.wordCount}</span>
                        </button>
                        <button class="toolbar-btn fullscreen-toggle ${this.state.isFullscreen ? 'active' : ''}" title="${this.state.isFullscreen ? '退出全屏 (F11)' : '全屏 (F11)'}">
                            <i class="fas fa-${this.state.isFullscreen ? 'compress' : 'expand'}"></i>
                        </button>
                        <button class="toolbar-btn settings" title="编辑器设置">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取内联工具栏模板
     */
    getInlineToolbarTemplate() {
        return `
            <div class="inline-toolbar-content">
                <button class="inline-btn" data-format="h1" title="一级标题">H1</button>
                <button class="inline-btn" data-format="h2" title="二级标题">H2</button>
                <button class="inline-btn" data-format="h3" title="三级标题">H3</button>
                <div class="inline-divider"></div>
                <button class="inline-btn" data-format="link" title="插入链接">
                    <i class="fas fa-link"></i>
                </button>
                <button class="inline-btn" data-format="image" title="插入图片">
                    <i class="fas fa-image"></i>
                </button>
                <button class="inline-btn" data-format="code" title="插入代码">
                    <i class="fas fa-code"></i>
                </button>
                <div class="inline-divider"></div>
                <button class="inline-btn" data-format="ul" title="无序列表">
                    <i class="fas fa-list-ul"></i>
                </button>
                <button class="inline-btn" data-format="ol" title="有序列表">
                    <i class="fas fa-list-ol"></i>
                </button>
                <button class="inline-btn" data-format="checklist" title="检查列表">
                    <i class="fas fa-tasks"></i>
                </button>
                <div class="inline-divider"></div>
                <button class="inline-btn" data-format="quote" title="引用">
                    <i class="fas fa-quote-right"></i>
                </button>
                <button class="inline-btn" data-format="table" title="插入表格">
                    <i class="fas fa-table"></i>
                </button>
                <button class="inline-btn" data-format="hr" title="水平线">
                    <i class="fas fa-minus"></i>
                </button>
            </div>
        `;
    }
    
    /**
     * 获取状态栏模板
     */
    getStatusBarTemplate() {
        const lastSaveTime = this.state.lastSaveTime ? 
            Utils.formatDate(this.state.lastSaveTime, 'relative') : '从未保存';
        
        return `
            <div class="editor-statusbar">
                <!-- 左侧：状态信息 -->
                <div class="status-left">
                    <span class="status-item">
                        <i class="fas fa-font"></i>
                        <span>字数: <strong>${this.state.wordCount}</strong></span>
                    </span>
                    <span class="status-item">
                        <i class="fas fa-keyboard"></i>
                        <span>字符: <strong>${this.state.charCount}</strong></span>
                    </span>
                    <span class="status-item">
                        <i class="fas fa-${this.state.isEncrypted ? 'lock' : 'lock-open'}"></i>
                        <span>${this.state.isEncrypted ? '已加密' : '未加密'}</span>
                    </span>
                </div>
                
                <!-- 中间：保存状态 -->
                <div class="status-center">
                    ${this.state.isDirty ? `
                        <span class="status-item dirty">
                            <i class="fas fa-circle"></i>
                            <span>未保存的更改</span>
                        </span>
                    ` : `
                        <span class="status-item saved">
                            <i class="fas fa-check-circle"></i>
                            <span>已保存</span>
                        </span>
                    `}
                    
                    ${this.state.isSaving ? `
                        <span class="status-item saving">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>保存中...</span>
                        </span>
                    ` : ''}
                    
                    <span class="status-item last-save" title="最后保存时间: ${this.state.lastSaveTime ? new Date(this.state.lastSaveTime).toLocaleString() : '无'}">
                        <i class="fas fa-clock"></i>
                        <span>${lastSaveTime}</span>
                    </span>
                </div>
                
                <!-- 右侧：编辑信息 -->
                <div class="status-right">
                    <span class="status-item">
                        <i class="fas fa-${navigator.onLine ? 'wifi' : 'wifi-slash'}"></i>
                        <span>${navigator.onLine ? '在线' : '离线'}</span>
                    </span>
                    <span class="status-item cursor-position">
                        行: <strong>1</strong>, 列: <strong>1</strong>
                    </span>
                    <span class="status-item encoding">
                        UTF-8
                    </span>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取元数据模板
     */
    getMetadataTemplate() {
        return `
            <div class="metadata-container">
                <!-- 分类选择 -->
                <div class="metadata-group">
                    <label class="metadata-label">
                        <i class="fas fa-folder"></i>
                        <span>分类</span>
                    </label>
                    <div class="category-selector">
                        <select id="note-category-select" class="category-select">
                            <option value="">未分类</option>
                            <option value="work" ${this.state.category === 'work' ? 'selected' : ''}>工作</option>
                            <option value="personal" ${this.state.category === 'personal' ? 'selected' : ''}>个人</option>
                            <option value="study" ${this.state.category === 'study' ? 'selected' : ''}>学习</option>
                        </select>
                        <button class="category-action new-category" title="新建分类">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                
                <!-- 标签管理 -->
                <div class="metadata-group">
                    <label class="metadata-label">
                        <i class="fas fa-tags"></i>
                        <span>标签</span>
                    </label>
                    <div class="tags-container">
                        <div class="tags-input-container">
                            <input type="text" 
                                   id="note-tags-input" 
                                   class="tags-input" 
                                   placeholder="输入标签，按回车添加"
                                   data-tags='${JSON.stringify(this.state.tags)}'>
                            <div class="tags-suggestions"></div>
                        </div>
                        <div class="tags-list">
                            ${this.state.tags.map(tag => `
                                <span class="tag-item" data-tag="${tag}">
                                    <span class="tag-text">${tag}</span>
                                    <button class="tag-remove" data-tag="${tag}">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 缓存DOM元素
     */
    cacheElements() {
        // 标题输入
        this.titleInput = this.container.querySelector('#note-title-input');
        this.encryptToggle = this.container.querySelector('.encrypt-toggle');
        
        // 编辑器元素
        this.editorTextarea = this.container.querySelector('#note-content-editor');
        this.editorContainer = this.container.querySelector('.editor-container');
        this.editorPlaceholder = this.container.querySelector('.editor-placeholder');
        
        // 预览元素
        this.previewArea = this.container.querySelector('#note-preview');
        this.refreshPreviewBtn = this.container.querySelector('.refresh-preview');
        this.exportHtmlBtn = this.container.querySelector('.export-html');
        
        // 工具栏按钮
        this.saveBtn = this.container.querySelector('.save-note');
        this.undoBtn = this.container.querySelector('.undo');
        this.redoBtn = this.container.querySelector('.redo');
        this.fullscreenBtn = this.container.querySelector('.fullscreen-toggle');
        
        // 模式切换按钮
        this.modeBtns = this.container.querySelectorAll('.mode-btn');
        
        // 格式按钮
        this.formatBtns = this.container.querySelectorAll('[data-format]');
        
        // 分类和标签
        this.categorySelect = this.container.querySelector('#note-category-select');
        this.tagsInput = this.container.querySelector('#note-tags-input');
        this.tagsList = this.container.querySelector('.tags-list');
        this.newCategoryBtn = this.container.querySelector('.new-category');
        
        // 状态栏元素
        this.wordCountDisplay = this.container.querySelector('#word-count-display');
        this.cursorPositionDisplay = this.container.querySelector('.cursor-position');
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 标题输入事件
        if (this.titleInput) {
            this.titleInput.addEventListener('input', (e) => this.handleTitleChange(e));
            this.titleInput.addEventListener('blur', () => this.saveNote());
        }
        
        // 加密切换
        if (this.encryptToggle) {
            this.encryptToggle.addEventListener('click', () => this.toggleEncryption());
        }
        
        // 编辑器内容变化
        if (this.editorTextarea) {
            this.editorTextarea.addEventListener('input', (e) => this.handleContentChange(e));
            this.editorTextarea.addEventListener('keydown', (e) => this.handleEditorKeydown(e));
            this.editorTextarea.addEventListener('scroll', () => this.syncPreviewScroll());
            this.editorTextarea.addEventListener('focus', () => this.handleEditorFocus());
            this.editorTextarea.addEventListener('blur', () => this.handleEditorBlur());
            this.editorTextarea.addEventListener('select', () => this.updateSelection());
        }
        
        // 占位符显示/隐藏
        if (this.editorTextarea && this.editorPlaceholder) {
            this.editorTextarea.addEventListener('input', () => this.updatePlaceholder());
        }
        
        // 保存按钮
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.saveNote());
        }
        
        // 撤销/重做按钮
        if (this.undoBtn) this.undoBtn.addEventListener('click', () => this.undo());
        if (this.redoBtn) this.redoBtn.addEventListener('click', () => this.redo());
        
        // 全屏切换
        if (this.fullscreenBtn) {
            this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
        
        // 模式切换
        this.modeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMode(e.target.dataset.mode));
        });
        
        // 格式按钮
        this.formatBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.applyFormat(e.target.dataset.format));
        });
        
        // 预览相关
        if (this.refreshPreviewBtn) {
            this.refreshPreviewBtn.addEventListener('click', () => this.refreshPreview());
        }
        
        if (this.exportHtmlBtn) {
            this.exportHtmlBtn.addEventListener('click', () => this.exportAsHtml());
        }
        
        // 分类和标签
        if (this.categorySelect) {
            this.categorySelect.addEventListener('change', (e) => this.handleCategoryChange(e));
        }
        
        if (this.tagsInput) {
            this.tagsInput.addEventListener('keydown', (e) => this.handleTagInputKeydown(e));
            this.tagsInput.addEventListener('input', (e) => this.handleTagInputChange(e));
        }
        
        if (this.newCategoryBtn) {
            this.newCategoryBtn.addEventListener('click', () => this.createNewCategory());
        }
        
        // 点击标签移除按钮
        if (this.tagsList) {
            this.tagsList.addEventListener('click', (e) => {
                if (e.target.closest('.tag-remove')) {
                    const tag = e.target.closest('.tag-remove').dataset.tag;
                    this.removeTag(tag);
                }
            });
        }
        
        // 窗口大小变化
        window.addEventListener('resize', () => this.handleResize());
        
        // 粘贴事件处理
        document.addEventListener('paste', (e) => this.handlePaste(e));
        
        // 拖放事件
        this.container.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.container.addEventListener('drop', (e) => this.handleDrop(e));
    }
    
    /**
     * 初始化编辑器实例
     */
    async initEditorInstance() {
        // 更新占位符状态
        this.updatePlaceholder();
        
        // 初始化字数统计
        this.updateWordCount();
        
        // 初始化预览
        await this.refreshPreview();
        
        // 如果有内容，标记为脏数据
        if (this.state.content || this.state.title) {
            this.state.isDirty = true;
        }
        
        console.log('[编辑器] 编辑器实例初始化完成');
    }
    
    /**
     * 处理标题变化
     */
    handleTitleChange(event) {
        const newTitle = event.target.value;
        if (newTitle !== this.state.title) {
            this.state.title = newTitle;
            this.state.isDirty = true;
            this.updateStatusBar();
        }
    }
    
    /**
     * 处理内容变化
     */
    handleContentChange(event) {
        const newContent = event.target.value;
        
        if (newContent !== this.state.content) {
            this.state.content = newContent;
            this.state.isDirty = true;
            
            // 更新字数统计
            this.updateWordCount();
            
            // 更新预览（防抖）
            this.debouncePreview();
            
            // 更新状态栏
            this.updateStatusBar();
            
            // 触发自动保存
            if (this.options.autoSave) {
                this.scheduleAutoSave();
            }
        }
    }
    
    /**
     * 处理编辑器键盘事件
     */
    handleEditorKeydown(event) {
        // 保存快捷键 Ctrl+S
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            this.saveNote();
        }
        
        // 格式化快捷键
        if ((event.ctrlKey || event.metaKey)) {
            switch (event.key) {
                case 'b': // 粗体
                    event.preventDefault();
                    this.applyFormat('bold');
                    break;
                case 'i': // 斜体
                    event.preventDefault();
                    this.applyFormat('italic');
                    break;
                case 'u': // 下划线
                    event.preventDefault();
                    this.applyFormat('underline');
                    break;
                case 'k': // 链接
                    event.preventDefault();
                    this.applyFormat('link');
                    break;
                case 'e': // 代码
                    event.preventDefault();
                    this.applyFormat('code');
                    break;
                case 'h': // 标题
                    event.preventDefault();
                    this.applyFormat('h1');
                    break;
            }
        }
        
        // Tab键处理
        if (event.key === 'Tab') {
            event.preventDefault();
            this.insertText('    '); // 插入4个空格
        }
        
        // 更新光标位置
        this.updateCursorPosition();
    }
    
    /**
     * 处理全局键盘事件
     */
    handleGlobalKeydown(event) {
        // 全屏切换 F11
        if (event.key === 'F11') {
            event.preventDefault();
            this.toggleFullscreen();
        }
        
        // 搜索快捷键 Ctrl+F
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            this.focusSearch();
        }
        
        // 新建笔记 Ctrl+N
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            this.createNewNote();
        }
    }
    
    /**
     * 切换加密状态
     */
    toggleEncryption() {
        this.state.isEncrypted = !this.state.isEncrypted;
        
        // 更新UI
        if (this.encryptToggle) {
            const icon = this.encryptToggle.querySelector('i');
            icon.className = `fas fa-${this.state.isEncrypted ? 'lock' : 'lock-open'}`;
            this.encryptToggle.title = this.state.isEncrypted ? '已加密' : '未加密';
            this.encryptToggle.classList.toggle('active', this.state.isEncrypted);
        }
        
        this.state.isDirty = true;
        this.updateStatusBar();
        
        console.log(`[编辑器] 加密状态切换为: ${this.state.isEncrypted ? '已加密' : '未加密'}`);
    }
    
    /**
     * 切换全屏模式
     */
    toggleFullscreen() {
        this.state.isFullscreen = !this.state.isFullscreen;
        
        // 更新容器类
        this.container.classList.toggle('fullscreen', this.state.isFullscreen);
        
        // 更新按钮
        if (this.fullscreenBtn) {
            const icon = this.fullscreenBtn.querySelector('i');
            icon.className = `fas fa-${this.state.isFullscreen ? 'compress' : 'expand'}`;
            this.fullscreenBtn.title = this.state.isFullscreen ? '退出全屏 (F11)' : '全屏 (F11)';
            this.fullscreenBtn.classList.toggle('active', this.state.isFullscreen);
        }
        
        // 添加/移除全屏类到body
        if (this.state.isFullscreen) {
            document.body.classList.add('editor-fullscreen');
        } else {
            document.body.classList.remove('editor-fullscreen');
        }
        
        // 触发resize事件
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    }
    
    /**
     * 切换编辑模式
     */
    switchMode(mode) {
        if (this.options.mode === mode) return;
        
        this.options.mode = mode;
        
        // 更新按钮状态
        this.modeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // 更新UI显示
        const editArea = this.container.querySelector('.edit-area');
        const previewArea = this.container.querySelector('.preview-area');
        const splitter = this.container.querySelector('.editor-splitter');
        
        switch (mode) {
            case 'edit':
                editArea.classList.remove('hidden', 'split-view');
                editArea.classList.add('full-view');
                if (previewArea) previewArea.classList.add('hidden');
                if (splitter) splitter.classList.add('hidden');
                break;
            case 'preview':
                if (editArea) editArea.classList.add('hidden');
                if (previewArea) {
                    previewArea.classList.remove('hidden', 'split-view');
                    previewArea.classList.add('full-view');
                }
                if (splitter) splitter.classList.add('hidden');
                break;
            case 'split':
                if (editArea) {
                    editArea.classList.remove('hidden', 'full-view');
                    editArea.classList.add('split-view');
                }
                if (previewArea) {
                    previewArea.classList.remove('hidden', 'full-view');
                    previewArea.classList.add('split-view');
                }
                if (splitter) splitter.classList.remove('hidden');
                break;
        }
        
        // 保存配置
        this.saveConfig();
        
        // 刷新预览
        this.refreshPreview();
    }
    
    /**
     * 应用格式
     */
    applyFormat(format) {
        if (!this.editorTextarea) return;
        
        const textarea = this.editorTextarea;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        
        let newText = '';
        let newCursorStart = start;
        let newCursorEnd = end;
        
        switch (format) {
            case 'bold':
                newText = `**${selectedText || '加粗文本'}**`;
                if (!selectedText) {
                    newCursorStart = start + 2;
                    newCursorEnd = end + 2;
                }
                break;
            case 'italic':
                newText = `*${selectedText || '斜体文本'}*`;
                if (!selectedText) {
                    newCursorStart = start + 1;
                    newCursorEnd = end + 1;
                }
                break;
            case 'underline':
                newText = `<u>${selectedText || '下划线文本'}</u>`;
                if (!selectedText) {
                    newCursorStart = start + 3;
                    newCursorEnd = end + 3;
                }
                break;
            case 'strikethrough':
                newText = `~~${selectedText || '删除文本'}~~`;
                if (!selectedText) {
                    newCursorStart = start + 2;
                    newCursorEnd = end + 2;
                }
                break;
            case 'h1':
                newText = `# ${selectedText || '一级标题'}`;
                if (!selectedText) {
                    newCursorStart = start + 2;
                    newCursorEnd = end + 2;
                }
                break;
            case 'h2':
                newText = `## ${selectedText || '二级标题'}`;
                if (!selectedText) {
                    newCursorStart = start + 3;
                    newCursorEnd = end + 3;
                }
                break;
            case 'h3':
                newText = `### ${selectedText || '三级标题'}`;
                if (!selectedText) {
                    newCursorStart = start + 4;
                    newCursorEnd = end + 4;
                }
                break;
            case 'link':
                newText = `[${selectedText || '链接文本'}](https://example.com)`;
                if (!selectedText) {
                    newCursorStart = start + 1;
                    newCursorEnd = end + 1;
                } else {
                    newCursorStart = start + selectedText.length + 3;
                    newCursorEnd = newCursorStart + 19; // https://example.com 的长度
                }
                break;
            case 'image':
                newText = `![${selectedText || '图片描述'}](https://example.com/image.jpg)`;
                if (!selectedText) {
                    newCursorStart = start + 2;
                    newCursorEnd = end + 2;
                } else {
                    newCursorStart = start + selectedText.length + 4;
                    newCursorEnd = newCursorStart + 28; // https://example.com/image.jpg 的长度
                }
                break;
            case 'code':
                if (selectedText.includes('\n')) {
                    newText = `\`\`\`\n${selectedText || '代码块'}\n\`\`\``;
                    if (!selectedText) {
                        newCursorStart = start + 4;
                        newCursorEnd = end + 4;
                    }
                } else {
                    newText = `\`${selectedText || '代码'}\``;
                    if (!selectedText) {
                        newCursorStart = start + 1;
                        newCursorEnd = end + 1;
                    }
                }
                break;
            case 'ul':
                newText = this.wrapLines(selectedText || '列表项', '- ');
                break;
            case 'ol':
                newText = this.wrapLines(selectedText || '列表项', '1. ');
                break;
            case 'checklist':
                newText = this.wrapLines(selectedText || '任务项', '- [ ] ');
                break;
            case 'quote':
                newText = this.wrapLines(selectedText || '引用文本', '> ');
                break;
            case 'table':
                newText = this.insertTable();
                break;
            case 'hr':
                newText = '\n---\n';
                newCursorStart = start + 5;
                newCursorEnd = newCursorStart;
                break;
        }
        
        // 插入文本
        this.insertText(newText, newCursorStart, newCursorEnd);
        
        // 标记为脏数据
        this.state.isDirty = true;
        this.updateStatusBar();
    }
    
    /**
     * 包装多行文本
     */
    wrapLines(text, prefix) {
        const lines = text.split('\n');
        return lines.map(line => prefix + line).join('\n');
    }
    
    /**
     * 插入表格
     */
    insertTable() {
        return `
| 标题1 | 标题2 | 标题3 |
|-------|-------|-------|
| 内容1 | 内容2 | 内容3 |
| 内容4 | 内容5 | 内容6 |
`;
    }
    
    /**
     * 插入文本
     */
    insertText(text, cursorStart = null, cursorEnd = null) {
        if (!this.editorTextarea) return;
        
        const textarea = this.editorTextarea;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        // 保存当前值
        const currentValue = textarea.value;
        
        // 插入新文本
        const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
        textarea.value = newValue;
        
        // 更新内容状态
        this.state.content = newValue;
        this.state.isDirty = true;
        
        // 设置光标位置
        if (cursorStart !== null && cursorEnd !== null) {
            textarea.setSelectionRange(cursorStart, cursorEnd);
        } else {
            const newPosition = start + text.length;
            textarea.setSelectionRange(newPosition, newPosition);
        }
        
        // 触发输入事件
        textarea.dispatchEvent(new Event('input'));
        
        // 聚焦到编辑器
        textarea.focus();
    }
    
    /**
     * 更新占位符显示
     */
    updatePlaceholder() {
        if (!this.editorTextarea || !this.editorPlaceholder) return;
        
        if (this.editorTextarea.value.trim() === '') {
            this.editorPlaceholder.classList.remove('hidden');
        } else {
            this.editorPlaceholder.classList.add('hidden');
        }
    }
    
    /**
     * 更新字数统计
     */
    updateWordCount() {
        const content = this.state.content;
        
        // 计算字数（中文字符算一个字，英文单词算一个字）
        const chineseChars = content.match(/[\u4e00-\u9fa5]/g) || [];
        const englishWords = content.replace(/[\u4e00-\u9fa5]/g, ' ')
                                   .split(/\s+/)
                                   .filter(word => word.length > 0);
        
        this.state.wordCount = chineseChars.length + englishWords.length;
        this.state.charCount = content.length;
        
        // 更新显示
        if (this.wordCountDisplay) {
            this.wordCountDisplay.textContent = this.state.wordCount;
        }
        
        // 更新状态栏
        this.updateStatusBar();
    }
    
    /**
     * 更新光标位置
     */
    updateCursorPosition() {
        if (!this.editorTextarea || !this.cursorPositionDisplay) return;
        
        const textarea = this.editorTextarea;
        const cursorPos = textarea.selectionStart;
        const value = textarea.value;
        
        // 计算行和列
        const textBeforeCursor = value.substring(0, cursorPos);
        const lines = textBeforeCursor.split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        
        // 更新显示
        this.cursorPositionDisplay.innerHTML = `行: <strong>${line}</strong>, 列: <strong>${column}</strong>`;
    }
    
    /**
     * 更新选择范围
     */
    updateSelection() {
        if (!this.editorTextarea) return;
        
        const textarea = this.editorTextarea;
        this.state.selectionRange = {
            start: textarea.selectionStart,
            end: textarea.selectionEnd
        };
    }
    
    /**
     * 更新状态栏
     */
    updateStatusBar() {
        // 这里的状态栏已经在模板中动态更新了
        // 如果需要更复杂的更新，可以在这里实现
    }
    
    /**
     * 防抖预览更新
     */
    debouncePreview() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(() => {
            this.refreshPreview();
        }, 300);
    }
    
    /**
     * 刷新预览
     */
    async refreshPreview() {
        if (!this.previewArea) return;
        
        try {
            // 简单的Markdown转换
            const html = this.markdownToHtml(this.state.content);
            this.state.previewHtml = html;
            
            // 更新预览区域
            this.previewArea.innerHTML = html;
            
            // 添加代码高亮
            this.highlightCode();
            
        } catch (error) {
            console.error('[编辑器] 预览刷新失败:', error);
            this.previewArea.innerHTML = `
                <div class="preview-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>预览生成失败: ${error.message}</p>
                </div>
            `;
        }
    }
    
    /**
     * Markdown转HTML
     */
    markdownToHtml(markdown) {
        if (!markdown.trim()) {
            return '<div class="preview-empty">输入内容后预览将在此显示</div>';
        }
        
        // 简单的Markdown解析（实际项目中应该使用完整的Markdown解析器）
        let html = markdown
            // 标题
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
            .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
            // 粗体
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            // 斜体
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            // 删除线
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            // 下划线
            .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
            // 代码
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // 代码块
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            // 引用
            .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
            // 水平线
            .replace(/^---$/gm, '<hr>')
            // 无序列表
            .replace(/^\s*[-*+] (.*$)/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            // 有序列表
            .replace(/^\s*\d+\. (.*$)/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>')
            // 链接
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
            // 图片
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="preview-image">')
            // 换行
            .replace(/\n/g, '<br>')
            // 段落
            .replace(/<br><br>/g, '</p><p>')
            .replace(/^([^<].*)/gm, '<p>$1</p>');
        
        return html;
    }
    
    /**
     * 代码高亮
     */
    highlightCode() {
        const codeBlocks = this.previewArea.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            block.classList.add('language-unknown');
            // 这里可以添加更复杂的代码高亮逻辑
        });
    }
    
    /**
     * 同步预览滚动
     */
    syncPreviewScroll() {
        // 实现编辑器和预览的滚动同步
        // 这里可以添加滚动同步逻辑
    }
    
    /**
     * 处理分类变化
     */
    handleCategoryChange(event) {
        this.state.category = event.target.value;
        this.state.isDirty = true;
        this.updateStatusBar();
    }
    
    /**
     * 处理标签输入
     */
    handleTagInputKeydown(event) {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            this.addTag(this.tagsInput.value.trim());
            this.tagsInput.value = '';
        } else if (event.key === 'Backspace' && this.tagsInput.value === '') {
            // 如果输入框为空，按退格键删除最后一个标签
            if (this.state.tags.length > 0) {
                this.removeTag(this.state.tags[this.state.tags.length - 1]);
            }
        }
    }
    
    /**
     * 处理标签输入变化
     */
    handleTagInputChange(event) {
        // 这里可以添加标签自动完成功能
    }
    
    /**
     * 添加标签
     */
    addTag(tag) {
        if (!tag || this.state.tags.includes(tag)) return;
        
        this.state.tags.push(tag);
        this.state.isDirty = true;
        
        // 更新UI
        this.updateTagsDisplay();
        this.updateStatusBar();
    }
    
    /**
     * 移除标签
     */
    removeTag(tag) {
        this.state.tags = this.state.tags.filter(t => t !== tag);
        this.state.isDirty = true;
        
        // 更新UI
        this.updateTagsDisplay();
        this.updateStatusBar();
    }
    
    /**
     * 更新标签显示
     */
    updateTagsDisplay() {
        if (!this.tagsList) return;
        
        this.tagsList.innerHTML = this.state.tags.map(tag => `
            <span class="tag-item" data-tag="${tag}">
                <span class="tag-text">${tag}</span>
                <button class="tag-remove" data-tag="${tag}">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `).join('');
        
        // 更新输入框的data-tags属性
        if (this.tagsInput) {
            this.tagsInput.dataset.tags = JSON.stringify(this.state.tags);
        }
    }
    
    /**
     * 创建新分类
     */
    createNewCategory() {
        const categoryName = prompt('请输入新分类的名称:');
        if (categoryName) {
            // 这里应该调用API创建分类
            console.log(`创建新分类: ${categoryName}`);
            
            // 添加到选择框
            const option = document.createElement('option');
            option.value = categoryName.toLowerCase().replace(/\s+/g, '-');
            option.textContent = categoryName;
            this.categorySelect.appendChild(option);
            
            // 选中新分类
            this.categorySelect.value = option.value;
            this.handleCategoryChange({ target: this.categorySelect });
        }
    }
    
    /**
     * 保存笔记
     */
    async saveNote() {
        if (!this.state.isDirty) return;
        
        // 验证数据
        if (!this.state.title.trim() && !this.state.content.trim()) {
            this.app.showNotification('笔记标题和内容不能都为空', 'warning');
            return;
        }
        
        this.state.isSaving = true;
        this.updateStatusBar();
        
        try {
            const noteData = {
                id: this.state.id || Utils.generateId('note_'),
                title: this.state.title.trim() || '未命名笔记',
                content: this.state.content,
                category: this.state.category,
                tags: this.state.tags,
                isEncrypted: this.state.isEncrypted,
                createdAt: this.state.id ? undefined : new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // 加密内容
            if (this.state.isEncrypted) {
                // 这里应该使用用户的加密密钥加密内容
                // noteData.content = await Utils.encryptText(noteData.content, encryptionKey);
            }
            
            let result;
            
            if (Config.isOnline()) {
                // 在线模式：调用API
                if (this.state.id) {
                    result = await Api.notes.update(this.state.id, noteData);
                } else {
                    result = await Api.notes.create(noteData);
                }
            } else {
                // 离线模式：添加到同步队列
                const operation = this.state.id ? 'update_note' : 'create_note';
                await OfflineManager.addToQueue(operation, noteData);
                result = { data: noteData, success: true };
            }
            
            if (result.success) {
                this.state.id = result.data.id || noteData.id;
                this.state.isDirty = false;
                this.state.lastSaveTime = new Date().toISOString();
                this.state.isSaving = false;
                
                this.updateStatusBar();
                this.app.showNotification('笔记保存成功', 'success');
                
                // 触发保存完成事件
                document.dispatchEvent(new CustomEvent('note:saved', {
                    detail: { note: result.data }
                }));
            } else {
                throw new Error(result.error || '保存失败');
            }
            
        } catch (error) {
            console.error('[编辑器] 保存笔记失败:', error);
            this.state.isSaving = false;
            this.updateStatusBar();
            
            this.app.showNotification(`保存失败: ${error.message}`, 'error');
            
            // 保存到本地草稿
            this.saveAsDraft();
        }
    }
    
    /**
     * 另存为草稿
     */
    saveAsDraft() {
        const draft = {
            id: this.state.id,
            title: this.state.title,
            content: this.state.content,
            category: this.state.category,
            tags: this.state.tags,
            isEncrypted: this.state.isEncrypted,
            updatedAt: new Date().toISOString()
        };
        
        // 保存到本地存储
        const drafts = Utils.storage.get('note_drafts', {});
        drafts[draft.id] = draft;
        Utils.storage.set('note_drafts', drafts);
        
        this.app.showNotification('已保存为草稿，网络恢复后将自动同步', 'warning');
    }
    
    /**
     * 开始自动保存
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(() => {
            if (this.state.isDirty && !this.state.isSaving) {
                this.scheduleAutoSave();
            }
        }, this.options.autoSaveInterval);
    }
    
    /**
     * 调度自动保存
     */
    scheduleAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
            if (this.state.isDirty && !this.state.isSaving) {
                this.saveNote();
            }
        }, 1000);
    }
    
    /**
     * 导出为HTML
     */
    exportAsHtml() {
        const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.state.title || '未命名笔记'}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #333; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow: auto; }
        code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; }
        blockquote { border-left: 4px solid #ddd; padding-left: 15px; margin-left: 0; color: #666; }
        img { max-width: 100%; height: auto; }
    </style>
</head>
<body>
    <h1>${this.state.title || '未命名笔记'}</h1>
    <div>${this.markdownToHtml(this.state.content)}</div>
    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
        导出自: 我的加密笔记 | 导出时间: ${new Date().toLocaleString()}
    </footer>
</body>
</html>`;
        
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `${this.state.title || '未命名笔记'}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * 加载笔记
     */
    async loadNote(noteId, noteData = null) {
        try {
            let note = noteData;
            
            if (!note && noteId) {
                if (Config.isOnline()) {
                    const result = await Api.notes.get(noteId);
                    note = result.data;
                } else {
                    // 从本地存储加载
                    const localNotes = Utils.storage.get('local_notes', {});
                    note = localNotes[noteId];
                    
                    if (!note) {
                        throw new Error('笔记不存在或未同步到本地');
                    }
                }
            }
            
            if (note) {
                this.state.id = note.id;
                this.state.title = note.title || '';
                this.state.content = note.content || '';
                this.state.category = note.category || '';
                this.state.tags = note.tags || [];
                this.state.isEncrypted = note.isEncrypted !== false;
                this.state.lastSaveTime = note.updatedAt;
                this.state.isDirty = false;
                
                // 更新UI
                if (this.titleInput) this.titleInput.value = this.state.title;
                if (this.editorTextarea) this.editorTextarea.value = this.state.content;
                if (this.categorySelect) this.categorySelect.value = this.state.category;
                
                this.updatePlaceholder();
                this.updateWordCount();
                this.updateTagsDisplay();
                await this.refreshPreview();
                this.updateStatusBar();
                
                console.log(`[编辑器] 笔记加载成功: ${note.title}`);
                
                return true;
            }
            
        } catch (error) {
            console.error('[编辑器] 加载笔记失败:', error);
            this.app.showNotification(`加载笔记失败: ${error.message}`, 'error');
        }
        
        return false;
    }
    
    /**
     * 创建新笔记
     */
    createNewNote() {
        this.state.id = null;
        this.state.title = '';
        this.state.content = '';
        this.state.category = '';
        this.state.tags = [];
        this.state.isEncrypted = true;
        this.state.isDirty = false;
        this.state.lastSaveTime = null;
        
        // 更新UI
        if (this.titleInput) this.titleInput.value = '';
        if (this.editorTextarea) this.editorTextarea.value = '';
        if (this.categorySelect) this.categorySelect.value = '';
        
        this.updatePlaceholder();
        this.updateWordCount();
        this.updateTagsDisplay();
        this.refreshPreview();
        this.updateStatusBar();
        
        // 聚焦到标题输入框
        if (this.titleInput) {
            this.titleInput.focus();
        }
        
        console.log('[编辑器] 创建新笔记');
    }
    
    /**
     * 撤销
     */
    undo() {
        // 实现撤销逻辑
        console.log('[编辑器] 撤销');
    }
    
    /**
     * 重做
     */
    redo() {
        // 实现重做逻辑
        console.log('[编辑器] 重做');
    }
    
    /**
     * 聚焦搜索
     */
    focusSearch() {
        const searchInput = this.container.querySelector('.search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    /**
     * 处理粘贴事件
     */
    handlePaste(event) {
        // 这里可以添加粘贴内容处理逻辑
        // 例如：粘贴图片时上传
    }
    
    /**
     * 处理拖放
     */
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        
        if (event.dataTransfer.types.includes('Files')) {
            event.dataTransfer.dropEffect = 'copy';
            this.container.classList.add('drag-over');
        }
    }
    
    handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        
        this.container.classList.remove('drag-over');
        
        if (event.dataTransfer.files.length > 0) {
            this.handleDroppedFiles(event.dataTransfer.files);
        }
    }
    
    /**
     * 处理拖放的文件
     */
    handleDroppedFiles(files) {
        // 处理拖放的文件（如图片）
        console.log('[编辑器] 拖放文件:', files);
    }
    
    /**
     * 处理窗口大小变化
     */
    handleResize() {
        // 调整编辑器布局
    }
    
    /**
     * 处理主题变化
     */
    handleThemeChange(theme) {
        this.options.theme = theme;
        this.saveConfig();
    }
    
    /**
     * 处理在线状态
     */
    handleOnline() {
        this.updateStatusBar();
        
        // 如果笔记是脏数据，尝试同步
        if (this.state.isDirty) {
            this.saveNote();
        }
    }
    
    handleOffline() {
        this.updateStatusBar();
    }
    
    /**
     * 处理编辑器聚焦
     */
    handleEditorFocus() {
        this.container.classList.add('focused');
    }
    
    /**
     * 处理编辑器失去焦点
     */
    handleEditorBlur() {
        this.container.classList.remove('focused');
    }
    
    /**
     * 处理页面可见性变化
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // 页面隐藏时自动保存
            if (this.state.isDirty) {
                this.saveNote();
            }
        }
    }
    
    /**
     * 保存配置
     */
    saveConfig() {
        Utils.storage.set('editor_config', this.options);
    }
    
    /**
     * 页面显示时的回调
     */
    onShow() {
        console.log('[编辑器] 组件显示');
        
        // 恢复自动保存
        if (this.options.autoSave) {
            this.startAutoSave();
        }
        
        // 聚焦到编辑器
        if (this.editorTextarea && !this.state.content) {
            setTimeout(() => {
                this.editorTextarea.focus();
            }, 100);
        }
    }
    
    /**
     * 页面隐藏时的回调
     */
    onHide() {
        console.log('[编辑器] 组件隐藏');
        
        // 停止自动保存
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = null;
        }
        
        // 自动保存
        if (this.state.isDirty) {
            this.saveNote();
        }
    }
    
    /**
     * 获取当前笔记数据
     */
    getNoteData() {
        return {
            id: this.state.id,
            title: this.state.title,
            content: this.state.content,
            category: this.state.category,
            tags: this.state.tags,
            isEncrypted: this.state.isEncrypted,
            isDirty: this.state.isDirty,
            wordCount: this.state.wordCount,
            charCount: this.state.charCount
        };
    }
    
    /**
     * 设置笔记数据
     */
    setNoteData(noteData) {
        this.state = { ...this.state, ...noteData };
        
        // 更新UI
        if (this.titleInput) this.titleInput.value = this.state.title;
        if (this.editorTextarea) this.editorTextarea.value = this.state.content;
        
        this.updatePlaceholder();
        this.updateWordCount();
        this.refreshPreview();
        this.updateStatusBar();
    }
}
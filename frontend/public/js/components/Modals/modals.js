/**
 * 弹窗集合文件
 * 集中管理应用中所有弹窗组件，提供统一的弹窗创建和管理接口
 */

import { BaseModal } from './BaseModal.js';
import Utils from '../../core/utils.js';
import Config from '../../config.js';
import Api from '../../api/index.js';
import OfflineManager from '../../core/offline.js';

/**
 * 笔记弹窗 - 用于显示和编辑笔记
 */
export class NoteModal extends BaseModal {
    constructor(options = {}) {
        const defaultOptions = {
            id: 'note-modal',
            title: '笔记',
            size: 'lg',
            type: 'form',
            showCloseButton: true,
            backdropClose: false,
            keyboardClose: false,
            buttons: [
                {
                    text: '取消',
                    type: 'secondary',
                    action: (modal) => modal.cancel()
                },
                {
                    text: '保存',
                    type: 'primary',
                    action: (modal) => modal.saveNote()
                }
            ],
            noteId: null,
            noteData: null,
            onSave: null,
            onDelete: null
        };
        
        super({ ...defaultOptions, ...options });
        
        this.noteData = options.noteData || {};
        this.isEncrypted = this.noteData.isEncrypted !== false;
    }
    
    /**
     * 渲染弹窗内容
     */
    render() {
        this.options.content = this.getNoteFormTemplate();
        super.render();
        
        this.cacheNoteElements();
        this.bindNoteEvents();
        this.loadNoteData();
    }
    
    /**
     * 获取笔记表单模板
     */
    getNoteFormTemplate() {
        return `
            <div class="note-modal-form">
                <!-- 标题输入 -->
                <div class="form-group">
                    <label for="note-title" class="form-label">标题</label>
                    <input type="text" 
                           id="note-title" 
                           class="form-control" 
                           placeholder="输入笔记标题"
                           value="${Utils.escapeHtml(this.noteData.title || '')}"
                           maxlength="200">
                </div>
                
                <!-- 分类选择 -->
                <div class="form-group">
                    <label for="note-category" class="form-label">分类</label>
                    <div class="category-select-container">
                        <select id="note-category" class="form-control">
                            <option value="">未分类</option>
                            <option value="work" ${this.noteData.category === 'work' ? 'selected' : ''}>工作</option>
                            <option value="personal" ${this.noteData.category === 'personal' ? 'selected' : ''}>个人</option>
                            <option value="study" ${this.noteData.category === 'study' ? 'selected' : ''}>学习</option>
                        </select>
                        <button type="button" class="btn-category-new" title="新建分类">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                
                <!-- 标签输入 -->
                <div class="form-group">
                    <label class="form-label">标签</label>
                    <div class="tags-input-container">
                        <div class="tags-display" id="tags-display">
                            ${(this.noteData.tags || []).map(tag => `
                                <span class="tag-item" data-tag="${tag}">
                                    ${tag}
                                    <button type="button" class="tag-remove" data-tag="${tag}">×</button>
                                </span>
                            `).join('')}
                        </div>
                        <input type="text" 
                               id="note-tags" 
                               class="form-control" 
                               placeholder="输入标签，按回车添加"
                               data-tags='${JSON.stringify(this.noteData.tags || [])}'>
                    </div>
                </div>
                
                <!-- 内容编辑 -->
                <div class="form-group">
                    <label for="note-content" class="form-label">内容</label>
                    <div class="editor-toolbar mini">
                        <button type="button" class="editor-btn" data-format="bold" title="粗体">
                            <i class="fas fa-bold"></i>
                        </button>
                        <button type="button" class="editor-btn" data-format="italic" title="斜体">
                            <i class="fas fa-italic"></i>
                        </button>
                        <button type="button" class="editor-btn" data-format="link" title="链接">
                            <i class="fas fa-link"></i>
                        </button>
                        <button type="button" class="editor-btn" data-format="code" title="代码">
                            <i class="fas fa-code"></i>
                        </button>
                    </div>
                    <textarea id="note-content" 
                              class="form-control note-content-editor" 
                              rows="10"
                              placeholder="输入笔记内容...">${Utils.escapeHtml(this.noteData.content || '')}</textarea>
                </div>
                
                <!-- 加密选项 -->
                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" 
                               id="note-encrypted" 
                               class="form-check-input" 
                               ${this.isEncrypted ? 'checked' : ''}>
                        <label for="note-encrypted" class="form-check-label">
                            <i class="fas fa-lock"></i>
                            启用端对端加密
                        </label>
                        <small class="form-text text-muted">
                            启用后，笔记内容将在本地加密后再同步到服务器
                        </small>
                    </div>
                </div>
                
                <!-- 统计信息 -->
                <div class="form-group stats-group">
                    <div class="stats-item">
                        <i class="fas fa-font"></i>
                        <span>字数: <span id="word-count">0</span></span>
                    </div>
                    <div class="stats-item">
                        <i class="fas fa-keyboard"></i>
                        <span>字符: <span id="char-count">0</span></span>
                    </div>
                    <div class="stats-item">
                        <i class="fas fa-clock"></i>
                        <span>更新: <span id="update-time">${this.noteData.updated_at ? Utils.formatDate(this.noteData.updated_at, 'relative') : '从未'}</span></span>
                    </div>
                </div>
                
                <!-- 删除按钮 -->
                ${this.options.noteId ? `
                    <div class="form-group danger-zone">
                        <button type="button" class="btn-delete-note">
                            <i class="fas fa-trash"></i>
                            删除笔记
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 缓存笔记相关元素
     */
    cacheNoteElements() {
        this.titleInput = this.content.querySelector('#note-title');
        this.categorySelect = this.content.querySelector('#note-category');
        this.tagsInput = this.content.querySelector('#note-tags');
        this.tagsDisplay = this.content.querySelector('#tags-display');
        this.contentTextarea = this.content.querySelector('#note-content');
        this.encryptedCheckbox = this.content.querySelector('#note-encrypted');
        this.deleteBtn = this.content.querySelector('.btn-delete-note');
        this.newCategoryBtn = this.content.querySelector('.btn-category-new');
        this.editorBtns = this.content.querySelectorAll('.editor-btn');
        
        this.wordCountElement = this.content.querySelector('#word-count');
        this.charCountElement = this.content.querySelector('#char-count');
    }
    
    /**
     * 绑定笔记相关事件
     */
    bindNoteEvents() {
        // 标题输入
        if (this.titleInput) {
            this.titleInput.addEventListener('input', () => this.updateWordCount());
        }
        
        // 内容输入
        if (this.contentTextarea) {
            this.contentTextarea.addEventListener('input', () => this.updateWordCount());
        }
        
        // 标签输入
        if (this.tagsInput) {
            this.tagsInput.addEventListener('keydown', (e) => this.handleTagInputKeydown(e));
        }
        
        // 标签移除
        if (this.tagsDisplay) {
            this.tagsDisplay.addEventListener('click', (e) => {
                if (e.target.classList.contains('tag-remove')) {
                    this.removeTag(e.target.dataset.tag);
                }
            });
        }
        
        // 编辑器按钮
        this.editorBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleEditorButtonClick(e));
        });
        
        // 删除按钮
        if (this.deleteBtn) {
            this.deleteBtn.addEventListener('click', () => this.deleteNote());
        }
        
        // 新建分类按钮
        if (this.newCategoryBtn) {
            this.newCategoryBtn.addEventListener('click', () => this.createNewCategory());
        }
    }
    
    /**
     * 加载笔记数据
     */
    loadNoteData() {
        this.updateWordCount();
    }
    
    /**
     * 更新字数统计
     */
    updateWordCount() {
        const content = this.contentTextarea ? this.contentTextarea.value : '';
        const title = this.titleInput ? this.titleInput.value : '';
        const fullText = title + '\n' + content;
        
        // 计算字数
        const chineseChars = fullText.match(/[\u4e00-\u9fa5]/g) || [];
        const englishWords = fullText.replace(/[\u4e00-\u9fa5]/g, ' ')
                                   .split(/\s+/)
                                   .filter(word => word.length > 0);
        
        const wordCount = chineseChars.length + englishWords.length;
        const charCount = fullText.length;
        
        if (this.wordCountElement) {
            this.wordCountElement.textContent = wordCount;
        }
        
        if (this.charCountElement) {
            this.charCountElement.textContent = charCount;
        }
    }
    
    /**
     * 处理标签输入
     */
    handleTagInputKeydown(event) {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            const tag = this.tagsInput.value.trim();
            if (tag) {
                this.addTag(tag);
                this.tagsInput.value = '';
            }
        }
    }
    
    /**
     * 添加标签
     */
    addTag(tag) {
        const currentTags = JSON.parse(this.tagsInput.dataset.tags || '[]');
        if (!currentTags.includes(tag)) {
            currentTags.push(tag);
            this.tagsInput.dataset.tags = JSON.stringify(currentTags);
            
            const tagElement = document.createElement('span');
            tagElement.className = 'tag-item';
            tagElement.dataset.tag = tag;
            tagElement.innerHTML = `
                ${tag}
                <button type="button" class="tag-remove" data-tag="${tag}">×</button>
            `;
            
            this.tagsDisplay.appendChild(tagElement);
        }
    }
    
    /**
     * 移除标签
     */
    removeTag(tag) {
        const currentTags = JSON.parse(this.tagsInput.dataset.tags || '[]');
        const newTags = currentTags.filter(t => t !== tag);
        this.tagsInput.dataset.tags = JSON.stringify(newTags);
        
        const tagElement = this.tagsDisplay.querySelector(`[data-tag="${tag}"]`);
        if (tagElement) {
            tagElement.remove();
        }
    }
    
    /**
     * 处理编辑器按钮点击
     */
    handleEditorButtonClick(event) {
        const format = event.currentTarget.dataset.format;
        const textarea = this.contentTextarea;
        
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        
        let newText = '';
        let newCursorStart = start;
        
        switch (format) {
            case 'bold':
                newText = `**${selectedText || '粗体文字'}**`;
                if (!selectedText) newCursorStart = start + 2;
                break;
            case 'italic':
                newText = `*${selectedText || '斜体文字'}*`;
                if (!selectedText) newCursorStart = start + 1;
                break;
            case 'link':
                newText = `[${selectedText || '链接文字'}](https://example.com)`;
                if (!selectedText) newCursorStart = start + 1;
                break;
            case 'code':
                newText = `\`${selectedText || '代码'}\``;
                if (!selectedText) newCursorStart = start + 1;
                break;
        }
        
        // 插入文本
        textarea.setRangeText(newText, start, end, 'end');
        textarea.focus();
        
        if (newCursorStart) {
            textarea.setSelectionRange(newCursorStart, newCursorStart + (selectedText || '').length);
        }
        
        this.updateWordCount();
    }
    
    /**
     * 创建新分类
     */
    async createNewCategory() {
        const modal = new CategoryModal({
            title: '新建分类',
            onSave: (category) => {
                // 添加到选择框
                const option = document.createElement('option');
                option.value = category.id || category.name.toLowerCase();
                option.textContent = category.name;
                this.categorySelect.appendChild(option);
                this.categorySelect.value = option.value;
            }
        });
        
        await modal.open();
    }
    
    /**
     * 保存笔记
     */
    async saveNote() {
        const title = this.titleInput ? this.titleInput.value.trim() : '';
        const content = this.contentTextarea ? this.contentTextarea.value : '';
        
        if (!title && !content) {
            this.showError('笔记标题和内容不能都为空');
            return;
        }
        
        const noteData = {
            id: this.options.noteId || Utils.generateId('note_'),
            title: title || '未命名笔记',
            content: content,
            category: this.categorySelect ? this.categorySelect.value : '',
            tags: JSON.parse(this.tagsInput.dataset.tags || '[]'),
            isEncrypted: this.encryptedCheckbox ? this.encryptedCheckbox.checked : true,
            updatedAt: new Date().toISOString()
        };
        
        if (!this.options.noteId) {
            noteData.createdAt = noteData.updatedAt;
        }
        
        // 显示加载状态
        this.showLoading('正在保存笔记...');
        
        try {
            let result;
            
            if (Config.isOnline()) {
                if (this.options.noteId) {
                    result = await Api.notes.update(this.options.noteId, noteData);
                } else {
                    result = await Api.notes.create(noteData);
                }
            } else {
                const operation = this.options.noteId ? 'update_note' : 'create_note';
                await OfflineManager.addToQueue(operation, noteData);
                result = { success: true, data: noteData };
            }
            
            if (result.success) {
                if (this.options.onSave) {
                    await this.options.onSave(result.data, this);
                }
                
                this.showSuccess('笔记保存成功');
                setTimeout(() => this.close(result.data), 1000);
            } else {
                throw new Error(result.error || '保存失败');
            }
            
        } catch (error) {
            console.error('[笔记弹窗] 保存失败:', error);
            this.showError('保存失败', error.message);
        }
    }
    
    /**
     * 删除笔记
     */
    async deleteNote() {
        if (!this.options.noteId) return;
        
        const confirm = await ConfirmModal.show({
            title: '确认删除',
            message: '确定要删除这个笔记吗？此操作不可撤销。',
            confirmText: '删除',
            confirmType: 'danger'
        });
        
        if (confirm) {
            this.showLoading('正在删除笔记...');
            
            try {
                let result;
                
                if (Config.isOnline()) {
                    result = await Api.notes.delete(this.options.noteId);
                } else {
                    await OfflineManager.addToQueue('delete_note', { id: this.options.noteId });
                    result = { success: true };
                }
                
                if (result.success) {
                    if (this.options.onDelete) {
                        await this.options.onDelete(this.options.noteId, this);
                    }
                    
                    this.showSuccess('笔记已删除');
                    setTimeout(() => this.close({ deleted: true }), 1000);
                } else {
                    throw new Error(result.error || '删除失败');
                }
                
            } catch (error) {
                console.error('[笔记弹窗] 删除失败:', error);
                this.showError('删除失败', error.message);
            }
        }
    }
    
    /**
     * 显示加载状态
     */
    showLoading(message) {
        const loadingHtml = `
            <div class="modal-loading">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="loading-text">${message}</div>
            </div>
        `;
        
        this.elements.body.innerHTML = loadingHtml;
        
        // 禁用按钮
        this.setButtonDisabled(0, true); // 取消按钮
        this.setButtonDisabled(1, true); // 保存按钮
    }
    
    /**
     * 显示成功状态
     */
    showSuccess(message) {
        const successHtml = `
            <div class="modal-success">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="success-message">${message}</div>
            </div>
        `;
        
        this.elements.body.innerHTML = successHtml;
    }
    
    /**
     * 显示错误状态
     */
    showError(title, message) {
        const errorHtml = `
            <div class="modal-error">
                <div class="error-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="error-content">
                    <h4 class="error-title">${title}</h4>
                    ${message ? `<p class="error-message">${message}</p>` : ''}
                </div>
            </div>
        `;
        
        this.elements.body.innerHTML = errorHtml;
        
        // 重新启用按钮
        this.setButtonDisabled(0, false);
        this.setButtonDisabled(1, false);
    }
}

/**
 * 分类弹窗 - 用于管理分类
 */
export class CategoryModal extends BaseModal {
    constructor(options = {}) {
        const defaultOptions = {
            id: 'category-modal',
            title: '分类管理',
            size: 'md',
            type: 'form',
            buttons: [
                {
                    text: '取消',
                    type: 'secondary',
                    action: (modal) => modal.cancel()
                },
                {
                    text: '保存',
                    type: 'primary',
                    action: (modal) => modal.saveCategory()
                }
            ],
            categoryId: null,
            categoryData: null,
            onSave: null
        };
        
        super({ ...defaultOptions, ...options });
        
        this.categoryData = options.categoryData || {};
    }
    
    /**
     * 渲染弹窗内容
     */
    render() {
        this.options.content = this.getCategoryFormTemplate();
        super.render();
        
        this.cacheCategoryElements();
        this.bindCategoryEvents();
    }
    
    /**
     * 获取分类表单模板
     */
    getCategoryFormTemplate() {
        return `
            <div class="category-modal-form">
                <!-- 名称输入 -->
                <div class="form-group">
                    <label for="category-name" class="form-label">分类名称</label>
                    <input type="text" 
                           id="category-name" 
                           class="form-control" 
                           placeholder="输入分类名称"
                           value="${Utils.escapeHtml(this.categoryData.name || '')}"
                           maxlength="50">
                </div>
                
                <!-- 颜色选择 -->
                <div class="form-group">
                    <label for="category-color" class="form-label">颜色</label>
                    <div class="color-picker-container">
                        <input type="color" 
                               id="category-color" 
                               class="color-picker" 
                               value="${this.categoryData.color || '#3b82f6'}">
                        <div class="color-presets">
                            ${this.getColorPresets().map(color => `
                                <button type="button" 
                                        class="color-preset ${this.categoryData.color === color ? 'selected' : ''}" 
                                        style="background-color: ${color}"
                                        data-color="${color}"></button>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- 描述 -->
                <div class="form-group">
                    <label for="category-description" class="form-label">描述（可选）</label>
                    <textarea id="category-description" 
                              class="form-control" 
                              rows="3"
                              placeholder="输入分类描述">${Utils.escapeHtml(this.categoryData.description || '')}</textarea>
                </div>
                
                <!-- 统计信息 -->
                ${this.categoryData.count !== undefined ? `
                    <div class="form-group">
                        <div class="category-stats">
                            <div class="stat-item">
                                <i class="fas fa-file-alt"></i>
                                <span>包含笔记: <strong>${this.categoryData.count || 0}</strong> 篇</span>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <!-- 删除按钮 -->
                ${this.options.categoryId ? `
                    <div class="form-group danger-zone">
                        <button type="button" class="btn-delete-category">
                            <i class="fas fa-trash"></i>
                            删除分类
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 获取颜色预设
     */
    getColorPresets() {
        return [
            '#3b82f6', // 蓝色
            '#8b5cf6', // 紫色
            '#10b981', // 绿色
            '#f59e0b', // 橙色
            '#ef4444', // 红色
            '#06b6d4', // 青色
            '#ec4899', // 粉色
            '#64748b'  // 灰色
        ];
    }
    
    /**
     * 缓存分类相关元素
     */
    cacheCategoryElements() {
        this.nameInput = this.content.querySelector('#category-name');
        this.colorInput = this.content.querySelector('#category-color');
        this.colorPresets = this.content.querySelectorAll('.color-preset');
        this.descriptionTextarea = this.content.querySelector('#category-description');
        this.deleteBtn = this.content.querySelector('.btn-delete-category');
    }
    
    /**
     * 绑定分类相关事件
     */
    bindCategoryEvents() {
        // 颜色预设点击
        this.colorPresets.forEach(preset => {
            preset.addEventListener('click', (e) => {
                const color = e.currentTarget.dataset.color;
                this.colorInput.value = color;
                
                // 更新选中状态
                this.colorPresets.forEach(p => p.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
            });
        });
        
        // 颜色输入变化
        if (this.colorInput) {
            this.colorInput.addEventListener('input', (e) => {
                const color = e.target.value;
                
                // 更新预设选中状态
                this.colorPresets.forEach(preset => {
                    preset.classList.toggle('selected', preset.dataset.color === color);
                });
            });
        }
        
        // 删除按钮
        if (this.deleteBtn) {
            this.deleteBtn.addEventListener('click', () => this.deleteCategory());
        }
    }
    
    /**
     * 保存分类
     */
    async saveCategory() {
        const name = this.nameInput ? this.nameInput.value.trim() : '';
        
        if (!name) {
            this.showError('请输入分类名称');
            return;
        }
        
        const categoryData = {
            id: this.options.categoryId || Utils.generateId('cat_'),
            name: name,
            color: this.colorInput ? this.colorInput.value : '#3b82f6',
            description: this.descriptionTextarea ? this.descriptionTextarea.value.trim() : '',
            updatedAt: new Date().toISOString()
        };
        
        if (!this.options.categoryId) {
            categoryData.createdAt = categoryData.updatedAt;
            categoryData.count = 0;
        }
        
        // 显示加载状态
        this.showLoading('正在保存分类...');
        
        try {
            let result;
            
            if (Config.isOnline()) {
                if (this.options.categoryId) {
                    result = await Api.categories.update(this.options.categoryId, categoryData);
                } else {
                    result = await Api.categories.create(categoryData);
                }
            } else {
                const operation = this.options.categoryId ? 'update_category' : 'create_category';
                await OfflineManager.addToQueue(operation, categoryData);
                result = { success: true, data: categoryData };
            }
            
            if (result.success) {
                if (this.options.onSave) {
                    await this.options.onSave(result.data, this);
                }
                
                this.showSuccess('分类保存成功');
                setTimeout(() => this.close(result.data), 1000);
            } else {
                throw new Error(result.error || '保存失败');
            }
            
        } catch (error) {
            console.error('[分类弹窗] 保存失败:', error);
            this.showError('保存失败', error.message);
        }
    }
    
    /**
     * 删除分类
     */
    async deleteCategory() {
        if (!this.options.categoryId) return;
        
        const confirm = await ConfirmModal.show({
            title: '确认删除',
            message: '确定要删除这个分类吗？此操作不可撤销。',
            confirmText: '删除',
            confirmType: 'danger'
        });
        
        if (confirm) {
            this.showLoading('正在删除分类...');
            
            try {
                let result;
                
                if (Config.isOnline()) {
                    result = await Api.categories.delete(this.options.categoryId);
                } else {
                    await OfflineManager.addToQueue('delete_category', { id: this.options.categoryId });
                    result = { success: true };
                }
                
                if (result.success) {
                    this.showSuccess('分类已删除');
                    setTimeout(() => this.close({ deleted: true }), 1000);
                } else {
                    throw new Error(result.error || '删除失败');
                }
                
            } catch (error) {
                console.error('[分类弹窗] 删除失败:', error);
                this.showError('删除失败', error.message);
            }
        }
    }
    
    /**
     * 显示加载状态
     */
    showLoading(message) {
        const loadingHtml = `
            <div class="modal-loading">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="loading-text">${message}</div>
            </div>
        `;
        
        this.elements.body.innerHTML = loadingHtml;
        this.setButtonDisabled(0, true);
        this.setButtonDisabled(1, true);
    }
    
    /**
     * 显示成功状态
     */
    showSuccess(message) {
        const successHtml = `
            <div class="modal-success">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="success-message">${message}</div>
            </div>
        `;
        
        this.elements.body.innerHTML = successHtml;
    }
    
    /**
     * 显示错误状态
     */
    showError(message, details = '') {
        const errorHtml = `
            <div class="modal-error">
                <div class="error-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="error-content">
                    <h4 class="error-title">错误</h4>
                    <p class="error-message">${message}</p>
                    ${details ? `<p class="error-details">${details}</p>` : ''}
                </div>
            </div>
        `;
        
        this.elements.body.innerHTML = errorHtml;
        this.setButtonDisabled(0, false);
        this.setButtonDisabled(1, false);
    }
}

/**
 * 设置弹窗 - 用于应用设置
 */
export class SettingsModal extends BaseModal {
    constructor(options = {}) {
        const defaultOptions = {
            id: 'settings-modal',
            title: '设置',
            size: 'lg',
            type: 'form',
            buttons: [
                {
                    text: '取消',
                    type: 'secondary',
                    action: (modal) => modal.cancel()
                },
                {
                    text: '保存',
                    type: 'primary',
                    action: (modal) => modal.saveSettings()
                }
            ],
            onSave: null
        };
        
        super({ ...defaultOptions, ...options });
        
        this.settings = this.loadSettings();
    }
    
    /**
     * 加载设置
     */
    loadSettings() {
        return {
            theme: Utils.storage.get('theme', 'dark'),
            editor: Utils.storage.get('editor_config', {
                mode: 'split',
                autoSave: true,
                autoSaveInterval: 5000
            }),
            sync: Utils.storage.get('sync_settings', {
                autoSync: true,
                syncInterval: 300,
                wifiOnly: false
            }),
            privacy: Utils.storage.get('privacy_settings', {
                encryptByDefault: true,
                lockOnMinimize: false,
                clearClipboard: true
            }),
            notifications: Utils.storage.get('notification_settings', {
                enabled: true,
                sounds: true,
                desktop: false
            })
        };
    }
    
    /**
     * 渲染弹窗内容
     */
    render() {
        this.options.content = this.getSettingsFormTemplate();
        super.render();
        
        this.cacheSettingsElements();
        this.bindSettingsEvents();
    }
    
    /**
     * 获取设置表单模板
     */
    getSettingsFormTemplate() {
        return `
            <div class="settings-modal-form">
                <div class="settings-tabs">
                    <div class="tab-buttons">
                        <button type="button" class="tab-button active" data-tab="general">通用</button>
                        <button type="button" class="tab-button" data-tab="editor">编辑器</button>
                        <button type="button" class="tab-button" data-tab="sync">同步</button>
                        <button type="button" class="tab-button" data-tab="privacy">隐私</button>
                        <button type="button" class="tab-button" data-tab="notifications">通知</button>
                    </div>
                    
                    <div class="tab-content">
                        <!-- 通用设置 -->
                        <div class="tab-pane active" id="tab-general">
                            ${this.getGeneralSettingsTemplate()}
                        </div>
                        
                        <!-- 编辑器设置 -->
                        <div class="tab-pane" id="tab-editor">
                            ${this.getEditorSettingsTemplate()}
                        </div>
                        
                        <!-- 同步设置 -->
                        <div class="tab-pane" id="tab-sync">
                            ${this.getSyncSettingsTemplate()}
                        </div>
                        
                        <!-- 隐私设置 -->
                        <div class="tab-pane" id="tab-privacy">
                            ${this.getPrivacySettingsTemplate()}
                        </div>
                        
                        <!-- 通知设置 -->
                        <div class="tab-pane" id="tab-notifications">
                            ${this.getNotificationSettingsTemplate()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取通用设置模板
     */
    getGeneralSettingsTemplate() {
        return `
            <div class="settings-section">
                <h4 class="section-title">主题</h4>
                <div class="form-group">
                    <div class="theme-options">
                        <div class="theme-option ${this.settings.theme === 'dark' ? 'active' : ''}" data-theme="dark">
                            <div class="theme-preview dark-theme"></div>
                            <div class="theme-label">深色主题</div>
                        </div>
                        <div class="theme-option ${this.settings.theme === 'light' ? 'active' : ''}" data-theme="light">
                            <div class="theme-preview light-theme"></div>
                            <div class="theme-label">浅色主题</div>
                        </div>
                        <div class="theme-option ${this.settings.theme === 'auto' ? 'active' : ''}" data-theme="auto">
                            <div class="theme-preview auto-theme"></div>
                            <div class="theme-label">跟随系统</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="settings-section">
                <h4 class="section-title">语言</h4>
                <div class="form-group">
                    <select class="form-control" id="language-select">
                        <option value="zh-CN" selected>简体中文</option>
                        <option value="en-US">English</option>
                    </select>
                </div>
            </div>
            
            <div class="settings-section">
                <h4 class="section-title">数据管理</h4>
                <div class="form-group">
                    <button type="button" class="btn btn-secondary btn-export-data">
                        <i class="fas fa-download"></i>
                        导出所有数据
                    </button>
                    <button type="button" class="btn btn-secondary btn-import-data">
                        <i class="fas fa-upload"></i>
                        导入数据
                    </button>
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-danger btn-clear-data">
                        <i class="fas fa-trash"></i>
                        清除所有本地数据
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取编辑器设置模板
     */
    getEditorSettingsTemplate() {
        const editor = this.settings.editor;
        
        return `
            <div class="settings-section">
                <h4 class="section-title">编辑器模式</h4>
                <div class="form-group">
                    <div class="editor-mode-options">
                        <div class="form-check">
                            <input type="radio" 
                                   id="editor-mode-edit" 
                                   name="editor-mode" 
                                   class="form-check-input" 
                                   value="edit"
                                   ${editor.mode === 'edit' ? 'checked' : ''}>
                            <label for="editor-mode-edit" class="form-check-label">
                                <i class="fas fa-edit"></i>
                                仅编辑
                            </label>
                        </div>
                        <div class="form-check">
                            <input type="radio" 
                                   id="editor-mode-split" 
                                   name="editor-mode" 
                                   class="form-check-input" 
                                   value="split"
                                   ${editor.mode === 'split' ? 'checked' : ''}>
                            <label for="editor-mode-split" class="form-check-label">
                                <i class="fas fa-columns"></i>
                                分割视图
                            </label>
                        </div>
                        <div class="form-check">
                            <input type="radio" 
                                   id="editor-mode-preview" 
                                   name="editor-mode" 
                                   class="form-check-input" 
                                   value="preview"
                                   ${editor.mode === 'preview' ? 'checked' : ''}>
                            <label for="editor-mode-preview" class="form-check-label">
                                <i class="fas fa-eye"></i>
                                仅预览
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="settings-section">
                <h4 class="section-title">自动保存</h4>
                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" 
                               id="editor-auto-save" 
                               class="form-check-input" 
                               ${editor.autoSave ? 'checked' : ''}>
                        <label for="editor-auto-save" class="form-check-label">
                            启用自动保存
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <label for="auto-save-interval" class="form-label">自动保存间隔（秒）</label>
                    <input type="number" 
                           id="auto-save-interval" 
                           class="form-control" 
                           min="1" 
                           max="300"
                           value="${editor.autoSaveInterval / 1000}"
                           ${!editor.autoSave ? 'disabled' : ''}>
                </div>
            </div>
            
            <div class="settings-section">
                <h4 class="section-title">编辑器选项</h4>
                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" 
                               id="editor-spell-check" 
                               class="form-check-input" 
                               checked>
                        <label for="editor-spell-check" class="form-check-label">
                            拼写检查
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" 
                               id="editor-line-numbers" 
                               class="form-check-input" 
                               checked>
                        <label for="editor-line-numbers" class="form-check-label">
                            显示行号
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" 
                               id="editor-word-wrap" 
                               class="form-check-input" 
                               checked>
                        <label for="editor-word-wrap" class="form-check-label">
                            自动换行
                        </label>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取同步设置模板
     */
    getSyncSettingsTemplate() {
        const sync = this.settings.sync;
        
        return `
            <div class="settings-section">
                <h4 class="section-title">自动同步</h4>
                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" 
                               id="sync-auto-sync" 
                               class="form-check-input" 
                               ${sync.autoSync ? 'checked' : ''}>
                        <label for="sync-auto-sync" class="form-check-label">
                            启用自动同步
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <label for="sync-interval" class="form-label">同步间隔（秒）</label>
                    <input type="number" 
                           id="sync-interval" 
                           class="form-control" 
                           min="10" 
                           max="3600"
                           value="${sync.syncInterval}"
                           ${!sync.autoSync ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" 
                               id="sync-wifi-only" 
                               class="form-check-input" 
                               ${sync.wifiOnly ? 'checked' : ''}>
                        <label for="sync-wifi-only" class="form-check-label">
                            仅WiFi下同步
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="settings-section">
                <h4 class="section-title">手动同步</h4>
                <div class="form-group">
                    <button type="button" class="btn btn-primary btn-sync-now">
                        <i class="fas fa-sync-alt"></i>
                        立即同步
                    </button>
                    <button type="button" class="btn btn-secondary btn-view-sync-queue">
                        <i class="fas fa-list"></i>
                        查看同步队列
                    </button>
                </div>
            </div>
            
            <div class="settings-section">
                <h4 class="section-title">同步状态</h4>
                <div class="sync-status-info">
                    <div class="status-item">
                        <span class="status-label">最后同步:</span>
                        <span class="status-value" id="last-sync-time">--:--:--</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">待同步:</span>
                        <span class="status-value" id="pending-sync-count">0</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">同步错误:</span>
                        <span class="status-value" id="sync-error-count">0</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取隐私设置模板
     */
    getPrivacySettingsTemplate() {
        const privacy = this.settings.privacy;
        
        return `
            <div class="settings-section">
                <h4 class="section-title">加密设置</h4>
                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" 
                               id="privacy-encrypt-default" 
                               class="form-check-input" 
                               ${privacy.encryptByDefault ? 'checked' : ''}>
                        <label for="privacy-encrypt-default" class="form-check-label">
                            默认启用加密
                        </label>
                        <small class="form-text text-muted">
                            新建笔记时默认启用端对端加密
                        </small>
                    </div>
                </div>
            </div>
            
            <div class="settings-section">
                <h4 class="section-title">安全设置</h4>
                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" 
                               id="privacy-lock-minimize" 
                               class="form-check-input" 
                               ${privacy.lockOnMinimize ? 'checked' : ''}>
                        <label for="privacy-lock-minimize" class="form-check-label">
                            应用最小化时锁定
                        </label>
                        <small class="form-text text-muted">
                            应用最小化或切换标签页时自动锁定
                        </small>
                    </div>
                </div>
                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" 
                               id="privacy-clear-clipboard" 
                               class="form-check-input" 
                               ${privacy.clearClipboard ? 'checked' : ''}>
                        <label for="privacy-clear-clipboard" class="form-check-label">
                            复制后清空剪贴板
                        </label>
                        <small class="form-text text-muted">
                            复制加密内容后，60秒自动清空剪贴板
                        </small>
                    </div>
                </div>
            </div>
            
            <div class="settings-section">
                <h4 class="section-title">数据隐私</h4>
                <div class="form-group">
                    <button type="button" class="btn btn-secondary btn-export-encrypted">
                        <i class="fas fa-key"></i>
                        导出加密密钥
                    </button>
                    <button type="button" class="btn btn-secondary btn-change-password">
                        <i class="fas fa-lock"></i>
                        修改主密码
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取通知设置模板
     */
    getNotificationSettingsTemplate() {
        const notifications = this.settings.notifications;
        
        return `
            <div class="settings-section">
                <h4 class="section-title">通知设置</h4>
                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" 
                               id="notifications-enabled" 
                               class="form-check-input" 
                               ${notifications.enabled ? 'checked' : ''}>
                        <label for="notifications-enabled" class="form-check-label">
                            启用通知
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" 
                               id="notifications-sounds" 
                               class="form-check-input" 
                               ${notifications.sounds ? 'checked' : ''}>
                        <label for="notifications-sounds" class="form-check-label">
                            提示音
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" 
                               id="notifications-desktop" 
                               class="form-check-input" 
                               ${notifications.desktop ? 'checked' : ''}>
                        <label for="notifications-desktop" class="form-check-label">
                            桌面通知
                        </label>
                        <small class="form-text text-muted">
                            允许应用发送桌面通知
                        </small>
                    </div>
                </div>
            </div>
            
            <div class="settings-section">
                <h4 class="section-title">通知类型</h4>
                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" 
                               id="notifications-sync" 
                               class="form-check-input" 
                               checked>
                        <label for="notifications-sync" class="form-check-label">
                            同步完成通知
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" 
                               id="notifications-backup" 
                               class="form-check-input" 
                               checked>
                        <label for="notifications-backup" class="form-check-label">
                            备份提醒
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" 
                               id="notifications-updates" 
                               class="form-check-input" 
                               checked>
                        <label for="notifications-updates" class="form-check-label">
                            更新通知
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="settings-section">
                <h4 class="section-title">测试通知</h4>
                <div class="form-group">
                    <button type="button" class="btn btn-secondary btn-test-notification">
                        <i class="fas fa-bell"></i>
                        发送测试通知
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * 缓存设置相关元素
     */
    cacheSettingsElements() {
        // 标签页
        this.tabButtons = this.content.querySelectorAll('.tab-button');
        this.tabPanes = this.content.querySelectorAll('.tab-pane');
        
        // 主题选项
        this.themeOptions = this.content.querySelectorAll('.theme-option');
        
        // 自动保存
        this.autoSaveCheckbox = this.content.querySelector('#editor-auto-save');
        this.autoSaveInterval = this.content.querySelector('#auto-save-interval');
        
        // 同步设置
        this.syncCheckbox = this.content.querySelector('#sync-auto-sync');
        this.syncInterval = this.content.querySelector('#sync-interval');
        
        // 操作按钮
        this.syncNowBtn = this.content.querySelector('.btn-sync-now');
        this.testNotificationBtn = this.content.querySelector('.btn-test-notification');
        this.clearDataBtn = this.content.querySelector('.btn-clear-data');
    }
    
    /**
     * 绑定设置相关事件
     */
    bindSettingsEvents() {
        // 标签页切换
        this.tabButtons.forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e));
        });
        
        // 主题选择
        this.themeOptions.forEach(option => {
            option.addEventListener('click', (e) => this.selectTheme(e));
        });
        
        // 自动保存切换
        if (this.autoSaveCheckbox) {
            this.autoSaveCheckbox.addEventListener('change', (e) => {
                this.autoSaveInterval.disabled = !e.target.checked;
            });
        }
        
        // 自动同步切换
        if (this.syncCheckbox) {
            this.syncCheckbox.addEventListener('change', (e) => {
                this.syncInterval.disabled = !e.target.checked;
            });
        }
        
        // 立即同步
        if (this.syncNowBtn) {
            this.syncNowBtn.addEventListener('click', () => this.syncNow());
        }
        
        // 测试通知
        if (this.testNotificationBtn) {
            this.testNotificationBtn.addEventListener('click', () => this.testNotification());
        }
        
        // 清除数据
        if (this.clearDataBtn) {
            this.clearDataBtn.addEventListener('click', () => this.clearData());
        }
    }
    
    /**
     * 切换标签页
     */
    switchTab(event) {
        const tabId = event.currentTarget.dataset.tab;
        
        // 更新按钮状态
        this.tabButtons.forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
        
        // 更新内容显示
        this.tabPanes.forEach(pane => pane.classList.remove('active'));
        const targetPane = this.content.querySelector(`#tab-${tabId}`);
        if (targetPane) {
            targetPane.classList.add('active');
        }
    }
    
    /**
     * 选择主题
     */
    selectTheme(event) {
        const theme = event.currentTarget.dataset.theme;
        
        // 更新选中状态
        this.themeOptions.forEach(option => option.classList.remove('active'));
        event.currentTarget.classList.add('active');
        
        // 立即应用主题
        this.applyTheme(theme);
    }
    
    /**
     * 应用主题
     */
    applyTheme(theme) {
        document.documentElement.className = theme;
        this.settings.theme = theme;
    }
    
    /**
     * 立即同步
     */
    syncNow() {
        document.dispatchEvent(new CustomEvent('sync:manual'));
        this.showSuccess('正在同步...');
    }
    
    /**
     * 测试通知
     */
    testNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('我的加密笔记', {
                body: '这是一个测试通知',
                icon: '/assets/images/icons/icon-192x192.png'
            });
        } else {
            this.showError('通知权限未开启');
        }
    }
    
    /**
     * 清除数据
     */
    async clearData() {
        const confirm = await ConfirmModal.show({
            title: '确认清除',
            message: '确定要清除所有本地数据吗？此操作不可撤销。',
            confirmText: '清除',
            confirmType: 'danger'
        });
        
        if (confirm) {
            // 清除本地存储
            localStorage.clear();
            sessionStorage.clear();
            
            // 清除 IndexedDB
            await this.clearIndexedDB();
            
            this.showSuccess('数据已清除，页面将重新加载');
            setTimeout(() => location.reload(), 2000);
        }
    }
    
    /**
     * 清除 IndexedDB
     */
    async clearIndexedDB() {
        const databases = await indexedDB.databases();
        for (const db of databases) {
            if (db.name) {
                indexedDB.deleteDatabase(db.name);
            }
        }
    }
    
    /**
     * 保存设置
     */
    async saveSettings() {
        // 收集所有设置
        this.collectSettings();
        
        // 保存到本地存储
        Utils.storage.set('theme', this.settings.theme);
        Utils.storage.set('editor_config', this.settings.editor);
        Utils.storage.set('sync_settings', this.settings.sync);
        Utils.storage.set('privacy_settings', this.settings.privacy);
        Utils.storage.set('notification_settings', this.settings.notifications);
        
        // 触发设置保存事件
        document.dispatchEvent(new CustomEvent('settings:saved', {
            detail: { settings: this.settings }
        }));
        
        if (this.options.onSave) {
            await this.options.onSave(this.settings, this);
        }
        
        this.showSuccess('设置保存成功');
        setTimeout(() => this.close(this.settings), 1000);
    }
    
    /**
     * 收集设置
     */
    collectSettings() {
        // 主题
        const activeTheme = this.content.querySelector('.theme-option.active');
        if (activeTheme) {
            this.settings.theme = activeTheme.dataset.theme;
        }
        
        // 编辑器设置
        const editorMode = this.content.querySelector('input[name="editor-mode"]:checked');
        if (editorMode) {
            this.settings.editor.mode = editorMode.value;
        }
        
        this.settings.editor.autoSave = this.autoSaveCheckbox ? this.autoSaveCheckbox.checked : true;
        this.settings.editor.autoSaveInterval = this.autoSaveInterval ? 
            parseInt(this.autoSaveInterval.value) * 1000 : 5000;
        
        // 同步设置
        this.settings.sync.autoSync = this.syncCheckbox ? this.syncCheckbox.checked : true;
        this.settings.sync.syncInterval = this.syncInterval ? parseInt(this.syncInterval.value) : 300;
        
        const wifiOnly = this.content.querySelector('#sync-wifi-only');
        if (wifiOnly) {
            this.settings.sync.wifiOnly = wifiOnly.checked;
        }
        
        // 隐私设置
        const encryptDefault = this.content.querySelector('#privacy-encrypt-default');
        if (encryptDefault) {
            this.settings.privacy.encryptByDefault = encryptDefault.checked;
        }
        
        const lockMinimize = this.content.querySelector('#privacy-lock-minimize');
        if (lockMinimize) {
            this.settings.privacy.lockOnMinimize = lockMinimize.checked;
        }
        
        const clearClipboard = this.content.querySelector('#privacy-clear-clipboard');
        if (clearClipboard) {
            this.settings.privacy.clearClipboard = clearClipboard.checked;
        }
        
        // 通知设置
        const notificationsEnabled = this.content.querySelector('#notifications-enabled');
        if (notificationsEnabled) {
            this.settings.notifications.enabled = notificationsEnabled.checked;
        }
        
        const notificationsSounds = this.content.querySelector('#notifications-sounds');
        if (notificationsSounds) {
            this.settings.notifications.sounds = notificationsSounds.checked;
        }
        
        const notificationsDesktop = this.content.querySelector('#notifications-desktop');
        if (notificationsDesktop) {
            this.settings.notifications.desktop = notificationsDesktop.checked;
        }
    }
    
    /**
     * 显示加载状态
     */
    showLoading(message) {
        const loadingHtml = `
            <div class="modal-loading">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="loading-text">${message}</div>
            </div>
        `;
        
        this.elements.body.innerHTML = loadingHtml;
        this.setButtonDisabled(0, true);
        this.setButtonDisabled(1, true);
    }
    
    /**
     * 显示成功状态
     */
    showSuccess(message) {
        const successHtml = `
            <div class="modal-success">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="success-message">${message}</div>
            </div>
        `;
        
        this.elements.body.innerHTML = successHtml;
    }
}

/**
 * 确认弹窗 - 用于确认操作
 */
export class ConfirmModal extends BaseModal {
    constructor(options = {}) {
        const defaultOptions = {
            id: 'confirm-modal',
            title: '确认',
            size: 'sm',
            type: 'confirm',
            buttons: [
                {
                    text: '取消',
                    type: 'secondary',
                    action: (modal) => modal.cancel(false)
                },
                {
                    text: '确认',
                    type: 'primary',
                    action: (modal) => modal.confirm(true)
                }
            ],
            message: '确定要执行此操作吗？',
            confirmText: '确认',
            cancelText: '取消',
            confirmType: 'primary', // 'primary', 'danger', 'warning', 'success'
            onConfirm: null,
            onCancel: null
        };
        
        super({ ...defaultOptions, ...options });
        
        // 更新按钮文本
        if (options.confirmText || options.cancelText) {
            this.options.buttons[0].text = options.cancelText || defaultOptions.buttons[0].text;
            this.options.buttons[1].text = options.confirmText || defaultOptions.buttons[1].text;
            this.options.buttons[1].type = options.confirmType || defaultOptions.buttons[1].type;
        }
    }
    
    /**
     * 渲染弹窗内容
     */
    render() {
        this.options.content = this.getConfirmTemplate();
        super.render();
    }
    
    /**
     * 获取确认模板
     */
    getConfirmTemplate() {
        return `
            <div class="confirm-modal-content">
                <div class="confirm-icon">
                    <i class="fas fa-question-circle"></i>
                </div>
                <div class="confirm-message">${this.options.message}</div>
            </div>
        `;
    }
    
    /**
     * 静态方法：快速显示确认弹窗
     */
    static async show(options) {
        const modal = new ConfirmModal(options);
        await modal.open();
        return modal.result;
    }
}

/**
 * 弹窗管理器 - 统一管理所有弹窗
 */
export class ModalManager {
    constructor() {
        this.modals = new Map();
        this.modalStack = [];
    }
    
    /**
     * 注册弹窗
     */
    register(name, ModalClass) {
        this.modals.set(name, ModalClass);
    }
    
    /**
     * 获取弹窗实例
     */
    get(name, options = {}) {
        const ModalClass = this.modals.get(name);
        if (!ModalClass) {
            throw new Error(`弹窗 "${name}" 未注册`);
        }
        
        return new ModalClass(options);
    }
    
    /**
     * 显示弹窗
     */
    async show(name, options = {}) {
        const modal = this.get(name, options);
        await modal.open();
        
        // 添加到堆栈
        this.modalStack.push(modal);
        
        return modal;
    }
    
    /**
     * 关闭当前弹窗
     */
    async closeCurrent() {
        if (this.modalStack.length > 0) {
            const modal = this.modalStack.pop();
            await modal.close();
        }
    }
    
    /**
     * 关闭所有弹窗
     */
    async closeAll() {
        while (this.modalStack.length > 0) {
            await this.closeCurrent();
        }
    }
    
    /**
     * 获取当前弹窗
     */
    getCurrent() {
        if (this.modalStack.length > 0) {
            return this.modalStack[this.modalStack.length - 1];
        }
        return null;
    }
    
    /**
     * 检查是否有弹窗打开
     */
    isAnyOpen() {
        return this.modalStack.length > 0;
    }
}

/**
 * 默认弹窗管理器实例
 */
export const modalManager = new ModalManager();

// 注册默认弹窗
modalManager.register('base', BaseModal);
modalManager.register('note', NoteModal);
modalManager.register('category', CategoryModal);
modalManager.register('settings', SettingsModal);
modalManager.register('confirm', ConfirmModal);

/**
 * 快捷方法
 */
export const Modal = {
    // 基础弹窗
    show: (options) => modalManager.show('base', options),
    
    // 笔记弹窗
    note: (options) => modalManager.show('note', options),
    
    // 分类弹窗
    category: (options) => modalManager.show('category', options),
    
    // 设置弹窗
    settings: (options) => modalManager.show('settings', options),
    
    // 确认弹窗
    confirm: (options) => ConfirmModal.show(options),
    
    // 提示弹窗
    alert: (options) => BaseModal.alert(options),
    
    // 输入弹窗
    prompt: (options) => BaseModal.prompt(options),
    
    // 关闭所有
    closeAll: () => BaseModal.closeAll(),
    
    // 获取当前
    getCurrent: () => BaseModal.getCurrentModal()
};

// 导出所有弹窗类
export { BaseModal };
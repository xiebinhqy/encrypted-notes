/**
 * 文本域组件
 * 支持多行文本输入，自动调整高度，字数统计，Markdown预览等功能
 */

import Utils from '../../core/utils.js';

export class Textarea {
    constructor(options = {}) {
        this.options = {
            id: `textarea_${Utils.generateId()}`,
            name: '',
            value: '',
            label: '',
            placeholder: '',
            rows: 4,
            cols: null,
            maxRows: 10,
            minRows: 2,
            autoResize: true,
            resize: 'vertical', // 'none', 'vertical', 'horizontal', 'both'
            required: false,
            disabled: false,
            readonly: false,
            maxlength: null,
            minlength: null,
            spellcheck: true,
            wrap: 'soft', // 'soft', 'hard'
            size: 'md', // 'sm', 'md', 'lg'
            variant: 'default', // 'default', 'outline', 'filled', 'flushed'
            state: 'default', // 'default', 'success', 'warning', 'error'
            errorMessage: '',
            helpText: '',
            showCount: true,
            showRemaining: false,
            enableTab: true,
            tabSize: 4,
            autoFocus: false,
            validateOn: 'blur', // 'blur', 'change', 'submit', 'none'
            validationRules: [],
            classes: {
                container: '',
                label: '',
                textarea: '',
                error: '',
                help: '',
                count: ''
            },
            onInput: null,
            onChange: null,
            onFocus: null,
            onBlur: null,
            onValidate: null,
            onResize: null,
            ...options
        };
        
        this.state = {
            value: this.options.value,
            isFocused: false,
            isDirty: false,
            isValid: true,
            isTouched: false,
            errorMessage: this.options.errorMessage,
            charCount: this.options.value ? String(this.options.value).length : 0,
            lineCount: this.options.value ? this.countLines(this.options.value) : 1,
            isResizing: false
        };
        
        this.container = null;
        this.textarea = null;
        this.errorElement = null;
        this.countElement = null;
        
        this.validationTimeout = null;
        this.resizeObserver = null;
        this.resizeTimeout = null;
        
        this.init();
    }
    
    /**
     * 初始化文本域组件
     */
    init() {
        // 创建容器
        this.createContainer();
        
        // 绑定事件
        this.bindEvents();
        
        // 初始验证
        if (this.options.validateOn === 'change' || this.options.validateOn === 'blur') {
            this.validate();
        }
        
        // 初始调整高度
        if (this.options.autoResize) {
            setTimeout(() => this.autoResize(), 10);
        }
        
        console.log(`[文本域] 初始化: ${this.options.id}`);
    }
    
    /**
     * 创建容器
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = `${this.options.id}_container`;
        this.container.className = this.getContainerClasses();
        
        // 渲染文本域
        this.container.innerHTML = this.getTemplate();
        
        // 缓存元素
        this.cacheElements();
        
        // 设置初始样式
        this.applyInitialStyles();
        
        // 更新状态
        this.updateState();
    }
    
    /**
     * 获取容器类名
     */
    getContainerClasses() {
        const classes = ['textarea-container'];
        
        // 大小
        if (this.options.size) {
            classes.push(`textarea-${this.options.size}`);
        }
        
        // 变体
        if (this.options.variant !== 'default') {
            classes.push(`textarea-${this.options.variant}`);
        }
        
        // 状态
        if (this.options.state !== 'default') {
            classes.push(`textarea-${this.options.state}`);
        }
        
        // 焦点状态
        if (this.state.isFocused) {
            classes.push('textarea-focused');
        }
        
        // 禁用状态
        if (this.options.disabled) {
            classes.push('textarea-disabled');
        }
        
        // 只读状态
        if (this.options.readonly) {
            classes.push('textarea-readonly');
        }
        
        // 自定义类
        if (this.options.classes.container) {
            classes.push(this.options.classes.container);
        }
        
        return classes.join(' ');
    }
    
    /**
     * 获取模板
     */
    getTemplate() {
        return `
            <!-- 标签 -->
            ${this.options.label ? this.getLabelTemplate() : ''}
            
            <!-- 文本域包装 -->
            <div class="textarea-wrapper">
                <!-- 文本域 -->
                <textarea
                    id="${this.options.id}"
                    name="${this.options.name || this.options.id}"
                    class="textarea-field ${this.options.classes.textarea || ''}"
                    ${this.options.rows ? `rows="${this.options.rows}"` : ''}
                    ${this.options.cols ? `cols="${this.options.cols}"` : ''}
                    ${this.options.placeholder ? `placeholder="${Utils.escapeHtml(this.options.placeholder)}"` : ''}
                    ${this.options.required ? 'required' : ''}
                    ${this.options.disabled ? 'disabled' : ''}
                    ${this.options.readonly ? 'readonly' : ''}
                    ${this.options.autofocus ? 'autofocus' : ''}
                    ${this.options.spellcheck ? 'spellcheck="true"' : 'spellcheck="false"'}
                    ${this.options.wrap ? `wrap="${this.options.wrap}"` : ''}
                    ${this.options.maxlength ? `maxlength="${this.options.maxlength}"` : ''}
                    ${this.options.minlength ? `minlength="${this.options.minlength}"` : ''}
                >${Utils.escapeHtml(this.state.value)}</textarea>
            </div>
            
            <!-- 底部区域 -->
            <div class="textarea-footer">
                <!-- 错误消息 -->
                ${this.state.errorMessage ? this.getErrorTemplate() : ''}
                
                <!-- 帮助文本 -->
                ${this.options.helpText ? this.getHelpTemplate() : ''}
                
                <!-- 字数统计 -->
                ${this.options.showCount ? this.getCountTemplate() : ''}
            </div>
        `;
    }
    
    /**
     * 获取标签模板
     */
    getLabelTemplate() {
        return `
            <label for="${this.options.id}" class="textarea-label ${this.options.classes.label || ''}">
                ${this.options.label}
                ${this.options.required ? '<span class="textarea-required">*</span>' : ''}
            </label>
        `;
    }
    
    /**
     * 获取错误模板
     */
    getErrorTemplate() {
        return `
            <div class="textarea-error ${this.options.classes.error || ''}">
                <i class="fas fa-exclamation-circle"></i>
                <span>${this.state.errorMessage}</span>
            </div>
        `;
    }
    
    /**
     * 获取帮助模板
     */
    getHelpTemplate() {
        return `
            <div class="textarea-help ${this.options.classes.help || ''}">
                ${this.options.helpText}
            </div>
        `;
    }
    
    /**
     * 获取字数统计模板
     */
    getCountTemplate() {
        const max = this.options.maxlength;
        const current = this.state.charCount;
        const remaining = max ? max - current : null;
        const isOverLimit = max && current > max;
        
        return `
            <div class="textarea-count ${this.options.classes.count || ''} ${isOverLimit ? 'over-limit' : ''}">
                ${this.options.showRemaining && max ? `
                    <span class="remaining">剩余 ${remaining} 字符</span>
                ` : `
                    <span class="current">${current}</span>
                    ${max ? `<span class="separator">/</span><span class="max">${max}</span>` : ''}
                `}
                ${this.state.lineCount > 1 ? `
                    <span class="line-count">${this.state.lineCount} 行</span>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 缓存元素
     */
    cacheElements() {
        this.textarea = this.container.querySelector('.textarea-field');
        this.errorElement = this.container.querySelector('.textarea-error');
        this.countElement = this.container.querySelector('.textarea-count');
    }
    
    /**
     * 应用初始样式
     */
    applyInitialStyles() {
        if (!this.textarea) return;
        
        // 设置resize样式
        if (this.options.resize !== 'both') {
            this.textarea.style.resize = this.options.resize;
        }
        
        // 设置最小高度
        if (this.options.minRows) {
            const lineHeight = this.getLineHeight();
            this.textarea.style.minHeight = `${lineHeight * this.options.minRows}px`;
        }
        
        // 设置最大高度
        if (this.options.maxRows) {
            const lineHeight = this.getLineHeight();
            this.textarea.style.maxHeight = `${lineHeight * this.options.maxRows}px`;
        }
        
        // 设置Tab键处理
        if (this.options.enableTab) {
            this.textarea.style.tabSize = this.options.tabSize;
            this.textarea.style.MozTabSize = this.options.tabSize;
            this.textarea.style.OTabSize = this.options.tabSize;
        }
    }
    
    /**
     * 获取行高
     */
    getLineHeight() {
        if (!this.textarea) return 20;
        
        // 获取计算样式
        const style = window.getComputedStyle(this.textarea);
        const lineHeight = parseFloat(style.lineHeight);
        
        // 如果lineHeight是normal，使用字体大小的1.2倍
        if (isNaN(lineHeight)) {
            const fontSize = parseFloat(style.fontSize);
            return fontSize * 1.2;
        }
        
        return lineHeight;
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        if (!this.textarea) return;
        
        // 输入事件
        this.textarea.addEventListener('input', (e) => this.handleInput(e));
        
        // 变化事件
        this.textarea.addEventListener('change', (e) => this.handleChange(e));
        
        // 焦点事件
        this.textarea.addEventListener('focus', (e) => this.handleFocus(e));
        this.textarea.addEventListener('blur', (e) => this.handleBlur(e));
        
        // 按键事件
        this.textarea.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Tab键处理
        if (this.options.enableTab) {
            this.textarea.addEventListener('keydown', (e) => this.handleTabKey(e));
        }
        
        // 调整大小事件
        if (this.options.autoResize) {
            this.setupAutoResize();
        }
        
        // 粘贴事件
        this.textarea.addEventListener('paste', (e) => this.handlePaste(e));
        
        // 剪切事件
        this.textarea.addEventListener('cut', (e) => this.handleCut(e));
    }
    
    /**
     * 处理输入事件
     */
    handleInput(event) {
        const value = event.target.value;
        this.state.value = value;
        
        // 更新字数统计
        this.state.charCount = value.length;
        this.state.lineCount = this.countLines(value);
        
        // 更新统计显示
        this.updateCount();
        
        // 标记为脏数据
        this.state.isDirty = true;
        
        // 自动调整高度
        if (this.options.autoResize) {
            this.autoResize();
        }
        
        // 触发输入回调
        if (this.options.onInput) {
            this.options.onInput(value, this);
        }
        
        // 实时验证
        if (this.options.validateOn === 'change') {
            this.debounceValidate();
        }
        
        // 触发自定义事件
        this.textarea.dispatchEvent(new CustomEvent('textarea:input', {
            detail: { value, textarea: this }
        }));
    }
    
    /**
     * 处理变化事件
     */
    handleChange(event) {
        const value = event.target.value;
        
        // 触发变化回调
        if (this.options.onChange) {
            this.options.onChange(value, this);
        }
        
        // 触发自定义事件
        this.textarea.dispatchEvent(new CustomEvent('textarea:change', {
            detail: { value, textarea: this }
        }));
    }
    
    /**
     * 处理焦点事件
     */
    handleFocus(event) {
        this.state.isFocused = true;
        this.state.isTouched = true;
        
        // 更新容器类
        this.updateContainerClasses();
        
        // 触发焦点回调
        if (this.options.onFocus) {
            this.options.onFocus(event, this);
        }
        
        // 触发自定义事件
        this.textarea.dispatchEvent(new CustomEvent('textarea:focus', {
            detail: { textarea: this }
        }));
    }
    
    /**
     * 处理失去焦点事件
     */
    handleBlur(event) {
        this.state.isFocused = false;
        
        // 更新容器类
        this.updateContainerClasses();
        
        // 失去焦点时验证
        if (this.options.validateOn === 'blur') {
            this.validate();
        }
        
        // 触发失去焦点回调
        if (this.options.onBlur) {
            this.options.onBlur(event, this);
        }
        
        // 触发自定义事件
        this.textarea.dispatchEvent(new CustomEvent('textarea:blur', {
            detail: { textarea: this }
        }));
    }
    
    /**
     * 处理按键事件
     */
    handleKeydown(event) {
        // Enter键提交
        if (event.key === 'Enter' && this.options.validateOn === 'submit') {
            this.validate();
        }
        
        // 阻止Enter键在禁用时提交表单
        if (event.key === 'Enter' && this.options.disabled) {
            event.preventDefault();
        }
    }
    
    /**
     * 处理Tab键
     */
    handleTabKey(event) {
        if (event.key === 'Tab' && !event.ctrlKey && !event.altKey && !event.metaKey) {
            event.preventDefault();
            
            const start = this.textarea.selectionStart;
            const end = this.textarea.selectionEnd;
            const value = this.textarea.value;
            
            if (event.shiftKey) {
                // Shift+Tab: 减少缩进
                this.handleOutdent(start, end);
            } else {
                // Tab: 增加缩进
                this.handleIndent(start, end);
            }
        }
    }
    
    /**
     * 处理缩进
     */
    handleIndent(start, end) {
        const value = this.textarea.value;
        const before = value.substring(0, start);
        const selected = value.substring(start, end);
        const after = value.substring(end);
        
        if (selected.includes('\n')) {
            // 多行缩进
            const lines = selected.split('\n');
            const indentedLines = lines.map(line => ' '.repeat(this.options.tabSize) + line);
            const newValue = before + indentedLines.join('\n') + after;
            
            this.textarea.value = newValue;
            this.state.value = newValue;
            
            // 设置选区
            this.textarea.selectionStart = start + this.options.tabSize;
            this.textarea.selectionEnd = end + (lines.length * this.options.tabSize);
        } else {
            // 单行缩进
            const spaces = ' '.repeat(this.options.tabSize);
            const newValue = before + spaces + selected + after;
            
            this.textarea.value = newValue;
            this.state.value = newValue;
            
            // 设置选区
            this.textarea.selectionStart = start + this.options.tabSize;
            this.textarea.selectionEnd = end + this.options.tabSize;
        }
        
        // 触发输入事件
        this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    /**
     * 处理减少缩进
     */
    handleOutdent(start, end) {
        const value = this.textarea.value;
        const before = value.substring(0, start);
        const selected = value.substring(start, end);
        const after = value.substring(end);
        
        if (selected.includes('\n')) {
            // 多行减少缩进
            const lines = selected.split('\n');
            const outdentedLines = lines.map(line => {
                if (line.startsWith(' '.repeat(this.options.tabSize))) {
                    return line.substring(this.options.tabSize);
                }
                return line;
            });
            
            const newValue = before + outdentedLines.join('\n') + after;
            this.textarea.value = newValue;
            this.state.value = newValue;
            
            // 计算新的选区位置
            let removedChars = 0;
            lines.forEach((line, index) => {
                if (line.startsWith(' '.repeat(this.options.tabSize))) {
                    removedChars += this.options.tabSize;
                }
            });
            
            this.textarea.selectionStart = Math.max(0, start - (lines[0].startsWith(' '.repeat(this.options.tabSize)) ? this.options.tabSize : 0));
            this.textarea.selectionEnd = Math.max(0, end - removedChars);
        } else {
            // 单行减少缩进
            if (selected.startsWith(' '.repeat(this.options.tabSize))) {
                const newValue = before + selected.substring(this.options.tabSize) + after;
                this.textarea.value = newValue;
                this.state.value = newValue;
                
                this.textarea.selectionStart = Math.max(0, start - this.options.tabSize);
                this.textarea.selectionEnd = Math.max(0, end - this.options.tabSize);
            }
        }
        
        // 触发输入事件
        this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    /**
     * 处理粘贴事件
     */
    handlePaste(event) {
        // 可以在这里处理粘贴内容的清理或转换
        // 例如：移除多余空格、格式化等
        
        setTimeout(() => {
            // 粘贴后自动调整高度
            if (this.options.autoResize) {
                this.autoResize();
            }
            
            // 更新字数统计
            this.state.charCount = this.textarea.value.length;
            this.state.lineCount = this.countLines(this.textarea.value);
            this.updateCount();
        }, 0);
    }
    
    /**
     * 处理剪切事件
     */
    handleCut(event) {
        setTimeout(() => {
            // 剪切后自动调整高度
            if (this.options.autoResize) {
                this.autoResize();
            }
            
            // 更新字数统计
            this.state.charCount = this.textarea.value.length;
            this.state.lineCount = this.countLines(this.textarea.value);
            this.updateCount();
        }, 0);
    }
    
    /**
     * 设置自动调整高度
     */
    setupAutoResize() {
        if (!this.textarea) return;
        
        // 监听输入事件进行自动调整
        this.textarea.addEventListener('input', () => {
            if (this.options.autoResize) {
                this.autoResize();
            }
        });
        
        // 初始调整
        this.autoResize();
    }
    
    /**
     * 自动调整高度
     */
    autoResize() {
        if (!this.textarea || !this.options.autoResize) return;
        
        // 重置高度
        this.textarea.style.height = 'auto';
        
        // 计算内容高度
        const scrollHeight = this.textarea.scrollHeight;
        const lineHeight = this.getLineHeight();
        
        // 计算最小和最大高度
        const minHeight = lineHeight * (this.options.minRows || 2);
        const maxHeight = lineHeight * (this.options.maxRows || 10);
        
        // 应用高度限制
        let newHeight = scrollHeight;
        if (minHeight && newHeight < minHeight) {
            newHeight = minHeight;
        }
        if (maxHeight && newHeight > maxHeight) {
            newHeight = maxHeight;
            this.textarea.style.overflowY = 'auto';
        } else {
            this.textarea.style.overflowY = 'hidden';
        }
        
        // 应用新高度
        this.textarea.style.height = `${newHeight}px`;
        
        // 触发调整大小回调
        if (this.options.onResize) {
            this.options.onResize(newHeight, this);
        }
        
        // 触发自定义事件
        this.textarea.dispatchEvent(new CustomEvent('textarea:resize', {
            detail: { height: newHeight, textarea: this }
        }));
    }
    
    /**
     * 计算行数
     */
    countLines(text) {
        if (!text) return 1;
        return (text.match(/\n/g) || '').length + 1;
    }
    
    /**
     * 防抖验证
     */
    debounceValidate() {
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
        }
        
        this.validationTimeout = setTimeout(() => {
            this.validate();
        }, 300);
    }
    
    /**
     * 验证输入
     */
    validate() {
        const value = this.state.value;
        let isValid = true;
        let errorMessage = '';
        
        // 重置状态
        this.state.isValid = true;
        this.state.errorMessage = '';
        
        // 必填验证
        if (this.options.required && !value.trim()) {
            isValid = false;
            errorMessage = '此字段为必填项';
        }
        
        // 最小长度验证
        if (isValid && this.options.minlength && value.length < this.options.minlength) {
            isValid = false;
            errorMessage = `至少需要 ${this.options.minlength} 个字符`;
        }
        
        // 最大长度验证
        if (isValid && this.options.maxlength && value.length > this.options.maxlength) {
            isValid = false;
            errorMessage = `不能超过 ${this.options.maxlength} 个字符`;
        }
        
        // 自定义验证规则
        if (isValid && this.options.validationRules.length > 0) {
            for (const rule of this.options.validationRules) {
                if (rule.validate && !rule.validate(value)) {
                    isValid = false;
                    errorMessage = rule.message || '验证失败';
                    break;
                }
            }
        }
        
        // 更新状态
        this.state.isValid = isValid;
        this.state.errorMessage = errorMessage;
        
        // 更新UI
        this.updateErrorDisplay();
        this.updateContainerClasses();
        
        // 触发验证回调
        if (this.options.onValidate) {
            this.options.onValidate(isValid, errorMessage, this);
        }
        
        // 触发自定义事件
        this.textarea.dispatchEvent(new CustomEvent('textarea:validate', {
            detail: { isValid, errorMessage, textarea: this }
        }));
        
        return isValid;
    }
    
    /**
     * 更新容器类
     */
    updateContainerClasses() {
        if (!this.container) return;
        
        // 移除状态类
        this.container.classList.remove('textarea-focused', 'textarea-success', 'textarea-warning', 'textarea-error');
        
        // 添加焦点类
        if (this.state.isFocused) {
            this.container.classList.add('textarea-focused');
        }
        
        // 添加验证状态类
        if (this.state.isTouched) {
            if (!this.state.isValid) {
                this.container.classList.add('textarea-error');
            } else if (this.state.isDirty) {
                this.container.classList.add('textarea-success');
            }
        }
    }
    
    /**
     * 更新状态
     */
    updateState() {
        // 更新统计显示
        this.updateCount();
        
        // 更新错误显示
        this.updateErrorDisplay();
    }
    
    /**
     * 更新统计显示
     */
    updateCount() {
        if (!this.countElement) return;
        
        const max = this.options.maxlength;
        const current = this.state.charCount;
        const remaining = max ? max - current : null;
        const isOverLimit = max && current > max;
        
        if (this.options.showRemaining && max) {
            const remainingElement = this.countElement.querySelector('.remaining');
            if (remainingElement) {
                remainingElement.textContent = `剩余 ${remaining} 字符`;
            }
        } else {
            const currentElement = this.countElement.querySelector('.current');
            if (currentElement) {
                currentElement.textContent = current;
            }
            
            if (max) {
                const maxElement = this.countElement.querySelector('.max');
                if (maxElement) {
                    maxElement.textContent = max;
                }
            }
        }
        
        // 更新行数显示
        const lineCountElement = this.countElement.querySelector('.line-count');
        if (lineCountElement) {
            if (this.state.lineCount > 1) {
                lineCountElement.textContent = `${this.state.lineCount} 行`;
                lineCountElement.style.display = 'inline';
            } else {
                lineCountElement.style.display = 'none';
            }
        }
        
        this.countElement.classList.toggle('over-limit', isOverLimit);
    }
    
    /**
     * 更新错误显示
     */
    updateErrorDisplay() {
        if (!this.errorElement) {
            // 如果没有错误元素，创建或更新
            const footer = this.container.querySelector('.textarea-footer');
            if (footer && this.state.errorMessage) {
                footer.insertAdjacentHTML('afterbegin', this.getErrorTemplate());
                this.errorElement = this.container.querySelector('.textarea-error');
            }
        } else if (this.errorElement) {
            if (this.state.errorMessage) {
                this.errorElement.innerHTML = `
                    <i class="fas fa-exclamation-circle"></i>
                    <span>${this.state.errorMessage}</span>
                `;
                this.errorElement.style.display = 'flex';
            } else {
                this.errorElement.style.display = 'none';
            }
        }
    }
    
    /**
     * 获取值
     */
    getValue() {
        return this.state.value;
    }
    
    /**
     * 设置值
     */
    setValue(value, silent = false) {
        const oldValue = this.state.value;
        this.state.value = value;
        
        if (this.textarea) {
            this.textarea.value = value;
        }
        
        // 更新统计
        this.state.charCount = value ? String(value).length : 0;
        this.state.lineCount = this.countLines(value);
        this.updateCount();
        
        // 标记为脏数据
        this.state.isDirty = true;
        
        // 自动调整高度
        if (this.options.autoResize) {
            setTimeout(() => this.autoResize(), 10);
        }
        
        // 验证
        if (!silent) {
            this.validate();
        }
        
        // 触发变化事件
        if (!silent && oldValue !== value) {
            this.handleChange({ target: this.textarea });
        }
    }
    
    /**
     * 获取选中文本
     */
    getSelectedText() {
        if (!this.textarea) return '';
        
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        return this.textarea.value.substring(start, end);
    }
    
    /**
     * 设置选中文本
     */
    setSelection(start, end) {
        if (!this.textarea) return;
        
        this.textarea.focus();
        this.textarea.setSelectionRange(start, end);
    }
    
    /**
     * 在光标处插入文本
     */
    insertText(text, select = false) {
        if (!this.textarea) return;
        
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        
        const newValue = value.substring(0, start) + text + value.substring(end);
        this.textarea.value = newValue;
        this.state.value = newValue;
        
        if (select) {
            this.textarea.setSelectionRange(start, start + text.length);
        } else {
            this.textarea.setSelectionRange(start + text.length, start + text.length);
        }
        
        // 触发输入事件
        this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    /**
     * 聚焦
     */
    focus() {
        if (this.textarea) {
            this.textarea.focus();
        }
    }
    
    /**
     * 失去焦点
     */
    blur() {
        if (this.textarea) {
            this.textarea.blur();
        }
    }
    
    /**
     * 启用
     */
    enable() {
        this.options.disabled = false;
        if (this.textarea) {
            this.textarea.disabled = false;
        }
        this.updateContainerClasses();
    }
    
    /**
     * 禁用
     */
    disable() {
        this.options.disabled = true;
        if (this.textarea) {
            this.textarea.disabled = true;
        }
        this.updateContainerClasses();
    }
    
    /**
     * 设置为只读
     */
    setReadonly(readonly = true) {
        this.options.readonly = readonly;
        if (this.textarea) {
            this.textarea.readOnly = readonly;
        }
        this.updateContainerClasses();
    }
    
    /**
     * 设置错误
     */
    setError(message) {
        this.state.isValid = false;
        this.state.errorMessage = message;
        this.updateErrorDisplay();
        this.updateContainerClasses();
    }
    
    /**
     * 清除错误
     */
    clearError() {
        this.state.isValid = true;
        this.state.errorMessage = '';
        this.updateErrorDisplay();
        this.updateContainerClasses();
    }
    
    /**
     * 设置为成功状态
     */
    setSuccess() {
        this.clearError();
        this.container.classList.add('textarea-success');
    }
    
    /**
     * 设置为警告状态
     */
    setWarning() {
        this.clearError();
        this.container.classList.add('textarea-warning');
    }
    
    /**
     * 获取文本域元素
     */
    getTextareaElement() {
        return this.textarea;
    }
    
    /**
     * 获取容器元素
     */
    getContainer() {
        return this.container;
    }
    
    /**
     * 渲染到指定容器
     */
    renderTo(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }
        
        if (container) {
            container.appendChild(this.container);
        }
        
        return this;
    }
    
    /**
     * 销毁组件
     */
    destroy() {
        // 清除定时器
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
        }
        
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        // 移除事件监听
        if (this.textarea) {
            this.textarea.replaceWith(this.textarea.cloneNode(true));
        }
        
        // 从DOM移除
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // 清理引用
        this.container = null;
        this.textarea = null;
        this.errorElement = null;
        this.countElement = null;
        
        console.log(`[文本域] 已销毁: ${this.options.id}`);
    }
    
    /**
     * 获取当前状态
     */
    getState() {
        return {
            value: this.state.value,
            isValid: this.state.isValid,
            isDirty: this.state.isDirty,
            isTouched: this.state.isTouched,
            isFocused: this.state.isFocused,
            errorMessage: this.state.errorMessage,
            charCount: this.state.charCount,
            lineCount: this.state.lineCount
        };
    }
    
    /**
     * 静态方法：创建基础文本域
     */
    static basic(options) {
        return new Textarea({
            variant: 'default',
            autoResize: false,
            ...options
        });
    }
    
    /**
     * 静态方法：创建自动调整高度的文本域
     */
    static autoResize(options) {
        return new Textarea({
            autoResize: true,
            minRows: 3,
            maxRows: 10,
            ...options
        });
    }
    
    /**
     * 静态方法：创建代码编辑器文本域
     */
    static codeEditor(options) {
        return new Textarea({
            autoResize: true,
            enableTab: true,
            tabSize: 4,
            spellcheck: false,
            wrap: 'off',
            classes: {
                textarea: 'code-editor'
            },
            ...options
        });
    }
    
    /**
     * 静态方法：创建Markdown编辑器文本域
     */
    static markdownEditor(options) {
        return new Textarea({
            autoResize: true,
            enableTab: true,
            tabSize: 2,
            placeholder: '输入Markdown内容...',
            classes: {
                textarea: 'markdown-editor'
            },
            ...options
        });
    }
}
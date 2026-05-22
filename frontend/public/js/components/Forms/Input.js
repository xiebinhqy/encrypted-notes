/**
 * 输入框组件
 * 支持文本、密码、邮箱、数字、电话等多种输入类型
 * 包含标签、占位符、错误提示、验证状态、前缀后缀等功能
 */

import Utils from '../../core/utils.js';

export class Input {
    constructor(options = {}) {
        this.options = {
            id: `input_${Utils.generateId()}`,
            name: '',
            type: 'text', // 'text', 'password', 'email', 'number', 'tel', 'url', 'search', 'date', 'time'
            value: '',
            label: '',
            placeholder: '',
            required: false,
            disabled: false,
            readonly: false,
            maxlength: null,
            minlength: null,
            min: null,
            max: null,
            step: null,
            pattern: null,
            autocomplete: 'off',
            autofocus: false,
            size: 'md', // 'sm', 'md', 'lg'
            variant: 'default', // 'default', 'outline', 'filled', 'flushed'
            state: 'default', // 'default', 'success', 'warning', 'error'
            errorMessage: '',
            helpText: '',
            prefix: '', // 前缀文本或图标
            suffix: '', // 后缀文本或图标
            clearable: false, // 是否显示清空按钮
            showCount: false, // 是否显示字数统计
            validateOn: 'blur', // 'blur', 'change', 'submit', 'none'
            validationRules: [], // 自定义验证规则
            mask: null, // 输入掩码
            classes: {
                container: '',
                label: '',
                input: '',
                prefix: '',
                suffix: '',
                clear: '',
                error: '',
                help: '',
                count: ''
            },
            onInput: null,
            onChange: null,
            onFocus: null,
            onBlur: null,
            onValidate: null,
            onClear: null,
            ...options
        };
        
        this.state = {
            value: this.options.value,
            isFocused: false,
            isDirty: false,
            isValid: true,
            isTouched: false,
            errorMessage: this.options.errorMessage,
            charCount: this.options.value ? String(this.options.value).length : 0
        };
        
        this.container = null;
        this.input = null;
        this.errorElement = null;
        this.countElement = null;
        
        this.validationTimeout = null;
        this.maskPattern = null;
        
        this.init();
    }
    
    /**
     * 初始化输入组件
     */
    init() {
        // 初始化输入掩码
        if (this.options.mask) {
            this.initInputMask();
        }
        
        // 创建容器
        this.createContainer();
        
        // 绑定事件
        this.bindEvents();
        
        // 初始验证
        if (this.options.validateOn === 'change' || this.options.validateOn === 'blur') {
            this.validate();
        }
        
        console.log(`[输入框] 初始化: ${this.options.id}`);
    }
    
    /**
     * 初始化输入掩码
     */
    initInputMask() {
        if (!this.options.mask) return;
        
        // 简单的输入掩码实现
        // 支持格式如: (999) 999-9999, 999-99-9999, 9999-9999-9999-9999
        this.maskPattern = this.options.mask;
    }
    
    /**
     * 创建容器
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = `${this.options.id}_container`;
        this.container.className = this.getContainerClasses();
        
        // 渲染输入框
        this.container.innerHTML = this.getTemplate();
        
        // 缓存元素
        this.cacheElements();
        
        // 更新状态
        this.updateState();
    }
    
    /**
     * 获取容器类名
     */
    getContainerClasses() {
        const classes = ['input-container'];
        
        // 大小
        if (this.options.size) {
            classes.push(`input-${this.options.size}`);
        }
        
        // 变体
        if (this.options.variant !== 'default') {
            classes.push(`input-${this.options.variant}`);
        }
        
        // 状态
        if (this.options.state !== 'default') {
            classes.push(`input-${this.options.state}`);
        }
        
        // 焦点状态
        if (this.state.isFocused) {
            classes.push('input-focused');
        }
        
        // 禁用状态
        if (this.options.disabled) {
            classes.push('input-disabled');
        }
        
        // 只读状态
        if (this.options.readonly) {
            classes.push('input-readonly');
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
            
            <!-- 输入框包装 -->
            <div class="input-wrapper">
                <!-- 前缀 -->
                ${this.options.prefix ? this.getPrefixTemplate() : ''}
                
                <!-- 输入框 -->
                <input
                    id="${this.options.id}"
                    name="${this.options.name || this.options.id}"
                    type="${this.options.type}"
                    class="input-field ${this.options.classes.input || ''}"
                    value="${Utils.escapeHtml(this.state.value)}"
                    ${this.options.placeholder ? `placeholder="${Utils.escapeHtml(this.options.placeholder)}"` : ''}
                    ${this.options.required ? 'required' : ''}
                    ${this.options.disabled ? 'disabled' : ''}
                    ${this.options.readonly ? 'readonly' : ''}
                    ${this.options.autofocus ? 'autofocus' : ''}
                    ${this.options.autocomplete ? `autocomplete="${this.options.autocomplete}"` : ''}
                    ${this.options.maxlength ? `maxlength="${this.options.maxlength}"` : ''}
                    ${this.options.minlength ? `minlength="${this.options.minlength}"` : ''}
                    ${this.options.min !== null ? `min="${this.options.min}"` : ''}
                    ${this.options.max !== null ? `max="${this.options.max}"` : ''}
                    ${this.options.step ? `step="${this.options.step}"` : ''}
                    ${this.options.pattern ? `pattern="${this.options.pattern}"` : ''}
                >
                
                <!-- 后缀 -->
                ${this.options.suffix ? this.getSuffixTemplate() : ''}
                
                <!-- 清空按钮 -->
                ${this.options.clearable && this.state.value ? this.getClearButtonTemplate() : ''}
            </div>
            
            <!-- 底部区域 -->
            <div class="input-footer">
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
            <label for="${this.options.id}" class="input-label ${this.options.classes.label || ''}">
                ${this.options.label}
                ${this.options.required ? '<span class="input-required">*</span>' : ''}
            </label>
        `;
    }
    
    /**
     * 获取前缀模板
     */
    getPrefixTemplate() {
        const isIcon = this.options.prefix.startsWith('fa-') || this.options.prefix.startsWith('fas ') || 
                      this.options.prefix.startsWith('far ') || this.options.prefix.startsWith('fab ');
        
        return `
            <div class="input-prefix ${this.options.classes.prefix || ''}">
                ${isIcon ? `<i class="${this.options.prefix}"></i>` : this.options.prefix}
            </div>
        `;
    }
    
    /**
     * 获取后缀模板
     */
    getSuffixTemplate() {
        const isIcon = this.options.suffix.startsWith('fa-') || this.options.suffix.startsWith('fas ') || 
                      this.options.suffix.startsWith('far ') || this.options.suffix.startsWith('fab ');
        
        return `
            <div class="input-suffix ${this.options.classes.suffix || ''}">
                ${isIcon ? `<i class="${this.options.suffix}"></i>` : this.options.suffix}
            </div>
        `;
    }
    
    /**
     * 获取清空按钮模板
     */
    getClearButtonTemplate() {
        return `
            <button type="button" 
                    class="input-clear ${this.options.classes.clear || ''}"
                    aria-label="清空输入">
                <i class="fas fa-times"></i>
            </button>
        `;
    }
    
    /**
     * 获取错误模板
     */
    getErrorTemplate() {
        return `
            <div class="input-error ${this.options.classes.error || ''}">
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
            <div class="input-help ${this.options.classes.help || ''}">
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
        const isOverLimit = max && current > max;
        
        return `
            <div class="input-count ${this.options.classes.count || ''} ${isOverLimit ? 'over-limit' : ''}">
                <span class="current">${current}</span>
                ${max ? `<span class="separator">/</span><span class="max">${max}</span>` : ''}
            </div>
        `;
    }
    
    /**
     * 缓存元素
     */
    cacheElements() {
        this.input = this.container.querySelector('.input-field');
        this.clearButton = this.container.querySelector('.input-clear');
        this.errorElement = this.container.querySelector('.input-error');
        this.countElement = this.container.querySelector('.input-count');
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        if (!this.input) return;
        
        // 输入事件
        this.input.addEventListener('input', (e) => this.handleInput(e));
        
        // 变化事件
        this.input.addEventListener('change', (e) => this.handleChange(e));
        
        // 焦点事件
        this.input.addEventListener('focus', (e) => this.handleFocus(e));
        this.input.addEventListener('blur', (e) => this.handleBlur(e));
        
        // 按键事件
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // 清空按钮
        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => this.handleClear());
        }
        
        // 粘贴事件（用于输入掩码）
        if (this.maskPattern) {
            this.input.addEventListener('paste', (e) => this.handlePaste(e));
        }
    }
    
    /**
     * 处理输入事件
     */
    handleInput(event) {
        const value = event.target.value;
        
        // 应用输入掩码
        if (this.maskPattern) {
            const maskedValue = this.applyInputMask(value);
            if (maskedValue !== value) {
                event.target.value = maskedValue;
                this.state.value = maskedValue;
            } else {
                this.state.value = value;
            }
        } else {
            this.state.value = value;
        }
        
        // 更新字数统计
        this.state.charCount = this.state.value.length;
        this.updateCount();
        
        // 更新清空按钮显示
        this.updateClearButton();
        
        // 标记为脏数据
        this.state.isDirty = true;
        
        // 触发输入回调
        if (this.options.onInput) {
            this.options.onInput(this.state.value, this);
        }
        
        // 实时验证
        if (this.options.validateOn === 'change') {
            this.debounceValidate();
        }
        
        // 触发自定义事件
        this.input.dispatchEvent(new CustomEvent('input:custom', {
            detail: { value: this.state.value, input: this }
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
        this.input.dispatchEvent(new CustomEvent('change:custom', {
            detail: { value, input: this }
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
        this.input.dispatchEvent(new CustomEvent('focus:custom', {
            detail: { input: this }
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
        this.input.dispatchEvent(new CustomEvent('blur:custom', {
            detail: { input: this }
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
        
        // Escape键清空
        if (event.key === 'Escape' && this.options.clearable) {
            this.clear();
        }
    }
    
    /**
     * 处理粘贴事件
     */
    handlePaste(event) {
        // 允许粘贴，稍后应用掩码
        setTimeout(() => {
            if (this.maskPattern) {
                const value = this.input.value;
                const maskedValue = this.applyInputMask(value);
                if (maskedValue !== value) {
                    this.input.value = maskedValue;
                    this.state.value = maskedValue;
                    this.handleInput({ target: this.input });
                }
            }
        }, 0);
    }
    
    /**
     * 处理清空
     */
    handleClear() {
        this.clear();
        
        // 触发清空回调
        if (this.options.onClear) {
            this.options.onClear(this);
        }
        
        // 聚焦到输入框
        this.input.focus();
    }
    
    /**
     * 应用输入掩码
     */
    applyInputMask(value) {
        if (!this.maskPattern || !value) return value;
        
        let maskedValue = '';
        let valueIndex = 0;
        
        for (let i = 0; i < this.maskPattern.length; i++) {
            const maskChar = this.maskPattern[i];
            const valueChar = value[valueIndex];
            
            if (valueIndex >= value.length) {
                break;
            }
            
            if (maskChar === '9') {
                // 只允许数字
                if (/[0-9]/.test(valueChar)) {
                    maskedValue += valueChar;
                    valueIndex++;
                } else {
                    // 跳过非数字字符
                    valueIndex++;
                    i--; // 重新处理当前掩码位置
                }
            } else if (maskChar === 'A') {
                // 只允许字母
                if (/[a-zA-Z]/.test(valueChar)) {
                    maskedValue += valueChar;
                    valueIndex++;
                } else {
                    valueIndex++;
                    i--;
                }
            } else if (maskChar === '*') {
                // 允许任意字符
                maskedValue += valueChar;
                valueIndex++;
            } else {
                // 固定字符
                maskedValue += maskChar;
                if (valueChar === maskChar) {
                    valueIndex++;
                }
            }
        }
        
        return maskedValue;
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
        
        // 最小值验证（数字类型）
        if (isValid && this.options.min !== null && this.options.type === 'number') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue < this.options.min) {
                isValid = false;
                errorMessage = `最小值是 ${this.options.min}`;
            }
        }
        
        // 最大值验证（数字类型）
        if (isValid && this.options.max !== null && this.options.type === 'number') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue > this.options.max) {
                isValid = false;
                errorMessage = `最大值是 ${this.options.max}`;
            }
        }
        
        // 模式验证
        if (isValid && this.options.pattern && value) {
            const pattern = new RegExp(this.options.pattern);
            if (!pattern.test(value)) {
                isValid = false;
                errorMessage = '格式不正确';
            }
        }
        
        // 邮箱验证
        if (isValid && this.options.type === 'email' && value) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(value)) {
                isValid = false;
                errorMessage = '请输入有效的邮箱地址';
            }
        }
        
        // URL验证
        if (isValid && this.options.type === 'url' && value) {
            try {
                new URL(value);
            } catch {
                isValid = false;
                errorMessage = '请输入有效的URL地址';
            }
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
        this.input.dispatchEvent(new CustomEvent('validate', {
            detail: { isValid, errorMessage, input: this }
        }));
        
        return isValid;
    }
    
    /**
     * 更新容器类
     */
    updateContainerClasses() {
        if (!this.container) return;
        
        // 移除状态类
        this.container.classList.remove('input-focused', 'input-success', 'input-warning', 'input-error');
        
        // 添加焦点类
        if (this.state.isFocused) {
            this.container.classList.add('input-focused');
        }
        
        // 添加验证状态类
        if (this.state.isTouched) {
            if (!this.state.isValid) {
                this.container.classList.add('input-error');
            } else if (this.state.isDirty) {
                this.container.classList.add('input-success');
            }
        }
    }
    
    /**
     * 更新状态
     */
    updateState() {
        // 更新字数统计
        this.updateCount();
        
        // 更新清空按钮
        this.updateClearButton();
        
        // 更新错误显示
        this.updateErrorDisplay();
    }
    
    /**
     * 更新字数统计
     */
    updateCount() {
        if (!this.countElement) return;
        
        const max = this.options.maxlength;
        const current = this.state.charCount;
        const isOverLimit = max && current > max;
        
        this.countElement.querySelector('.current').textContent = current;
        
        if (max) {
            const maxElement = this.countElement.querySelector('.max');
            if (maxElement) {
                maxElement.textContent = max;
            }
        }
        
        this.countElement.classList.toggle('over-limit', isOverLimit);
    }
    
    /**
     * 更新清空按钮
     */
    updateClearButton() {
        if (!this.clearButton) return;
        
        if (this.state.value && this.options.clearable) {
            this.clearButton.style.display = 'flex';
        } else if (this.clearButton) {
            this.clearButton.style.display = 'none';
        }
    }
    
    /**
     * 更新错误显示
     */
    updateErrorDisplay() {
        if (!this.errorElement) {
            // 如果没有错误元素，创建或更新
            const footer = this.container.querySelector('.input-footer');
            if (footer && this.state.errorMessage) {
                footer.insertAdjacentHTML('afterbegin', this.getErrorTemplate());
                this.errorElement = this.container.querySelector('.input-error');
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
        
        if (this.input) {
            this.input.value = value;
        }
        
        // 更新字数统计
        this.state.charCount = value ? String(value).length : 0;
        this.updateCount();
        
        // 更新清空按钮
        this.updateClearButton();
        
        // 标记为脏数据
        this.state.isDirty = true;
        
        // 验证
        if (!silent) {
            this.validate();
        }
        
        // 触发变化事件
        if (!silent && oldValue !== value) {
            this.handleChange({ target: this.input });
        }
    }
    
    /**
     * 清空输入
     */
    clear() {
        this.setValue('');
        
        // 触发输入事件
        if (this.input) {
            this.input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
    
    /**
     * 聚焦
     */
    focus() {
        if (this.input) {
            this.input.focus();
        }
    }
    
    /**
     * 失去焦点
     */
    blur() {
        if (this.input) {
            this.input.blur();
        }
    }
    
    /**
     * 启用
     */
    enable() {
        this.options.disabled = false;
        if (this.input) {
            this.input.disabled = false;
        }
        this.updateContainerClasses();
    }
    
    /**
     * 禁用
     */
    disable() {
        this.options.disabled = true;
        if (this.input) {
            this.input.disabled = true;
        }
        this.updateContainerClasses();
    }
    
    /**
     * 设置为只读
     */
    setReadonly(readonly = true) {
        this.options.readonly = readonly;
        if (this.input) {
            this.input.readOnly = readonly;
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
        this.container.classList.add('input-success');
    }
    
    /**
     * 设置为警告状态
     */
    setWarning() {
        this.clearError();
        this.container.classList.add('input-warning');
    }
    
    /**
     * 获取输入元素
     */
    getInputElement() {
        return this.input;
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
        
        // 移除事件监听
        if (this.input) {
            this.input.replaceWith(this.input.cloneNode(true));
        }
        
        // 从DOM移除
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // 清理引用
        this.container = null;
        this.input = null;
        this.clearButton = null;
        this.errorElement = null;
        this.countElement = null;
        
        console.log(`[输入框] 已销毁: ${this.options.id}`);
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
            charCount: this.state.charCount
        };
    }
    
    /**
     * 静态方法：创建文本输入框
     */
    static text(options) {
        return new Input({
            type: 'text',
            ...options
        });
    }
    
    /**
     * 静态方法：创建密码输入框
     */
    static password(options) {
        return new Input({
            type: 'password',
            ...options
        });
    }
    
    /**
     * 静态方法：创建邮箱输入框
     */
    static email(options) {
        return new Input({
            type: 'email',
            ...options
        });
    }
    
    /**
     * 静态方法：创建数字输入框
     */
    static number(options) {
        return new Input({
            type: 'number',
            ...options
        });
    }
    
    /**
     * 静态方法：创建搜索输入框
     */
    static search(options) {
        return new Input({
            type: 'search',
            clearable: true,
            ...options
        });
    }
}
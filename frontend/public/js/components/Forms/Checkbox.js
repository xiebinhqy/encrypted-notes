/**
 * 复选框组件
 * 支持单选、多选、不定状态、开关切换、组选择等功能的增强复选框
 */

import Utils from '../../core/utils.js';

export class Checkbox {
    constructor(options = {}) {
        this.options = {
            id: `checkbox_${Utils.generateId()}`,
            name: '',
            value: '',
            label: '',
            description: '',
            checked: false,
            indeterminate: false,
            disabled: false,
            readonly: false,
            required: false,
            type: 'checkbox', // 'checkbox', 'switch', 'toggle'
            size: 'md', // 'sm', 'md', 'lg'
            variant: 'default', // 'default', 'primary', 'success', 'warning', 'error'
            state: 'default', // 'default', 'success', 'warning', 'error'
            errorMessage: '',
            helpText: '',
            icon: '', // 图标类名
            iconChecked: '', // 选中时的图标
            validateOn: 'change', // 'change', 'blur', 'submit', 'none'
            validationRules: [],
            classes: {
                container: '',
                label: '',
                checkbox: '',
                input: '',
                control: '',
                icon: '',
                text: '',
                description: '',
                error: '',
                help: ''
            },
            onChange: null,
            onFocus: null,
            onBlur: null,
            onValidate: null,
            ...options
        };
        
        this.state = {
            checked: this.options.checked,
            indeterminate: this.options.indeterminate,
            isFocused: false,
            isHovered: false,
            isActive: false,
            isValid: true,
            isDirty: false,
            isTouched: false,
            errorMessage: this.options.errorMessage
        };
        
        this.container = null;
        this.input = null;
        this.control = null;
        this.errorElement = null;
        
        this.init();
    }
    
    /**
     * 初始化复选框组件
     */
    init() {
        // 创建容器
        this.createContainer();
        
        // 绑定事件
        this.bindEvents();
        
        // 初始验证
        if (this.options.validateOn === 'change') {
            this.validate();
        }
        
        console.log(`[复选框] 初始化: ${this.options.id}`);
    }
    
    /**
     * 创建容器
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = `${this.options.id}_container`;
        this.container.className = this.getContainerClasses();
        
        // 渲染复选框
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
        const classes = ['checkbox-container'];
        
        // 类型
        if (this.options.type) {
            classes.push(`checkbox-${this.options.type}`);
        }
        
        // 大小
        if (this.options.size) {
            classes.push(`checkbox-${this.options.size}`);
        }
        
        // 变体
        if (this.options.variant !== 'default') {
            classes.push(`checkbox-${this.options.variant}`);
        }
        
        // 状态
        if (this.options.state !== 'default') {
            classes.push(`checkbox-${this.options.state}`);
        }
        
        // 焦点状态
        if (this.state.isFocused) {
            classes.push('checkbox-focused');
        }
        
        // 悬停状态
        if (this.state.isHovered) {
            classes.push('checkbox-hovered');
        }
        
        // 激活状态
        if (this.state.isActive) {
            classes.push('checkbox-active');
        }
        
        // 选中状态
        if (this.state.checked) {
            classes.push('checkbox-checked');
        }
        
        // 不定状态
        if (this.state.indeterminate) {
            classes.push('checkbox-indeterminate');
        }
        
        // 禁用状态
        if (this.options.disabled) {
            classes.push('checkbox-disabled');
        }
        
        // 只读状态
        if (this.options.readonly) {
            classes.push('checkbox-readonly');
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
            <!-- 复选框包装 -->
            <label class="checkbox-wrapper" for="${this.options.id}">
                <!-- 隐藏的原始复选框 -->
                <input
                    id="${this.options.id}"
                    name="${this.options.name || this.options.id}"
                    type="checkbox"
                    class="checkbox-input ${this.options.classes.input || ''}"
                    value="${Utils.escapeHtml(this.options.value)}"
                    ${this.state.checked ? 'checked' : ''}
                    ${this.state.indeterminate ? 'data-indeterminate="true"' : ''}
                    ${this.options.required ? 'required' : ''}
                    ${this.options.disabled ? 'disabled' : ''}
                    ${this.options.readonly ? 'readonly' : ''}
                >
                
                <!-- 自定义控制元素 -->
                <span class="checkbox-control ${this.options.classes.control || ''}">
                    ${this.getControlContent()}
                </span>
                
                <!-- 文本内容 -->
                <span class="checkbox-content">
                    <!-- 标签文本 -->
                    ${this.options.label ? `
                        <span class="checkbox-label ${this.options.classes.label || ''}">
                            ${this.options.label}
                            ${this.options.required ? '<span class="checkbox-required">*</span>' : ''}
                        </span>
                    ` : ''}
                    
                    <!-- 描述文本 -->
                    ${this.options.description ? `
                        <span class="checkbox-description ${this.options.classes.description || ''}">
                            ${this.options.description}
                        </span>
                    ` : ''}
                </span>
            </label>
            
            <!-- 底部区域 -->
            <div class="checkbox-footer">
                <!-- 错误消息 -->
                ${this.state.errorMessage ? this.getErrorTemplate() : ''}
                
                <!-- 帮助文本 -->
                ${this.options.helpText ? this.getHelpTemplate() : ''}
            </div>
        `;
    }
    
    /**
     * 获取控制元素内容
     */
    getControlContent() {
        if (this.options.type === 'switch') {
            return this.getSwitchControl();
        } else if (this.options.type === 'toggle') {
            return this.getToggleControl();
        } else {
            return this.getCheckboxControl();
        }
    }
    
    /**
     * 获取复选框控制元素
     */
    getCheckboxControl() {
        let icon = '';
        
        if (this.options.icon) {
            const iconClass = this.state.checked && this.options.iconChecked ? 
                this.options.iconChecked : this.options.icon;
            icon = `<i class="${iconClass} ${this.options.classes.icon || ''}"></i>`;
        } else {
            // 默认图标
            if (this.state.indeterminate) {
                icon = '<i class="fas fa-minus"></i>';
            } else if (this.state.checked) {
                icon = '<i class="fas fa-check"></i>';
            }
        }
        
        return icon;
    }
    
    /**
     * 获取开关控制元素
     */
    getSwitchControl() {
        return `
            <span class="switch-track"></span>
            <span class="switch-thumb">
                ${this.options.icon ? `<i class="${this.options.icon} ${this.options.classes.icon || ''}"></i>` : ''}
            </span>
        `;
    }
    
    /**
     * 获取切换控制元素
     */
    getToggleControl() {
        return `
            <span class="toggle-track">
                <span class="toggle-thumb">
                    ${this.options.icon ? `<i class="${this.options.icon} ${this.options.classes.icon || ''}"></i>` : ''}
                </span>
            </span>
        `;
    }
    
    /**
     * 获取错误模板
     */
    getErrorTemplate() {
        return `
            <div class="checkbox-error ${this.options.classes.error || ''}">
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
            <div class="checkbox-help ${this.options.classes.help || ''}">
                ${this.options.helpText}
            </div>
        `;
    }
    
    /**
     * 缓存元素
     */
    cacheElements() {
        this.input = this.container.querySelector('.checkbox-input');
        this.control = this.container.querySelector('.checkbox-control');
        this.label = this.container.querySelector('.checkbox-label');
        this.errorElement = this.container.querySelector('.checkbox-error');
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        if (!this.input || !this.control) return;
        
        // 输入变化事件
        this.input.addEventListener('change', (e) => this.handleChange(e));
        
        // 焦点事件
        this.input.addEventListener('focus', (e) => this.handleFocus(e));
        this.input.addEventListener('blur', (e) => this.handleBlur(e));
        
        // 鼠标事件
        this.control.addEventListener('mouseenter', () => this.handleMouseEnter());
        this.control.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.control.addEventListener('mousedown', () => this.handleMouseDown());
        this.control.addEventListener('mouseup', () => this.handleMouseUp());
        
        // 键盘事件
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // 点击标签文本也触发变化
        if (this.label) {
            this.label.addEventListener('click', (e) => {
                if (!this.options.disabled && !this.options.readonly) {
                    e.preventDefault();
                    this.toggle();
                }
            });
        }
    }
    
    /**
     * 处理变化事件
     */
    handleChange(event) {
        const checked = event.target.checked;
        
        // 更新状态
        this.state.checked = checked;
        this.state.indeterminate = false;
        this.state.isDirty = true;
        
        // 更新UI
        this.updateVisualState();
        
        // 触发变化回调
        if (this.options.onChange) {
            this.options.onChange(checked, this);
        }
        
        // 触发自定义事件
        this.input.dispatchEvent(new CustomEvent('checkbox:change', {
            detail: { checked, checkbox: this }
        }));
        
        // 验证
        if (this.options.validateOn === 'change') {
            this.validate();
        }
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
        this.input.dispatchEvent(new CustomEvent('checkbox:focus', {
            detail: { checkbox: this }
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
        this.input.dispatchEvent(new CustomEvent('checkbox:blur', {
            detail: { checkbox: this }
        }));
    }
    
    /**
     * 处理鼠标进入
     */
    handleMouseEnter() {
        if (!this.options.disabled && !this.options.readonly) {
            this.state.isHovered = true;
            this.updateContainerClasses();
        }
    }
    
    /**
     * 处理鼠标离开
     */
    handleMouseLeave() {
        this.state.isHovered = false;
        this.updateContainerClasses();
    }
    
    /**
     * 处理鼠标按下
     */
    handleMouseDown() {
        if (!this.options.disabled && !this.options.readonly) {
            this.state.isActive = true;
            this.updateContainerClasses();
        }
    }
    
    /**
     * 处理鼠标释放
     */
    handleMouseUp() {
        this.state.isActive = false;
        this.updateContainerClasses();
    }
    
    /**
     * 处理按键事件
     */
    handleKeydown(event) {
        switch (event.key) {
            case ' ':
            case 'Enter':
                if (!this.options.disabled && !this.options.readonly) {
                    event.preventDefault();
                    this.toggle();
                }
                break;
                
            case 'Escape':
                if (this.state.isFocused) {
                    this.input.blur();
                }
                break;
        }
    }
    
    /**
     * 更新视觉状态
     */
    updateVisualState() {
        // 更新输入框状态
        if (this.input) {
            this.input.checked = this.state.checked;
            this.input.indeterminate = this.state.indeterminate;
            
            if (this.state.indeterminate) {
                this.input.setAttribute('data-indeterminate', 'true');
            } else {
                this.input.removeAttribute('data-indeterminate');
            }
        }
        
        // 更新容器类
        this.updateContainerClasses();
        
        // 更新控制元素内容
        this.updateControlContent();
    }
    
    /**
     * 更新控制元素内容
     */
    updateControlContent() {
        if (!this.control) return;
        
        if (this.options.type === 'checkbox') {
            this.control.innerHTML = this.getCheckboxControl();
        } else if (this.options.type === 'switch') {
            // 开关类型不需要更新内容
        } else if (this.options.type === 'toggle') {
            // 切换类型不需要更新内容
        }
    }
    
    /**
     * 更新容器类
     */
    updateContainerClasses() {
        if (!this.container) return;
        
        // 移除状态类
        this.container.classList.remove(
            'checkbox-focused',
            'checkbox-hovered',
            'checkbox-active',
            'checkbox-checked',
            'checkbox-indeterminate',
            'checkbox-success',
            'checkbox-warning',
            'checkbox-error'
        );
        
        // 添加焦点类
        if (this.state.isFocused) {
            this.container.classList.add('checkbox-focused');
        }
        
        // 添加悬停类
        if (this.state.isHovered) {
            this.container.classList.add('checkbox-hovered');
        }
        
        // 添加激活类
        if (this.state.isActive) {
            this.container.classList.add('checkbox-active');
        }
        
        // 添加选中类
        if (this.state.checked) {
            this.container.classList.add('checkbox-checked');
        }
        
        // 添加不定类
        if (this.state.indeterminate) {
            this.container.classList.add('checkbox-indeterminate');
        }
        
        // 添加验证状态类
        if (this.state.isTouched) {
            if (!this.state.isValid) {
                this.container.classList.add('checkbox-error');
            } else if (this.state.isDirty) {
                this.container.classList.add('checkbox-success');
            }
        }
    }
    
    /**
     * 更新状态
     */
    updateState() {
        // 更新错误显示
        this.updateErrorDisplay();
    }
    
    /**
     * 更新错误显示
     */
    updateErrorDisplay() {
        if (!this.errorElement) {
            // 如果没有错误元素，创建或更新
            const footer = this.container.querySelector('.checkbox-footer');
            if (footer && this.state.errorMessage) {
                footer.insertAdjacentHTML('afterbegin', this.getErrorTemplate());
                this.errorElement = this.container.querySelector('.checkbox-error');
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
     * 验证
     */
    validate() {
        const checked = this.state.checked;
        let isValid = true;
        let errorMessage = '';
        
        // 重置状态
        this.state.isValid = true;
        this.state.errorMessage = '';
        
        // 必填验证
        if (this.options.required && !checked) {
            isValid = false;
            errorMessage = '此选项为必选';
        }
        
        // 自定义验证规则
        if (isValid && this.options.validationRules.length > 0) {
            for (const rule of this.options.validationRules) {
                if (rule.validate && !rule.validate(checked)) {
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
        this.input.dispatchEvent(new CustomEvent('checkbox:validate', {
            detail: { isValid, errorMessage, checkbox: this }
        }));
        
        return isValid;
    }
    
    /**
     * 切换状态
     */
    toggle() {
        if (this.options.disabled || this.options.readonly) return;
        
        if (this.state.indeterminate) {
            // 从不定状态切换到选中
            this.state.indeterminate = false;
            this.state.checked = true;
        } else {
            // 正常切换
            this.state.checked = !this.state.checked;
            this.state.indeterminate = false;
        }
        
        // 更新视觉状态
        this.updateVisualState();
        
        // 标记为脏数据
        this.state.isDirty = true;
        
        // 触发输入事件
        if (this.input) {
            this.input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    
    /**
     * 选中
     */
    check() {
        if (this.options.disabled || this.options.readonly || this.state.checked) return;
        
        this.state.checked = true;
        this.state.indeterminate = false;
        this.updateVisualState();
        
        // 标记为脏数据
        this.state.isDirty = true;
        
        // 触发输入事件
        if (this.input) {
            this.input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    
    /**
     * 取消选中
     */
    uncheck() {
        if (this.options.disabled || this.options.readonly || !this.state.checked) return;
        
        this.state.checked = false;
        this.state.indeterminate = false;
        this.updateVisualState();
        
        // 标记为脏数据
        this.state.isDirty = true;
        
        // 触发输入事件
        if (this.input) {
            this.input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    
    /**
     * 设置为不定状态
     */
    setIndeterminate(indeterminate = true) {
        if (this.options.disabled || this.options.readonly) return;
        
        this.state.indeterminate = indeterminate;
        if (indeterminate) {
            this.state.checked = false;
        }
        this.updateVisualState();
        
        // 标记为脏数据
        this.state.isDirty = true;
    }
    
    /**
     * 获取值
     */
    getValue() {
        return this.state.checked ? this.options.value : '';
    }
    
    /**
     * 获取选中状态
     */
    isChecked() {
        return this.state.checked;
    }
    
    /**
     * 获取不定状态
     */
    isIndeterminate() {
        return this.state.indeterminate;
    }
    
    /**
     * 设置值
     */
    setValue(value, silent = false) {
        const shouldBeChecked = value === this.options.value || 
                               (typeof value === 'boolean' && value) ||
                               (Array.isArray(value) && value.includes(this.options.value));
        
        if (shouldBeChecked !== this.state.checked) {
            this.state.checked = shouldBeChecked;
            this.state.indeterminate = false;
            this.updateVisualState();
            
            // 标记为脏数据
            this.state.isDirty = true;
            
            // 触发变化事件
            if (!silent && this.input) {
                this.input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }
    
    /**
     * 设置选中状态
     */
    setChecked(checked, silent = false) {
        if (checked !== this.state.checked) {
            this.state.checked = checked;
            this.state.indeterminate = false;
            this.updateVisualState();
            
            // 标记为脏数据
            this.state.isDirty = true;
            
            // 触发变化事件
            if (!silent && this.input) {
                this.input.dispatchEvent(new Event('change', { bubbles: true }));
            }
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
        this.container.classList.add('checkbox-success');
    }
    
    /**
     * 设置为警告状态
     */
    setWarning() {
        this.clearError();
        this.container.classList.add('checkbox-warning');
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
        this.control = null;
        this.label = null;
        this.errorElement = null;
        
        console.log(`[复选框] 已销毁: ${this.options.id}`);
    }
    
    /**
     * 获取当前状态
     */
    getState() {
        return {
            checked: this.state.checked,
            indeterminate: this.state.indeterminate,
            isFocused: this.state.isFocused,
            isValid: this.state.isValid,
            isDirty: this.state.isDirty,
            isTouched: this.state.isTouched,
            errorMessage: this.state.errorMessage
        };
    }
    
    /**
     * 静态方法：创建标准复选框
     */
    static standard(options) {
        return new Checkbox({
            type: 'checkbox',
            ...options
        });
    }
    
    /**
     * 静态方法：创建开关复选框
     */
    static switch(options) {
        return new Checkbox({
            type: 'switch',
            ...options
        });
    }
    
    /**
     * 静态方法：创建切换复选框
     */
    static toggle(options) {
        return new Checkbox({
            type: 'toggle',
            ...options
        });
    }
}

/**
 * 复选框组组件
 * 用于管理一组相关的复选框
 */
export class CheckboxGroup {
    constructor(options = {}) {
        this.options = {
            id: `checkbox-group_${Utils.generateId()}`,
            name: '',
            value: [], // 选中的值数组
            label: '',
            description: '',
            disabled: false,
            readonly: false,
            required: false,
            layout: 'vertical', // 'vertical', 'horizontal', 'grid'
            columns: 1, // 网格布局时的列数
            options: [], // [{value, label, description, disabled, checked}]
            size: 'md',
            variant: 'default',
            validateOn: 'change',
            validationRules: [],
            classes: {
                container: '',
                label: '',
                description: '',
                group: '',
                checkbox: '',
                error: '',
                help: ''
            },
            onChange: null,
            onValidate: null,
            ...options
        };
        
        this.state = {
            value: Array.isArray(this.options.value) ? this.options.value : [],
            checkboxes: [],
            isValid: true,
            isDirty: false,
            isTouched: false,
            errorMessage: ''
        };
        
        this.container = null;
        this.checkboxMap = new Map();
        
        this.init();
    }
    
    /**
     * 初始化复选框组
     */
    init() {
        // 创建容器
        this.createContainer();
        
        // 创建复选框
        this.createCheckboxes();
        
        // 初始验证
        if (this.options.validateOn === 'change') {
            this.validate();
        }
        
        console.log(`[复选框组] 初始化: ${this.options.id}`);
    }
    
    /**
     * 创建容器
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = `${this.options.id}_container`;
        this.container.className = this.getContainerClasses();
        
        // 渲染容器
        this.container.innerHTML = this.getTemplate();
    }
    
    /**
     * 获取容器类名
     */
    getContainerClasses() {
        const classes = ['checkbox-group-container'];
        
        // 布局
        if (this.options.layout) {
            classes.push(`checkbox-group-${this.options.layout}`);
        }
        
        // 网格列数
        if (this.options.layout === 'grid') {
            classes.push(`checkbox-group-columns-${this.options.columns}`);
        }
        
        // 大小
        if (this.options.size) {
            classes.push(`checkbox-group-${this.options.size}`);
        }
        
        // 变体
        if (this.options.variant !== 'default') {
            classes.push(`checkbox-group-${this.options.variant}`);
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
            <!-- 组标签 -->
            ${this.options.label ? `
                <div class="checkbox-group-label ${this.options.classes.label || ''}">
                    ${this.options.label}
                    ${this.options.required ? '<span class="checkbox-group-required">*</span>' : ''}
                </div>
            ` : ''}
            
            <!-- 组描述 -->
            ${this.options.description ? `
                <div class="checkbox-group-description ${this.options.classes.description || ''}">
                    ${this.options.description}
                </div>
            ` : ''}
            
            <!-- 复选框容器 -->
            <div class="checkbox-group-options ${this.options.classes.group || ''}"></div>
            
            <!-- 底部区域 -->
            <div class="checkbox-group-footer">
                <!-- 错误消息 -->
                ${this.state.errorMessage ? this.getErrorTemplate() : ''}
            </div>
        `;
    }
    
    /**
     * 获取错误模板
     */
    getErrorTemplate() {
        return `
            <div class="checkbox-group-error ${this.options.classes.error || ''}">
                <i class="fas fa-exclamation-circle"></i>
                <span>${this.state.errorMessage}</span>
            </div>
        `;
    }
    
    /**
     * 创建复选框
     */
    createCheckboxes() {
        const optionsContainer = this.container.querySelector('.checkbox-group-options');
        if (!optionsContainer) return;
        
        // 清空容器
        optionsContainer.innerHTML = '';
        this.checkboxMap.clear();
        this.state.checkboxes = [];
        
        // 创建每个复选框
        this.options.options.forEach((option, index) => {
            const checkbox = new Checkbox({
                id: `${this.options.id}_${index}`,
                name: this.options.name,
                value: option.value,
                label: option.label || option.text,
                description: option.description,
                checked: this.state.value.includes(option.value),
                disabled: option.disabled || this.options.disabled,
                readonly: option.readonly || this.options.readonly,
                size: this.options.size,
                variant: this.options.variant,
                classes: {
                    container: this.options.classes.checkbox || ''
                },
                onChange: (checked, checkboxInst) => {
                    this.handleCheckboxChange(option.value, checked);
                }
            });
            
            // 渲染复选框
            checkbox.renderTo(optionsContainer);
            
            // 保存引用
            this.checkboxMap.set(option.value, checkbox);
            this.state.checkboxes.push(checkbox);
        });
    }
    
    /**
     * 处理复选框变化
     */
    handleCheckboxChange(value, checked) {
        // 更新值数组
        if (checked) {
            if (!this.state.value.includes(value)) {
                this.state.value.push(value);
            }
        } else {
            const index = this.state.value.indexOf(value);
            if (index !== -1) {
                this.state.value.splice(index, 1);
            }
        }
        
        // 标记为脏数据
        this.state.isDirty = true;
        
        // 触发变化回调
        if (this.options.onChange) {
            this.options.onChange(this.state.value, this);
        }
        
        // 验证
        if (this.options.validateOn === 'change') {
            this.validate();
        }
    }
    
    /**
     * 验证
     */
    validate() {
        const value = this.state.value;
        let isValid = true;
        let errorMessage = '';
        
        // 重置状态
        this.state.isValid = true;
        this.state.errorMessage = '';
        
        // 必填验证
        if (this.options.required && value.length === 0) {
            isValid = false;
            errorMessage = '至少需要选择一个选项';
        }
        
        // 最小选择数量验证
        const minSelection = this.options.validationRules.find(r => r.type === 'minSelection');
        if (minSelection && value.length < minSelection.value) {
            isValid = false;
            errorMessage = minSelection.message || `至少需要选择 ${minSelection.value} 个选项`;
        }
        
        // 最大选择数量验证
        const maxSelection = this.options.validationRules.find(r => r.type === 'maxSelection');
        if (maxSelection && value.length > maxSelection.value) {
            isValid = false;
            errorMessage = maxSelection.message || `最多只能选择 ${maxSelection.value} 个选项`;
        }
        
        // 自定义验证规则
        if (isValid) {
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
        
        // 更新错误显示
        this.updateErrorDisplay();
        
        // 触发验证回调
        if (this.options.onValidate) {
            this.options.onValidate(isValid, errorMessage, this);
        }
        
        return isValid;
    }
    
    /**
     * 更新错误显示
     */
    updateErrorDisplay() {
        const errorElement = this.container.querySelector('.checkbox-group-error');
        
        if (!errorElement && this.state.errorMessage) {
            const footer = this.container.querySelector('.checkbox-group-footer');
            if (footer) {
                footer.insertAdjacentHTML('afterbegin', this.getErrorTemplate());
            }
        } else if (errorElement) {
            if (this.state.errorMessage) {
                errorElement.innerHTML = `
                    <i class="fas fa-exclamation-circle"></i>
                    <span>${this.state.errorMessage}</span>
                `;
                errorElement.style.display = 'flex';
            } else {
                errorElement.style.display = 'none';
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
     * 获取选中的复选框
     */
    getSelectedCheckboxes() {
        return this.state.checkboxes.filter(checkbox => checkbox.isChecked());
    }
    
    /**
     * 设置值
     */
    setValue(values, silent = false) {
        const newValues = Array.isArray(values) ? values : [values];
        
        // 更新状态
        this.state.value = newValues;
        
        // 更新每个复选框
        this.checkboxMap.forEach((checkbox, value) => {
            const checked = newValues.includes(value);
            checkbox.setChecked(checked, true);
        });
        
        // 标记为脏数据
        this.state.isDirty = true;
        
        // 触发变化事件
        if (!silent && this.options.onChange) {
            this.options.onChange(this.state.value, this);
        }
        
        // 验证
        if (!silent) {
            this.validate();
        }
    }
    
    /**
     * 全选
     */
    selectAll() {
        const allValues = this.options.options.map(opt => opt.value);
        this.setValue(allValues);
    }
    
    /**
     * 全不选
     */
    deselectAll() {
        this.setValue([]);
    }
    
    /**
     * 启用
     */
    enable() {
        this.options.disabled = false;
        this.checkboxMap.forEach(checkbox => {
            checkbox.enable();
        });
    }
    
    /**
     * 禁用
     */
    disable() {
        this.options.disabled = true;
        this.checkboxMap.forEach(checkbox => {
            checkbox.disable();
        });
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
        // 销毁所有复选框
        this.checkboxMap.forEach(checkbox => {
            checkbox.destroy();
        });
        
        this.checkboxMap.clear();
        this.state.checkboxes = [];
        
        // 从DOM移除
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // 清理引用
        this.container = null;
        
        console.log(`[复选框组] 已销毁: ${this.options.id}`);
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
            errorMessage: this.state.errorMessage
        };
    }
}
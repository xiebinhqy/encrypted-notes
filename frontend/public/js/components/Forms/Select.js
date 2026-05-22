/**
 * 选择框组件
 * 支持单选、多选、搜索、分组、远程加载等功能的增强选择框
 */

import Utils from '../../core/utils.js';

export class Select {
    constructor(options = {}) {
        this.options = {
            id: `select_${Utils.generateId()}`,
            name: '',
            value: '', // 单选为值，多选为数组
            label: '',
            placeholder: '请选择...',
            multiple: false,
            searchable: false,
            clearable: true,
            disabled: false,
            required: false,
            size: 'md', // 'sm', 'md', 'lg'
            variant: 'default', // 'default', 'outline', 'filled', 'flushed'
            state: 'default', // 'default', 'success', 'warning', 'error'
            errorMessage: '',
            helpText: '',
            options: [], // [{value, text, disabled, selected, group, icon, description}]
            groups: [], // [{name, label, options}]
            remote: false,
            remoteUrl: '',
            remoteParams: {},
            remoteMethod: 'GET',
            minChars: 1,
            maxOptions: 50,
            loadingText: '加载中...',
            noResultsText: '无匹配结果',
            noOptionsText: '暂无选项',
            createOption: false, // 允许创建新选项
            createText: '创建: {input}',
            maxSelection: null, // 多选时最大选择数量
            closeOnSelect: true,
            openOnFocus: true,
            position: 'bottom', // 'bottom', 'top', 'auto'
            classes: {
                container: '',
                label: '',
                select: '',
                dropdown: '',
                option: '',
                group: '',
                search: '',
                clear: '',
                error: '',
                help: ''
            },
            onOpen: null,
            onClose: null,
            onChange: null,
            onSearch: null,
            onCreate: null,
            onFocus: null,
            onBlur: null,
            onValidate: null,
            ...options
        };
        
        this.state = {
            isOpen: false,
            isFocused: false,
            isSearching: false,
            isLoading: false,
            searchQuery: '',
            filteredOptions: [],
            selectedOptions: [],
            value: this.options.value,
            isValid: true,
            isDirty: false,
            isTouched: false,
            errorMessage: this.options.errorMessage
        };
        
        this.container = null;
        this.select = null;
        this.dropdown = null;
        this.searchInput = null;
        this.clearButton = null;
        this.errorElement = null;
        
        this.keyboardNavIndex = -1;
        this.remoteCache = new Map();
        this.clickOutsideHandler = null;
        
        this.init();
    }
    
    /**
     * 初始化选择框组件
     */
    init() {
        // 处理初始值
        this.processInitialValue();
        
        // 创建容器
        this.createContainer();
        
        // 绑定事件
        this.bindEvents();
        
        // 初始验证
        if (this.options.validateOn === 'change' || this.options.validateOn === 'blur') {
            this.validate();
        }
        
        console.log(`[选择框] 初始化: ${this.options.id}`);
    }
    
    /**
     * 处理初始值
     */
    processInitialValue() {
        if (this.options.multiple) {
            // 多选：值应该是数组
            this.state.value = Array.isArray(this.options.value) ? this.options.value : 
                              this.options.value ? [this.options.value] : [];
            
            // 查找选中的选项
            this.state.selectedOptions = this.findOptionsByValue(this.state.value);
        } else {
            // 单选
            this.state.value = this.options.value;
            
            // 查找选中的选项
            const selected = this.findOptionByValue(this.state.value);
            this.state.selectedOptions = selected ? [selected] : [];
        }
        
        // 初始化过滤选项
        this.state.filteredOptions = this.filterOptions('');
    }
    
    /**
     * 通过值查找选项
     */
    findOptionByValue(value) {
        if (!value && value !== 0) return null;
        
        // 在普通选项中查找
        for (const option of this.options.options) {
            if (String(option.value) === String(value)) {
                return option;
            }
        }
        
        // 在分组选项中查找
        for (const group of this.options.groups) {
            for (const option of group.options || []) {
                if (String(option.value) === String(value)) {
                    return option;
                }
            }
        }
        
        return null;
    }
    
    /**
     * 通过值数组查找多个选项
     */
    findOptionsByValue(values) {
        const selected = [];
        
        for (const value of values) {
            const option = this.findOptionByValue(value);
            if (option) {
                selected.push(option);
            }
        }
        
        return selected;
    }
    
    /**
     * 创建容器
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = `${this.options.id}_container`;
        this.container.className = this.getContainerClasses();
        
        // 渲染选择框
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
        const classes = ['select-container'];
        
        // 大小
        if (this.options.size) {
            classes.push(`select-${this.options.size}`);
        }
        
        // 变体
        if (this.options.variant !== 'default') {
            classes.push(`select-${this.options.variant}`);
        }
        
        // 状态
        if (this.options.state !== 'default') {
            classes.push(`select-${this.options.state}`);
        }
        
        // 焦点状态
        if (this.state.isFocused) {
            classes.push('select-focused');
        }
        
        // 打开状态
        if (this.state.isOpen) {
            classes.push('select-open');
        }
        
        // 禁用状态
        if (this.options.disabled) {
            classes.push('select-disabled');
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
            
            <!-- 选择框包装 -->
            <div class="select-wrapper">
                <!-- 选择框触发器 -->
                <div class="select-trigger" tabindex="${this.options.disabled ? '-1' : '0'}">
                    <!-- 已选内容 -->
                    <div class="selected-content">
                        ${this.getSelectedContentTemplate()}
                    </div>
                    
                    <!-- 下拉箭头 -->
                    <div class="select-arrow">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    
                    <!-- 清空按钮 -->
                    ${this.options.clearable && this.hasSelection() ? this.getClearButtonTemplate() : ''}
                </div>
                
                <!-- 下拉菜单 -->
                ${this.getDropdownTemplate()}
            </div>
            
            <!-- 底部区域 -->
            <div class="select-footer">
                <!-- 错误消息 -->
                ${this.state.errorMessage ? this.getErrorTemplate() : ''}
                
                <!-- 帮助文本 -->
                ${this.options.helpText ? this.getHelpTemplate() : ''}
            </div>
            
            <!-- 隐藏的原始选择框（用于表单提交） -->
            ${this.getHiddenSelectTemplate()}
        `;
    }
    
    /**
     * 获取标签模板
     */
    getLabelTemplate() {
        return `
            <label for="${this.options.id}" class="select-label ${this.options.classes.label || ''}">
                ${this.options.label}
                ${this.options.required ? '<span class="select-required">*</span>' : ''}
            </label>
        `;
    }
    
    /**
     * 获取已选内容模板
     */
    getSelectedContentTemplate() {
        if (this.state.selectedOptions.length === 0) {
            return `<span class="placeholder">${this.options.placeholder}</span>`;
        }
        
        if (this.options.multiple) {
            // 多选显示标签
            const selectedCount = this.state.selectedOptions.length;
            if (selectedCount > 2) {
                return `<span class="selected-text">已选择 ${selectedCount} 项</span>`;
            } else {
                return this.state.selectedOptions.map(option => `
                    <span class="selected-tag" data-value="${option.value}">
                        ${option.icon ? `<i class="${option.icon}"></i>` : ''}
                        <span class="tag-text">${option.text}</span>
                        <button type="button" class="tag-remove" data-value="${option.value}">
                            <i class="fas fa-times"></i>
                        </button>
                    </span>
                `).join('');
            }
        } else {
            // 单选显示文本
            const option = this.state.selectedOptions[0];
            return `
                <span class="selected-text">
                    ${option.icon ? `<i class="${option.icon}"></i>` : ''}
                    <span>${option.text}</span>
                    ${option.description ? `<small class="selected-description">${option.description}</small>` : ''}
                </span>
            `;
        }
    }
    
    /**
     * 获取清空按钮模板
     */
    getClearButtonTemplate() {
        return `
            <button type="button" 
                    class="select-clear ${this.options.classes.clear || ''}"
                    aria-label="清空选择">
                <i class="fas fa-times"></i>
            </button>
        `;
    }
    
    /**
     * 获取下拉菜单模板
     */
    getDropdownTemplate() {
        return `
            <div class="select-dropdown ${this.options.classes.dropdown || ''}">
                <!-- 搜索框 -->
                ${this.options.searchable ? this.getSearchTemplate() : ''}
                
                <!-- 选项列表 -->
                <div class="select-options">
                    ${this.getOptionsTemplate()}
                </div>
                
                <!-- 加载状态 -->
                ${this.state.isLoading ? this.getLoadingTemplate() : ''}
                
                <!-- 创建选项 -->
                ${this.options.createOption && this.state.searchQuery && this.showCreateOption() ? 
                    this.getCreateOptionTemplate() : ''}
            </div>
        `;
    }
    
    /**
     * 获取搜索模板
     */
    getSearchTemplate() {
        return `
            <div class="select-search ${this.options.classes.search || ''}">
                <input type="text" 
                       class="search-input" 
                       placeholder="搜索..."
                       value="${Utils.escapeHtml(this.state.searchQuery)}"
                       ${this.options.disabled ? 'disabled' : ''}>
                <div class="search-icon">
                    <i class="fas fa-search"></i>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取选项模板
     */
    getOptionsTemplate() {
        if (this.state.isLoading) {
            return '';
        }
        
        if (this.state.filteredOptions.length === 0) {
            return `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <span>${this.state.searchQuery ? this.options.noResultsText : this.options.noOptionsText}</span>
                </div>
            `;
        }
        
        let template = '';
        let currentGroup = null;
        
        for (let i = 0; i < this.state.filteredOptions.length; i++) {
            const option = this.state.filteredOptions[i];
            
            // 分组处理
            if (option.group && option.group !== currentGroup) {
                if (currentGroup !== null) {
                    template += '</div>';
                }
                template += `
                    <div class="select-group">
                        <div class="group-label">${option.group}</div>
                        <div class="group-options">
                `;
                currentGroup = option.group;
            } else if (!option.group && currentGroup !== null) {
                template += '</div></div>';
                currentGroup = null;
            }
            
            // 选项模板
            template += this.getOptionTemplate(option, i);
        }
        
        if (currentGroup !== null) {
            template += '</div></div>';
        }
        
        return template;
    }
    
    /**
     * 获取单个选项模板
     */
    getOptionTemplate(option, index) {
        const isSelected = this.isOptionSelected(option);
        const isDisabled = option.disabled || this.options.disabled;
        const isKeyboardNav = this.keyboardNavIndex === index;
        
        return `
            <div class="select-option ${this.options.classes.option || ''} 
                         ${isSelected ? 'selected' : ''} 
                         ${isDisabled ? 'disabled' : ''}
                         ${isKeyboardNav ? 'keyboard-nav' : ''}"
                 data-value="${option.value}"
                 data-index="${index}"
                 ${isDisabled ? 'aria-disabled="true"' : ''}
                 role="option"
                 aria-selected="${isSelected}">
                ${this.options.multiple ? `
                    <div class="option-checkbox">
                        <i class="fas fa-check"></i>
                    </div>
                ` : ''}
                
                ${option.icon ? `
                    <div class="option-icon">
                        <i class="${option.icon}"></i>
                    </div>
                ` : ''}
                
                <div class="option-content">
                    <div class="option-text">${option.text}</div>
                    ${option.description ? `
                        <div class="option-description">${option.description}</div>
                    ` : ''}
                </div>
                
                ${isSelected && !this.options.multiple ? `
                    <div class="option-selected-icon">
                        <i class="fas fa-check"></i>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 获取加载模板
     */
    getLoadingTemplate() {
        return `
            <div class="select-loading">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="loading-text">${this.options.loadingText}</div>
            </div>
        `;
    }
    
    /**
     * 获取创建选项模板
     */
    getCreateOptionTemplate() {
        const createText = this.options.createText.replace('{input}', this.state.searchQuery);
        
        return `
            <div class="select-create" data-action="create">
                <div class="create-icon">
                    <i class="fas fa-plus"></i>
                </div>
                <div class="create-content">
                    <div class="create-text">${createText}</div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取错误模板
     */
    getErrorTemplate() {
        return `
            <div class="select-error ${this.options.classes.error || ''}">
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
            <div class="select-help ${this.options.classes.help || ''}">
                ${this.options.helpText}
            </div>
        `;
    }
    
    /**
     * 获取隐藏选择框模板（用于表单提交）
     */
    getHiddenSelectTemplate() {
        if (this.options.multiple) {
            return `
                <select name="${this.options.name || this.options.id}" 
                        multiple 
                        style="display: none">
                    ${this.state.selectedOptions.map(option => `
                        <option value="${option.value}" selected>${option.text}</option>
                    `).join('')}
                </select>
            `;
        } else {
            const value = this.state.selectedOptions[0]?.value || '';
            return `
                <select name="${this.options.name || this.options.id}" 
                        style="display: none">
                    ${value ? `<option value="${value}" selected></option>` : ''}
                </select>
            `;
        }
    }
    
    /**
     * 缓存元素
     */
    cacheElements() {
        this.select = this.container.querySelector('.select-trigger');
        this.dropdown = this.container.querySelector('.select-dropdown');
        this.searchInput = this.container.querySelector('.search-input');
        this.clearButton = this.container.querySelector('.select-clear');
        this.errorElement = this.container.querySelector('.select-error');
        this.hiddenSelect = this.container.querySelector('select');
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        if (!this.select) return;
        
        // 触发器点击事件
        this.select.addEventListener('click', (e) => this.handleTriggerClick(e));
        this.select.addEventListener('keydown', (e) => this.handleTriggerKeydown(e));
        
        // 焦点事件
        this.select.addEventListener('focus', (e) => this.handleFocus(e));
        this.select.addEventListener('blur', (e) => this.handleBlur(e));
        
        // 搜索输入事件
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
            this.searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
        }
        
        // 清空按钮
        if (this.clearButton) {
            this.clearButton.addEventListener('click', (e) => this.handleClear(e));
        }
        
        // 标签移除按钮
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.tag-remove')) {
                const tag = e.target.closest('.tag-remove');
                const value = tag.dataset.value;
                this.removeSelection(value);
                e.stopPropagation();
            }
        });
        
        // 全局点击关闭
        this.setupClickOutside();
    }
    
    /**
     * 处理触发器点击
     */
    handleTriggerClick(event) {
        if (this.options.disabled) return;
        
        if (this.state.isOpen) {
            this.close();
        } else {
            this.open();
        }
        
        event.stopPropagation();
    }
    
    /**
     * 处理触发器按键
     */
    handleTriggerKeydown(event) {
        switch (event.key) {
            case ' ':
            case 'Enter':
                event.preventDefault();
                if (!this.state.isOpen) {
                    this.open();
                }
                break;
                
            case 'Escape':
                if (this.state.isOpen) {
                    event.preventDefault();
                    this.close();
                }
                break;
                
            case 'ArrowDown':
                event.preventDefault();
                if (!this.state.isOpen) {
                    this.open();
                }
                this.focusSearchOrFirstOption();
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                if (!this.state.isOpen) {
                    this.open();
                }
                this.focusSearchOrLastOption();
                break;
                
            case 'Backspace':
                if (!this.state.searchQuery && this.state.selectedOptions.length > 0 && this.options.multiple) {
                    this.removeLastSelection();
                }
                break;
        }
    }
    
    /**
     * 处理焦点事件
     */
    handleFocus(event) {
        this.state.isFocused = true;
        
        // 更新容器类
        this.updateContainerClasses();
        
        // 自动打开下拉菜单
        if (this.options.openOnFocus && !this.state.isOpen) {
            this.open();
        }
        
        // 触发焦点回调
        if (this.options.onFocus) {
            this.options.onFocus(event, this);
        }
        
        // 触发自定义事件
        this.select.dispatchEvent(new CustomEvent('select:focus', {
            detail: { select: this }
        }));
    }
    
    /**
     * 处理失去焦点事件
     */
    handleBlur(event) {
        // 延迟处理，以便点击选项能正常触发
        setTimeout(() => {
            if (!this.container.contains(document.activeElement)) {
                this.state.isFocused = false;
                this.state.isTouched = true;
                
                // 更新容器类
                this.updateContainerClasses();
                
                // 关闭下拉菜单
                if (this.state.isOpen) {
                    this.close();
                }
                
                // 失去焦点时验证
                if (this.options.validateOn === 'blur') {
                    this.validate();
                }
                
                // 触发失去焦点回调
                if (this.options.onBlur) {
                    this.options.onBlur(event, this);
                }
                
                // 触发自定义事件
                this.select.dispatchEvent(new CustomEvent('select:blur', {
                    detail: { select: this }
                }));
            }
        }, 200);
    }
    
    /**
     * 处理搜索输入
     */
    handleSearchInput(event) {
        const query = event.target.value;
        this.state.searchQuery = query;
        
        // 过滤选项
        this.filterOptions(query);
        
        // 重置键盘导航索引
        this.keyboardNavIndex = -1;
        
        // 触发搜索回调
        if (this.options.onSearch) {
            this.options.onSearch(query, this);
        }
        
        // 远程搜索
        if (this.options.remote && query.length >= this.options.minChars) {
            this.debounceRemoteSearch(query);
        }
    }
    
    /**
     * 处理搜索按键
     */
    handleSearchKeydown(event) {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.navigateOptions(1);
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                this.navigateOptions(-1);
                break;
                
            case 'Enter':
                event.preventDefault();
                this.selectKeyboardNavOption();
                break;
                
            case 'Escape':
                event.preventDefault();
                this.close();
                this.select.focus();
                break;
        }
    }
    
    /**
     * 处理清空
     */
    handleClear(event) {
        event.stopPropagation();
        this.clear();
    }
    
    /**
     * 设置点击外部关闭
     */
    setupClickOutside() {
        this.clickOutsideHandler = (event) => {
            if (!this.container.contains(event.target) && this.state.isOpen) {
                this.close();
            }
        };
        
        document.addEventListener('click', this.clickOutsideHandler);
        document.addEventListener('touchstart', this.clickOutsideHandler);
    }
    
    /**
     * 过滤选项
     */
    filterOptions(query) {
        if (!query) {
            this.state.filteredOptions = this.getAllOptions();
        } else {
            const lowerQuery = query.toLowerCase();
            this.state.filteredOptions = this.getAllOptions().filter(option => 
                option.text.toLowerCase().includes(lowerQuery) ||
                (option.description && option.description.toLowerCase().includes(lowerQuery)) ||
                String(option.value).toLowerCase().includes(lowerQuery)
            );
        }
        
        // 更新下拉菜单
        this.updateDropdown();
        
        return this.state.filteredOptions;
    }
    
    /**
     * 获取所有选项
     */
    getAllOptions() {
        const allOptions = [...this.options.options];
        
        // 添加分组选项
        for (const group of this.options.groups) {
            for (const option of group.options || []) {
                allOptions.push({
                    ...option,
                    group: group.name
                });
            }
        }
        
        return allOptions;
    }
    
    /**
     * 防抖远程搜索
     */
    debounceRemoteSearch(query) {
        clearTimeout(this.remoteSearchTimeout);
        
        this.remoteSearchTimeout = setTimeout(() => {
            this.performRemoteSearch(query);
        }, 300);
    }
    
    /**
     * 执行远程搜索
     */
    async performRemoteSearch(query) {
        if (!this.options.remoteUrl) return;
        
        // 检查缓存
        const cacheKey = `${query}_${JSON.stringify(this.options.remoteParams)}`;
        if (this.remoteCache.has(cacheKey)) {
            this.options.options = this.remoteCache.get(cacheKey);
            this.filterOptions(query);
            return;
        }
        
        this.state.isLoading = true;
        this.updateDropdown();
        
        try {
            const url = new URL(this.options.remoteUrl);
            const params = {
                ...this.options.remoteParams,
                q: query,
                limit: this.options.maxOptions
            };
            
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });
            
            const response = await fetch(url, {
                method: this.options.remoteMethod,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.options.options = data.options || data;
                
                // 缓存结果
                this.remoteCache.set(cacheKey, this.options.options);
                
                // 更新过滤
                this.filterOptions(query);
            }
        } catch (error) {
            console.error('[选择框] 远程搜索失败:', error);
        } finally {
            this.state.isLoading = false;
            this.updateDropdown();
        }
    }
    
    /**
     * 打开下拉菜单
     */
    open() {
        if (this.state.isOpen || this.options.disabled) return;
        
        this.state.isOpen = true;
        
        // 更新容器类
        this.updateContainerClasses();
        
        // 显示下拉菜单
        if (this.dropdown) {
            this.dropdown.style.display = 'block';
            
            // 定位下拉菜单
            this.positionDropdown();
            
            // 聚焦到搜索框
            if (this.options.searchable && this.searchInput) {
                setTimeout(() => {
                    this.searchInput.focus();
                    this.searchInput.select();
                }, 10);
            }
        }
        
        // 触发打开回调
        if (this.options.onOpen) {
            this.options.onOpen(this);
        }
        
        // 触发自定义事件
        this.select.dispatchEvent(new CustomEvent('select:open', {
            detail: { select: this }
        }));
    }
    
    /**
     * 关闭下拉菜单
     */
    close() {
        if (!this.state.isOpen) return;
        
        this.state.isOpen = false;
        this.state.searchQuery = '';
        
        // 更新容器类
        this.updateContainerClasses();
        
        // 隐藏下拉菜单
        if (this.dropdown) {
            this.dropdown.style.display = 'none';
        }
        
        // 清除搜索
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        
        // 重置过滤
        this.filterOptions('');
        
        // 触发关闭回调
        if (this.options.onClose) {
            this.options.onClose(this);
        }
        
        // 触发自定义事件
        this.select.dispatchEvent(new CustomEvent('select:close', {
            detail: { select: this }
        }));
    }
    
    /**
     * 定位下拉菜单
     */
    positionDropdown() {
        if (!this.dropdown) return;
        
        const triggerRect = this.select.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = this.dropdown.offsetHeight;
        
        let top = triggerRect.bottom;
        let position = this.options.position;
        
        // 自动定位
        if (position === 'auto') {
            if (triggerRect.bottom + dropdownHeight > viewportHeight && 
                triggerRect.top > dropdownHeight) {
                position = 'top';
            } else {
                position = 'bottom';
            }
        }
        
        if (position === 'top') {
            top = triggerRect.top - dropdownHeight;
            this.dropdown.style.top = 'auto';
            this.dropdown.style.bottom = '100%';
        } else {
            this.dropdown.style.top = '100%';
            this.dropdown.style.bottom = 'auto';
        }
        
        this.dropdown.style.left = '0';
        this.dropdown.style.width = '100%';
    }
    
    /**
     * 聚焦到搜索框或第一个选项
     */
    focusSearchOrFirstOption() {
        if (this.options.searchable && this.searchInput) {
            this.searchInput.focus();
        } else if (this.state.filteredOptions.length > 0) {
            this.keyboardNavIndex = 0;
            this.scrollToOption(0);
        }
    }
    
    /**
     * 聚焦到搜索框或最后一个选项
     */
    focusSearchOrLastOption() {
        if (this.options.searchable && this.searchInput) {
            this.searchInput.focus();
        } else if (this.state.filteredOptions.length > 0) {
            this.keyboardNavIndex = this.state.filteredOptions.length - 1;
            this.scrollToOption(this.keyboardNavIndex);
        }
    }
    
    /**
     * 导航选项
     */
    navigateOptions(direction) {
        if (this.state.filteredOptions.length === 0) return;
        
        this.keyboardNavIndex += direction;
        
        if (this.keyboardNavIndex < 0) {
            this.keyboardNavIndex = this.state.filteredOptions.length - 1;
        } else if (this.keyboardNavIndex >= this.state.filteredOptions.length) {
            this.keyboardNavIndex = 0;
        }
        
        this.scrollToOption(this.keyboardNavIndex);
    }
    
    /**
     * 滚动到选项
     */
    scrollToOption(index) {
        const optionsContainer = this.dropdown.querySelector('.select-options');
        const option = this.dropdown.querySelector(`[data-index="${index}"]`);
        
        if (optionsContainer && option) {
            option.classList.add('keyboard-nav');
            
            // 移除其他选项的高亮
            this.dropdown.querySelectorAll('.select-option').forEach(opt => {
                if (opt !== option) {
                    opt.classList.remove('keyboard-nav');
                }
            });
            
            // 滚动到可见区域
            const containerRect = optionsContainer.getBoundingClientRect();
            const optionRect = option.getBoundingClientRect();
            
            if (optionRect.bottom > containerRect.bottom) {
                optionsContainer.scrollTop += (optionRect.bottom - containerRect.bottom);
            } else if (optionRect.top < containerRect.top) {
                optionsContainer.scrollTop -= (containerRect.top - optionRect.top);
            }
        }
    }
    
    /**
     * 选择键盘导航的选项
     */
    selectKeyboardNavOption() {
        if (this.keyboardNavIndex >= 0 && this.keyboardNavIndex < this.state.filteredOptions.length) {
            const option = this.state.filteredOptions[this.keyboardNavIndex];
            if (!option.disabled) {
                this.toggleOption(option);
            }
        }
    }
    
    /**
     * 选项是否被选中
     */
    isOptionSelected(option) {
        return this.state.selectedOptions.some(selected => 
            String(selected.value) === String(option.value)
        );
    }
    
    /**
     * 是否有选择
     */
    hasSelection() {
        return this.state.selectedOptions.length > 0;
    }
    
    /**
     * 是否显示创建选项
     */
    showCreateOption() {
        if (!this.state.searchQuery) return false;
        
        // 检查是否已存在相同值的选项
        const exists = this.getAllOptions().some(option => 
            option.text.toLowerCase() === this.state.searchQuery.toLowerCase() ||
            String(option.value).toLowerCase() === this.state.searchQuery.toLowerCase()
        );
        
        return !exists;
    }
    
    /**
     * 切换选项
     */
    toggleOption(option) {
        if (option.disabled || this.options.disabled) return;
        
        if (this.options.multiple) {
            // 多选
            if (this.isOptionSelected(option)) {
                this.removeSelection(option.value);
            } else {
                // 检查最大选择数量
                if (this.options.maxSelection && 
                    this.state.selectedOptions.length >= this.options.maxSelection) {
                    return;
                }
                this.addSelection(option);
            }
        } else {
            // 单选
            this.setSelection(option);
            
            // 选择后关闭
            if (this.options.closeOnSelect) {
                this.close();
                this.select.focus();
            }
        }
    }
    
    /**
     * 添加选择
     */
    addSelection(option) {
        this.state.selectedOptions.push(option);
        
        if (this.options.multiple) {
            this.state.value = this.state.selectedOptions.map(opt => opt.value);
        } else {
            this.state.value = option.value;
        }
        
        this.updateSelection();
    }
    
    /**
     * 移除选择
     */
    removeSelection(value) {
        this.state.selectedOptions = this.state.selectedOptions.filter(
            option => String(option.value) !== String(value)
        );
        
        if (this.options.multiple) {
            this.state.value = this.state.selectedOptions.map(opt => opt.value);
        } else {
            this.state.value = '';
        }
        
        this.updateSelection();
    }
    
    /**
     * 移除最后一个选择
     */
    removeLastSelection() {
        if (this.state.selectedOptions.length > 0) {
            const lastOption = this.state.selectedOptions[this.state.selectedOptions.length - 1];
            this.removeSelection(lastOption.value);
        }
    }
    
    /**
     * 设置选择
     */
    setSelection(option) {
        this.state.selectedOptions = [option];
        this.state.value = option.value;
        this.updateSelection();
    }
    
    /**
     * 清空选择
     */
    clear() {
        this.state.selectedOptions = [];
        this.state.value = this.options.multiple ? [] : '';
        this.updateSelection();
    }
    
    /**
     * 创建新选项
     */
    createOption() {
        if (!this.state.searchQuery || !this.options.createOption) return;
        
        const newOption = {
            value: this.state.searchQuery,
            text: this.state.searchQuery
        };
        
        // 添加到选项列表
        this.options.options.push(newOption);
        
        // 选择新选项
        this.toggleOption(newOption);
        
        // 触发创建回调
        if (this.options.onCreate) {
            this.options.onCreate(newOption, this);
        }
        
        // 清除搜索
        this.state.searchQuery = '';
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        
        // 更新过滤
        this.filterOptions('');
    }
    
    /**
     * 更新选择显示
     */
    updateSelection() {
        // 更新触发器内容
        const selectedContent = this.container.querySelector('.selected-content');
        if (selectedContent) {
            selectedContent.innerHTML = this.getSelectedContentTemplate();
        }
        
        // 更新清空按钮显示
        this.updateClearButton();
        
        // 更新隐藏的选择框
        this.updateHiddenSelect();
        
        // 更新下拉菜单中的选中状态
        this.updateDropdownSelection();
        
        // 标记为脏数据
        this.state.isDirty = true;
        
        // 触发变化回调
        if (this.options.onChange) {
            this.options.onChange(this.state.value, this.state.selectedOptions, this);
        }
        
        // 触发自定义事件
        this.select.dispatchEvent(new CustomEvent('select:change', {
            detail: {
                value: this.state.value,
                selectedOptions: this.state.selectedOptions,
                select: this
            }
        }));
        
        // 验证
        this.validate();
    }
    
    /**
     * 更新清空按钮显示
     */
    updateClearButton() {
        if (this.clearButton) {
            this.clearButton.style.display = this.hasSelection() ? 'flex' : 'none';
        }
    }
    
    /**
     * 更新隐藏的选择框
     */
    updateHiddenSelect() {
        if (!this.hiddenSelect) return;
        
        // 移除所有选项
        this.hiddenSelect.innerHTML = '';
        
        // 添加选中的选项
        for (const option of this.state.selectedOptions) {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            optionElement.selected = true;
            this.hiddenSelect.appendChild(optionElement);
        }
    }
    
    /**
     * 更新下拉菜单选择状态
     */
    updateDropdownSelection() {
        if (!this.dropdown) return;
        
        const options = this.dropdown.querySelectorAll('.select-option');
        options.forEach(option => {
            const value = option.dataset.value;
            const isSelected = this.state.selectedOptions.some(
                selected => String(selected.value) === String(value)
            );
            
            option.classList.toggle('selected', isSelected);
            option.setAttribute('aria-selected', isSelected);
        });
    }
    
    /**
     * 更新下拉菜单
     */
    updateDropdown() {
        if (!this.dropdown) return;
        
        const optionsContainer = this.dropdown.querySelector('.select-options');
        if (optionsContainer) {
            optionsContainer.innerHTML = this.getOptionsTemplate();
            
            // 重新绑定选项点击事件
            this.bindOptionEvents();
        }
        
        // 更新创建选项
        const createContainer = this.dropdown.querySelector('.select-create');
        if (createContainer) {
            createContainer.innerHTML = this.getCreateOptionTemplate();
            this.bindCreateOptionEvent();
        }
    }
    
    /**
     * 绑定选项事件
     */
    bindOptionEvents() {
        const options = this.dropdown.querySelectorAll('.select-option');
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                const value = option.dataset.value;
                const index = parseInt(option.dataset.index);
                const optionData = this.state.filteredOptions[index];
                
                if (optionData && !optionData.disabled) {
                    this.toggleOption(optionData);
                }
                
                e.stopPropagation();
            });
        });
    }
    
    /**
     * 绑定创建选项事件
     */
    bindCreateOptionEvent() {
        const createOption = this.dropdown.querySelector('.select-create');
        if (createOption) {
            createOption.addEventListener('click', () => {
                this.createOption();
            });
        }
    }
    
    /**
     * 更新容器类
     */
    updateContainerClasses() {
        if (!this.container) return;
        
        // 移除状态类
        this.container.classList.remove(
            'select-focused', 
            'select-open', 
            'select-success', 
            'select-warning', 
            'select-error'
        );
        
        // 添加焦点类
        if (this.state.isFocused) {
            this.container.classList.add('select-focused');
        }
        
        // 添加打开类
        if (this.state.isOpen) {
            this.container.classList.add('select-open');
        }
        
        // 添加验证状态类
        if (this.state.isTouched) {
            if (!this.state.isValid) {
                this.container.classList.add('select-error');
            } else if (this.state.isDirty) {
                this.container.classList.add('select-success');
            }
        }
    }
    
    /**
     * 更新状态
     */
    updateState() {
        // 更新清空按钮显示
        this.updateClearButton();
        
        // 更新错误显示
        this.updateErrorDisplay();
    }
    
    /**
     * 更新错误显示
     */
    updateErrorDisplay() {
        if (!this.errorElement) {
            // 如果没有错误元素，创建或更新
            const footer = this.container.querySelector('.select-footer');
            if (footer && this.state.errorMessage) {
                footer.insertAdjacentHTML('afterbegin', this.getErrorTemplate());
                this.errorElement = this.container.querySelector('.select-error');
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
        const value = this.state.value;
        let isValid = true;
        let errorMessage = '';
        
        // 重置状态
        this.state.isValid = true;
        this.state.errorMessage = '';
        
        // 必填验证
        if (this.options.required) {
            if (this.options.multiple) {
                if (value.length === 0) {
                    isValid = false;
                    errorMessage = '此字段为必填项';
                }
            } else {
                if (!value && value !== 0) {
                    isValid = false;
                    errorMessage = '此字段为必填项';
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
        this.select.dispatchEvent(new CustomEvent('select:validate', {
            detail: { isValid, errorMessage, select: this }
        }));
        
        return isValid;
    }
    
    /**
     * 获取值
     */
    getValue() {
        return this.state.value;
    }
    
    /**
     * 获取选中的选项
     */
    getSelectedOptions() {
        return this.state.selectedOptions;
    }
    
    /**
     * 设置值
     */
    setValue(value, silent = false) {
        const oldValue = this.state.value;
        
        if (this.options.multiple) {
            // 多选
            const values = Array.isArray(value) ? value : [value];
            this.state.value = values;
            this.state.selectedOptions = this.findOptionsByValue(values);
        } else {
            // 单选
            this.state.value = value;
            const option = this.findOptionByValue(value);
            this.state.selectedOptions = option ? [option] : [];
        }
        
        // 更新UI
        this.updateSelection();
        
        // 标记为脏数据
        this.state.isDirty = true;
        
        // 验证
        if (!silent) {
            this.validate();
        }
        
        // 触发变化事件
        if (!silent && oldValue !== this.state.value) {
            if (this.options.onChange) {
                this.options.onChange(this.state.value, this.state.selectedOptions, this);
            }
        }
    }
    
    /**
     * 设置选项
     */
    setOptions(options, groups = []) {
        this.options.options = options;
        this.options.groups = groups;
        
        // 重新处理当前值
        this.processInitialValue();
        
        // 更新UI
        this.updateSelection();
        this.updateDropdown();
    }
    
    /**
     * 添加选项
     */
    addOption(option) {
        this.options.options.push(option);
        
        // 如果当前值匹配新选项，更新选择
        if (String(option.value) === String(this.state.value)) {
            this.setSelection(option);
        }
        
        // 更新下拉菜单
        this.updateDropdown();
    }
    
    /**
     * 移除选项
     */
    removeOption(value) {
        // 从选项列表中移除
        this.options.options = this.options.options.filter(opt => 
            String(opt.value) !== String(value)
        );
        
        // 从分组中移除
        for (const group of this.options.groups) {
            if (group.options) {
                group.options = group.options.filter(opt => 
                    String(opt.value) !== String(value)
                );
            }
        }
        
        // 如果当前选中了被移除的选项，清除选择
        if (this.isOptionSelected({ value })) {
            this.removeSelection(value);
        }
        
        // 更新下拉菜单
        this.updateDropdown();
    }
    
    /**
     * 启用
     */
    enable() {
        this.options.disabled = false;
        this.updateContainerClasses();
        
        if (this.select) {
            this.select.tabIndex = 0;
        }
        
        if (this.searchInput) {
            this.searchInput.disabled = false;
        }
    }
    
    /**
     * 禁用
     */
    disable() {
        this.options.disabled = true;
        this.updateContainerClasses();
        
        if (this.select) {
            this.select.tabIndex = -1;
        }
        
        if (this.searchInput) {
            this.searchInput.disabled = true;
        }
        
        // 关闭下拉菜单
        this.close();
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
        this.container.classList.add('select-success');
    }
    
    /**
     * 设置为警告状态
     */
    setWarning() {
        this.clearError();
        this.container.classList.add('select-warning');
    }
    
    /**
     * 聚焦
     */
    focus() {
        if (this.select) {
            this.select.focus();
        }
    }
    
    /**
     * 失去焦点
     */
    blur() {
        if (this.select) {
            this.select.blur();
        }
    }
    
    /**
     * 获取选择元素
     */
    getSelectElement() {
        return this.select;
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
        clearTimeout(this.remoteSearchTimeout);
        
        // 移除全局事件监听
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
            document.removeEventListener('touchstart', this.clickOutsideHandler);
        }
        
        // 从DOM移除
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // 清理引用
        this.container = null;
        this.select = null;
        this.dropdown = null;
        this.searchInput = null;
        this.clearButton = null;
        this.errorElement = null;
        this.hiddenSelect = null;
        
        console.log(`[选择框] 已销毁: ${this.options.id}`);
    }
    
    /**
     * 获取当前状态
     */
    getState() {
        return {
            value: this.state.value,
            selectedOptions: this.state.selectedOptions,
            isOpen: this.state.isOpen,
            isFocused: this.state.isFocused,
            isValid: this.state.isValid,
            isDirty: this.state.isDirty,
            isTouched: this.state.isTouched,
            errorMessage: this.state.errorMessage,
            searchQuery: this.state.searchQuery
        };
    }
    
    /**
     * 静态方法：创建单选选择框
     */
    static single(options) {
        return new Select({
            multiple: false,
            clearable: true,
            ...options
        });
    }
    
    /**
     * 静态方法：创建多选选择框
     */
    static multiple(options) {
        return new Select({
            multiple: true,
            clearable: true,
            ...options
        });
    }
    
    /**
     * 静态方法：创建搜索选择框
     */
    static searchable(options) {
        return new Select({
            searchable: true,
            openOnFocus: true,
            ...options
        });
    }
    
    /**
     * 静态方法：创建远程搜索选择框
     */
    static remote(options) {
        return new Select({
            searchable: true,
            remote: true,
            minChars: 2,
            loadingText: '搜索中...',
            ...options
        });
    }
}
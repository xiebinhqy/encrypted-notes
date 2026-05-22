/**
 * 基础弹窗组件
 * 提供模态框的基础功能：打开/关闭、动画、遮罩层、键盘事件、焦点管理等
 */

import Utils from '../../core/utils.js';

export class BaseModal {
    constructor(options = {}) {
        this.options = {
            id: `modal_${Utils.generateId()}`,
            title: '',
            content: '',
            size: 'md', // 'sm', 'md', 'lg', 'xl', 'fullscreen'
            type: 'default', // 'default', 'alert', 'confirm', 'prompt', 'form'
            showCloseButton: true,
            showBackdrop: true,
            backdropClose: true,
            keyboardClose: true,
            animate: true,
            animationType: 'fade', // 'fade', 'slide', 'zoom'
            position: 'center', // 'center', 'top', 'bottom', 'left', 'right'
            autoFocus: true,
            focusTrap: true,
            zIndex: 1050,
            onOpen: null,
            onClose: null,
            onConfirm: null,
            onCancel: null,
            buttons: [], // [{text, type, action, disabled, className}]
            classes: {
                modal: '',
                dialog: '',
                content: '',
                header: '',
                body: '',
                footer: ''
            },
            ...options
        };
        
        this.state = {
            isOpen: false,
            isOpening: false,
            isClosing: false,
            isVisible: false
        };
        
        this.elements = {};
        this.focusableElements = [];
        this.lastFocusedElement = null;
        this.animationTimeout = null;
        
        this.init();
    }
    
    /**
     * 初始化模态框
     */
    init() {
        // 创建DOM元素
        this.createElements();
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 渲染内容
        this.render();
    }
    
    /**
     * 创建DOM元素
     */
    createElements() {
        // 创建模态框容器
        this.container = document.createElement('div');
        this.container.className = 'modal-container';
        this.container.id = this.options.id;
        this.container.setAttribute('role', 'dialog');
        this.container.setAttribute('aria-modal', 'true');
        this.container.setAttribute('aria-labelledby', `${this.options.id}_title`);
        this.container.setAttribute('aria-describedby', `${this.options.id}_body`);
        this.container.style.zIndex = this.options.zIndex;
        
        // 创建遮罩层
        if (this.options.showBackdrop) {
            this.backdrop = document.createElement('div');
            this.backdrop.className = 'modal-backdrop';
            this.backdrop.setAttribute('aria-hidden', 'true');
            this.container.appendChild(this.backdrop);
        }
        
        // 创建模态框对话框
        this.dialog = document.createElement('div');
        this.dialog.className = this.getDialogClasses();
        this.dialog.setAttribute('tabindex', '-1');
        this.container.appendChild(this.dialog);
        
        // 创建内容容器
        this.content = document.createElement('div');
        this.content.className = 'modal-content';
        this.dialog.appendChild(this.content);
        
        // 添加到body
        document.body.appendChild(this.container);
        
        // 缓存元素引用
        this.elements = {
            container: this.container,
            backdrop: this.backdrop,
            dialog: this.dialog,
            content: this.content
        };
    }
    
    /**
     * 获取对话框类名
     */
    getDialogClasses() {
        const classes = ['modal-dialog'];
        
        // 尺寸类
        if (this.options.size) {
            classes.push(`modal-${this.options.size}`);
        }
        
        // 位置类
        if (this.options.position !== 'center') {
            classes.push(`modal-${this.options.position}`);
        }
        
        // 动画类
        if (this.options.animate) {
            classes.push('modal-animated', `modal-${this.options.animationType}`);
        }
        
        // 自定义类
        if (this.options.classes.dialog) {
            classes.push(this.options.classes.dialog);
        }
        
        return classes.join(' ');
    }
    
    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 遮罩层点击关闭
        if (this.options.backdropClose && this.backdrop) {
            this.backdrop.addEventListener('click', () => this.close());
        }
        
        // 键盘事件
        if (this.options.keyboardClose) {
            document.addEventListener('keydown', (e) => this.handleKeydown(e));
        }
        
        // 焦点陷阱
        if (this.options.focusTrap) {
            this.dialog.addEventListener('focusin', (e) => this.handleFocusIn(e));
        }
        
        // 窗口大小变化
        window.addEventListener('resize', () => this.handleResize());
    }
    
    /**
     * 渲染模态框内容
     */
    render() {
        // 构建模态框结构
        const modalHtml = this.getModalTemplate();
        this.content.innerHTML = modalHtml;
        
        // 缓存内部元素
        this.cacheInnerElements();
        
        // 绑定内部事件
        this.bindInnerEvents();
        
        // 更新按钮状态
        this.updateButtons();
    }
    
    /**
     * 获取模态框模板
     */
    getModalTemplate() {
        return `
            <!-- 头部 -->
            ${this.options.title || this.options.showCloseButton ? this.getHeaderTemplate() : ''}
            
            <!-- 主体 -->
            <div class="modal-body ${this.options.classes.body || ''}" id="${this.options.id}_body">
                ${this.options.content || ''}
            </div>
            
            <!-- 底部 -->
            ${this.options.buttons.length > 0 ? this.getFooterTemplate() : ''}
        `;
    }
    
    /**
     * 获取头部模板
     */
    getHeaderTemplate() {
        return `
            <div class="modal-header ${this.options.classes.header || ''}">
                ${this.options.title ? `
                    <h5 class="modal-title" id="${this.options.id}_title">
                        ${this.options.title}
                    </h5>
                ` : ''}
                
                ${this.options.showCloseButton ? `
                    <button type="button" 
                            class="modal-close" 
                            data-dismiss="modal" 
                            aria-label="关闭">
                        <span aria-hidden="true">&times;</span>
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 获取底部模板
     */
    getFooterTemplate() {
        return `
            <div class="modal-footer ${this.options.classes.footer || ''}">
                ${this.options.buttons.map((button, index) => `
                    <button type="button" 
                            class="modal-btn ${button.className || ''} ${button.type ? `btn-${button.type}` : 'btn-secondary'}"
                            data-action="${button.action || 'close'}"
                            data-index="${index}"
                            ${button.disabled ? 'disabled' : ''}>
                        ${button.text || '按钮'}
                    </button>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * 缓存内部元素
     */
    cacheInnerElements() {
        this.elements.header = this.content.querySelector('.modal-header');
        this.elements.body = this.content.querySelector('.modal-body');
        this.elements.footer = this.content.querySelector('.modal-footer');
        this.elements.closeBtn = this.content.querySelector('.modal-close');
        this.elements.buttons = this.content.querySelectorAll('.modal-btn');
        this.elements.title = this.content.querySelector('.modal-title');
    }
    
    /**
     * 绑定内部事件
     */
    bindInnerEvents() {
        // 关闭按钮
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.close());
        }
        
        // 操作按钮
        this.elements.buttons.forEach(button => {
            button.addEventListener('click', (e) => this.handleButtonClick(e));
        });
    }
    
    /**
     * 打开模态框
     */
    async open() {
        if (this.state.isOpen || this.state.isOpening) {
            return;
        }
        
        // 保存当前焦点元素
        this.lastFocusedElement = document.activeElement;
        
        this.state.isOpening = true;
        this.state.isOpen = true;
        
        // 显示模态框
        this.container.style.display = 'block';
        
        // 触发打开前回调
        if (this.options.onOpen) {
            await this.options.onOpen(this);
        }
        
        // 开始打开动画
        if (this.options.animate) {
            await this.animateOpen();
        } else {
            this.container.classList.add('show');
            this.state.isOpening = false;
            this.state.isVisible = true;
        }
        
        // 自动聚焦
        if (this.options.autoFocus) {
            this.focus();
        }
        
        // 计算可聚焦元素
        this.updateFocusableElements();
        
        // 添加到模态框管理器
        this.addToModalStack();
        
        // 禁用body滚动
        this.disableBodyScroll();
        
        console.log(`[弹窗] 打开: ${this.options.id}`);
    }
    
    /**
     * 执行打开动画
     */
    animateOpen() {
        return new Promise(resolve => {
            // 强制重绘
            this.container.offsetHeight;
            
            // 添加显示类
            this.container.classList.add('show');
            
            // 添加动画类
            this.dialog.classList.add('show');
            
            this.animationTimeout = setTimeout(() => {
                this.state.isOpening = false;
                this.state.isVisible = true;
                resolve();
            }, 300);
        });
    }
    
    /**
     * 关闭模态框
     */
    async close(result = null) {
        if (!this.state.isOpen || this.state.isClosing) {
            return;
        }
        
        this.state.isClosing = true;
        
        // 触发关闭前回调
        if (this.options.onClose) {
            const shouldClose = await this.options.onClose(result, this);
            if (shouldClose === false) {
                this.state.isClosing = false;
                return;
            }
        }
        
        // 执行关闭动画
        if (this.options.animate) {
            await this.animateClose();
        } else {
            this.container.classList.remove('show');
            this.container.style.display = 'none';
            this.state.isClosing = false;
            this.state.isOpen = false;
            this.state.isVisible = false;
        }
        
        // 恢复焦点
        this.restoreFocus();
        
        // 从模态框管理器移除
        this.removeFromModalStack();
        
        // 恢复body滚动
        this.enableBodyScroll();
        
        console.log(`[弹窗] 关闭: ${this.options.id}`, result);
    }
    
    /**
     * 执行关闭动画
     */
    animateClose() {
        return new Promise(resolve => {
            // 移除显示类
            this.dialog.classList.remove('show');
            
            this.animationTimeout = setTimeout(() => {
                this.container.classList.remove('show');
                this.container.style.display = 'none';
                
                this.state.isClosing = false;
                this.state.isOpen = false;
                this.state.isVisible = false;
                
                resolve();
            }, 300);
        });
    }
    
    /**
     * 确认操作
     */
    async confirm(result = null) {
        if (this.options.onConfirm) {
            await this.options.onConfirm(result, this);
        }
        await this.close(result);
    }
    
    /**
     * 取消操作
     */
    async cancel(result = null) {
        if (this.options.onCancel) {
            await this.options.onCancel(result, this);
        }
        await this.close(result);
    }
    
    /**
     * 处理按钮点击
     */
    async handleButtonClick(event) {
        const button = event.currentTarget;
        const action = button.dataset.action;
        const index = parseInt(button.dataset.index);
        const buttonConfig = this.options.buttons[index];
        
        // 执行按钮动作
        if (buttonConfig && buttonConfig.action) {
            await buttonConfig.action(this);
        } else {
            switch (action) {
                case 'confirm':
                    await this.confirm();
                    break;
                case 'cancel':
                    await this.cancel();
                    break;
                case 'close':
                default:
                    await this.close();
                    break;
            }
        }
    }
    
    /**
     * 处理键盘事件
     */
    handleKeydown(event) {
        if (!this.state.isOpen || !this.state.isVisible) {
            return;
        }
        
        switch (event.key) {
            case 'Escape':
                if (this.options.keyboardClose) {
                    event.preventDefault();
                    this.close();
                }
                break;
                
            case 'Tab':
                if (this.options.focusTrap) {
                    this.handleTabKey(event);
                }
                break;
                
            case 'Enter':
                // 处理默认确认按钮
                if (event.target === this.dialog || event.target.classList.contains('modal-dialog')) {
                    const confirmButton = this.content.querySelector('[data-action="confirm"]');
                    if (confirmButton && !confirmButton.disabled) {
                        event.preventDefault();
                        confirmButton.click();
                    }
                }
                break;
        }
    }
    
    /**
     * 处理Tab键焦点循环
     */
    handleTabKey(event) {
        if (this.focusableElements.length === 0) {
            return;
        }
        
        const firstElement = this.focusableElements[0];
        const lastElement = this.focusableElements[this.focusableElements.length - 1];
        
        if (event.shiftKey) {
            // Shift+Tab: 向前循环
            if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab: 向后循环
            if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    }
    
    /**
     * 处理焦点进入
     */
    handleFocusIn(event) {
        if (!this.state.isOpen || !this.options.focusTrap) {
            return;
        }
        
        // 如果焦点不在模态框内，将其移回第一个可聚焦元素
        if (!this.container.contains(event.target)) {
            event.preventDefault();
            this.focus();
        }
    }
    
    /**
     * 处理窗口大小变化
     */
    handleResize() {
        // 可以在这里添加响应式调整逻辑
    }
    
    /**
     * 设置焦点
     */
    focus() {
        // 寻找第一个可聚焦元素
        const focusable = this.getFocusableElements();
        if (focusable.length > 0) {
            focusable[0].focus();
        } else {
            this.dialog.focus();
        }
    }
    
    /**
     * 恢复焦点
     */
    restoreFocus() {
        if (this.lastFocusedElement && document.body.contains(this.lastFocusedElement)) {
            this.lastFocusedElement.focus();
        }
    }
    
    /**
     * 获取可聚焦元素
     */
    getFocusableElements() {
        if (this.focusableElements.length > 0) {
            return this.focusableElements;
        }
        
        const selector = [
            'button:not(:disabled)',
            '[href]:not(:disabled)',
            'input:not(:disabled)',
            'select:not(:disabled)',
            'textarea:not(:disabled)',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');
        
        this.focusableElements = Array.from(this.content.querySelectorAll(selector))
            .filter(el => {
                // 过滤隐藏元素
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && 
                       style.visibility !== 'hidden' &&
                       el.offsetParent !== null;
            });
        
        return this.focusableElements;
    }
    
    /**
     * 更新可聚焦元素
     */
    updateFocusableElements() {
        this.focusableElements = this.getFocusableElements();
    }
    
    /**
     * 更新按钮状态
     */
    updateButtons() {
        this.elements.buttons.forEach((button, index) => {
            const config = this.options.buttons[index];
            if (config) {
                button.disabled = !!config.disabled;
                
                // 更新类名
                button.className = `modal-btn ${config.className || ''} ${config.type ? `btn-${config.type}` : 'btn-secondary'}`;
                
                // 更新文本
                if (config.text) {
                    button.textContent = config.text;
                }
            }
        });
    }
    
    /**
     * 添加到模态框堆栈
     */
    addToModalStack() {
        if (!window.modalStack) {
            window.modalStack = [];
        }
        
        // 移除已存在的实例
        window.modalStack = window.modalStack.filter(modal => modal.id !== this.options.id);
        
        // 添加到堆栈
        window.modalStack.push({
            id: this.options.id,
            instance: this,
            zIndex: this.options.zIndex
        });
        
        // 更新z-index
        this.updateZIndex();
    }
    
    /**
     * 从模态框堆栈移除
     */
    removeFromModalStack() {
        if (!window.modalStack) return;
        
        window.modalStack = window.modalStack.filter(modal => modal.id !== this.options.id);
    }
    
    /**
     * 更新z-index
     */
    updateZIndex() {
        if (!window.modalStack) return;
        
        // 根据堆栈顺序更新z-index
        window.modalStack.forEach((modal, index) => {
            const zIndex = this.options.zIndex + (index * 10);
            modal.instance.container.style.zIndex = zIndex;
            if (modal.instance.backdrop) {
                modal.instance.backdrop.style.zIndex = zIndex - 1;
            }
        });
    }
    
    /**
     * 禁用body滚动
     */
    disableBodyScroll() {
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = this.getScrollbarWidth() + 'px';
    }
    
    /**
     * 恢复body滚动
     */
    enableBodyScroll() {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }
    
    /**
     * 获取滚动条宽度
     */
    getScrollbarWidth() {
        // 创建一个临时元素测量滚动条宽度
        const outer = document.createElement('div');
        outer.style.visibility = 'hidden';
        outer.style.overflow = 'scroll';
        document.body.appendChild(outer);
        
        const inner = document.createElement('div');
        outer.appendChild(inner);
        
        const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
        
        outer.parentNode.removeChild(outer);
        
        return scrollbarWidth;
    }
    
    /**
     * 设置标题
     */
    setTitle(title) {
        this.options.title = title;
        if (this.elements.title) {
            this.elements.title.textContent = title;
        }
    }
    
    /**
     * 设置内容
     */
    setContent(content) {
        this.options.content = content;
        if (this.elements.body) {
            this.elements.body.innerHTML = content;
        }
    }
    
    /**
     * 设置按钮
     */
    setButtons(buttons) {
        this.options.buttons = buttons;
        
        // 重新渲染底部
        if (this.elements.footer) {
            this.elements.footer.innerHTML = this.getFooterTemplate();
            this.cacheInnerElements();
            this.bindInnerEvents();
        }
    }
    
    /**
     * 设置按钮禁用状态
     */
    setButtonDisabled(index, disabled) {
        if (this.options.buttons[index]) {
            this.options.buttons[index].disabled = disabled;
            this.updateButtons();
        }
    }
    
    /**
     * 显示加载状态
     */
    showLoading(message = '加载中...') {
        const loadingHtml = `
            <div class="modal-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">${message}</div>
            </div>
        `;
        
        this.setContent(loadingHtml);
    }
    
    /**
     * 显示错误
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
                    ${details ? `<pre class="error-details">${details}</pre>` : ''}
                </div>
            </div>
        `;
        
        this.setContent(errorHtml);
    }
    
    /**
     * 显示成功
     */
    showSuccess(message, details = '') {
        const successHtml = `
            <div class="modal-success">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="success-content">
                    <h4 class="success-title">成功</h4>
                    <p class="success-message">${message}</p>
                    ${details ? `<p class="success-details">${details}</p>` : ''}
                </div>
            </div>
        `;
        
        this.setContent(successHtml);
    }
    
    /**
     * 显示确认对话框
     */
    showConfirm(message, confirmText = '确认', cancelText = '取消') {
        this.setContent(`<div class="confirm-message">${message}</div>`);
        
        this.setButtons([
            {
                text: cancelText,
                type: 'secondary',
                action: () => this.cancel(false)
            },
            {
                text: confirmText,
                type: 'primary',
                action: () => this.confirm(true)
            }
        ]);
    }
    
    /**
     * 显示提示对话框
     */
    showPrompt(message, defaultValue = '', placeholder = '请输入') {
        const promptHtml = `
            <div class="prompt-message">${message}</div>
            <div class="prompt-input">
                <input type="text" 
                       class="form-control prompt-field" 
                       value="${defaultValue}"
                       placeholder="${placeholder}">
            </div>
        `;
        
        this.setContent(promptHtml);
        
        this.setButtons([
            {
                text: '取消',
                type: 'secondary',
                action: () => this.cancel(null)
            },
            {
                text: '确认',
                type: 'primary',
                action: () => {
                    const input = this.content.querySelector('.prompt-field');
                    this.confirm(input ? input.value : defaultValue);
                }
            }
        ]);
        
        // 自动聚焦到输入框
        setTimeout(() => {
            const input = this.content.querySelector('.prompt-field');
            if (input) {
                input.focus();
                input.select();
            }
        }, 100);
    }
    
    /**
     * 获取当前状态
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * 获取选项
     */
    getOptions() {
        return { ...this.options };
    }
    
    /**
     * 获取元素
     */
    getElements() {
        return { ...this.elements };
    }
    
    /**
     * 销毁模态框
     */
    destroy() {
        // 清除定时器
        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
        }
        
        // 移除事件监听
        document.removeEventListener('keydown', this.handleKeydown);
        window.removeEventListener('resize', this.handleResize);
        
        // 从DOM移除
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // 从堆栈移除
        this.removeFromModalStack();
        
        // 恢复body滚动
        this.enableBodyScroll();
        
        // 清理引用
        this.elements = {};
        this.focusableElements = [];
        this.lastFocusedElement = null;
        
        console.log(`[弹窗] 销毁: ${this.options.id}`);
    }
    
    /**
     * 静态方法：创建简单的确认对话框
     */
    static confirm(options) {
        const modal = new BaseModal({
            type: 'confirm',
            title: options.title || '确认',
            content: options.message,
            size: options.size || 'sm',
            buttons: [
                {
                    text: options.cancelText || '取消',
                    type: 'secondary',
                    action: () => modal.cancel(false)
                },
                {
                    text: options.confirmText || '确认',
                    type: 'primary',
                    action: () => modal.confirm(true)
                }
            ],
            ...options
        });
        
        return modal.open().then(() => modal);
    }
    
    /**
     * 静态方法：创建简单的提示对话框
     */
    static prompt(options) {
        const defaultValue = options.defaultValue || '';
        const placeholder = options.placeholder || '请输入';
        
        const modal = new BaseModal({
            type: 'prompt',
            title: options.title || '输入',
            content: `
                <div class="prompt-message">${options.message || ''}</div>
                <div class="prompt-input">
                    <input type="text" 
                           class="form-control prompt-field" 
                           value="${defaultValue}"
                           placeholder="${placeholder}">
                </div>
            `,
            size: options.size || 'sm',
            buttons: [
                {
                    text: options.cancelText || '取消',
                    type: 'secondary',
                    action: () => modal.cancel(null)
                },
                {
                    text: options.confirmText || '确认',
                    type: 'primary',
                    action: () => {
                        const input = modal.content.querySelector('.prompt-field');
                        modal.confirm(input ? input.value : defaultValue);
                    }
                }
            ],
            ...options
        });
        
        return modal.open().then(() => modal);
    }
    
    /**
     * 静态方法：创建简单的警告对话框
     */
    static alert(options) {
        const modal = new BaseModal({
            type: 'alert',
            title: options.title || '提示',
            content: options.message,
            size: options.size || 'sm',
            buttons: [
                {
                    text: options.buttonText || '确定',
                    type: 'primary',
                    action: () => modal.close()
                }
            ],
            ...options
        });
        
        return modal.open().then(() => modal);
    }
    
    /**
     * 静态方法：获取当前打开的模态框
     */
    static getCurrentModal() {
        if (!window.modalStack || window.modalStack.length === 0) {
            return null;
        }
        
        return window.modalStack[window.modalStack.length - 1].instance;
    }
    
    /**
     * 静态方法：关闭所有模态框
     */
    static async closeAll() {
        if (!window.modalStack) return;
        
        const modals = [...window.modalStack];
        for (const modal of modals) {
            await modal.instance.close();
        }
    }
}
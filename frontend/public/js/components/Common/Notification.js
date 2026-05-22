/**
 * 通知组件
 * 用于在应用中显示临时通知、提示、警告和错误消息
 */

import Utils from '../../core/utils.js';
import Config from '../../config.js';

export class Notification {
    constructor(options = {}) {
        this.options = {
            id: `notification_${Utils.generateId()}`,
            type: 'info', // 'info', 'success', 'warning', 'error', 'loading'
            title: '',
            message: '',
            duration: 5000, // 自动关闭时间(ms)，0表示不自动关闭
            position: 'top-right', // 'top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'
            showClose: true,
            showIcon: true,
            showProgress: true,
            pauseOnHover: true,
            clickToClose: false,
            animate: true,
            animationType: 'fade', // 'fade', 'slide', 'scale'
            zIndex: 99999,
            actions: [], // [{text, type, icon, action, className}]
            sound: false,
            soundFile: null,
            vibration: false,
            vibrationPattern: [100, 50, 100],
            onOpen: null,
            onClose: null,
            onClick: null,
            onAction: null,
            classes: {
                container: '',
                notification: '',
                icon: '',
                content: '',
                title: '',
                message: '',
                progress: '',
                close: '',
                actions: '',
                actionBtn: ''
            },
            ...options
        };
        
        this.state = {
            isVisible: false,
            isOpening: false,
            isClosing: false,
            isHovered: false,
            isFocused: false,
            progress: 100,
            timer: null,
            startTime: null,
            remainingTime: this.options.duration
        };
        
        this.container = null;
        this.notification = null;
        this.progressBar = null;
        this.closeButton = null;
        
        this.init();
    }
    
    /**
     * 初始化通知组件
     */
    init() {
        // 创建容器
        this.createContainer();
        
        // 绑定事件
        this.bindEvents();
        
        console.log(`[通知] 初始化: ${this.options.id}`);
    }
    
    /**
     * 创建容器
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = this.options.id;
        this.container.className = this.getContainerClasses();
        this.container.style.zIndex = this.options.zIndex;
        
        // 创建通知元素
        this.notification = document.createElement('div');
        this.notification.className = this.getNotificationClasses();
        this.notification.setAttribute('role', 'alert');
        this.notification.setAttribute('aria-live', 'polite');
        this.notification.innerHTML = this.getTemplate();
        this.container.appendChild(this.notification);
        
        // 添加到body
        document.body.appendChild(this.container);
        
        // 缓存元素
        this.cacheElements();
        
        // 初始隐藏
        this.hide(true);
    }
    
    /**
     * 获取容器类名
     */
    getContainerClasses() {
        const classes = ['notification-container'];
        
        // 位置
        if (this.options.position) {
            classes.push(`notification-${this.options.position.replace('-', '-')}`);
        }
        
        // 自定义类
        if (this.options.classes.container) {
            classes.push(this.options.classes.container);
        }
        
        return classes.join(' ');
    }
    
    /**
     * 获取通知类名
     */
    getNotificationClasses() {
        const classes = ['notification'];
        
        // 类型
        classes.push(`notification-${this.options.type}`);
        
        // 动画
        if (this.options.animate) {
            classes.push('notification-animated', `notification-${this.options.animationType}`);
        }
        
        // 自定义类
        if (this.options.classes.notification) {
            classes.push(this.options.classes.notification);
        }
        
        return classes.join(' ');
    }
    
    /**
     * 获取模板
     */
    getTemplate() {
        return `
            <!-- 进度条 -->
            ${this.options.showProgress && this.options.duration > 0 ? this.getProgressTemplate() : ''}
            
            <!-- 图标 -->
            ${this.options.showIcon ? this.getIconTemplate() : ''}
            
            <!-- 内容 -->
            <div class="notification-content ${this.options.classes.content || ''}">
                ${this.options.title ? `
                    <div class="notification-title ${this.options.classes.title || ''}">
                        ${this.options.title}
                    </div>
                ` : ''}
                
                ${this.options.message ? `
                    <div class="notification-message ${this.options.classes.message || ''}">
                        ${this.options.message}
                    </div>
                ` : ''}
                
                <!-- 操作按钮 -->
                ${this.options.actions.length > 0 ? this.getActionsTemplate() : ''}
            </div>
            
            <!-- 关闭按钮 -->
            ${this.options.showClose ? this.getCloseButtonTemplate() : ''}
        `;
    }
    
    /**
     * 获取进度条模板
     */
    getProgressTemplate() {
        return `
            <div class="notification-progress ${this.options.classes.progress || ''}">
                <div class="progress-bar" style="width: ${this.state.progress}%"></div>
            </div>
        `;
    }
    
    /**
     * 获取图标模板
     */
    getIconTemplate() {
        const icons = {
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle',
            loading: 'fas fa-spinner fa-spin'
        };
        
        const iconClass = icons[this.options.type] || icons.info;
        
        return `
            <div class="notification-icon ${this.options.classes.icon || ''}">
                <i class="${iconClass}"></i>
            </div>
        `;
    }
    
    /**
     * 获取操作按钮模板
     */
    getActionsTemplate() {
        return `
            <div class="notification-actions ${this.options.classes.actions || ''}">
                ${this.options.actions.map((action, index) => `
                    <button type="button" 
                            class="notification-action ${action.className || ''} ${this.options.classes.actionBtn || ''} 
                                   ${action.type ? `btn-${action.type}` : 'btn-text'}"
                            data-action="${action.id || index}">
                        ${action.icon ? `<i class="${action.icon}"></i>` : ''}
                        ${action.text}
                    </button>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * 获取关闭按钮模板
     */
    getCloseButtonTemplate() {
        return `
            <button type="button" 
                    class="notification-close ${this.options.classes.close || ''}"
                    aria-label="关闭通知">
                <i class="fas fa-times"></i>
            </button>
        `;
    }
    
    /**
     * 缓存元素
     */
    cacheElements() {
        this.progressBar = this.container.querySelector('.progress-bar');
        this.closeButton = this.container.querySelector('.notification-close');
        this.actionButtons = this.container.querySelectorAll('.notification-action');
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 关闭按钮
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.close());
        }
        
        // 点击关闭
        if (this.options.clickToClose) {
            this.notification.addEventListener('click', (e) => {
                if (!e.target.closest('.notification-action')) {
                    this.close();
                }
            });
        }
        
        // 点击事件
        if (this.options.onClick) {
            this.notification.addEventListener('click', (e) => {
                if (!e.target.closest('.notification-close') && 
                    !e.target.closest('.notification-action')) {
                    this.options.onClick(this);
                }
            });
        }
        
        // 悬停暂停
        if (this.options.pauseOnHover && this.options.duration > 0) {
            this.notification.addEventListener('mouseenter', () => this.pauseTimer());
            this.notification.addEventListener('mouseleave', () => this.resumeTimer());
            this.notification.addEventListener('focusin', () => this.pauseTimer());
            this.notification.addEventListener('focusout', () => this.resumeTimer());
        }
        
        // 操作按钮
        this.actionButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleActionClick(e));
        });
        
        // 键盘事件
        this.notification.addEventListener('keydown', (e) => this.handleKeydown(e));
    }
    
    /**
     * 显示通知
     */
    async show() {
        if (this.state.isVisible || this.state.isOpening) {
            return;
        }
        
        this.state.isOpening = true;
        
        // 触发显示前回调
        if (this.options.onOpen) {
            await this.options.onOpen(this);
        }
        
        // 播放声音
        if (this.options.sound) {
            this.playSound();
        }
        
        // 触发振动
        if (this.options.vibration && 'vibrate' in navigator) {
            navigator.vibrate(this.options.vibrationPattern);
        }
        
        // 显示元素
        this.container.style.display = 'block';
        
        // 强制重绘
        this.container.offsetHeight;
        
        // 添加显示类
        this.container.classList.add('show');
        this.notification.classList.add('show');
        
        // 设置可聚焦
        this.notification.setAttribute('tabindex', '0');
        
        // 开始进度条
        if (this.options.showProgress && this.options.duration > 0) {
            this.startProgress();
        }
        
        // 开始自动关闭计时
        if (this.options.duration > 0) {
            this.startTimer();
        }
        
        this.state.isVisible = true;
        this.state.isOpening = false;
        
        // 聚焦到通知
        this.notification.focus();
        
        console.log(`[通知] 显示: ${this.options.id}`);
        
        return this;
    }
    
    /**
     * 隐藏通知
     */
    async hide(immediate = false) {
        if (!this.state.isVisible || this.state.isClosing) {
            return;
        }
        
        this.state.isClosing = true;
        
        // 触发关闭前回调
        if (this.options.onClose) {
            await this.options.onClose(this);
        }
        
        // 停止计时器
        this.stopTimer();
        
        if (immediate) {
            // 立即隐藏
            this.container.style.display = 'none';
            this.container.classList.remove('show');
            this.notification.classList.remove('show');
            this.state.isVisible = false;
            this.state.isClosing = false;
        } else {
            // 动画隐藏
            this.notification.classList.remove('show');
            
            // 等待动画完成
            setTimeout(() => {
                this.container.style.display = 'none';
                this.state.isVisible = false;
                this.state.isClosing = false;
            }, 300);
        }
        
        console.log(`[通知] 隐藏: ${this.options.id}`);
    }
    
    /**
     * 关闭通知
     */
    async close() {
        await this.hide();
    }
    
    /**
     * 开始进度条
     */
    startProgress() {
        if (!this.progressBar) return;
        
        const duration = this.options.duration;
        const startTime = Date.now();
        
        const updateProgress = () => {
            if (!this.state.isVisible || this.state.isHovered || this.state.isFocused) {
                return;
            }
            
            const elapsed = Date.now() - startTime;
            const progress = Math.max(0, 100 - (elapsed / duration) * 100);
            
            this.state.progress = progress;
            
            if (this.progressBar) {
                this.progressBar.style.width = `${progress}%`;
            }
            
            if (progress > 0) {
                requestAnimationFrame(updateProgress);
            }
        };
        
        requestAnimationFrame(updateProgress);
    }
    
    /**
     * 开始计时器
     */
    startTimer() {
        this.stopTimer();
        
        this.state.startTime = Date.now();
        this.state.remainingTime = this.options.duration;
        
        this.state.timer = setTimeout(() => {
            this.close();
        }, this.state.remainingTime);
    }
    
    /**
     * 暂停计时器
     */
    pauseTimer() {
        if (!this.state.timer || this.options.duration === 0) return;
        
        this.state.isHovered = true;
        this.state.remainingTime -= Date.now() - this.state.startTime;
        clearTimeout(this.state.timer);
    }
    
    /**
     * 恢复计时器
     */
    resumeTimer() {
        if (this.options.duration === 0) return;
        
        this.state.isHovered = false;
        this.state.startTime = Date.now();
        
        this.state.timer = setTimeout(() => {
            this.close();
        }, this.state.remainingTime);
    }
    
    /**
     * 停止计时器
     */
    stopTimer() {
        if (this.state.timer) {
            clearTimeout(this.state.timer);
            this.state.timer = null;
        }
    }
    
    /**
     * 播放声音
     */
    playSound() {
        if (!this.options.soundFile) {
            // 使用默认声音
            const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
            audio.volume = 0.3;
            audio.play().catch(() => {});
        } else {
            const audio = new Audio(this.options.soundFile);
            audio.volume = 0.3;
            audio.play().catch(() => {});
        }
    }
    
    /**
     * 处理操作点击
     */
    handleActionClick(event) {
        const button = event.currentTarget;
        const actionId = button.dataset.action;
        const action = this.options.actions[actionId] || 
                      this.options.actions.find(a => a.id === actionId);
        
        if (action) {
            // 执行操作
            if (action.action) {
                action.action(this);
            }
            
            // 触发回调
            if (this.options.onAction) {
                this.options.onAction(actionId, action, this);
            }
            
            // 触发事件
            document.dispatchEvent(new CustomEvent('notification:action', {
                detail: {
                    notificationId: this.options.id,
                    actionId,
                    action,
                    notification: this
                }
            }));
            
            // 如果配置了点击后关闭
            if (action.closeOnClick !== false) {
                this.close();
            }
        }
    }
    
    /**
     * 处理键盘事件
     */
    handleKeydown(event) {
        switch (event.key) {
            case 'Escape':
                if (this.options.showClose) {
                    event.preventDefault();
                    this.close();
                }
                break;
                
            case 'Enter':
            case ' ':
                if (this.options.clickToClose) {
                    event.preventDefault();
                    this.close();
                }
                break;
        }
    }
    
    /**
     * 更新通知内容
     */
    update(options = {}) {
        // 停止当前计时器
        this.stopTimer();
        
        // 更新选项
        this.options = { ...this.options, ...options };
        
        // 重新渲染
        this.notification.innerHTML = this.getTemplate();
        
        // 重新缓存元素
        this.cacheElements();
        
        // 重新绑定事件
        this.bindEvents();
        
        // 重置状态
        this.state.progress = 100;
        this.state.remainingTime = this.options.duration;
        
        // 重新开始进度和计时
        if (this.options.showProgress && this.options.duration > 0) {
            this.startProgress();
        }
        
        if (this.options.duration > 0) {
            this.startTimer();
        }
        
        return this;
    }
    
    /**
     * 设置标题
     */
    setTitle(title) {
        this.options.title = title;
        
        const titleElement = this.notification.querySelector('.notification-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }
    
    /**
     * 设置消息
     */
    setMessage(message) {
        this.options.message = message;
        
        const messageElement = this.notification.querySelector('.notification-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }
    
    /**
     * 设置类型
     */
    setType(type) {
        this.options.type = type;
        
        // 更新类名
        const types = ['info', 'success', 'warning', 'error', 'loading'];
        types.forEach(t => {
            this.notification.classList.remove(`notification-${t}`);
        });
        this.notification.classList.add(`notification-${type}`);
        
        // 更新图标
        if (this.options.showIcon) {
            const icons = {
                info: 'fas fa-info-circle',
                success: 'fas fa-check-circle',
                warning: 'fas fa-exclamation-triangle',
                error: 'fas fa-times-circle',
                loading: 'fas fa-spinner fa-spin'
            };
            
            const iconElement = this.notification.querySelector('.notification-icon i');
            if (iconElement) {
                iconElement.className = icons[type] || icons.info;
            }
        }
    }
    
    /**
     * 设置持续时间
     */
    setDuration(duration) {
        this.options.duration = duration;
        this.state.remainingTime = duration;
        
        // 重新开始计时
        this.stopTimer();
        if (duration > 0) {
            this.startTimer();
            this.startProgress();
        }
    }
    
    /**
     * 设置为加载状态
     */
    setLoading(isLoading = true, message = '处理中...') {
        if (isLoading) {
            this.setType('loading');
            this.setMessage(message);
            this.setDuration(0); // 加载状态不自动关闭
        } else {
            this.setType('info');
        }
    }
    
    /**
     * 设置为成功状态
     */
    setSuccess(message = '操作成功！', duration = 3000) {
        this.setType('success');
        this.setMessage(message);
        this.setDuration(duration);
    }
    
    /**
     * 设置为错误状态
     */
    setError(message = '操作失败', duration = 5000) {
        this.setType('error');
        this.setMessage(message);
        this.setDuration(duration);
    }
    
    /**
     * 设置为警告状态
     */
    setWarning(message = '警告', duration = 4000) {
        this.setType('warning');
        this.setMessage(message);
        this.setDuration(duration);
    }
    
    /**
     * 设置为信息状态
     */
    setInfo(message = '信息', duration = 3000) {
        this.setType('info');
        this.setMessage(message);
        this.setDuration(duration);
    }
    
    /**
     * 获取当前状态
     */
    getState() {
        return { 
            isVisible: this.state.isVisible,
            type: this.options.type,
            title: this.options.title,
            message: this.options.message,
            progress: this.state.progress,
            remainingTime: this.state.remainingTime
        };
    }
    
    /**
     * 销毁通知
     */
    destroy() {
        // 停止计时器
        this.stopTimer();
        
        // 从DOM移除
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // 清理引用
        this.container = null;
        this.notification = null;
        this.progressBar = null;
        this.closeButton = null;
        this.actionButtons = null;
        
        console.log(`[通知] 已销毁: ${this.options.id}`);
    }
    
    /**
     * 静态方法：显示信息通知
     */
    static info(options) {
        const notification = new Notification({
            type: 'info',
            duration: 3000,
            ...options
        });
        
        return notification.show();
    }
    
    /**
     * 静态方法：显示成功通知
     */
    static success(options) {
        const notification = new Notification({
            type: 'success',
            duration: 3000,
            ...options
        });
        
        return notification.show();
    }
    
    /**
     * 静态方法：显示警告通知
     */
    static warning(options) {
        const notification = new Notification({
            type: 'warning',
            duration: 4000,
            ...options
        });
        
        return notification.show();
    }
    
    /**
     * 静态方法：显示错误通知
     */
    static error(options) {
        const notification = new Notification({
            type: 'error',
            duration: 5000,
            ...options
        });
        
        return notification.show();
    }
    
    /**
     * 静态方法：显示加载通知
     */
    static loading(options) {
        const notification = new Notification({
            type: 'loading',
            duration: 0, // 加载状态不自动关闭
            showClose: false,
            ...options
        });
        
        return notification.show();
    }
}

/**
 * 通知管理器
 */
export class NotificationManager {
    constructor() {
        this.notifications = new Map();
        this.queue = [];
        this.maxVisible = 3;
        this.defaultOptions = {
            position: 'top-right',
            animate: true,
            showClose: true,
            showIcon: true,
            pauseOnHover: true
        };
        
        // 创建全局容器
        this.createGlobalContainers();
        
        console.log('[通知管理器] 初始化完成');
    }
    
    /**
     * 创建全局容器
     */
    createGlobalContainers() {
        const positions = [
            'top-left', 'top-center', 'top-right',
            'bottom-left', 'bottom-center', 'bottom-right'
        ];
        
        positions.forEach(position => {
            const container = document.createElement('div');
            container.className = `notification-container notification-${position.replace('-', '-')}`;
            container.id = `notification-container-${position}`;
            document.body.appendChild(container);
        });
    }
    
    /**
     * 显示通知
     */
    show(options = {}) {
        const notificationOptions = {
            ...this.defaultOptions,
            ...options
        };
        
        const notification = new Notification(notificationOptions);
        const notificationId = notification.options.id;
        
        // 检查是否达到最大显示数量
        const position = notification.options.position;
        const positionNotifications = this.getNotificationsByPosition(position);
        
        if (positionNotifications.length >= this.maxVisible) {
            // 添加到队列
            this.queue.push({
                notification,
                position,
                timestamp: Date.now()
            });
            
            console.log(`[通知管理器] 添加到队列: ${notificationId} (位置: ${position})`);
        } else {
            // 立即显示
            this.notifications.set(notificationId, notification);
            notification.show().then(() => {
                // 监听关闭事件
                notification.container.addEventListener('transitionend', () => {
                    this.handleNotificationClose(notificationId);
                }, { once: true });
            });
        }
        
        return notification;
    }
    
    /**
     * 按位置获取通知
     */
    getNotificationsByPosition(position) {
        return Array.from(this.notifications.values()).filter(n => 
            n.options.position === position && n.getState().isVisible
        );
    }
    
    /**
     * 处理通知关闭
     */
    handleNotificationClose(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (notification) {
            // 销毁通知
            notification.destroy();
            this.notifications.delete(notificationId);
            
            // 检查队列
            this.processQueue();
            
            console.log(`[通知管理器] 通知已关闭: ${notificationId}`);
        }
    }
    
    /**
     * 处理队列
     */
    processQueue() {
        if (this.queue.length === 0) return;
        
        // 按时间排序
        this.queue.sort((a, b) => a.timestamp - b.timestamp);
        
        const queueItem = this.queue[0];
        const position = queueItem.position;
        const positionNotifications = this.getNotificationsByPosition(position);
        
        if (positionNotifications.length < this.maxVisible) {
            // 从队列移除
            this.queue.shift();
            
            // 显示通知
            const notification = queueItem.notification;
            const notificationId = notification.options.id;
            
            this.notifications.set(notificationId, notification);
            notification.show().then(() => {
                // 监听关闭事件
                notification.container.addEventListener('transitionend', () => {
                    this.handleNotificationClose(notificationId);
                }, { once: true });
            });
            
            console.log(`[通知管理器] 从队列显示: ${notificationId}`);
            
            // 继续处理队列
            setTimeout(() => this.processQueue(), 100);
        }
    }
    
    /**
     * 显示信息通知
     */
    info(message, title = '提示', options = {}) {
        return this.show({
            type: 'info',
            title,
            message,
            duration: 3000,
            ...options
        });
    }
    
    /**
     * 显示成功通知
     */
    success(message, title = '成功', options = {}) {
        return this.show({
            type: 'success',
            title,
            message,
            duration: 3000,
            ...options
        });
    }
    
    /**
     * 显示警告通知
     */
    warning(message, title = '警告', options = {}) {
        return this.show({
            type: 'warning',
            title,
            message,
            duration: 4000,
            ...options
        });
    }
    
    /**
     * 显示错误通知
     */
    error(message, title = '错误', options = {}) {
        return this.show({
            type: 'error',
            title,
            message,
            duration: 5000,
            ...options
        });
    }
    
    /**
     * 显示加载通知
     */
    loading(message = '加载中...', title = '', options = {}) {
        return this.show({
            type: 'loading',
            title,
            message,
            duration: 0,
            showClose: false,
            ...options
        });
    }
    
    /**
     * 关闭所有通知
     */
    closeAll() {
        this.notifications.forEach(notification => {
            notification.close();
        });
        
        this.queue = [];
    }
    
    /**
     * 关闭指定位置的通知
     */
    closeByPosition(position) {
        this.notifications.forEach(notification => {
            if (notification.options.position === position) {
                notification.close();
            }
        });
    }
    
    /**
     * 关闭指定类型的通知
     */
    closeByType(type) {
        this.notifications.forEach(notification => {
            if (notification.options.type === type) {
                notification.close();
            }
        });
    }
    
    /**
     * 获取可见通知数量
     */
    getVisibleCount() {
        return Array.from(this.notifications.values()).filter(n => 
            n.getState().isVisible
        ).length;
    }
    
    /**
     * 获取队列长度
     */
    getQueueLength() {
        return this.queue.length;
    }
    
    /**
     * 销毁管理器
     */
    destroy() {
        this.closeAll();
        this.notifications.clear();
        this.queue = [];
        
        // 移除全局容器
        const containers = document.querySelectorAll('.notification-container');
        containers.forEach(container => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });
        
        console.log('[通知管理器] 已销毁');
    }
}

/**
 * 默认通知管理器实例
 */
export const notificationManager = new NotificationManager();

/**
 * 快捷方法
 */
export const Notify = {
    // 显示通知
    show: (options) => notificationManager.show(options),
    
    // 信息通知
    info: (message, title, options) => notificationManager.info(message, title, options),
    
    // 成功通知
    success: (message, title, options) => notificationManager.success(message, title, options),
    
    // 警告通知
    warning: (message, title, options) => notificationManager.warning(message, title, options),
    
    // 错误通知
    error: (message, title, options) => notificationManager.error(message, title, options),
    
    // 加载通知
    loading: (message, title, options) => notificationManager.loading(message, title, options),
    
    // 关闭所有
    closeAll: () => notificationManager.closeAll(),
    
    // 管理器
    manager: notificationManager
};
/**
 * 空状态组件
 * 用于显示无数据、无结果、空列表等状态的友好界面
 */

import Utils from '../../core/utils.js';
import Config from '../../config.js';

export class EmptyState {
    constructor(options = {}) {
        this.options = {
            id: `empty-state_${Utils.generateId()}`,
            type: 'no-data', // 'no-data', 'no-results', 'error', 'offline', 'search', 'welcome'
            title: '',
            message: '',
            icon: 'default', // 'default', 'custom', 或具体的图标类名
            customIcon: null,
            size: 'md', // 'sm', 'md', 'lg', 'xl'
            layout: 'vertical', // 'vertical', 'horizontal'
            showActions: true,
            actions: [], // [{text, type, icon, action, disabled, className}]
            showImage: false,
            imageUrl: '',
            imageAlt: '',
            compact: false,
            centered: true,
            animate: true,
            theme: 'auto', // 'auto', 'light', 'dark'
            classes: {
                container: '',
                content: '',
                icon: '',
                image: '',
                title: '',
                message: '',
                actions: '',
                actionBtn: ''
            },
            onAction: null,
            onCreate: null,
            onRefresh: null,
            ...options
        };
        
        this.state = {
            isVisible: true,
            typeConfig: this.getTypeConfig()
        };
        
        this.container = null;
        this.actionCallbacks = new Map();
        
        this.init();
    }
    
    /**
     * 初始化空状态组件
     */
    init() {
        // 确保标题和消息有默认值
        this.ensureDefaults();
        
        // 创建容器
        this.createContainer();
        
        console.log(`[空状态] 初始化: ${this.options.id}`);
    }
    
    /**
     * 确保默认值
     */
    ensureDefaults() {
        const typeConfig = this.state.typeConfig;
        
        if (!this.options.title && typeConfig.title) {
            this.options.title = typeConfig.title;
        }
        
        if (!this.options.message && typeConfig.message) {
            this.options.message = typeConfig.message;
        }
        
        if (this.options.icon === 'default') {
            this.options.icon = typeConfig.icon;
        }
    }
    
    /**
     * 获取类型配置
     */
    getTypeConfig() {
        const configs = {
            'no-data': {
                title: '还没有内容',
                message: '开始创建您的第一个项目吧！',
                icon: 'fas fa-file-alt',
                color: '#6366f1',
                actions: ['create']
            },
            'no-results': {
                title: '没有找到结果',
                message: '尝试不同的搜索词或筛选条件',
                icon: 'fas fa-search',
                color: '#8b5cf6',
                actions: ['clear', 'refresh']
            },
            'error': {
                title: '加载失败',
                message: '数据加载时出现错误，请重试',
                icon: 'fas fa-exclamation-triangle',
                color: '#ef4444',
                actions: ['retry', 'report']
            },
            'offline': {
                title: '网络已断开',
                message: '您当前处于离线状态，部分功能可能受限',
                icon: 'fas fa-wifi-slash',
                color: '#f59e0b',
                actions: ['retry', 'offline']
            },
            'search': {
                title: '无搜索结果',
                message: '没有找到匹配的内容，请尝试其他关键词',
                icon: 'fas fa-search-minus',
                color: '#64748b',
                actions: ['clear', 'new']
            },
            'welcome': {
                title: '欢迎使用',
                message: '开始您的第一个笔记，记录重要想法',
                icon: 'fas fa-rocket',
                color: '#10b981',
                actions: ['create', 'tour']
            },
            'trash': {
                title: '回收站为空',
                message: '已删除的笔记将出现在这里',
                icon: 'fas fa-trash',
                color: '#94a3b8',
                actions: []
            },
            'starred': {
                title: '暂无收藏',
                message: '收藏的笔记将出现在这里',
                icon: 'fas fa-star',
                color: '#f59e0b',
                actions: ['browse']
            },
            'drafts': {
                title: '没有草稿',
                message: '未保存的笔记草稿将出现在这里',
                icon: 'fas fa-edit',
                color: '#3b82f6',
                actions: ['create']
            }
        };
        
        return configs[this.options.type] || configs['no-data'];
    }
    
    /**
     * 创建容器
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = this.options.id;
        this.container.className = this.getContainerClasses();
        
        // 渲染内容
        this.render();
    }
    
    /**
     * 获取容器类名
     */
    getContainerClasses() {
        const classes = ['empty-state'];
        
        // 类型
        classes.push(`empty-state-${this.options.type}`);
        
        // 大小
        if (this.options.size) {
            classes.push(`empty-state-${this.options.size}`);
        }
        
        // 布局
        if (this.options.layout) {
            classes.push(`empty-state-${this.options.layout}`);
        }
        
        // 是否紧凑
        if (this.options.compact) {
            classes.push('empty-state-compact');
        }
        
        // 是否居中
        if (this.options.centered) {
            classes.push('empty-state-centered');
        }
        
        // 动画
        if (this.options.animate) {
            classes.push('empty-state-animated');
        }
        
        // 自定义类
        if (this.options.classes.container) {
            classes.push(this.options.classes.container);
        }
        
        return classes.join(' ');
    }
    
    /**
     * 渲染组件
     */
    render() {
        this.container.innerHTML = this.getTemplate();
        
        // 绑定事件
        this.bindEvents();
        
        // 添加样式
        this.addStyles();
    }
    
    /**
     * 获取模板
     */
    getTemplate() {
        return `
            <div class="empty-state-content ${this.options.classes.content || ''}">
                <!-- 图标/图片 -->
                ${this.getIconTemplate()}
                
                <!-- 标题和消息 -->
                <div class="empty-state-text">
                    ${this.options.title ? `
                        <h3 class="empty-state-title ${this.options.classes.title || ''}">
                            ${this.options.title}
                        </h3>
                    ` : ''}
                    
                    ${this.options.message ? `
                        <p class="empty-state-message ${this.options.classes.message || ''}">
                            ${this.options.message}
                        </p>
                    ` : ''}
                </div>
                
                <!-- 操作按钮 -->
                ${this.options.showActions ? this.getActionsTemplate() : ''}
            </div>
        `;
    }
    
    /**
     * 获取图标模板
     */
    getIconTemplate() {
        if (this.options.showImage && this.options.imageUrl) {
            return `
                <div class="empty-state-image ${this.options.classes.image || ''}">
                    <img src="${this.options.imageUrl}" 
                         alt="${this.options.imageAlt || this.options.title}"
                         loading="lazy">
                </div>
            `;
        }
        
        if (this.options.customIcon) {
            return `
                <div class="empty-state-icon custom ${this.options.classes.icon || ''}">
                    ${this.options.customIcon}
                </div>
            `;
        }
        
        if (this.options.icon) {
            const iconClass = typeof this.options.icon === 'string' 
                ? this.options.icon 
                : this.state.typeConfig.icon;
            
            return `
                <div class="empty-state-icon ${this.options.classes.icon || ''}" 
                     style="color: ${this.state.typeConfig.color || '#6366f1'}">
                    <i class="${iconClass}"></i>
                </div>
            `;
        }
        
        return '';
    }
    
    /**
     * 获取操作按钮模板
     */
    getActionsTemplate() {
        const actions = this.getActions();
        
        if (actions.length === 0) {
            return '';
        }
        
        return `
            <div class="empty-state-actions ${this.options.classes.actions || ''}">
                ${actions.map((action, index) => `
                    <button type="button" 
                            class="empty-state-action ${action.className || ''} ${this.options.classes.actionBtn || ''} 
                                   ${action.type ? `btn-${action.type}` : 'btn-primary'}"
                            data-action="${action.id || index}"
                            ${action.disabled ? 'disabled' : ''}>
                        ${action.icon ? `<i class="${action.icon}"></i>` : ''}
                        ${action.text}
                    </button>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * 获取操作按钮
     */
    getActions() {
        // 如果有自定义操作，使用自定义
        if (this.options.actions && this.options.actions.length > 0) {
            return this.options.actions.map((action, index) => ({
                id: `action_${index}`,
                ...action
            }));
        }
        
        // 否则使用类型默认操作
        const defaultActions = this.getDefaultActions();
        return defaultActions;
    }
    
    /**
     * 获取默认操作按钮
     */
    getDefaultActions() {
        const actionConfigs = {
            'create': {
                id: 'create',
                text: '创建新内容',
                icon: 'fas fa-plus',
                type: 'primary',
                action: () => this.handleCreate()
            },
            'refresh': {
                id: 'refresh',
                text: '刷新',
                icon: 'fas fa-redo',
                type: 'secondary',
                action: () => this.handleRefresh()
            },
            'retry': {
                id: 'retry',
                text: '重试',
                icon: 'fas fa-redo',
                type: 'primary',
                action: () => this.handleRetry()
            },
            'clear': {
                id: 'clear',
                text: '清除筛选',
                icon: 'fas fa-times',
                type: 'secondary',
                action: () => this.handleClear()
            },
            'report': {
                id: 'report',
                text: '报告问题',
                icon: 'fas fa-bug',
                type: 'secondary',
                action: () => this.handleReport()
            },
            'offline': {
                id: 'offline',
                text: '离线工作',
                icon: 'fas fa-wifi-slash',
                type: 'secondary',
                action: () => this.handleOffline()
            },
            'new': {
                id: 'new',
                text: '新建',
                icon: 'fas fa-plus',
                type: 'primary',
                action: () => this.handleCreate()
            },
            'tour': {
                id: 'tour',
                text: '开始导览',
                icon: 'fas fa-compass',
                type: 'secondary',
                action: () => this.handleTour()
            },
            'browse': {
                id: 'browse',
                text: '浏览内容',
                icon: 'fas fa-folder-open',
                type: 'primary',
                action: () => this.handleBrowse()
            }
        };
        
        const typeActions = this.state.typeConfig.actions || [];
        return typeActions
            .map(actionId => actionConfigs[actionId])
            .filter(action => action);
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 绑定操作按钮事件
        const actionButtons = this.container.querySelectorAll('.empty-state-action');
        actionButtons.forEach(button => {
            const actionId = button.dataset.action;
            button.addEventListener('click', (e) => this.handleActionClick(e, actionId));
        });
    }
    
    /**
     * 处理操作点击
     */
    handleActionClick(event, actionId) {
        event.preventDefault();
        
        // 查找对应的操作配置
        const actions = this.getActions();
        const actionConfig = actions.find(action => 
            action.id === actionId || action.id === `action_${actionId}`
        );
        
        if (actionConfig) {
            // 执行操作
            if (actionConfig.action) {
                actionConfig.action();
            }
            
            // 触发回调
            if (this.options.onAction) {
                this.options.onAction(actionId, actionConfig, this);
            }
            
            // 触发事件
            document.dispatchEvent(new CustomEvent('empty-state:action', {
                detail: {
                    boundaryId: this.options.id,
                    actionId,
                    actionConfig,
                    emptyState: this
                }
            }));
        }
    }
    
    /**
     * 处理创建操作
     */
    handleCreate() {
        if (this.options.onCreate) {
            this.options.onCreate(this);
        } else {
            document.dispatchEvent(new CustomEvent('note:new'));
        }
    }
    
    /**
     * 处理刷新操作
     */
    handleRefresh() {
        if (this.options.onRefresh) {
            this.options.onRefresh(this);
        } else {
            window.location.reload();
        }
    }
    
    /**
     * 处理重试操作
     */
    handleRetry() {
        document.dispatchEvent(new CustomEvent('app:retry'));
    }
    
    /**
     * 处理清除操作
     */
    handleClear() {
        document.dispatchEvent(new CustomEvent('filters:clear'));
    }
    
    /**
     * 处理报告操作
     */
    handleReport() {
        const errorData = {
            type: this.options.type,
            title: this.options.title,
            message: this.options.message,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };
        
        console.log('[空状态] 报告问题:', errorData);
        
        // 这里可以调用错误上报API
        // 暂时只是显示提示
        this.showToast('问题已记录，感谢您的反馈！');
    }
    
    /**
     * 处理离线操作
     */
    handleOffline() {
        document.dispatchEvent(new CustomEvent('app:offline-mode'));
    }
    
    /**
     * 处理导览操作
     */
    handleTour() {
        document.dispatchEvent(new CustomEvent('app:tour:start'));
    }
    
    /**
     * 处理浏览操作
     */
    handleBrowse() {
        document.dispatchEvent(new CustomEvent('app:browse'));
    }
    
    /**
     * 显示提示
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'empty-state-toast';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * 添加样式
     */
    addStyles() {
        if (this.container.querySelector('style')) return;
        
        const styles = `
            <style>
                .empty-state {
                    width: 100%;
                    padding: 3rem 1.5rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    color: #64748b;
                    transition: all 0.3s ease;
                }
                
                .empty-state.centered {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }
                
                .empty-state.animated {
                    animation: fadeInUp 0.5s ease;
                }
                
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .empty-state.horizontal {
                    flex-direction: row;
                    text-align: left;
                    gap: 2rem;
                }
                
                .empty-state.horizontal .empty-state-text {
                    flex: 1;
                }
                
                .empty-state.compact {
                    padding: 1.5rem;
                }
                
                /* 大小变体 */
                .empty-state-sm {
                    padding: 1.5rem;
                }
                
                .empty-state-sm .empty-state-icon {
                    font-size: 2rem;
                    margin-bottom: 0.75rem;
                }
                
                .empty-state-sm .empty-state-title {
                    font-size: 1rem;
                }
                
                .empty-state-sm .empty-state-message {
                    font-size: 0.875rem;
                }
                
                .empty-state-lg {
                    padding: 4rem 2rem;
                }
                
                .empty-state-lg .empty-state-icon {
                    font-size: 4rem;
                    margin-bottom: 1.5rem;
                }
                
                .empty-state-lg .empty-state-title {
                    font-size: 1.5rem;
                }
                
                .empty-state-lg .empty-state-message {
                    font-size: 1.125rem;
                }
                
                .empty-state-xl {
                    padding: 5rem 2.5rem;
                }
                
                .empty-state-xl .empty-state-icon {
                    font-size: 5rem;
                    margin-bottom: 2rem;
                }
                
                .empty-state-xl .empty-state-title {
                    font-size: 2rem;
                }
                
                .empty-state-xl .empty-state-message {
                    font-size: 1.25rem;
                }
                
                /* 内容区域 */
                .empty-state-content {
                    max-width: 400px;
                    width: 100%;
                }
                
                .empty-state-lg .empty-state-content {
                    max-width: 500px;
                }
                
                .empty-state-xl .empty-state-content {
                    max-width: 600px;
                }
                
                /* 图标 */
                .empty-state-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    opacity: 0.7;
                }
                
                .empty-state-icon i {
                    display: block;
                }
                
                .empty-state-icon.custom {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                /* 图片 */
                .empty-state-image {
                    margin-bottom: 1.5rem;
                }
                
                .empty-state-image img {
                    max-width: 200px;
                    height: auto;
                    opacity: 0.7;
                }
                
                .empty-state-lg .empty-state-image img {
                    max-width: 300px;
                }
                
                /* 文本 */
                .empty-state-title {
                    color: #f8fafc;
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    line-height: 1.3;
                }
                
                .empty-state-message {
                    color: #94a3b8;
                    font-size: 1rem;
                    line-height: 1.5;
                    margin-bottom: 1.5rem;
                }
                
                /* 操作按钮 */
                .empty-state-actions {
                    display: flex;
                    gap: 0.75rem;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                
                .empty-state.horizontal .empty-state-actions {
                    justify-content: flex-start;
                }
                
                .empty-state-action {
                    padding: 0.625rem 1.25rem;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .empty-state-action:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .empty-state-action.btn-primary {
                    background-color: #6366f1;
                    color: white;
                    border-color: #6366f1;
                }
                
                .empty-state-action.btn-primary:hover:not(:disabled) {
                    background-color: #4f46e5;
                    border-color: #4f46e5;
                    transform: translateY(-1px);
                }
                
                .empty-state-action.btn-secondary {
                    background-color: #334155;
                    color: #cbd5e1;
                    border-color: #334155;
                }
                
                .empty-state-action.btn-secondary:hover:not(:disabled) {
                    background-color: #475569;
                    border-color: #475569;
                    color: #f8fafc;
                }
                
                .empty-state-action.btn-danger {
                    background-color: #ef4444;
                    color: white;
                    border-color: #ef4444;
                }
                
                .empty-state-action.btn-danger:hover:not(:disabled) {
                    background-color: #dc2626;
                    border-color: #dc2626;
                }
                
                /* 类型特定样式 */
                .empty-state-no-data .empty-state-icon {
                    color: #6366f1;
                }
                
                .empty-state-no-results .empty-state-icon {
                    color: #8b5cf6;
                }
                
                .empty-state-error .empty-state-icon {
                    color: #ef4444;
                }
                
                .empty-state-offline .empty-state-icon {
                    color: #f59e0b;
                }
                
                .empty-state-search .empty-state-icon {
                    color: #64748b;
                }
                
                .empty-state-welcome .empty-state-icon {
                    color: #10b981;
                }
                
                /* 主题适配 */
                .light .empty-state-title {
                    color: #1e293b;
                }
                
                .light .empty-state-message {
                    color: #64748b;
                }
                
                .light .empty-state-action.btn-secondary {
                    background-color: #e2e8f0;
                    color: #475569;
                    border-color: #e2e8f0;
                }
                
                .light .empty-state-action.btn-secondary:hover:not(:disabled) {
                    background-color: #cbd5e1;
                    border-color: #cbd5e1;
                }
                
                /* 提示 */
                .empty-state-toast {
                    position: fixed;
                    bottom: 1rem;
                    right: 1rem;
                    background: #1e293b;
                    color: #f8fafc;
                    padding: 0.75rem 1.25rem;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    z-index: 10000;
                    opacity: 0;
                    transform: translateY(10px);
                    transition: all 0.3s ease;
                }
                
                .empty-state-toast.show {
                    opacity: 1;
                    transform: translateY(0);
                }
            </style>
        `;
        
        this.container.insertAdjacentHTML('beforeend', styles);
    }
    
    /**
     * 显示组件
     */
    show() {
        this.state.isVisible = true;
        this.container.style.display = 'flex';
        this.container.classList.add('show');
    }
    
    /**
     * 隐藏组件
     */
    hide() {
        this.state.isVisible = false;
        this.container.style.display = 'none';
        this.container.classList.remove('show');
    }
    
    /**
     * 更新内容
     */
    update(options = {}) {
        // 更新选项
        this.options = { ...this.options, ...options };
        
        // 重新获取类型配置
        if (options.type) {
            this.state.typeConfig = this.getTypeConfig();
            this.ensureDefaults();
        }
        
        // 重新渲染
        this.render();
        
        // 如果当前显示，确保显示
        if (this.state.isVisible) {
            this.show();
        }
    }
    
    /**
     * 设置类型
     */
    setType(type) {
        this.update({ type });
    }
    
    /**
     * 设置标题
     */
    setTitle(title) {
        this.options.title = title;
        
        const titleElement = this.container.querySelector('.empty-state-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }
    
    /**
     * 设置消息
     */
    setMessage(message) {
        this.options.message = message;
        
        const messageElement = this.container.querySelector('.empty-state-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }
    
    /**
     * 设置图标
     */
    setIcon(icon) {
        this.options.icon = icon;
        this.render();
    }
    
    /**
     * 设置操作按钮
     */
    setActions(actions) {
        this.options.actions = actions;
        
        const actionsContainer = this.container.querySelector('.empty-state-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = this.getActionsTemplate();
            this.bindEvents();
        }
    }
    
    /**
     * 设置为加载状态
     */
    setLoading(isLoading = true, loadingText = '加载中...') {
        if (isLoading) {
            this.container.classList.add('loading');
            
            const icon = this.container.querySelector('.empty-state-icon i');
            if (icon) {
                icon.className = 'fas fa-spinner fa-spin';
            }
            
            this.setMessage(loadingText);
            
            // 禁用所有按钮
            const buttons = this.container.querySelectorAll('.empty-state-action');
            buttons.forEach(btn => btn.disabled = true);
        } else {
            this.container.classList.remove('loading');
            this.ensureDefaults();
            this.render();
        }
    }
    
    /**
     * 设置为成功状态
     */
    setSuccess(message = '操作成功！', duration = 2000) {
        const originalType = this.options.type;
        const originalMessage = this.options.message;
        const originalIcon = this.options.icon;
        
        this.update({
            type: 'success',
            message: message,
            icon: 'fas fa-check-circle',
            showActions: false
        });
        
        // 恢复原始状态
        setTimeout(() => {
            this.update({
                type: originalType,
                message: originalMessage,
                icon: originalIcon,
                showActions: true
            });
        }, duration);
    }
    
    /**
     * 设置为错误状态
     */
    setError(message = '操作失败，请重试', duration = 3000) {
        const originalType = this.options.type;
        const originalMessage = this.options.message;
        const originalIcon = this.options.icon;
        
        this.update({
            type: 'error',
            message: message,
            icon: 'fas fa-exclamation-circle',
            showActions: true
        });
        
        // 恢复原始状态
        setTimeout(() => {
            this.update({
                type: originalType,
                message: originalMessage,
                icon: originalIcon
            });
        }, duration);
    }
    
    /**
     * 渲染到指定容器
     */
    renderTo(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }
        
        if (container) {
            container.innerHTML = '';
            container.appendChild(this.container);
            this.show();
        }
        
        return this;
    }
    
    /**
     * 获取容器元素
     */
    getContainer() {
        return this.container;
    }
    
    /**
     * 销毁组件
     */
    destroy() {
        // 从DOM移除
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // 清理引用
        this.container = null;
        this.actionCallbacks.clear();
        
        console.log(`[空状态] 已销毁: ${this.options.id}`);
    }
    
    /**
     * 获取当前状态
     */
    getState() {
        return { 
            isVisible: this.state.isVisible,
            type: this.options.type,
            title: this.options.title,
            message: this.options.message
        };
    }
    
    /**
     * 静态方法：创建空状态
     */
    static create(options) {
        return new EmptyState(options);
    }
    
    /**
     * 静态方法：快速显示无数据状态
     */
    static showNoData(container, options = {}) {
        const emptyState = new EmptyState({
            type: 'no-data',
            ...options
        });
        
        return emptyState.renderTo(container);
    }
    
    /**
     * 静态方法：快速显示无结果状态
     */
    static showNoResults(container, options = {}) {
        const emptyState = new EmptyState({
            type: 'no-results',
            ...options
        });
        
        return emptyState.renderTo(container);
    }
    
    /**
     * 静态方法：快速显示错误状态
     */
    static showError(container, options = {}) {
        const emptyState = new EmptyState({
            type: 'error',
            ...options
        });
        
        return emptyState.renderTo(container);
    }
    
    /**
     * 静态方法：快速显示离线状态
     */
    static showOffline(container, options = {}) {
        const emptyState = new EmptyState({
            type: 'offline',
            ...options
        });
        
        return emptyState.renderTo(container);
    }
}

/**
 * 空状态管理器
 */
export class EmptyStateManager {
    constructor() {
        this.states = new Map();
        this.defaultOptions = {
            centered: true,
            animate: true,
            showActions: true
        };
    }
    
    /**
     * 注册空状态
     */
    register(key, emptyState) {
        this.states.set(key, emptyState);
        return emptyState;
    }
    
    /**
     * 获取空状态
     */
    get(key) {
        return this.states.get(key);
    }
    
    /**
     * 创建并注册空状态
     */
    create(key, options = {}) {
        const emptyState = new EmptyState({
            id: `empty-state_${key}`,
            ...this.defaultOptions,
            ...options
        });
        
        this.register(key, emptyState);
        return emptyState;
    }
    
    /**
     * 显示空状态
     */
    show(key, container, options = {}) {
        let emptyState = this.get(key);
        
        if (!emptyState) {
            emptyState = this.create(key, options);
        } else if (Object.keys(options).length > 0) {
            emptyState.update(options);
        }
        
        return emptyState.renderTo(container);
    }
    
    /**
     * 隐藏空状态
     */
    hide(key) {
        const emptyState = this.get(key);
        if (emptyState) {
            emptyState.hide();
        }
    }
    
    /**
     * 隐藏所有空状态
     */
    hideAll() {
        this.states.forEach(emptyState => {
            emptyState.hide();
        });
    }
    
    /**
     * 移除空状态
     */
    remove(key) {
        const emptyState = this.get(key);
        if (emptyState) {
            emptyState.destroy();
            this.states.delete(key);
        }
    }
    
    /**
     * 移除所有空状态
     */
    removeAll() {
        this.states.forEach(emptyState => {
            emptyState.destroy();
        });
        this.states.clear();
    }
    
    /**
     * 检查是否有空状态显示
     */
    isVisible(key = null) {
        if (key) {
            const emptyState = this.get(key);
            return emptyState ? emptyState.getState().isVisible : false;
        }
        
        // 检查任意空状态
        for (const emptyState of this.states.values()) {
            if (emptyState.getState().isVisible) {
                return true;
            }
        }
        
        return false;
    }
}

/**
 * 默认空状态管理器实例
 */
export const emptyStateManager = new EmptyStateManager();

/**
 * 快捷方法
 */
export const EmptyStateUtil = {
    // 创建空状态
    create: (options) => new EmptyState(options),
    
    // 显示无数据
    noData: (container, options) => EmptyState.showNoData(container, options),
    
    // 显示无结果
    noResults: (container, options) => EmptyState.showNoResults(container, options),
    
    // 显示错误
    error: (container, options) => EmptyState.showError(container, options),
    
    // 显示离线
    offline: (container, options) => EmptyState.showOffline(container, options),
    
    // 管理器
    manager: emptyStateManager
};
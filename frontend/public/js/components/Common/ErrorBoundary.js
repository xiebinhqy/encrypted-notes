/**
 * 错误边界组件
 * 用于捕获子组件中的JavaScript错误，并显示降级UI而不是白屏
 * 类似于React的ErrorBoundary，但为原生JavaScript实现
 */

import Utils from '../../core/utils.js';
import Config from '../../config.js';

export class ErrorBoundary {
    constructor(options = {}) {
        this.options = {
            id: `error-boundary_${Utils.generateId()}`,
            target: null, // 要保护的目标元素或组件
            fallbackUI: 'default', // 'default', 'custom', 'minimal'
            customFallback: null, // 自定义降级UI函数
            showErrorDetails: Config.ENV === 'development', // 开发环境显示错误详情
            logErrors: true, // 是否记录错误到控制台
            reportErrors: false, // 是否上报错误到服务器
            maxRetries: 3, // 最大重试次数
            retryDelay: 1000, // 重试延迟(ms)
            onError: null, // 错误回调
            onRecover: null, // 恢复回调
            classes: {
                container: '',
                error: '',
                title: '',
                message: '',
                details: '',
                actions: '',
                retryBtn: '',
                resetBtn: '',
                reportBtn: ''
            },
            ...options
        };
        
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: 0,
            isRecovering: false,
            lastErrorTime: null
        };
        
        this.container = null;
        this.originalContent = null;
        this.errorListeners = [];
        this.init();
    }
    
    /**
     * 初始化错误边界
     */
    init() {
        // 设置全局错误处理器
        this.setupGlobalErrorHandling();
        
        // 创建容器
        this.createContainer();
        
        // 设置重试机制
        this.setupRetryMechanism();
        
        console.log(`[错误边界] 初始化: ${this.options.id}`);
    }
    
    /**
     * 设置全局错误处理
     */
    setupGlobalErrorHandling() {
        // 保存原始错误处理器
        this.originalErrorHandler = window.onerror;
        this.originalUnhandledRejectionHandler = window.onunhandledrejection;
        
        // 设置新的错误处理器
        window.onerror = (message, source, lineno, colno, error) => {
            return this.handleGlobalError(error || new Error(message), {
                type: 'global',
                source,
                lineno,
                colno
            });
        };
        
        // 处理未捕获的Promise拒绝
        window.onunhandledrejection = (event) => {
            return this.handleGlobalError(event.reason, {
                type: 'unhandledrejection',
                isPromise: true
            });
        };
        
        // 监听错误事件
        window.addEventListener('error', (event) => {
            // 防止重复处理
            if (event.error && !event.error.__handledByBoundary) {
                this.handleGlobalError(event.error, {
                    type: 'event',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            }
        }, true);
    }
    
    /**
     * 创建容器
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = this.options.id;
        this.container.className = `error-boundary ${this.options.classes.container || ''}`;
        
        // 如果提供了目标元素，包装它
        if (this.options.target) {
            this.wrapTarget();
        }
    }
    
    /**
     * 包装目标元素
     */
    wrapTarget() {
        const target = this.options.target;
        
        if (target instanceof HTMLElement) {
            // 如果是DOM元素
            this.originalContent = target.innerHTML;
            target.parentNode.insertBefore(this.container, target);
            this.container.appendChild(target);
        } else if (typeof target === 'function') {
            // 如果是组件函数
            this.renderComponent(target);
        } else if (target && target.render) {
            // 如果是组件实例
            this.renderComponentInstance(target);
        }
    }
    
    /**
     * 渲染组件
     */
    async renderComponent(componentFn) {
        try {
            await componentFn();
        } catch (error) {
            this.handleComponentError(error, { component: componentFn });
        }
    }
    
    /**
     * 渲染组件实例
     */
    async renderComponentInstance(component) {
        try {
            if (component.render) {
                await component.render(this.container);
            }
        } catch (error) {
            this.handleComponentError(error, { component });
        }
    }
    
    /**
     * 设置重试机制
     */
    setupRetryMechanism() {
        // 监听重试事件
        document.addEventListener('error-boundary:retry', (event) => {
            if (event.detail && event.detail.boundaryId === this.options.id) {
                this.retry();
            }
        });
        
        // 监听重置事件
        document.addEventListener('error-boundary:reset', (event) => {
            if (event.detail && event.detail.boundaryId === this.options.id) {
                this.reset();
            }
        });
    }
    
    /**
     * 处理全局错误
     */
    handleGlobalError(error, info = {}) {
        // 标记错误已处理
        error.__handledByBoundary = true;
        
        // 更新状态
        this.state.hasError = true;
        this.state.error = error;
        this.state.errorInfo = info;
        this.state.lastErrorTime = Date.now();
        
        // 记录错误
        if (this.options.logErrors) {
            this.logError(error, info);
        }
        
        // 上报错误
        if (this.options.reportErrors) {
            this.reportError(error, info);
        }
        
        // 触发错误回调
        if (this.options.onError) {
            this.options.onError(error, info, this);
        }
        
        // 显示错误UI
        this.showErrorUI();
        
        // 触发全局错误事件
        document.dispatchEvent(new CustomEvent('app:error', {
            detail: { error, info, boundary: this }
        }));
        
        // 防止错误冒泡
        return true;
    }
    
    /**
     * 处理组件错误
     */
    handleComponentError(error, info = {}) {
        this.handleGlobalError(error, {
            ...info,
            type: 'component',
            boundaryId: this.options.id
        });
    }
    
    /**
     * 记录错误
     */
    logError(error, info) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            boundaryId: this.options.id,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            info,
            url: window.location.href,
            userAgent: navigator.userAgent,
            state: this.state
        };
        
        console.groupCollapsed(`[错误边界] ${error.name}: ${error.message}`);
        console.error('错误详情:', error);
        console.error('错误信息:', info);
        console.error('完整日志:', errorLog);
        console.groupEnd();
        
        // 保存到本地存储（仅保存最近10个错误）
        const errorHistory = Utils.storage.get('error_history', []);
        errorHistory.unshift(errorLog);
        
        if (errorHistory.length > 10) {
            errorHistory.length = 10;
        }
        
        Utils.storage.set('error_history', errorHistory);
    }
    
    /**
     * 上报错误
     */
    async reportError(error, info) {
        if (!Config.API_BASE_URL) return;
        
        try {
            const report = {
                boundaryId: this.options.id,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                },
                info: {
                    type: info.type,
                    source: info.source,
                    lineno: info.lineno,
                    colno: info.colno
                },
                timestamp: new Date().toISOString(),
                url: window.location.href,
                version: Config.APP_VERSION,
                environment: Config.ENV
            };
            
            // 这里可以调用错误上报API
            // await fetch(`${Config.API_BASE_URL}/errors`, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(report)
            // });
            
        } catch (reportError) {
            console.error('[错误边界] 错误上报失败:', reportError);
        }
    }
    
    /**
     * 显示错误UI
     */
    showErrorUI() {
        if (!this.container) return;
        
        // 清空容器
        this.container.innerHTML = '';
        
        // 添加错误UI
        const errorUI = this.getErrorUI();
        this.container.innerHTML = errorUI;
        
        // 添加样式
        this.addErrorStyles();
        
        // 绑定事件
        this.bindErrorUIActions();
        
        // 显示容器
        this.container.style.display = 'block';
        this.container.classList.add('has-error');
        
        // 触发错误显示事件
        document.dispatchEvent(new CustomEvent('error-boundary:shown', {
            detail: { boundaryId: this.options.id, error: this.state.error }
        }));
    }
    
    /**
     * 获取错误UI
     */
    getErrorUI() {
        if (this.options.fallbackUI === 'custom' && this.options.customFallback) {
            return this.options.customFallback(this.state.error, this.state.errorInfo, this);
        }
        
        if (this.options.fallbackUI === 'minimal') {
            return this.getMinimalErrorUI();
        }
        
        return this.getDefaultErrorUI();
    }
    
    /**
     * 获取默认错误UI
     */
    getDefaultErrorUI() {
        const { error, errorInfo } = this.state;
        const showDetails = this.options.showErrorDetails && error;
        
        return `
            <div class="error-boundary-ui ${this.options.classes.error || ''}">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                
                <div class="error-content">
                    <h3 class="error-title ${this.options.classes.title || ''}">
                        哎呀，出错了！
                    </h3>
                    
                    <div class="error-message ${this.options.classes.message || ''}">
                        <p>应用遇到了一个意外错误，这可能是一个临时问题。</p>
                        <p>错误信息: <strong>${error ? error.message : '未知错误'}</strong></p>
                        
                        ${this.state.retryCount > 0 ? `
                            <p class="retry-count">已重试 ${this.state.retryCount} 次</p>
                        ` : ''}
                    </div>
                    
                    ${showDetails ? this.getErrorDetails() : ''}
                    
                    <div class="error-actions ${this.options.classes.actions || ''}">
                        <button class="error-action-btn retry ${this.options.classes.retryBtn || ''}" 
                                ${this.state.isRecovering ? 'disabled' : ''}>
                            <i class="fas fa-redo ${this.state.isRecovering ? 'fa-spin' : ''}"></i>
                            ${this.state.isRecovering ? '恢复中...' : '重试'}
                        </button>
                        
                        <button class="error-action-btn reset ${this.options.classes.resetBtn || ''}">
                            <i class="fas fa-home"></i>
                            返回首页
                        </button>
                        
                        ${this.options.reportErrors ? `
                            <button class="error-action-btn report ${this.options.classes.reportBtn || ''}">
                                <i class="fas fa-bug"></i>
                                报告问题
                            </button>
                        ` : ''}
                    </div>
                    
                    <div class="error-help">
                        <p class="help-text">
                            如果问题持续存在，请尝试：
                        </p>
                        <ul class="help-list">
                            <li>刷新页面</li>
                            <li>检查网络连接</li>
                            <li>清除浏览器缓存</li>
                            <li>联系技术支持</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取最小化错误UI
     */
    getMinimalErrorUI() {
        return `
            <div class="error-boundary-ui minimal">
                <div class="error-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="error-message">
                    加载失败，请
                    <button class="text-link retry">重试</button>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取错误详情
     */
    getErrorDetails() {
        const { error, errorInfo } = this.state;
        
        if (!error) return '';
        
        return `
            <div class="error-details ${this.options.classes.details || ''}">
                <details>
                    <summary>错误详情（仅开发环境可见）</summary>
                    <div class="details-content">
                        <div class="detail-item">
                            <strong>错误类型:</strong> ${error.name}
                        </div>
                        
                        ${errorInfo.type ? `
                            <div class="detail-item">
                                <strong>错误来源:</strong> ${errorInfo.type}
                            </div>
                        ` : ''}
                        
                        ${errorInfo.source ? `
                            <div class="detail-item">
                                <strong>文件:</strong> ${errorInfo.source}
                            </div>
                        ` : ''}
                        
                        ${errorInfo.lineno ? `
                            <div class="detail-item">
                                <strong>行号:</strong> ${errorInfo.lineno}
                            </div>
                        ` : ''}
                        
                        ${errorInfo.colno ? `
                            <div class="detail-item">
                                <strong>列号:</strong> ${errorInfo.colno}
                            </div>
                        ` : ''}
                        
                        ${error.stack ? `
                            <div class="detail-item">
                                <strong>调用栈:</strong>
                                <pre class="error-stack">${error.stack}</pre>
                            </div>
                        ` : ''}
                        
                        ${errorInfo.component ? `
                            <div class="detail-item">
                                <strong>出错组件:</strong> ${errorInfo.component.constructor?.name || '匿名组件'}
                            </div>
                        ` : ''}
                    </div>
                </details>
            </div>
        `;
    }
    
    /**
     * 添加错误样式
     */
    addErrorStyles() {
        if (this.container.querySelector('style')) return;
        
        const styles = `
            <style>
                .error-boundary {
                    width: 100%;
                    min-height: 200px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    border-radius: 12px;
                    border: 1px solid #334155;
                    padding: 2rem;
                }
                
                .error-boundary.has-error {
                    animation: errorShake 0.5s ease;
                }
                
                @keyframes errorShake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                
                .error-boundary-ui {
                    text-align: center;
                    max-width: 500px;
                    width: 100%;
                }
                
                .error-boundary-ui.minimal {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    justify-content: center;
                    padding: 1rem;
                }
                
                .error-icon {
                    font-size: 3rem;
                    color: #f59e0b;
                    margin-bottom: 1.5rem;
                }
                
                .error-boundary-ui.minimal .error-icon {
                    font-size: 1.5rem;
                    margin-bottom: 0;
                }
                
                .error-title {
                    color: #f8fafc;
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                }
                
                .error-message {
                    color: #cbd5e1;
                    line-height: 1.6;
                    margin-bottom: 1.5rem;
                }
                
                .error-boundary-ui.minimal .error-message {
                    margin-bottom: 0;
                    color: #94a3b8;
                }
                
                .retry-count {
                    color: #f59e0b;
                    font-size: 0.875rem;
                    margin-top: 0.5rem;
                }
                
                .error-details {
                    background: #0f172a;
                    border: 1px solid #334155;
                    border-radius: 8px;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                    text-align: left;
                }
                
                .error-details summary {
                    color: #94a3b8;
                    cursor: pointer;
                    font-size: 0.875rem;
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                    user-select: none;
                }
                
                .error-details summary:hover {
                    color: #cbd5e1;
                }
                
                .details-content {
                    color: #94a3b8;
                    font-size: 0.75rem;
                    line-height: 1.5;
                }
                
                .detail-item {
                    margin-bottom: 0.5rem;
                }
                
                .detail-item strong {
                    color: #cbd5e1;
                }
                
                .error-stack {
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 4px;
                    padding: 0.75rem;
                    margin-top: 0.5rem;
                    overflow: auto;
                    font-size: 0.6875rem;
                    line-height: 1.4;
                    color: #94a3b8;
                    max-height: 200px;
                }
                
                .error-actions {
                    display: flex;
                    gap: 0.75rem;
                    justify-content: center;
                    margin-bottom: 1.5rem;
                }
                
                .error-action-btn {
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
                
                .error-action-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .error-action-btn.retry {
                    background-color: #f59e0b;
                    color: white;
                    border-color: #f59e0b;
                }
                
                .error-action-btn.retry:hover:not(:disabled) {
                    background-color: #d97706;
                    border-color: #d97706;
                }
                
                .error-action-btn.reset {
                    background-color: #334155;
                    color: #cbd5e1;
                    border-color: #334155;
                }
                
                .error-action-btn.reset:hover {
                    background-color: #475569;
                    border-color: #475569;
                    color: #f8fafc;
                }
                
                .error-action-btn.report {
                    background-color: #3b82f6;
                    color: white;
                    border-color: #3b82f6;
                }
                
                .error-action-btn.report:hover {
                    background-color: #2563eb;
                    border-color: #2563eb;
                }
                
                .text-link {
                    background: none;
                    border: none;
                    color: #3b82f6;
                    cursor: pointer;
                    padding: 0;
                    text-decoration: underline;
                }
                
                .text-link:hover {
                    color: #60a5fa;
                }
                
                .error-help {
                    text-align: left;
                    background: rgba(15, 23, 42, 0.5);
                    border-radius: 8px;
                    padding: 1rem;
                    border-left: 3px solid #334155;
                }
                
                .help-text {
                    color: #94a3b8;
                    font-size: 0.875rem;
                    margin-bottom: 0.5rem;
                }
                
                .help-list {
                    color: #64748b;
                    font-size: 0.8125rem;
                    line-height: 1.5;
                    margin: 0;
                    padding-left: 1.25rem;
                }
                
                .help-list li {
                    margin-bottom: 0.25rem;
                }
            </style>
        `;
        
        this.container.insertAdjacentHTML('beforeend', styles);
    }
    
    /**
     * 绑定错误UI操作事件
     */
    bindErrorUIActions() {
        // 重试按钮
        const retryBtn = this.container.querySelector('.retry');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.retry());
        }
        
        // 重置按钮
        const resetBtn = this.container.querySelector('.reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }
        
        // 报告按钮
        const reportBtn = this.container.querySelector('.report');
        if (reportBtn) {
            reportBtn.addEventListener('click', () => this.reportErrorDialog());
        }
        
        // 文本链接重试
        const textRetry = this.container.querySelector('.text-link.retry');
        if (textRetry) {
            textRetry.addEventListener('click', () => this.retry());
        }
    }
    
    /**
     * 重试
     */
    async retry() {
        if (this.state.isRecovering) return;
        
        this.state.isRecovering = true;
        this.state.retryCount++;
        
        // 更新UI
        this.updateRetryUI();
        
        // 延迟重试
        await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
        
        try {
            // 清除错误状态
            this.state.hasError = false;
            this.state.error = null;
            this.state.errorInfo = null;
            this.state.isRecovering = false;
            
            // 隐藏错误UI
            this.container.style.display = 'none';
            this.container.classList.remove('has-error');
            
            // 恢复原始内容
            if (this.originalContent) {
                this.container.innerHTML = this.originalContent;
            }
            
            // 重新渲染组件
            if (this.options.target) {
                if (typeof this.options.target === 'function') {
                    await this.renderComponent(this.options.target);
                } else if (this.options.target && this.options.target.render) {
                    await this.renderComponentInstance(this.options.target);
                }
            }
            
            // 触发恢复回调
            if (this.options.onRecover) {
                this.options.onRecover(this);
            }
            
            // 触发恢复事件
            document.dispatchEvent(new CustomEvent('error-boundary:recovered', {
                detail: { 
                    boundaryId: this.options.id, 
                    retryCount: this.state.retryCount 
                }
            }));
            
            console.log(`[错误边界] 恢复成功: ${this.options.id}`);
            
        } catch (error) {
            // 重试失败
            this.state.isRecovering = false;
            this.handleComponentError(error, { type: 'retry', retryCount: this.state.retryCount });
            
            // 如果达到最大重试次数
            if (this.state.retryCount >= this.options.maxRetries) {
                this.showMaxRetriesExceeded();
            }
        }
    }
    
    /**
     * 更新重试UI
     */
    updateRetryUI() {
        const retryBtn = this.container.querySelector('.retry');
        if (retryBtn) {
            const icon = retryBtn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-redo fa-spin';
            }
            retryBtn.textContent = '恢复中...';
            retryBtn.disabled = true;
        }
    }
    
    /**
     * 显示达到最大重试次数
     */
    showMaxRetriesExceeded() {
        const errorMessage = this.container.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.innerHTML += `
                <p class="max-retries">
                    <i class="fas fa-exclamation-circle"></i>
                    已达到最大重试次数（${this.options.maxRetries}），请尝试其他解决方案。
                </p>
            `;
        }
    }
    
    /**
     * 重置
     */
    reset() {
        // 跳转到首页
        window.location.href = '/';
    }
    
    /**
     * 报告错误对话框
     */
    reportErrorDialog() {
        const { error, errorInfo } = this.state;
        
        const reportData = {
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : null,
            info: errorInfo,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        // 复制到剪贴板
        const reportText = JSON.stringify(reportData, null, 2);
        navigator.clipboard.writeText(reportText).then(() => {
            // 显示成功消息
            const reportBtn = this.container.querySelector('.report');
            if (reportBtn) {
                const originalText = reportBtn.innerHTML;
                reportBtn.innerHTML = '<i class="fas fa-check"></i> 已复制';
                reportBtn.disabled = true;
                
                setTimeout(() => {
                    reportBtn.innerHTML = originalText;
                    reportBtn.disabled = false;
                }, 2000);
            }
        });
    }
    
    /**
     * 包裹组件
     */
    wrap(component) {
        return async (...args) => {
            try {
                return await component(...args);
            } catch (error) {
                this.handleComponentError(error, { 
                    component,
                    args,
                    type: 'wrapped'
                });
                throw error;
            }
        };
    }
    
    /**
     * 包裹异步函数
     */
    wrapAsync(fn, options = {}) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handleComponentError(error, {
                    function: fn.name || 'anonymous',
                    args,
                    type: 'async',
                    ...options
                });
                
                if (options.throwAfterCatch !== false) {
                    throw error;
                }
            }
        };
    }
    
    /**
     * 清除错误
     */
    clearError() {
        this.state.hasError = false;
        this.state.error = null;
        this.state.errorInfo = null;
        this.state.retryCount = 0;
        this.state.isRecovering = false;
        
        // 隐藏错误UI
        if (this.container) {
            this.container.style.display = 'none';
            this.container.classList.remove('has-error');
            
            // 恢复原始内容
            if (this.originalContent) {
                this.container.innerHTML = this.originalContent;
            }
        }
        
        console.log(`[错误边界] 错误已清除: ${this.options.id}`);
    }
    
    /**
     * 获取错误历史
     */
    getErrorHistory(limit = 10) {
        return Utils.storage.get('error_history', []).slice(0, limit);
    }
    
    /**
     * 清除错误历史
     */
    clearErrorHistory() {
        Utils.storage.remove('error_history');
    }
    
    /**
     * 销毁
     */
    destroy() {
        // 恢复原始错误处理器
        window.onerror = this.originalErrorHandler;
        window.onunhandledrejection = this.originalUnhandledRejectionHandler;
        
        // 移除事件监听器
        this.errorListeners.forEach(([element, event, handler]) => {
            element.removeEventListener(event, handler);
        });
        
        this.errorListeners = [];
        
        // 从DOM移除
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // 清理引用
        this.container = null;
        this.originalContent = null;
        
        console.log(`[错误边界] 已销毁: ${this.options.id}`);
    }
    
    /**
     * 获取当前状态
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * 静态方法：创建错误边界
     */
    static create(options) {
        return new ErrorBoundary(options);
    }
    
    /**
     * 静态方法：保护组件
     */
    static protect(component, options = {}) {
        const boundary = new ErrorBoundary(options);
        return boundary.wrap(component);
    }
    
    /**
     * 静态方法：保护异步函数
     */
    static protectAsync(fn, options = {}) {
        const boundary = new ErrorBoundary(options);
        return boundary.wrapAsync(fn, options);
    }
}

/**
 * 全局错误边界管理器
 */
export class ErrorBoundaryManager {
    constructor() {
        this.boundaries = new Map();
        this.globalBoundary = null;
    }
    
    /**
     * 注册错误边界
     */
    register(key, boundary) {
        this.boundaries.set(key, boundary);
        return boundary;
    }
    
    /**
     * 获取错误边界
     */
    get(key) {
        return this.boundaries.get(key);
    }
    
    /**
     * 创建并注册错误边界
     */
    create(key, options = {}) {
        const boundary = new ErrorBoundary(options);
        this.register(key, boundary);
        return boundary;
    }
    
    /**
     * 移除错误边界
     */
    remove(key) {
        const boundary = this.boundaries.get(key);
        if (boundary) {
            boundary.destroy();
            this.boundaries.delete(key);
        }
    }
    
    /**
     * 设置全局错误边界
     */
    setGlobal(boundary) {
        if (this.globalBoundary) {
            this.globalBoundary.destroy();
        }
        
        this.globalBoundary = boundary;
        return boundary;
    }
    
    /**
     * 获取全局错误边界
     */
    getGlobal() {
        return this.globalBoundary;
    }
    
    /**
     * 清除所有错误
     */
    clearAllErrors() {
        this.boundaries.forEach(boundary => {
            boundary.clearError();
        });
        
        if (this.globalBoundary) {
            this.globalBoundary.clearError();
        }
    }
    
    /**
     * 获取所有错误
     */
    getAllErrors() {
        const errors = [];
        
        this.boundaries.forEach((boundary, key) => {
            const state = boundary.getState();
            if (state.hasError) {
                errors.push({
                    key,
                    error: state.error,
                    info: state.errorInfo,
                    retryCount: state.retryCount
                });
            }
        });
        
        if (this.globalBoundary) {
            const state = this.globalBoundary.getState();
            if (state.hasError) {
                errors.push({
                    key: 'global',
                    error: state.error,
                    info: state.errorInfo,
                    retryCount: state.retryCount
                });
            }
        }
        
        return errors;
    }
    
    /**
     * 检查是否有错误
     */
    hasErrors() {
        return this.getAllErrors().length > 0;
    }
    
    /**
     * 销毁所有
     */
    destroyAll() {
        this.boundaries.forEach(boundary => {
            boundary.destroy();
        });
        
        this.boundaries.clear();
        
        if (this.globalBoundary) {
            this.globalBoundary.destroy();
            this.globalBoundary = null;
        }
    }
}

/**
 * 默认错误边界管理器实例
 */
export const errorBoundaryManager = new ErrorBoundaryManager();

/**
 * 快捷方法
 */
export const ErrorBoundaryUtil = {
    // 创建错误边界
    create: (options) => new ErrorBoundary(options),
    
    // 保护组件
    protect: (component, options) => ErrorBoundary.protect(component, options),
    
    // 保护异步函数
    protectAsync: (fn, options) => ErrorBoundary.protectAsync(fn, options),
    
    // 管理器
    manager: errorBoundaryManager,
    
    // 获取错误历史
    getHistory: (limit) => {
        const boundary = new ErrorBoundary();
        return boundary.getErrorHistory(limit);
    },
    
    // 清除错误历史
    clearHistory: () => {
        const boundary = new ErrorBoundary();
        boundary.clearErrorHistory();
    },
    
    // 设置全局错误处理
    setupGlobal: (options = {}) => {
        const boundary = new ErrorBoundary({
            id: 'global',
            target: document.body,
            ...options
        });
        
        errorBoundaryManager.setGlobal(boundary);
        return boundary;
    }
};
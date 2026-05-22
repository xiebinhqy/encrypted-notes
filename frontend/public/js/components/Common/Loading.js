/**
 * 加载状态组件
 * 提供全屏加载、局部加载、按钮加载等多种加载状态指示器
 */

import Utils from '../../core/utils.js';

export class Loading {
    constructor(options = {}) {
        this.options = {
            id: `loading_${Utils.generateId()}`,
            type: 'spinner', // 'spinner', 'dots', 'bars', 'progress', 'skeleton'
            size: 'md', // 'sm', 'md', 'lg', 'xl'
            color: 'primary', // 'primary', 'secondary', 'white', 'dark'
            text: '加载中...',
            subtext: '',
            fullscreen: false,
            overlay: true,
            overlayOpacity: 0.7,
            target: document.body,
            position: 'center', // 'center', 'top', 'bottom', 'left', 'right'
            zIndex: 9999,
            autoShow: false,
            showProgress: false,
            progress: 0,
            indeterminate: true,
            timeout: 0, // 自动隐藏时间(ms)，0表示不自动隐藏
            classes: {
                container: '',
                overlay: '',
                content: '',
                spinner: '',
                text: '',
                subtext: '',
                progress: ''
            },
            onShow: null,
            onHide: null,
            onTimeout: null,
            ...options
        };
        
        this.state = {
            isVisible: false,
            isShowing: false,
            isHiding: false,
            progress: this.options.progress,
            timeoutId: null
        };
        
        this.container = null;
        this.overlay = null;
        this.content = null;
        this.progressBar = null;
        
        this.init();
    }
    
    /**
     * 初始化加载组件
     */
    init() {
        // 创建DOM元素
        this.createElements();
        
        // 绑定事件
        this.bindEvents();
        
        // 自动显示
        if (this.options.autoShow) {
            this.show();
        }
    }
    
    /**
     * 创建DOM元素
     */
    createElements() {
        // 创建容器
        this.container = document.createElement('div');
        this.container.id = this.options.id;
        this.container.className = this.getContainerClasses();
        this.container.style.zIndex = this.options.zIndex;
        
        // 创建遮罩层
        if (this.options.overlay && this.options.fullscreen) {
            this.overlay = document.createElement('div');
            this.overlay.className = this.getOverlayClasses();
            this.overlay.style.opacity = this.options.overlayOpacity;
            this.container.appendChild(this.overlay);
        }
        
        // 创建内容区域
        this.content = document.createElement('div');
        this.content.className = this.getContentClasses();
        this.content.innerHTML = this.getContentTemplate();
        this.container.appendChild(this.content);
        
        // 添加到目标元素
        if (this.options.target) {
            if (this.options.target === document.body) {
                document.body.appendChild(this.container);
            } else {
                this.options.target.appendChild(this.container);
            }
        }
        
        // 缓存进度条元素
        if (this.options.showProgress) {
            this.progressBar = this.content.querySelector('.loading-progress-bar');
            this.progressText = this.content.querySelector('.loading-progress-text');
        }
        
        // 初始隐藏
        this.hide(true);
    }
    
    /**
     * 获取容器类名
     */
    getContainerClasses() {
        const classes = ['loading-container'];
        
        if (this.options.fullscreen) {
            classes.push('loading-fullscreen');
        }
        
        if (this.options.position !== 'center') {
            classes.push(`loading-${this.options.position}`);
        }
        
        if (this.options.classes.container) {
            classes.push(this.options.classes.container);
        }
        
        return classes.join(' ');
    }
    
    /**
     * 获取遮罩层类名
     */
    getOverlayClasses() {
        const classes = ['loading-overlay'];
        
        if (this.options.classes.overlay) {
            classes.push(this.options.classes.overlay);
        }
        
        return classes.join(' ');
    }
    
    /**
     * 获取内容区域类名
     */
    getContentClasses() {
        const classes = ['loading-content'];
        
        if (this.options.classes.content) {
            classes.push(this.options.classes.content);
        }
        
        return classes.join(' ');
    }
    
    /**
     * 获取内容模板
     */
    getContentTemplate() {
        switch (this.options.type) {
            case 'dots':
                return this.getDotsTemplate();
            case 'bars':
                return this.getBarsTemplate();
            case 'progress':
                return this.getProgressTemplate();
            case 'skeleton':
                return this.getSkeletonTemplate();
            case 'spinner':
            default:
                return this.getSpinnerTemplate();
        }
    }
    
    /**
     * 获取旋转器模板
     */
    getSpinnerTemplate() {
        return `
            <div class="loading-spinner ${this.options.classes.spinner || ''} ${this.options.size} ${this.options.color}">
                ${this.getSpinnerSVG()}
            </div>
            ${this.getTextTemplate()}
            ${this.options.showProgress ? this.getProgressTemplate() : ''}
        `;
    }
    
    /**
     * 获取旋转器SVG
     */
    getSpinnerSVG() {
        return `
            <svg class="spinner-svg" viewBox="0 0 50 50">
                <circle class="spinner-circle" cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
            </svg>
        `;
    }
    
    /**
     * 获取点状加载器模板
     */
    getDotsTemplate() {
        return `
            <div class="loading-dots ${this.options.classes.spinner || ''} ${this.options.size} ${this.options.color}">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>
            ${this.getTextTemplate()}
            ${this.options.showProgress ? this.getProgressTemplate() : ''}
        `;
    }
    
    /**
     * 获取条形加载器模板
     */
    getBarsTemplate() {
        return `
            <div class="loading-bars ${this.options.classes.spinner || ''} ${this.options.size} ${this.options.color}">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            </div>
            ${this.getTextTemplate()}
            ${this.options.showProgress ? this.getProgressTemplate() : ''}
        `;
    }
    
    /**
     * 获取进度条模板
     */
    getProgressTemplate() {
        const progressValue = this.options.indeterminate ? '' : `${this.state.progress}%`;
        
        return `
            <div class="loading-progress ${this.options.classes.progress || ''}">
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${this.options.indeterminate ? '100%' : `${this.state.progress}%`}">
                        ${this.options.indeterminate ? '<div class="progress-indeterminate"></div>' : ''}
                    </div>
                </div>
                ${!this.options.indeterminate ? `
                    <div class="progress-text">${progressValue}</div>
                ` : ''}
            </div>
            ${this.getTextTemplate()}
        `;
    }
    
    /**
     * 获取骨架屏模板
     */
    getSkeletonTemplate() {
        return `
            <div class="loading-skeleton ${this.options.classes.spinner || ''} ${this.options.size}">
                <div class="skeleton-header"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
            </div>
            ${this.getTextTemplate()}
        `;
    }
    
    /**
     * 获取文本模板
     */
    getTextTemplate() {
        if (!this.options.text && !this.options.subtext) {
            return '';
        }
        
        return `
            <div class="loading-text-container">
                ${this.options.text ? `
                    <div class="loading-text ${this.options.classes.text || ''}">
                        ${this.options.text}
                    </div>
                ` : ''}
                ${this.options.subtext ? `
                    <div class="loading-subtext ${this.options.classes.subtext || ''}">
                        ${this.options.subtext}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 点击遮罩层关闭（如果配置允许）
        if (this.overlay && this.options.overlayClose) {
            this.overlay.addEventListener('click', () => this.hide());
        }
    }
    
    /**
     * 显示加载状态
     */
    async show(text = null, subtext = null) {
        if (this.state.isVisible || this.state.isShowing) {
            return;
        }
        
        this.state.isShowing = true;
        
        // 更新文本（如果提供）
        if (text !== null) {
            this.setText(text);
        }
        if (subtext !== null) {
            this.setSubtext(subtext);
        }
        
        // 触发显示前回调
        if (this.options.onShow) {
            await this.options.onShow(this);
        }
        
        // 显示元素
        this.container.style.display = 'block';
        
        // 强制重绘
        this.container.offsetHeight;
        
        // 添加显示类
        this.container.classList.add('show');
        
        // 设置超时自动隐藏
        if (this.options.timeout > 0) {
            this.state.timeoutId = setTimeout(() => {
                this.hide();
                if (this.options.onTimeout) {
                    this.options.onTimeout(this);
                }
            }, this.options.timeout);
        }
        
        this.state.isVisible = true;
        this.state.isShowing = false;
        
        console.log(`[加载组件] 显示: ${this.options.id}`);
    }
    
    /**
     * 隐藏加载状态
     */
    async hide(immediate = false) {
        if (!this.state.isVisible || this.state.isHiding) {
            return;
        }
        
        this.state.isHiding = true;
        
        // 清除超时定时器
        if (this.state.timeoutId) {
            clearTimeout(this.state.timeoutId);
            this.state.timeoutId = null;
        }
        
        // 触发隐藏前回调
        if (this.options.onHide) {
            await this.options.onHide(this);
        }
        
        if (immediate) {
            // 立即隐藏
            this.container.style.display = 'none';
            this.container.classList.remove('show');
            this.state.isVisible = false;
            this.state.isHiding = false;
        } else {
            // 动画隐藏
            this.container.classList.remove('show');
            
            // 等待动画完成
            setTimeout(() => {
                this.container.style.display = 'none';
                this.state.isVisible = false;
                this.state.isHiding = false;
            }, 300);
        }
        
        console.log(`[加载组件] 隐藏: ${this.options.id}`);
    }
    
    /**
     * 切换显示/隐藏状态
     */
    toggle() {
        if (this.state.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * 设置加载文本
     */
    setText(text) {
        this.options.text = text;
        
        const textElement = this.content.querySelector('.loading-text');
        if (textElement) {
            textElement.textContent = text;
        }
    }
    
    /**
     * 设置加载副文本
     */
    setSubtext(subtext) {
        this.options.subtext = subtext;
        
        const subtextElement = this.content.querySelector('.loading-subtext');
        if (subtextElement) {
            subtextElement.textContent = subtext;
        }
    }
    
    /**
     * 设置进度
     */
    setProgress(progress, text = null) {
        if (progress < 0) progress = 0;
        if (progress > 100) progress = 100;
        
        this.state.progress = progress;
        
        if (this.progressBar) {
            this.progressBar.style.width = `${progress}%`;
        }
        
        if (this.progressText && text !== null) {
            this.progressText.textContent = text;
        } else if (this.progressText) {
            this.progressText.textContent = `${progress}%`;
        }
        
        // 进度完成时自动隐藏
        if (progress >= 100 && this.options.autoHideOnComplete) {
            setTimeout(() => this.hide(), 500);
        }
    }
    
    /**
     * 增加进度
     */
    incrementProgress(amount = 10, text = null) {
        const newProgress = Math.min(this.state.progress + amount, 100);
        this.setProgress(newProgress, text);
    }
    
    /**
     * 设置为不确定进度
     */
    setIndeterminate(indeterminate = true) {
        this.options.indeterminate = indeterminate;
        
        if (this.progressBar) {
            if (indeterminate) {
                this.progressBar.classList.add('indeterminate');
                this.progressBar.style.width = '100%';
                
                if (this.progressText) {
                    this.progressText.textContent = '';
                }
            } else {
                this.progressBar.classList.remove('indeterminate');
                this.progressBar.style.width = `${this.state.progress}%`;
                
                if (this.progressText) {
                    this.progressText.textContent = `${this.state.progress}%`;
                }
            }
        }
    }
    
    /**
     * 显示成功状态
     */
    showSuccess(message = '完成', duration = 2000) {
        this.setText(message);
        this.setProgress(100);
        
        // 更改样式
        this.content.classList.add('success');
        
        // 自动隐藏
        setTimeout(() => {
            this.hide();
            this.content.classList.remove('success');
        }, duration);
    }
    
    /**
     * 显示错误状态
     */
    showError(message = '出错', duration = 3000) {
        this.setText(message);
        
        // 更改样式
        this.content.classList.add('error');
        
        // 自动隐藏
        setTimeout(() => {
            this.hide();
            this.content.classList.remove('error');
        }, duration);
    }
    
    /**
     * 显示警告状态
     */
    showWarning(message = '警告', duration = 2000) {
        this.setText(message);
        
        // 更改样式
        this.content.classList.add('warning');
        
        // 自动隐藏
        setTimeout(() => {
            this.hide();
            this.content.classList.remove('warning');
        }, duration);
    }
    
    /**
     * 显示信息状态
     */
    showInfo(message = '信息', duration = 1500) {
        this.setText(message);
        
        // 更改样式
        this.content.classList.add('info');
        
        // 自动隐藏
        setTimeout(() => {
            this.hide();
            this.content.classList.remove('info');
        }, duration);
    }
    
    /**
     * 包装异步函数
     */
    wrapAsync(fn, options = {}) {
        return async (...args) => {
            const {
                showImmediately = true,
                showDelay = 100,
                text = '处理中...',
                subtext = '',
                successText = '完成',
                errorText = '出错了'
            } = options;
            
            let loadingShown = false;
            let timeoutId = null;
            
            // 延迟显示加载状态
            if (!showImmediately) {
                timeoutId = setTimeout(() => {
                    this.setText(text);
                    this.setSubtext(subtext);
                    this.show();
                    loadingShown = true;
                }, showDelay);
            } else {
                this.setText(text);
                this.setSubtext(subtext);
                this.show();
                loadingShown = true;
            }
            
            try {
                const result = await fn(...args);
                
                // 清除定时器
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                
                // 隐藏加载状态
                if (loadingShown) {
                    this.showSuccess(successText, 500);
                }
                
                return result;
            } catch (error) {
                // 清除定时器
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                
                // 隐藏加载状态
                if (loadingShown) {
                    this.showError(`${errorText}: ${error.message}`, 3000);
                }
                
                throw error;
            }
        };
    }
    
    /**
     * 创建全屏加载实例
     */
    static fullscreen(options = {}) {
        return new Loading({
            fullscreen: true,
            overlay: true,
            type: 'spinner',
            size: 'lg',
            text: '加载中...',
            ...options
        });
    }
    
    /**
     * 创建内联加载实例
     */
    static inline(options = {}) {
        return new Loading({
            fullscreen: false,
            overlay: false,
            type: 'spinner',
            size: 'sm',
            ...options
        });
    }
    
    /**
     * 创建按钮加载实例
     */
    static button(options = {}) {
        return new Loading({
            fullscreen: false,
            overlay: false,
            type: 'spinner',
            size: 'sm',
            text: '',
            ...options
        });
    }
    
    /**
     * 创建进度条实例
     */
    static progress(options = {}) {
        return new Loading({
            type: 'progress',
            showProgress: true,
            indeterminate: false,
            progress: 0,
            text: '处理中...',
            ...options
        });
    }
    
    /**
     * 显示临时加载状态
     */
    static async temporary(options = {}, duration = 2000) {
        const loading = new Loading({
            fullscreen: true,
            overlay: true,
            type: 'spinner',
            text: '处理中...',
            autoShow: true,
            ...options
        });
        
        await loading.show();
        
        return new Promise(resolve => {
            setTimeout(async () => {
                await loading.hide();
                resolve();
            }, duration);
        });
    }
    
    /**
     * 销毁组件
     */
    destroy() {
        // 清除定时器
        if (this.state.timeoutId) {
            clearTimeout(this.state.timeoutId);
        }
        
        // 从DOM移除
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // 清理引用
        this.container = null;
        this.overlay = null;
        this.content = null;
        this.progressBar = null;
        this.progressText = null;
        
        console.log(`[加载组件] 销毁: ${this.options.id}`);
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
}

/**
 * 全局加载管理器
 */
export class LoadingManager {
    constructor() {
        this.loadings = new Map();
        this.defaultOptions = {
            fullscreen: true,
            overlay: true,
            type: 'spinner',
            size: 'lg',
            text: '加载中...',
            zIndex: 9999
        };
    }
    
    /**
     * 显示加载状态
     */
    show(key = 'default', options = {}) {
        const loadingOptions = { ...this.defaultOptions, ...options };
        
        // 如果已存在，先销毁
        if (this.loadings.has(key)) {
            this.hide(key);
        }
        
        const loading = new Loading({
            id: `loading_${key}`,
            ...loadingOptions
        });
        
        this.loadings.set(key, loading);
        loading.show();
        
        return loading;
    }
    
    /**
     * 隐藏加载状态
     */
    hide(key = 'default', immediate = false) {
        if (this.loadings.has(key)) {
            const loading = this.loadings.get(key);
            loading.hide(immediate);
            this.loadings.delete(key);
        }
    }
    
    /**
     * 隐藏所有加载状态
     */
    hideAll(immediate = false) {
        this.loadings.forEach((loading, key) => {
            loading.hide(immediate);
        });
        this.loadings.clear();
    }
    
    /**
     * 获取加载实例
     */
    get(key = 'default') {
        return this.loadings.get(key);
    }
    
    /**
     * 检查是否有加载状态显示
     */
    isLoading(key = null) {
        if (key) {
            const loading = this.loadings.get(key);
            return loading ? loading.getState().isVisible : false;
        }
        
        // 检查任意加载状态
        for (const loading of this.loadings.values()) {
            if (loading.getState().isVisible) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 包装API调用
     */
    wrapApiCall(apiCall, options = {}) {
        const {
            loadingKey = 'api',
            showLoading = true,
            successText = '完成',
            errorText = '请求失败'
        } = options;
        
        return async (...args) => {
            let loading = null;
            
            if (showLoading) {
                loading = this.show(loadingKey, {
                    text: options.text || '请求中...',
                    subtext: options.subtext || ''
                });
            }
            
            try {
                const result = await apiCall(...args);
                
                if (loading) {
                    loading.showSuccess(successText, 500);
                    setTimeout(() => this.hide(loadingKey), 600);
                }
                
                return result;
            } catch (error) {
                if (loading) {
                    loading.showError(`${errorText}: ${error.message}`, 3000);
                    setTimeout(() => this.hide(loadingKey), 3200);
                }
                
                throw error;
            }
        };
    }
}

/**
 * 默认加载管理器实例
 */
export const loadingManager = new LoadingManager();

/**
 * 快捷方法
 */
export const Loader = {
    // 显示加载
    show: (options) => loadingManager.show('default', options),
    
    // 隐藏加载
    hide: () => loadingManager.hide('default'),
    
    // 显示全屏加载
    fullscreen: (text = '加载中...') => loadingManager.show('fullscreen', {
        fullscreen: true,
        overlay: true,
        text
    }),
    
    // 显示进度条
    progress: (progress, text = '') => {
        const loader = loadingManager.get('progress') || loadingManager.show('progress', {
            type: 'progress',
            showProgress: true,
            text: '处理中...'
        });
        
        if (loader) {
            loader.setProgress(progress, text);
        }
        
        return loader;
    },
    
    // 包装异步函数
    wrap: (fn, options = {}) => {
        const loader = new Loading({
            fullscreen: options.fullscreen !== false,
            overlay: options.overlay !== false,
            text: options.text || '处理中...',
            autoShow: false
        });
        
        return loader.wrapAsync(fn, options);
    },
    
    // 临时显示
    temporary: (options, duration) => Loading.temporary(options, duration),
    
    // 管理器
    manager: loadingManager
};
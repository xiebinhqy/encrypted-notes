/**
 * 前端路由管理器
 * 负责页面切换、路由解析、历史管理
 */

import DashboardPage from '../pages/DashboardPage.js';
import LoginPage from '../pages/LoginPage.js';

class Router {
    constructor(app) {
        this.app = app;
        this.routes = new Map();
        this.currentRoute = null;
        this.pageContainer = null;
        
        this.initRoutes();
    }
    
    /**
     * 初始化路由
     */
    initRoutes() {
        // 定义路由映射
        this.routes.set('dashboard', {
            name: 'dashboard',
            path: '/',
            component: DashboardPage,
            requiresAuth: true,
            title: '数据看板'
        });
        
        this.routes.set('system', {
            name: 'system',
            path: '/system',
            component: null, // 需要时动态加载
            requiresAuth: true,
            title: '系统信息'
        });
        
        this.routes.set('analysis', {
            name: 'analysis',
            path: '/analysis',
            component: null,
            requiresAuth: true,
            title: '数据分析'
        });
        
        this.routes.set('events', {
            name: 'events',
            path: '/events',
            component: null,
            requiresAuth: true,
            title: '事件日志'
        });
        
        this.routes.set('login', {
            name: 'login',
            path: '/login',
            component: LoginPage,
            requiresAuth: false,
            title: '登录'
        });
        
        this.routes.set('settings', {
            name: 'settings',
            path: '/settings',
            component: null,
            requiresAuth: true,
            title: '系统设置'
        });
    }
    
    /**
     * 初始化路由系统
     */
    async init() {
        this.pageContainer = document.getElementById('page-container');
        if (!this.pageContainer) {
            throw new Error('找不到页面容器');
        }
        
        // 监听浏览器历史变化
        window.addEventListener('popstate', () => this.handleLocationChange());
        
        // 初始路由处理
        await this.handleLocationChange();
        
        // 设置全局路由拦截
        this.setupGlobalInterceptors();
    }
    
    /**
     * 处理位置变化
     */
    async handleLocationChange() {
        const path = window.location.pathname;
        const routeName = this.getRouteNameFromPath(path);
        
        if (!routeName) {
            // 路由不存在，跳转到404或仪表盘
            if (this.app.state.isAuthenticated) {
                await this.navigate('dashboard');
            } else {
                await this.navigate('login');
            }
            return;
        }
        
        const route = this.routes.get(routeName);
        if (!route) {
            console.warn(`[路由] 未知路由: ${routeName}`);
            return;
        }
        
        // 检查认证要求
        if (route.requiresAuth && !this.app.state.isAuthenticated) {
            console.warn(`[路由] 需要认证才能访问: ${routeName}`);
            await this.navigate('login');
            return;
        }
        
        // 如果已登录但访问登录页面，重定向到仪表盘
        if (routeName === 'login' && this.app.state.isAuthenticated) {
            console.log('[路由] 已登录，重定向到仪表盘');
            await this.navigate('dashboard');
            return;
        }
        
        // 执行路由切换
        await this.switchToRoute(route);
    }
    
    /**
     * 切换到指定路由
     */
    async switchToRoute(route) {
        console.log(`[路由] 切换到: ${route.name}`);
        
        // 更新当前路由
        this.currentRoute = route;
        
        // 更新页面标题
        document.title = `${route.title} - 我的加密笔记`;
        
        // 触发页面切换事件
        this.app.triggerEvent('app:page-change', { route: route.name });
        
        // 显示加载状态
        this.showLoading();
        
        try {
            // 动态加载组件（如果需要）
            if (!route.component && route.name !== 'dashboard' && route.name !== 'login') {
                await this.loadComponent(route);
            }
            
            // 渲染页面
            if (route.component) {
                const page = new route.component(this.app);
                await page.render(this.pageContainer);
                
                // 触发页面显示事件
                page.onShow && page.onShow();
            } else {
                console.error(`[路由] 组件未找到: ${route.name}`);
                this.showError('页面加载失败');
            }
            
        } catch (error) {
            console.error(`[路由] 页面加载失败: ${route.name}`, error);
            this.showError('页面加载失败，请重试');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * 动态加载组件
     */
    async loadComponent(route) {
        let componentModule = null;
        
        switch (route.name) {
            case 'system':
                componentModule = await import('../pages/SystemPage.js');
                route.component = componentModule.default;
                break;
            case 'analysis':
                componentModule = await import('../pages/AnalysisPage.js');
                route.component = componentModule.default;
                break;
            case 'events':
                componentModule = await import('../pages/EventsPage.js');
                route.component = componentModule.default;
                break;
            case 'settings':
                componentModule = await import('../pages/SettingsPage.js');
                route.component = componentModule.default;
                break;
            default:
                console.warn(`[路由] 未找到组件的动态加载逻辑: ${route.name}`);
        }
        
        if (componentModule) {
            console.log(`[路由] 动态加载组件: ${route.name}`);
        }
    }
    
    /**
     * 导航到指定路由
     */
    async navigate(routeName, params = {}, replace = false) {
        const route = this.routes.get(routeName);
        if (!route) {
            console.error(`[路由] 路由不存在: ${routeName}`);
            return;
        }
        
        // 构建URL
        let url = route.path;
        if (params && Object.keys(params).length > 0) {
            const query = new URLSearchParams(params).toString();
            url += `?${query}`;
        }
        
        // 更新浏览器历史
        if (replace) {
            window.history.replaceState({ route: routeName }, '', url);
        } else {
            window.history.pushState({ route: routeName }, '', url);
        }
        
        // 处理路由切换
        await this.switchToRoute(route);
    }
    
    /**
     * 从路径获取路由名称
     */
    getRouteNameFromPath(path) {
        // 移除查询参数
        const cleanPath = path.split('?')[0];
        
        // 特殊处理根路径
        if (cleanPath === '/' || cleanPath === '/index.html' || cleanPath === '') {
            return 'dashboard';
        }
        
        // 处理其他路径
        const pathParts = cleanPath.split('/').filter(p => p);
        
        if (pathParts.length === 0) {
            return 'dashboard';
        }
        
        const routeName = pathParts[0];
        return this.routes.has(routeName) ? routeName : null;
    }
    
    /**
     * 获取当前路由参数
     */
    getCurrentParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const params = {};
        
        for (const [key, value] of urlParams) {
            params[key] = value;
        }
        
        return params;
    }
    
    /**
     * 显示加载状态
     */
    showLoading() {
        if (this.pageContainer) {
            this.pageContainer.classList.add('loading');
        }
    }
    
    /**
     * 隐藏加载状态
     */
    hideLoading() {
        if (this.pageContainer) {
            this.pageContainer.classList.remove('loading');
        }
    }
    
    /**
     * 显示错误
     */
    showError(message) {
        if (this.pageContainer) {
            this.pageContainer.innerHTML = `
                <div class="error-page">
                    <i class="fas fa-exclamation-triangle text-6xl text-red-400 mb-4"></i>
                    <h2 class="text-xl font-bold text-white mb-2">页面加载失败</h2>
                    <p class="text-gray-400 mb-6">${message}</p>
                    <button onclick="window.location.reload()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-redo mr-2"></i>刷新页面
                    </button>
                </div>
            `;
        }
    }
    
    /**
     * 设置全局路由拦截
     */
    setupGlobalInterceptors() {
        // 拦截所有内部链接点击
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a');
            if (!link) return;
            
            const href = link.getAttribute('href');
            
            // 检查是否为内部链接
            if (href && href.startsWith('/') && !href.startsWith('//')) {
                event.preventDefault();
                
                // 获取路由名称
                const routeName = this.getRouteNameFromPath(href);
                if (routeName) {
                    this.navigate(routeName);
                } else {
                    // 非路由链接，正常跳转
                    window.location.href = href;
                }
            }
        });
        
        // 拦截表单提交
        document.addEventListener('submit', (event) => {
            const form = event.target;
            if (form.method === 'get' && form.action) {
                const action = form.getAttribute('action');
                if (action && action.startsWith('/')) {
                    const routeName = this.getRouteNameFromPath(action);
                    if (routeName) {
                        event.preventDefault();
                        
                        // 收集表单数据
                        const formData = new FormData(form);
                        const params = {};
                        formData.forEach((value, key) => {
                            params[key] = value;
                        });
                        
                        this.navigate(routeName, params);
                    }
                }
            }
        });
    }
    
    /**
     * 获取当前路由
     */
    getCurrentRoute() {
        return this.currentRoute;
    }
    
    /**
     * 检查是否有权限访问路由
     */
    canAccess(routeName) {
        const route = this.routes.get(routeName);
        if (!route) return false;
        
        if (route.requiresAuth && !this.app.state.isAuthenticated) {
            return false;
        }
        
        return true;
    }
}

export default Router;
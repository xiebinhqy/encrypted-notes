/**
 * 登录页面组件
 * 处理用户登录、注册、密码恢复等功能
 */

import Config from '../config.js';
import Utils from '../core/utils.js';
import Api from '../api/index.js';

class LoginPage {
    constructor(app) {
        this.app = app || null;
        this.container = null;
        this.masterKeyInput = null;
        this.togglePasswordBtn = null;
        this.strengthBar = null;
        this.strengthText = null;
        this.startBtn = null;
        this.recoveryBtn = null;
        
        this.state = {
            masterKey: '',
            passwordVisible: false,
            strength: {
                score: 0,
                level: 'weak',
                width: '0%',
                color: 'bg-red-500'
            },
            isLoading: false,
            isNewUser: false
        };
    }
    
    /**
     * 渲染页面
     */
    async render(container) {
        this.container = container;
        
        // 渲染页面结构
        container.innerHTML = this.getTemplate();
        
        // 获取DOM元素
        this.cacheElements();
        
        // 初始化页面
        await this.init();
        
        // 绑定事件
        this.bindEvents();
    }
    
    /**
     * 获取页面模板
     */
    getTemplate() {
        return `
            <div class="login-page min-h-screen flex items-center justify-center p-4">
                <div class="login-container w-full max-w-4xl">
                    <!-- 登录状态提示 -->
                    <div class="login-tip glass-effect rounded-lg p-4 mb-6 border border-indigo-500/30 hidden">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <i class="fa-solid fa-circle-info text-indigo-400"></i>
                                <div>
                                    <p class="text-white text-sm">检测到您已登录，点击 <a href="/" class="text-indigo-400 hover:text-indigo-300 font-medium">这里</a> 进入控制面板</p>
                                </div>
                            </div>
                            <button class="close-tip text-gray-400 hover:text-white">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="flex flex-col lg:flex-row items-center justify-between gap-8">
                        <!-- 左侧登录区域 -->
                        <div class="lg:w-1/2 w-full">
                            <div class="login-card glass-effect rounded-2xl p-6 md:p-8 shadow-xl">
                                <div class="flex items-center justify-center mb-6">
                                    <div class="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 login-logo">
                                        <i class="fa-solid fa-shield-alt text-white text-3xl"></i>
                                    </div>
                                </div>
                                
                                <h2 class="text-2xl font-bold text-white text-center mb-2">端对端加密私人笔记</h2>
                                <p class="text-gray-300 text-center mb-8">所有数据在浏览器加密后上传，仅你可解密</p>
                                
                                <!-- 主密钥输入区域 -->
                                <div class="mb-6">
                                    <label class="block text-gray-300 text-sm font-medium mb-2">输入主密钥（新密钥自动创建账号）</label>
                                    <div class="relative">
                                        <input 
                                            type="password" 
                                            id="master-key-input"
                                            class="w-full bg-dark border border-dark-lighter rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pl-12 transition-all"
                                            placeholder="请输入您的主密钥（至少8位）"
                                            autocomplete="current-password"
                                        >
                                        <div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                            <i class="fa-solid fa-key"></i>
                                        </div>
                                        <button 
                                            type="button"
                                            id="toggle-password"
                                            class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                            title="显示/隐藏密码"
                                        >
                                            <i class="fa-solid fa-eye"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- 密钥强度指示器 -->
                                <div class="mb-6">
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="text-gray-300 text-sm">密钥强度</span>
                                        <span class="text-gray-400 text-sm" id="strength-text">弱</span>
                                    </div>
                                    <div class="h-2 bg-dark-lighter rounded-full overflow-hidden">
                                        <div id="strength-bar" class="h-full bg-red-500 w-1/4 rounded-full transition-all duration-300"></div>
                                    </div>
                                </div>
                                
                                <!-- 开始使用按钮 -->
                                <button 
                                    id="start-btn"
                                    class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg transition-colors font-medium text-lg shadow-md shadow-indigo-500/20 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled
                                >
                                    <i class="fa-solid fa-rocket"></i>
                                    <span id="btn-text">开始使用</span>
                                    <span id="btn-loading" class="hidden">
                                        <i class="fa-solid fa-spinner fa-spin"></i>
                                        <span>验证中...</span>
                                    </span>
                                </button>
                                
                                <!-- 恢复码链接 -->
                                <div class="mt-6 text-center">
                                    <button id="recovery-btn" class="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors inline-flex items-center space-x-1">
                                        <i class="fa-solid fa-key"></i>
                                        <span>忘记主密钥？使用恢复码重置</span>
                                    </button>
                                </div>
                                
                                <!-- 安全提示 -->
                                <div class="mt-8 p-4 bg-dark/50 rounded-lg border border-dark-lighter">
                                    <div class="flex items-start space-x-3">
                                        <i class="fa-solid fa-circle-info text-indigo-400 mt-0.5"></i>
                                        <div>
                                            <p class="text-gray-300 text-sm">重要提示：主密钥用于加密您的所有笔记，我们不会存储您的主密钥，一旦丢失将无法恢复您的数据（除非使用恢复码）。</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 网络状态提示 -->
                                <div class="network-status mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hidden">
                                    <div class="flex items-center text-yellow-400">
                                        <i class="fa-solid fa-wifi-slash mr-2"></i>
                                        <span class="text-sm">当前处于离线状态，无法登录</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 右侧功能介绍区域 -->
                        <div class="lg:w-1/2 w-full">
                            <h2 class="text-2xl font-bold text-white mb-8 text-center lg:text-left">为什么选择我们的加密笔记？</h2>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <!-- 功能卡片 1 -->
                                <div class="feature-card glass-effect rounded-xl p-6 card-transition border border-dark-lighter">
                                    <div class="flex items-start space-x-4">
                                        <div class="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                            <i class="fa-solid fa-user-shield text-xl"></i>
                                        </div>
                                        <div>
                                            <h3 class="text-lg font-semibold text-white mb-2">军工级端对端加密</h3>
                                            <p class="text-gray-300 text-sm">AES-GCM加密，内容仅在浏览器加密/解密，任何人无法读取</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 功能卡片 2 -->
                                <div class="feature-card glass-effect rounded-xl p-6 card-transition border border-dark-lighter">
                                    <div class="flex items-start space-x-4">
                                        <div class="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                                            <i class="fa-solid fa-key text-xl"></i>
                                        </div>
                                        <div>
                                            <h3 class="text-lg font-semibold text-white mb-2">一次性恢复码</h3>
                                            <p class="text-gray-300 text-sm">主密钥丢失可通过一次性恢复码重置，每个恢复码仅能使用一次</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 功能卡片 3 -->
                                <div class="feature-card glass-effect rounded-xl p-6 card-transition border border-dark-lighter">
                                    <div class="flex items-start space-x-4">
                                        <div class="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                            <i class="fa-solid fa-book-open text-xl"></i>
                                        </div>
                                        <div>
                                            <h3 class="text-lg font-semibold text-white mb-2">完整知识库系统</h3>
                                            <p class="text-gray-300 text-sm">自动按分类归纳笔记，飞书同款知识库体验</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 功能卡片 4 -->
                                <div class="feature-card glass-effect rounded-xl p-6 card-transition border border-dark-lighter">
                                    <div class="flex items-start space-x-4">
                                        <div class="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                                            <i class="fa-solid fa-boxes-stacked text-xl"></i>
                                        </div>
                                        <div>
                                            <h3 class="text-lg font-semibold text-white mb-2">多空间完全隔离</h3>
                                            <p class="text-gray-300 text-sm">不同主密钥对应完全独立的加密空间，互不干扰</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 额外功能展示 -->
                            <div class="mt-8 glass-effect rounded-xl p-6 border border-dark-lighter">
                                <h3 class="text-lg font-semibold text-white mb-4">更多强大功能</h3>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="flex items-center space-x-2">
                                        <i class="fa-solid fa-check text-emerald-400"></i>
                                        <span class="text-gray-300 text-sm">实时同步</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <i class="fa-solid fa-check text-emerald-400"></i>
                                        <span class="text-gray-300 text-sm">多设备支持</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <i class="fa-solid fa-check text-emerald-400"></i>
                                        <span class="text-gray-300 text-sm">Markdown支持</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <i class="fa-solid fa-check text-emerald-400"></i>
                                        <span class="text-gray-300 text-sm">离线访问</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <i class="fa-solid fa-check text-emerald-400"></i>
                                        <span class="text-gray-300 text-sm">数据导出</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <i class="fa-solid fa-check text-emerald-400"></i>
                                        <span class="text-gray-300 text-sm">标签管理</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <i class="fa-solid fa-check text-emerald-400"></i>
                                        <span class="text-gray-300 text-sm">全文搜索</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <i class="fa-solid fa-check text-emerald-400"></i>
                                        <span class="text-gray-300 text-sm">版本历史</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 统计数据 -->
                            <div class="mt-8 grid grid-cols-3 gap-4 text-center">
                                <div class="stats-card glass-effect rounded-lg p-4 border border-dark-lighter">
                                    <div class="text-2xl font-bold text-white">10K+</div>
                                    <div class="text-gray-300 text-sm">活跃用户</div>
                                </div>
                                <div class="stats-card glass-effect rounded-lg p-4 border border-dark-lighter">
                                    <div class="text-2xl font-bold text-white">99.9%</div>
                                    <div class="text-gray-300 text-sm">服务可用性</div>
                                </div>
                                <div class="stats-card glass-effect rounded-lg p-4 border border-dark-lighter">
                                    <div class="text-2xl font-bold text-white">0</div>
                                    <div class="text-gray-300 text-sm">数据泄露</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 底部安全认证 -->
                    <div class="mt-12 text-center">
                        <div class="security-info glass-effect rounded-xl p-6 max-w-3xl mx-auto">
                            <h3 class="text-lg font-semibold text-white mb-4">安全认证与合规</h3>
                            <div class="flex flex-wrap items-center justify-center gap-6">
                                <div class="flex items-center space-x-2 text-gray-300">
                                    <i class="fa-solid fa-lock text-emerald-400"></i>
                                    <span>SSL/TLS 加密传输</span>
                                </div>
                                <div class="flex items-center space-x-2 text-gray-300">
                                    <i class="fa-solid fa-shield-halved text-indigo-400"></i>
                                    <span>GDPR 合规</span>
                                </div>
                                <div class="flex items-center space-x-2 text-gray-300">
                                    <i class="fa-solid fa-user-secret text-purple-400"></i>
                                    <span>零知识架构</span>
                                </div>
                                <div class="flex items-center space-x-2 text-gray-300">
                                    <i class="fa-solid fa-database text-cyan-400"></i>
                                    <span>端到端加密</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 恢复码弹窗 -->
            <div id="recovery-modal" class="modal-overlay fixed inset-0 bg-dark/80 backdrop-blur-sm z-50 hidden items-center justify-center p-4">
                <div class="modal-content glass-effect rounded-2xl p-6 w-full max-w-md">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold text-white">使用恢复码重置密钥</h3>
                        <button class="modal-close text-gray-400 hover:text-white">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-300 text-sm font-medium mb-2">输入恢复码</label>
                        <input type="text" id="recovery-code" class="w-full bg-dark border border-dark-lighter rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="请输入16位恢复码">
                    </div>
                    <div class="mb-6">
                        <label class="block text-gray-300 text-sm font-medium mb-2">设置新主密钥</label>
                        <input type="password" id="new-master-key" class="w-full bg-dark border border-dark-lighter rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="请设置新的主密钥（至少8位）">
                    </div>
                    <div class="flex space-x-3">
                        <button class="modal-cancel flex-1 bg-dark-light hover:bg-dark-lighter text-white py-2 rounded-lg transition-colors">
                            取消
                        </button>
                        <button id="recovery-submit" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition-colors">
                            重置密钥
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.masterKeyInput = this.container.querySelector('#master-key-input');
        this.togglePasswordBtn = this.container.querySelector('#toggle-password');
        this.strengthBar = this.container.querySelector('#strength-bar');
        this.strengthText = this.container.querySelector('#strength-text');
        this.startBtn = this.container.querySelector('#start-btn');
        this.recoveryBtn = this.container.querySelector('#recovery-btn');
        
        this.btnText = this.container.querySelector('#btn-text');
        this.btnLoading = this.container.querySelector('#btn-loading');
        this.loginTip = this.container.querySelector('.login-tip');
        this.closeTip = this.container.querySelector('.close-tip');
        this.networkStatus = this.container.querySelector('.network-status');
    }
    
    /**
     * 初始化页面
     */
    async init() {
        try {
            // 检查登录状态
            await this.checkLoginStatus();
            
            // 检查网络状态
            this.checkNetworkStatus();
            
            // 设置网络监听
            this.setupNetworkListeners();
            
            // 初始化卡片动画
            this.initCardAnimations();
            
            // 检查URL参数
            this.checkUrlParams();
            
        } catch (error) {
            console.error('[登录页面] 初始化失败:', error);
        }
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 主密钥输入事件
        this.masterKeyInput.addEventListener('input', (e) => this.handleMasterKeyInput(e));
        
        // 切换密码可见性
        this.togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility());
        
        // 开始使用按钮
        this.startBtn.addEventListener('click', () => this.handleStart());
        
        // 恢复码按钮
        this.recoveryBtn.addEventListener('click', () => this.showRecoveryModal());
        
        // 回车键提交
        this.masterKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.state.masterKey.length >= 8) {
                this.handleStart();
            }
        });
        
        // 关闭提示
        if (this.closeTip) {
            this.closeTip.addEventListener('click', () => this.hideLoginTip());
        }
        
        // 恢复码弹窗事件
        this.setupRecoveryModalEvents();
        
        // 键盘快捷键
        this.setupKeyboardShortcuts();
    }
    
    /**
     * 检查登录状态
     */
    async checkLoginStatus() {
        if (Api.auth.isLoggedIn()) {
            this.showLoginTip();
        }
    }
    
    /**
     * 检查网络状态
     */
    checkNetworkStatus() {
        if (!Config.isOnline()) {
            this.showNetworkStatus();
        }
    }
    
    /**
     * 设置网络监听
     */
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.hideNetworkStatus();
            this.enableForm();
        });
        
        window.addEventListener('offline', () => {
            this.showNetworkStatus();
            this.disableForm();
        });
    }
    
    /**
     * 初始化卡片动画
     */
    initCardAnimations() {
        const featureCards = this.container.querySelectorAll('.feature-card');
        const statsCards = this.container.querySelectorAll('.stats-card');
        
        const animateCards = (cards, delay = 100) => {
            cards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, delay + (index * 100));
            });
        };
        
        // 动画执行
        setTimeout(() => animateCards(featureCards), 300);
        setTimeout(() => animateCards(statsCards, 50), 800);
        
        // 登录图标浮动动画
        const logo = this.container.querySelector('.login-logo');
        if (logo) {
            logo.classList.add('float-animation');
        }
    }
    
    /**
     * 检查URL参数
     */
    checkUrlParams() {
        const params = Utils.parseQueryParams();
        
        if (params.recovery === 'true') {
            setTimeout(() => this.showRecoveryModal(), 1000);
        }
        
        if (params.logout === 'true') {
            this.showNotification('您已成功退出登录', 'success');
        }
        
        if (params.expired === 'true') {
            this.showNotification('登录已过期，请重新登录', 'warning');
        }
    }
    
    /**
     * 处理主密钥输入
     */
    handleMasterKeyInput(event) {
        const value = event.target.value;
        this.state.masterKey = value;
        
        // 更新强度指示器
        this.updateStrengthIndicator(value);
        
        // 更新按钮状态
        this.updateButtonState(value);
    }
    
    /**
     * 更新强度指示器
     */
    updateStrengthIndicator(password) {
        const validation = Utils.validatePassword(password);
        
        let width = '0%';
        let color = 'bg-red-500';
        let text = '弱';
        
        switch (validation.strength) {
            case 'weak':
                width = '25%';
                color = 'bg-red-500';
                text = '弱';
                break;
            case 'medium':
                width = '50%';
                color = 'bg-yellow-500';
                text = '中';
                break;
            case 'strong':
                width = '100%';
                color = 'bg-emerald-500';
                text = '强';
                break;
        }
        
        // 更新UI
        this.strengthBar.className = `h-full ${color} rounded-full transition-all duration-300`;
        this.strengthBar.style.width = width;
        this.strengthText.textContent = text;
        
        // 更新状态
        this.state.strength = {
            score: validation.score,
            level: validation.strength,
            width,
            color
        };
    }
    
    /**
     * 更新按钮状态
     */
    updateButtonState(password) {
        const isValid = password.length >= 8;
        
        this.startBtn.disabled = !isValid;
        
        if (isValid) {
            this.startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            this.startBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
    
    /**
     * 切换密码可见性
     */
    togglePasswordVisibility() {
        this.state.passwordVisible = !this.state.passwordVisible;
        
        const type = this.state.passwordVisible ? 'text' : 'password';
        this.masterKeyInput.setAttribute('type', type);
        
        const icon = this.togglePasswordBtn.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
        
        // 更新title
        this.togglePasswordBtn.title = this.state.passwordVisible ? '隐藏密码' : '显示密码';
    }
    
    /**
     * 处理开始使用
     */
    async handleStart() {
        const masterKey = this.state.masterKey.trim();
        
        // 基础验证
        if (!masterKey) {
            this.showNotification('请输入主密钥', 'error');
            return;
        }
        
        if (masterKey.length < 8) {
            this.showNotification('主密钥长度至少8个字符', 'error');
            return;
        }
        
        // 检查网络
        if (!Config.isOnline()) {
            this.showNotification('网络不可用，请检查连接', 'error');
            return;
        }
        
        // 设置加载状态
        this.setLoading(true);
        
        try {
            // 模拟API请求延迟
            await Utils.delay(1000);
            
            // 模拟用户检测
            const existingUsers = ['test123', 'demo456', 'admin789'];
            const isNewUser = !existingUsers.some(user => 
                masterKey.toLowerCase().includes(user.toLowerCase())
            );
            
            this.state.isNewUser = isNewUser;
            
            if (isNewUser) {
                // 新用户注册
                await this.handleNewUser(masterKey);
            } else {
                // 现有用户登录
                await this.handleExistingUser(masterKey);
            }
            
        } catch (error) {
            console.error('[登录] 处理失败:', error);
            this.showNotification('登录失败，请重试', 'error');
            this.setLoading(false);
        }
    }
    
    /**
     * 处理新用户
     */
    async handleNewUser(masterKey) {
        try {
            // 显示创建提示
            this.showNotification('正在创建新账户...', 'info');
            
            // 模拟API调用
            await Utils.delay(1500);
            
            // 生成用户数据
            const userData = {
                id: Utils.generateId('user_'),
                username: `user_${Utils.randomString(6)}`,
                email: null,
                createdAt: new Date().toISOString(),
                isNewUser: true
            };
            
            // 保存认证数据
            const token = btoa(`${userData.id}:${masterKey}`);
            Api.auth.saveAuthData(token, userData, true);
            
            // 显示成功消息
            this.showNotification('账户创建成功！正在为您加密数据...', 'success');
            
            // 保存初始设置
            this.saveInitialSettings();
            
            // 延迟跳转
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            
        } catch (error) {
            console.error('[注册] 创建失败:', error);
            throw error;
        }
    }
    
    /**
     * 处理现有用户
     */
    async handleExistingUser(masterKey) {
        try {
            // 显示验证提示
            this.showNotification('正在验证主密钥...', 'info');
            
            // 模拟API调用
            await Utils.delay(1200);
            
            // 模拟用户数据
            const userData = {
                id: 'user_existing_001',
                username: '现有用户',
                email: 'user@example.com',
                createdAt: '2024-01-01T00:00:00Z',
                isNewUser: false
            };
            
            // 保存认证数据
            const token = btoa(`${userData.id}:${masterKey}`);
            Api.auth.saveAuthData(token, userData, true);
            
            // 显示成功消息
            this.showNotification('验证成功！正在为您解密数据...', 'success');
            
            // 延迟跳转
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            
        } catch (error) {
            console.error('[登录] 验证失败:', error);
            throw error;
        }
    }
    
    /**
     * 保存初始设置
     */
    saveInitialSettings() {
        const initialSettings = {
            theme: 'dark',
            language: 'zh-CN',
            autoSave: true,
            syncInterval: 300,
            editor: {
                fontSize: 14,
                lineHeight: 1.6,
                fontFamily: 'Inter'
            }
        };
        
        Utils.storage.set(Config.STORAGE.KEYS.SETTINGS, initialSettings);
    }
    
    /**
     * 显示恢复码弹窗
     */
    showRecoveryModal() {
        const modal = this.container.querySelector('#recovery-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            
            // 聚焦到恢复码输入框
            setTimeout(() => {
                const recoveryCodeInput = modal.querySelector('#recovery-code');
                if (recoveryCodeInput) {
                    recoveryCodeInput.focus();
                }
            }, 100);
        }
    }
    
    /**
     * 隐藏恢复码弹窗
     */
    hideRecoveryModal() {
        const modal = this.container.querySelector('#recovery-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            
            // 清空表单
            const recoveryCodeInput = modal.querySelector('#recovery-code');
            const newMasterKeyInput = modal.querySelector('#new-master-key');
            
            if (recoveryCodeInput) recoveryCodeInput.value = '';
            if (newMasterKeyInput) newMasterKeyInput.value = '';
        }
    }
    
    /**
     * 设置恢复码弹窗事件
     */
    setupRecoveryModalEvents() {
        const modal = this.container.querySelector('#recovery-modal');
        if (!modal) return;
        
        // 关闭按钮
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideRecoveryModal());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideRecoveryModal());
        }
        
        // 点击外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideRecoveryModal();
            }
        });
        
        // 提交按钮
        const submitBtn = modal.querySelector('#recovery-submit');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.handleRecoverySubmit());
        }
        
        // 回车键提交
        const recoveryCodeInput = modal.querySelector('#recovery-code');
        const newMasterKeyInput = modal.querySelector('#new-master-key');
        
        if (recoveryCodeInput && newMasterKeyInput) {
            const handleEnter = (e) => {
                if (e.key === 'Enter') {
                    this.handleRecoverySubmit();
                }
            };
            
            recoveryCodeInput.addEventListener('keypress', handleEnter);
            newMasterKeyInput.addEventListener('keypress', handleEnter);
        }
    }
    
    /**
     * 处理恢复码提交
     */
    async handleRecoverySubmit() {
        const recoveryCodeInput = this.container.querySelector('#recovery-code');
        const newMasterKeyInput = this.container.querySelector('#new-master-key');
        
        if (!recoveryCodeInput || !newMasterKeyInput) return;
        
        const recoveryCode = recoveryCodeInput.value.trim();
        const newMasterKey = newMasterKeyInput.value.trim();
        
        // 验证输入
        if (!recoveryCode) {
            this.showNotification('请输入恢复码', 'error');
            recoveryCodeInput.focus();
            return;
        }
        
        if (recoveryCode.length !== 16) {
            this.showNotification('恢复码必须是16位字符', 'error');
            recoveryCodeInput.focus();
            return;
        }
        
        if (!newMasterKey) {
            this.showNotification('请输入新主密钥', 'error');
            newMasterKeyInput.focus();
            return;
        }
        
        if (newMasterKey.length < 8) {
            this.showNotification('新主密钥长度至少8个字符', 'error');
            newMasterKeyInput.focus();
            return;
        }
        
        // 设置加载状态
        const submitBtn = this.container.querySelector('#recovery-submit');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>处理中...';
        submitBtn.disabled = true;
        
        try {
            // 模拟API调用
            await Utils.delay(2000);
            
            // 模拟成功
            this.showNotification('主密钥已重置，请使用新密钥登录', 'success');
            
            // 关闭弹窗
            this.hideRecoveryModal();
            
            // 清空主密钥输入框
            this.masterKeyInput.value = '';
            this.masterKeyInput.focus();
            
        } catch (error) {
            console.error('[恢复] 重置失败:', error);
            this.showNotification('重置失败，请检查恢复码', 'error');
        } finally {
            // 恢复按钮状态
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    /**
     * 设置键盘快捷键
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+/ 显示帮助
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.showKeyboardHelp();
            }
            
            // ESC 键
            if (e.key === 'Escape') {
                const modal = this.container.querySelector('#recovery-modal');
                if (modal && !modal.classList.contains('hidden')) {
                    this.hideRecoveryModal();
                } else if (this.masterKeyInput) {
                    this.masterKeyInput.value = '';
                    this.handleMasterKeyInput({ target: this.masterKeyInput });
                }
            }
            
            // F1 显示功能
            if (e.key === 'F1') {
                e.preventDefault();
                this.showFeatureHighlights();
            }
        });
    }
    
    /**
     * 显示键盘帮助
     */
    showKeyboardHelp() {
        const helpText = `
            <div class="text-left">
                <h4 class="font-semibold text-white mb-2">键盘快捷键</h4>
                <ul class="text-sm text-gray-300 space-y-1">
                    <li>• <kbd class="px-1 py-0.5 bg-dark-lighter rounded text-xs">Enter</kbd> 提交主密钥</li>
                    <li>• <kbd class="px-1 py-0.5 bg-dark-lighter rounded text-xs">Esc</kbd> 清空输入/关闭弹窗</li>
                    <li>• <kbd class="px-1 py-0.5 bg-dark-lighter rounded text-xs">Ctrl</kbd> + <kbd class="px-1 py-0.5 bg-dark-lighter rounded text-xs">/</kbd> 显示帮助</li>
                    <li>• <kbd class="px-1 py-0.5 bg-dark-lighter rounded text-xs">F1</kbd> 功能亮点</li>
                </ul>
            </div>
        `;
        
        this.showNotification(helpText, 'info', 5000);
    }
    
    /**
     * 显示功能亮点
     */
    showFeatureHighlights() {
        const features = [
            '🔐 端到端加密：您的数据只有您能访问',
            '📱 多设备同步：随时随地访问笔记',
            '💾 离线编辑：网络中断不影响创作',
            '🔄 自动同步：网络恢复后自动保存',
            '🔍 全文搜索：快速找到所需内容',
            '🏷️ 标签分类：灵活管理笔记',
            '📊 数据统计：可视化您的创作习惯',
            '🛡️ 零知识架构：我们无法访问您的数据'
        ];
        
        const featuresText = `
            <div class="text-left">
                <h4 class="font-semibold text-white mb-2">加密笔记核心功能</h4>
                <ul class="text-sm text-gray-300 space-y-1">
                    ${features.map(f => `<li>• ${f}</li>`).join('')}
                </ul>
            </div>
        `;
        
        this.showNotification(featuresText, 'info', 6000);
    }
    
    /**
     * 设置加载状态
     */
    setLoading(isLoading) {
        this.state.isLoading = isLoading;
        
        if (isLoading) {
            this.btnText.classList.add('hidden');
            this.btnLoading.classList.remove('hidden');
            this.startBtn.disabled = true;
        } else {
            this.btnText.classList.remove('hidden');
            this.btnLoading.classList.add('hidden');
            this.updateButtonState(this.state.masterKey);
        }
    }
    
    /**
     * 显示登录提示
     */
    showLoginTip() {
        if (this.loginTip) {
            this.loginTip.classList.remove('hidden');
        }
    }
    
    /**
     * 隐藏登录提示
     */
    hideLoginTip() {
        if (this.loginTip) {
            this.loginTip.classList.add('hidden');
        }
    }
    
    /**
     * 显示网络状态
     */
    showNetworkStatus() {
        if (this.networkStatus) {
            this.networkStatus.classList.remove('hidden');
        }
        this.disableForm();
    }
    
    /**
     * 隐藏网络状态
     */
    hideNetworkStatus() {
        if (this.networkStatus) {
            this.networkStatus.classList.add('hidden');
        }
        this.enableForm();
    }
    
    /**
     * 禁用表单
     */
    disableForm() {
        this.masterKeyInput.disabled = true;
        this.startBtn.disabled = true;
        this.recoveryBtn.disabled = true;
        
        this.masterKeyInput.classList.add('opacity-50', 'cursor-not-allowed');
        this.startBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    
    /**
     * 启用表单
     */
    enableForm() {
        this.masterKeyInput.disabled = false;
        this.recoveryBtn.disabled = false;
        this.updateButtonState(this.state.masterKey);
        
        this.masterKeyInput.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    
    /**
     * 显示通知
     */
    showNotification(message, type = 'info', duration = 3000) {
        // 创建通知容器
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(container);
        }
        
        // 图标映射
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        // 颜色映射
        const colors = {
            success: 'border-emerald-500/30 bg-emerald-500/10',
            error: 'border-red-500/30 bg-red-500/10',
            warning: 'border-yellow-500/30 bg-yellow-500/10',
            info: 'border-indigo-500/30 bg-indigo-500/10'
        };
        
        const icon = icons[type] || icons.info;
        const color = colors[type] || colors.info;
        
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${color} border rounded-lg p-4 max-w-sm transform transition-all duration-300 translate-x-full`;
        notification.innerHTML = `
            <div class="flex items-start space-x-3">
                <i class="fa-solid ${icon} ${type === 'success' ? 'text-emerald-400' : type === 'error' ? 'text-red-400' : type === 'warning' ? 'text-yellow-400' : 'text-indigo-400'} text-lg mt-0.5"></i>
                <div class="flex-1">
                    <div class="text-white text-sm">${message}</div>
                </div>
                <button class="notification-close text-gray-400 hover:text-white">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
        `;
        
        container.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 10);
        
        // 关闭按钮
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 300);
        });
        
        // 自动关闭
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.classList.add('translate-x-full');
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);
        }
    }
    
    /**
     * 页面显示时的回调
     */
    onShow() {
        console.log('[登录页面] 页面显示');
        
        // 聚焦到主密钥输入框
        if (this.masterKeyInput) {
            setTimeout(() => {
                this.masterKeyInput.focus();
            }, 100);
        }
        
        // 重新检查网络状态
        this.checkNetworkStatus();
    }
    
    /**
     * 页面隐藏时的回调
     */
    onHide() {
        console.log('[登录页面] 页面隐藏');
    }
}

export default LoginPage;
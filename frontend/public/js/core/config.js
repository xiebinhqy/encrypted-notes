/**
 * 应用配置
 * 作用：管理应用的所有配置项
 * 注意：这是一个模拟版本，实际项目中需要根据环境配置
 */

const Config = {
    // 应用信息
    APP_NAME: '我的加密笔记',
    APP_VERSION: '1.0.0',
    APP_DESCRIPTION: '安全的私人加密笔记应用',
    
    // API配置
    API_BASE_URL: '/api',
    API_TIMEOUT: 30000,
    
    // 主题配置
    THEMES: {
        DARK: 'dark',
        LIGHT: 'light',
        AUTO: 'auto'
    },
    
    // 默认设置
    DEFAULT_SETTINGS: {
        theme: 'dark',
        language: 'zh-CN',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: 'relative',
        itemsPerPage: 20,
        autoSaveNotes: true,
        autoSaveInterval: 5000,
        editorMode: 'split',
        fontSize: 14,
        autoSync: true,
        syncInterval: 300,
        encryptByDefault: true
    },
    
    // 编辑器配置
    EDITOR: {
        MODES: ['edit', 'split', 'preview'],
        FONT_SIZES: [12, 13, 14, 15, 16, 18, 20, 24],
        TAB_SIZES: [2, 4, 8]
    },
    
    // 笔记配置
    NOTES: {
        MAX_TITLE_LENGTH: 200,
        MAX_CONTENT_LENGTH: 100000,
        MAX_TAGS_PER_NOTE: 10,
        AUTO_SAVE_DELAY: 2000
    },
    
    // 分类配置
    CATEGORIES: {
        MAX_DEPTH: 5,
        MAX_NAME_LENGTH: 50,
        DEFAULT_COLOR: '#6366f1',
        DEFAULT_ICON: 'fas fa-folder'
    },
    
    // 同步配置
    SYNC: {
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000,
        BATCH_SIZE: 10
    },
    
    // 存储配置
    STORAGE: {
        MAX_SIZE: 50 * 1024 * 1024, // 50MB
        BACKUP_COUNT: 10
    },
    
    // 安全配置
    SECURITY: {
        PASSWORD_MIN_LENGTH: 8,
        SESSION_TIMEOUT: 30 * 60 * 1000, // 30分钟
        ENCRYPTION_ALGORITHM: 'AES-GCM'
    },
    
    // 功能开关
    FEATURE_FLAGS: {
        ENABLE_OFFLINE: true,
        ENABLE_SYNC: true,
        ENABLE_BACKUP: true,
        ENABLE_SHARING: false,
        ENABLE_COLLABORATION: false
    },
    
    /**
     * 检查网络状态
     * @returns {boolean} 是否在线
     */
    isOnline: () => {
        return navigator.onLine;
    },
    
    /**
     * 获取当前主题
     * @returns {string} 当前主题
     */
    getCurrentTheme: () => {
        return localStorage.getItem('theme') || Config.DEFAULT_SETTINGS.theme;
    },
    
    /**
     * 设置主题
     * @param {string} theme - 主题名称
     */
    setTheme: (theme) => {
        localStorage.setItem('theme', theme);
        document.documentElement.className = theme;
        
        // 触发主题变化事件
        document.dispatchEvent(new CustomEvent('theme:changed', {
            detail: { theme }
        }));
    },
    
    /**
     * 初始化主题
     */
    initTheme: () => {
        const savedTheme = Config.getCurrentTheme();
        
        if (savedTheme === 'auto') {
            // 自动模式：跟随系统
            const prefersDark = window.matchMedia && 
                window.matchMedia('(prefers-color-scheme: dark)').matches;
            Config.setTheme(prefersDark ? 'dark' : 'light');
            
            // 监听系统主题变化
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                Config.setTheme(e.matches ? 'dark' : 'light');
            });
        } else {
            Config.setTheme(savedTheme);
        }
    },
    
    /**
     * 获取语言设置
     * @returns {string} 当前语言
     */
    getLanguage: () => {
        return localStorage.getItem('language') || Config.DEFAULT_SETTINGS.language;
    },
    
    /**
     * 设置语言
     * @param {string} language - 语言代码
     */
    setLanguage: (language) => {
        localStorage.setItem('language', language);
        // 这里可以触发语言变化事件
    },
    
    /**
     * 获取API URL
     * @param {string} endpoint - API端点
     * @returns {string} 完整的API URL
     */
    getApiUrl: (endpoint) => {
        return `${Config.API_BASE_URL}${endpoint}`;
    },
    
    /**
     * 获取默认头像URL
     * @param {string} name - 用户名
     * @returns {string} 头像URL
     */
    getDefaultAvatar: (name) => {
        // 使用占位符服务生成头像
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=6366f1&color=fff&size=128`;
    },
    
    /**
     * 获取支持的图片格式
     * @returns {string[]} 支持的图片格式
     */
    getSupportedImageFormats: () => {
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    },
    
    /**
     * 获取最大文件大小
     * @returns {number} 最大文件大小（字节）
     */
    getMaxFileSize: () => {
        return Config.STORAGE.MAX_SIZE;
    },
    
    /**
     * 检查功能是否启用
     * @param {string} feature - 功能名称
     * @returns {boolean} 是否启用
     */
    isFeatureEnabled: (feature) => {
        return Config.FEATURE_FLAGS[feature] || false;
    },
    
    /**
     * 获取构建信息
     * @returns {Object} 构建信息
     */
    getBuildInfo: () => {
        return {
            version: Config.APP_VERSION,
            buildTime: process.env.BUILD_TIME || '开发版本',
            environment: process.env.NODE_ENV || 'development',
            features: Object.keys(Config.FEATURE_FLAGS)
                .filter(key => Config.FEATURE_FLAGS[key])
        };
    }
};

// 初始化主题
Config.initTheme();

// 暴露到全局
if (typeof window !== 'undefined') {
    window.Config = Config;
}

// 导出（如果支持ES6模块）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
}
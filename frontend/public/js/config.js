/**
 * 应用配置文件
 * 包含API端点、常量、环境配置等
 */

const Config = {
    // 环境配置
    ENV: window.location.hostname.includes('localhost') ? 'development' : 'production',
    
    // API端点配置（与后端一一对应）
    API_ENDPOINTS: {
        // 认证相关
        AUTH: {
            LOGIN: '/api/auth/login',
            REGISTER: '/api/auth/register',
            LOGOUT: '/api/auth/logout',
            VERIFY: '/api/auth/verify',
            RECOVERY: '/api/auth/recovery'
        },
        
        // 笔记相关
        NOTES: {
            CREATE: '/api/notes/create',
            LIST: '/api/notes/list',
            GET: '/api/notes/:id',
            UPDATE: '/api/notes/update/:id',
            DELETE: '/api/notes/delete/:id',
            SEARCH: '/api/notes/search',
            STATS: '/api/notes/stats'
        },
        
        // 分类相关
        CATEGORIES: {
            LIST: '/api/categories/list',
            CREATE: '/api/categories/create',
            UPDATE: '/api/categories/update/:id',
            DELETE: '/api/categories/delete/:id'
        },
        
        // 同步相关
        SYNC: {
            PUSH: '/api/sync/push',
            PULL: '/api/sync/pull',
            CONFLICTS: '/api/sync/conflicts',
            STATUS: '/api/sync/status'
        },
        
        // 系统相关
        SYSTEM: {
            STATS: '/api/system/stats',
            BACKUP: '/api/system/backup',
            EXPORT: '/api/system/export',
            SETTINGS: '/api/system/settings'
        }
    },
    
    // 本地存储配置
    STORAGE: {
        // IndexedDB数据库配置
        DB_NAME: 'encrypted_notes_db',
        DB_VERSION: 2,
        
        // 存储键名
        KEYS: {
            USER: 'encrypted_notes_user',
            TOKEN: 'encrypted_notes_token',
            SETTINGS: 'encrypted_notes_settings',
            OFFLINE_QUEUE: 'encrypted_notes_offline_queue',
            SYNC_STATE: 'encrypted_notes_sync_state'
        },
        
        // 离线数据过期时间（7天）
        OFFLINE_DATA_TTL: 7 * 24 * 60 * 60 * 1000
    },
    
    // 同步配置
    SYNC: {
        // 自动同步间隔（秒）
        AUTO_SYNC_INTERVAL: 30,
        
        // 最大重试次数
        MAX_RETRIES: 3,
        
        // 重试延迟（毫秒）
        RETRY_DELAY: 1000,
        
        // 批量同步大小
        BATCH_SIZE: 20
    },
    
    // 编辑器配置
    EDITOR: {
        // 自动保存间隔（毫秒）
        AUTO_SAVE_INTERVAL: 30000,
        
        // 草稿保存间隔（毫秒）
        DRAFT_SAVE_INTERVAL: 5000,
        
        // 最大历史版本
        MAX_HISTORY: 50
    },
    
    // UI配置
    UI: {
        // 主题
        THEME: {
            DARK: 'dark',
            LIGHT: 'light',
            AUTO: 'auto'
        },
        
        // 语言
        LANGUAGE: {
            ZH_CN: 'zh-CN',
            EN_US: 'en-US'
        },
        
        // 通知显示时间（毫秒）
        NOTIFICATION_DURATION: 5000
    },
    
    // 安全配置
    SECURITY: {
        // PBKDF2迭代次数
        PBKDF2_ITERATIONS: 100000,
        
        // 加密算法
        ENCRYPTION_ALGORITHM: 'AES-GCM',
        
        // 密钥长度
        KEY_LENGTH: 256
    },
    
    // 获取完整的API URL
    getApiUrl(endpoint, params = {}) {
        let url = endpoint;
        
        // 替换路径参数
        Object.keys(params).forEach(key => {
            url = url.replace(`:${key}`, params[key]);
        });
        
        return url;
    },
    
    // 检查是否在线
    isOnline() {
        return navigator.onLine;
    },
    
    // 获取当前环境
    getEnvironment() {
        return this.ENV;
    },
    
    // 是否为开发环境
    isDevelopment() {
        return this.ENV === 'development';
    }
};

export default Config;
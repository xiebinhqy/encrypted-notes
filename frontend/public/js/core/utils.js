/**
 * 工具函数库
 * 作用：提供项目中常用的工具函数
 * 注意：这是一个模拟版本，实际项目中需要根据需求实现
 */

const Utils = {
    /**
     * 生成唯一ID
     * @param {string} prefix - ID前缀
     * @returns {string} 唯一ID
     */
    generateId: (prefix = 'id') => {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * HTML转义，防止XSS攻击
     * @param {string} text - 需要转义的文本
     * @returns {string} 转义后的文本
     */
    escapeHtml: (text) => {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        return text.replace(/[&<>"'/]/g, (char) => map[char]);
    },

    /**
     * 深度克隆对象
     * @param {any} obj - 需要克隆的对象
     * @returns {any} 克隆后的对象
     */
    deepClone: (obj) => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => Utils.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = Utils.deepClone(obj[key]);
            });
            return cloned;
        }
        return obj;
    },

    /**
     * 格式化日期
     * @param {Date|string} date - 日期对象或日期字符串
     * @param {string} format - 格式类型：relative, date, short, datetime
     * @returns {string} 格式化后的日期字符串
     */
    formatDate: (date, format = 'relative') => {
        if (!date) return '';
        
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;
        
        // 相对时间格式
        if (format === 'relative') {
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (seconds < 60) return '刚刚';
            if (minutes < 60) return `${minutes}分钟前`;
            if (hours < 24) return `${hours}小时前`;
            if (days < 7) return `${days}天前`;
            if (days < 30) return `${Math.floor(days / 7)}周前`;
            if (days < 365) return `${Math.floor(days / 30)}个月前`;
            return `${Math.floor(days / 365)}年前`;
        }
        
        // 完整日期格式
        if (format === 'date') {
            return d.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        // 简短格式
        if (format === 'short') {
            const today = new Date();
            if (d.toDateString() === today.toDateString()) {
                return d.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            return d.toLocaleDateString('zh-CN', {
                month: 'long',
                day: 'numeric'
            });
        }
        
        // 日期时间格式
        if (format === 'datetime') {
            return d.toLocaleString('zh-CN');
        }
        
        return d.toLocaleDateString();
    },

    /**
     * 本地存储封装
     */
    storage: {
        /**
         * 获取存储项
         * @param {string} key - 键名
         * @param {any} defaultValue - 默认值
         * @returns {any} 存储的值
         */
        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error(`[Utils.storage] 读取失败: ${key}`, error);
                return defaultValue;
            }
        },

        /**
         * 设置存储项
         * @param {string} key - 键名
         * @param {any} value - 值
         * @returns {boolean} 是否成功
         */
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error(`[Utils.storage] 存储失败: ${key}`, error);
                return false;
            }
        },

        /**
         * 移除存储项
         * @param {string} key - 键名
         */
        remove: (key) => {
            localStorage.removeItem(key);
        },

        /**
         * 清空所有存储
         */
        clear: () => {
            localStorage.clear();
        },

        /**
         * 获取所有键
         * @returns {string[]} 所有键名
         */
        keys: () => {
            return Object.keys(localStorage);
        }
    },

    /**
     * 防抖函数
     * @param {Function} func - 要执行的函数
     * @param {number} wait - 等待时间（毫秒）
     * @returns {Function} 防抖后的函数
     */
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * 节流函数
     * @param {Function} func - 要执行的函数
     * @param {number} limit - 限制时间（毫秒）
     * @returns {Function} 节流后的函数
     */
    throttle: (func, limit) => {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的大小
     */
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * 复制文本到剪贴板
     * @param {string} text - 要复制的文本
     * @returns {Promise<boolean>} 是否成功
     */
    copyToClipboard: async (text) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            return true;
        } catch (error) {
            console.error('[Utils] 复制到剪贴板失败:', error);
            return false;
        }
    },

    /**
     * 生成随机颜色
     * @returns {string} 十六进制颜色
     */
    generateRandomColor: () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    },

    /**
     * 检查是否为空对象
     * @param {Object} obj - 要检查的对象
     * @returns {boolean} 是否为空
     */
    isEmptyObject: (obj) => {
        return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
    },

    /**
     * 从数组中移除指定项
     * @param {Array} array - 数组
     * @param {any} item - 要移除的项
     * @returns {Array} 新数组
     */
    removeFromArray: (array, item) => {
        const index = array.indexOf(item);
        if (index > -1) {
            array.splice(index, 1);
        }
        return array;
    },

    /**
     * 等待指定时间
     * @param {number} ms - 毫秒数
     * @returns {Promise<void>}
     */
    sleep: (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 安全的JSON解析
     * @param {string} jsonString - JSON字符串
     * @param {any} defaultValue - 解析失败时的默认值
     * @returns {any} 解析后的对象
     */
    safeJsonParse: (jsonString, defaultValue = {}) => {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('[Utils] JSON解析失败:', error);
            return defaultValue;
        }
    },

    /**
     * 验证邮箱格式
     * @param {string} email - 邮箱地址
     * @returns {boolean} 是否有效
     */
    isValidEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * 生成密码强度评分
     * @param {string} password - 密码
     * @returns {number} 强度分数（0-4）
     */
    passwordStrength: (password) => {
        if (!password) return 0;
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    },

    /**
     * 获取URL查询参数
     * @param {string} name - 参数名
     * @returns {string|null} 参数值
     */
    getQueryParam: (name) => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    },

    /**
     * 设置URL查询参数
     * @param {string} name - 参数名
     * @param {string} value - 参数值
     */
    setQueryParam: (name, value) => {
        const url = new URL(window.location);
        url.searchParams.set(name, value);
        window.history.pushState({}, '', url);
    },

    /**
     * 滚动到元素
     * @param {string} selector - CSS选择器
     * @param {Object} options - 滚动选项
     */
    scrollToElement: (selector, options = {}) => {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollIntoView({
                behavior: options.behavior || 'smooth',
                block: options.block || 'start',
                inline: options.inline || 'nearest'
            });
        }
    },

    /**
     * 检测设备类型
     * @returns {string} mobile, tablet, desktop
     */
    detectDevice: () => {
        const width = window.innerWidth;
        if (width < 768) return 'mobile';
        if (width < 1024) return 'tablet';
        return 'desktop';
    },

    /**
     * 检测暗色模式偏好
     * @returns {boolean} 是否偏好暗色模式
     */
    prefersDarkMode: () => {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
};

// 暴露到全局
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}

// 导出（如果支持ES6模块）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
/**
 * 状态管理模块
 * 提供全局状态管理和事件订阅功能
 */

class Store {
    constructor() {
        this.state = {
            // 用户相关
            user: null,
            isAuthenticated: false,
            
            // 笔记相关
            notes: [],
            categories: [],
            tags: [],
            currentNote: null,
            
            // 系统相关
            theme: 'dark',
            language: 'zh-CN',
            isLoading: false,
            isSyncing: false,
            
            // UI状态
            sidebarCollapsed: false,
            currentPage: 'dashboard',
            modals: {
                newNote: false,
                settings: false,
                help: false
            }
        };
        
        this.listeners = new Map();
        this.actionHandlers = new Map();
        
        this.init();
    }
    
    /**
     * 初始化存储
     */
    init() {
        // 从本地存储加载状态
        this.loadFromStorage();
        
        // 监听存储事件（多标签页同步）
        window.addEventListener('storage', (event) => {
            if (event.key === 'app_state') {
                try {
                    const newState = JSON.parse(event.newValue);
                    this.setState(newState, false); // 不保存到存储，避免循环
                } catch (error) {
                    console.error('[状态管理] 解析存储状态失败:', error);
                }
            }
        });
    }
    
    /**
     * 获取状态
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * 设置状态
     */
    setState(newState, saveToStorage = true) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        // 保存到本地存储
        if (saveToStorage) {
            this.saveToStorage();
        }
        
        // 触发状态变化事件
        this.notifyListeners(oldState, this.state);
    }
    
    /**
     * 获取状态片段
     */
    get(path, defaultValue = null) {
        const keys = path.split('.');
        let value = this.state;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }
    
    /**
     * 设置状态片段
     */
    set(path, value) {
        const keys = path.split('.');
        const newState = { ...this.state };
        let current = newState;
        
        // 遍历到倒数第二个key
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        // 设置最后一个key的值
        const lastKey = keys[keys.length - 1];
        current[lastKey] = value;
        
        this.setState(newState);
    }
    
    /**
     * 订阅状态变化
     */
    subscribe(listener, paths = []) {
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        this.listeners.set(id, { listener, paths });
        return () => this.unsubscribe(id);
    }
    
    /**
     * 取消订阅
     */
    unsubscribe(id) {
        this.listeners.delete(id);
    }
    
    /**
     * 通知监听器
     */
    notifyListeners(oldState, newState) {
        for (const { listener, paths } of this.listeners.values()) {
            // 如果没有指定路径，或者指定路径的状态发生了变化
            if (paths.length === 0 || this.hasStateChanged(paths, oldState, newState)) {
                try {
                    listener(newState, oldState);
                } catch (error) {
                    console.error('[状态管理] 监听器执行失败:', error);
                }
            }
        }
    }
    
    /**
     * 检查状态是否发生变化
     */
    hasStateChanged(paths, oldState, newState) {
        return paths.some(path => {
            const oldValue = this.getValueByPath(oldState, path);
            const newValue = this.getValueByPath(newState, path);
            return JSON.stringify(oldValue) !== JSON.stringify(newValue);
        });
    }
    
    /**
     * 根据路径获取值
     */
    getValueByPath(obj, path) {
        const keys = path.split('.');
        let value = obj;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }
        
        return value;
    }
    
    /**
     * 注册动作处理器
     */
    registerAction(type, handler) {
        this.actionHandlers.set(type, handler);
    }
    
    /**
     * 分发动作
     */
    async dispatch(action) {
        const { type, payload } = action;
        
        console.log(`[状态管理] 分发动作: ${type}`, payload);
        
        // 执行动作处理器
        const handler = this.actionHandlers.get(type);
        if (handler) {
            try {
                const result = await handler(this.state, payload);
                if (result) {
                    this.setState(result);
                }
                return result;
            } catch (error) {
                console.error(`[状态管理] 动作执行失败: ${type}`, error);
                throw error;
            }
        } else {
            console.warn(`[状态管理] 未注册的动作处理器: ${type}`);
        }
    }
    
    /**
     * 保存状态到本地存储
     */
    saveToStorage() {
        try {
            const stateToSave = {
                user: this.state.user,
                theme: this.state.theme,
                language: this.state.language,
                sidebarCollapsed: this.state.sidebarCollapsed
            };
            
            localStorage.setItem('app_state', JSON.stringify(stateToSave));
        } catch (error) {
            console.error('[状态管理] 保存状态失败:', error);
        }
    }
    
    /**
     * 从本地存储加载状态
     */
    loadFromStorage() {
        try {
            const savedState = localStorage.getItem('app_state');
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                this.setState(parsedState, false);
            }
        } catch (error) {
            console.error('[状态管理] 加载状态失败:', error);
        }
    }
    
    /**
     * 重置状态
     */
    reset() {
        this.state = {
            user: null,
            isAuthenticated: false,
            notes: [],
            categories: [],
            tags: [],
            currentNote: null,
            theme: 'dark',
            language: 'zh-CN',
            isLoading: false,
            isSyncing: false,
            sidebarCollapsed: false,
            currentPage: 'dashboard',
            modals: {
                newNote: false,
                settings: false,
                help: false
            }
        };
        
        this.saveToStorage();
        this.notifyListeners({}, this.state);
    }
    
    /**
     * 批量更新
     */
    batchUpdate(updates) {
        const newState = { ...this.state };
        
        Object.entries(updates).forEach(([path, value]) => {
            const keys = path.split('.');
            let current = newState;
            
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!(key in current) || typeof current[key] !== 'object') {
                    current[key] = {};
                }
                current = current[key];
            }
            
            const lastKey = keys[keys.length - 1];
            current[lastKey] = value;
        });
        
        this.setState(newState);
    }
}

// 创建单例实例
const store = new Store();

// 注册默认动作处理器
store.registerAction('SET_USER', (state, payload) => {
    return {
        user: payload.user,
        isAuthenticated: !!payload.user
    };
});

store.registerAction('LOGOUT', () => {
    return {
        user: null,
        isAuthenticated: false,
        notes: [],
        categories: [],
        currentNote: null
    };
});

store.registerAction('SET_THEME', (state, payload) => {
    return { theme: payload };
});

store.registerAction('SET_NOTES', (state, payload) => {
    return { notes: payload };
});

store.registerAction('ADD_NOTE', (state, payload) => {
    return { notes: [...state.notes, payload] };
});

store.registerAction('UPDATE_NOTE', (state, payload) => {
    const notes = state.notes.map(note => 
        note.id === payload.id ? { ...note, ...payload } : note
    );
    return { notes };
});

store.registerAction('DELETE_NOTE', (state, payload) => {
    const notes = state.notes.filter(note => note.id !== payload.id);
    return { notes };
});

store.registerAction('SET_CATEGORIES', (state, payload) => {
    return { categories: payload };
});

store.registerAction('SET_LOADING', (state, payload) => {
    return { isLoading: payload };
});

store.registerAction('SET_SYNCING', (state, payload) => {
    return { isSyncing: payload };
});

store.registerAction('TOGGLE_SIDEBAR', (state) => {
    return { sidebarCollapsed: !state.sidebarCollapsed };
});

store.registerAction('OPEN_MODAL', (state, payload) => {
    const modals = { ...state.modals };
    if (payload in modals) {
        modals[payload] = true;
    }
    return { modals };
});

store.registerAction('CLOSE_MODAL', (state, payload) => {
    const modals = { ...state.modals };
    if (payload in modals) {
        modals[payload] = false;
    }
    return { modals };
});

export default store;
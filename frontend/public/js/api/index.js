/**
 * API接口封装
 * 作用：统一管理所有API请求
 * 注意：这是一个模拟版本，返回模拟数据。实际项目中需要替换为真实API调用
 */

// 模拟延迟
const simulateDelay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// 模拟API响应
const createResponse = (data, success = true, message = '', code = 200) => ({
    success,
    code,
    message,
    data,
    timestamp: new Date().toISOString()
});

// 模拟错误响应
const createErrorResponse = (message = '请求失败', code = 500) => ({
    success: false,
    code,
    message,
    data: null,
    timestamp: new Date().toISOString()
});

// 模拟数据
const mockData = {
    // 模拟用户
    currentUser: {
        id: 'user_1',
        username: 'demo',
        email: 'demo@example.com',
        name: '演示用户',
        avatar: null,
        createdAt: '2024-01-01T00:00:00Z',
        settings: {
            theme: 'dark',
            language: 'zh-CN'
        }
    },
    
    // 模拟笔记数据
    notes: [
        {
            id: 'note_1',
            title: '欢迎使用加密笔记',
            content: '# 欢迎！\n\n这是一个安全的笔记应用，支持端到端加密。\n\n## 主要功能\n\n1. 🔐 安全的加密存储\n2. 📝 丰富的编辑器功能\n3. 🏷️ 标签和分类管理\n4. 🔄 多设备同步\n5. 🌓 深色/浅色主题',
            category: 'general',
            tags: ['欢迎', '介绍', '功能'],
            starred: true,
            isEncrypted: true,
            createdAt: '2024-01-10T10:00:00Z',
            updatedAt: '2024-01-15T14:30:00Z',
            wordCount: 156,
            readTime: '1分钟'
        },
        {
            id: 'note_2',
            title: '开发计划与路线图',
            content: '## 开发计划\n\n### 第一阶段（已完成）\n- [x] 基础笔记功能\n- [x] 分类管理\n- [x] 设置页面\n\n### 第二阶段（进行中）\n- [ ] 数据同步功能\n- [ ] 离线支持\n- [ ] 附件管理\n\n### 第三阶段（规划中）\n- [ ] 协作功能\n- [ ] 移动端应用\n- [ ] API开放',
            category: 'work',
            tags: ['开发', '计划', '路线图'],
            starred: false,
            isEncrypted: false,
            createdAt: '2024-01-12T09:15:00Z',
            updatedAt: '2024-01-14T16:45:00Z',
            wordCount: 89,
            readTime: '1分钟'
        },
        {
            id: 'note_3',
            title: '购物清单',
            content: '## 本周购物清单\n\n### 🛒 超市\n- [ ] 牛奶\n- [ ] 面包\n- [x] 鸡蛋\n- [ ] 水果（苹果、香蕉）\n- [ ] 蔬菜\n\n### 💊 药店\n- [ ] 维生素C\n- [ ] 创可贴\n\n### 📦 日用品\n- [x] 纸巾\n- [ ] 洗衣液',
            category: 'personal',
            tags: ['购物', '生活', '清单'],
            starred: true,
            isEncrypted: true,
            createdAt: '2024-01-13T15:20:00Z',
            updatedAt: '2024-01-13T15:20:00Z',
            wordCount: 67,
            readTime: '1分钟'
        },
        {
            id: 'note_4',
            title: '读书笔记 - 《深度工作》',
            content: '## 《深度工作》读书笔记\n\n### 核心概念\n\n**深度工作**：在无干扰的状态下专注进行职业活动，使个人的认知能力达到极限。\n\n**浮浅工作**：对认知要求不高、事务性的任务，通常在受到干扰的情况下开展。\n\n### 四个原则\n\n1. **工作要深入**\n2. **拥抱无聊**\n3. **远离社交媒体**\n4. **摒弃浮浅**',
            category: 'study',
            tags: ['读书', '学习', '效率'],
            starred: true,
            isEncrypted: false,
            createdAt: '2024-01-11T11:30:00Z',
            updatedAt: '2024-01-12T09:45:00Z',
            wordCount: 123,
            readTime: '1分钟'
        }
    ],
    
    // 模拟分类数据
    categories: [
        { 
            id: 'general', 
            name: '通用', 
            description: '一般性笔记',
            color: '#6366f1', 
            icon: 'fas fa-folder',
            order: 0,
            parentId: null,
            noteCount: 1
        },
        { 
            id: 'work', 
            name: '工作', 
            description: '工作相关笔记',
            color: '#10b981', 
            icon: 'fas fa-briefcase',
            order: 1,
            parentId: null,
            noteCount: 1
        },
        { 
            id: 'personal', 
            name: '个人', 
            description: '个人生活笔记',
            color: '#f59e0b', 
            icon: 'fas fa-user',
            order: 2,
            parentId: null,
            noteCount: 1
        },
        { 
            id: 'study', 
            name: '学习', 
            description: '学习笔记',
            color: '#3b82f6', 
            icon: 'fas fa-graduation-cap',
            order: 3,
            parentId: null,
            noteCount: 1
        },
        { 
            id: 'ideas', 
            name: '想法', 
            description: '灵感和想法',
            color: '#8b5cf6', 
            icon: 'fas fa-lightbulb',
            order: 4,
            parentId: null,
            noteCount: 0
        }
    ],
    
    // 模拟标签数据
    tags: ['欢迎', '介绍', '功能', '开发', '计划', '路线图', '购物', '生活', '清单', '读书', '学习', '效率']
};

// API类
class Api {
    constructor() {
        this.baseUrl = Config.API_BASE_URL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }
    
    /**
     * 发送请求
     * @param {string} endpoint - API端点
     * @param {Object} options - 请求选项
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = { ...this.defaultHeaders, ...options.headers };
        
        // 模拟网络延迟
        await simulateDelay(options.delay || 300);
        
        // 模拟网络错误（10%概率）
        if (Math.random() < 0.1 && options.simulateError !== false) {
            throw new Error('网络请求失败，请检查网络连接');
        }
        
        // 这里应该是真实的fetch请求
        // const response = await fetch(url, { ...options, headers });
        // return response.json();
        
        // 模拟响应
        return this.mockResponse(endpoint, options);
    }
    
    /**
     * 模拟API响应
     */
    async mockResponse(endpoint, options) {
        const method = options.method || 'GET';
        
        // 用户相关接口
        if (endpoint === '/auth/login') {
            if (method === 'POST') {
                const { username, password } = options.body || {};
                if (username && password) {
                    return createResponse({
                        token: 'mock_jwt_token_123456',
                        user: mockData.currentUser
                    }, true, '登录成功');
                }
                return createErrorResponse('用户名或密码错误', 401);
            }
        }
        
        if (endpoint === '/auth/register') {
            if (method === 'POST') {
                return createResponse({
                    token: 'mock_jwt_token_789012',
                    user: { ...mockData.currentUser, ...options.body }
                }, true, '注册成功');
            }
        }
        
        if (endpoint === '/auth/logout') {
            return createResponse(null, true, '登出成功');
        }
        
        if (endpoint === '/auth/me') {
            return createResponse(mockData.currentUser, true, '获取用户信息成功');
        }
        
        // 笔记相关接口
        if (endpoint === '/notes') {
            if (method === 'GET') {
                // 模拟分页
                const page = parseInt(options.query?.page) || 1;
                const limit = parseInt(options.query?.limit) || 20;
                const search = options.query?.search;
                const category = options.query?.category;
                const tag = options.query?.tag;
                const starred = options.query?.starred;
                
                let notes = [...mockData.notes];
                
                // 搜索过滤
                if (search) {
                    const query = search.toLowerCase();
                    notes = notes.filter(note => 
                        note.title.toLowerCase().includes(query) ||
                        note.content.toLowerCase().includes(query) ||
                        note.tags.some(t => t.toLowerCase().includes(query))
                    );
                }
                
                // 分类过滤
                if (category) {
                    notes = notes.filter(note => note.category === category);
                }
                
                // 标签过滤
                if (tag) {
                    notes = notes.filter(note => note.tags.includes(tag));
                }
                
                // 星标过滤
                if (starred === 'true') {
                    notes = notes.filter(note => note.starred);
                }
                
                // 排序
                const sortBy = options.query?.sortBy || 'updatedAt';
                const sortOrder = options.query?.sortOrder || 'desc';
                notes.sort((a, b) => {
                    if (sortBy === 'title') {
                        return sortOrder === 'asc' 
                            ? a.title.localeCompare(b.title)
                            : b.title.localeCompare(a.title);
                    }
                    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
                        return sortOrder === 'asc'
                            ? new Date(a[sortBy]) - new Date(b[sortBy])
                            : new Date(b[sortBy]) - new Date(a[sortBy]);
                    }
                    return 0;
                });
                
                // 分页
                const total = notes.length;
                const totalPages = Math.ceil(total / limit);
                const start = (page - 1) * limit;
                const end = start + limit;
                const data = notes.slice(start, end);
                
                return createResponse({
                    data,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages,
                        hasNext: page < totalPages,
                        hasPrev: page > 1
                    }
                });
            }
            
            if (method === 'POST') {
                const newNote = {
                    id: `note_${Date.now()}`,
                    ...options.body,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    starred: false,
                    isEncrypted: false
                };
                mockData.notes.unshift(newNote);
                return createResponse(newNote, true, '笔记创建成功');
            }
        }
        
        if (endpoint.startsWith('/notes/')) {
            const noteId = endpoint.split('/')[2];
            const noteIndex = mockData.notes.findIndex(n => n.id === noteId);
            
            if (noteIndex === -1) {
                return createErrorResponse('笔记不存在', 404);
            }
            
            if (method === 'GET') {
                return createResponse(mockData.notes[noteIndex]);
            }
            
            if (method === 'PUT') {
                const updatedNote = {
                    ...mockData.notes[noteIndex],
                    ...options.body,
                    updatedAt: new Date().toISOString()
                };
                mockData.notes[noteIndex] = updatedNote;
                return createResponse(updatedNote, true, '笔记更新成功');
            }
            
            if (method === 'DELETE') {
                mockData.notes.splice(noteIndex, 1);
                return createResponse(null, true, '笔记删除成功');
            }
        }
        
        if (endpoint === '/notes/stats') {
            const stats = {
                total: mockData.notes.length,
                starred: mockData.notes.filter(n => n.starred).length,
                encrypted: mockData.notes.filter(n => n.isEncrypted).length,
                byCategory: {},
                byTag: {},
                recent: mockData.notes.slice(0, 5).map(note => ({
                    id: note.id,
                    title: note.title,
                    updatedAt: note.updatedAt
                }))
            };
            
            // 按分类统计
            mockData.notes.forEach(note => {
                if (note.category) {
                    stats.byCategory[note.category] = (stats.byCategory[note.category] || 0) + 1;
                }
            });
            
            // 按标签统计
            mockData.notes.forEach(note => {
                note.tags.forEach(tag => {
                    stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
                });
            });
            
            return createResponse(stats);
        }
        
        if (endpoint === '/notes/search') {
            const query = options.query?.q || '';
            const results = mockData.notes.filter(note => 
                note.title.toLowerCase().includes(query.toLowerCase()) ||
                note.content.toLowerCase().includes(query.toLowerCase())
            );
            return createResponse(results);
        }
        
        // 分类相关接口
        if (endpoint === '/categories') {
            if (method === 'GET') {
                return createResponse(mockData.categories);
            }
            
            if (method === 'POST') {
                const newCategory = {
                    id: `cat_${Date.now()}`,
                    ...options.body,
                    order: mockData.categories.length,
                    noteCount: 0
                };
                mockData.categories.push(newCategory);
                return createResponse(newCategory, true, '分类创建成功');
            }
        }
        
        if (endpoint.startsWith('/categories/')) {
            const categoryId = endpoint.split('/')[2];
            const categoryIndex = mockData.categories.findIndex(c => c.id === categoryId);
            
            if (categoryIndex === -1) {
                return createErrorResponse('分类不存在', 404);
            }
            
            if (method === 'GET') {
                return createResponse(mockData.categories[categoryIndex]);
            }
            
            if (method === 'PUT') {
                const updatedCategory = {
                    ...mockData.categories[categoryIndex],
                    ...options.body
                };
                mockData.categories[categoryIndex] = updatedCategory;
                return createResponse(updatedCategory, true, '分类更新成功');
            }
            
            if (method === 'DELETE') {
                // 检查是否有笔记使用此分类
                const notesUsingCategory = mockData.notes.filter(n => n.category === categoryId);
                if (notesUsingCategory.length > 0) {
                    return createErrorResponse('无法删除，该分类下仍有笔记', 400);
                }
                
                mockData.categories.splice(categoryIndex, 1);
                return createResponse(null, true, '分类删除成功');
            }
        }
        
        if (endpoint === '/categories/tree') {
            // 构建树形结构
            const tree = mockData.categories
                .filter(cat => !cat.parentId)
                .map(root => ({
                    ...root,
                    children: mockData.categories.filter(cat => cat.parentId === root.id)
                }));
            return createResponse(tree);
        }
        
        // 标签相关接口
        if (endpoint === '/tags') {
            if (method === 'GET') {
                return createResponse(mockData.tags);
            }
        }
        
        if (endpoint === '/tags/popular') {
            const tagCounts = {};
            mockData.notes.forEach(note => {
                note.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            });
            
            const popularTags = Object.entries(tagCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([tag, count]) => ({ tag, count }));
                
            return createResponse(popularTags);
        }
        
        // 设置相关接口
        if (endpoint === '/settings') {
            if (method === 'GET') {
                const settings = {};
                // 从localStorage加载设置
                mockData.categories.forEach(cat => {
                    settings[`category.${cat.id}`] = cat;
                });
                return createResponse(settings);
            }
            
            if (method === 'PUT') {
                // 保存设置到localStorage
                Object.entries(options.body || {}).forEach(([key, value]) => {
                    localStorage.setItem(`settings.${key}`, JSON.stringify(value));
                });
                return createResponse(options.body, true, '设置保存成功');
            }
        }
        
        // 统计相关接口
        if (endpoint === '/stats') {
            const stats = {
                user: {
                    total: 1,
                    active: 1
                },
                notes: {
                    total: mockData.notes.length,
                    encrypted: mockData.notes.filter(n => n.isEncrypted).length,
                    thisMonth: mockData.notes.filter(n => {
                        const noteDate = new Date(n.createdAt);
                        const now = new Date();
                        return noteDate.getMonth() === now.getMonth() && 
                               noteDate.getFullYear() === now.getFullYear();
                    }).length
                },
                storage: {
                    used: '2.5 MB',
                    total: '50 MB',
                    percentage: 5
                }
            };
            return createResponse(stats);
        }
        
        // 备份相关接口
        if (endpoint === '/backup') {
            if (method === 'GET') {
                const backups = [
                    {
                        id: 'backup_1',
                        name: '完整备份',
                        date: '2024-01-15T10:00:00Z',
                        size: '1.2 MB',
                        type: 'full'
                    },
                    {
                        id: 'backup_2',
                        name: '增量备份',
                        date: '2024-01-14T10:00:00Z',
                        size: '256 KB',
                        type: 'incremental'
                    }
                ];
                return createResponse(backups);
            }
            
            if (method === 'POST') {
                const backup = {
                    id: `backup_${Date.now()}`,
                    name: options.body?.name || '手动备份',
                    date: new Date().toISOString(),
                    size: '计算中...',
                    type: 'manual'
                };
                return createResponse(backup, true, '备份创建成功');
            }
        }
        
        // 默认返回404
        return createErrorResponse('接口不存在', 404);
    }
    
    // 用户相关API
    auth = {
        login: (credentials) => this.request('/auth/login', {
            method: 'POST',
            body: credentials
        }),
        
        register: (userData) => this.request('/auth/register', {
            method: 'POST',
            body: userData
        }),
        
        logout: () => this.request('/auth/logout'),
        
        getCurrentUser: () => this.request('/auth/me'),
        
        updateProfile: (userData) => this.request('/auth/me', {
            method: 'PUT',
            body: userData
        }),
        
        changePassword: (passwordData) => this.request('/auth/password', {
            method: 'PUT',
            body: passwordData
        })
    };
    
    // 笔记相关API
    notes = {
        getAll: (params = {}) => this.request('/notes', {
            method: 'GET',
            query: params
        }),
        
        get: (id) => this.request(`/notes/${id}`),
        
        create: (noteData) => this.request('/notes', {
            method: 'POST',
            body: noteData
        }),
        
        update: (id, noteData) => this.request(`/notes/${id}`, {
            method: 'PUT',
            body: noteData
        }),
        
        delete: (id) => this.request(`/notes/${id}`, {
            method: 'DELETE'
        }),
        
        search: (query) => this.request('/notes/search', {
            method: 'GET',
            query: { q: query }
        }),
        
        getStats: () => this.request('/notes/stats'),
        
        export: (format = 'json') => this.request(`/notes/export?format=${format}`),
        
        import: (data, format = 'json') => this.request('/notes/import', {
            method: 'POST',
            body: { data, format }
        }),
        
        // 批量操作
        bulkUpdate: (noteIds, updates) => this.request('/notes/bulk', {
            method: 'PUT',
            body: { noteIds, updates }
        }),
        
        bulkDelete: (noteIds) => this.request('/notes/bulk', {
            method: 'DELETE',
            body: { noteIds }
        })
    };
    
    // 分类相关API
    categories = {
        getAll: () => this.request('/categories'),
        
        get: (id) => this.request(`/categories/${id}`),
        
        create: (categoryData) => this.request('/categories', {
            method: 'POST',
            body: categoryData
        }),
        
        update: (id, categoryData) => this.request(`/categories/${id}`, {
            method: 'PUT',
            body: categoryData
        }),
        
        delete: (id) => this.request(`/categories/${id}`, {
            method: 'DELETE'
        }),
        
        getTree: () => this.request('/categories/tree'),
        
        reorder: (categories) => this.request('/categories/reorder', {
            method: 'PUT',
            body: { categories }
        })
    };
    
    // 标签相关API
    tags = {
        getAll: () => this.request('/tags'),
        
        getPopular: () => this.request('/tags/popular'),
        
        create: (tagData) => this.request('/tags', {
            method: 'POST',
            body: tagData
        }),
        
        delete: (tag) => this.request(`/tags/${tag}`, {
            method: 'DELETE'
        })
    };
    
    // 设置相关API
    settings = {
        get: () => this.request('/settings'),
        
        update: (settings) => this.request('/settings', {
            method: 'PUT',
            body: settings
        }),
        
        reset: () => this.request('/settings/reset', {
            method: 'POST'
        })
    };
    
    // 系统相关API
    system = {
        getStats: () => this.request('/stats'),
        
        getBackups: () => this.request('/backup'),
        
        createBackup: (name) => this.request('/backup', {
            method: 'POST',
            body: { name }
        }),
        
        restoreBackup: (backupId) => this.request(`/backup/${backupId}/restore`, {
            method: 'POST'
        }),
        
        deleteBackup: (backupId) => this.request(`/backup/${backupId}`, {
            method: 'DELETE'
        }),
        
        exportData: (format = 'json') => this.request(`/system/export?format=${format}`),
        
        importData: (data) => this.request('/system/import', {
            method: 'POST',
            body: data
        }),
        
        clearCache: () => this.request('/system/cache', {
            method: 'DELETE'
        })
    };
    
    // 工具方法
    utils = {
        // 检查API健康状态
        healthCheck: () => this.request('/health', { simulateError: false }),
        
        // 获取服务器时间
        getServerTime: () => this.request('/time'),
        
        // 上传文件
        uploadFile: (file, options = {}) => {
            const formData = new FormData();
            formData.append('file', file);
            
            if (options.noteId) {
                formData.append('noteId', options.noteId);
            }
            
            return this.request('/upload', {
                method: 'POST',
                headers: {},
                body: formData
            });
        },
        
        // 下载文件
        downloadFile: (fileId) => this.request(`/files/${fileId}/download`)
    };
}

// 创建API实例
const api = new Api();

// 暴露到全局
if (typeof window !== 'undefined') {
    window.Api = api;
}

// ES6 模块导出
export { api as Api };
// 同时保留默认导出，确保兼容性
export default api;
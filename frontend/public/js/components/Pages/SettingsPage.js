/**
 * 设置页面组件
 * 集成应用的所有设置选项，包括主题、编辑器、同步、隐私、通知等
 */

import Utils from '../../core/utils.js';
import Config from '../../config.js';
import Api from '../../api/index.js';
import OfflineManager from '../../core/offline.js';
import { Modal } from '../Modals/modals.js';

import { Input } from '../Forms/Input.js';
import { Select } from '../Forms/Select.js';
import { Checkbox } from '../Forms/Checkbox.js';
import { Textarea } from '../Forms/Textarea.js';

import { Notify } from '../Common/Notification.js';
import { Loader } from '../Common/Loading.js';

export class SettingsPage {
    constructor(app, options = {}) {
        this.app = app;
        this.options = {
            id: 'settings-page',
            title: '设置',
            icon: 'fas fa-cog',
            sections: ['general', 'editor', 'sync', 'privacy', 'notifications', 'advanced'],
            defaultSection: 'general',
            autoSave: true,
            saveDelay: 1000,
            classes: {
                container: '',
                header: '',
                sidebar: '',
                content: '',
                section: '',
                form: '',
                actions: ''
            },
            onSave: null,
            onReset: null,
            onExport: null,
            onImport: null,
            ...options
        };
        
        this.state = {
            activeSection: this.options.defaultSection,
            isSaving: false,
            isDirty: false,
            settings: this.loadSettings(),
            originalSettings: null,
            validationErrors: {}
        };
        
        this.container = null;
        this.sidebar = null;
        this.content = null;
        this.formElements = new Map();
        this.saveTimeout = null;
        
        this.init();
    }
    
    /**
     * 初始化设置页面
     */
    init() {
        // 保存原始设置副本
        this.state.originalSettings = Utils.deepClone(this.state.settings);
        
        console.log('[设置页面] 初始化完成');
    }
    
    /**
     * 加载设置
     */
    loadSettings() {
        return {
            // 通用设置
            general: {
                theme: Utils.storage.get('theme', 'dark'),
                language: Utils.storage.get('language', 'zh-CN'),
                timezone: Utils.storage.get('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone),
                dateFormat: Utils.storage.get('dateFormat', 'relative'),
                itemsPerPage: Utils.storage.get('itemsPerPage', 20),
                autoSaveNotes: Utils.storage.get('autoSaveNotes', true),
                autoSaveInterval: Utils.storage.get('autoSaveInterval', 5000)
            },
            
            // 编辑器设置
            editor: {
                mode: Utils.storage.get('editorMode', 'split'),
                fontSize: Utils.storage.get('editorFontSize', 14),
                fontFamily: Utils.storage.get('editorFontFamily', 'system-ui'),
                lineHeight: Utils.storage.get('editorLineHeight', 1.6),
                tabSize: Utils.storage.get('editorTabSize', 4),
                wordWrap: Utils.storage.get('editorWordWrap', true),
                lineNumbers: Utils.storage.get('editorLineNumbers', true),
                minimap: Utils.storage.get('editorMinimap', false),
                spellCheck: Utils.storage.get('editorSpellCheck', true),
                autoCloseTags: Utils.storage.get('editorAutoCloseTags', true),
                emmet: Utils.storage.get('editorEmmet', true)
            },
            
            // 同步设置
            sync: {
                autoSync: Utils.storage.get('autoSync', true),
                syncInterval: Utils.storage.get('syncInterval', 300),
                wifiOnly: Utils.storage.get('syncWifiOnly', false),
                syncOnStartup: Utils.storage.get('syncOnStartup', true),
                syncNotes: Utils.storage.get('syncNotes', true),
                syncCategories: Utils.storage.get('syncCategories', true),
                syncAttachments: Utils.storage.get('syncAttachments', true),
                conflictResolution: Utils.storage.get('conflictResolution', 'server') // 'local', 'server', 'newest'
            },
            
            // 隐私设置
            privacy: {
                encryptByDefault: Utils.storage.get('encryptByDefault', true),
                lockOnMinimize: Utils.storage.get('lockOnMinimize', false),
                lockTimeout: Utils.storage.get('lockTimeout', 300),
                clearClipboard: Utils.storage.get('clearClipboard', true),
                clipboardTimeout: Utils.storage.get('clipboardTimeout', 60),
                autoLock: Utils.storage.get('autoLock', false),
                autoLockTimeout: Utils.storage.get('autoLockTimeout', 1800)
            },
            
            // 通知设置
            notifications: {
                enabled: Utils.storage.get('notificationsEnabled', true),
                sounds: Utils.storage.get('notificationsSounds', true),
                desktop: Utils.storage.get('notificationsDesktop', false),
                syncComplete: Utils.storage.get('notificationsSyncComplete', true),
                backupReminder: Utils.storage.get('notificationsBackupReminder', true),
                updateAvailable: Utils.storage.get('notificationsUpdateAvailable', true),
                quietHours: Utils.storage.get('notificationsQuietHours', false),
                quietStart: Utils.storage.get('notificationsQuietStart', '22:00'),
                quietEnd: Utils.storage.get('notificationsQuietEnd', '08:00')
            },
            
            // 高级设置
            advanced: {
                debugMode: Utils.storage.get('debugMode', false),
                developerMode: Utils.storage.get('developerMode', false),
                experimentalFeatures: Utils.storage.get('experimentalFeatures', false),
                logLevel: Utils.storage.get('logLevel', 'info'),
                maxBackupCount: Utils.storage.get('maxBackupCount', 10),
                backupInterval: Utils.storage.get('backupInterval', 86400),
                cacheSize: Utils.storage.get('cacheSize', 100),
                clearCacheOnExit: Utils.storage.get('clearCacheOnExit', false)
            }
        };
    }
    
    /**
     * 渲染页面
     */
    async render(container) {
        this.container = container;
        
        // 渲染页面结构
        container.innerHTML = this.getTemplate();
        
        // 缓存DOM元素
        this.cacheElements();
        
        // 渲染侧边栏
        this.renderSidebar();
        
        // 渲染当前活动部分
        await this.renderSection(this.state.activeSection);
        
        // 绑定事件
        this.bindEvents();
        
        console.log('[设置页面] 渲染完成');
    }
    
    /**
     * 获取模板
     */
    getTemplate() {
        return `
            <div class="settings-page ${this.options.classes.container || ''}">
                <!-- 页面头部 -->
                <div class="settings-header ${this.options.classes.header || ''}">
                    <h1 class="settings-title">
                        <i class="${this.options.icon}"></i>
                        ${this.options.title}
                    </h1>
                    <div class="settings-actions">
                        ${this.getActionsTemplate()}
                    </div>
                </div>
                
                <!-- 设置主体 -->
                <div class="settings-body">
                    <!-- 侧边栏 -->
                    <div class="settings-sidebar ${this.options.classes.sidebar || ''}"></div>
                    
                    <!-- 内容区域 -->
                    <div class="settings-content ${this.options.classes.content || ''}"></div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取操作按钮模板
     */
    getActionsTemplate() {
        return `
            <div class="action-buttons">
                <button class="btn btn-secondary btn-discard" ${!this.state.isDirty ? 'disabled' : ''}>
                    <i class="fas fa-undo"></i>
                    放弃更改
                </button>
                <button class="btn btn-primary btn-save" ${!this.state.isDirty ? 'disabled' : ''}>
                    <i class="fas fa-save"></i>
                    保存设置
                </button>
                <button class="btn btn-icon btn-settings-menu">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
        `;
    }
    
    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.sidebar = this.container.querySelector('.settings-sidebar');
        this.content = this.container.querySelector('.settings-content');
        this.discardBtn = this.container.querySelector('.btn-discard');
        this.saveBtn = this.container.querySelector('.btn-save');
        this.settingsMenuBtn = this.container.querySelector('.btn-settings-menu');
    }
    
    /**
     * 渲染侧边栏
     */
    renderSidebar() {
        const sections = [
            { id: 'general', label: '通用', icon: 'fas fa-sliders-h' },
            { id: 'editor', label: '编辑器', icon: 'fas fa-edit' },
            { id: 'sync', label: '同步', icon: 'fas fa-sync-alt' },
            { id: 'privacy', label: '隐私与安全', icon: 'fas fa-lock' },
            { id: 'notifications', label: '通知', icon: 'fas fa-bell' },
            { id: 'advanced', label: '高级', icon: 'fas fa-cogs' }
        ];
        
        this.sidebar.innerHTML = `
            <div class="sidebar-sections">
                ${sections.map(section => `
                    <button class="sidebar-section ${this.state.activeSection === section.id ? 'active' : ''}" 
                            data-section="${section.id}">
                        <i class="${section.icon}"></i>
                        <span>${section.label}</span>
                    </button>
                `).join('')}
            </div>
            
            <div class="sidebar-footer">
                <div class="app-info">
                    <div class="app-name">我的加密笔记</div>
                    <div class="app-version">版本 ${Config.APP_VERSION}</div>
                </div>
            </div>
        `;
        
        // 绑定侧边栏事件
        this.bindSidebarEvents();
    }
    
    /**
     * 绑定侧边栏事件
     */
    bindSidebarEvents() {
        const sectionButtons = this.sidebar.querySelectorAll('.sidebar-section');
        sectionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const sectionId = button.dataset.section;
                this.switchSection(sectionId);
            });
        });
    }
    
    /**
     * 切换设置部分
     */
    async switchSection(sectionId) {
        if (this.state.activeSection === sectionId) return;
        
        // 验证当前部分
        if (this.state.isDirty) {
            const save = await this.confirmUnsavedChanges();
            if (save === 'cancel') return;
            if (save === 'save') {
                await this.saveSettings();
            }
        }
        
        // 更新活动部分
        this.state.activeSection = sectionId;
        
        // 更新侧边栏选中状态
        this.updateSidebarSelection();
        
        // 渲染新部分
        await this.renderSection(sectionId);
    }
    
    /**
     * 更新侧边栏选中状态
     */
    updateSidebarSelection() {
        const buttons = this.sidebar.querySelectorAll('.sidebar-section');
        buttons.forEach(button => {
            button.classList.toggle('active', button.dataset.section === this.state.activeSection);
        });
    }
    
    /**
     * 渲染设置部分
     */
    async renderSection(sectionId) {
        this.content.innerHTML = '';
        
        // 显示加载状态
        this.content.innerHTML = '<div class="section-loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';
        
        // 根据部分ID渲染不同内容
        let sectionHtml = '';
        
        switch (sectionId) {
            case 'general':
                sectionHtml = this.renderGeneralSection();
                break;
            case 'editor':
                sectionHtml = this.renderEditorSection();
                break;
            case 'sync':
                sectionHtml = this.renderSyncSection();
                break;
            case 'privacy':
                sectionHtml = this.renderPrivacySection();
                break;
            case 'notifications':
                sectionHtml = this.renderNotificationsSection();
                break;
            case 'advanced':
                sectionHtml = this.renderAdvancedSection();
                break;
            default:
                sectionHtml = '<div class="section-empty">该设置部分尚未实现</div>';
        }
        
        // 渲染内容
        this.content.innerHTML = sectionHtml;
        
        // 初始化表单元素
        await this.initFormElements(sectionId);
        
        // 绑定部分事件
        this.bindSectionEvents(sectionId);
    }
    
    /**
     * 渲染通用设置部分
     */
    renderGeneralSection() {
        const settings = this.state.settings.general;
        
        return `
            <div class="settings-section ${this.options.classes.section || ''}">
                <h2 class="section-title">通用设置</h2>
                <p class="section-description">配置应用的基本行为和外观</p>
                
                <form class="settings-form ${this.options.classes.form || ''}">
                    <!-- 主题设置 -->
                    <div class="form-group">
                        <h3 class="form-group-title">主题</h3>
                        <div class="theme-options">
                            <div class="theme-option ${settings.theme === 'dark' ? 'active' : ''}" data-theme="dark">
                                <div class="theme-preview dark-theme"></div>
                                <div class="theme-label">深色主题</div>
                            </div>
                            <div class="theme-option ${settings.theme === 'light' ? 'active' : ''}" data-theme="light">
                                <div class="theme-preview light-theme"></div>
                                <div class="theme-label">浅色主题</div>
                            </div>
                            <div class="theme-option ${settings.theme === 'auto' ? 'active' : ''}" data-theme="auto">
                                <div class="theme-preview auto-theme"></div>
                                <div class="theme-label">跟随系统</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 语言设置 -->
                    <div class="form-group">
                        <label for="setting-language" class="form-label">语言</label>
                        <select id="setting-language" class="form-control" name="language">
                            <option value="zh-CN" ${settings.language === 'zh-CN' ? 'selected' : ''}>简体中文</option>
                            <option value="en-US" ${settings.language === 'en-US' ? 'selected' : ''}>English</option>
                            <option value="ja-JP" ${settings.language === 'ja-JP' ? 'selected' : ''}>日本語</option>
                        </select>
                    </div>
                    
                    <!-- 时区设置 -->
                    <div class="form-group">
                        <label for="setting-timezone" class="form-label">时区</label>
                        <select id="setting-timezone" class="form-control" name="timezone">
                            ${this.getTimezoneOptions(settings.timezone)}
                        </select>
                    </div>
                    
                    <!-- 日期格式 -->
                    <div class="form-group">
                        <label for="setting-dateFormat" class="form-label">日期显示格式</label>
                        <select id="setting-dateFormat" class="form-control" name="dateFormat">
                            <option value="relative" ${settings.dateFormat === 'relative' ? 'selected' : ''}>相对时间（刚刚，2小时前）</option>
                            <option value="date" ${settings.dateFormat === 'date' ? 'selected' : ''}>完整日期（2024-01-15 14:30）</option>
                            <option value="short" ${settings.dateFormat === 'short' ? 'selected' : ''}>简短格式（1月15日 14:30）</option>
                        </select>
                    </div>
                    
                    <!-- 每页显示数量 -->
                    <div class="form-group">
                        <label for="setting-itemsPerPage" class="form-label">每页显示笔记数量</label>
                        <select id="setting-itemsPerPage" class="form-control" name="itemsPerPage">
                            <option value="10" ${settings.itemsPerPage === 10 ? 'selected' : ''}>10 条</option>
                            <option value="20" ${settings.itemsPerPage === 20 ? 'selected' : ''}>20 条</option>
                            <option value="50" ${settings.itemsPerPage === 50 ? 'selected' : ''}>50 条</option>
                            <option value="100" ${settings.itemsPerPage === 100 ? 'selected' : ''}>100 条</option>
                        </select>
                    </div>
                    
                    <!-- 自动保存 -->
                    <div class="form-group">
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-autoSaveNotes" 
                                   class="form-check-input" 
                                   name="autoSaveNotes"
                                   ${settings.autoSaveNotes ? 'checked' : ''}>
                            <label for="setting-autoSaveNotes" class="form-check-label">
                                自动保存笔记
                            </label>
                        </div>
                        <small class="form-text text-muted">编辑时自动保存笔记更改</small>
                    </div>
                    
                    <!-- 自动保存间隔 -->
                    <div class="form-group">
                        <label for="setting-autoSaveInterval" class="form-label">自动保存间隔（毫秒）</label>
                        <input type="number" 
                               id="setting-autoSaveInterval" 
                               class="form-control" 
                               name="autoSaveInterval"
                               value="${settings.autoSaveInterval}"
                               min="1000" 
                               max="30000" 
                               step="1000"
                               ${!settings.autoSaveNotes ? 'disabled' : ''}>
                    </div>
                </form>
            </div>
        `;
    }
    
    /**
     * 获取时区选项
     */
    getTimezoneOptions(currentTimezone) {
        const timezones = [
            'Asia/Shanghai',
            'Asia/Tokyo',
            'America/New_York',
            'America/Los_Angeles',
            'Europe/London',
            'Europe/Paris',
            'Australia/Sydney',
            'UTC'
        ];
        
        return timezones.map(tz => `
            <option value="${tz}" ${tz === currentTimezone ? 'selected' : ''}>
                ${tz.replace('_', ' ')}
            </option>
        `).join('');
    }
    
    /**
     * 渲染编辑器设置部分
     */
    renderEditorSection() {
        const settings = this.state.settings.editor;
        
        return `
            <div class="settings-section">
                <h2 class="section-title">编辑器设置</h2>
                <p class="section-description">配置笔记编辑器的行为和外观</p>
                
                <form class="settings-form">
                    <!-- 编辑器模式 -->
                    <div class="form-group">
                        <h3 class="form-group-title">编辑器模式</h3>
                        <div class="editor-mode-options">
                            <div class="form-check">
                                <input type="radio" 
                                       id="editor-mode-edit" 
                                       name="mode" 
                                       class="form-check-input" 
                                       value="edit"
                                       ${settings.mode === 'edit' ? 'checked' : ''}>
                                <label for="editor-mode-edit" class="form-check-label">
                                    <i class="fas fa-edit"></i>
                                    仅编辑
                                </label>
                            </div>
                            <div class="form-check">
                                <input type="radio" 
                                       id="editor-mode-split" 
                                       name="mode" 
                                       class="form-check-input" 
                                       value="split"
                                       ${settings.mode === 'split' ? 'checked' : ''}>
                                <label for="editor-mode-split" class="form-check-label">
                                    <i class="fas fa-columns"></i>
                                    分割视图
                                </label>
                            </div>
                            <div class="form-check">
                                <input type="radio" 
                                       id="editor-mode-preview" 
                                       name="mode" 
                                       class="form-check-input" 
                                       value="preview"
                                       ${settings.mode === 'preview' ? 'checked' : ''}>
                                <label for="editor-mode-preview" class="form-check-label">
                                    <i class="fas fa-eye"></i>
                                    仅预览
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 字体设置 -->
                    <div class="form-group">
                        <label for="setting-fontSize" class="form-label">字体大小（像素）</label>
                        <input type="number" 
                               id="setting-fontSize" 
                               class="form-control" 
                               name="fontSize"
                               value="${settings.fontSize}"
                               min="8" 
                               max="32" 
                               step="1">
                    </div>
                    
                    <div class="form-group">
                        <label for="setting-fontFamily" class="form-label">字体家族</label>
                        <input type="text" 
                               id="setting-fontFamily" 
                               class="form-control" 
                               name="fontFamily"
                               value="${settings.fontFamily}"
                               placeholder="例如: 'Consolas', 'Monaco', 'Courier New', monospace">
                    </div>
                    
                    <div class="form-group">
                        <label for="setting-lineHeight" class="form-label">行高</label>
                        <input type="number" 
                               id="setting-lineHeight" 
                               class="form-control" 
                               name="lineHeight"
                               value="${settings.lineHeight}"
                               min="1" 
                               max="3" 
                               step="0.1">
                    </div>
                    
                    <!-- Tab设置 -->
                    <div class="form-group">
                        <label for="setting-tabSize" class="form-label">Tab大小（空格数）</label>
                        <input type="number" 
                               id="setting-tabSize" 
                               class="form-control" 
                               name="tabSize"
                               value="${settings.tabSize}"
                               min="1" 
                               max="8" 
                               step="1">
                    </div>
                    
                    <!-- 编辑器选项 -->
                    <div class="form-group">
                        <h3 class="form-group-title">编辑器选项</h3>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-wordWrap" 
                                   class="form-check-input" 
                                   name="wordWrap"
                                   ${settings.wordWrap ? 'checked' : ''}>
                            <label for="setting-wordWrap" class="form-check-label">
                                自动换行
                            </label>
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-lineNumbers" 
                                   class="form-check-input" 
                                   name="lineNumbers"
                                   ${settings.lineNumbers ? 'checked' : ''}>
                            <label for="setting-lineNumbers" class="form-check-label">
                                显示行号
                            </label>
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-minimap" 
                                   class="form-check-input" 
                                   name="minimap"
                                   ${settings.minimap ? 'checked' : ''}>
                            <label for="setting-minimap" class="form-check-label">
                                显示代码缩略图
                            </label>
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-spellCheck" 
                                   class="form-check-input" 
                                   name="spellCheck"
                                   ${settings.spellCheck ? 'checked' : ''}>
                            <label for="setting-spellCheck" class="form-check-label">
                                拼写检查
                            </label>
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-autoCloseTags" 
                                   class="form-check-input" 
                                   name="autoCloseTags"
                                   ${settings.autoCloseTags ? 'checked' : ''}>
                            <label for="setting-autoCloseTags" class="form-check-label">
                                自动闭合标签
                            </label>
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-emmet" 
                                   class="form-check-input" 
                                   name="emmet"
                                   ${settings.emmet ? 'checked' : ''}>
                            <label for="setting-emmet" class="form-check-label">
                                启用 Emmet 缩写
                            </label>
                        </div>
                    </div>
                </form>
            </div>
        `;
    }
    
    /**
     * 渲染同步设置部分
     */
    renderSyncSection() {
        const settings = this.state.settings.sync;
        
        return `
            <div class="settings-section">
                <h2 class="section-title">同步设置</h2>
                <p class="section-description">配置数据同步选项和备份设置</p>
                
                <form class="settings-form">
                    <!-- 自动同步 -->
                    <div class="form-group">
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-autoSync" 
                                   class="form-check-input" 
                                   name="autoSync"
                                   ${settings.autoSync ? 'checked' : ''}>
                            <label for="setting-autoSync" class="form-check-label">
                                启用自动同步
                            </label>
                        </div>
                        <small class="form-text text-muted">自动将本地更改同步到服务器</small>
                    </div>
                    
                    <!-- 同步间隔 -->
                    <div class="form-group">
                        <label for="setting-syncInterval" class="form-label">同步间隔（秒）</label>
                        <input type="number" 
                               id="setting-syncInterval" 
                               class="form-control" 
                               name="syncInterval"
                               value="${settings.syncInterval}"
                               min="10" 
                               max="3600" 
                               step="10"
                               ${!settings.autoSync ? 'disabled' : ''}>
                    </div>
                    
                    <!-- 仅WiFi同步 -->
                    <div class="form-group">
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-wifiOnly" 
                                   class="form-check-input" 
                                   name="wifiOnly"
                                   ${settings.wifiOnly ? 'checked' : ''}>
                            <label for="setting-wifiOnly" class="form-check-label">
                                仅WiFi下同步
                            </label>
                        </div>
                    </div>
                    
                    <!-- 启动时同步 -->
                    <div class="form-group">
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-syncOnStartup" 
                                   class="form-check-input" 
                                   name="syncOnStartup"
                                   ${settings.syncOnStartup ? 'checked' : ''}>
                            <label for="setting-syncOnStartup" class="form-check-label">
                                启动时自动同步
                            </label>
                        </div>
                    </div>
                    
                    <!-- 同步内容 -->
                    <div class="form-group">
                        <h3 class="form-group-title">同步内容</h3>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-syncNotes" 
                                   class="form-check-input" 
                                   name="syncNotes"
                                   ${settings.syncNotes ? 'checked' : ''}>
                            <label for="setting-syncNotes" class="form-check-label">
                                同步笔记
                            </label>
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-syncCategories" 
                                   class="form-check-input" 
                                   name="syncCategories"
                                   ${settings.syncCategories ? 'checked' : ''}>
                            <label for="setting-syncCategories" class="form-check-label">
                                同步分类
                            </label>
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-syncAttachments" 
                                   class="form-check-input" 
                                   name="syncAttachments"
                                   ${settings.syncAttachments ? 'checked' : ''}>
                            <label for="setting-syncAttachments" class="form-check-label">
                                同步附件
                            </label>
                        </div>
                    </div>
                    
                    <!-- 冲突解决 -->
                    <div class="form-group">
                        <label for="setting-conflictResolution" class="form-label">冲突解决策略</label>
                        <select id="setting-conflictResolution" class="form-control" name="conflictResolution">
                            <option value="server" ${settings.conflictResolution === 'server' ? 'selected' : ''}>使用服务器版本</option>
                            <option value="local" ${settings.conflictResolution === 'local' ? 'selected' : ''}>使用本地版本</option>
                            <option value="newest" ${settings.conflictResolution === 'newest' ? 'selected' : ''}>使用最新版本</option>
                        </select>
                        <small class="form-text text-muted">当本地和服务器数据冲突时的处理方式</small>
                    </div>
                    
                    <!-- 手动同步 -->
                    <div class="form-group">
                        <h3 class="form-group-title">手动操作</h3>
                        <div class="manual-actions">
                            <button type="button" class="btn btn-primary btn-sync-now">
                                <i class="fas fa-sync-alt"></i>
                                立即同步
                            </button>
                            <button type="button" class="btn btn-secondary btn-view-sync-queue">
                                <i class="fas fa-list"></i>
                                查看同步队列
                            </button>
                            <button type="button" class="btn btn-secondary btn-clear-sync-queue">
                                <i class="fas fa-trash"></i>
                                清空同步队列
                            </button>
                        </div>
                    </div>
                    
                    <!-- 同步状态 -->
                    <div class="form-group">
                        <h3 class="form-group-title">同步状态</h3>
                        <div class="sync-status">
                            <div class="status-item">
                                <span class="status-label">最后同步时间:</span>
                                <span class="status-value" id="last-sync-time">${this.getLastSyncTime()}</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">待同步项目:</span>
                                <span class="status-value" id="pending-sync-count">0</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">同步错误:</span>
                                <span class="status-value" id="sync-error-count">0</span>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        `;
    }
    
    /**
     * 获取最后同步时间
     */
    getLastSyncTime() {
        const lastSync = Utils.storage.get('lastSyncTime');
        if (!lastSync) return '从未同步';
        
        const date = new Date(lastSync);
        return date.toLocaleString();
    }
    
    /**
     * 渲染隐私设置部分
     */
    renderPrivacySection() {
        const settings = this.state.settings.privacy;
        
        return `
            <div class="settings-section">
                <h2 class="section-title">隐私与安全</h2>
                <p class="section-description">配置数据加密和隐私保护选项</p>
                
                <form class="settings-form">
                    <!-- 加密设置 -->
                    <div class="form-group">
                        <h3 class="form-group-title">加密设置</h3>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-encryptByDefault" 
                                   class="form-check-input" 
                                   name="encryptByDefault"
                                   ${settings.encryptByDefault ? 'checked' : ''}>
                            <label for="setting-encryptByDefault" class="form-check-label">
                                默认启用加密
                            </label>
                            <small class="form-text text-muted">新建笔记时默认启用端对端加密</small>
                        </div>
                    </div>
                    
                    <!-- 自动锁定 -->
                    <div class="form-group">
                        <h3 class="form-group-title">自动锁定</h3>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-lockOnMinimize" 
                                   class="form-check-input" 
                                   name="lockOnMinimize"
                                   ${settings.lockOnMinimize ? 'checked' : ''}>
                            <label for="setting-lockOnMinimize" class="form-check-label">
                                应用最小化时锁定
                            </label>
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-autoLock" 
                                   class="form-check-input" 
                                   name="autoLock"
                                   ${settings.autoLock ? 'checked' : ''}>
                            <label for="setting-autoLock" class="form-check-label">
                                闲置时自动锁定
                            </label>
                        </div>
                        
                        ${settings.autoLock ? `
                            <div class="form-group">
                                <label for="setting-autoLockTimeout" class="form-label">自动锁定时间（秒）</label>
                                <input type="number" 
                                       id="setting-autoLockTimeout" 
                                       class="form-control" 
                                       name="autoLockTimeout"
                                       value="${settings.autoLockTimeout}"
                                       min="60" 
                                       max="86400" 
                                       step="60">
                            </div>
                        ` : ''}
                        
                        <div class="form-group">
                            <label for="setting-lockTimeout" class="form-label">解锁超时时间（秒）</label>
                            <input type="number" 
                                   id="setting-lockTimeout" 
                                   class="form-control" 
                                   name="lockTimeout"
                                   value="${settings.lockTimeout}"
                                   min="0" 
                                   max="3600" 
                                   step="10">
                            <small class="form-text text-muted">0表示立即锁定，无需等待</small>
                        </div>
                    </div>
                    
                    <!-- 剪贴板安全 -->
                    <div class="form-group">
                        <h3 class="form-group-title">剪贴板安全</h3>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-clearClipboard" 
                                   class="form-check-input" 
                                   name="clearClipboard"
                                   ${settings.clearClipboard ? 'checked' : ''}>
                            <label for="setting-clearClipboard" class="form-check-label">
                                复制后清空剪贴板
                            </label>
                        </div>
                        
                        ${settings.clearClipboard ? `
                            <div class="form-group">
                                <label for="setting-clipboardTimeout" class="form-label">剪贴板清空延迟（秒）</label>
                                <input type="number" 
                                       id="setting-clipboardTimeout" 
                                       class="form-control" 
                                       name="clipboardTimeout"
                                       value="${settings.clipboardTimeout}"
                                       min="1" 
                                       max="300" 
                                       step="1">
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- 安全操作 -->
                    <div class="form-group">
                        <h3 class="form-group-title">安全操作</h3>
                        <div class="security-actions">
                            <button type="button" class="btn btn-secondary btn-export-keys">
                                <i class="fas fa-key"></i>
                                导出加密密钥
                            </button>
                            <button type="button" class="btn btn-secondary btn-change-password">
                                <i class="fas fa-lock"></i>
                                修改主密码
                            </button>
                            <button type="button" class="btn btn-secondary btn-view-audit-log">
                                <i class="fas fa-history"></i>
                                查看安全日志
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        `;
    }
    
    /**
     * 渲染通知设置部分
     */
    renderNotificationsSection() {
        const settings = this.state.settings.notifications;
        
        return `
            <div class="settings-section">
                <h2 class="section-title">通知设置</h2>
                <p class="section-description">配置应用通知和提醒选项</p>
                
                <form class="settings-form">
                    <!-- 通知开关 -->
                    <div class="form-group">
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-notificationsEnabled" 
                                   class="form-check-input" 
                                   name="enabled"
                                   ${settings.enabled ? 'checked' : ''}>
                            <label for="setting-notificationsEnabled" class="form-check-label">
                                启用通知
                            </label>
                        </div>
                    </div>
                    
                    <!-- 通知类型 -->
                    <div class="form-group">
                        <h3 class="form-group-title">通知类型</h3>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-sounds" 
                                   class="form-check-input" 
                                   name="sounds"
                                   ${settings.sounds ? 'checked' : ''}>
                            <label for="setting-sounds" class="form-check-label">
                                提示音
                            </label>
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-desktop" 
                                   class="form-check-input" 
                                   name="desktop"
                                   ${settings.desktop ? 'checked' : ''}>
                            <label for="setting-desktop" class="form-check-label">
                                桌面通知
                            </label>
                            <small class="form-text text-muted">允许应用发送桌面通知（需要浏览器权限）</small>
                        </div>
                    </div>
                    
                    <!-- 具体通知 -->
                    <div class="form-group">
                        <h3 class="form-group-title">具体通知类型</h3>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-syncComplete" 
                                   class="form-check-input" 
                                   name="syncComplete"
                                   ${settings.syncComplete ? 'checked' : ''}>
                            <label for="setting-syncComplete" class="form-check-label">
                                同步完成通知
                            </label>
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-backupReminder" 
                                   class="form-check-input" 
                                   name="backupReminder"
                                   ${settings.backupReminder ? 'checked' : ''}>
                            <label for="setting-backupReminder" class="form-check-label">
                                备份提醒
                            </label>
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-updateAvailable" 
                                   class="form-check-input" 
                                   name="updateAvailable"
                                   ${settings.updateAvailable ? 'checked' : ''}>
                            <label for="setting-updateAvailable" class="form-check-label">
                                更新通知
                            </label>
                        </div>
                    </div>
                    
                    <!-- 免打扰 -->
                    <div class="form-group">
                        <h3 class="form-group-title">免打扰时段</h3>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-quietHours" 
                                   class="form-check-input" 
                                   name="quietHours"
                                   ${settings.quietHours ? 'checked' : ''}>
                            <label for="setting-quietHours" class="form-check-label">
                                启用免打扰时段
                            </label>
                        </div>
                        
                        ${settings.quietHours ? `
                            <div class="quiet-hours-settings">
                                <div class="form-row">
                                    <div class="col">
                                        <label for="setting-quietStart" class="form-label">开始时间</label>
                                        <input type="time" 
                                               id="setting-quietStart" 
                                               class="form-control" 
                                               name="quietStart"
                                               value="${settings.quietStart}">
                                    </div>
                                    <div class="col">
                                        <label for="setting-quietEnd" class="form-label">结束时间</label>
                                        <input type="time" 
                                               id="setting-quietEnd" 
                                               class="form-control" 
                                               name="quietEnd"
                                               value="${settings.quietEnd}">
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- 测试通知 -->
                    <div class="form-group">
                        <h3 class="form-group-title">测试通知</h3>
                        <button type="button" class="btn btn-secondary btn-test-notification">
                            <i class="fas fa-bell"></i>
                            发送测试通知
                        </button>
                        <small class="form-text text-muted">测试通知功能是否正常工作</small>
                    </div>
                </form>
            </div>
        `;
    }
    
    /**
     * 渲染高级设置部分
     */
    renderAdvancedSection() {
        const settings = this.state.settings.advanced;
        
        return `
            <div class="settings-section">
                <h2 class="section-title">高级设置</h2>
                <p class="section-description">配置高级选项和开发者设置</p>
                
                <form class="settings-form">
                    <!-- 开发者选项 -->
                    <div class="form-group">
                        <h3 class="form-group-title">开发者选项</h3>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-debugMode" 
                                   class="form-check-input" 
                                   name="debugMode"
                                   ${settings.debugMode ? 'checked' : ''}>
                            <label for="setting-debugMode" class="form-check-label">
                                调试模式
                            </label>
                            <small class="form-text text-muted">在控制台输出详细日志</small>
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-developerMode" 
                                   class="form-check-input" 
                                   name="developerMode"
                                   ${settings.developerMode ? 'checked' : ''}>
                            <label for="setting-developerMode" class="form-check-label">
                                开发者模式
                            </label>
                            <small class="form-text text-muted">显示开发者工具和选项</small>
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-experimentalFeatures" 
                                   class="form-check-input" 
                                   name="experimentalFeatures"
                                   ${settings.experimentalFeatures ? 'checked' : ''}>
                            <label for="setting-experimentalFeatures" class="form-check-label">
                                实验性功能
                            </label>
                            <small class="form-text text-muted">启用可能不稳定的实验性功能</small>
                        </div>
                    </div>
                    
                    <!-- 日志设置 -->
                    <div class="form-group">
                        <label for="setting-logLevel" class="form-label">日志级别</label>
                        <select id="setting-logLevel" class="form-control" name="logLevel">
                            <option value="debug" ${settings.logLevel === 'debug' ? 'selected' : ''}>调试</option>
                            <option value="info" ${settings.logLevel === 'info' ? 'selected' : ''}>信息</option>
                            <option value="warn" ${settings.logLevel === 'warn' ? 'selected' : ''}>警告</option>
                            <option value="error" ${settings.logLevel === 'error' ? 'selected' : ''}>错误</option>
                        </select>
                    </div>
                    
                    <!-- 备份设置 -->
                    <div class="form-group">
                        <h3 class="form-group-title">备份设置</h3>
                        
                        <div class="form-group">
                            <label for="setting-maxBackupCount" class="form-label">最大备份数量</label>
                            <input type="number" 
                                   id="setting-maxBackupCount" 
                                   class="form-control" 
                                   name="maxBackupCount"
                                   value="${settings.maxBackupCount}"
                                   min="1" 
                                   max="100" 
                                   step="1">
                        </div>
                        
                        <div class="form-group">
                            <label for="setting-backupInterval" class="form-label">备份间隔（秒）</label>
                            <input type="number" 
                                   id="setting-backupInterval" 
                                   class="form-control" 
                                   name="backupInterval"
                                   value="${settings.backupInterval}"
                                   min="3600" 
                                   max="2592000" 
                                   step="3600">
                        </div>
                    </div>
                    
                    <!-- 缓存设置 -->
                    <div class="form-group">
                        <h3 class="form-group-title">缓存设置</h3>
                        
                        <div class="form-group">
                            <label for="setting-cacheSize" class="form-label">缓存大小（MB）</label>
                            <input type="number" 
                                   id="setting-cacheSize" 
                                   class="form-control" 
                                   name="cacheSize"
                                   value="${settings.cacheSize}"
                                   min="10" 
                                   max="1000" 
                                   step="10">
                        </div>
                        
                        <div class="form-check">
                            <input type="checkbox" 
                                   id="setting-clearCacheOnExit" 
                                   class="form-check-input" 
                                   name="clearCacheOnExit"
                                   ${settings.clearCacheOnExit ? 'checked' : ''}>
                            <label for="setting-clearCacheOnExit" class="form-check-label">
                                退出时清空缓存
                            </label>
                        </div>
                    </div>
                    
                    <!-- 数据管理 -->
                    <div class="form-group">
                        <h3 class="form-group-title">数据管理</h3>
                        <div class="data-actions">
                            <button type="button" class="btn btn-secondary btn-export-data">
                                <i class="fas fa-download"></i>
                                导出所有数据
                            </button>
                            <button type="button" class="btn btn-secondary btn-import-data">
                                <i class="fas fa-upload"></i>
                                导入数据
                            </button>
                            <button type="button" class="btn btn-danger btn-clear-data">
                                <i class="fas fa-trash"></i>
                                清除所有数据
                            </button>
                        </div>
                    </div>
                    
                    <!-- 重置设置 -->
                    <div class="form-group">
                        <h3 class="form-group-title">重置设置</h3>
                        <button type="button" class="btn btn-warning btn-reset-settings">
                            <i class="fas fa-redo"></i>
                            重置为默认设置
                        </button>
                        <small class="form-text text-muted">将所有设置恢复为默认值</small>
                    </div>
                </form>
            </div>
        `;
    }
    
    /**
     * 初始化表单元素
     */
    async initFormElements(sectionId) {
        // 清除之前的表单元素
        this.formElements.clear();
        
        const form = this.content.querySelector('.settings-form');
        if (!form) return;
        
        // 获取所有表单元素
        const inputs = form.querySelectorAll('input, select, textarea, button');
        
        inputs.forEach(input => {
            const name = input.name || input.id;
            if (name) {
                this.formElements.set(name, input);
                
                // 绑定输入事件
                if (input.tagName === 'INPUT' || input.tagName === 'SELECT' || input.tagName === 'TEXTAREA') {
                    input.addEventListener('change', () => this.handleSettingChange());
                    input.addEventListener('input', () => this.handleSettingChange());
                }
            }
        });
        
        // 初始化特定部分的元素
        switch (sectionId) {
            case 'general':
                this.initGeneralElements();
                break;
            case 'sync':
                this.initSyncElements();
                break;
            case 'privacy':
                this.initPrivacyElements();
                break;
            case 'notifications':
                this.initNotificationElements();
                break;
            case 'advanced':
                this.initAdvancedElements();
                break;
        }
    }
    
    /**
     * 初始化通用元素
     */
    initGeneralElements() {
        // 主题选项
        const themeOptions = this.content.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                this.formElements.get('theme').value = theme;
                
                // 更新选中状态
                themeOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                // 立即应用主题
                document.documentElement.className = theme;
                
                this.handleSettingChange();
            });
        });
        
        // 自动保存切换
        const autoSaveCheckbox = this.formElements.get('autoSaveNotes');
        const autoSaveInterval = this.formElements.get('autoSaveInterval');
        
        if (autoSaveCheckbox && autoSaveInterval) {
            autoSaveCheckbox.addEventListener('change', () => {
                autoSaveInterval.disabled = !autoSaveCheckbox.checked;
            });
        }
    }
    
    /**
     * 初始化同步元素
     */
    initSyncElements() {
        // 自动同步切换
        const autoSyncCheckbox = this.formElements.get('autoSync');
        const syncInterval = this.formElements.get('syncInterval');
        
        if (autoSyncCheckbox && syncInterval) {
            autoSyncCheckbox.addEventListener('change', () => {
                syncInterval.disabled = !autoSyncCheckbox.checked;
            });
        }
        
        // 立即同步按钮
        const syncNowBtn = this.content.querySelector('.btn-sync-now');
        if (syncNowBtn) {
            syncNowBtn.addEventListener('click', () => this.syncNow());
        }
    }
    
    /**
     * 初始化隐私元素
     */
    initPrivacyElements() {
        // 自动锁定切换
        const autoLockCheckbox = this.formElements.get('autoLock');
        const autoLockTimeout = this.formElements.get('autoLockTimeout');
        
        if (autoLockCheckbox && autoLockTimeout) {
            autoLockCheckbox.addEventListener('change', () => {
                autoLockTimeout.disabled = !autoLockCheckbox.checked;
            });
        }
        
        // 剪贴板清空切换
        const clearClipboardCheckbox = this.formElements.get('clearClipboard');
        const clipboardTimeout = this.formElements.get('clipboardTimeout');
        
        if (clearClipboardCheckbox && clipboardTimeout) {
            clearClipboardCheckbox.addEventListener('change', () => {
                clipboardTimeout.disabled = !clearClipboardCheckbox.checked;
            });
        }
    }
    
    /**
     * 初始化通知元素
     */
    initNotificationElements() {
        // 免打扰时段切换
        const quietHoursCheckbox = this.formElements.get('quietHours');
        const quietStart = this.formElements.get('quietStart');
        const quietEnd = this.formElements.get('quietEnd');
        
        if (quietHoursCheckbox) {
            quietHoursCheckbox.addEventListener('change', () => {
                if (quietStart) quietStart.disabled = !quietHoursCheckbox.checked;
                if (quietEnd) quietEnd.disabled = !quietHoursCheckbox.checked;
            });
        }
    }
    
    /**
     * 初始化高级元素
     */
    initAdvancedElements() {
        // 暂无特殊初始化
    }
    
    /**
     * 绑定部分事件
     */
    bindSectionEvents(sectionId) {
        const form = this.content.querySelector('.settings-form');
        if (!form) return;
        
        // 绑定按钮事件
        const buttons = form.querySelectorAll('button[type="button"]');
        buttons.forEach(button => {
            if (button.classList.contains('btn-sync-now')) {
                button.addEventListener('click', () => this.syncNow());
            } else if (button.classList.contains('btn-test-notification')) {
                button.addEventListener('click', () => this.testNotification());
            } else if (button.classList.contains('btn-export-data')) {
                button.addEventListener('click', () => this.exportData());
            } else if (button.classList.contains('btn-import-data')) {
                button.addEventListener('click', () => this.importData());
            } else if (button.classList.contains('btn-clear-data')) {
                button.addEventListener('click', () => this.clearData());
            } else if (button.classList.contains('btn-reset-settings')) {
                button.addEventListener('click', () => this.resetSettings());
            }
        });
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 保存按钮
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.saveSettings());
        }
        
        // 放弃按钮
        if (this.discardBtn) {
            this.discardBtn.addEventListener('click', () => this.discardChanges());
        }
        
        // 设置菜单按钮
        if (this.settingsMenuBtn) {
            this.settingsMenuBtn.addEventListener('click', () => this.showSettingsMenu());
        }
    }
    
    /**
     * 处理设置变化
     */
    handleSettingChange() {
        if (!this.state.isDirty) {
            this.state.isDirty = true;
            this.updateSaveButtons();
        }
        
        // 自动保存
        if (this.options.autoSave) {
            this.debounceSave();
        }
        
        // 收集设置值
        this.collectFormValues();
    }
    
    /**
     * 收集表单值
     */
    collectFormValues() {
        const form = this.content.querySelector('.settings-form');
        if (!form) return;
        
        const section = this.state.activeSection;
        const formData = new FormData(form);
        
        // 更新设置对象
        for (const [key, value] of formData.entries()) {
            if (this.state.settings[section] && key in this.state.settings[section]) {
                // 类型转换
                let typedValue = value;
                
                if (typeof this.state.settings[section][key] === 'boolean') {
                    typedValue = value === 'on' || value === 'true';
                } else if (typeof this.state.settings[section][key] === 'number') {
                    typedValue = Number(value);
                }
                
                this.state.settings[section][key] = typedValue;
            }
        }
    }
    
    /**
     * 防抖保存
     */
    debounceSave() {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveSettings();
        }, this.options.saveDelay);
    }
    
    /**
     * 更新保存按钮状态
     */
    updateSaveButtons() {
        if (this.saveBtn) {
            this.saveBtn.disabled = !this.state.isDirty;
        }
        if (this.discardBtn) {
            this.discardBtn.disabled = !this.state.isDirty;
        }
    }
    
    /**
     * 确认未保存的更改
     */
    async confirmUnsavedChanges() {
        return new Promise((resolve) => {
            Modal.confirm({
                title: '未保存的更改',
                message: '当前设置已修改但未保存，是否要保存更改？',
                confirmText: '保存',
                cancelText: '不保存',
                onConfirm: () => resolve('save'),
                onCancel: () => resolve('discard'),
                onClose: () => resolve('cancel')
            });
        });
    }
    
    /**
     * 保存设置
     */
    async saveSettings() {
        if (this.state.isSaving || !this.state.isDirty) return;
        
        this.state.isSaving = true;
        
        // 显示加载状态
        const originalText = this.saveBtn.innerHTML;
        this.saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
        this.saveBtn.disabled = true;
        
        try {
            // 验证设置
            if (!this.validateSettings()) {
                throw new Error('设置验证失败');
            }
            
            // 保存到本地存储
            for (const [section, settings] of Object.entries(this.state.settings)) {
                for (const [key, value] of Object.entries(settings)) {
                    Utils.storage.set(`${section}.${key}`, value);
                }
            }
            
            // 保存到服务器
            if (Config.isOnline()) {
                await Api.settings.update(this.state.settings);
            } else {
                await OfflineManager.addToQueue('update_settings', this.state.settings);
            }
            
            // 更新状态
            this.state.isDirty = false;
            this.state.isSaving = false;
            this.state.originalSettings = Utils.deepClone(this.state.settings);
            
            // 更新按钮状态
            this.updateSaveButtons();
            
            // 触发保存回调
            if (this.options.onSave) {
                await this.options.onSave(this.state.settings, this);
            }
            
            // 触发设置保存事件
            document.dispatchEvent(new CustomEvent('settings:saved', {
                detail: { settings: this.state.settings }
            }));
            
            // 显示成功消息
            Notify.success('设置保存成功');
            
            console.log('[设置页面] 设置保存成功');
            
        } catch (error) {
            console.error('[设置页面] 保存设置失败:', error);
            
            // 显示错误消息
            Notify.error('保存设置失败', error.message);
            
            this.state.isSaving = false;
            
        } finally {
            // 恢复按钮状态
            this.saveBtn.innerHTML = originalText;
            this.saveBtn.disabled = !this.state.isDirty;
        }
    }
    
    /**
     * 验证设置
     */
    validateSettings() {
        this.state.validationErrors = {};
        
        // 这里可以添加具体的验证逻辑
        // 例如：检查数值范围、必填字段等
        
        return Object.keys(this.state.validationErrors).length === 0;
    }
    
    /**
     * 放弃更改
     */
    discardChanges() {
        if (!this.state.isDirty) return;
        
        Modal.confirm({
            title: '放弃更改',
            message: '确定要放弃所有未保存的更改吗？',
            confirmText: '放弃',
            confirmType: 'danger',
            onConfirm: () => {
                // 恢复原始设置
                this.state.settings = Utils.deepClone(this.state.originalSettings);
                this.state.isDirty = false;
                
                // 重新渲染当前部分
                this.renderSection(this.state.activeSection);
                
                // 更新按钮状态
                this.updateSaveButtons();
                
                Notify.info('已放弃更改');
            }
        });
    }
    
    /**
     * 显示设置菜单
     */
    showSettingsMenu() {
        // 这里可以显示一个下拉菜单
        // 包含：导入设置、导出设置、重置设置等选项
        console.log('[设置页面] 显示设置菜单');
    }
    
    /**
     * 立即同步
     */
    async syncNow() {
        try {
            Notify.info('开始同步...');
            
            // 触发同步事件
            document.dispatchEvent(new CustomEvent('sync:manual'));
            
        } catch (error) {
            console.error('[设置页面] 同步失败:', error);
            Notify.error('同步失败', error.message);
        }
    }
    
    /**
     * 测试通知
     */
    testNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('我的加密笔记', {
                body: '这是一个测试通知',
                icon: '/assets/images/icons/icon-192x192.png'
            });
            Notify.success('测试通知已发送');
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('我的加密笔记', {
                        body: '这是一个测试通知',
                        icon: '/assets/images/icons/icon-192x192.png'
                    });
                    Notify.success('测试通知已发送');
                }
            });
        } else {
            Notify.error('通知权限被拒绝', '请在浏览器设置中启用通知权限');
        }
    }
    
    /**
     * 导出数据
     */
    async exportData() {
        try {
            const data = {
                settings: this.state.settings,
                version: Config.APP_VERSION,
                exportDate: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `my-encrypted-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            Notify.success('数据导出成功');
            
        } catch (error) {
            console.error('[设置页面] 导出数据失败:', error);
            Notify.error('导出数据失败', error.message);
        }
    }
    
    /**
     * 导入数据
     */
    async importData() {
        Modal.confirm({
            title: '导入数据',
            message: '导入数据将覆盖当前设置，是否继续？',
            confirmText: '导入',
            confirmType: 'warning',
            onConfirm: async () => {
                try {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    
                    input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        
                        const loader = Loader.wrap(async () => {
                            const text = await file.text();
                            const data = JSON.parse(text);
                            
                            // 验证数据格式
                            if (!data.settings || !data.version) {
                                throw new Error('无效的数据文件格式');
                            }
                            
                            // 更新设置
                            this.state.settings = data.settings;
                            this.state.isDirty = true;
                            
                            // 重新渲染所有部分
                            await this.renderSection(this.state.activeSection);
                            
                            // 更新按钮状态
                            this.updateSaveButtons();
                            
                            // 触发导入回调
                            if (this.options.onImport) {
                                await this.options.onImport(data, this);
                            }
                            
                            Notify.success('数据导入成功');
                        }, {
                            text: '导入数据中...',
                            successText: '导入完成'
                        });
                        
                        await loader();
                    };
                    
                    input.click();
                    
                } catch (error) {
                    console.error('[设置页面] 导入数据失败:', error);
                    Notify.error('导入数据失败', error.message);
                }
            }
        });
    }
    
    /**
     * 清除数据
     */
    async clearData() {
        Modal.confirm({
            title: '清除所有数据',
            message: '此操作将清除所有本地数据，包括笔记、设置等，且不可恢复。确定要继续吗？',
            confirmText: '清除',
            confirmType: 'danger',
            onConfirm: async () => {
                try {
                    // 清除本地存储
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    // 清除 IndexedDB
                    const databases = await indexedDB.databases();
                    for (const db of databases) {
                        if (db.name) {
                            indexedDB.deleteDatabase(db.name);
                        }
                    }
                    
                    Notify.success('数据已清除，页面将重新加载');
                    
                    // 重新加载页面
                    setTimeout(() => location.reload(), 2000);
                    
                } catch (error) {
                    console.error('[设置页面] 清除数据失败:', error);
                    Notify.error('清除数据失败', error.message);
                }
            }
        });
    }
    
    /**
     * 重置设置
     */
    async resetSettings() {
        Modal.confirm({
            title: '重置设置',
            message: '确定要将所有设置恢复为默认值吗？',
            confirmText: '重置',
            confirmType: 'warning',
            onConfirm: async () => {
                try {
                    // 获取默认设置
                    const defaultSettings = this.getDefaultSettings();
                    
                    // 更新设置
                    this.state.settings = defaultSettings;
                    this.state.isDirty = true;
                    
                    // 重新渲染当前部分
                    await this.renderSection(this.state.activeSection);
                    
                    // 更新按钮状态
                    this.updateSaveButtons();
                    
                    // 触发重置回调
                    if (this.options.onReset) {
                        await this.options.onReset(defaultSettings, this);
                    }
                    
                    Notify.success('设置已重置为默认值');
                    
                } catch (error) {
                    console.error('[设置页面] 重置设置失败:', error);
                    Notify.error('重置设置失败', error.message);
                }
            }
        });
    }
    
    /**
     * 获取默认设置
     */
    getDefaultSettings() {
        // 创建一个新的设置对象实例
        const page = new SettingsPage(this.app);
        return page.state.settings;
    }
    
    /**
     * 获取当前设置
     */
    getSettings() {
        return this.state.settings;
    }
    
    /**
     * 获取特定设置
     */
    getSetting(section, key) {
        return this.state.settings[section]?.[key];
    }
    
    /**
     * 更新特定设置
     */
    updateSetting(section, key, value) {
        if (this.state.settings[section]) {
            this.state.settings[section][key] = value;
            this.state.isDirty = true;
            this.updateSaveButtons();
        }
    }
    
    /**
     * 页面显示时的回调
     */
    onShow() {
        console.log('[设置页面] 页面显示');
        
        // 检查是否有更新
        this.checkForUpdates();
    }
    
    /**
     * 页面隐藏时的回调
     */
    onHide() {
        console.log('[设置页面] 页面隐藏');
        
        // 保存未保存的更改
        if (this.state.isDirty) {
            this.saveSettings();
        }
    }
    
    /**
     * 检查更新
     */
    async checkForUpdates() {
        if (!Config.isOnline()) return;
        
        try {
            const response = await fetch('/version.json?' + Date.now());
            const data = await response.json();
            
            if (data.version !== Config.APP_VERSION) {
                Notify.info('有新版本可用', '点击重新加载页面以更新');
            }
        } catch (error) {
            // 忽略错误
        }
    }
    
    /**
     * 销毁页面
     */
    destroy() {
        // 清除定时器
        clearTimeout(this.saveTimeout);
        
        // 从DOM移除
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // 清理引用
        this.container = null;
        this.sidebar = null;
        this.content = null;
        this.formElements.clear();
        
        console.log('[设置页面] 已销毁');
    }
}
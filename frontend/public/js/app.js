/**
 * 主应用逻辑
 * 版本：v2.2.1 - 完全匹配线上加密核心
 * 适配：您的线上加密算法和草稿系统
 */

import { api } from './api.js';
import { encryption } from './encryption.js';
import { utils } from './utils.js';
import { components } from './components.js';

// 全局状态（与您的线上系统完全一致）
let userId = null;
let masterKey = null;
let isLocked = false;
let currentNoteId = null;
let currentCategoryId = null;
let notes = [];
let categories = [];

// 初始化应用
document.addEventListener('DOMContentLoaded', async () => {
  // 检查登录状态
  const token = localStorage.getItem('token');
  const storedMasterKey = localStorage.getItem('masterKey');
  const storedUserId = localStorage.getItem('userId');

  if (token && storedMasterKey && storedUserId) {
    try {
      // 验证令牌
      const result = await api.auth.refresh();
      
      // 初始化全局状态
      userId = storedUserId;
      masterKey = storedMasterKey;
      
      // 加载数据
      await loadInitialData();
      
      // 初始化应用
      initApp();
    } catch (error) {
      // 令牌无效，跳转到登录页
      localStorage.removeItem('token');
      localStorage.removeItem('masterKey');
      localStorage.removeItem('userId');
      window.location.href = 'login.html';
    }
  } else {
    // 未登录，跳转到登录页
    window.location.href = 'login.html';
  }
});

/**
 * 加载初始数据
 */
async function loadInitialData() {
  try {
    components.showLoading(document.body);
    
    // 加载分类
    const categoriesResult = await api.categories.getAll();
    categories = categoriesResult.data;
    
    // 加载笔记列表
    const notesResult = await api.notes.getAll();
    notes = notesResult.data.notes;
    
    // 解密分类名称
    for (const category of categories) {
      category.name = await encryption.decrypt(category.name_cipher, masterKey);
    }
    
    // 解密笔记标题
    for (const note of notes) {
      note.title = await encryption.decrypt(note.title_cipher, masterKey);
      if (note.category_cipher) {
        note.category = categories.find(c => c.name_cipher === note.category_cipher)?.name || '未分类';
      } else {
        note.category = '未分类';
      }
    }

    components.hideLoading(document.body);
  } catch (error) {
    components.hideLoading(document.body);
    utils.showToast('加载数据失败', 'error');
    console.error('加载初始数据失败:', error);
  }
}

/**
 * 初始化应用
 */
function initApp() {
  // 初始化时间显示
  updateTime();
  setInterval(updateTime, 1000);
  
  // 初始化数字增长动画
  initCountAnimation();
  
  // 初始化事件监听
  initEventListeners();
  
  // 渲染分类列表
  renderCategories();
  
  // 渲染笔记列表
  renderNotes();
  
  // 检查草稿
  checkDrafts();
  
  // 添加实时日志
  addLog('INFO', '应用初始化完成');
  addLog('INFO', `已加载 ${notes.length} 条笔记，${categories.length} 个分类`);
}

/**
 * 渲染分类列表
 */
function renderCategories() {
  const categoriesList = document.getElementById('categories-list');
  if (!categoriesList) return;

  // 清空列表
  categoriesList.innerHTML = '';

  // 添加"全部笔记"选项
  const allItem = document.createElement('div');
  allItem.className = `flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${!currentCategoryId ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-dark-lighter'}`;
  allItem.innerHTML = `
    <i class="fa-solid fa-book"></i>
    <span>全部笔记</span>
    <span class="ml-auto text-gray-400 text-sm">${notes.length}</span>
  `;
  allItem.addEventListener('click', () => {
    currentCategoryId = null;
    renderCategories();
    renderNotes();
  });
  categoriesList.appendChild(allItem);

  // 添加"未分类"选项
  const uncategorizedCount = notes.filter(n => !n.category_cipher).length;
  const uncategorizedItem = document.createElement('div');
  uncategorizedItem.className = `flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${currentCategoryId === 'uncategorized' ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-dark-lighter'}`;
  uncategorizedItem.innerHTML = `
    <i class="fa-solid fa-folder-open"></i>
    <span>未分类</span>
    <span class="ml-auto text-gray-400 text-sm">${uncategorizedCount}</span>
  `;
  uncategorizedItem.addEventListener('click', () => {
    currentCategoryId = 'uncategorized';
    renderCategories();
    renderNotes();
  });
  categoriesList.appendChild(uncategorizedItem);

  // 添加分类分隔线
  const divider = document.createElement('div');
  divider.className = 'h-px bg-dark-lighter my-2';
  categoriesList.appendChild(divider);

  // 添加所有分类
  for (const category of categories) {
    const noteCount = notes.filter(n => n.category_cipher === category.name_cipher).length;
    const item = document.createElement('div');
    item.className = `flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${currentCategoryId === category.id ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-dark-lighter'}`;
    item.innerHTML = `
      <i class="fa-solid fa-folder"></i>
      <span class="truncate">${category.name}</span>
      <span class="ml-auto text-gray-400 text-sm">${noteCount}</span>
    `;
    item.addEventListener('click', () => {
      currentCategoryId = category.id;
      renderCategories();
      renderNotes();
    });
    categoriesList.appendChild(item);
  }
}

/**
 * 渲染笔记列表
 */
function renderNotes() {
  const notesList = document.getElementById('notes-list');
  if (!notesList) return;

  // 清空列表
  notesList.innerHTML = '';

  // 过滤笔记
  let filteredNotes = [...notes];
  if (currentCategoryId === 'uncategorized') {
    filteredNotes = filteredNotes.filter(n => !n.category_cipher);
  } else if (currentCategoryId) {
    const selectedCategory = categories.find(c => c.id === currentCategoryId);
    if (selectedCategory) {
      filteredNotes = filteredNotes.filter(n => n.category_cipher === selectedCategory.name_cipher);
    }
  }

  // 按更新时间排序
  filteredNotes.sort((a, b) => b.updated_at - a.updated_at);

  if (filteredNotes.length === 0) {
    notesList.innerHTML = `
      <div class="text-center py-12">
        <i class="fa-solid fa-file-alt text-4xl text-gray-500 mb-4"></i>
        <p class="text-gray-400">暂无笔记</p>
        <button class="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors text-sm" onclick="openNewNoteModal()">
          <i class="fa-solid fa-plus mr-2"></i>创建第一条笔记
        </button>
      </div>
    `;
    return;
  }

  // 渲染笔记卡片
  for (const note of filteredNotes) {
    const card = document.createElement('div');
    card.className = 'glass-effect rounded-xl p-4 card-transition border border-dark-lighter cursor-pointer';
    card.innerHTML = `
      <h3 class="text-lg font-semibold text-white mb-2 truncate">${note.title || '无标题'}</h3>
      <div class="flex items-center justify-between text-sm text-gray-400">
        <span>${note.category}</span>
        <span>${utils.formatTime(note.updated_at)}</span>
      </div>
    `;
    card.addEventListener('click', () => openNote(note.id));
    notesList.appendChild(card);
  }
}

/**
 * 打开笔记详情
 * @param {string} noteId 笔记ID
 */
async function openNote(noteId) {
  try {
    components.showLoading(document.body);
    
    // 获取笔记详情
    const result = await api.notes.getById(noteId);
    const note = result.data;
    
    // 解密内容
    const title = await encryption.decrypt(note.title_cipher, masterKey);
    const content = await encryption.decrypt(note.ciphertext, masterKey);
    let tags = [];
    if (note.tags_cipher) {
      const tagsStr = await encryption.decrypt(note.tags_cipher, masterKey);
      tags = JSON.parse(tagsStr || '[]');
    }
    
    // 设置当前笔记ID
    currentNoteId = noteId;
    
    // 填充表单
    document.getElementById('note-title').value = title;
    document.getElementById('note-content').value = content;
    
    // 显示编辑器
    document.getElementById('editor-modal').classList.remove('hidden');
    document.getElementById('editor-title').textContent = '编辑笔记';
    
    // 检查草稿
    const draft = await encryption.getDraft(encryption.DRAFT_TYPE.EXISTING_NOTE, noteId);
    if (draft) {
      components.confirmDialog(
        '发现草稿',
        '您有一个未保存的草稿，是否恢复？',
        () => {
          document.getElementById('note-title').value = draft.title || '';
          document.getElementById('note-content').value = draft.content || '';
          utils.showToast('草稿已恢复', 'success');
        },
        () => {
          // 删除草稿
          encryption.deleteDraft(encryption.DRAFT_TYPE.EXISTING_NOTE, noteId);
        }
      );
    }
    
    components.hideLoading(document.body);
  } catch (error) {
    components.hideLoading(document.body);
    utils.showToast('加载笔记失败', 'error');
    console.error('加载笔记失败:', error);
  }
}

/**
 * 保存笔记
 */
async function saveNote() {
  const title = document.getElementById('note-title').value.trim();
  const content = document.getElementById('note-content').value.trim();
  
  if (!title) {
    return utils.showToast('请输入笔记标题', 'error');
  }

  const saveBtn = document.getElementById('save-note-btn');
  const originalHTML = saveBtn.innerHTML;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 保存中...';
  saveBtn.disabled = true;

  try {
    // 加密内容
    const titleCipher = await encryption.encrypt(title, masterKey);
    const ciphertext = await encryption.encrypt(content, masterKey);
    
    if (currentNoteId) {
      // 更新现有笔记
      await api.notes.update(currentNoteId, {
        titleCipher,
        ciphertext
      });
      
      // 删除草稿
      encryption.deleteDraft(encryption.DRAFT_TYPE.EXISTING_NOTE, currentNoteId);
      
      utils.showToast('笔记保存成功', 'success');
    } else {
      // 创建新笔记
      const result = await api.notes.create({
        titleCipher,
        ciphertext
      });
      
      // 删除草稿
      encryption.deleteDraft(encryption.DRAFT_TYPE.NEW_NOTE);
      
      utils.showToast('笔记创建成功', 'success');
    }
    
    // 重新加载数据
    await loadInitialData();
    
    // 关闭编辑器
    closeEditor();
    
  } catch (error) {
    utils.showToast('保存笔记失败', 'error');
    console.error('保存笔记失败:', error);
  } finally {
    saveBtn.innerHTML = originalHTML;
    saveBtn.disabled = false;
  }
}

/**
 * 打开新建笔记模态框
 */
function openNewNoteModal() {
  currentNoteId = null;
  document.getElementById('note-title').value = '';
  document.getElementById('note-content').value = '';
  document.getElementById('editor-modal').classList.remove('hidden');
  document.getElementById('editor-title').textContent = '新建笔记';
  
  // 检查草稿
  encryption.getDraft(encryption.DRAFT_TYPE.NEW_NOTE).then(draft => {
    if (draft) {
      components.confirmDialog(
        '发现草稿',
        '您有一个未保存的新笔记草稿，是否恢复？',
        () => {
          document.getElementById('note-title').value = draft.title || '';
          document.getElementById('note-content').value = draft.content || '';
          utils.showToast('草稿已恢复', 'success');
        },
        () => {
          // 删除草稿
          encryption.deleteDraft(encryption.DRAFT_TYPE.NEW_NOTE);
        }
      );
    }
  });
}

/**
 * 关闭编辑器
 */
function closeEditor() {
  document.getElementById('editor-modal').classList.add('hidden');
  currentNoteId = null;
  encryption.updateDraftIndicator('');
}

/**
 * 检查草稿
 */
async function checkDrafts() {
  const drafts = await encryption.getAllDrafts();
  if (drafts.length > 0) {
    addLog('INFO', `发现 ${drafts.length} 个未保存的草稿`);
  }
}

/**
 * 初始化事件监听
 */
function initEventListeners() {
  // 新建笔记按钮
  document.getElementById('new-note-btn')?.addEventListener('click', openNewNoteModal);
  
  // 保存笔记按钮
  document.getElementById('save-note-btn')?.addEventListener('click', saveNote);
  
  // 关闭编辑器按钮
  document.getElementById('close-editor-btn')?.addEventListener('click', () => {
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();
    
    if (title || content) {
      components.confirmDialog(
        '保存草稿',
        '是否保存当前内容为草稿？',
        async () => {
          if (currentNoteId) {
            await encryption.saveDraft(
              encryption.DRAFT_TYPE.EXISTING_NOTE,
              currentNoteId,
              { title, content }
            );
          } else {
            await encryption.saveDraft(
              encryption.DRAFT_TYPE.NEW_NOTE,
              null,
              { title, content }
            );
          }
          utils.showToast('草稿已保存', 'success');
          closeEditor();
        },
        () => {
          // 删除草稿
          if (currentNoteId) {
            encryption.deleteDraft(encryption.DRAFT_TYPE.EXISTING_NOTE, currentNoteId);
          } else {
            encryption.deleteDraft(encryption.DRAFT_TYPE.NEW_NOTE);
          }
          closeEditor();
        }
      );
    } else {
      closeEditor();
    }
  });
  
  // 自动保存草稿（每30秒）
  setInterval(async () => {
    const title = document.getElementById('note-title')?.value.trim();
    const content = document.getElementById('note-content')?.value.trim();
    
    if ((title || content) && !isLocked) {
      if (currentNoteId) {
        await encryption.saveDraft(
          encryption.DRAFT_TYPE.EXISTING_NOTE,
          currentNoteId,
          { title, content }
        );
      } else {
        await encryption.saveDraft(
          encryption.DRAFT_TYPE.NEW_NOTE,
          null,
          { title, content }
        );
      }
    }
  }, 30000);
  
  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    // Ctrl+S 保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (!document.getElementById('editor-modal')?.classList.contains('hidden')) {
        saveNote();
      }
    }
    
    // Esc 关闭编辑器
    if (e.key === 'Escape') {
      if (!document.getElementById('editor-modal')?.classList.contains('hidden')) {
        document.getElementById('close-editor-btn')?.click();
      }
    }
  });
}

/**
 * 更新时间显示
 */
function updateTime() {
  const now = new Date();
  const timeElement = document.getElementById('current-time');
  if (timeElement) {
    timeElement.textContent = now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

/**
 * 初始化数字增长动画
 */
function initCountAnimation() {
  // 统计数据
  const totalNotes = notes.length;
  const totalCategories = categories.length;
  const todayNotes = notes.filter(n => {
    const noteDate = new Date(n.updated_at);
    const today = new Date();
    return noteDate.toDateString() === today.toDateString();
  }).length;

  // 更新统计数字
  animateNumber('total-notes-count', totalNotes);
  animateNumber('total-categories-count', totalCategories);
  animateNumber('today-notes-count', todayNotes);
}

/**
 * 数字增长动画
 * @param {string} elementId 元素ID
 * @param {number} target 目标数字
 */
function animateNumber(elementId, target) {
  const element = document.getElementById(elementId);
  if (!element) return;

  let current = 0;
  const increment = Math.ceil(target / 30);
  const interval = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(interval);
    }
    element.textContent = current;
  }, 30);
}

/**
 * 添加实时日志
 * @param {string} level 日志级别
 * @param {string} message 日志消息
 */
function addLog(level, message) {
  const logContainer = document.getElementById('log-container');
  if (!logContainer) return;

  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry';
  
  const time = new Date().toLocaleTimeString('zh-CN');
  let levelClass = 'log-info';
  if (level === 'SUCCESS') levelClass = 'log-success';
  if (level === 'WARNING') levelClass = 'log-warning';
  if (level === 'ERROR') levelClass = 'log-error';

  logEntry.innerHTML = `
    <span class="log-time">[${time}]</span>
    <span class="${levelClass}">[${level}]</span>
    <span>${message}</span>
  `;

  logContainer.appendChild(logEntry);
  logContainer.scrollTop = logContainer.scrollHeight;

  // 保留最多100条日志
  while (logContainer.children.length > 100) {
    logContainer.removeChild(logContainer.firstChild);
  }
}

// 导出全局函数（供HTML内联事件使用）
window.openNewNoteModal = openNewNoteModal;
window.closeEditor = closeEditor;
window.saveNote = saveNote;
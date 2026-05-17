// ==============================================
// 加密笔记 - Vue主应用（V2.2.4 布局修复版）
// 完整无截断，可直接复制运行
// 修复三栏布局和编辑区域显示问题
// ==============================================

new Vue({
    el: '#app',
    
    // ==============================================
    // 模板部分（完整无截断）
    // ==============================================
    template: `
      <div class="app-container">
        <!-- Toast提示 -->
        <transition name="fade">
          <div 
            v-if="toast.visible"
            :class="[
              'fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2',
              toast.type === 'success' ? 'bg-green-600 text-white' : 
              toast.type === 'error' ? 'bg-red-600 text-white' : 
              'bg-blue-600 text-white'
            ]"
          >
            <svg v-if="toast.type === 'success'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <svg v-else-if="toast.type === 'error'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            {{ toast.message }}
          </div>
        </transition>
  
        <!-- 登录页面 -->
        <div v-if="currentPage === 'login'" class="login-container">
          <div class="login-card">
            <div class="text-center mb-8">
              <div class="inline-block bg-indigo-500/20 p-3 rounded-full mb-4">
                <svg class="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
              <h2 class="text-xl font-bold mb-2">端到端加密私人笔记</h2>
              <p class="text-gray-400 text-sm">所有数据浏览器加密后上传，仅你可解密</p>
            </div>
            <div class="space-y-4">
              <input
                v-model="masterKey"
                type="password"
                placeholder="输入主密钥（新密钥自动创建账号）"
                class="input-field text-sm"
                @keyup.enter="handleLogin"
              />
              <button
                @click="handleLogin"
                :disabled="loading"
                class="btn-primary w-full"
              >
                {{ loading ? '登录中...' : '开始使用' }}
              </button>
              <p class="text-gray-400 text-xs text-center mt-4">忘记主密钥？使用恢复码重置</p>
            </div>
          </div>
        </div>
  
        <!-- 主页面（已登录） -->
        <div v-else>
          <!-- 顶部导航栏 -->
          <header>
            <div class="flex items-center gap-2">
              <svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
              <span class="font-bold text-lg">我的加密笔记</span>
            </div>
            <div class="flex gap-3">
              <button @click="goToPage('dashboard')" class="btn-secondary text-sm">
                📚 知识库
              </button>
              <button @click="showCategoryForm" class="btn-secondary text-sm">
                ⚙️ 设置
              </button>
              <button @click="showCategoryForm" class="btn-secondary text-sm">
                📁 分类
              </button>
              <button @click="exportAllNotes" class="btn-secondary text-sm">
                💾 导出
              </button>
              <label class="btn-secondary text-sm cursor-pointer">
                📥 导入
                <input type="file" accept=".json" @change="importNotes" class="hidden" />
              </label>
              <button @click="createNewNote" class="btn-primary text-sm">
                + 新建笔记
              </button>
              <button @click="handleLogout" class="btn-danger text-sm">
                ↪️ 退出
              </button>
            </div>
          </header>
  
          <!-- 主内容区三栏布局 -->
          <div class="main-container">
            <!-- 左侧导航栏 -->
            <aside class="sidebar hide-scrollbar">
              <!-- 导航部分（圆角框包裹） -->
              <div class="nav-section">
                <div class="text-xs text-gray-400 uppercase font-semibold mb-2 px-3">导航</div>
                
                <div 
                  @click="goToPage('dashboard')" 
                  :class="['nav-item', currentPage === 'dashboard' ? 'active' : '']"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                  </svg>
                  仪表盘
                </div>
                <div 
                  @click="goToPage('notes')" 
                  :class="['nav-item', currentPage === 'notes' && !selectedCategory ? 'active' : '']"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  全部笔记
                  <span class="badge">{{ stats.totalNotes }}</span>
                </div>
                <div 
                  @click="goToPage('drafts')" 
                  :class="['nav-item', currentPage === 'drafts' ? 'active' : '']"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  草稿管理
                  <span class="badge">{{ stats.totalDrafts }}</span>
                </div>
                <div 
                  @click="goToPage('trash')" 
                  :class="['nav-item', currentPage === 'trash' ? 'active' : '']"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  回收站
                  <span class="badge red">{{ stats.totalRecycle }}</span>
                </div>
              </div>
              
              <!-- 分类部分（独立圆角框包裹，支持滚动） -->
              <div class="nav-section" style="max-height: calc(100vh - 320px); overflow-y: auto;" class="hide-scrollbar">
                <div class="flex justify-between items-center mb-2 px-3">
                  <h4 class="text-xs text-gray-400 uppercase font-semibold">分类</h4>
                  <button @click="showCategoryForm" class="text-gray-400 hover:text-white text-xs">
                    +
                  </button>
                </div>
                
                <div 
                  v-for="category in decryptedCategories" 
                  :key="category.id"
                  v-if="category && category.id"
                  @click="selectCategory(category.id)"
                  :class="['category-item', selectedCategory === category.id ? 'active' : '']"
                >
                  <span class="color-dot" :style="{ backgroundColor: categoryColors[category.id] || '#6366f1' }"></span>
                  <span class="category-name">{{ category.name || '未命名分类' }}</span>
                  <div class="category-actions">
                    <button @click.stop="showCategoryForm(category.id)" class="action-btn">✏️</button>
                    <button @click.stop="deleteCategory(category.id)" class="action-btn">🗑️</button>
                  </div>
                </div>
              </div>
            </aside>
  
            <!-- 中间笔记列表 -->
            <div class="note-list-container">
              <!-- 笔记列表标题和搜索 -->
              <div class="p-4 border-b">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="text-lg font-bold">笔记列表</h3>
                  <div v-if="selectedCategory" class="text-sm text-indigo-400">
                    正在查看: {{ decryptedCategories.find(c => c.id === selectedCategory)?.name || '未分类' }}
                    <button @click="clearCategoryFilter" class="ml-2 text-gray-400 hover:text-white">×</button>
                  </div>
                </div>
                <div class="flex gap-3">
                  <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="搜索笔记..."
                    class="input-field flex-1 text-sm"
                  />
                  <select v-model="sortBy" class="input-field w-32 text-sm">
                    <option value="updated_at">更新时间</option>
                    <option value="created_at">创建时间</option>
                    <option value="title">标题</option>
                  </select>
                </div>
              </div>
  
              <!-- 笔记列表 -->
              <div class="flex-1 overflow-y-auto p-4 hide-scrollbar">
                <!-- 全部笔记页面 -->
                <template v-if="currentPage === 'notes' || currentPage === 'dashboard'">
                  <div 
                    v-for="note in filteredNotes" 
                    :key="note.id"
                    v-if="note"
                    @click="selectNote(note)"
                    :class="['note-card', selectedNote && selectedNote.id === note.id ? 'selected' : '', note.is_pinned ? 'pinned-note' : '']"
                  >
                    <div class="flex justify-between items-start mb-2">
                      <h4 class="font-medium truncate flex-1">
                        <span v-if="note.is_pinned" class="pinned-badge">置顶</span>
                        {{ note.title || '无标题笔记' }}
                      </h4>
                      <button 
                        @click.stop="togglePin(note)"
                        class="text-gray-400 hover:text-yellow-500 text-xs"
                      >
                        📌
                      </button>
                    </div>
                    <div class="flex flex-wrap gap-1 mb-2">
                      <span 
                        class="category-tag"
                        :style="{ backgroundColor: (categoryColors[note.category_cipher] || '#6366f1') + '20', color: categoryColors[note.category_cipher] || '#6366f1' }"
                      >
                        📁 {{ note.category_name || '未分类' }}
                      </span>
                      <span 
                        v-for="tag in (note.tags || '').split('#').filter(t => t.trim()).slice(0, 2)" 
                        :key="tag" 
                        class="tag"
                      >
                        #{{ tag.trim() }}
                      </span>
                    </div>
                    <div class="flex justify-between items-center">
                      <p class="text-gray-400 text-xs">修改{{ note.revision_count || 1 }}次 · {{ formatRelativeTime(note.updated_at) }}</p>
                    </div>
                  </div>
                </template>
  
                <!-- 草稿管理页面 -->
                <template v-if="currentPage === 'drafts'">
                  <div 
                    v-for="draft in drafts" 
                    :key="draft.id"
                    v-if="draft"
                    class="note-card"
                  >
                    <h4 class="font-medium mb-2 truncate">{{ draft.title || '无标题草稿' }}</h4>
                    <p class="text-gray-400 text-xs mb-3 line-clamp-2">{{ draft.content }}</p>
                    <div class="flex justify-between items-center">
                      <span class="text-gray-400 text-xs">{{ formatRelativeTime(draft.updated_at) }}</span>
                      <div class="flex gap-2">
                        <button @click="editDraft(draft)" class="text-indigo-400 hover:text-indigo-300 text-xs">编辑</button>
                        <button @click="deleteDraft(draft.id)" class="text-red-400 hover:text-red-300 text-xs">删除</button>
                      </div>
                    </div>
                  </div>
                </template>
  
                <!-- 回收站页面 -->
                <template v-if="currentPage === 'trash'">
                  <div 
                    v-for="note in trashedNotes" 
                    :key="note.id"
                    v-if="note"
                    class="note-card"
                  >
                    <h4 class="font-medium mb-2 truncate">{{ note.title || '无标题笔记' }}</h4>
                    <p class="text-gray-400 text-xs mb-3 line-clamp-2">{{ note.content }}</p>
                    <div class="flex justify-between items-center">
                      <span class="text-gray-400 text-xs">{{ formatRelativeTime(note.deleted_at) }}</span>
                      <div class="flex gap-2">
                        <button @click="restoreNote(note.id)" class="text-green-400 hover:text-green-300 text-xs">恢复</button>
                        <button @click="permanentDeleteNote(note.id)" class="text-red-400 hover:text-red-300 text-xs">永久删除</button>
                      </div>
                    </div>
                  </div>
                </template>
  
                <!-- 空状态提示 -->
                <div v-if="filteredNotes.length === 0 && currentPage !== 'drafts' && currentPage !== 'trash'" class="text-center py-12 text-gray-400">
                  还没有笔记，点击右上角"新建笔记"开始创建
                </div>
                <div v-if="drafts.length === 0 && currentPage === 'drafts'" class="text-center py-12 text-gray-400">
                  暂无草稿
                </div>
                <div v-if="trashedNotes.length === 0 && currentPage === 'trash'" class="text-center py-12 text-gray-400">
                  回收站为空
                </div>
              </div>
            </div>
  
            <!-- 右侧编辑区域 - 关键修复 -->
            <div class="editor-container">
              <!-- 知识库页面（卡片视图） -->
              <div v-if="currentPage === 'dashboard'" class="max-w-7xl mx-auto w-full">
                <!-- 数据总览 -->
                <div class="grid grid-cols-5 gap-4 mb-8">
                  <div class="card text-center">
                    <div class="text-2xl font-bold text-indigo-500">{{ stats.totalNotes }}</div>
                    <div class="text-gray-400 text-sm">总笔记数</div>
                  </div>
                  <div class="card text-center">
                    <div class="text-2xl font-bold text-indigo-500">{{ stats.totalCategories }}</div>
                    <div class="text-gray-400 text-sm">总分类数</div>
                  </div>
                  <div class="card text-center">
                    <div class="text-2xl font-bold text-indigo-500">{{ stats.totalTags }}</div>
                  <div class="text-gray-400 text-sm">总标签数</div>
                </div>
                <div class="card text-center">
                  <div class="text-2xl font-bold text-indigo-500">{{ stats.totalDrafts }}</div>
                  <div class="text-gray-400 text-sm">待保存草稿</div>
                </div>
                <div class="card text-center">
                  <div class="text-2xl font-bold text-red-500">{{ stats.totalRecycle }}</div>
                  <div class="text-gray-400 text-sm">回收站</div>
                </div>
              </div>

              <!-- 最近更新笔记 -->
              <h3 class="text-lg font-bold mb-4">最近更新</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div 
                  v-for="note in recentNotes" 
                  :key="note.id"
                  v-if="note"
                  @click="selectNote(note); goToPage('notes')"
                  :class="['card cursor-pointer hover:border-indigo-500 transition-colors', note.is_pinned ? 'pinned-note' : '']"
                >
                  <h4 class="font-medium mb-2 truncate">
                    <span v-if="note.is_pinned" class="pinned-badge">置顶</span>
                    {{ note.title || '无标题笔记' }}
                  </h4>
                  <p class="text-gray-400 text-sm mb-3 line-clamp-3">{{ note.content }}</p>
                  <div class="flex flex-wrap gap-1 mb-2">
                    <span 
                      class="category-tag"
                      :style="{ backgroundColor: (categoryColors[note.category_cipher] || '#6366f1') + '20', color: categoryColors[note.category_cipher] || '#6366f1' }"
                    >
                      📁 {{ note.category_name || '未分类' }}
                    </span>
                  </div>
                  <p class="text-gray-400 text-xs">修改{{ note.revision_count || 1 }}次 · {{ formatRelativeTime(note.updated_at) }}</p>
                </div>
              </div>
            </div>

            <!-- 编辑页面 -->
            <div v-else class="max-w-4xl mx-auto w-full">
              <!-- 笔记头部信息 -->
              <div class="flex justify-between items-center mb-6">
                <div>
                  <span class="text-gray-400 text-sm">
                    {{ selectedNote ? '编辑笔记' : '新建笔记' }}
                    <span v-if="selectedNote">
                      · 创建于: {{ formatTime(selectedNote.created_at) }}
                      · 修改{{ selectedNote.revision_count || 1 }}次
                      · 最近更新: {{ formatTime(selectedNote.updated_at) }}
                    </span>
                    <span v-else class="ml-2 text-green-400">📝 草稿状态</span>
                  </span>
                </div>
                <div class="flex gap-3">
                  <button 
                    @click="showPreview = !showPreview"
                    :class="['btn-secondary text-sm', showPreview ? 'bg-indigo-600' : '']"
                  >
                    {{ showPreview ? '编辑' : '预览' }}
                  </button>
                  <button 
                    v-if="selectedNote"
                    @click="deleteNote(selectedNote.id)" 
                    class="btn-danger text-sm"
                  >
                    删除笔记
                  </button>
                  <button 
                    @click="showSaveDialog" 
                    :disabled="loading"
                    class="btn-primary text-sm"
                  >
                    {{ loading ? '保存中...' : '保存笔记' }}
                  </button>
                </div>
              </div>

              <!-- 笔记编辑/预览区域 - 关键修复：使用editor-card类 -->
              <div class="editor-card">
                <input
                  v-model="editingNote.title"
                  type="text"
                  placeholder="笔记标题"
                  class="input-field text-2xl font-bold mb-4"
                />
                <div class="flex gap-4 mb-4">
                  <select v-model="editingNote.category_id" class="input-field w-48 text-sm">
                    <option value="">未分类</option>
                    <option
                      v-for="category in decryptedCategories"
                      :key="category.id"
                      :value="category.id"
                      v-if="category && category.id"
                    >
                      {{ category.name || '未命名分类' }}
                    </option>
                  </select>
                  <input
                    v-model="editingNote.tags"
                    type="text"
                    placeholder="标签用#分隔，例如：#工作 #笔记"
                    class="input-field flex-1 text-sm"
                  />
                  <button class="btn-secondary text-sm">
                    分享
                  </button>
                </div>
                
                <!-- 编辑/预览切换 -->
                <div v-if="!showPreview" class="editor-content">
                  <textarea
                    v-model="editingNote.content"
                    placeholder="在这里写笔记，支持Markdown语法..."
                    class="input-field editor-textarea"
                  ></textarea>
                </div>
                <div v-else class="preview-container markdown-preview" v-html="renderedMarkdown">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 保存方式选择弹窗 -->
        <div v-if="saveDialog.visible" class="modal-overlay" @click.self="saveDialog.visible = false">
          <div class="modal-content">
            <div class="text-center mb-6">
              <svg class="w-12 h-12 mx-auto text-indigo-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
              </svg>
              <h3 class="text-lg font-bold">选择保存方式</h3>
            </div>
            <div class="space-y-3">
              <button @click="saveAsDraft" class="btn-secondary w-full flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                仅保存为草稿
                <span class="text-xs text-gray-400 ml-auto">保存在本地，不更新服务器</span>
              </button>
              <button @click="saveNote" class="btn-primary w-full flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                正式保存笔记
                <span class="text-xs text-gray-300 ml-auto">加密上传到服务器，永久保存</span>
              </button>
              <button @click="saveDialog.visible = false" class="btn-secondary w-full">
                取消
              </button>
            </div>
          </div>
        </div>

        <!-- 新建/编辑分类弹窗 -->
        <div v-if="categoryForm.visible" class="modal-overlay" @click.self="categoryForm.visible = false">
          <div class="modal-content">
            <h3 class="text-lg font-bold mb-4">{{ categoryForm.editId ? '编辑分类' : '创建分类' }}</h3>
            <input
              v-model="categoryForm.name"
              type="text"
              placeholder="分类名称"
              class="input-field mb-4"
              @keyup.enter="createOrUpdateCategory"
            />
            <div class="flex justify-end gap-3">
              <button @click="categoryForm.visible = false" class="btn-secondary">
                取消
              </button>
              <button @click="createOrUpdateCategory" class="btn-primary">
                {{ categoryForm.editId ? '保存' : '创建' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,

  // ==============================================
  // 数据部分
  // ==============================================
  data() {
    return {
      // 登录状态
      isLoggedIn: false,
      masterKey: '',
      token: '',
      
      // 当前页面
      currentPage: 'dashboard',
      
      // 当前选中的分类
      selectedCategory: null,
      
      // 数据存储
      notes: [],
      decryptedNotes: [],
      categories: [],
      decryptedCategories: [],
      drafts: [],
      trashedNotes: [],
      
      // 加载状态
      loading: false,
      
      // 统计数据
      stats: {
        totalNotes: 0,
        totalCategories: 0,
        totalTags: 0,
        totalDrafts: 0,
        totalRecycle: 0
      },
      
      // 当前选中的笔记
      selectedNote: null,
      
      // 编辑中的笔记
      editingNote: {
        id: '',
        title: '',
        content: '',
        category_id: '',
        tags: '',
        is_pinned: false
      },
      
      // 分类管理表单
      categoryForm: {
        name: '',
        visible: false,
        editId: null
      },
      
      // 搜索和排序
      searchQuery: '',
      sortBy: 'updated_at',
      
      // Toast提示
      toast: {
        visible: false,
        message: '',
        type: 'success'
      },
      
      // 保存方式选择弹窗
      saveDialog: {
        visible: false
      },
      
      // Markdown预览开关
      showPreview: false,
      
      // 自动保存定时器
      autoSaveTimer: null
    };
  },

  // ==============================================
  // 计算属性
  // ==============================================
  computed: {
    // 过滤和排序后的笔记列表（添加分类筛选）
    filteredNotes() {
      let notes = this.decryptedNotes.filter(note => note && typeof note === 'object');
      
      // 分类筛选
      if (this.selectedCategory) {
        notes = notes.filter(note => note.category_cipher === this.selectedCategory);
      }
      
      // 搜索过滤
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        notes = notes.filter(note => 
          (note.title || '').toLowerCase().includes(query) || 
          (note.content || '').toLowerCase().includes(query) ||
          (note.tags || '').toLowerCase().includes(query)
        );
      }
      
      // 排序：置顶优先，然后按更新时间倒序
      notes.sort((a, b) => {
        if (!a) return 1;
        if (!b) return -1;
        
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      });
      
      return notes;
    },
    
    // 最近更新的笔记
    recentNotes() {
      return this.filteredNotes.slice(0, 8);
    },
    
    // 分类颜色映射（与线上完全一致）
    categoryColors() {
      const colors = [
        '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
        '#ec4899', '#f43f5e', '#ef4444', '#f97316',
        '#f59e0b', '#eab308', '#84cc16', '#22c55e',
        '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9'
      ];
      
      return this.decryptedCategories.reduce((acc, category, index) => {
        if (category && category.id) {
          acc[category.id] = colors[index % colors.length];
        }
        return acc;
      }, {});
    },
    
    // Markdown渲染后的内容
    renderedMarkdown() {
      if (!this.editingNote || !this.editingNote.content) return '';
      return marked.parse(this.editingNote.content);
    }
  },

  // ==============================================
  // 生命周期钩子
  // ==============================================
  created() {
    this.loadLocalDrafts();
    
    const token = localStorage.getItem('note_token');
    if (token) {
      this.token = token;
      this.isLoggedIn = true;
      this.loadAndDecryptAllData();
    } else {
      this.currentPage = 'login';
    }
  },
  
  mounted() {
    window.addEventListener('beforeunload', () => {
      this.saveCurrentDraft();
    });
  },
  
  beforeDestroy() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
  },

  // ==============================================
  // 监听器
  // ==============================================
  watch: {
    'editingNote.content': function() {
      this.resetAutoSaveTimer();
    },
    'editingNote.title': function() {
      this.resetAutoSaveTimer();
    }
  },

  // ==============================================
  // 方法部分
  // ==============================================
  methods: {
    // ==============================================
    // Toast提示
    // ==============================================
    showToast(message, type = 'success') {
      this.toast.message = message;
      this.toast.type = type;
      this.toast.visible = true;
      
      setTimeout(() => {
        this.toast.visible = false;
      }, 3000);
    },

    // ==============================================
    // 草稿管理
    // ==============================================
    loadLocalDrafts() {
      try {
        const drafts = localStorage.getItem('note_drafts');
        if (drafts) {
          this.drafts = JSON.parse(drafts).filter(draft => draft && typeof draft === 'object');
          this.stats.totalDrafts = this.drafts.length;
        }
      } catch (e) {
        console.error('加载本地草稿失败:', e);
        this.drafts = [];
        this.stats.totalDrafts = 0;
      }
    },

    saveLocalDrafts() {
      localStorage.setItem('note_drafts', JSON.stringify(this.drafts));
      this.stats.totalDrafts = this.drafts.length;
    },

    saveCurrentDraft() {
      if (!this.editingNote) return;
      if (!this.editingNote.title && !this.editingNote.content) return;
      
      const draft = {
        id: this.editingNote.id || 'draft_' + Date.now(),
        title: this.editingNote.title || '',
        content: this.editingNote.content || '',
        category_id: this.editingNote.category_id || '',
        tags: this.editingNote.tags || '',
        updated_at: new Date().toISOString()
      };
      
      const existingIndex = this.drafts.findIndex(d => d && d.id === draft.id);
      if (existingIndex !== -1) {
        this.drafts[existingIndex] = draft;
      } else {
        this.drafts.unshift(draft);
      }
      
      this.saveLocalDrafts();
    },

    resetAutoSaveTimer() {
      if (this.autoSaveTimer) {
        clearInterval(this.autoSaveTimer);
      }
      
      this.autoSaveTimer = setInterval(() => {
        this.saveCurrentDraft();
      }, 30000);
    },

    deleteDraft(draftId) {
      if (!confirm('确定要删除这篇草稿吗？')) return;
      
      this.drafts = this.drafts.filter(d => d && d.id !== draftId);
      this.saveLocalDrafts();
      this.showToast('草稿已删除');
    },

    editDraft(draft) {
      if (!draft) return;
      
      this.editingNote = {
        id: draft.id || '',
        title: draft.title || '',
        content: draft.content || '',
        category_id: draft.category_id || '',
        tags: draft.tags || '',
        is_pinned: false
      };
      this.currentPage = 'notes';
      this.selectedNote = null;
    },

    // ==============================================
    // 数据加载与解密
    // ==============================================
    async loadAndDecryptAllData() {
      try {
        const [notesResult, categoriesResult] = await Promise.allSettled([
          this.loadNotesRaw(),
          this.loadCategoriesRaw()
        ]);

        // 解密笔记
        if (notesResult.status === 'fulfilled') {
          this.notes = (notesResult.value || []).filter(note => note && typeof note === 'object');
          
          this.decryptedNotes = await Promise.all(this.notes.map(async (note) => {
            if (!note) return null;
            
            try {
              return {
                ...note,
                title: await window.cryptoUtils.decrypt(note.title_cipher, this.masterKey) || '',
                content: await window.cryptoUtils.decrypt(note.ciphertext, this.masterKey) || '',
                tags: await window.cryptoUtils.decrypt(note.tags_cipher, this.masterKey) || '',
                category_name: note.category_cipher 
                  ? await window.cryptoUtils.decrypt(note.category_cipher, this.masterKey) || '未分类'
                  : '未分类',
                is_pinned: note.is_pinned || false
              };
            } catch (e) {
              console.error('解密笔记失败:', e, note);
              return null;
            }
          }));
          
          this.decryptedNotes = this.decryptedNotes.filter(note => note !== null);
          this.stats.totalNotes = this.decryptedNotes.length;
        }

        // 解密分类
        if (categoriesResult.status === 'fulfilled') {
          this.categories = (categoriesResult.value || []).filter(category => category && typeof category === 'object');
          
          this.decryptedCategories = await Promise.all(this.categories.map(async (category) => {
            if (!category) return null;
            
            try {
              return {
                ...category,
                name: await window.cryptoUtils.decrypt(category.name_cipher, this.masterKey) || '未命名分类'
              };
            } catch (e) {
              console.error('解密分类失败:', e, category);
              return null;
            }
          }));
          
          this.decryptedCategories = this.decryptedCategories.filter(category => category !== null);
          this.stats.totalCategories = this.decryptedCategories.length;
        }

        this.calculateStats();
      } catch (err) {
        console.error('加载和解密数据失败:', err);
        this.showToast('加载数据失败', 'error');
      }
    },

    async loadNotesRaw() {
      try {
        const response = await fetch('/api/notes', {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        const result = await response.json();
        if (result.success) {
          return (result.data || []).filter(note => note && !note.deleted_at);
        }
        return [];
      } catch (e) {
        console.error('加载笔记失败:', e);
        return [];
      }
    },

    async loadTrashedNotesRaw() {
      try {
        const response = await fetch('/api/notes?trashed=true', {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        const result = await response.json();
        if (result.success) {
          return result.data || [];
        }
        return [];
      } catch (e) {
        console.error('加载回收站笔记失败:', e);
        return [];
      }
    },

    async loadCategoriesRaw() {
      try {
        const response = await fetch('/api/categories', {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        const result = await response.json();
        if (result.success) {
          return result.data || [];
        }
        return [];
      } catch (e) {
        console.error('加载分类失败:', e);
        return [];
      }
    },

    calculateStats() {
      const allTags = new Set();
      this.decryptedNotes.forEach(note => {
        if (note && note.tags && note.tags.trim()) {
          note.tags.split('#').filter(tag => tag.trim()).forEach(tag => {
            allTags.add(tag.trim());
          });
        }
      });
      this.stats.totalTags = allTags.size;
    },

    // ==============================================
    // 登录相关
    // ==============================================
    async handleLogin() {
      if (!this.masterKey.trim()) {
        this.showToast('请输入主密钥', 'error');
        return;
      }

      this.loading = true;
      try {
        const keyHash = await window.cryptoUtils.getKeyHash(this.masterKey);
        
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key_hash: keyHash })
        });

        const result = await response.json();
        if (result.success) {
          this.token = result.token;
          localStorage.setItem('note_token', this.token);
          this.isLoggedIn = true;
          await this.loadAndDecryptAllData();
          this.currentPage = 'dashboard';
          this.showToast('登录成功');
        } else {
          this.showToast('登录失败: ' + (result.message || '未知错误'), 'error');
        }
      } catch (err) {
        console.error('登录错误:', err);
        this.showToast('登录失败: ' + err.message, 'error');
      } finally {
        this.loading = false;
      }
    },

    handleLogout() {
      this.saveCurrentDraft();
      
      this.isLoggedIn = false;
      this.masterKey = '';
      this.token = '';
      this.notes = [];
      this.decryptedNotes = [];
      this.categories = [];
      this.decryptedCategories = [];
      this.selectedNote = null;
      this.editingNote = { id: '', title: '', content: '', category_id: '', tags: '', is_pinned: false };
      localStorage.removeItem('note_token');
      this.currentPage = 'login';
      this.showToast('已退出登录');
    },

    // ==============================================
    // 笔记管理
    // ==============================================
    createNewNote() {
      this.saveCurrentDraft();
      this.selectedNote = null;
      this.editingNote = {
        id: 'new_' + Date.now(),
        title: '',
        content: '',
        category_id: this.selectedCategory || '',
        tags: '',
        is_pinned: false
      };
      this.showPreview = false;
      this.currentPage = 'notes';
    },

    selectNote(note) {
      if (!note) return;
      
      this.saveCurrentDraft();
      this.selectedNote = note;
      this.editingNote = {
        id: note.id || '',
        title: note.title || '',
        content: note.content || '',
        category_id: note.category_cipher || '',
        tags: note.tags || '',
        is_pinned: note.is_pinned || false
      };
      this.showPreview = false;
    },

    showSaveDialog() {
      if (!this.editingNote || !this.editingNote.title.trim()) {
        this.showToast('请输入笔记标题', 'error');
        return;
      }
      this.saveDialog.visible = true;
    },

    saveAsDraft() {
      this.saveCurrentDraft();
      this.saveDialog.visible = false;
      this.showToast('草稿已保存');
    },

    async saveNote() {
      this.saveDialog.visible = false;
      this.loading = true;
      
      try {
        if (!this.editingNote) {
          throw new Error('没有可保存的笔记');
        }
        
        const encryptedNote = {
          title: await window.cryptoUtils.encrypt(this.editingNote.title.trim(), this.masterKey),
          content: await window.cryptoUtils.encrypt(this.editingNote.content.trim(), this.masterKey),
          tags: await window.cryptoUtils.encrypt(this.editingNote.tags.trim(), this.masterKey),
          category_id: this.editingNote.category_id || '',
          is_pinned: this.editingNote.is_pinned || false
        };

        if (this.editingNote.id && !this.editingNote.id.startsWith('draft_') && !this.editingNote.id.startsWith('new_')) {
          await fetch(`/api/notes/${this.editingNote.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify(encryptedNote)
          });
          this.showToast('笔记保存成功');
        } else {
          await fetch('/api/notes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify(encryptedNote)
          });
          this.showToast('笔记创建成功');
          
          if (this.editingNote.id) {
            this.drafts = this.drafts.filter(d => d && d.id !== this.editingNote.id);
            this.saveLocalDrafts();
          }
        }

        await this.loadAndDecryptAllData();
        
        if (this.decryptedNotes.length > 0) {
          const updatedNote = this.decryptedNotes.find(n => 
            n && n.title === this.editingNote.title.trim()
          );
          if (updatedNote) {
            this.selectNote(updatedNote);
          }
        }
      } catch (err) {
        console.error('保存笔记失败:', err);
        this.showToast('保存笔记失败: ' + err.message, 'error');
      } finally {
        this.loading = false;
      }
    },

    async deleteNote(noteId) {
      if (!noteId) return;
      if (!confirm('确定要将这篇笔记移到回收站吗？')) return;
      
      try {
        await fetch(`/api/notes/${noteId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        
        await this.loadAndDecryptAllData();
        
        if (this.selectedNote && this.selectedNote.id === noteId) {
          this.selectedNote = null;
          this.editingNote = { id: '', title: '', content: '', category_id: '', tags: '', is_pinned: false };
        }
        
        this.showToast('笔记已移到回收站');
      } catch (err) {
        console.error('删除笔记失败:', err);
        this.showToast('删除笔记失败: ' + err.message, 'error');
      }
    },

    async togglePin(note) {
      if (!note || !note.id) return;
      
      try {
        const encryptedNote = {
          title: await window.cryptoUtils.encrypt(note.title || '', this.masterKey),
          content: await window.cryptoUtils.encrypt(note.content || '', this.masterKey),
          tags: await window.cryptoUtils.encrypt(note.tags || '', this.masterKey),
          category_id: note.category_cipher || '',
          is_pinned: !note.is_pinned
        };

        await fetch(`/api/notes/${note.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify(encryptedNote)
        });

        await this.loadAndDecryptAllData();
        this.showToast(note.is_pinned ? '已取消置顶' : '已置顶');
      } catch (err) {
        console.error('切换置顶失败:', err);
        this.showToast('操作失败: ' + err.message, 'error');
      }
    },

    // ==============================================
    // 回收站
    // ==============================================
    async loadTrashedNotes() {
      try {
        const trashed = await this.loadTrashedNotesRaw();
        this.trashedNotes = await Promise.all(trashed.map(async (note) => {
          if (!note) return null;
          
          try {
            return {
              ...note,
              title: await window.cryptoUtils.decrypt(note.title_cipher, this.masterKey) || '',
              content: await window.cryptoUtils.decrypt(note.ciphertext, this.masterKey) || '',
              category_name: note.category_cipher 
                ? await window.cryptoUtils.decrypt(note.category_cipher, this.masterKey) || '未分类'
                : '未分类'
            };
          } catch (e) {
            console.error('解密回收站笔记失败:', e);
            return null;
          }
        }));
        
        this.trashedNotes = this.trashedNotes.filter(note => note !== null);
        this.stats.totalRecycle = this.trashedNotes.length;
      } catch (err) {
        console.error('加载回收站失败:', err);
      }
    },

    async restoreNote(noteId) {
      if (!noteId) return;
      
      try {
        await fetch(`/api/notes/${noteId}/restore`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        
        await this.loadAndDecryptAllData();
        await this.loadTrashedNotes();
        this.showToast('笔记已恢复');
      } catch (err) {
        console.error('恢复笔记失败:', err);
        this.showToast('恢复失败: ' + err.message, 'error');
      }
    },

    async permanentDeleteNote(noteId) {
      if (!noteId) return;
      if (!confirm('确定要永久删除这篇笔记吗？此操作不可恢复！')) return;
      
      try {
        await fetch(`/api/notes/${noteId}/permanent`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        
        await this.loadTrashedNotes();
        this.showToast('笔记已永久删除');
      } catch (err) {
        console.error('永久删除失败:', err);
        this.showToast('删除失败: ' + err.message, 'error');
      }
    },

    async emptyTrash() {
      if (!confirm('确定要清空回收站吗？所有笔记将被永久删除！')) return;
      
      try {
        await fetch('/api/notes/empty-trash', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        
        this.trashedNotes = [];
        this.stats.totalRecycle = 0;
        this.showToast('回收站已清空');
      } catch (err) {
        console.error('清空回收站失败:', err);
        this.showToast('操作失败: ' + err.message, 'error');
      }
    },

    // ==============================================
    // 分类管理
    // ==============================================
    showCategoryForm(editId = null) {
      this.categoryForm.editId = editId;
      if (editId) {
        const category = this.decryptedCategories.find(c => c.id === editId);
        if (category) {
          this.categoryForm.name = category.name;
        }
      } else {
        this.categoryForm.name = '';
      }
      this.categoryForm.visible = true;
    },

    async createOrUpdateCategory() {
      if (!this.categoryForm.name.trim()) {
        this.showToast('请输入分类名称', 'error');
        return;
      }

      try {
        const encryptedName = await window.cryptoUtils.encrypt(this.categoryForm.name.trim(), this.masterKey);
        
        if (this.categoryForm.editId) {
          await fetch(`/api/categories/${this.categoryForm.editId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({ name: encryptedName })
          });
          this.showToast('分类更新成功');
        } else {
          await fetch('/api/categories', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({ name: encryptedName })
          });
          this.showToast('分类创建成功');
        }

        await this.loadAndDecryptAllData();
        this.categoryForm.visible = false;
      } catch (err) {
        console.error('分类操作失败:', err);
        this.showToast('操作失败: ' + err.message, 'error');
      }
    },

    async deleteCategory(categoryId) {
      if (!confirm('确定要删除这个分类吗？该分类下的笔记将移到未分类。')) return;
      
      try {
        await fetch(`/api/categories/${categoryId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        
        if (this.selectedCategory === categoryId) {
          this.selectedCategory = null;
        }
        
        await this.loadAndDecryptAllData();
        this.showToast('分类已删除');
      } catch (err) {
        console.error('删除分类失败:', err);
        this.showToast('删除失败: ' + err.message, 'error');
      }
    },

    selectCategory(categoryId) {
      this.selectedCategory = categoryId;
      this.currentPage = 'notes';
    },

    clearCategoryFilter() {
      this.selectedCategory = null;
    },

    // ==============================================
    // 导出/导入
    // ==============================================
    exportAllNotes() {
      const exportData = {
        version: '2.2.4',
        exportTime: new Date().toISOString(),
        notes: this.decryptedNotes.filter(note => note).map(note => ({
          title: note.title || '',
          content: note.content || '',
          tags: note.tags || '',
          category: note.category_name || '未分类',
          is_pinned: note.is_pinned || false,
          created_at: note.created_at || '',
          updated_at: note.updated_at || ''
        })),
        categories: this.decryptedCategories.filter(category => category).map(category => ({
          name: category.name || '',
          created_at: category.created_at || ''
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `加密笔记备份_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showToast('笔记导出成功');
    },

    importNotes(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importData = JSON.parse(e.target.result);
          
          if (!importData.notes || !Array.isArray(importData.notes)) {
            throw new Error('无效的备份文件格式');
          }

          if (!confirm(`确定要导入 ${importData.notes.length} 篇笔记吗？`)) return;

          this.loading = true;
          
          if (importData.categories && Array.isArray(importData.categories)) {
            for (const category of importData.categories) {
              if (category && category.name) {
                const encryptedName = await window.cryptoUtils.encrypt(category.name, this.masterKey);
                await fetch('/api/categories', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                  },
                  body: JSON.stringify({ name: encryptedName })
                });
              }
            }
          }

          for (const note of importData.notes) {
            if (note && note.title) {
              const encryptedNote = {
                title: await window.cryptoUtils.encrypt(note.title, this.masterKey),
                content: await window.cryptoUtils.encrypt(note.content || '', this.masterKey),
                tags: await window.cryptoUtils.encrypt(note.tags || '', this.masterKey),
                category_id: '',
                is_pinned: note.is_pinned || false
              };

              await fetch('/api/notes', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(encryptedNote)
              });
            }
          }

          await this.loadAndDecryptAllData();
          this.showToast(`成功导入 ${importData.notes.length} 篇笔记`);
        } catch (err) {
          console.error('导入失败:', err);
          this.showToast('导入失败: ' + err.message, 'error');
        } finally {
          this.loading = false;
          event.target.value = '';
        }
      };
      reader.readAsText(file);
    },

    // ==============================================
    // 页面跳转
    // ==============================================
    goToPage(page) {
      this.saveCurrentDraft();
      
      this.currentPage = page;
      
      this.selectedNote = null;
      this.editingNote = { id: '', title: '', content: '', category_id: '', tags: '', is_pinned: false };
      this.showPreview = false;
      
      if (page === 'trash') {
        this.loadTrashedNotes();
      }
      
      if (page === 'notes') {
        this.clearCategoryFilter();
      }
    },

    // ==============================================
    // 时间格式化
    // ==============================================
    formatTime(timestamp) {
      if (!timestamp) return '未知时间';
      return new Date(timestamp).toLocaleString('zh-CN');
    },

    formatDate(timestamp) {
      if (!timestamp) return '未知日期';
      return new Date(timestamp).toLocaleDateString('zh-CN');
    },

    formatRelativeTime(timestamp) {
      if (!timestamp) return '未知时间';
      
      const now = new Date();
      const date = new Date(timestamp);
      const diff = now - date;
      
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      if (minutes < 1) return '刚刚';
      if (minutes < 60) return `${minutes}分钟前`;
      if (hours < 24) return `${hours}小时前`;
      if (days < 7) return `${days}天前`;
      return this.formatDate(timestamp);
    }
  }
});
const { ElMessage, ElMessageBox } = ElementPlus;
import { notesAPI } from '../api/notes.js';
import { categoriesAPI } from '../api/categories.js';
import { encryptNoteContent, decryptNoteContent } from '../utils/crypto-utils.js';

export default {
  name: 'NoteEditor',
  props: {
    noteId: {
      type: String,
      default: null
    }
  },
  emits: ['note-saved'],
  data() {
    return {
      title: '',
      content: '',
      categoryId: null,
      tags: '',
      loading: false,
      saving: false,
      isPreview: false,
      categoryList: [],
      originalNote: null,
      autoSaveTimer: null
    };
  },
  computed: {
    masterKey() {
      return sessionStorage.getItem('master_key');
    }
  },
  watch: {
    noteId: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.loadNote(newVal);
        } else {
          this.resetEditor();
        }
      }
    }
  },
  async mounted() {
    await this.loadCategories();
  },
  beforeUnmount() {
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
  },
  methods: {
    async loadCategories() {
      try {
        const result = await categoriesAPI.getCategories();
        if (result.success) {
          this.categoryList = [
            { value: null, label: '无分类' },
            ...(result.data || []).map(item => ({
              value: item.id,
              label: item.name_cipher
            }))
          ];
        }
      } catch (error) {
        console.error('加载分类失败:', error);
      }
    },

    async loadNote(id) {
      this.loading = true;
      try {
        const result = await notesAPI.getNote(id);
        if (result.success && result.data) {
          this.originalNote = result.data;
          this.title = result.data.title_cipher || '';
          this.content = await decryptNoteContent(
            result.data.ciphertext || '',
            this.masterKey,
            id
          );
          this.categoryId = result.data.category_cipher || null;
          this.tags = result.data.tags_cipher || '';
          this.startAutoSave();
        }
      } catch (error) {
        console.error('加载笔记失败:', error);
        ElMessage.error('加载笔记失败');
      } finally {
        this.loading = false;
      }
    },

    async handleSave() {
      if (!this.title.trim()) {
        ElMessage.error('请输入笔记标题');
        return;
      }
      if (!this.masterKey) {
        ElMessage.error('主密钥丢失，请重新登录');
        return;
      }

      this.saving = true;
      try {
        const noteId = this.noteId || crypto.randomUUID();
        const encryptedContent = await encryptNoteContent(
          this.content,
          this.masterKey,
          noteId
        );

        const noteData = {
          title: this.title.trim(),
          content: encryptedContent,
          category_id: this.categoryId,
          tags: this.tags.trim()
        };

        let result;
        if (this.noteId) {
          result = await notesAPI.updateNote(this.noteId, noteData);
        } else {
          result = await notesAPI.createNote(noteData);
        }

        if (result.success) {
          ElMessage.success('笔记保存成功');
          this.$emit('note-saved', result.data?.id || this.noteId);
        }
      } catch (error) {
        console.error('保存失败:', error);
        ElMessage.error('保存失败: ' + error.message);
      } finally {
        this.saving = false;
      }
    },

    async handleDelete() {
      if (!this.noteId) {
        this.resetEditor();
        return;
      }
      try {
        await ElMessageBox.confirm('确定要删除这篇笔记吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        const result = await notesAPI.deleteNote(this.noteId);
        if (result.success) {
          ElMessage.success('笔记已移至回收站');
          this.$emit('note-saved');
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除失败:', error);
          ElMessage.error('删除失败');
        }
      }
    },

    startAutoSave() {
      if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = setInterval(() => {
        if (this.title || this.content) {
          localStorage.setItem('draft_note', JSON.stringify({
            title: this.title,
            content: this.content,
            categoryId: this.categoryId,
            tags: this.tags,
            updateTime: Date.now()
          }));
        }
      }, 30000);
    },

    resetEditor() {
      this.title = '新建笔记 · ' + new Date().toLocaleString('zh-CN');
      this.content = '';
      this.categoryId = null;
      this.tags = '';
      this.originalNote = null;
      this.isPreview = false;
      const draft = localStorage.getItem('draft_note');
      if (draft) {
        try {
          const draftData = JSON.parse(draft);
          this.title = draftData.title || this.title;
          this.content = draftData.content || '';
          this.categoryId = draftData.categoryId || null;
          this.tags = draftData.tags || '';
        } catch {}
      }
    },

    togglePreview() {
      this.isPreview = !this.isPreview;
    }
  },
  template: `
    <div class="note-editor">
      <div class="editor-header-bar">
        <el-input
          v-model="title"
          placeholder="笔记标题"
          class="editor-title-input"
          :disabled="loading"
        />
        <el-button type="success" @click="() => {}">分享</el-button>
      </div>

      <div class="editor-toolbar">
        <el-select v-model="categoryId" placeholder="选择分类" size="default">
          <el-option 
            v-for="item in categoryList" 
            :key="item.value" 
            :label="item.label" 
            :value="item.value" 
          />
        </el-select>
        <el-input
          v-model="tags"
          placeholder="标签，用逗号分隔"
          class="tags-input"
        />
        <el-button @click="togglePreview">
          {{ isPreview ? '编辑' : '预览' }}
        </el-button>
      </div>

      <div class="editor-body" v-loading="loading">
        <div v-if="!isPreview" class="edit-area">
          <textarea
            v-model="content"
            class="editor-textarea"
            placeholder="在这里写笔记，支持Markdown语法..."
          ></textarea>
        </div>
        <div v-else class="preview-area" v-html="marked.parse(content || '')"></div>
      </div>

      <div class="editor-footer">
        <el-button type="danger" @click="handleDelete">删除笔记</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存笔记</el-button>
      </div>
    </div>
  `
};
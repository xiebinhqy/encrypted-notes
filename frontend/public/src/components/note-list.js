const { ElMessage } = ElementPlus;
import { notesAPI } from '../api/notes.js';

export default {
  name: 'NoteList',
  props: {
    categoryId: {
      type: String,
      default: null
    }
  },
  emits: ['note-select', 'note-deleted'],
  data() {
    return {
      notes: [],
      loading: false,
      searchKeyword: '',
      sortType: 'update_time'
    };
  },
  computed: {
    filteredNotes() {
      let list = [...this.notes];
      if (this.searchKeyword) {
        list = list.filter(note => 
          note.title_cipher?.toLowerCase().includes(this.searchKeyword.toLowerCase())
        );
      }
      if (this.sortType === 'update_time') {
        list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      } else if (this.sortType === 'create_time') {
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else if (this.sortType === 'title') {
        list.sort((a, b) => (a.title_cipher || '').localeCompare(b.title_cipher || ''));
      }
      return list;
    }
  },
  watch: {
    categoryId: {
      immediate: true,
      handler() {
        this.loadNotes();
      }
    }
  },
  methods: {
    async loadNotes() {
      this.loading = true;
      try {
        const result = await notesAPI.getNotes(this.categoryId);
        if (result.success) {
          this.notes = result.data || [];
        }
      } catch (error) {
        console.error('加载笔记失败:', error);
        ElMessage.error('加载笔记失败');
      } finally {
        this.loading = false;
      }
    },

    handleNoteSelect(note) {
      this.$emit('note-select', note.id);
    },

    formatTime(timestamp) {
      if (!timestamp) return '';
      const now = new Date();
      const noteTime = new Date(timestamp);
      const diffMs = now - noteTime;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return '刚刚';
      if (diffMins < 60) return `${diffMins}分钟前`;
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays < 30) return `${diffDays}天前`;
      return noteTime.toLocaleDateString('zh-CN');
    }
  },
  template: `
    <div class="notes-list">
      <div class="notes-header">
        <h3>我的笔记</h3>
        <div class="notes-toolbar">
          <el-select v-model="sortType" placeholder="按更新时间" size="small">
            <el-option label="按更新时间" value="update_time" />
            <el-option label="按创建时间" value="create_time" />
            <el-option label="按标题" value="title" />
          </el-select>
          <el-button type="primary" circle size="small" icon="Filter" />
        </div>
      </div>
      <div class="notes-search">
        <el-input 
          v-model="searchKeyword" 
          placeholder="搜索笔记" 
          clearable 
          @input="loadNotes"
        />
      </div>
      <div class="notes-list-content" v-loading="loading">
        <div
          v-for="note in filteredNotes"
          :key="note.id"
          class="note-card"
          :class="{ pinned: note.is_pinned }"
          @click="handleNoteSelect(note)"
        >
          <div class="note-card-header">
            <h4>{{ note.title_cipher || '无标题笔记' }}</h4>
            <div class="pinned-badge" v-if="note.is_pinned">
              📌 置顶
            </div>
          </div>
          <div class="note-tags">
            <span 
              v-if="note.category_cipher"
              class="note-tag purple"
            >
              {{ note.category_cipher }}
            </span>
            <span 
              v-for="(tag, index) in (note.tags_cipher || '').split(',').filter(t => t.trim())" 
              :key="index"
              class="note-tag"
              :class="['orange', 'pink', 'green'][index % 3]"
            >
              #{{ tag.trim() }}
            </span>
          </div>
          <div class="note-meta">
            <span>{{ formatTime(note.updated_at) }}</span>
            <span>修改{{ note.revision_count || 1 }}次</span>
          </div>
        </div>

        <div v-if="!loading && filteredNotes.length === 0" class="empty-state">
          <div class="icon">📝</div>
          <h4>暂无笔记</h4>
          <p>点击右上角「新建笔记」创建你的第一篇笔记</p>
        </div>
      </div>
    </div>
  `
};
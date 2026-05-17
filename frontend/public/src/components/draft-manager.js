const { ElMessage } = ElementPlus;

export default {
  name: 'DraftManager',
  emits: ['open-edit'],
  data() {
    return {
      drafts: []
    };
  },
  methods: {
    loadDrafts() {
      const draft = localStorage.getItem('draft_note');
      if (draft) {
        try {
          const draftData = JSON.parse(draft);
          this.drafts = [{
            id: 'draft',
            title: draftData.title || '无标题草稿',
            updateTime: new Date(draftData.updateTime).toLocaleString('zh-CN'),
            preview: draftData.content || '暂无内容'
          }];
        } catch {
          this.drafts = [];
        }
      } else {
        this.drafts = [];
      }
    },
    handleEdit(draft) {
      this.$emit('open-edit', null);
    },
    handleDelete(draft) {
      localStorage.removeItem('draft_note');
      this.loadDrafts();
      ElMessage.success('草稿已删除');
    }
  },
  mounted() {
    this.loadDrafts();
  },
  template: `
    <div class="drafts-page">
      <div class="content-header">
        <h2>草稿管理</h2>
        <el-button type="primary">+ 新建草稿</el-button>
      </div>
      <div class="content-body">
        <div class="drafts-grid">
          <div v-for="draft in drafts" :key="draft.id" class="draft-card">
            <h4>{{ draft.title }}</h4>
            <div class="meta">📁 未分类 · {{ draft.updateTime }}</div>
            <div class="preview">{{ draft.preview }}</div>
            <div class="draft-actions">
              <el-button type="danger" size="small" @click="handleDelete(draft)">删除</el-button>
              <el-button type="primary" size="small" @click="handleEdit(draft)">打开编辑</el-button>
            </div>
          </div>
        </div>

        <div v-if="drafts.length === 0" class="empty-state">
          <div class="icon">📝</div>
          <h4>暂无草稿</h4>
          <p>你还没有保存任何草稿</p>
        </div>
      </div>
    </div>
  `
};
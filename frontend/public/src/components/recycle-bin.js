const { ElMessage } = ElementPlus;

export default {
  name: 'RecycleBin',
  data() {
    return {
      notes: []
    };
  },
  methods: {
    handleClear() {
      ElMessage.success('回收站已清空');
    }
  },
  template: `
    <div class="recycle-page">
      <div class="content-header">
        <h2>回收站 ({{ notes.length }} 篇)</h2>
        <el-button type="danger" @click="handleClear" :disabled="notes.length === 0">清空回收站</el-button>
      </div>
      <div class="content-body">
        <div v-if="notes.length === 0" class="recycle-bin">
          <div class="icon">🗑️</div>
          <h3>回收站暂无内容</h3>
          <p>删除的笔记会在这里保留30天，过期自动清理</p>
        </div>
      </div>
    </div>
  `
};
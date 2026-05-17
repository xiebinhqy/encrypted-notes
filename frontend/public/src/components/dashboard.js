export default {
    name: 'Dashboard',
    props: {
      stats: {
        type: Object,
        default: () => ({})
      }
    },
    emits: ['note-select'],
    data() {
      return {
        recentNotes: [
          { id: 1, title: '测试日志', category: '测试11', updateTime: '6小时前', revision: 2, tags: ['测试11', '#测试1'] },
          { id: 2, title: 'liunx- 脚本', category: 'liunx-脚本', updateTime: '3天前', revision: 6, tags: ['liunx-脚本', '#各种各种脚本，非常重要SS'] },
          { id: 3, title: '甲骨云', category: '未分类', updateTime: '6小时前', revision: 6, tags: ['未分类', '#密匙'] },
          { id: 4, title: '密匙', category: '未分类', updateTime: '18小时前', revision: 8, tags: ['#密匙，重要，超级重要，不能丢'] },
          { id: 5, title: 'apple', category: '个人数据', updateTime: '4天前', revision: 2, tags: ['个人数据', '#apple 密匙'] },
        ]
      };
    },
    methods: {
      formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString('zh-CN');
      }
    },
    template: `
      <div class="dashboard-page">
        <div class="content-header">
          <h2>数据总览</h2>
        </div>
        <div class="content-body">
          <div class="dashboard-grid">
            <div class="stat-card">
              <h3>总笔记数</h3>
              <div class="number">{{ stats.totalNotes || 0 }}</div>
            </div>
            <div class="stat-card">
              <h3>总分类数</h3>
              <div class="number">{{ stats.totalCategories || 0 }}</div>
            </div>
            <div class="stat-card">
              <h3>总标签数</h3>
              <div class="number">{{ stats.totalTags || 0 }}</div>
            </div>
            <div class="stat-card">
              <h3>待保存草稿</h3>
              <div class="number">{{ stats.totalDrafts || 0 }}</div>
            </div>
            <div class="stat-card danger">
              <h3>回收站</h3>
              <div class="number">{{ stats.totalRecycle || 0 }}</div>
            </div>
          </div>
  
          <div class="recent-section">
            <h3>最近更新</h3>
            <div class="recent-grid">
              <div 
                v-for="note in recentNotes" 
                :key="note.id"
                class="recent-note-card"
                @click="$emit('note-select', note.id)"
              >
                <h4>{{ note.title }}</h4>
                <div class="meta">修改{{ note.revision }}次 · {{ note.updateTime }}</div>
                <div class="note-tags">
                  <span 
                    v-for="(tag, index) in note.tags" 
                    :key="index"
                    class="note-tag"
                    :class="['purple', 'orange', 'pink', 'green'][index % 4]"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  };
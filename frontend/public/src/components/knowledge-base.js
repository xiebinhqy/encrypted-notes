export default {
    name: 'KnowledgeBase',
    props: {
      categoryList: {
        type: Array,
        default: () => []
      }
    },
    data() {
      return {
        searchKeyword: ''
      };
    },
    computed: {
      filteredCategories() {
        if (!this.searchKeyword) return this.categoryList;
        return this.categoryList.filter(item => 
          item.name_cipher?.toLowerCase().includes(this.searchKeyword.toLowerCase())
        );
      }
    },
    template: `
      <div class="kb-page">
        <div class="kb-layout">
          <aside class="kb-sidebar">
            <div class="kb-search">
              <el-input v-model="searchKeyword" placeholder="搜索文档" clearable />
            </div>
            <div class="kb-tree">
              <div class="category-tree-item">
                📁 未分类 (2)
              </div>
              <div 
                v-for="category in filteredCategories" 
                :key="category.id" 
                class="category-tree-item"
              >
                📁 {{ category.name_cipher }} (0)
              </div>
            </div>
          </aside>
          <div class="kb-content">
            <div class="kb-header">
              <h2>我的知识库</h2>
              <el-button type="primary">编辑</el-button>
            </div>
            <p style="color: var(--text-secondary); margin-bottom: 32px;">
              这里是你的个人知识空间，所有内容端对端加密，仅你可查看。
            </p>
            <div class="kb-stats-grid">
              <div class="stat-card">
                <h3>总笔记数</h3>
                <div class="number">5</div>
              </div>
              <div class="stat-card">
                <h3>总分类数</h3>
                <div class="number">{{ categoryList.length }}</div>
              </div>
              <div class="stat-card">
                <h3>最近更新</h3>
                <div class="number" style="font-size: 16px;">6小时前</div>
              </div>
            </div>
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px;">文档分类</h3>
            <div class="kb-category-grid">
              <div class="kb-category-card">
                <div class="icon">📂</div>
                <h4>未分类</h4>
                <div class="count">2 篇文档</div>
              </div>
              <div 
                v-for="category in categoryList" 
                :key="category.id"
                class="kb-category-card"
              >
                <div class="icon">📂</div>
                <h4>{{ category.name_cipher }}</h4>
                <div class="count">0 篇文档</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  };
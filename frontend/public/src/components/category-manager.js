const { ElMessage } = ElementPlus;
import { categoriesAPI } from '../api/categories.js';

export default {
  name: 'CategoryManager',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:visible', 'created'],
  data() {
    return {
      categoryName: '',
      loading: false
    };
  },
  methods: {
    handleClose() {
      this.$emit('update:visible', false);
      this.categoryName = '';
    },
    async handleCreate() {
      if (!this.categoryName.trim()) {
        ElMessage.error('请输入分类名称');
        return;
      }

      this.loading = true;
      try {
        const result = await categoriesAPI.createCategory({
          name: this.categoryName.trim()
        });
        if (result.success) {
          ElMessage.success('分类创建成功');
          this.$emit('created', result.data);
          this.handleClose();
        }
      } catch (error) {
        console.error('创建分类失败:', error);
        ElMessage.error('创建分类失败');
      } finally {
        this.loading = false;
      }
    }
  },
  template: `
    <el-dialog
      v-model="visible"
      title="创建分类"
      width="500px"
      @close="handleClose"
      custom-class="modal-card"
    >
      <el-form>
        <el-form-item label="分类名称">
          <el-input
            v-model="categoryName"
            placeholder="请输入分类名称"
            class="modal-input"
            @keyup.enter="handleCreate"
            :disabled="loading"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleCreate">确认创建</el-button>
      </template>
    </el-dialog>
  `
};
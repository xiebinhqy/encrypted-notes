const { ElMessage } = ElementPlus;
import { sharesAPI } from '../api/shares.js';

export default {
  name: 'ShareModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    noteId: {
      type: String,
      default: null
    }
  },
  emits: ['update:visible'],
  data() {
    return {
      shareKey: '',
      shareLink: '',
      maxViews: 1,
      expiresAt: null,
      loading: false,
      generating: false
    };
  },
  methods: {
    handleClose() {
      this.$emit('update:visible', false);
      this.shareKey = '';
      this.shareLink = '';
    },
    async handleGenerateShare() {
      if (!this.noteId) {
        ElMessage.error('请先选择笔记');
        return;
      }
      this.generating = true;
      try {
        const shareData = {
          max_views: this.maxViews,
          expires_at: this.expiresAt
        };
        const result = await sharesAPI.createShare(this.noteId, shareData);
        if (result.success) {
          this.shareKey = result.data.share_key;
          this.shareLink = `${window.location.origin}${result.data.share_link}`;
          ElMessage.success('分享链接生成成功');
        }
      } catch (error) {
        ElMessage.error('生成分享链接失败');
      } finally {
        this.generating = false;
      }
    },
    async handleCopyLink() {
      try {
        await navigator.clipboard.writeText(this.shareLink);
        ElMessage.success('链接已复制到剪贴板');
      } catch {
        ElMessage.error('复制失败，请手动复制');
      }
    }
  },
  template: `
    <el-dialog
      v-model="visible"
      title="分享笔记"
      width="500px"
      @close="handleClose"
      custom-class="modal-card"
    >
      <div v-if="!shareKey" class="share-form">
        <el-form label-width="120px">
          <el-form-item label="最大查看次数">
            <el-input-number v-model="maxViews" :min="1" :max="100" style="width: 100%" />
          </el-form-item>
          <el-form-item label="过期时间">
            <el-date-picker
              v-model="expiresAt"
              type="datetime"
              placeholder="选择过期时间"
              style="width: 100%"
              value-format="x"
            />
          </el-form-item>
        </el-form>
        <el-button
          type="primary"
          :loading="generating"
          @click="handleGenerateShare"
          block
          style="margin-top: 16px"
        >
          生成分享链接
        </el-button>
      </div>

      <div v-else class="share-result">
        <p class="result-tip">分享链接已生成，任何人可通过链接查看笔记内容</p>
        <el-input v-model="shareLink" readonly class="share-link-input">
          <template #append>
            <el-button @click="handleCopyLink">复制</el-button>
          </template>
        </el-input>
        <p class="result-info">
          最大查看次数：{{ maxViews }}次
        </p>
      </div>
    </el-dialog>
  `
};
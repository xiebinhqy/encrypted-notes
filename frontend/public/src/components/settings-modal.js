const { ElMessage } = ElementPlus;

export default {
  name: 'SettingsModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    lockSettings: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update:visible', 'update:lockSettings'],
  data() {
    return {
      activeTab: 'security'
    };
  },
  methods: {
    handleClose() {
      this.$emit('update:visible', false);
    },
    handleSave() {
      this.$emit('update:lockSettings', { ...this.lockSettings });
      ElMessage.success('设置已保存');
      this.handleClose();
    }
  },
  template: `
    <el-dialog
      v-model="visible"
      title="设置"
      width="600px"
      @close="handleClose"
      custom-class="modal-card"
    >
      <el-tabs v-model="activeTab">
        <el-tab-pane label="安全设置" name="security">
          <el-form label-width="160px">
            <el-form-item label="启用闲置自动锁定">
              <el-switch v-model="lockSettings.autoLock" />
            </el-form-item>
            <el-form-item label="自动锁定时长" v-if="lockSettings.autoLock">
              <el-select v-model="lockSettings.lockDuration" style="width: 100%">
                <el-option :value="5" label="5分钟" />
                <el-option :value="10" label="10分钟" />
                <el-option :value="30" label="30分钟" />
                <el-option :value="60" label="1小时" />
              </el-select>
            </el-form-item>
          </el-form>
          <div class="security-tips">
            <p>安全提示：</p>
            <ul>
              <li>请妥善保管你的主密钥，丢失后无法恢复数据</li>
              <li>所有数据均在浏览器端加密后上传，服务器无法读取你的笔记内容</li>
              <li>不要在公共设备上勾选「记住登录」</li>
            </ul>
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSave">保存设置</el-button>
      </template>
    </el-dialog>
  `
};
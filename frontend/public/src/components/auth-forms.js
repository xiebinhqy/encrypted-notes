const { ElMessage } = ElementPlus;
import { authAPI } from '../api/auth.js';
import { encryptMasterKey } from '../utils/crypto-utils.js';

export default {
  name: 'AuthForms',
  emits: ['login-success'],
  data() {
    return {
      masterKey: '',
      isLoading: false,
      isResetMode: false,
      recoveryCode: ''
    };
  },
  methods: {
    async handleLogin() {
      if (!this.masterKey.trim()) {
        ElMessage.error('请输入主密钥');
        return;
      }

      this.isLoading = true;
      try {
        const keyHash = await encryptMasterKey(this.masterKey.trim());
        const result = await authAPI.login({ key_hash: keyHash });
        
        if (result.success) {
          ElMessage.success(result.message);
          localStorage.setItem('token', result.token);
          localStorage.setItem('user_id', result.user_id);
          sessionStorage.setItem('master_key', this.masterKey.trim());
          this.$emit('login-success', result);
          this.masterKey = '';
        }
      } catch (error) {
        console.error('登录失败:', error);
        ElMessage.error(error.message || '登录失败，请重试');
      } finally {
        this.isLoading = false;
      }
    },

    async handleReset() {
      if (!this.recoveryCode.trim()) {
        ElMessage.error('请输入恢复码');
        return;
      }
      ElMessage.info('恢复功能开发中，敬请期待');
    },

    toggleResetMode() {
      this.isResetMode = !this.isResetMode;
      this.masterKey = '';
      this.recoveryCode = '';
    }
  },
  template: `
    <div class="login-page">
      <div class="login-header">
        <div class="logo">
          🔒 加密笔记
        </div>
        <el-button type="primary" @click="isResetMode = false">登录/创建</el-button>
      </div>

      <div class="login-card" v-if="!isResetMode">
        <h2>端到端加密私人笔记</h2>
        <p class="desc">所有数据浏览器加密后上传，仅你可解密</p>
        
        <el-input
          v-model="masterKey"
          type="password"
          placeholder="输入主密钥（新密钥自动创建账号）"
          size="large"
          class="login-input"
          @keyup.enter="handleLogin"
          :disabled="isLoading"
          show-password
        />

        <el-button
          type="primary"
          size="large"
          class="login-button"
          :loading="isLoading"
          @click="handleLogin"
        >
          开始使用
        </el-button>

        <p class="login-tip">
          忘记主密钥？<a href="javascript:;" @click="toggleResetMode">使用恢复码重置</a>
        </p>
      </div>

      <div class="login-card" v-else>
        <h2>恢复账号</h2>
        <p class="desc">请输入你创建账号时保存的恢复码</p>
        
        <el-input
          v-model="recoveryCode"
          placeholder="请输入恢复码"
          size="large"
          class="login-input"
          @keyup.enter="handleReset"
          :disabled="isLoading"
        />

        <el-button
          type="primary"
          size="large"
          class="login-button"
          :loading="isLoading"
          @click="handleReset"
        >
          验证恢复码
        </el-button>

        <p class="login-tip">
          <a href="javascript:;" @click="toggleResetMode">返回登录</a>
        </p>
      </div>

      <div class="features-grid">
        <div class="feature-card">
          <div class="icon">🔒</div>
          <h3>军工级端到端加密</h3>
          <p>AES-GCM加密，内容仅在浏览器加密/解密，任何人无法读取</p>
        </div>
        <div class="feature-card">
          <div class="icon">🔑</div>
          <h3>一次性恢复码</h3>
          <p>主密钥丢失可通过一次性恢复码重置，每个恢复码仅能使用一次</p>
        </div>
        <div class="feature-card">
          <div class="icon">📚</div>
          <h3>完整知识库系统</h3>
          <p>自动按分类归纳笔记，飞书同款知识库体验</p>
        </div>
        <div class="feature-card">
          <div class="icon">🌌</div>
          <h3>多空间完全隔离</h3>
          <p>不同主密钥对应完全独立的加密空间，互不干扰</p>
        </div>
      </div>
    </div>
  `
};
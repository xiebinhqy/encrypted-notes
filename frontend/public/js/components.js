/**
 * 可复用组件工具
 * 版本：v2.1.0
 */

export const components = {
    /**
     * 创建加载动画
     * @param {HTMLElement} container 容器元素
     */
    showLoading(container) {
      const loading = document.createElement('div');
      loading.className = 'loading-overlay absolute inset-0 bg-dark/80 flex items-center justify-center z-50';
      loading.innerHTML = `
        <div class="text-center">
          <div class="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin mx-auto mb-2"></div>
          <p class="text-white text-sm">加载中...</p>
        </div>
      `;
      container.style.position = 'relative';
      container.appendChild(loading);
    },
  
    /**
     * 隐藏加载动画
     * @param {HTMLElement} container 容器元素
     */
    hideLoading(container) {
      const loading = container.querySelector('.loading-overlay');
      if (loading) {
        loading.remove();
      }
    },
  
    /**
     * 创建确认对话框
     * @param {string} title 标题
     * @param {string} message 消息内容
     * @param {Function} onConfirm 确认回调
     * @param {Function} onCancel 取消回调
     */
    confirmDialog(title, message, onConfirm, onCancel = null) {
      // 移除现有对话框
      const existingDialog = document.querySelector('.confirm-dialog');
      if (existingDialog) existingDialog.remove();
  
      // 创建新对话框
      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog fixed inset-0 bg-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';
      dialog.innerHTML = `
        <div class="glass-effect rounded-xl p-6 w-full max-w-md modal-enter">
          <h3 class="text-xl font-bold text-white mb-4">${title}</h3>
          <p class="text-gray-300 mb-6">${message}</p>
          <div class="flex space-x-3">
            <button class="flex-1 bg-dark-lighter hover:bg-dark text-white py-2 rounded-lg transition-colors cancel-btn">
              取消
            </button>
            <button class="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors confirm-btn">
              确认
            </button>
          </div>
        </div>
      `;
  
      document.body.appendChild(dialog);
  
      // 绑定事件
      dialog.querySelector('.cancel-btn').addEventListener('click', () => {
        dialog.remove();
        if (onCancel) onCancel();
      });
  
      dialog.querySelector('.confirm-btn').addEventListener('click', () => {
        dialog.remove();
        if (onConfirm) onConfirm();
      });
  
      // 点击背景关闭
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          dialog.remove();
          if (onCancel) onCancel();
        }
      });
    }
  };
/**
 * 通用工具类
 * 版本：v2.0.0 - 原始版本
 */

/**
 * 格式化时间
 * @param {number} timestamp 时间戳
 * @returns {string} 格式化后的时间字符串
 */
export function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    
    // 今天
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // 本周内
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (date > weekAgo) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return `${weekdays[date.getDay()]} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // 今年
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }
    
    // 往年
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  
  /**
   * 显示Toast提示
   * @param {string} message 提示信息
   * @param {string} type 提示类型：success, error, warning, info
   * @param {number} duration 显示时长（毫秒）
   */
  export function showToast(message, type = 'info', duration = 3000) {
    // 创建Toast容器
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed top-4 right-4 z-50 space-y-2';
      document.body.appendChild(container);
    }
    
    // 创建Toast元素
    const toast = document.createElement('div');
    
    // 设置样式
    let bgColor = 'bg-gray-700';
    let icon = 'fa-info-circle';
    
    switch (type) {
      case 'success':
        bgColor = 'bg-success';
        icon = 'fa-check-circle';
        break;
      case 'error':
        bgColor = 'bg-danger';
        icon = 'fa-times-circle';
        break;
      case 'warning':
        bgColor = 'bg-warning';
        icon = 'fa-exclamation-triangle';
        break;
      case 'info':
      default:
        bgColor = 'bg-primary';
        icon = 'fa-info-circle';
        break;
    }
    
    toast.className = `${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 transform transition-all duration-300 translate-x-full`;
    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${message}</span>
    `;
    
    // 添加到容器
    container.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
    }, 10);
    
    // 自动隐藏
    setTimeout(() => {
      toast.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }
  
  // 导出工具对象
  export const utils = {
    formatTime,
    showToast
  };
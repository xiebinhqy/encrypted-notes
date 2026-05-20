/**
 * 日志工具类
 * 版本：v1.0.0
 * 统一处理日志输出
 */

/**
 * 日志级别枚举
 */
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3
};

// 当前日志级别
const CURRENT_LEVEL = LOG_LEVELS.INFO;

/**
 * 格式化日志消息
 * @param {string} level 日志级别
 * @param {string} message 日志消息
 * @param {object} data 附加数据
 * @returns {string} 格式化后的日志字符串
 */
function formatLog(level, message, data = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toLowerCase(),
    message,
    data
  };

  return JSON.stringify(logEntry);
}

/**
 * 调试日志
 * @param {string} message 日志消息
 * @param {object} data 附加数据
 */
export function debug(message, data = {}) {
  if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
    console.debug(formatLog('DEBUG', message, data));
  }
}

/**
 * 信息日志
 * @param {string} message 日志消息
 * @param {object} data 附加数据
 */
export function info(message, data = {}) {
  if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
    console.info(formatLog('INFO', message, data));
  }
}

/**
 * 警告日志
 * @param {string} message 日志消息
 * @param {object} data 附加数据
 */
export function warning(message, data = {}) {
  if (CURRENT_LEVEL <= LOG_LEVELS.WARNING) {
    console.warn(formatLog('WARNING', message, data));
  }
}

/**
 * 错误日志
 * @param {string} message 日志消息
 * @param {object} data 附加数据
 */
export function error(message, data = {}) {
  if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
    console.error(formatLog('ERROR', message, data));
  }
}

// 导出logger对象
export const logger = {
  debug,
  info,
  warning,
  error
};
/**
 * 结构化日志工具
 * @version v2.1.1
 * @date 2026-05-20
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLevel = LOG_LEVELS[globalThis.env?.LOG_LEVEL || 'INFO'] || LOG_LEVELS.INFO;

/**
 * 日志工具类
 */
class Logger {
  /**
   * 格式化日志消息
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   * @returns {Object} 格式化后的日志对象
   */
  #format(level, message, data = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      environment: globalThis.env?.ENVIRONMENT || 'unknown'
    };
  }

  /**
   * 输出调试日志
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   */
  debug(message, data = {}) {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.debug(JSON.stringify(this.#format('DEBUG', message, data)));
    }
  }

  /**
   * 输出信息日志
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   */
  info(message, data = {}) {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.info(JSON.stringify(this.#format('INFO', message, data)));
    }
  }

  /**
   * 输出警告日志
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   */
  warn(message, data = {}) {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn(JSON.stringify(this.#format('WARN', message, data)));
    }
  }

  /**
   * 输出错误日志
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   */
  error(message, data = {}) {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      console.error(JSON.stringify(this.#format('ERROR', message, data)));
    }
  }
}

export default new Logger();
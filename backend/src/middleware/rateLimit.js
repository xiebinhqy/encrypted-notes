/**
 * 登录限流中间件
 * 防止暴力破解
 * 版本：v2.1.0
 */

import { response } from '../utils/response.js';
import { logger } from '../utils/logger.js';

/**
 * 登录限流中间件
 * @param {string} email 用户邮箱
 * @param {object} kv KV命名空间
 * @returns {Promise<boolean>} 是否允许登录
 */
export async function rateLimitMiddleware(email, kv) {
  const key = `rate_limit:${email}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15分钟窗口
  const maxAttempts = 5; // 最大尝试次数

  try {
    // 获取当前尝试次数
    const value = await kv.get(key);
    let attempts = value ? JSON.parse(value) : { count: 0, windowStart: now };

    // 如果窗口已过期，重置计数
    if (now - attempts.windowStart > windowMs) {
      attempts = { count: 0, windowStart: now };
    }

    // 增加尝试次数
    attempts.count++;

    // 保存到KV
    await kv.put(key, JSON.stringify(attempts), {
      expirationTtl: Math.ceil(windowMs / 1000)
    });

    // 检查是否超过限制
    if (attempts.count > maxAttempts) {
      logger.warn('登录尝试次数超过限制', { email, attempts: attempts.count });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('登录限流检查失败', { error: error.message });
    // 如果KV出错，允许登录（降级处理）
    return true;
  }
}

/**
 * 登录成功后重置尝试次数
 * @param {string} email 用户邮箱
 * @param {object} kv KV命名空间
 */
export async function resetRateLimit(email, kv) {
  const key = `rate_limit:${email}`;
  await kv.delete(key);
}
/**
 * 登录限流中间件
 * @version v2.1.1
 * @date 2026-05-20
 * @description 使用LOGIN_RATE_LIMIT KV命名空间
 */

import { RateLimitError } from '../utils/errors.js';
import { createResponse } from '../utils/response.js';
import logger from '../utils/logger.js';

/**
 * 限流中间件
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response|null>} 响应对象或null
 */
export default async function rateLimitMiddleware(request, env) {
  try {
    // 只对认证接口进行限流
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/auth')) {
      return null;
    }
    
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const key = `ratelimit:${clientIP}`;
    
    // 从KV获取当前计数
    let current = await env.LOGIN_RATE_LIMIT.get(key, { type: 'json' });
    const now = Date.now();
    const windowMs = 60000; // 1分钟
    const maxRequests = 100; // 最多100次
    
    if (!current || now - current.timestamp > windowMs) {
      // 窗口过期，重置计数
      current = {
        count: 1,
        timestamp: now
      };
    } else {
      // 增加计数
      current.count++;
    }
    
    // 保存到KV
    await env.LOGIN_RATE_LIMIT.put(key, JSON.stringify(current), {
      expirationTtl: Math.ceil(windowMs / 1000)
    });
    
    // 检查是否超过限制
    if (current.count > maxRequests) {
      logger.warn('Rate limit exceeded', {
        clientIP,
        count: current.count,
        max: maxRequests
      });
      throw new RateLimitError(`Too many requests. Please try again later.`);
    }
    
    return null;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return createResponse({ error: error.message }, 429);
    }
    logger.error('Rate limit middleware error', { error: error.message });
    return null;
  }
}
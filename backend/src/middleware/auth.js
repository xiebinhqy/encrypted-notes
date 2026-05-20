/**
 * 认证中间件
 * 版本：v2.2.4 - 使用标准JWT工具类
 * 功能：验证请求中的JWT令牌，提取用户信息
 */

import { verify } from '../utils/jwt.js';

/**
 * 认证错误类
 * 用于统一处理认证相关的错误
 */
export class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

/**
 * 认证中间件
 * 从请求头中提取Bearer令牌并验证
 * @param {Request} request Cloudflare Worker请求对象
 * @param {object} env 环境变量
 * @returns {Promise<object>} 用户信息对象
 * @throws {AuthenticationError} 认证失败时抛出错误
 */
export async function authMiddleware(request, env) {
  try {
    // 获取Authorization头
    const authHeader = request.headers.get('Authorization');
    
    // 检查是否存在Authorization头
    if (!authHeader) {
      throw new AuthenticationError('缺少认证令牌：请求头中未包含Authorization字段');
    }

    // 检查是否为Bearer令牌格式
    if (!authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('无效的令牌格式：必须使用Bearer认证方案');
    }

    // 提取令牌
    const token = authHeader.substring(7);
    
    // 验证令牌
    const payload = await verify(token, env.JWT_SECRET);

    // 返回用户信息
    return {
      userId: payload.userId,
      keyHash: payload.keyHash,
      isAdmin: payload.isAdmin || false
    };
  } catch (error) {
    // 包装为认证错误
    throw new AuthenticationError(error.message || '认证失败');
  }
}
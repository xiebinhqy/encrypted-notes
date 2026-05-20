/**
 * 认证相关处理函数
 * 版本：v2.2.4 - 使用标准JWT工具类
 * 功能：处理登录、注册、重置密钥、刷新令牌等认证相关请求
 */

import { sign } from '../utils/jwt.js';
import { response } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { AuthenticationError } from '../middleware/auth.js';

/**
 * 生成16位大写字母数字恢复码
 * 使用加密安全的随机数生成器
 * @returns {string} 16位恢复码
 */
function generateRecoveryCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  const array = new Uint8Array(16);
  
  // 使用加密安全的随机数生成器
  crypto.getRandomValues(array);
  
  for (let i = 0; i < 16; i++) {
    code += chars[array[i] % chars.length];
  }
  
  return code;
}

/**
 * 用户登录/注册处理函数
 * 如果用户不存在则自动创建新用户
 * @param {Request} request Cloudflare Worker请求对象
 * @param {object} env 环境变量
 * @returns {Promise<Response>} 响应对象
 */
export async function loginHandler(request, env) {
  try {
    // 解析请求体
    const { keyHash } = await request.json();

    // 验证密钥哈希格式
    if (!keyHash || keyHash.length !== 64) {
      return response.error('无效的密钥哈希：必须是64位SHA-256哈希值', 400);
    }

    // 检查用户是否已存在
    let user = await env.DB.prepare(
      'SELECT id, key_hash, is_active, recovery_code FROM users WHERE key_hash = ?'
    ).bind(keyHash).first();

    let isNewUser = false;

    // 如果用户不存在，创建新用户
    if (!user) {
      const userId = crypto.randomUUID();
      const recoveryCode = generateRecoveryCode();
      
      // 插入新用户到数据库
      await env.DB.prepare(
        'INSERT INTO users (id, key_hash, recovery_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        userId,
        keyHash,
        recoveryCode,
        Date.now(),
        Date.now()
      ).run();

      // 构造用户对象
      user = {
        id: userId,
        key_hash: keyHash,
        is_active: 1,
        recovery_code: recoveryCode
      };

      isNewUser = true;
      logger.info('新用户自动创建成功', { userId });
    }

    // 检查用户是否被禁用
    if (user.is_active !== 1) {
      return response.error('账号已被禁用', 403);
    }

    // 生成JWT令牌
    const token = await sign(
      { 
        userId: user.id, 
        keyHash: user.key_hash, 
        isAdmin: false 
      },
      env.JWT_SECRET,
      '7d' // 令牌有效期7天
    );

    logger.info('用户登录成功', { userId: user.id, isNewUser });

    // 返回成功响应
    return response.success(
      {
        token,
        userId: user.id,
        isNewUser
      },
      isNewUser ? '账号创建成功' : '登录成功'
    );
  } catch (error) {
    logger.error('用户登录失败', { error: error.message, stack: error.stack });
    return response.serverError();
  }
}

/**
 * 使用恢复码重置主密钥处理函数
 * @param {Request} request Cloudflare Worker请求对象
 * @param {object} env 环境变量
 * @returns {Promise<Response>} 响应对象
 */
export async function resetKeyHandler(request, env) {
  try {
    // 解析请求体
    const { recoveryCode, newKeyHash } = await request.json();

    // 验证恢复码格式
    if (!recoveryCode || !/^[A-Z0-9]{16}$/.test(recoveryCode)) {
      return response.error('无效的恢复码格式：必须是16位大写字母数字', 400);
    }

    // 验证新密钥哈希格式
    if (!newKeyHash || newKeyHash.length !== 64) {
      return response.error('无效的新密钥哈希：必须是64位SHA-256哈希值', 400);
    }

    // 查找用户
    const user = await env.DB.prepare(
      'SELECT id, recovery_code FROM users WHERE recovery_code = ?'
    ).bind(recoveryCode).first();

    // 检查恢复码是否有效
    if (!user) {
      return response.error('恢复码无效或已被使用', 400);
    }

    // 生成新的恢复码
    const newRecoveryCode = generateRecoveryCode();
    
    // 更新用户密钥和恢复码
    await env.DB.prepare(
      'UPDATE users SET key_hash = ?, recovery_code = ?, updated_at = ? WHERE id = ?'
    ).bind(
      newKeyHash,
      newRecoveryCode,
      Date.now(),
      user.id
    ).run();

    // 生成新的JWT令牌
    const token = await sign(
      { 
        userId: user.id, 
        keyHash: newKeyHash, 
        isAdmin: false 
      },
      env.JWT_SECRET,
      '7d'
    );

    logger.info('主密钥重置成功', { userId: user.id });

    // 返回成功响应
    return response.success(
      {
        token,
        userId: user.id,
        newRecoveryCode
      },
      '主密钥重置成功'
    );
  } catch (error) {
    logger.error('重置主密钥失败', { error: error.message, stack: error.stack });
    return response.serverError();
  }
}

/**
 * 生成新的恢复码处理函数
 * 需要用户已登录
 * @param {Request} request Cloudflare Worker请求对象
 * @param {object} env 环境变量
 * @param {object} user 用户信息
 * @returns {Promise<Response>} 响应对象
 */
export async function generateRecoveryCodeHandler(request, env, user) {
  try {
    // 生成新的恢复码
    const newRecoveryCode = generateRecoveryCode();
    
    // 更新用户恢复码
    await env.DB.prepare(
      'UPDATE users SET recovery_code = ?, updated_at = ? WHERE id = ?'
    ).bind(
      newRecoveryCode,
      Date.now(),
      user.userId
    ).run();

    logger.info('恢复码重新生成成功', { userId: user.userId });

    // 返回成功响应
    return response.success(
      {
        recoveryCode: newRecoveryCode
      },
      '恢复码生成成功'
    );
  } catch (error) {
    logger.error('生成恢复码失败', { error: error.message, stack: error.stack, userId: user.userId });
    return response.serverError();
  }
}

/**
 * 刷新令牌处理函数
 * 生成新的JWT令牌，延长有效期
 * @param {Request} request Cloudflare Worker请求对象
 * @param {object} env 环境变量
 * @param {object} user 用户信息
 * @returns {Promise<Response>} 响应对象
 */
export async function refreshTokenHandler(request, env, user) {
  try {
    // 验证用户是否存在
    const userResult = await env.DB.prepare(
      'SELECT id, is_active FROM users WHERE id = ?'
    ).bind(user.userId).first();

    // 检查用户是否存在
    if (!userResult) {
      throw new AuthenticationError('用户不存在');
    }

    // 检查用户是否被禁用
    if (userResult.is_active !== 1) {
      throw new AuthenticationError('账号已被禁用');
    }

    // 生成新的JWT令牌
    const token = await sign(
      { 
        userId: user.userId, 
        keyHash: user.keyHash, 
        isAdmin: user.isAdmin 
      },
      env.JWT_SECRET,
      '7d'
    );

    logger.info('令牌刷新成功', { userId: user.userId });

    // 返回成功响应
    return response.success(
      {
        token
      },
      '令牌刷新成功'
    );
  } catch (error) {
    logger.error('刷新令牌失败', { error: error.message, stack: error.stack, userId: user.userId });
    
    // 处理认证错误
    if (error instanceof AuthenticationError) {
      return response.error(error.message, error.statusCode);
    }
    
    // 处理其他错误
    return response.serverError();
  }
}
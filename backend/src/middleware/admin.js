/**
 * 管理员权限中间件
 * 私有功能专用
 * 版本：v2.1.0
 */

import { AuthorizationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * 管理员权限验证中间件
 * @param {object} user 用户信息
 * @throws {AuthorizationError}
 */
export function adminMiddleware(user) {
  if (!user.isAdmin) {
    logger.warn('非管理员用户尝试访问私有功能', {
      userId: user.userId,
      email: user.email
    });
    throw new AuthorizationError('需要管理员权限');
  }
}
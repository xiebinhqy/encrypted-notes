/**
 * 管理员权限中间件
 * @version v2.1.1
 * @date 2026-05-20
 */

import { ForbiddenError } from '../utils/errors.js';
import { createResponse } from '../utils/response.js';
import logger from '../utils/logger.js';

/**
 * 管理员权限中间件
 * @param {Request} request - 请求对象
 * @returns {Response|null} 响应对象或null
 */
export default function adminMiddleware(request) {
  try {
    if (!request.user || !request.user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }
    return null;
  } catch (error) {
    logger.warn('Admin access denied', {
      userId: request.user?.id,
      error: error.message
    });
    return createResponse({ error: error.message }, 403);
  }
}
/**
 * 认证相关路由
 * 版本：v2.2.4 - 修复response导入问题
 * 定义所有认证相关的API路由
 */

import { loginHandler, resetKeyHandler, generateRecoveryCodeHandler, refreshTokenHandler } from '../handlers/authHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { response } from '../utils/response.js';

export const authRoutes = {
  // 用户登录/注册
  '/api/auth/login': {
    POST: loginHandler
  },
  
  // 使用恢复码重置主密钥
  '/api/auth/reset-key': {
    POST: resetKeyHandler
  },
  
  // 生成新的恢复码（需要登录）
  '/api/auth/generate-recovery-code': {
    POST: async (request, env, db) => {
      const user = await authMiddleware(request, env);
      return generateRecoveryCodeHandler(request, env, db, user);
    }
  },
  
  // 刷新令牌（需要登录）
  '/api/auth/refresh': {
    POST: async (request, env, db) => {
      try {
        const user = await authMiddleware(request, env);
        return refreshTokenHandler(request, env, user);
      } catch (error) {
        // 令牌验证失败，返回401错误
        return response.error('令牌无效或已过期', 401);
      }
    }
  }
};
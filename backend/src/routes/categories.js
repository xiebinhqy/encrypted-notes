/**
 * 分类相关路由
 * 版本：v1.0.1 - 修复路由重复定义问题
 * 定义所有分类相关的API路由
 */

import { createCategoryHandler, updateCategoryHandler, deleteCategoryHandler, getAllCategoriesHandler } from '../handlers/categoriesHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { response } from '../utils/response.js';

export const categoriesRoutes = {
  // 分类根路由（支持GET和POST）
  '/api/categories': {
    // 获取所有分类
    GET: async (request, env, db) => {
      try {
        const user = await authMiddleware(request, env);
        return getAllCategoriesHandler(request, env, user);
      } catch (error) {
        return response.error(error.message, error.statusCode || 401);
      }
    },
    
    // 创建新分类
    POST: async (request, env, db) => {
      try {
        const user = await authMiddleware(request, env);
        return createCategoryHandler(request, env, user);
      } catch (error) {
        return response.error(error.message, error.statusCode || 401);
      }
    }
  },

  // 单条分类路由（支持PUT、DELETE）
  '/api/categories/:id': {
    // 更新分类
    PUT: async (request, env, db) => {
      try {
        const user = await authMiddleware(request, env);
        return updateCategoryHandler(request, env, user);
      } catch (error) {
        return response.error(error.message, error.statusCode || 401);
      }
    },
    
    // 删除分类
    DELETE: async (request, env, db) => {
      try {
        const user = await authMiddleware(request, env);
        return deleteCategoryHandler(request, env, user);
      } catch (error) {
        return response.error(error.message, error.statusCode || 401);
      }
    }
  }
};
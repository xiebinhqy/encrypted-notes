/**
 * 标签管理路由
 * 版本：v2.1.0
 */

import {
    getTagsHandler,
    createTagHandler,
    deleteTagHandler
  } from '../handlers/tagsHandler.js';
  import { authMiddleware } from '../middleware/auth.js';
  
  export const tagsRoutes = {
    '/api/tags': {
      GET: async (request, env, db) => {
        const user = await authMiddleware(request, env);
        return getTagsHandler(request, env, db, user);
      },
      POST: async (request, env, db) => {
        const user = await authMiddleware(request, env);
        return createTagHandler(request, env, db, user);
      }
    },
    '/api/tags/:id': {
      DELETE: async (request, env, db, params) => {
        const user = await authMiddleware(request, env);
        return deleteTagHandler(request, env, db, user, params.id);
      }
    }
  };
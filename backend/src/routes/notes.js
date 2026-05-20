/**
 * 笔记相关路由
 * 版本：v1.0.1 - 修复路由重复定义问题
 * 定义所有笔记相关的API路由
 */

import { createNoteHandler, getNoteHandler, updateNoteHandler, deleteNoteHandler, getAllNotesHandler } from '../handlers/notesHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { response } from '../utils/response.js';

export const notesRoutes = {
  // 笔记根路由（支持GET和POST）
  '/api/notes': {
    // 获取所有笔记
    GET: async (request, env, db) => {
      try {
        const user = await authMiddleware(request, env);
        return getAllNotesHandler(request, env, user);
      } catch (error) {
        return response.error(error.message, error.statusCode || 401);
      }
    },
    
    // 创建新笔记
    POST: async (request, env, db) => {
      try {
        const user = await authMiddleware(request, env);
        return createNoteHandler(request, env, user);
      } catch (error) {
        return response.error(error.message, error.statusCode || 401);
      }
    }
  },

  // 单条笔记路由（支持GET、PUT、DELETE）
  '/api/notes/:id': {
    // 获取单条笔记
    GET: async (request, env, db) => {
      try {
        const user = await authMiddleware(request, env);
        return getNoteHandler(request, env, user);
      } catch (error) {
        return response.error(error.message, error.statusCode || 401);
      }
    },
    
    // 更新笔记
    PUT: async (request, env, db) => {
      try {
        const user = await authMiddleware(request, env);
        return updateNoteHandler(request, env, user);
      } catch (error) {
        return response.error(error.message, error.statusCode || 401);
      }
    },
    
    // 删除笔记
    DELETE: async (request, env, db) => {
      try {
        const user = await authMiddleware(request, env);
        return deleteNoteHandler(request, env, user);
      } catch (error) {
        return response.error(error.message, error.statusCode || 401);
      }
    }
  }
};
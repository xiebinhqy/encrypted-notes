/**
 * 加密笔记系统 - 后端入口文件
 * @version v2.1.1
 * @date 2026-05-20
 * @description 纯原生Cloudflare Worker实现，处理所有API请求和静态资源服务
 */

// 导入中间件
import corsMiddleware from './middleware/cors.js';
import authMiddleware from './middleware/auth.js';
import rateLimitMiddleware from './middleware/rateLimit.js';

// 导入路由
import authRoutes from './routes/auth.js';
import notesRoutes from './routes/notes.js';
import categoriesRoutes from './routes/categories.js';
import tagsRoutes from './routes/tags.js';

// 导入工具
import { createResponse } from './utils/response.js';
import { AppError } from './utils/errors.js';
import logger from './utils/logger.js';
import { syncBackupToD1, fullBackupToKV } from './utils/backup.js';

/**
 * Worker主请求处理函数
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @param {Object} ctx - 上下文对象
 * @returns {Response} 响应对象
 */
export default {
  async fetch(request, env, ctx) {
    // 初始化全局环境
    globalThis.env = env;
    globalThis.ctx = ctx;
    
    const startTime = Date.now();
    const url = new URL(request.url);
    
    try {
      // 1. 静态资源服务（前端由后端统一提供）
      if (!url.pathname.startsWith('/api')) {
        return await env.ASSETS.fetch(request);
      }
      
      // 2. CORS预检请求处理
      if (request.method === 'OPTIONS') {
        return corsMiddleware(request);
      }
      
      // 3. 应用CORS中间件
      let response = corsMiddleware(request);
      if (response) return response;
      
      // 4. 应用限流中间件
      response = await rateLimitMiddleware(request, env);
      if (response) return response;
      
      // 5. 路由分发
      const path = url.pathname;
      const method = request.method.toUpperCase();
      
      // API根路径
      if (path === '/api' && method === 'GET') {
        return createResponse({
          message: 'Encrypted Notes API v2.1.1',
          status: 'running',
          environment: env.ENVIRONMENT,
          timestamp: new Date().toISOString()
        });
      }
      
      // 健康检查
      if (path === '/api/health' && method === 'GET') {
        return createResponse({ 
          status: 'healthy',
          environment: env.ENVIRONMENT,
          database: 'connected'
        });
      }
      
      // 认证路由 (不需要JWT)
      if (path.startsWith('/api/auth')) {
        return await authRoutes(request, env);
      }
      
      // 以下路由需要JWT认证
      const authResult = await authMiddleware(request, env);
      if (authResult instanceof Response) {
        return authResult;
      }
      
      // 将用户信息附加到请求对象
      request.user = authResult;
      
      // 笔记路由
      if (path.startsWith('/api/notes')) {
        return await notesRoutes(request, env);
      }
      
      // 分类路由
      if (path.startsWith('/api/categories')) {
        return await categoriesRoutes(request, env);
      }
      
      // 标签路由
      if (path.startsWith('/api/tags')) {
        return await tagsRoutes(request, env);
      }
      
      // 404 Not Found
      return createResponse({ error: 'Endpoint not found' }, 404);
      
    } catch (error) {
      // 全局错误处理
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        path: url.pathname,
        method: request.method
      });
      
      if (error instanceof AppError) {
        return createResponse({ error: error.message }, error.statusCode);
      }
      
      return createResponse({ error: 'Internal server error' }, 500);
    } finally {
      // 记录请求耗时
      const duration = Date.now() - startTime;
      logger.info('Request completed', {
        method: request.method,
        path: url.pathname,
        duration: `${duration}ms`
      });
    }
  },

  /**
   * 定时任务处理函数
   * @param {Object} event - 定时任务事件
   * @param {Object} env - 环境变量
   * @param {Object} ctx - 上下文对象
   */
  async scheduled(event, env, ctx) {
    globalThis.env = env;
    globalThis.ctx = ctx;
    
    logger.info('Scheduled task triggered', { cron: event.cron });
    
    try {
      switch (event.cron) {
        // 每5分钟同步KV临时备份到备用D1
        case '*/5 * * * *':
          await syncBackupToD1(env);
          break;
          
        // 每天凌晨3点全量备份主数据库到KV
        case '0 3 * * *':
          await fullBackupToKV(env);
          break;
          
        default:
          logger.warn('Unknown cron schedule', { cron: event.cron });
      }
    } catch (error) {
      logger.error('Scheduled task failed', {
        cron: event.cron,
        error: error.message,
        stack: error.stack
      });
    }
  }
};
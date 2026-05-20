/**
 * 加密笔记后端主入口
 * 版本：v2.0.0 - 原始版本
 * 纯原生Cloudflare Worker实现
 */

import { authRoutes } from './routes/auth.js';
import { notesRoutes } from './routes/notes.js';
import { categoriesRoutes } from './routes/categories.js';
import { response } from './utils/response.js';
import { logger } from './utils/logger.js';
import { initDatabase } from './utils/dbInit.js';

/**
 * 全局路由表
 */
const ROUTES = {
  ...authRoutes,
  ...notesRoutes,
  ...categoriesRoutes
};

/**
 * 解析路由参数
 * @param {string} path 请求路径
 * @param {string} routePath 路由定义路径
 * @returns {object|null} 解析后的参数对象，不匹配返回null
 */
function parseRouteParams(path, routePath) {
  const pathSegments = path.split('/');
  const routeSegments = routePath.split('/');
  
  if (pathSegments.length !== routeSegments.length) {
    return null;
  }
  
  const params = {};
  
  for (let i = 0; i < routeSegments.length; i++) {
    if (routeSegments[i].startsWith(':')) {
      const paramName = routeSegments[i].substring(1);
      params[paramName] = pathSegments[i];
    } else if (routeSegments[i] !== pathSegments[i]) {
      return null;
    }
  }
  
  return params;
}

/**
 * 匹配路由
 * @param {string} path 请求路径
 * @param {string} method 请求方法
 * @returns {object|null} 匹配到的路由处理函数和参数
 */
function matchRoute(path, method) {
  // 先尝试精确匹配
  if (ROUTES[path] && ROUTES[path][method]) {
    return {
      handler: ROUTES[path][method],
      params: {}
    };
  }
  
  // 再尝试参数路由匹配
  for (const [routePath, routeHandlers] of Object.entries(ROUTES)) {
    if (routePath.includes(':')) {
      const params = parseRouteParams(path, routePath);
      if (params && routeHandlers[method]) {
        return {
          handler: routeHandlers[method],
          params
        };
      }
    }
  }
  
  return null;
}

/**
 * 处理请求
 * @param {Request} request Cloudflare Worker请求对象
 * @param {object} env 环境变量
 * @param {object} ctx 上下文对象
 * @returns {Promise<Response>} 响应对象
 */
async function handleRequest(request, env, ctx) {
  // 处理OPTIONS预检请求
  if (request.method === 'OPTIONS') {
    return response.options();
  }

  try {
    // 初始化数据库（只在第一次请求时执行）
    if (!env._dbInitialized) {
      const initSuccess = await initDatabase(env.DB);
      if (initSuccess) {
        env._dbInitialized = true;
      } else {
        return response.serverError('数据库初始化失败');
      }
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 匹配路由
    const matchedRoute = matchRoute(path, method);
    if (matchedRoute) {
      logger.info('请求处理开始', { method, path, params: matchedRoute.params });
      
      // 将参数添加到请求对象
      request.params = matchedRoute.params;
      
      const result = await matchedRoute.handler(request, env, ctx);
      logger.info('请求处理完成', { method, path, status: result.status });
      return result;
    }

    // 静态文件服务
    if (method === 'GET') {
      return serveStaticFiles(path, env);
    }

    // 路由未找到
    return response.notFound('接口不存在');
  } catch (error) {
    logger.error('请求处理失败', { 
      error: error.message, 
      stack: error.stack,
      method: request.method,
      path: new URL(request.url).pathname
    });
    return response.serverError();
  }
}

/**
 * 静态文件服务
 * @param {string} path 请求路径
 * @param {object} env 环境变量
 * @returns {Promise<Response>} 响应对象
 */
async function serveStaticFiles(path, env) {
  // 根路径重定向到index.html
  if (path === '/' || path === '') {
    path = '/index.html';
  }

  // 安全检查：防止路径遍历攻击
  if (path.includes('..') || path.includes('//')) {
    return response.error('无效的请求路径', 400);
  }

  try {
    // 从ASSETS绑定中获取静态文件
    const asset = await env.ASSETS.fetch(`http://localhost${path}`);
    
    if (asset.status === 404) {
      // 如果文件不存在，返回index.html（SPA路由支持）
      if (!path.includes('.')) {
        return await env.ASSETS.fetch('http://localhost/index.html');
      }
      return response.notFound('文件不存在');
    }

    // 返回静态文件
    return new Response(asset.body, {
      status: asset.status,
      headers: {
        ...Object.fromEntries(asset.headers),
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    logger.error('静态文件服务失败', { path, error: error.message });
    
    // 出错时返回index.html
    return await env.ASSETS.fetch('http://localhost/index.html');
  }
}

/**
 * 定时任务处理函数
 * 用于处理Cron Trigger触发的定时任务
 */
async function handleScheduled(controller, env, ctx) {
  logger.info('定时任务开始执行', { cron: controller.cron, scheduledTime: controller.scheduledTime });
  
  try {
    // 在这里添加您的定时任务逻辑
    // 例如：自动备份数据库、清理过期数据等
    
    logger.info('定时任务执行完成');
  } catch (error) {
    logger.error('定时任务执行失败', { error: error.message, stack: error.stack });
  }
}

// 导出Worker
export default {
  fetch: handleRequest,
  scheduled: handleScheduled
};
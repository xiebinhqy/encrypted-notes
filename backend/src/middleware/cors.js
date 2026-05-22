/**
 * CORS跨域处理中间件
 * @version v2.1.1
 * @date 2026-05-20
 */

/**
 * CORS中间件
 * @param {Request} request - 请求对象
 * @returns {Response|null} 响应对象或null
 */
export default function corsMiddleware(request) {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    };
  
    // 处理OPTIONS预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers
      });
    }
  
    // 为其他请求添加CORS头
    return null;
  }
/**
 * 跨域处理中间件
 * 版本：v2.1.1 - 本地单端口8787修复版
 * 功能：支持本地开发和线上环境的跨域请求，彻底解决CORS问题
 */

export function corsMiddleware(request) {
    // 获取请求来源
    const origin = request.headers.get('Origin') || '';
    
    // 允许的来源列表（本地开发+线上环境）
    const allowedOrigins = [
      'http://localhost:8787',    // 本地开发端口
      'http://127.0.0.1:8787',   // 本地回环地址
      'https://your-production-domain.com', // 替换为你的生产域名
      'https://your-staging-domain.com'     // 替换为你的测试域名
    ];
  
    // 确定允许的origin
    let allowOrigin = '*';
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      allowOrigin = origin;
    }
  
    return {
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400' // 预检请求缓存24小时
      }
    };
  }
  
  export function handleOptionsRequest(request) {
    const cors = corsMiddleware(request);
    return new Response(null, {
      status: 204,
      headers: cors.headers
    });
  }
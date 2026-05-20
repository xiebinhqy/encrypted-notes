/**
 * 响应工具类
 * 版本：v1.0.0
 * 统一处理API响应格式
 */

/**
 * 成功响应
 * @param {any} data 响应数据
 * @param {string} message 响应消息
 * @param {number} statusCode HTTP状态码
 * @returns {Response} Cloudflare Worker响应对象
 */
export function response(data = null, message = '操作成功', statusCode = 200) {
    const body = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      data
    };
  
    return new Response(JSON.stringify(body), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
  
  /**
   * 成功响应（别名）
   * @param {any} data 响应数据
   * @param {string} message 响应消息
   * @returns {Response} Cloudflare Worker响应对象
   */
  response.success = function(data = null, message = '操作成功') {
    return response(data, message, 200);
  };
  
  /**
   * 错误响应
   * @param {string} message 错误消息
   * @param {number} statusCode HTTP状态码
   * @param {any} errors 详细错误信息
   * @returns {Response} Cloudflare Worker响应对象
   */
  response.error = function(message = '操作失败', statusCode = 400, errors = null) {
    const body = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      data: null,
      errors
    };
  
    return new Response(JSON.stringify(body), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  };
  
  /**
   * 服务器内部错误响应
   * @param {string} message 错误消息
   * @returns {Response} Cloudflare Worker响应对象
   */
  response.serverError = function(message = '服务器内部错误') {
    return response.error(message, 500);
  };
  
  /**
   * 未找到响应
   * @param {string} message 错误消息
   * @returns {Response} Cloudflare Worker响应对象
   */
  response.notFound = function(message = '资源不存在') {
    return response.error(message, 404);
  };
  
  /**
   * 未授权响应
   * @param {string} message 错误消息
   * @returns {Response} Cloudflare Worker响应对象
   */
  response.unauthorized = function(message = '未授权访问') {
    return response.error(message, 401);
  };
  
  /**
   * 禁止访问响应
   * @param {string} message 错误消息
   * @returns {Response} Cloudflare Worker响应对象
   */
  response.forbidden = function(message = '禁止访问') {
    return response.error(message, 403);
  };
  
  /**
   * OPTIONS预检请求响应
   * @returns {Response} Cloudflare Worker响应对象
   */
  response.options = function() {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  };
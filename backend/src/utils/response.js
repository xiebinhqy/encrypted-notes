/**
 * 统一API响应格式工具
 * @version v2.1.1
 * @date 2026-05-20
 */

/**
 * 创建统一格式的响应
 * @param {Object} data - 响应数据
 * @param {number} statusCode - HTTP状态码
 * @param {Object} headers - 额外的响应头
 * @returns {Response} 响应对象
 */
export function createResponse(data, statusCode = 200, headers = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    
    const responseHeaders = { ...defaultHeaders, ...headers };
    
    return new Response(JSON.stringify(data), {
      status: statusCode,
      headers: responseHeaders
    });
  }
  
  /**
   * 创建成功响应
   * @param {Object} data - 响应数据
   * @param {string} message - 成功消息
   * @returns {Response} 响应对象
   */
  export function successResponse(data = {}, message = 'Success') {
    return createResponse({
      success: true,
      message,
      data
    });
  }
  
  /**
   * 创建错误响应
   * @param {string} message - 错误消息
   * @param {number} statusCode - HTTP状态码
   * @param {Object} errors - 详细错误信息
   * @returns {Response} 响应对象
   */
  export function errorResponse(message, statusCode = 400, errors = {}) {
    return createResponse({
      success: false,
      message,
      errors
    }, statusCode);
  }
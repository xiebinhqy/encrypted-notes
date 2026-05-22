/**
 * JWT身份认证中间件
 * @version v2.1.1
 * @date 2026-05-20
 * @description 纯原生JWT实现，无外部依赖
 */

import { UnauthorizedError } from '../utils/errors.js';
import { createResponse } from '../utils/response.js';
import logger from '../utils/logger.js';

/**
 * Base64URL编码
 * @param {Uint8Array} data - 要编码的数据
 * @returns {string} Base64URL编码字符串
 */
function base64UrlEncode(data) {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64URL解码
 * @param {string} str - Base64URL编码字符串
 * @returns {Uint8Array} 解码后的数据
 */
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

/**
 * 创建HMAC SHA256签名
 * @param {string} data - 要签名的数据
 * @param {string} secret - 密钥
 * @returns {Promise<string>} Base64URL编码的签名
 */
async function sign(data, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const dataData = encoder.encode(data);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, dataData);
  return base64UrlEncode(new Uint8Array(signature));
}

/**
 * 验证JWT令牌
 * @param {string} token - JWT令牌
 * @param {string} secret - 密钥
 * @returns {Promise<Object>} 解码后的载荷
 * @throws {UnauthorizedError} 验证失败时抛出
 */
export async function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedError('Invalid token format');
    }
    
    const [headerB64, payloadB64, signatureB64] = parts;
    
    // 验证签名
    const data = `${headerB64}.${payloadB64}`;
    const expectedSignature = await sign(data, secret);
    
    if (signatureB64 !== expectedSignature) {
      throw new UnauthorizedError('Invalid token signature');
    }
    
    // 解码载荷
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
    
    // 检查过期时间
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      throw new UnauthorizedError('Token has expired');
    }
    
    return payload;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    logger.error('Token verification failed', { error: error.message });
    throw new UnauthorizedError('Invalid token');
  }
}

/**
 * 生成JWT令牌
 * @param {Object} payload - 载荷数据
 * @param {string} secret - 密钥
 * @param {string} expiresIn - 过期时间 (如: '7d', '24h')
 * @returns {Promise<string>} JWT令牌
 */
export async function generateToken(payload, secret, expiresIn = '7d') {
  // 计算过期时间
  let expiresMs;
  if (expiresIn.endsWith('d')) {
    expiresMs = parseInt(expiresIn) * 24 * 60 * 60 * 1000;
  } else if (expiresIn.endsWith('h')) {
    expiresMs = parseInt(expiresIn) * 60 * 60 * 1000;
  } else if (expiresIn.endsWith('m')) {
    expiresMs = parseInt(expiresIn) * 60 * 1000;
  } else {
    expiresMs = 7 * 24 * 60 * 60 * 1000; // 默认7天
  }
  
  const exp = Math.floor((Date.now() + expiresMs) / 1000);
  
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const fullPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp
  };
  
  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(fullPayload)));
  const data = `${headerB64}.${payloadB64}`;
  const signature = await sign(data, secret);
  
  return `${data}.${signature}`;
}

/**
 * JWT认证中间件
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Object|Response>} 用户信息或响应对象
 */
export default async function authMiddleware(request, env) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authorization header missing or invalid');
    }
    
    const token = authHeader.substring(7);
    const user = await verifyToken(token, env.JWT_SECRET);
    
    return user;
  } catch (error) {
    logger.warn('Authentication failed', { error: error.message });
    return createResponse({ error: error.message }, 401);
  }
}
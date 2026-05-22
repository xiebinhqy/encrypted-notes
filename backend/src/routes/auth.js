/**
 * 认证相关路由
 * @version v2.1.1
 * @date 2026-05-20
 * @description 集成Turnstile验证码、公共注册开关、可配置PBKDF2迭代次数
 */

import { createResponse, successResponse, errorResponse } from '../utils/response.js';
import { parseAndValidateJson, validateBody } from '../utils/validation.js';
import { getDB, queryOne, execute } from '../utils/db.js';
import { generateToken } from '../middleware/auth.js';
import { verifyTurnstile } from '../utils/turnstile.js';
import { createTempBackup } from '../utils/backup.js';
import { ConflictError, UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * 密码哈希函数 (PBKDF2)
 * @param {string} password - 明文密码
 * @param {Uint8Array} salt - 盐值
 * @param {number} iterations - 迭代次数
 * @returns {Promise<string>} Base64编码的哈希值
 */
async function hashPassword(password, salt, iterations = 100000) {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  const key = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256'
    },
    key,
    256
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

/**
 * 生成随机盐值
 * @returns {Uint8Array} 16字节随机盐值
 */
function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * 注册用户
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 响应对象
 */
async function register(request, env) {
  // 检查是否允许公共注册
  if (env.ALLOW_PUBLIC_REGISTRATION !== 'true') {
    throw new ForbiddenError('Public registration is disabled');
  }
  
  const body = await parseAndValidateJson(request);
  
  // 验证请求体
  validateBody(body, {
    email: {
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Invalid email format'
    },
    password: {
      required: true,
      type: 'string',
      minLength: 8,
      maxLength: 128
    },
    username: {
      required: true,
      type: 'string',
      minLength: 3,
      maxLength: 50
    },
    turnstileToken: {
      required: true,
      type: 'string'
    }
  });
  
  // 验证Turnstile验证码
  await verifyTurnstile(body.turnstileToken, env.TURNSTILE_SECRET_KEY);
  
  const db = getDB(env);
  
  // 检查邮箱是否已存在
  const existingUser = await queryOne(
    db,
    'SELECT id FROM users WHERE email = ?',
    [body.email]
  );
  
  if (existingUser) {
    throw new ConflictError('Email already registered');
  }
  
  // 生成盐值和密码哈希
  const salt = generateSalt();
  const iterations = parseInt(env.PBKDF2_ITERATIONS) || 100000;
  const passwordHash = await hashPassword(body.password, salt, iterations);
  const saltBase64 = btoa(String.fromCharCode(...salt));
  
  // 判断是否为管理员
  const isAdmin = body.email === env.ADMIN_EMAIL;
  
  // 创建用户
  const sql = `INSERT INTO users (email, username, password_hash, salt, is_admin, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
  const params = [body.email, body.username, passwordHash, saltBase64, isAdmin ? 1 : 0];
  
  const result = await execute(db, sql, params);
  
  // 创建临时备份
  await createTempBackup(env, 'INSERT', sql, params);
  
  const userId = result.meta.last_row_id;
  
  logger.info('User registered', { userId, email: body.email, isAdmin });
  
  // 生成JWT令牌
  const token = await generateToken(
    { id: userId, email: body.email, username: body.username, isAdmin },
    env.JWT_SECRET,
    '7d'
  );
  
  return successResponse({
    token,
    user: {
      id: userId,
      email: body.email,
      username: body.username,
      isAdmin
    }
  }, 'Registration successful');
}

/**
 * 用户登录
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 响应对象
 */
async function login(request, env) {
  const body = await parseAndValidateJson(request);
  
  // 验证请求体
  validateBody(body, {
    email: {
      required: true,
      type: 'string'
    },
    password: {
      required: true,
      type: 'string'
    },
    turnstileToken: {
      required: true,
      type: 'string'
    }
  });
  
  // 验证Turnstile验证码
  await verifyTurnstile(body.turnstileToken, env.TURNSTILE_SECRET_KEY);
  
  const db = getDB(env);
  
  // 查询用户
  const user = await queryOne(
    db,
    'SELECT id, email, username, password_hash, salt, is_admin FROM users WHERE email = ?',
    [body.email]
  );
  
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }
  
  // 验证密码
  const salt = Uint8Array.from(atob(user.salt), c => c.charCodeAt(0));
  const iterations = parseInt(env.PBKDF2_ITERATIONS) || 100000;
  const passwordHash = await hashPassword(body.password, salt, iterations);
  
  if (passwordHash !== user.password_hash) {
    throw new UnauthorizedError('Invalid email or password');
  }
  
  logger.info('User logged in', { userId: user.id, email: user.email, isAdmin: user.is_admin });
  
  // 生成JWT令牌
  const token = await generateToken(
    { id: user.id, email: user.email, username: user.username, isAdmin: user.is_admin },
    env.JWT_SECRET,
    '7d'
  );
  
  return successResponse({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.is_admin
    }
  }, 'Login successful');
}

/**
 * 获取当前用户信息
 * @param {Request} request - 请求对象
 * @returns {Promise<Response>} 响应对象
 */
async function getMe(request) {
  return successResponse({
    user: request.user
  }, 'User info retrieved');
}

/**
 * 认证路由主处理函数
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 响应对象
 */
export default async function authRoutes(request, env) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // 注册
    if (path === '/api/auth/register' && method === 'POST') {
      return await register(request, env);
    }
    
    // 登录
    if (path === '/api/auth/login' && method === 'POST') {
      return await login(request, env);
    }
    
    // 获取当前用户信息 (需要认证)
    if (path === '/api/auth/me' && method === 'GET') {
      // 这里会先经过auth中间件
      return await getMe(request);
    }
    
    // 404
    return createResponse({ error: 'Auth endpoint not found' }, 404);
    
  } catch (error) {
    logger.error('Auth route error', {
      path,
      method,
      error: error.message
    });
    
    if (error.statusCode) {
      return errorResponse(error.message, error.statusCode, error.errors);
    }
    
    return errorResponse('Internal server error', 500);
  }
}
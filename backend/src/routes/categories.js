/**
 * 分类管理路由
 * @version v2.1.1
 * @date 2026-05-20
 * @description 集成临时备份功能
 */

import { createResponse, successResponse, errorResponse } from '../utils/response.js';
import { parseAndValidateJson, validateBody } from '../utils/validation.js';
import { getDB, queryOne, queryAll, execute } from '../utils/db.js';
import { createTempBackup } from '../utils/backup.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * 获取所有分类
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 响应对象
 */
async function getCategories(request, env) {
  const userId = request.user.id;
  const db = getDB(env);
  
  const categories = await queryAll(
    db,
    `SELECT id, name, color, created_at, updated_at
     FROM categories
     WHERE user_id = ?
     ORDER BY name ASC`,
    [userId]
  );
  
  // 获取每个分类的笔记数量
  for (const category of categories) {
    const countResult = await queryOne(
      db,
      'SELECT COUNT(*) as note_count FROM notes WHERE category_id = ? AND user_id = ?',
      [category.id, userId]
    );
    category.note_count = countResult.note_count;
  }
  
  return successResponse({ categories }, 'Categories retrieved successfully');
}

/**
 * 获取单个分类
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @param {number} categoryId - 分类ID
 * @returns {Promise<Response>} 响应对象
 */
async function getCategory(request, env, categoryId) {
  const userId = request.user.id;
  const db = getDB(env);
  
  const category = await queryOne(
    db,
    `SELECT id, name, color, created_at, updated_at
     FROM categories
     WHERE id = ? AND user_id = ?`,
    [categoryId, userId]
  );
  
  if (!category) {
    throw new NotFoundError('Category not found');
  }
  
  // 获取笔记数量
  const countResult = await queryOne(
    db,
    'SELECT COUNT(*) as note_count FROM notes WHERE category_id = ? AND user_id = ?',
    [categoryId, userId]
  );
  category.note_count = countResult.note_count;
  
  return successResponse({ category }, 'Category retrieved successfully');
}

/**
 * 创建分类
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 响应对象
 */
async function createCategory(request, env) {
  const userId = request.user.id;
  const body = await parseAndValidateJson(request);
  
  validateBody(body, {
    name: {
      required: true,
      type: 'string',
      maxLength: 100
    },
    color: {
      type: 'string',
      maxLength: 7,
      pattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      message: 'Color must be a valid hex color'
    }
  });
  
  const db = getDB(env);
  
  // 检查分类名称是否已存在
  const existingCategory = await queryOne(
    db,
    'SELECT id FROM categories WHERE name = ? AND user_id = ?',
    [body.name, userId]
  );
  
  if (existingCategory) {
    throw new ConflictError('Category with this name already exists');
  }
  
  // 插入分类
  const sql = `INSERT INTO categories (user_id, name, color, created_at, updated_at)
               VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
  const params = [userId, body.name, body.color || '#3b82f6'];
  
  const result = await execute(db, sql, params);
  
  // 创建临时备份
  await createTempBackup(env, 'INSERT', sql, params);
  
  const categoryId = result.meta.last_row_id;
  
  logger.info('Category created', { userId, categoryId, name: body.name });
  
  return await getCategory(request, env, categoryId);
}

/**
 * 更新分类
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @param {number} categoryId - 分类ID
 * @returns {Promise<Response>} 响应对象
 */
async function updateCategory(request, env, categoryId) {
  const userId = request.user.id;
  const body = await parseAndValidateJson(request);
  
  validateBody(body, {
    name: {
      type: 'string',
      maxLength: 100
    },
    color: {
      type: 'string',
      maxLength: 7,
      pattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      message: 'Color must be a valid hex color'
    }
  });
  
  const db = getDB(env);
  
  // 检查分类是否存在
  const existingCategory = await queryOne(
    db,
    'SELECT id FROM categories WHERE id = ? AND user_id = ?',
    [categoryId, userId]
  );
  
  if (!existingCategory) {
    throw new NotFoundError('Category not found');
  }
  
  // 检查名称冲突
  if (body.name) {
    const nameConflict = await queryOne(
      db,
      'SELECT id FROM categories WHERE name = ? AND user_id = ? AND id != ?',
      [body.name, userId, categoryId]
    );
    
    if (nameConflict) {
      throw new ConflictError('Category with this name already exists');
    }
  }
  
  // 构建更新语句
  const updates = [];
  const params = [];
  
  if (body.name !== undefined) {
    updates.push('name = ?');
    params.push(body.name);
  }
  
  if (body.color !== undefined) {
    updates.push('color = ?');
    params.push(body.color);
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  
  if (updates.length > 0) {
    const sql = `UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
    params.push(categoryId, userId);
    
    await execute(db, sql, params);
    
    // 创建临时备份
    await createTempBackup(env, 'UPDATE', sql, params);
  }
  
  logger.info('Category updated', { userId, categoryId });
  
  return await getCategory(request, env, categoryId);
}

/**
 * 删除分类
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @param {number} categoryId - 分类ID
 * @returns {Promise<Response>} 响应对象
 */
async function deleteCategory(request, env, categoryId) {
  const userId = request.user.id;
  const db = getDB(env);
  
  // 检查分类是否存在
  const existingCategory = await queryOne(
    db,
    'SELECT id FROM categories WHERE id = ? AND user_id = ?',
    [categoryId, userId]
  );
  
  if (!existingCategory) {
    throw new NotFoundError('Category not found');
  }
  
  // 将该分类下的笔记移到无分类
  const updateNotesSql = 'UPDATE notes SET category_id = NULL WHERE category_id = ? AND user_id = ?';
  const updateNotesParams = [categoryId, userId];
  await execute(db, updateNotesSql, updateNotesParams);
  await createTempBackup(env, 'UPDATE', updateNotesSql, updateNotesParams);
  
  // 删除分类
  const deleteSql = 'DELETE FROM categories WHERE id = ? AND user_id = ?';
  const deleteParams = [categoryId, userId];
  await execute(db, deleteSql, deleteParams);
  await createTempBackup(env, 'DELETE', deleteSql, deleteParams);
  
  logger.info('Category deleted', { userId, categoryId });
  
  return successResponse({}, 'Category deleted successfully');
}

/**
 * 分类路由主处理函数
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 响应对象
 */
export default async function categoriesRoutes(request, env) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // 匹配 /api/categories
    if (path === '/api/categories') {
      if (method === 'GET') {
        return await getCategories(request, env);
      }
      if (method === 'POST') {
        return await createCategory(request, env);
      }
    }
    
    // 匹配 /api/categories/:id
    const categoryMatch = path.match(/^\/api\/categories\/(\d+)$/);
    if (categoryMatch) {
      const categoryId = parseInt(categoryMatch[1]);
      
      if (method === 'GET') {
        return await getCategory(request, env, categoryId);
      }
      if (method === 'PUT') {
        return await updateCategory(request, env, categoryId);
      }
      if (method === 'DELETE') {
        return await deleteCategory(request, env, categoryId);
      }
    }
    
    // 404
    return createResponse({ error: 'Category endpoint not found' }, 404);
    
  } catch (error) {
    logger.error('Category route error', {
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
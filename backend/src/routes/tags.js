/**
 * 标签管理路由
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
 * 获取所有标签
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 响应对象
 */
async function getTags(request, env) {
  const userId = request.user.id;
  const db = getDB(env);
  
  const tags = await queryAll(
    db,
    `SELECT id, name, color, created_at, updated_at
     FROM tags
     WHERE user_id = ?
     ORDER BY name ASC`,
    [userId]
  );
  
  // 获取每个标签的笔记数量
  for (const tag of tags) {
    const countResult = await queryOne(
      db,
      'SELECT COUNT(*) as note_count FROM note_tags WHERE tag_id = ?',
      [tag.id]
    );
    tag.note_count = countResult.note_count;
  }
  
  return successResponse({ tags }, 'Tags retrieved successfully');
}

/**
 * 获取单个标签
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @param {number} tagId - 标签ID
 * @returns {Promise<Response>} 响应对象
 */
async function getTag(request, env, tagId) {
  const userId = request.user.id;
  const db = getDB(env);
  
  const tag = await queryOne(
    db,
    `SELECT id, name, color, created_at, updated_at
     FROM tags
     WHERE id = ? AND user_id = ?`,
    [tagId, userId]
  );
  
  if (!tag) {
    throw new NotFoundError('Tag not found');
  }
  
  // 获取笔记数量
  const countResult = await queryOne(
    db,
    'SELECT COUNT(*) as note_count FROM note_tags WHERE tag_id = ?',
    [tagId]
  );
  tag.note_count = countResult.note_count;
  
  return successResponse({ tag }, 'Tag retrieved successfully');
}

/**
 * 创建标签
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 响应对象
 */
async function createTag(request, env) {
  const userId = request.user.id;
  const body = await parseAndValidateJson(request);
  
  validateBody(body, {
    name: {
      required: true,
      type: 'string',
      maxLength: 50
    },
    color: {
      type: 'string',
      maxLength: 7,
      pattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      message: 'Color must be a valid hex color'
    }
  });
  
  const db = getDB(env);
  
  // 检查标签名称是否已存在
  const existingTag = await queryOne(
    db,
    'SELECT id FROM tags WHERE name = ? AND user_id = ?',
    [body.name, userId]
  );
  
  if (existingTag) {
    throw new ConflictError('Tag with this name already exists');
  }
  
  // 插入标签
  const sql = `INSERT INTO tags (user_id, name, color, created_at, updated_at)
               VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
  const params = [userId, body.name, body.color || '#10b981'];
  
  const result = await execute(db, sql, params);
  
  // 创建临时备份
  await createTempBackup(env, 'INSERT', sql, params);
  
  const tagId = result.meta.last_row_id;
  
  logger.info('Tag created', { userId, tagId, name: body.name });
  
  return await getTag(request, env, tagId);
}

/**
 * 更新标签
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @param {number} tagId - 标签ID
 * @returns {Promise<Response>} 响应对象
 */
async function updateTag(request, env, tagId) {
  const userId = request.user.id;
  const body = await parseAndValidateJson(request);
  
  validateBody(body, {
    name: {
      type: 'string',
      maxLength: 50
    },
    color: {
      type: 'string',
      maxLength: 7,
      pattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      message: 'Color must be a valid hex color'
    }
  });
  
  const db = getDB(env);
  
  // 检查标签是否存在
  const existingTag = await queryOne(
    db,
    'SELECT id FROM tags WHERE id = ? AND user_id = ?',
    [tagId, userId]
  );
  
  if (!existingTag) {
    throw new NotFoundError('Tag not found');
  }
  
  // 检查名称冲突
  if (body.name) {
    const nameConflict = await queryOne(
      db,
      'SELECT id FROM tags WHERE name = ? AND user_id = ? AND id != ?',
      [body.name, userId, tagId]
    );
    
    if (nameConflict) {
      throw new ConflictError('Tag with this name already exists');
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
    const sql = `UPDATE tags SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
    params.push(tagId, userId);
    
    await execute(db, sql, params);
    
    // 创建临时备份
    await createTempBackup(env, 'UPDATE', sql, params);
  }
  
  logger.info('Tag updated', { userId, tagId });
  
  return await getTag(request, env, tagId);
}

/**
 * 删除标签
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @param {number} tagId - 标签ID
 * @returns {Promise<Response>} 响应对象
 */
async function deleteTag(request, env, tagId) {
  const userId = request.user.id;
  const db = getDB(env);
  
  // 检查标签是否存在
  const existingTag = await queryOne(
    db,
    'SELECT id FROM tags WHERE id = ? AND user_id = ?',
    [tagId, userId]
  );
  
  if (!existingTag) {
    throw new NotFoundError('Tag not found');
  }
  
  // 删除标签与笔记的关联
  const deleteTagsSql = 'DELETE FROM note_tags WHERE tag_id = ?';
  const deleteTagsParams = [tagId];
  await execute(db, deleteTagsSql, deleteTagsParams);
  await createTempBackup(env, 'DELETE', deleteTagsSql, deleteTagsParams);
  
  // 删除标签
  const deleteSql = 'DELETE FROM tags WHERE id = ? AND user_id = ?';
  const deleteParams = [tagId, userId];
  await execute(db, deleteSql, deleteParams);
  await createTempBackup(env, 'DELETE', deleteSql, deleteParams);
  
  logger.info('Tag deleted', { userId, tagId });
  
  return successResponse({}, 'Tag deleted successfully');
}

/**
 * 标签路由主处理函数
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 响应对象
 */
export default async function tagsRoutes(request, env) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // 匹配 /api/tags
    if (path === '/api/tags') {
      if (method === 'GET') {
        return await getTags(request, env);
      }
      if (method === 'POST') {
        return await createTag(request, env);
      }
    }
    
    // 匹配 /api/tags/:id
    const tagMatch = path.match(/^\/api\/tags\/(\d+)$/);
    if (tagMatch) {
      const tagId = parseInt(tagMatch[1]);
      
      if (method === 'GET') {
        return await getTag(request, env, tagId);
      }
      if (method === 'PUT') {
        return await updateTag(request, env, tagId);
      }
      if (method === 'DELETE') {
        return await deleteTag(request, env, tagId);
      }
    }
    
    // 404
    return createResponse({ error: 'Tag endpoint not found' }, 404);
    
  } catch (error) {
    logger.error('Tag route error', {
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
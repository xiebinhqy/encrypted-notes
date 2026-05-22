/**
 * 笔记CRUD路由
 * @version v2.1.1
 * @date 2026-05-20
 * @description 集成笔记历史记录、临时备份功能
 */

import { createResponse, successResponse, errorResponse } from '../utils/response.js';
import { parseAndValidateJson, validateBody } from '../utils/validation.js';
import { getDB, queryOne, queryAll, execute } from '../utils/db.js';
import { createTempBackup } from '../utils/backup.js';
import { NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * 保存笔记历史记录
 * @param {Object} env - 环境变量
 * @param {number} noteId - 笔记ID
 * @param {Object} noteData - 笔记数据
 */
async function saveNoteHistory(env, noteId, noteData) {
  try {
    const timestamp = Date.now();
    const key = `history:${noteId}:${timestamp}`;
    
    const historyData = {
      ...noteData,
      version: timestamp,
      savedAt: new Date().toISOString()
    };
    
    await env.NOTE_HISTORY.put(key, JSON.stringify(historyData), {
      expirationTtl: 7 * 24 * 60 * 60 // 保留7天
    });
    
  } catch (error) {
    logger.error('Failed to save note history', {
      noteId,
      error: error.message
    });
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 获取所有笔记
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 响应对象
 */
async function getNotes(request, env) {
  const userId = request.user.id;
  const db = getDB(env);
  const url = new URL(request.url);
  
  // 获取查询参数
  const categoryId = url.searchParams.get('category_id');
  const tagId = url.searchParams.get('tag_id');
  const search = url.searchParams.get('search');
  const page = parseInt(url.searchParams.get('page')) || 1;
  const limit = parseInt(url.searchParams.get('limit')) || 20;
  const offset = (page - 1) * limit;
  
  let sql = `
    SELECT n.id, n.title, n.content, n.category_id, n.created_at, n.updated_at,
           c.name as category_name
    FROM notes n
    LEFT JOIN categories c ON n.category_id = c.id
    WHERE n.user_id = ?
  `;
  const params = [userId];
  
  // 分类筛选
  if (categoryId) {
    sql += ' AND n.category_id = ?';
    params.push(categoryId);
  }
  
  // 标签筛选
  if (tagId) {
    sql += ` AND n.id IN (SELECT note_id FROM note_tags WHERE tag_id = ?)`;
    params.push(tagId);
  }
  
  // 搜索
  if (search) {
    sql += ' AND (n.title LIKE ? OR n.content LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }
  
  // 排序和分页
  sql += ' ORDER BY n.updated_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const notes = await queryAll(db, sql, params);
  
  // 获取每个笔记的标签
  for (const note of notes) {
    const tags = await queryAll(
      db,
      `SELECT t.id, t.name, t.color
       FROM tags t
       JOIN note_tags nt ON t.id = nt.tag_id
       WHERE nt.note_id = ? AND t.user_id = ?`,
      [note.id, userId]
    );
    note.tags = tags;
  }
  
  // 获取总数
  let countSql = 'SELECT COUNT(*) as total FROM notes WHERE user_id = ?';
  const countParams = [userId];
  
  if (categoryId) {
    countSql += ' AND category_id = ?';
    countParams.push(categoryId);
  }
  
  if (tagId) {
    countSql += ` AND id IN (SELECT note_id FROM note_tags WHERE tag_id = ?)`;
    countParams.push(tagId);
  }
  
  if (search) {
    countSql += ' AND (title LIKE ? OR content LIKE ?)';
    const searchTerm = `%${search}%`;
    countParams.push(searchTerm, searchTerm);
  }
  
  const countResult = await queryOne(db, countSql, countParams);
  
  return successResponse({
    notes,
    pagination: {
      page,
      limit,
      total: countResult.total,
      totalPages: Math.ceil(countResult.total / limit)
    }
  }, 'Notes retrieved successfully');
}

/**
 * 获取单个笔记
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @param {number} noteId - 笔记ID
 * @returns {Promise<Response>} 响应对象
 */
async function getNote(request, env, noteId) {
  const userId = request.user.id;
  const db = getDB(env);
  
  const note = await queryOne(
    db,
    `SELECT n.id, n.title, n.content, n.category_id, n.created_at, n.updated_at,
            c.name as category_name
     FROM notes n
     LEFT JOIN categories c ON n.category_id = c.id
     WHERE n.id = ? AND n.user_id = ?`,
    [noteId, userId]
  );
  
  if (!note) {
    throw new NotFoundError('Note not found');
  }
  
  // 获取标签
  const tags = await queryAll(
    db,
    `SELECT t.id, t.name, t.color
     FROM tags t
     JOIN note_tags nt ON t.id = nt.tag_id
     WHERE nt.note_id = ? AND t.user_id = ?`,
    [noteId, userId]
  );
  note.tags = tags;
  
  return successResponse({ note }, 'Note retrieved successfully');
}

/**
 * 创建笔记
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 响应对象
 */
async function createNote(request, env) {
  const userId = request.user.id;
  const body = await parseAndValidateJson(request);
  
  validateBody(body, {
    title: {
      required: true,
      type: 'string',
      maxLength: 255
    },
    content: {
      required: true,
      type: 'string'
    },
    category_id: {
      type: 'number'
    }
  });
  
  const db = getDB(env);
  
  // 插入笔记
  const sql = `INSERT INTO notes (user_id, title, content, category_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
  const params = [userId, body.title, body.content, body.category_id || null];
  
  const result = await execute(db, sql, params);
  
  // 创建临时备份
  await createTempBackup(env, 'INSERT', sql, params);
  
  const noteId = result.meta.last_row_id;
  
  // 处理标签
  if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
    for (const tagId of body.tags) {
      // 验证标签属于当前用户
      const tag = await queryOne(
        db,
        'SELECT id FROM tags WHERE id = ? AND user_id = ?',
        [tagId, userId]
      );
      
      if (tag) {
        const tagSql = 'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)';
        const tagParams = [noteId, tagId];
        await execute(db, tagSql, tagParams);
        await createTempBackup(env, 'INSERT', tagSql, tagParams);
      }
    }
  }
  
  logger.info('Note created', { userId, noteId });
  
  // 返回创建的笔记
  return await getNote(request, env, noteId);
}

/**
 * 更新笔记
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @param {number} noteId - 笔记ID
 * @returns {Promise<Response>} 响应对象
 */
async function updateNote(request, env, noteId) {
  const userId = request.user.id;
  const body = await parseAndValidateJson(request);
  
  validateBody(body, {
    title: {
      type: 'string',
      maxLength: 255
    },
    content: {
      type: 'string'
    },
    category_id: {
      type: 'number'
    }
  });
  
  const db = getDB(env);
  
  // 检查笔记是否存在且属于当前用户
  const existingNote = await queryOne(
    db,
    'SELECT id, title, content, category_id FROM notes WHERE id = ? AND user_id = ?',
    [noteId, userId]
  );
  
  if (!existingNote) {
    throw new NotFoundError('Note not found');
  }
  
  // 保存历史记录
  await saveNoteHistory(env, noteId, existingNote);
  
  // 构建更新语句
  const updates = [];
  const params = [];
  
  if (body.title !== undefined) {
    updates.push('title = ?');
    params.push(body.title);
  }
  
  if (body.content !== undefined) {
    updates.push('content = ?');
    params.push(body.content);
  }
  
  if (body.category_id !== undefined) {
    updates.push('category_id = ?');
    params.push(body.category_id || null);
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  
  if (updates.length > 0) {
    const sql = `UPDATE notes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
    params.push(noteId, userId);
    
    await execute(db, sql, params);
    
    // 创建临时备份
    await createTempBackup(env, 'UPDATE', sql, params);
  }
  
  // 处理标签更新
  if (body.tags !== undefined && Array.isArray(body.tags)) {
    // 删除现有标签关联
    const deleteSql = 'DELETE FROM note_tags WHERE note_id = ?';
    const deleteParams = [noteId];
    await execute(db, deleteSql, deleteParams);
    await createTempBackup(env, 'DELETE', deleteSql, deleteParams);
    
    // 添加新的标签关联
    for (const tagId of body.tags) {
      const tag = await queryOne(
        db,
        'SELECT id FROM tags WHERE id = ? AND user_id = ?',
        [tagId, userId]
      );
      
      if (tag) {
        const tagSql = 'INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)';
        const tagParams = [noteId, tagId];
        await execute(db, tagSql, tagParams);
        await createTempBackup(env, 'INSERT', tagSql, tagParams);
      }
    }
  }
  
  logger.info('Note updated', { userId, noteId });
  
  // 返回更新后的笔记
  return await getNote(request, env, noteId);
}

/**
 * 删除笔记
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @param {number} noteId - 笔记ID
 * @returns {Promise<Response>} 响应对象
 */
async function deleteNote(request, env, noteId) {
  const userId = request.user.id;
  const db = getDB(env);
  
  // 检查笔记是否存在且属于当前用户
  const existingNote = await queryOne(
    db,
    'SELECT id FROM notes WHERE id = ? AND user_id = ?',
    [noteId, userId]
  );
  
  if (!existingNote) {
    throw new NotFoundError('Note not found');
  }
  
  // 删除标签关联
  const deleteTagsSql = 'DELETE FROM note_tags WHERE note_id = ?';
  const deleteTagsParams = [noteId];
  await execute(db, deleteTagsSql, deleteTagsParams);
  await createTempBackup(env, 'DELETE', deleteTagsSql, deleteTagsParams);
  
  // 删除笔记
  const deleteNoteSql = 'DELETE FROM notes WHERE id = ? AND user_id = ?';
  const deleteNoteParams = [noteId, userId];
  await execute(db, deleteNoteSql, deleteNoteParams);
  await createTempBackup(env, 'DELETE', deleteNoteSql, deleteNoteParams);
  
  logger.info('Note deleted', { userId, noteId });
  
  return successResponse({}, 'Note deleted successfully');
}

/**
 * 笔记路由主处理函数
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 响应对象
 */
export default async function notesRoutes(request, env) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // 匹配 /api/notes
    if (path === '/api/notes') {
      if (method === 'GET') {
        return await getNotes(request, env);
      }
      if (method === 'POST') {
        return await createNote(request, env);
      }
    }
    
    // 匹配 /api/notes/:id
    const noteMatch = path.match(/^\/api\/notes\/(\d+)$/);
    if (noteMatch) {
      const noteId = parseInt(noteMatch[1]);
      
      if (method === 'GET') {
        return await getNote(request, env, noteId);
      }
      if (method === 'PUT') {
        return await updateNote(request, env, noteId);
      }
      if (method === 'DELETE') {
        return await deleteNote(request, env, noteId);
      }
    }
    
    // 404
    return createResponse({ error: 'Note endpoint not found' }, 404);
    
  } catch (error) {
    logger.error('Note route error', {
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
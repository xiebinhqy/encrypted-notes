/**
 * 标签管理请求处理器
 * 版本：v2.1.0
 */

import { response } from '../utils/response.js';
import { validator } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { AppError, NotFoundError } from '../utils/errors.js';

/**
 * 获取标签列表
 * @param {Request} request 请求对象
 * @param {object} env 环境变量
 * @param {object} db 数据库管理器
 * @param {object} user 用户信息
 * @returns {Promise<Response>}
 */
export async function getTagsHandler(request, env, db, user) {
  try {
    const tagsResult = await db.queryReadOnly(
      `SELECT t.id, t.name, COUNT(nt.note_id) as note_count
       FROM tags t
       LEFT JOIN note_tags nt ON t.id = nt.tag_id
       WHERE t.user_id = ?
       GROUP BY t.id, t.name
       ORDER BY t.name`,
      [user.userId]
    );

    return response.success(tagsResult.results);
  } catch (error) {
    logger.error('获取标签列表失败', { error: error.message });
    if (error instanceof AppError) {
      return response.error(error.message, error.statusCode, error.errors);
    }
    return response.serverError();
  }
}

/**
 * 创建标签
 * @param {Request} request 请求对象
 * @param {object} env 环境变量
 * @param {object} db 数据库管理器
 * @param {object} user 用户信息
 * @returns {Promise<Response>}
 */
export async function createTagHandler(request, env, db, user) {
  try {
    const body = await request.json();
    
    // 验证必填字段
    validator.required(body, ['name']);
    
    // 验证名称长度
    validator.length(body.name, '标签名称', 1, 30);

    // 检查标签是否已存在
    const existingTag = await db.queryReadOnly(
      'SELECT id FROM tags WHERE user_id = ? AND name = ?',
      [user.userId, body.name.trim()]
    );

    if (existingTag.results.length > 0) {
      return response.error('标签名称已存在');
    }

    // 创建标签
    const result = await db.query(
      'INSERT INTO tags (user_id, name) VALUES (?, ?)',
      [user.userId, body.name.trim()]
    );

    const tagId = result.meta.last_row_id;

    logger.info('标签创建成功', { tagId, userId: user.userId });

    return response.success({ tagId }, '标签创建成功');
  } catch (error) {
    logger.error('创建标签失败', { error: error.message });
    if (error instanceof AppError) {
      return response.error(error.message, error.statusCode, error.errors);
    }
    return response.serverError();
  }
}

/**
 * 删除标签
 * @param {Request} request 请求对象
 * @param {object} env 环境变量
 * @param {object} db 数据库管理器
 * @param {object} user 用户信息
 * @param {number} tagId 标签ID
 * @returns {Promise<Response>}
 */
export async function deleteTagHandler(request, env, db, user, tagId) {
  try {
    // 验证标签是否存在
    const tagResult = await db.queryReadOnly(
      'SELECT name FROM tags WHERE id = ? AND user_id = ?',
      [tagId, user.userId]
    );

    if (tagResult.results.length === 0) {
      throw new NotFoundError('标签不存在');
    }

    const tagName = tagResult.results[0].name;

    // 删除标签关联
    await db.query('DELETE FROM note_tags WHERE tag_id = ?', [tagId]);

    // 删除标签
    await db.query(
      'DELETE FROM tags WHERE id = ? AND user_id = ?',
      [tagId, user.userId]
    );

    logger.info('标签删除成功', { tagId, userId: user.userId });

    return response.success(null, '标签删除成功');
  } catch (error) {
    logger.error('删除标签失败', { tagId, error: error.message });
    if (error instanceof AppError) {
      return response.error(error.message, error.statusCode, error.errors);
    }
    return response.serverError();
  }
}
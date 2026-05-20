/**
 * 笔记相关处理函数
 * 版本：v1.0.0
 * 功能：处理笔记的增删改查请求
 */

import { response } from '../utils/response.js';
import { logger } from '../utils/logger.js';

/**
 * 获取所有笔记
 * @param {Request} request Cloudflare Worker请求对象
 * @param {object} env 环境变量
 * @param {object} user 用户信息
 * @returns {Promise<Response>} 响应对象
 */
export async function getAllNotesHandler(request, env, user) {
  try {
    // 查询用户的所有未删除笔记
    const notes = await env.DB.prepare(
      'SELECT id, title_cipher, category_cipher, tags_cipher, created_at, updated_at FROM notes WHERE user_id = ? AND is_deleted = 0 ORDER BY updated_at DESC'
    ).bind(user.userId).all();

    logger.info('获取笔记列表成功', { userId: user.userId, count: notes.results.length });

    return response.success({
      notes: notes.results
    }, '获取笔记列表成功');
  } catch (error) {
    logger.error('获取笔记列表失败', { error: error.message, userId: user.userId });
    return response.serverError();
  }
}

/**
 * 创建新笔记
 * @param {Request} request Cloudflare Worker请求对象
 * @param {object} env 环境变量
 * @param {object} user 用户信息
 * @returns {Promise<Response>} 响应对象
 */
export async function createNoteHandler(request, env, user) {
  try {
    const { titleCipher, ciphertext, categoryCipher, tagsCipher } = await request.json();

    if (!titleCipher) {
      return response.error('标题不能为空', 400);
    }

    const noteId = crypto.randomUUID();
    const now = Date.now();

    // 插入新笔记
    await env.DB.prepare(
      'INSERT INTO notes (id, user_id, title_cipher, ciphertext, category_cipher, tags_cipher, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      noteId,
      user.userId,
      titleCipher,
      ciphertext || '',
      categoryCipher || null,
      tagsCipher || null,
      now,
      now
    ).run();

    logger.info('笔记创建成功', { noteId, userId: user.userId });

    return response.success({
      noteId
    }, '笔记创建成功');
  } catch (error) {
    logger.error('创建笔记失败', { error: error.message, userId: user.userId });
    return response.serverError();
  }
}

/**
 * 获取单条笔记
 * @param {Request} request Cloudflare Worker请求对象
 * @param {object} env 环境变量
 * @param {object} user 用户信息
 * @returns {Promise<Response>} 响应对象
 */
export async function getNoteHandler(request, env, user) {
  try {
    const url = new URL(request.url);
    const noteId = url.pathname.split('/').pop();

    // 查询笔记
    const note = await env.DB.prepare(
      'SELECT id, title_cipher, ciphertext, category_cipher, tags_cipher, created_at, updated_at FROM notes WHERE id = ? AND user_id = ? AND is_deleted = 0'
    ).bind(noteId, user.userId).first();

    if (!note) {
      return response.notFound('笔记不存在');
    }

    logger.info('获取笔记成功', { noteId, userId: user.userId });

    return response.success(note, '获取笔记成功');
  } catch (error) {
    logger.error('获取笔记失败', { error: error.message, userId: user.userId });
    return response.serverError();
  }
}

/**
 * 更新笔记
 * @param {Request} request Cloudflare Worker请求对象
 * @param {object} env 环境变量
 * @param {object} user 用户信息
 * @returns {Promise<Response>} 响应对象
 */
export async function updateNoteHandler(request, env, user) {
  try {
    const url = new URL(request.url);
    const noteId = url.pathname.split('/').pop();
    const { titleCipher, ciphertext, categoryCipher, tagsCipher } = await request.json();

    if (!titleCipher) {
      return response.error('标题不能为空', 400);
    }

    // 检查笔记是否存在
    const note = await env.DB.prepare(
      'SELECT id FROM notes WHERE id = ? AND user_id = ? AND is_deleted = 0'
    ).bind(noteId, user.userId).first();

    if (!note) {
      return response.notFound('笔记不存在');
    }

    // 更新笔记
    await env.DB.prepare(
      'UPDATE notes SET title_cipher = ?, ciphertext = ?, category_cipher = ?, tags_cipher = ?, updated_at = ? WHERE id = ? AND user_id = ?'
    ).bind(
      titleCipher,
      ciphertext || '',
      categoryCipher || null,
      tagsCipher || null,
      Date.now(),
      noteId,
      user.userId
    ).run();

    logger.info('笔记更新成功', { noteId, userId: user.userId });

    return response.success(null, '笔记更新成功');
  } catch (error) {
    logger.error('更新笔记失败', { error: error.message, userId: user.userId });
    return response.serverError();
  }
}

/**
 * 删除笔记（软删除）
 * @param {Request} request Cloudflare Worker请求对象
 * @param {object} env 环境变量
 * @param {object} user 用户信息
 * @returns {Promise<Response>} 响应对象
 */
export async function deleteNoteHandler(request, env, user) {
  try {
    const url = new URL(request.url);
    const noteId = url.pathname.split('/').pop();

    // 检查笔记是否存在
    const note = await env.DB.prepare(
      'SELECT id FROM notes WHERE id = ? AND user_id = ? AND is_deleted = 0'
    ).bind(noteId, user.userId).first();

    if (!note) {
      return response.notFound('笔记不存在');
    }

    // 软删除笔记
    await env.DB.prepare(
      'UPDATE notes SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?'
    ).bind(
      Date.now(),
      Date.now(),
      noteId,
      user.userId
    ).run();

    logger.info('笔记删除成功', { noteId, userId: user.userId });

    return response.success(null, '笔记删除成功');
  } catch (error) {
    logger.error('删除笔记失败', { error: error.message, userId: user.userId });
    return response.serverError();
  }
}
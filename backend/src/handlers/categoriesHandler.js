/**
 * 分类相关处理函数
 * 版本：v1.0.0
 * 功能：处理分类的增删改查请求
 */

import { response } from '../utils/response.js';
import { logger } from '../utils/logger.js';

/**
 * 获取所有分类
 * @param {Request} request Cloudflare Worker请求对象
 * @param {object} env 环境变量
 * @param {object} user 用户信息
 * @returns {Promise<Response>} 响应对象
 */
export async function getAllCategoriesHandler(request, env, user) {
  try {
    // 查询用户的所有分类
    const categories = await env.DB.prepare(
      'SELECT id, name_cipher, created_at, updated_at FROM categories WHERE user_id = ? ORDER BY created_at ASC'
    ).bind(user.userId).all();

    logger.info('获取分类列表成功', { userId: user.userId, count: categories.results.length });

    return response.success(
      categories.results,
      '获取分类列表成功'
    );
  } catch (error) {
    logger.error('获取分类列表失败', { error: error.message, userId: user.userId });
    return response.serverError();
  }
}

/**
 * 创建新分类
 * @param {Request} request Cloudflare Worker请求对象
 * @param {object} env 环境变量
 * @param {object} user 用户信息
 * @returns {Promise<Response>} 响应对象
 */
export async function createCategoryHandler(request, env, user) {
  try {
    const { nameCipher } = await request.json();

    if (!nameCipher) {
      return response.error('分类名称不能为空', 400);
    }

    // 检查分类是否已存在
    const existingCategory = await env.DB.prepare(
      'SELECT id FROM categories WHERE user_id = ? AND name_cipher = ?'
    ).bind(user.userId, nameCipher).first();

    if (existingCategory) {
      return response.error('分类已存在', 400);
    }

    const categoryId = crypto.randomUUID();
    const now = Date.now();

    // 插入新分类
    await env.DB.prepare(
      'INSERT INTO categories (id, user_id, name_cipher, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      categoryId,
      user.userId,
      nameCipher,
      now,
      now
    ).run();

    logger.info('分类创建成功', { categoryId, userId: user.userId });

    return response.success({
      categoryId
    }, '分类创建成功');
  } catch (error) {
    logger.error('创建分类失败', { error: error.message, userId: user.userId });
    return response.serverError();
  }
}

/**
 * 更新分类
 * @param {Request} request Cloudflare Worker请求对象
 * @param {object} env 环境变量
 * @param {object} user 用户信息
 * @returns {Promise<Response>} 响应对象
 */
export async function updateCategoryHandler(request, env, user) {
  try {
    const url = new URL(request.url);
    const categoryId = url.pathname.split('/').pop();
    const { nameCipher } = await request.json();

    if (!nameCipher) {
      return response.error('分类名称不能为空', 400);
    }

    // 检查分类是否存在
    const category = await env.DB.prepare(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?'
    ).bind(categoryId, user.userId).first();

    if (!category) {
      return response.notFound('分类不存在');
    }

    // 检查新名称是否已存在
    const existingCategory = await env.DB.prepare(
      'SELECT id FROM categories WHERE user_id = ? AND name_cipher = ? AND id != ?'
    ).bind(user.userId, nameCipher, categoryId).first();

    if (existingCategory) {
      return response.error('分类名称已存在', 400);
    }

    // 更新分类
    await env.DB.prepare(
      'UPDATE categories SET name_cipher = ?, updated_at = ? WHERE id = ? AND user_id = ?'
    ).bind(
      nameCipher,
      Date.now(),
      categoryId,
      user.userId
    ).run();

    logger.info('分类更新成功', { categoryId, userId: user.userId });

    return response.success(null, '分类更新成功');
  } catch (error) {
    logger.error('更新分类失败', { error: error.message, userId: user.userId });
    return response.serverError();
  }
}

/**
 * 删除分类
 * @param {Request} request Cloudflare Worker请求对象
 * @param {object} env 环境变量
 * @param {object} user 用户信息
 * @returns {Promise<Response>} 响应对象
 */
export async function deleteCategoryHandler(request, env, user) {
  try {
    const url = new URL(request.url);
    const categoryId = url.pathname.split('/').pop();

    // 检查分类是否存在
    const category = await env.DB.prepare(
      'SELECT id, name_cipher FROM categories WHERE id = ? AND user_id = ?'
    ).bind(categoryId, user.userId).first();

    if (!category) {
      return response.notFound('分类不存在');
    }

    // 将该分类下的所有笔记移至未分类
    await env.DB.prepare(
      'UPDATE notes SET category_cipher = NULL, updated_at = ? WHERE user_id = ? AND category_cipher = ?'
    ).bind(
      Date.now(),
      user.userId,
      category.name_cipher
    ).run();

    // 删除分类
    await env.DB.prepare(
      'DELETE FROM categories WHERE id = ? AND user_id = ?'
    ).bind(categoryId, user.userId).run();

    logger.info('分类删除成功', { categoryId, userId: user.userId });

    return response.success(null, '分类删除成功，该分类下的笔记已移至未分类');
  } catch (error) {
    logger.error('删除分类失败', { error: error.message, userId: user.userId });
    return response.serverError();
  }
}
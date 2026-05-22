/**
 * 多环境数据库统一获取工具
 * @version v2.1.1
 * @date 2026-05-20
 * @description 支持主数据库和备份数据库双连接
 */

import logger from './logger.js';

/**
 * 获取主数据库连接
 * @param {Object} env - 环境变量
 * @returns {D1Database} D1数据库实例
 */
export function getDB(env) {
  if (!env.DB) {
    logger.error('Main database binding not found');
    throw new Error('Main database connection failed');
  }
  return env.DB;
}

/**
 * 获取备份数据库连接
 * @param {Object} env - 环境变量
 * @returns {D1Database} D1数据库实例
 */
export function getBackupDB(env) {
  if (!env.BACKUP_DB) {
    logger.error('Backup database binding not found');
    throw new Error('Backup database connection failed');
  }
  return env.BACKUP_DB;
}

/**
 * 执行SQL查询并返回第一条结果
 * @param {D1Database} db - 数据库实例
 * @param {string} sql - SQL语句
 * @param {Array} params - 参数数组
 * @returns {Promise<Object|null>} 查询结果
 */
export async function queryOne(db, sql, params = []) {
  const result = await db.prepare(sql).bind(...params).first();
  return result || null;
}

/**
 * 执行SQL查询并返回所有结果
 * @param {D1Database} db - 数据库实例
 * @param {string} sql - SQL语句
 * @param {Array} params - 参数数组
 * @returns {Promise<Array>} 查询结果数组
 */
export async function queryAll(db, sql, params = []) {
  const result = await db.prepare(sql).bind(...params).all();
  return result.results || [];
}

/**
 * 执行SQL语句并返回执行结果
 * @param {D1Database} db - 数据库实例
 * @param {string} sql - SQL语句
 * @param {Array} params - 参数数组
 * @returns {Promise<Object>} 执行结果
 */
export async function execute(db, sql, params = []) {
  return await db.prepare(sql).bind(...params).run();
}

/**
 * 执行事务
 * @param {D1Database} db - 数据库实例
 * @param {Function} callback - 事务回调函数
 * @returns {Promise<any>} 回调函数返回值
 */
export async function transaction(db, callback) {
  const batch = db.batch();
  try {
    const result = await callback(batch);
    await batch.commit();
    return result;
  } catch (error) {
    logger.error('Transaction failed', { error: error.message });
    throw error;
  }
}
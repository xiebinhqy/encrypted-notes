/**
 * 数据库初始化工具
 * 版本：v1.0.0
 * 功能：应用启动时自动检查并创建所有必要的数据库表
 */

import { logger } from './logger.js';

/**
 * 数据库表结构定义
 */
const TABLES = {
  // 用户表
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      key_hash TEXT NOT NULL UNIQUE,
      recovery_code TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `,

  // 笔记表
  notes: `
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title_cipher TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      category_cipher TEXT,
      tags_cipher TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `,

  // 分类表
  categories: `
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name_cipher TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name_cipher)
    );
  `,

  // 索引
  indexes: [
    'CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_notes_is_deleted ON notes(is_deleted);',
    'CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);'
  ]
};

/**
 * 初始化数据库
 * 检查所有表是否存在，不存在则创建
 * @param {object} db D1数据库对象
 * @returns {Promise<boolean>} 初始化是否成功
 */
export async function initDatabase(db) {
  try {
    logger.info('开始初始化数据库...');

    // 创建用户表
    await db.prepare(TABLES.users).run();
    logger.info('用户表检查/创建完成');

    // 创建笔记表
    await db.prepare(TABLES.notes).run();
    logger.info('笔记表检查/创建完成');

    // 创建分类表
    await db.prepare(TABLES.categories).run();
    logger.info('分类表检查/创建完成');

    // 创建索引
    for (const indexSql of TABLES.indexes) {
      await db.prepare(indexSql).run();
    }
    logger.info('数据库索引检查/创建完成');

    logger.info('数据库初始化完成');
    return true;
  } catch (error) {
    logger.error('数据库初始化失败', { error: error.message, stack: error.stack });
    return false;
  }
}

/**
 * 检查数据库是否已初始化
 * @param {object} db D1数据库对象
 * @returns {Promise<boolean>} 数据库是否已初始化
 */
export async function isDatabaseInitialized(db) {
  try {
    // 检查users表是否存在
    const result = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    ).first();

    return !!result;
  } catch (error) {
    logger.error('检查数据库初始化状态失败', { error: error.message });
    return false;
  }
}
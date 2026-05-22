/**
 * 数据备份与同步工具
 * @version v2.1.1
 * @date 2026-05-20
 * @description 实现KV临时备份到D1和全量数据库备份到KV
 */

import logger from './logger.js';
import { getDB, getBackupDB, queryAll, execute } from './db.js';

/**
 * 同步KV临时备份到备用D1数据库
 * @param {Object} env - 环境变量
 */
export async function syncBackupToD1(env) {
  logger.info('Starting KV to D1 backup sync');
  
  try {
    const backupDB = getBackupDB(env);
    const mainDB = getDB(env);
    
    // 获取所有需要同步的备份记录
    const backupKeys = await env.NOTES_BACKUP.list({ prefix: 'temp:' });
    
    if (backupKeys.keys.length === 0) {
      logger.info('No temporary backups to sync');
      return;
    }
    
    let syncedCount = 0;
    
    for (const key of backupKeys.keys) {
      try {
        const backupData = await env.NOTES_BACKUP.get(key.name, { type: 'json' });
        
        if (!backupData) {
          await env.NOTES_BACKUP.delete(key.name);
          continue;
        }
        
        // 根据操作类型同步到备份数据库
        switch (backupData.operation) {
          case 'INSERT':
            await execute(backupDB, backupData.sql, backupData.params);
            break;
            
          case 'UPDATE':
            await execute(backupDB, backupData.sql, backupData.params);
            break;
            
          case 'DELETE':
            await execute(backupDB, backupData.sql, backupData.params);
            break;
        }
        
        // 删除已同步的临时备份
        await env.NOTES_BACKUP.delete(key.name);
        syncedCount++;
        
      } catch (error) {
        logger.error('Failed to sync backup record', {
          key: key.name,
          error: error.message
        });
      }
    }
    
    logger.info('KV to D1 backup sync completed', { syncedCount });
    
  } catch (error) {
    logger.error('KV to D1 backup sync failed', { error: error.message });
    throw error;
  }
}

/**
 * 全量备份主数据库到KV
 * @param {Object} env - 环境变量
 */
export async function fullBackupToKV(env) {
  logger.info('Starting full database backup to KV');
  
  try {
    const mainDB = getDB(env);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `full:${timestamp}`;
    
    // 备份所有表
    const backupData = {
      timestamp: new Date().toISOString(),
      environment: env.ENVIRONMENT,
      tables: {}
    };
    
    // 用户表
    backupData.tables.users = await queryAll(mainDB, 'SELECT * FROM users');
    
    // 分类表
    backupData.tables.categories = await queryAll(mainDB, 'SELECT * FROM categories');
    
    // 标签表
    backupData.tables.tags = await queryAll(mainDB, 'SELECT * FROM tags');
    
    // 笔记表
    backupData.tables.notes = await queryAll(mainDB, 'SELECT * FROM notes');
    
    // 笔记-标签关联表
    backupData.tables.note_tags = await queryAll(mainDB, 'SELECT * FROM note_tags');
    
    // 保存到KV
    await env.NOTES_BACKUP.put(backupKey, JSON.stringify(backupData), {
      expirationTtl: 30 * 24 * 60 * 60 // 保留30天
    });
    
    // 清理超过30天的旧备份
    const oldBackups = await env.NOTES_BACKUP.list({ prefix: 'full:' });
    const cutoffDate = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    for (const key of oldBackups.keys) {
      const keyDate = new Date(key.name.replace('full:', '').replace(/-/g, ':').replace('T', ' '));
      if (keyDate.getTime() < cutoffDate) {
        await env.NOTES_BACKUP.delete(key.name);
      }
    }
    
    logger.info('Full database backup to KV completed', {
      backupKey,
      recordCount: {
        users: backupData.tables.users.length,
        categories: backupData.tables.categories.length,
        tags: backupData.tables.tags.length,
        notes: backupData.tables.notes.length,
        note_tags: backupData.tables.note_tags.length
      }
    });
    
  } catch (error) {
    logger.error('Full database backup to KV failed', { error: error.message });
    throw error;
  }
}

/**
 * 创建临时备份记录
 * @param {Object} env - 环境变量
 * @param {string} operation - 操作类型 (INSERT/UPDATE/DELETE)
 * @param {string} sql - SQL语句
 * @param {Array} params - 参数数组
 */
export async function createTempBackup(env, operation, sql, params) {
  try {
    const timestamp = Date.now();
    const key = `temp:${timestamp}:${Math.random().toString(36).substring(2, 10)}`;
    
    const backupData = {
      operation,
      sql,
      params,
      timestamp: new Date().toISOString()
    };
    
    await env.NOTES_BACKUP.put(key, JSON.stringify(backupData), {
      expirationTtl: 24 * 60 * 60 // 保留24小时
    });
    
  } catch (error) {
    logger.error('Failed to create temporary backup', { error: error.message });
    // 不抛出错误，避免影响主流程
  }
}
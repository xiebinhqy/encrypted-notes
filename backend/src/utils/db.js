/**
 * 多环境数据库统一获取工具
 * 实现高可用架构：主D1 -> KV临时备份 -> 备用D1定时同步
 * 版本：v2.1.0
 */

import { logger } from './logger.js';
import { DatabaseError } from './errors.js';

class DatabaseManager {
  constructor(env) {
    this.env = env;
    this.mainDB = env.DB;
    this.backupDB = env.BACKUP_DB;
    this.backupKV = env.NOTES_BACKUP;
    this.isMainDBHealthy = true;
  }

  /**
   * 执行SQL查询（主库优先，失败自动写入KV临时备份）
   * @param {string} sql SQL语句
   * @param {any[]} params 参数列表
   * @returns {Promise<any>}
   */
  async query(sql, params = []) {
    try {
      // 尝试主库查询
      const result = await this.mainDB.prepare(sql).bind(...params).all();
      this.isMainDBHealthy = true;
      return result;
    } catch (error) {
      logger.error('主数据库查询失败，尝试写入KV临时备份', {
        sql,
        params,
        error: error.message
      });
      this.isMainDBHealthy = false;

      // 写入操作失败时，保存到KV临时备份
      if (sql.trim().toLowerCase().startsWith('insert') || 
          sql.trim().toLowerCase().startsWith('update') || 
          sql.trim().toLowerCase().startsWith('delete')) {
        await this.saveToKVBackup(sql, params);
      }

      throw new DatabaseError('数据库操作失败，数据已临时保存');
    }
  }

  /**
   * 执行SQL查询（只读，优先主库，失败尝试备用库）
   * @param {string} sql SQL语句
   * @param {any[]} params 参数列表
   * @returns {Promise<any>}
   */
  async queryReadOnly(sql, params = []) {
    try {
      // 尝试主库
      const result = await this.mainDB.prepare(sql).bind(...params).all();
      this.isMainDBHealthy = true;
      return result;
    } catch (error) {
      logger.warn('主数据库只读查询失败，尝试备用库', {
        sql,
        params,
        error: error.message
      });

      // 尝试备用库
      try {
        const result = await this.backupDB.prepare(sql).bind(...params).all();
        return result;
      } catch (backupError) {
        logger.error('备用数据库查询也失败', { error: backupError.message });
        throw new DatabaseError('数据库查询失败');
      }
    }
  }

  /**
   * 保存到KV临时备份
   * @param {string} sql SQL语句
   * @param {any[]} params 参数列表
   */
  async saveToKVBackup(sql, params) {
    const key = `backup:${Date.now()}:${Math.random().toString(36).substring(2, 10)}`;
    const value = JSON.stringify({
      sql,
      params,
      timestamp: Date.now()
    });

    await this.backupKV.put(key, value, {
      expirationTtl: 86400 * 7 // 保留7天
    });

    logger.info('数据已保存到KV临时备份', { key });
  }

  /**
   * 同步KV临时备份到备用数据库
   * 由定时任务每5分钟调用一次
   */
  async syncKVToBackupDB() {
    logger.info('开始同步KV临时备份到备用数据库');

    try {
      // 获取所有备份键
      const keys = await this.backupKV.list({ prefix: 'backup:' });
      
      for (const key of keys.keys) {
        try {
          // 获取备份数据
          const value = await this.backupKV.get(key.name);
          if (!value) continue;

          const { sql, params, timestamp } = JSON.parse(value);

          // 执行到备用数据库
          await this.backupDB.prepare(sql).bind(...params).run();

          // 删除已同步的备份
          await this.backupKV.delete(key.name);

          logger.info('成功同步备份数据', { key: key.name, timestamp });
        } catch (error) {
          logger.error('同步单条备份数据失败', {
            key: key.name,
            error: error.message
          });
          // 继续同步其他数据
        }
      }

      logger.info('KV临时备份同步完成', { count: keys.keys.length });
    } catch (error) {
      logger.error('同步KV临时备份失败', { error: error.message });
    }
  }

  /**
   * 全量备份主数据库到KV
   * 由定时任务每天凌晨3点调用一次
   */
  async fullBackupToKV() {
    logger.info('开始全量备份主数据库到KV');

    try {
      // 获取所有表名
      const tables = await this.mainDB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      ).all();

      const backupData = {};

      // 备份每个表的数据
      for (const table of tables.results) {
        const tableName = table.name;
        const data = await this.mainDB.prepare(`SELECT * FROM ${tableName}`).all();
        backupData[tableName] = data.results;
      }

      // 保存到KV
      const key = `full_backup:${new Date().toISOString().split('T')[0]}`;
      await this.backupKV.put(key, JSON.stringify(backupData), {
        expirationTtl: 86400 * 30 // 保留30天
      });

      logger.info('全量备份完成', { key, tables: Object.keys(backupData).length });
    } catch (error) {
      logger.error('全量备份失败', { error: error.message });
    }
  }
}

// 创建数据库管理器实例
export function createDBManager(env) {
  return new DatabaseManager(env);
}
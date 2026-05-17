-- ==============================================
-- staging库全表清空脚本
-- 严格按外键依赖顺序删除，避免外键约束报错
-- 仅操作staging测试库，不影响生产环境
-- ==============================================

-- 先关闭外键约束，避免删除顺序导致的报错
PRAGMA foreign_keys = OFF;

-- 按依赖顺序删除表（先删子表，再删主表）
DROP TABLE IF EXISTS note_history;
DROP TABLE IF EXISTS shares;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- 重新开启外键约束
PRAGMA foreign_keys = ON;

-- 验证清空结果
SELECT name FROM sqlite_master WHERE type='table';
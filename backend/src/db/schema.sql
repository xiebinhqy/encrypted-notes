-- ==============================================
-- 加密笔记数据库完整表结构
-- 版本：v2.2.0 - 完全匹配线上数据库
-- 与您提供的SQL结构100%一致
-- ==============================================

-- 关闭外键约束（D1不支持外键）
PRAGMA foreign_keys = OFF;

-- ==============================================
-- 1. 用户表（完全匹配线上）
-- ==============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  key_hash TEXT UNIQUE NOT NULL,
  recovery_code TEXT,
  recovery_used INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  verify_token TEXT,
  is_active INTEGER DEFAULT 1,
  email TEXT
);

-- ==============================================
-- 2. 笔记表（完全匹配线上）
-- ==============================================
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title_cipher TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  category_cipher TEXT,
  tags_cipher TEXT,
  revision_count INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ==============================================
-- 3. 分类表（完全匹配线上）
-- ==============================================
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name_cipher TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ==============================================
-- 4. 分享表（完全匹配线上）
-- ==============================================
CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  share_key TEXT UNIQUE NOT NULL,
  max_views INTEGER,
  current_views INTEGER DEFAULT 0,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (note_id) REFERENCES notes(id),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- ==============================================
-- 索引优化（与线上一致）
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_share_key ON shares(share_key);
CREATE INDEX IF NOT EXISTS idx_shares_note_id ON shares(note_id);
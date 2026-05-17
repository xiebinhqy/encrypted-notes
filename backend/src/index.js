// ==============================================
// 加密笔记 - Cloudflare Worker后端（V2.2.4 终极修复版）
// 纯原生Cloudflare Worker实现 | 零数据库修改 | 彻底移除recovery_code
// ==============================================

// 生成UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 验证JWT令牌
async function verifyToken(token, JWT_SECRET) {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;

    const data = `${header}.${payload}`;
    const encoder = new TextEncoder();
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const expectedSignature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(data)
    );
    
    const expectedSignatureBase64 = btoa(String.fromCharCode(...new Uint8Array(expectedSignature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    if (signature !== expectedSignatureBase64) return null;
    
    return JSON.parse(atob(payload));
  } catch (e) {
    console.error('验证令牌失败:', e);
    return null;
  }
}

// 生成JWT令牌
async function generateToken(userId, JWT_SECRET) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ 
    user_id: userId,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7天过期
  }));
  
  const data = `${header}.${payload}`;
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );
  
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${header}.${payload}.${signatureBase64}`;
}

// 处理CORS跨域
function handleCORS(request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers, status: 204 });
  }
  
  return headers;
}

// 获取当前环境的数据库连接（完全适配你固定的三环境配置）
function getDatabase(env) {
  if (env.ENVIRONMENT === 'staging') {
    return {
      main: env.staging_notes_db,
      backup: env.staging_notes_backup
    };
  } else {
    return {
      main: env.DB,
      backup: env.BACKUP_DB
    };
  }
}

// 获取当前环境的KV命名空间（完全适配你固定的三环境配置）
function getKV(env) {
  if (env.ENVIRONMENT === 'staging') {
    return {
      loginRateLimit: env.STAGING_LOGIN_RATE_LIMIT,
      noteHistory: env.STAGING_NOTE_HISTORY,
      notesBackup: env.STAGING_NOTES_BACKUP
    };
  } else {
    return {
      loginRateLimit: env.LOGIN_RATE_LIMIT,
      noteHistory: env.NOTE_HISTORY,
      notesBackup: env.NOTES_BACKUP
    };
  }
}

// 主请求处理函数
export default {
  async fetch(request, env, ctx) {
    const corsHeaders = handleCORS(request);
    if (request.method === 'OPTIONS') {
      return new Response(null, corsHeaders);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // 健康检查接口
    if (path === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        version: '2.2.4',
        environment: env.ENVIRONMENT || 'unknown'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 静态文件服务
    if (request.method === 'GET' && !path.startsWith('/api/')) {
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      } else {
        return new Response('ASSETS not configured', { status: 500 });
      }
    }

    // 获取当前环境数据库与KV绑定
    const db = getDatabase(env);
    const kv = getKV(env);

    // API路由处理
    try {
      // ==============================
      // 用户登录 / 注册接口
      // ==============================
      if (path === '/api/auth/login' && request.method === 'POST') {
        const { key_hash } = await request.json();
        
        if (!key_hash) {
          return new Response(JSON.stringify({ success: false, message: '缺少密钥哈希' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // 登录限流
        const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
        const rateLimitKey = `login:${clientIP}`;
        const attempts = await kv.loginRateLimit.get(rateLimitKey);
        
        if (attempts && parseInt(attempts) >= 5) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: '登录尝试次数过多，请稍后再试' 
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // 查询用户是否存在
        const { results } = await db.main.prepare(
          'SELECT id FROM users WHERE key_hash = ?'
        ).bind(key_hash).all();

        let userId;
        const now = new Date().toISOString();

        if (results.length === 0) {
          // 注册新用户（完全适配线上数据库，无recovery_code字段）
          if (env.ALLOW_PUBLIC_REGISTRATION !== 'true') {
            return new Response(JSON.stringify({ 
              success: false, 
              message: '公开注册已关闭' 
            }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          userId = generateUUID();
          
          // 主库插入（仅包含线上数据库存在的字段）
          await db.main.prepare(
            'INSERT INTO users (id, key_hash, created_at) VALUES (?, ?, ?)'
          ).bind(userId, key_hash, now).run();

          // 备份库插入
          await db.backup.prepare(
            'INSERT INTO users (id, key_hash, created_at) VALUES (?, ?, ?)'
          ).bind(userId, key_hash, now).run();
        } else {
          userId = results[0].id;
        }

        // 重置登录限流
        await kv.loginRateLimit.delete(rateLimitKey);

        // 生成登录令牌
        const token = await generateToken(userId, env.JWT_SECRET);
        
        return new Response(JSON.stringify({ success: true, token }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ==============================
      // 身份验证中间件
      // ==============================
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ success: false, message: '未授权' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.substring(7);
      const payload = await verifyToken(token, env.JWT_SECRET);
      if (!payload) {
        return new Response(JSON.stringify({ success: false, message: '无效的令牌' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const userId = payload.user_id;
      const now = new Date().toISOString();

      // ==============================
      // 笔记相关接口
      // ==============================
      // 获取笔记列表
      if (path === '/api/notes' && request.method === 'GET') {
        const trashed = url.searchParams.get('trashed') === 'true';
        
        const { results } = await db.main.prepare(
          'SELECT * FROM notes WHERE user_id = ? AND deleted_at IS ' + (trashed ? 'NOT NULL' : 'NULL') + ' ORDER BY updated_at DESC'
        ).bind(userId).all();

        return new Response(JSON.stringify({ success: true, data: results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 创建笔记
      if (path === '/api/notes' && request.method === 'POST') {
        const { title, content, tags, category_id, is_pinned } = await request.json();
        
        if (!title) {
          return new Response(JSON.stringify({ success: false, message: '标题不能为空' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const noteId = generateUUID();
        
        // 主库插入（补全所有线上数据库非空字段）
        await db.main.prepare(
          'INSERT INTO notes (id, user_id, title_cipher, ciphertext, tags_cipher, category_cipher, is_pinned, created_at, updated_at, revision_count, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          noteId,
          userId,
          title,
          content,
          tags || '',
          category_id || null,
          is_pinned ? 1 : 0,
          now,
          now,
          1,
          null
        ).run();

        // 异步备份到备库 + KV历史
        ctx.waitUntil((async () => {
          try {
            await db.backup.prepare(
              'INSERT INTO notes (id, user_id, title_cipher, ciphertext, tags_cipher, category_cipher, is_pinned, created_at, updated_at, revision_count, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(
              noteId,
              userId,
              title,
              content,
              tags || '',
              category_id || null,
              is_pinned ? 1 : 0,
              now,
              now,
              1,
              null
            ).run();

            await kv.noteHistory.put(`note:${noteId}:${now}`, JSON.stringify({
              title_cipher: title,
              ciphertext: content,
              tags_cipher: tags || '',
              category_cipher: category_id || null,
              is_pinned: is_pinned ? 1 : 0,
              timestamp: now
            }), { expirationTtl: 30 * 24 * 60 * 60 });
          } catch (e) {
            console.error('笔记备份失败:', e);
          }
        })());

        return new Response(JSON.stringify({ success: true, id: noteId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 更新笔记
      if (path.startsWith('/api/notes/') && request.method === 'PUT') {
        const noteId = path.substring('/api/notes/'.length);
        const { title, content, tags, category_id, is_pinned } = await request.json();
        
        if (!title) {
          return new Response(JSON.stringify({ success: false, message: '标题不能为空' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const updateTime = new Date().toISOString();
        
        await db.main.prepare(
          'UPDATE notes SET title_cipher = ?, ciphertext = ?, tags_cipher = ?, category_cipher = ?, is_pinned = ?, updated_at = ?, revision_count = revision_count + 1 WHERE id = ? AND user_id = ?'
        ).bind(
          title,
          content,
          tags || '',
          category_id || null,
          is_pinned ? 1 : 0,
          updateTime,
          noteId,
          userId
        ).run();

        ctx.waitUntil((async () => {
          try {
            await db.backup.prepare(
              'UPDATE notes SET title_cipher = ?, ciphertext = ?, tags_cipher = ?, category_cipher = ?, is_pinned = ?, updated_at = ?, revision_count = revision_count + 1 WHERE id = ? AND user_id = ?'
            ).bind(
              title,
              content,
              tags || '',
              category_id || null,
              is_pinned ? 1 : 0,
              updateTime,
              noteId,
              userId
            ).run();

            await kv.noteHistory.put(`note:${noteId}:${updateTime}`, JSON.stringify({
              title_cipher: title,
              ciphertext: content,
              tags_cipher: tags || '',
              category_cipher: category_id || null,
              is_pinned: is_pinned ? 1 : 0,
              timestamp: updateTime
            }), { expirationTtl: 30 * 24 * 60 * 60 });
          } catch (e) {
            console.error('笔记更新备份失败:', e);
          }
        })());

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 移到回收站
      if (path.startsWith('/api/notes/') && request.method === 'DELETE') {
        const noteId = path.substring('/api/notes/'.length);
        const deleteTime = new Date().toISOString();
        
        await db.main.prepare(
          'UPDATE notes SET deleted_at = ? WHERE id = ? AND user_id = ?'
        ).bind(deleteTime, noteId, userId).run();

        ctx.waitUntil((async () => {
          try {
            await db.backup.prepare(
              'UPDATE notes SET deleted_at = ? WHERE id = ? AND user_id = ?'
            ).bind(deleteTime, noteId, userId).run();
          } catch (e) {
            console.error('回收站备份失败:', e);
          }
        })());

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 从回收站恢复
      if (path.startsWith('/api/notes/') && path.endsWith('/restore') && request.method === 'POST') {
        const noteId = path.substring('/api/notes/'.length, path.length - '/restore'.length);
        
        await db.main.prepare(
          'UPDATE notes SET deleted_at = NULL WHERE id = ? AND user_id = ?'
        ).bind(noteId, userId).run();

        ctx.waitUntil((async () => {
          try {
            await db.backup.prepare(
              'UPDATE notes SET deleted_at = NULL WHERE id = ? AND user_id = ?'
            ).bind(noteId, userId).run();
          } catch (e) {
            console.error('恢复笔记备份失败:', e);
          }
        })());

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 永久删除笔记
      if (path.startsWith('/api/notes/') && path.endsWith('/permanent') && request.method === 'DELETE') {
        const noteId = path.substring('/api/notes/'.length, path.length - '/permanent'.length);
        
        await db.main.prepare(
          'DELETE FROM notes WHERE id = ? AND user_id = ?'
        ).bind(noteId, userId).run();

        ctx.waitUntil((async () => {
          try {
            await db.backup.prepare(
              'DELETE FROM notes WHERE id = ? AND user_id = ?'
            ).bind(noteId, userId).run();
          } catch (e) {
            console.error('永久删除备份失败:', e);
          }
        })());

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 清空回收站
      if (path === '/api/notes/empty-trash' && request.method === 'DELETE') {
        await db.main.prepare(
          'DELETE FROM notes WHERE user_id = ? AND deleted_at IS NOT NULL'
        ).bind(userId).run();

        ctx.waitUntil((async () => {
          try {
            await db.backup.prepare(
              'DELETE FROM notes WHERE user_id = ? AND deleted_at IS NOT NULL'
            ).bind(userId).run();
          } catch (e) {
            console.error('清空回收站备份失败:', e);
          }
        })());

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ==============================
      // 分类相关接口
      // ==============================
      // 获取分类列表
      if (path === '/api/categories' && request.method === 'GET') {
        const { results } = await db.main.prepare(
          'SELECT * FROM categories WHERE user_id = ? ORDER BY created_at ASC'
        ).bind(userId).all();

        return new Response(JSON.stringify({ success: true, data: results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 创建分类
      if (path === '/api/categories' && request.method === 'POST') {
        const { name } = await request.json();
        
        if (!name) {
          return new Response(JSON.stringify({ success: false, message: '分类名称不能为空' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const categoryId = generateUUID();
        const createTime = new Date().toISOString();
        
        await db.main.prepare(
          'INSERT INTO categories (id, user_id, name_cipher, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(categoryId, userId, name, createTime, createTime).run();

        ctx.waitUntil((async () => {
          try {
            await db.backup.prepare(
              'INSERT INTO categories (id, user_id, name_cipher, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
            ).bind(categoryId, userId, name, createTime, createTime).run();
          } catch (e) {
            console.error('分类备份失败:', e);
          }
        })());

        return new Response(JSON.stringify({ success: true, id: categoryId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 更新分类
      if (path.startsWith('/api/categories/') && request.method === 'PUT') {
        const categoryId = path.substring('/api/categories/'.length);
        const { name } = await request.json();
        
        if (!name) {
          return new Response(JSON.stringify({ success: false, message: '分类名称不能为空' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const updateTime = new Date().toISOString();
        
        await db.main.prepare(
          'UPDATE categories SET name_cipher = ?, updated_at = ? WHERE id = ? AND user_id = ?'
        ).bind(name, updateTime, categoryId, userId).run();

        ctx.waitUntil((async () => {
          try {
            await db.backup.prepare(
              'UPDATE categories SET name_cipher = ?, updated_at = ? WHERE id = ? AND user_id = ?'
            ).bind(name, updateTime, categoryId, userId).run();
          } catch (e) {
            console.error('更新分类备份失败:', e);
          }
        })());

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 删除分类
      if (path.startsWith('/api/categories/') && request.method === 'DELETE') {
        const categoryId = path.substring('/api/categories/'.length);
        
        await db.main.prepare(
          'UPDATE notes SET category_cipher = NULL WHERE category_cipher = ? AND user_id = ?'
        ).bind(categoryId, userId).run();
        
        await db.main.prepare(
          'DELETE FROM categories WHERE id = ? AND user_id = ?'
        ).bind(categoryId, userId).run();

        ctx.waitUntil((async () => {
          try {
            await db.backup.prepare(
              'UPDATE notes SET category_cipher = NULL WHERE category_cipher = ? AND user_id = ?'
            ).bind(categoryId, userId).run();
            
            await db.backup.prepare(
              'DELETE FROM categories WHERE id = ? AND user_id = ?'
            ).bind(categoryId, userId).run();
          } catch (e) {
            console.error('删除分类备份失败:', e);
          }
        })());

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 404 接口不存在
      return new Response(JSON.stringify({ success: false, message: '接口不存在' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (e) {
      console.error('服务器异常:', e);
      return new Response(JSON.stringify({ success: false, message: '服务器错误: ' + e.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-User-Id"
    };

    // 处理OPTIONS预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const ALLOW_PUBLIC_REG = env.ALLOW_PUBLIC_REGISTRATION === "true";
    // 固定前端域名，解决分享链接错误
    const FRONTEND_DOMAIN = "https://notes.dee.us.kg";

    try {
      // 根路径测试
      if (path === "/" || path === "") {
        return new Response("✅ API运行正常", { 
          headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" } 
        });
      }

      // ====================== 1. 用户注册/登录/恢复码 ======================
      // 1.1 用户注册
      if (path === "/user/register" && request.method === "POST") {
        if (!ALLOW_PUBLIC_REG) {
          return Response.json({ err: "注册已关闭" }, { status: 403, headers: corsHeaders });
        }
        const { key_hash } = await request.json();
        // 检查密钥是否已存在
        const exist = await env.DB.prepare("SELECT id FROM users WHERE key_hash = ?1").bind(key_hash).first();
        if (exist) return Response.json({ err: "密钥已存在" }, { status: 400, headers: corsHeaders });
        
        const userId = crypto.randomUUID();
        // 生成16位大写恢复码
        const recoveryCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
        
        // 插入用户数据，字段和表结构完全匹配
        await env.DB.prepare(
          "INSERT INTO users (id, key_hash, recovery_code, recovery_used, created_at) VALUES (?1, ?2, ?3, 0, ?4)"
        ).bind(userId, key_hash, recoveryCode, Date.now()).run();
        
        return Response.json({ user_id: userId, recovery_code: recoveryCode }, { headers: corsHeaders });
      }

      // 1.2 用户登录
      if (path === "/user/login" && request.method === "POST") {
        const { key_hash } = await request.json();
        const user = await env.DB.prepare("SELECT id FROM users WHERE key_hash = ?1").bind(key_hash).first();
        if (!user) return Response.json({ err: "用户不存在" }, { status: 401, headers: corsHeaders });
        return Response.json({ user_id: user.id }, { headers: corsHeaders });
      }

      // 1.3 恢复码重置密码
      if (path === "/user/reset-password" && request.method === "POST") {
        const { recovery_code, new_key_hash } = await request.json();
        // 验证恢复码是否有效
        const user = await env.DB.prepare(
          "SELECT id FROM users WHERE recovery_code = ?1 AND recovery_used = 0"
        ).bind(recovery_code).first();
        
        if (!user) return Response.json({ err: "恢复码无效或已被使用" }, { status: 400, headers: corsHeaders });
        
        // 生成新恢复码
        const newRecoveryCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
        
        // 更新密码和恢复码，标记旧恢复码已用
        await env.DB.prepare(`
          UPDATE users 
          SET key_hash = ?1, recovery_code = ?2, recovery_used = 0 
          WHERE id = ?3
        `).bind(new_key_hash, newRecoveryCode, user.id).run();
        
        return Response.json({ new_recovery_code: newRecoveryCode }, { headers: corsHeaders });
      }

      // ====================== 2. 权限校验 ======================
      const userId = request.headers.get("X-User-Id");
      if (!userId && !path.startsWith("/share/")) {
        return Response.json({ err: "未授权" }, { status: 401, headers: corsHeaders });
      }

      // ====================== 3. 笔记接口 ======================
      // 3.1 保存笔记
      if (path === "/note" && request.method === "POST") {
        const { id, title_cipher, ciphertext, category_cipher, tags_cipher } = await request.json();
        const now = Date.now();
        
        const old = await env.DB.prepare("SELECT * FROM notes WHERE id = ?1 AND user_id = ?2").bind(id, userId).first();
        
        if (old) {
          // 更新
          await env.DB.prepare(`
            UPDATE notes 
            SET title_cipher = ?1, ciphertext = ?2, category_cipher = ?3, tags_cipher = ?4, 
                revision_count = revision_count + 1, updated_at = ?5
            WHERE id = ?6 AND user_id = ?7
          `).bind(title_cipher, ciphertext, category_cipher, tags_cipher, now, id, userId).run();
        } else {
          // 插入
          await env.DB.prepare(`
            INSERT INTO notes (id, user_id, title_cipher, ciphertext, category_cipher, tags_cipher, revision_count, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8)
          `).bind(id, userId, title_cipher, ciphertext, category_cipher, tags_cipher, now, now).run();
        }
        
        return Response.json({ ok: 1 }, { headers: corsHeaders });
      }

      // 3.2 获取笔记列表
      if (path === "/notes" && request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT * FROM notes WHERE user_id = ?1 ORDER BY updated_at DESC"
        ).bind(userId).all();
        return Response.json(results, { headers: corsHeaders });
      }

      // 3.3 删除笔记
      if (path === "/note" && request.method === "DELETE") {
        const { id } = await request.json();
        await env.DB.prepare("DELETE FROM notes WHERE id = ?1 AND user_id = ?2").bind(id, userId).run();
        await env.DB.prepare("DELETE FROM shares WHERE note_id = ?1").bind(id).run();
        return Response.json({ ok: 1 }, { headers: corsHeaders });
      }

      // ====================== 4. 分类接口 ======================
      if (path === "/categories" && request.method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM categories WHERE user_id = ?1").bind(userId).all();
        return Response.json(results, { headers: corsHeaders });
      }

      if (path === "/category" && request.method === "POST") {
        const { id, name_cipher } = await request.json();
        await env.DB.prepare(
          "INSERT OR REPLACE INTO categories (id, user_id, name_cipher, created_at) VALUES (?1, ?2, ?3, ?4)"
        ).bind(id, userId, name_cipher, Date.now()).run();
        return Response.json({ ok: 1 }, { headers: corsHeaders });
      }

      if (path === "/category" && request.method === "DELETE") {
        const { id } = await request.json();
        await env.DB.prepare("DELETE FROM categories WHERE id = ?1 AND user_id = ?2").bind(id, userId).run();
        return Response.json({ ok: 1 }, { headers: corsHeaders });
      }

      // ====================== 5. 分享接口（核心修复） ======================
      // 5.1 创建分享
      if (path === "/share/create" && request.method === "POST") {
        const { note_id, max_views, expires_in_hours } = await request.json();
        const share_key = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
        const expires_at = expires_in_hours ? Date.now() + expires_in_hours * 3600000 : 0;

        await env.DB.prepare(`
          INSERT INTO shares (id, note_id, owner_id, share_key, max_views, current_views, expires_at, created_at)
          VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7)
        `).bind(crypto.randomUUID(), note_id, userId, share_key, max_views, expires_at, Date.now()).run();

        // 固定生成前端域名的分享链接，不会再出现API地址
        return Response.json({ 
          share_key, 
          share_url: `${FRONTEND_DOMAIN}/share/${share_key}` 
        }, { headers: corsHeaders });
      }

      // 5.2 获取分享内容（仅提供数据，不渲染页面）
      if (path.startsWith("/share/")) {
        const key = path.split("/").pop();
        const share = await env.DB.prepare("SELECT * FROM shares WHERE share_key = ?1").bind(key).first();
        if (!share) return Response.json({ err: "无效链接" }, { status: 404, headers: corsHeaders });

        // 过期/次数上限校验
        if (share.expires_at && Date.now() > share.expires_at) {
          await env.DB.prepare("DELETE FROM shares WHERE id = ?1").bind(share.id).run();
          return Response.json({ err: "链接已过期" }, { status: 410, headers: corsHeaders });
        }
        if (share.max_views && share.current_views >= share.max_views) {
          await env.DB.prepare("DELETE FROM shares WHERE id = ?1").bind(share.id).run();
          return Response.json({ err: "已达访问上限" }, { status: 410, headers: corsHeaders });
        }

        // 更新访问次数
        await env.DB.prepare("UPDATE shares SET current_views = ?1 WHERE id = ?2")
          .bind(share.current_views + 1, share.id).run();

        // 返回加密内容，前端负责解密渲染
        const note = await env.DB.prepare("SELECT title_cipher, ciphertext FROM notes WHERE id = ?1")
          .bind(share.note_id).first();
        return Response.json(note, { headers: corsHeaders });
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (e) {
      console.error(e);
      return Response.json({ err: e.message }, { status: 500, headers: corsHeaders });
    }
  }
};

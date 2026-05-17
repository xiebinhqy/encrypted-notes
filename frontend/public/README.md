# 端对端加密私人笔记 - 部署文档

## 项目概述
这是一个基于 Cloudflare Workers + 模块化前端的端对端加密笔记应用，使用 AES-256-GCM 加密算法，服务器无法查看笔记内容。

## 文件结构

```
notes-app/
├── index.html          # 入口页面
├── style.css           # 全局样式
├── wrangler.toml       # Cloudflare部署配置
└── src/
    ├── api/            # 接口模块
    │   ├── index.js    # API基础配置（环境切换）
    │   ├── auth.js     # 认证接口
    │   ├── notes.js    # 笔记接口
    │   ├── categories.js # 分类接口
    │   └── shares.js   # 分享接口
    ├── components/     # UI组件
    │   ├── auth-forms.js # 登录/注册/重置密码组件
    │   ├── note-editor.js # 笔记编辑器
    │   ├── note-list.js   # 笔记列表
    │   ├── category-manager.js # 分类管理
    │   └── share-modal.js # 分享弹窗
    ├── utils/          # 工具函数
    │   ├── crypto-utils.js # 加密工具（模拟，需替换为真实加密）
    │   └── storage.js  # 本地存储工具
    └── app.js          # 应用主逻辑（路由/初始化）

```

frontend/
├── wrangler.toml          # 部署配置（之前已提供）
├── src/
│   └── index.js           # Worker入口（之前已提供）
└── public/
    ├── index.html         # 入口页面（之前已提供）
    ├── style.css          # 全局样式（之前已提供）
    └── src/
        ├── api/
        │   ├── index.js    # API基础配置（之前已提供）
        │   ├── auth.js     # 认证接口（之前已提供）
        │   ├── notes.js    # 笔记接口（之前已提供）
        │   ├── categories.js # 分类接口（之前已提供）
        │   └── shares.js   # 分享接口（之前已提供）
        ├── components/
        │   ├── auth-forms.js
        │   ├── note-editor.js
        │   ├── note-list.js
        │   ├── category-manager.js
        │   ├── share-modal.js
        │   └── settings-modal.js
        ├── utils/
        │   ├── crypto-utils.js
        │   ├── storage.js
        │   └── markdown.js
        └── app.js






## 功能特性
- 端对端 AES-256-GCM 加密
- 笔记增删改查、置顶、分类
- 回收站（30天自动清理）
- 闲置自动锁定
- 本地草稿自动保存
- Markdown 支持
- 响应式设计（移动端/桌面端）

## 部署步骤

### 1. 前端部署（Cloudflare Pages）

#### 方式一：直接上传
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** -> **Create application** -> **Pages**
3. 选择 **Upload assets**
4. 创建项目名称（如 `e2e-notes`）
5. 将以下文件打包上传：
   - `index.html`
   - `README.md`
   - 整个 `src/` 文件夹
6. 点击 **Deploy site**

#### 方式二：连接 Git 仓库
1. 将代码推送到 GitHub/GitLab 仓库
2. 在 Cloudflare Pages 中选择 **Connect to Git**
3. 选择仓库，配置构建命令（留空）
4. 部署目录设置为根目录（`/`）
5. 点击 **Save and Deploy**

### 2. 后端部署（Cloudflare Workers）
> 注意：你需要提供后端代码，以下是假设的后端部署步骤

1. 进入 **Workers & Pages** -> **Create application** -> **Workers**
2. 点击 **Create Worker**
3. 将后端代码粘贴到编辑器中
4. 配置环境变量（如需要）
5. 点击 **Deploy**
6. 在 Worker 设置中绑定 KV/D1 数据库（如需要）
7. 记录 Worker 的访问 URL（如 `https://api.xxx.workers.dev`）

### 3. 前后端对接
1. 在前端项目中修改 `src/config.js`：
   ```javascript
   API_BASE: "https://your-backend.workers.dev", // 替换为你的后端 URL

## 2. 重新部署前端

## 4. 自定义域名（可选）
 1. 在 Cloudflare Pages/Worker 设置中
 2. 进入 Custom domains
 3. 添加你的域名（如 notes.yourdomain.com）
 4. 按照提示配置 DNS 记录

## 验证部署

 1. 访问部署后的前端 URL
 2. 输入用户 ID 和加密密钥（任意，记住即可）
 3. 测试新建笔记、保存、编辑、删除功能
 4. 测试闲置锁定（等待 10 分钟或在设置中查看）
 5. 测试回收站功能

 ## 项目结构说明

 ```
e2e-notes/
├── index.html              # 入口 HTML
├── README.md               # 本文档
├── src/
│   ├── config.js           # 全局配置
│   ├── main.js             # 应用入口
│   ├── crypto/             # 加密模块
│   ├── api/                # API 请求
│   ├── state/              # 状态管理
│   ├── ui/                 # UI 组件
│   ├── features/           # 业务功能
│   └── utils/              # 工具函数
└── workers/                # 后端代码（待补充）

 ```

## 安全建议

 1. 妥善保管加密密钥：丢失密钥将无法恢复笔记
 2. 使用强密钥：建议至少 12 位，包含大小写字母、数字和特殊字符
 3. 定期备份：重要笔记建议定期导出备份
 4. 启用 HTTPS：生产环境务必使用 HTTPS
## 开发说明

 - 本地开发可直接用浏览器打开 index.html
 - 修改 src/config.js 中的 API_BASE 为本地后端地址
 - 建议使用 VS Code + Live Server 插件进行开发
# 常见问题

#### Q: 提示 "请求失败"
 A: 检查后端是否正常部署，API_BASE 配置是否正确
#### Q: 忘记密钥怎么办？
 A: 无法恢复，只能重新注册并创建新笔记
#### Q: 可以在多个设备使用吗？
 A: 可以，使用相同的用户 ID 和密钥登录即可

## 更新日志

## v1.2.0 (2026-05-05)
 - 完整模块化重构
 - 新增密钥安全管理
 - 新增请求签名机制
 - 优化草稿自动保存
 - 新增回收站自动清理
 - 完善错误处理


```
---

## 部署与验证步骤
### 1. 准备部署文件
在本地创建一个文件夹，将上述所有代码按文件结构保存：

```

### 2. 前端部署（Cloudflare Pages）
1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** -> **Create application** -> **Pages**
3. 选择 **Upload assets**，项目名称填 `e2e-notes`
4. 将本地文件夹中的所有内容（`index.html`、`README.md`、`src/`）拖拽上传
5. 点击 **Deploy site**，等待部署完成
6. 记录分配的 URL（如 `https://e2e-notes.pages.dev`）

### 3. 后端配置（临时 Mock 用于测试）
在你提供真实后端代码前，可以先修改 `src/config.js` 中的 `API_BASE` 为一个 Mock API 地址用于测试界面：
```javascript
API_BASE: "https://jsonplaceholder.typicode.com", // 临时测试用

```


### 4. 验证功能

 1. 访问部署后的 Pages URL
 2. 输入用户 ID（如 testuser）和密钥（如 Test@123456）
 3. 点击 "进入"，验证登录界面、笔记列表界面是否正常显示

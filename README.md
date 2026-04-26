# 🔐 端对端加密私人笔记

一个基于 Cloudflare 构建的**零成本、军工级加密**的私人笔记系统，所有数据在浏览器端加密后上传，仅你可解密查看。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/)

## ✨ 功能特点

### 🔒 安全特性
- **端对端加密**：采用 AES-GCM 256位加密，数据在浏览器加密后上传
- **零知识架构**：服务器只存储加密后的密文，无法查看任何明文内容
- **主密钥派生**：使用 SHA-256 派生加密密钥，主密钥本身不上传
- **一次性恢复码**：主密钥丢失可通过一次性恢复码重置，每个恢复码仅能使用一次

### 📝 笔记功能
- **Markdown 支持**：完整支持 Markdown 语法，代码高亮、表格等
- **分类管理**：自由创建分类，笔记按分类归纳
- **标签系统**：支持多标签，方便笔记检索
- **版本历史**：自动记录修改次数和时间
- **知识库视图**：飞书同款知识库体验，树形结构导航

### 🔗 分享功能
- **阅后即焚**：支持自定义最大观看次数
- **过期时间**：支持设置分享链接过期时间
- **零知识分享**：分享的内容也是加密的，需通过链接密钥解密

### 💰 成本优势
- **零成本部署**：基于 Cloudflare 免费额度构建
- **无服务器维护**：无需购买服务器，无需运维
- **全球加速**：Cloudflare 全球 CDN 加速，访问速度快

## 🚀 快速部署（5分钟搞定）

### 前置准备
1. 一个 [Cloudflare](https://dash.cloudflare.com/sign-up) 账号
2. 一个域名（可选，Cloudflare 提供免费的 `.workers.dev` 域名）

### 第一步：部署后端（Cloudflare Workers）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** -> **Create Application**
3. 选择 **Create Worker** -> 随便输入一个名字 -> **Deploy**
4. 点击 **Edit Code**，将 `backend/worker.js` 的代码完整粘贴进去
5. 点击 **Save and Deploy**
6. 复制你的 Worker 地址（例如：`https://encrypted-notes.xxx.workers.dev`）

### 第二步：配置前端

1. 打开 `frontend/index.html`
2. 找到第 138 行左右的 `const API_BASE = "https://api.dee.us.kg";`
3. 将其修改为你刚才的 Worker 地址：
   ```javascript
   const API_BASE = "https://your-worker-name.xxx.workers.dev";
4. 保存文件
### 第三步：部署前端（Cloudflare Pages）
1. 在 Cloudflare Dashboard 进入 Workers & Pages -> Create Application
2. 选择 Pages 选项卡
3. 你可以选择：
- **直接上传**：将 frontend 文件夹拖拽上传
- **连接 Git**：将代码推送到 GitHub 后自动部署（推荐）
4. 部署完成后，你会得到一个 Pages 地址（例如：https://encrypted-notes.pages.dev）

### 第四步：创建 KV 命名空间（必须）
1. 在 Cloudflare Dashboard 进入 Workers & Pages -> KV
2. 点击 Create Namespace，名称填写 NOTES_KV
3. 回到你的 Worker 设置页面 -> Settings -> Variables
4. 在 KV Namespace Bindings 部分点击 Add binding
5. Variable name 填写 NOTES_KV，KV namespace 选择刚才创建的 NOTES_KV
6. 点击 Save and Deploy
🎉 恭喜！你的加密笔记系统已经部署完成！

📖 使用说明

注册 / 登录
1. 打开你的 Pages 地址
2. 在密码框输入一个至少 8 位的主密钥
3. 新密钥会自动创建账号，老密钥会自动登录
4. 重要：首次登录会显示恢复码，请务必保存！
创建笔记
1. 点击右上角 新建笔记
2. 输入标题、选择分类、添加标签（可选）
3. 在内容区使用 Markdown 编写笔记
4. 点击 保存笔记
管理分类
1. 点击右上角 分类
2. 输入分类名称并确认
3. 在左侧导航栏可以看到你的分类
分享笔记
1. 打开一篇笔记
2. 点击 分享 按钮
3. 设置最大观看次数和过期时间（0 表示永久）
4. 点击 生成分享链接 并复制

🛠️ 技术栈
 - 前端：HTML5 + Tailwind CSS + Vanilla JavaScript
 - 后端：Cloudflare Workers (Serverless)
 - 数据库：Cloudflare KV
 - 加密：Web Crypto API (AES-GCM, SHA-256)
 - Markdown：Marked.js + GitHub Markdown CSS
📂 项目结构
```
encrypted-notes/
├── README.md           # 项目说明文档
├── LICENSE             # MIT 开源协议
├── frontend/           # 前端代码
│   └── index.html      # 单文件完整前端
└── backend/            # 后端代码
    └── worker.js       # Cloudflare Workers 代码
```
🤝 贡献指南
欢迎提交 Issue 和 Pull Request！
1. Fork 本项目
2. 创建你的特性分支 (git checkout -b feature/AmazingFeature)
3. 提交你的更改 (git commit -m 'Add some AmazingFeature')
4. 推送到分支 (git push origin feature/AmazingFeature)
5. 开启一个 Pull Request

📄 开源协议
本项目采用 MIT 协议 开源。

🙏 致谢
Cloudflare 提供的免费 Serverless 服务
Tailwind CSS 提供的 CSS 框架
Marked.js 提供的 Markdown 解析

如果这个项目对你有帮助，请给个 Star ⭐ 支持一下！














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

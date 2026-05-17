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
├── backend/                # 后端 Worker 项目
│   ├── src/
│   │   └── index.js       # 后端入口文件
│   └── wrangler.toml      # 后端配置文件
└── public/                # 前端静态项目（核心）
    ├── src/
    │   ├── api/            # 你的API请求目录
    │   ├── components/     # 你的UI组件目录
    │   ├── utils/          # 工具函数目录（【这里放加密模块】）
    │   └── app.js          # 前端主逻辑文件
    ├── index.html          # 前端主页面
    ├── style.css           # 前端样式文件
    └── wrangler.toml       # 前端 Pages 配置
```
🤝 贡献指南

欢迎提交 Issue 和 Pull Request！
1. Fork 本项目
2. 创建你的特性分支 (git checkout -b feature/AmazingFeature)
3. 提交你的更改 (git commit -m 'Add some AmazingFeature')
4. 推送到分支 (git push origin feature/AmazingFeature)
5. 开启一个 Pull Request

🟢 法律与合规风险

1. 数据隐私合规

 - **风险描述：**
   - 作为部署者，你需要遵守你所在国家和地区的数据隐私法规（如 GDPR、CCPA 等）
   - 虽然你无法读取用户的内容，但你仍然是数据处理者
   - 如果用户存储了违法内容，你可能需要承担相应的法律责任
 - **缓解措施：：**
   - 服务条款中明确说明：部署者不存储或查看任何用户数据
   - 用户对自己存储的内容负全部法律责任
   - 提供数据删除功能，允许用户随时删除自己的所有数据

2. 加密技术出口管制
2. 加密技术出口管制
风险描述：
加密技术在某些国家和地区受到出口管制
将包含加密代码的项目开源到 GitHub 可能需要遵守相关法规
缓解措施：
在 README 中明确说明本项目使用的是标准的 Web Crypto API
遵守 GitHub 和你所在国家的出口管制规定
3. 开源责任
风险描述：
作为开源作者，你需要对代码中的安全漏洞负责
如果有人因为使用你的代码导致数据丢失或泄露，可能会向你追责
缓解措施：
在 LICENSE 中加入免责声明，明确说明 "软件按原样提供，不提供任何担保"
在 README 中明确列出所有已知的风险和局限性
及时修复社区报告的安全漏洞

📌 给使用者的最终建议

永远不要在这个系统中存储极度敏感的信息（如银行卡密码、身份证号、医疗记录等）
定期备份你的所有笔记到本地加密存储
使用强密码并妥善保存恢复码
不要在公共或不受信任的设备上使用
不要分享包含敏感内容的笔记

📄 免责声明

本软件按 "原样" 提供，不提供任何明示或暗示的担保，包括但不限于适销性、特定用途适用性和非侵权性。在任何情况下，作者或版权持有人均不对因使用本软件产生的任何索赔、损害或其他责任承担责任，无论是在合同诉讼、侵权诉讼还是其他诉讼中。


📄 开源协议
本项目采用 MIT 协议 开源。


🙏 致谢


Cloudflare 提供的免费 Serverless 服务
Tailwind CSS 提供的 CSS 框架
Marked.js 提供的 Markdown 解析

如果这个项目对你有帮助，请给个 Star ⭐ 支持一下！














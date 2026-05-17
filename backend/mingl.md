# 1. 正确导出LOGIN_RATE_LIMIT的Key列表
wrangler kv:key list --namespace-id=1d4a117d0f4948288289437f01956f83 | Out-File -FilePath ./login_keys.json -Encoding utf8

# 2. 正确导出NOTE_HISTORY的Key列表
wrangler kv:key list --namespace-id=d5fae0ca8b0146389e8c4ee8ae4dfab2 | Out-File -FilePath ./history_keys.json -Encoding utf8

# 3. 正确导出NOTES_BACKUP的Key列表
wrangler kv:key list --namespace-id=cfd23ee25c2b4769a8331def0296f1d9 | Out-File -FilePath ./backup_keys.json -Encoding utf8


# 查看线上KV的所有Key
wrangler kv:key list --namespace-id=1d4a117d0f4948288289437f01956f83


你可以先执行wrangler kv:key list --namespace-id=【线上KV的ID】，如果输出是[]，就说明 KV 是空的，直接跳过整个同步步骤，不影响你的本地测试！

wrangler kv:key list --namespace-id=1d4a117d0f4948288289437f01956f83


三、线上 D1 数据库同步到本地（确认步骤）
如果之前已经执行过导入，直接跳过；没做的话执行下面的命令，把线上数据库完整克隆到本地：

# 1. 导出线上主库数据（只读操作，绝对不影响线上）
wrangler d1 export notes_db --output=./backup-prod-db.sql --remote

# 2. 导入到本地D1数据库
wrangler d1 execute staging-notes-db --file=./backup-prod-db.sql --env=staging --local

# 3. 导出线上备份库数据
wrangler d1 export notes-backup --output=./backup-prod-backup.sql --remote

# 4. 导入到本地D1备份库
wrangler d1 execute staging-notes-backup --file=./backup-prod-backup.sql --env=staging --local

操作	命令
本地开发后端	cd backend && wrangler dev --env=staging --port 8787 --local
本地开发前端	cd frontend && wrangler dev --env=preview --port 8788
部署后端测试环境	cd backend && wrangler deploy --env=staging
部署前端测试环境	cd frontend && wrangler deploy --env=staging
部署后端生产环境	cd backend && wrangler deploy
部署前端生产环境	cd frontend && wrangler deploy

四、后续操作
如果测试环境验证有问题：直接修改本地代码，重新执行 wrangler deploy --env=staging 即可更新测试环境，全程不会影响线上。
如果测试环境完全验证通过：就可以执行上线操作，先部署后端生产环境，再部署前端生产环境

# 1. 部署后端到线上（backend目录执行）
wrangler deploy

# 2. 部署前端到线上（frontend目录执行）
wrangler deploy


# 完整数据同步教程（严格遵守你的流程）

1. 第一步：获取线上生产环境的 ID（必须先完成）

```
# 进入backend目录
cd G:\hexol-blog\encrypted-notes\backend

# 【核心导出命令】完整导出线上生产库的表结构+全量数据
# --env=production：指定生产环境
# --remote：操作远程Cloudflare上的生产数据库
# --output=production-db-full-backup.sql：导出的备份文件名
wrangler d1 export notes-db --env=production --remote --output=production-db-full-backup.sql

```
**这一步有报错，这次报错的核心原因：你从生产环境导出的 SQL 文件里，自动包含了 Cloudflare D1 的系统内置表（system_logs等）的创建语句。**

 - 每个 D1 数据库（包括你的 staging 测试库）默认自带这些系统表，用户无权删除、也不能重复创建
 - 导入 SQL 时，执行到系统表的CREATE TABLE语句，就会触发table already exists报错
 - 之前的清空脚本只能删除业务表，无法操作 D1 的系统表，所以无法解决这个问题

 - 解决办法：
     - 核心逻辑：重新导出生产环境数据时，仅导出我们的业务表，完全排除系统表，从根源上解决报错
     - 步骤 1：重新导出生产环境数据（仅业务表，无系统表）
     - wrangler d1 export notes-db --env=production --remote --output=production-db-business-only.sql --only=users,categories,notes,shares,note_history


2. 第二步：从生产环境完整导出数据（只读操作，绝对安全）

```
# 进入backend目录
cd G:\hexol-blog\encrypted-notes\backend

# 【核心导出命令】完整导出线上生产库的表结构+全量数据
# --env=production：指定生产环境
# --remote：操作远程Cloudflare上的生产数据库
# --output=production-db-full-backup.sql：导出的备份文件名
wrangler d1 export notes-db --env=production --remote --output=production-db-full-backup.sql

```
3. 第三步：将生产数据完整导入本地环境（staging 测试库）

```
# 【核心导入命令】把线上完整备份导入到staging测试库
# --env=staging：指定测试环境
# --remote：操作远程Cloudflare上的staging数据库
# --file=./production-db-full-backup.sql：要导入的备份文件
wrangler d1 execute staging-notes-db --env=staging --remote --file=./production-db-full-backup.sql

```
4. 第四步：验证数据一致性

```
# 查询生产环境总笔记数
wrangler d1 execute notes-db --env=production --remote --command="SELECT COUNT(*) as 生产环境总笔记数 FROM notes;"

# 查询本地staging环境总笔记数
wrangler d1 execute staging-notes-db --env=staging --remote --command="SELECT COUNT(*) as 本地环境总笔记数 FROM notes;"

```
5. 第五步：启动本地环境验证

```
# 进入backend目录
cd G:\hexol-blog\encrypted-notes\backend

# 启动本地环境，官方原生同端口托管前后端
# --env=preview：指定本地环境
wrangler dev --env=preview --ip 127.0.0.1 --port 8787 --local --assets=../frontend/public

```
6. 第六步：部署流程（严格遵守你的逻辑）

 - 1. 本地测试通过后，部署到测试环境


```
# 部署后端到测试环境
cd backend
wrangler deploy --env=staging

# 部署前端到测试环境
cd ../frontend
wrangler deploy --env=staging

```
 - 2. 测试环境验证通过后，部署到生产环境

```
# 部署后端到生产环境
cd backend
wrangler deploy --env=production

# 部署前端到生产环境
cd ../frontend
wrangler deploy --env=production

```

# 如果出现报错

**wrangler 4.90.0的语法**

# 进入backend目录
cd G:\hexol-blog\encrypted-notes\backend

# 【正确导出命令】仅导出5个业务表，完全排除系统表，无任何报错
# 每个业务表用一个 --table 参数指定，完全匹配wrangler 4.90.0的语法
wrangler d1 export notes-db --env=production --remote --output=production-db-business-only.sql --table=users --table=categories --table=notes --table=shares --table=note_history

## 步骤 2：清空 staging 库的业务表（确保无残留数据）

### 执行清空脚本，仅删除业务表，不影响系统表，避免主键冲突
wrangler d1 execute staging-notes-db --env=staging --remote --file=./clear-staging-full.sql

## 步骤 3：导入纯业务表的备份文件

### 导入仅业务表的SQL，无系统表内容，不会触发重复建表报错
wrangler d1 execute staging-notes-db --env=staging --remote --file=./production-db-business-only.sql

**执行成功标志**
终端显示Executed script successfully，无任何红色报错。


## 最终验证：确认数据和线上 100% 一致

```

# 查询生产环境总笔记数
wrangler d1 execute notes-db --env=production --remote --command="SELECT COUNT(*) as 生产环境总笔记数 FROM notes;"

# 查询staging环境总笔记数
wrangler d1 execute staging-notes-db --env=staging --remote --command="SELECT COUNT(*) as staging环境总笔记数 FROM notes;"

# 查询生产环境总分类数
wrangler d1 execute notes-db --env=production --remote --command="SELECT COUNT(*) as 生产环境总分类数 FROM categories;"

# 查询staging环境总分类数
wrangler d1 execute staging-notes-db --env=staging --remote --command="SELECT COUNT(*) as staging环境总分类数 FROM categories;"

```

















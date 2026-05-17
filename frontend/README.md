
# 文件结构

```
encrypted-notes/
├── backend/
│   ├── wrangler.toml
│   ├── schema.sql
│   └── src/
│       └── index.js
└── frontend/
    ├── wrangler.toml
    └── public/
        ├── index.html
        ├── style.css
        └── src/
            ├── app.js
            ├── api/
            │   ├── index.js
            │   ├── auth.js
            │   ├── notes.js
            │   ├── categories.js
            │   └── shares.js
            ├── utils/
            │   └── crypto-utils.js
            └── components/
                ├── auth-forms.js
                ├── dashboard.js
                ├── note-list.js
                ├── note-editor.js
                ├── category-manager.js
                ├── settings-modal.js
                ├── knowledge-base.js
                ├── draft-manager.js
                ├── recycle-bin.js
                └── share-modal.js

```
 - 以上是整个前端的代码文件说明
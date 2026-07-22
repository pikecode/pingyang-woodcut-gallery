# 平阳木版年画数字画廊

本仓库将旧版 Word 藏品目录整理为可查询、可校对、可供前端消费的结构化数据。

## 数据结构

```text
docs/                         原始目录文档
data/schema.sql               SQLite 表结构
data/gallery.sqlite           规范化藏品数据库
data/raw/artworks.json        未修正文案的原始提取结果
data/exports/artworks.json    前端数据
data/exports/image-manifest.json  原图迁移清单
assets/originals/{slug}/      原始图片，已被 Git 忽略
scripts/import_gallery.py     可重复执行的导入脚本
```

数据库当前包含 55 条作品、65 张原图以及来源冲突和待校问题。原图直接从 Word
图片块提取，没有缩放或重新编码。

## 重新导入

```sh
python3 -m pip install -r requirements.txt
python3 scripts/import_gallery.py
```

查询示例：

```sh
sqlite3 data/gallery.sqlite \
  "SELECT catalog_no, title, period_label FROM artworks ORDER BY catalog_no;"
```

图片迁移到对象存储后，可使用 `image-manifest.json` 校验 SHA-256，并更新
`artwork_images.storage_provider`、`storage_path` 和 `public_url`。

## 前端页面

首页和分类浏览页使用 React + Vite 构建。浏览器图片由原图生成，原始文件不会被
覆盖或重新编码。

```sh
npm install
npm run assets
npm run dev
```

打开 `http://127.0.0.1:5173/`。生产构建和 Chrome UI 验证命令：

```sh
npm run build
npm run test:ui
```

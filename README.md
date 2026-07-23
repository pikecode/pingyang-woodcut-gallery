# 平阳木版年画数字画廊

当前开发重点是 `desktop/` Tauri 桌面应用。`h5/` 和 `miniapp/` 保留现状，暂不继续开发。

## 项目结构

```text
desktop/                         React + Vite + Tauri 桌面应用
desktop/public/                  桌面端自有数据与 65 张 WebP 展示图
desktop/src-tauri/               Rust 后端、原图库读取和打包配置
data/gallery.sqlite              规范化藏品数据库
data/exports/artworks.json       标准数据导出
assets/originals/{slug}/         438 MB 原始图片，Git 忽略
scripts/import_gallery.py        Word → SQLite / JSON / 原图
scripts/build_web_assets.py      原图 → desktop/public WebP
```

数据库包含 55 件作品、65 张图片、37 个别名和 26 条待校问题。原图从旧版 Word 图片块原样提取，不缩放、不重新编码。

## Desktop 开发

```sh
cd desktop
npm install
npm run dev             # 浏览器 UI：http://127.0.0.1:1420/
npm run tauri dev       # Tauri 桌面窗口
npm run build           # 前端生产构建
npm run test:ui         # Desktop 浏览器交互验证
npm run tauri build     # 生成当前平台安装包
```

本地原图不会进入安装包。桌面应用可以在开发环境自动读取根目录 `assets/originals/`，也可以通过顶栏“选择原图库”连接外部图片文件夹。TIFF 仅在内存中转换为 PNG 预览，磁盘原文件不会被修改。

重新生成桌面展示图片：

```sh
python3 -m pip install -r requirements.txt
cd desktop && npm run assets
```

完整规划和分发说明见：

- [`docs/项目结构与规划总览.md`](docs/项目结构与规划总览.md)
- [`docs/桌面端规划.md`](docs/桌面端规划.md)
- [`docs/桌面端打包与分发说明.md`](docs/桌面端打包与分发说明.md)

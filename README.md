# 平阳木版年画数字画廊

当前开发重点是 `desktop/` Tauri 桌面应用。`h5/` 和 `miniapp/` 保留现状，暂不继续开发。

## 项目结构

```text
desktop/                         React + Vite + Tauri 桌面应用
desktop/public/                  桌面端自有数据与 65 张 WebP 展示图
desktop/src-tauri/               Tauri 桌面壳和打包配置
data/gallery.sqlite              规范化藏品数据库
data/exports/artworks.json       标准数据导出
assets/originals/{slug}/         438 MB 原始图片，Git 忽略
scripts/import_gallery.py        Word → SQLite / JSON / 原图
scripts/build_web_assets.py      原图 → desktop/public WebP
```

数据库包含 55 件作品、65 张图片、37 个别名和 26 条待校问题。原图从旧版 Word 图片块原样提取，不缩放、不重新编码。

## Desktop 开发

```sh
./start-desktop.sh       # 根目录一键启动 Tauri 桌面窗口
cd desktop
npm install
npm run dev             # 浏览器 UI：http://127.0.0.1:1420/
npm run tauri dev       # Tauri 桌面窗口
npm run build           # 前端生产构建
npm run test:ui         # Desktop 浏览器交互验证
npm run tauri build     # 生成当前平台安装包
```

原始图片不进入安装包，当前桌面端只使用 `desktop/public/images/` 中的 WebP 展示图运行。`assets/originals/` 继续作为数据处理源和后续外部存储备份，不在界面中直接读取。

重新生成桌面展示图片：

```sh
python3 -m pip install -r requirements.txt
cd desktop && npm run assets
```

Voicebox 启动后，使用“文博讲解 · 温润女声”为全部作品生成“标题 + 简介”离线导览音频：

```sh
cd desktop && npm run audio
```

旁白以“您现在欣赏的是《标题》”开场，并对编号标题和括号副标题进行朗读转换。脚本根据旁白、模板、音色和生成参数哈希断点续跑，生成的 M4A 和校验清单位于 `desktop/public/audio/`。

完整更新、样本试听、故障恢复和验收流程见 [`docs/Voicebox导览音频生成与更新手册.md`](docs/Voicebox导览音频生成与更新手册.md)。

完整规划和分发说明见：

- [`docs/项目结构与规划总览.md`](docs/项目结构与规划总览.md)
- [`docs/桌面端规划.md`](docs/桌面端规划.md)
- [`docs/桌面端打包与分发说明.md`](docs/桌面端打包与分发说明.md)

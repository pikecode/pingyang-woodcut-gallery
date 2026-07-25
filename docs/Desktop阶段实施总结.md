# Desktop 阶段实施总结

> 文档状态：待评审  
> 整理日期：2026-07-23  
> 当前主线：`desktop/`  
> 暂停范围：`h5/`、`miniapp/`

## 1. 阶段背景与目标

项目开发重点已由多端并行调整为 Desktop 优先。H5 和小程序保留现状，暂不继续扩展功能；当前阶段集中解决桌面应用独立运行、离线展示、本地原图查看和安装包交付问题。

本阶段的目标是把 `desktop/` 从依赖 H5 静态资源的演示工程，整理为可以独立开发、构建和打包的 Tauri 桌面应用，同时保留原始图片不压缩、不提交 Git、后续可迁移到外部存储的资产策略。

## 2. 当前架构结论

### 2.1 调整前

```text
desktop/ React + Vite + Tauri
    └── 开发时读取 ../h5/public

h5/public/
    ├── data/artworks.json
    └── images/**/*.webp

assets/originals/              原始图片，不进入前端包
```

该结构会让 Desktop 的运行和打包依赖已经暂停开发的 H5，资产所有权和构建边界不清晰。

### 2.2 调整后

```text
data/exports/artworks.json     标准数据源
assets/originals/{slug}/       438 MB 原图，Git 忽略、外部保存
        │
        ├── scripts/build_web_assets.py
        │       └── desktop/public/（20 MB、65 张 WebP + JSON）
        │
        └── Tauri read_local_image（按需读取原图）

desktop/
├── public/                    Desktop 自有运行资产
├── src/                       React 界面与交互
├── src-tauri/                 Rust 文件读取与桌面打包
└── scripts/verify_ui.mjs      Desktop UI 自动验证
```

最终形成两层图片策略：

- 安装包内置 65 张 WebP 展示图，保证离线浏览和较小的分发体积。
- 65 张原始图片继续以原文件形式保存在 `assets/originals/`，约 438 MB，不提交 Git，也不默认装入安装包。
- 用户可在桌面应用中选择外部 `assets/originals` 文件夹，按需加载高清原图。

## 3. 已完成的实现

### 3.1 Desktop 资产独立

- 将 `artworks.json`、favicon 和 65 张 WebP 展示图从 `h5/public/` 迁移到 `desktop/public/`。
- 删除 Vite 对 `../h5/public` 的文件系统依赖，Desktop 可独立开发和打包。
- 修改 `scripts/build_web_assets.py`，统一从标准数据和原图生成 `desktop/public/` 资产。
- 生成过程中保留 `originalPath`，前端展示路径改写为 `/images/{slug}/{role}.webp`。
- 将图片处理依赖清单从 `h5/requirements.txt` 移到根目录 `requirements.txt`，明确该工具属于项目级数据流水线。

### 3.2 开屏动画

- 按 `docs/1192927823.mp4` 的叙事语言重新设计“平阳入画 · 年画长卷”GSAP 开屏，但不嵌入或复用视频画面。
- 以项目真实藏品组成戏曲、故事、门神三幕横向长卷，并加入不规则印版揭幕、套色扫描、图录收束和品牌落版。
- 主时间轴控制为 10.45 秒，使用 `sine.inOut`、交叠入退场、纸形缓慢漂移和藏品视差改善连续性，避免画面突然切换。
- 旧“门扉长廊”组件与样式已完整备份到 `desktop/src/opening/`，可随时切回。
- 默认每个浏览会话只播放一次；页面 reload 和 `?intro=1` 可重播，应用内部切换不重播。
- “跳过”会终止并释放 GSAP timeline，避免动画在后台继续执行或残留页面锁定状态。
- 当系统启用 `prefers-reduced-motion` 时不挂载动画，界面可直接使用。

### 3.3 外部原图库连接

- 接入 Tauri 原生目录选择对话框，顶栏可选择并记住原图库目录。
- 开发环境可自动发现仓库根目录的 `assets/originals/`。
- 支持通过 `PINGYANG_ORIGINALS_DIR` 环境变量指定原图库。
- 同时预留安装包资源目录、可执行文件相邻目录等部署候选位置。
- 原图选择状态保存在本地，不上传、不写入藏品数据。

### 3.4 原图读取安全边界

新增 Rust 命令 `read_local_image`，由 Tauri IPC 返回原始字节，前端不直接获得任意文件系统访问能力。当前约束包括：

- 清单路径必须以 `assets/originals/` 开头。
- 拒绝 `..` 路径穿越、绝对路径和异常路径组件。
- 仅允许 `jpg`、`jpeg`、`png`、`tif`、`tiff`、`mpo` 图片扩展名。
- 对根目录和目标文件进行 canonicalize，并再次确认目标位于所选根目录内。
- TIFF 在内存中转换为 PNG 预览，不修改或覆盖磁盘原文件。
- 找不到文件或目录时返回可操作的中文错误，由前端引导用户重新选择原图库。

### 3.5 桌面图像查看器

作品详情已从静态图片区域升级为桌面图像查看器：

- 支持一件作品的多张图片切换。
- 支持 1–6 倍缩放，提供工具栏按钮、鼠标滚轮和键盘操作。
- 放大后可鼠标拖拽平移，双击可放大或复位。
- 支持图片区域全屏和应用窗口全屏。
- 支持加载本地高清原图，并显示加载中、成功和错误状态。
- 保留 WebP 作为失败回退，未连接原图库时仍可正常浏览全部藏品。
- 键盘支持方向键切换、`+`/`-` 缩放、`0` 重置和 `F` 全屏。

### 3.6 构建、测试与分发

- 增加 `npm run assets`，从标准数据重新生成 Desktop 静态资产。
- 增加 `npm run test:ui`，验证开屏三阶段、10–11.3 秒自然播放、多尺寸适配、500ms 内跳过、会话与 reduced-motion、55 件作品渲染、分类筛选、搜索、详情、多图、键盘缩放和导览播放。
- 增加 Rust 单元测试，覆盖合法清单路径、路径穿越/非图片拒绝、TIFF 内存转换且源文件保留。
- 使用 Voicebox“文博讲解 · 温润女声”为 55 件作品生成“标题 + 简介”离线导览音频；旁白以“您现在欣赏的是《标题》”开场，并规范朗读编号标题和括号副标题。
- 55 条音频总时长 1,421.2 秒（23 分 41.2 秒），约 65 kbps M4A 合计约 11.4 MB；详情页支持播放、暂停、进度拖动和时长显示。
- GitHub Actions 的触发范围改为 Desktop、数据和 Desktop 资产生成脚本。
- CI 配置 macOS DMG 和 Windows MSI/NSIS 构建产物上传，并支持手动创建草稿 Release。
- macOS 当前使用 ad-hoc 签名，可验证包内签名结构，但不等同于 Apple Developer ID 签名和公证。

## 4. 主要文件职责

| 文件或目录 | 本阶段职责 |
|---|---|
| `desktop/src/App.jsx` | 接入当前开屏、分类与搜索、详情查看器、原图库选择、原图 IPC、全屏和键盘交互 |
| `desktop/src/opening/` | 当前长卷开屏、旧门扉备份、独立样式和共享会话控制 |
| `desktop/src/styles.css` | Desktop 宽屏布局、详情查看器、缩放拖拽状态和原图状态 |
| `desktop/src-tauri/src/lib.rs` | 原图库候选目录、安全路径校验、原图读取、TIFF 预览转换及单元测试 |
| `desktop/src-tauri/Cargo.toml` | Tauri 对话框和图片解码依赖 |
| `desktop/src-tauri/capabilities/default.json` | 原生对话框所需权限 |
| `desktop/src-tauri/tauri.conf.json` | 窗口、应用标识、打包图标和 macOS ad-hoc 签名配置 |
| `desktop/public/` | Desktop 自有 JSON、favicon、65 张 WebP 展示图和 55 条 M4A 导览音频 |
| `desktop/scripts/verify_ui.mjs` | Desktop 浏览器交互回归、多尺寸开屏验收和关键帧截图 |
| `scripts/build_web_assets.py` | 从标准数据与原图生成 Desktop 运行资产 |
| `scripts/generate_gallery_audio.py` | 组装标题与简介旁白，调用本地 Voicebox 逐件生成、压缩并校验离线导览音频，按旁白、模板、音色和参数哈希断点续跑 |
| `.github/workflows/build-desktop.yml` | macOS/Windows 自动打包、Artifacts 和可选草稿 Release |
| `README.md` | Desktop 优先的项目入口、开发命令和原图库说明 |
| `docs/桌面端规划.md` | 当前技术路线、完成状态和后续功能规划 |
| `docs/桌面端打包与分发说明.md` | 安装包、签名、公证与平台安全提示 |

Tauri 自动生成的 `desktop/src-tauri/gen/schemas/*.json` 和依赖锁文件也随插件、权限与 Rust 依赖更新，属于构建一致性文件，不承载业务逻辑。

## 5. 验证结果

截至 2026-07-25，已执行并通过：

| 验证项 | 结果 |
|---|---|
| `cd desktop && npm run assets` | 通过，生成 65 张 WebP 和 Desktop 数据文件 |
| `cd desktop && npm run audio` | 通过，55 条“标题 + 简介”音频生成完成；再次执行时 55 条均通过新版哈希校验并正确跳过 |
| 音频文件与 manifest 校验 | 通过，55 个 M4A 的文件数、格式和 SHA-256 全部一致 |
| `cd desktop && npm run build` | 通过，前端生产构建成功 |
| `cd desktop && npm run test:ui` | 通过，Desktop 核心浏览交互验证成功 |
| `cargo test --manifest-path desktop/src-tauri/Cargo.toml` | 通过，3 个 Rust 测试全部成功 |
| `cd desktop && npm run tauri build` | 通过，生成本机 macOS DMG |
| 安装包音频资源索引 | 通过，签名后二进制包含 55 个 `audio/py-*.m4a` 路径 |
| `codesign --verify --deep --strict` | 通过，ad-hoc 签名结构有效 |
| `git diff --check` | 通过，无空白符错误 |

UI 验收截图：

- `design/screenshots/desktop-opening-current.png`
- `design/screenshots/desktop-detail-current.png`

本机构建产物：

```text
desktop/src-tauri/target/release/bundle/dmg/PingyangGallery_0.1.0_aarch64.dmg
体积：33 MB
SHA-256：2bd550d73d8b19d3b9a2fd5aa5e2c0651b4d3ae613bf727ff8d065306a62ac15
```

## 6. 开发与验收命令

安装依赖并启动浏览器界面：

```sh
cd desktop
npm install
npm run dev
```

启动原生 Tauri 窗口：

```sh
cd desktop
npm run tauri dev
```

重新生成展示资产：

```sh
python3 -m pip install -r requirements.txt
cd desktop
npm run assets
```

启动 Voicebox 后生成或续跑导览音频：

```sh
cd desktop
npm run audio
```

执行完整的当前阶段验证：

```sh
cd desktop
npm run build
npm run test:ui
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

强制查看开屏动画：

```text
http://127.0.0.1:1420/?intro=1
```

## 7. 已知边界与风险

- Windows MSI/NSIS 已配置 CI 构建，但尚未在 Windows 真机完成安装、启动、原图库选择和高清图加载验收。
- macOS DMG 目前是 ad-hoc 签名，公开分发仍会受到 Gatekeeper 提示；正式分发需要 Developer ID 签名和 Apple 公证。
- 原图不进入 Git 和默认安装包。更换电脑或交付馆方时，必须同时提供完整的 `assets/originals/` 外部目录。
- 浏览器运行模式不能调用 Tauri 原图读取命令，只能验证 WebP 界面与降级状态；原图能力需在 `npm run tauri dev` 或安装包中验证。
- 当前数据仍包含 26 条待校问题，界面和存储结构完成不代表藏品文本已经完成最终学术校审。
- 原生菜单、打印/PDF 和展览自动轮播尚未实现；导览音频已接入，但仍需人工抽听生僻字与史料专名的发音。
- 当前 Voicebox 的 Whisper Base 转写接口在本机返回 MLX/MPS `Stream(gpu, 2)` 线程错误，无法作为本轮自动回译证据；文件完整性、媒体解码和浏览器实播已验证。

## 8. 下一阶段优先级建议

### P0：交付可靠性

1. 在 GitHub Actions 和 Windows 真机验证 MSI/NSIS 的安装、卸载、首次启动、全屏和外部原图库读取。
2. 确认馆方原图库的实际交付介质与目录约定，补充缺失目录、文件名不一致和移动硬盘断开时的错误恢复。
3. 确定 macOS 分发范围：内部使用可继续 ad-hoc；公开分发则配置 Developer ID 签名、公证和 CI secrets。

### P1：桌面工作流

1. 增加原生菜单，将打开原图库、全屏、缩放、退出等高频命令纳入系统菜单。
2. 增加打印样式和 PDF 图录导出，优先满足馆藏资料输出场景。
3. 完善快捷键帮助、焦点管理和无鼠标操作，进行一次完整的键盘可访问性验收。

### P2：展陈能力

1. 实现展览模式：自动轮播、空闲恢复、隐藏管理控件和防止系统休眠。
2. 对 Voicebox 导览音频进行人工抽听与专业词校音，并根据展陈环境补充音量控制。
3. 在实际展陈屏幕上验证 1080p/4K 缩放质量、长时间运行稳定性和触控交互。

## 9. 评审重点

建议本次 Review 重点确认以下决策：

1. Desktop 独立持有 WebP 运行资产、原图保持外置的两层资产策略是否作为正式基线。
2. 原图库是否固定要求用户选择 `assets/originals` 本身，还是允许选择其上一级交付目录。
3. 第一批交付平台是仅 macOS，还是 macOS 与 Windows 同步验收。
4. 下一阶段优先做打印/PDF，还是优先做展览自动轮播。
5. 正式对外分发前是否投入 Apple Developer Program 和 Windows 代码签名证书。

本阶段结论：Desktop 已具备独立离线浏览、可选本地高清原图、桌面看图交互和 macOS 安装包构建能力。下一阶段不宜继续扩展 H5 或小程序，应先完成跨平台安装验收与正式分发链路，再进入打印和展览模式开发。

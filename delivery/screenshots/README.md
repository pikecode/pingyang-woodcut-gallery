# 平阳木版年画桌面端视觉截图交付说明

本目录用于交付客户开发参考的关键页面视觉截图，截图尺寸统一为 `1440 × 900`。

## 截图清单

- `01-opening-video.png`：开屏视频动画首段
- `02-opening-gsap-panorama.png`：开屏 GSAP 画卷动效段
- `03-category-home.png`：分类首页
- `04-credits-modal.png`：版权信息弹窗
- `05-gallery-list.png`：作品列表页
- `06-artwork-detail.png`：作品详情页
- `07-maintenance-gate.png`：数据维护入口页
- `08-maintenance-workbench.png`：数据维护工作台

## 生成方式

截图脚本：

```bash
node scripts/capture_design_screenshots.mjs
```

默认访问：

```text
http://127.0.0.1:1420/
```

如果本地服务地址不同，可以指定：

```bash
PINGYANG_CAPTURE_URL=http://127.0.0.1:1420/ node scripts/capture_design_screenshots.mjs
```

默认输出目录：

```text
delivery/screenshots
```

如需修改输出目录：

```bash
PINGYANG_CAPTURE_DIR=delivery/screenshots node scripts/capture_design_screenshots.mjs
```


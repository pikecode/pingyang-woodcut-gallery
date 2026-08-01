# 开屏视频与 GSAP 衔接优化总结

日期：2026-08-01

## 背景

当前 Desktop 端开屏动画采用“两段式”流程：

1. 先播放 AI 生成的视频动画。
2. 视频结束后进入 GSAP 实现的版画/长卷动画。
3. GSAP 动画结束后进入分类页。

本轮使用的新视频为：

```text
/Users/ompeak/Downloads/9999.mp4
```

视频已替换到项目内固定资源位：

```text
desktop/public/opening/opening-guardian-ai.mp4
desktop/public/opening/opening-guardian-ai-end.jpg
```

视频规格：

```text
时长：约 9 秒
尺寸：1920 × 1080
帧率：30fps
```

## 发现的问题

新视频本身适合当前开屏流程，最后一帧是深色舞台与中央暖光，没有之前“空白宣纸”带来的明显不协调。

但视频结束进入 GSAP 时，仍存在两个问题：

1. 视频末尾是暗场、暖光、空间感较强。
2. GSAP 第一幕是浅色宣纸、平面版画线稿，明度和视觉语言变化较大。

因此用户观感上容易觉得：

```text
视频结束 → 突然切到另一段动画
```

而不是：

```text
视频自然进入后续版画动画
```

## 第一版优化尝试

最初为了强化衔接，新增了较丰富的桥接层：

- 视频末帧保留
- 暖光扩散
- 宣纸纹理浮现
- 墨线若隐若现
- 颗粒层淡出

对应改动包括：

```text
desktop/src/opening/OpeningIntroVideo.jsx
desktop/src/opening/opening-intro-video.css
desktop/src/opening/OpeningIntroPanorama.jsx
desktop/src/opening/opening-intro-panorama.css
```

这版能降低“暗场直接切浅纸”的问题，但实际 review 后发现，中间层信息量偏多，反而形成了新的问题：

```text
视频 → 单独的转场动画 → GSAP
```

也就是说，它解决了明度跳变，但增加了“中间动画”的存在感。

## 当前采用的优化方案

根据 review 反馈，当前方案改为更克制的衔接方式。

保留：

- 视频最后一帧
- 轻微暖光呼吸
- 很淡的颗粒感
- 暗场自然淡出

移除：

- 明显宣纸浮现层
- 墨线预显层
- 过强的纸纹扩散效果

目标是让过渡更像：

```text
视频暗场结束 → 轻微淡开 → GSAP 自然出现
```

而不是让用户感知到中间还有一段独立动画。

## 具体实现

### 1. 视频结束后进入带承接状态的 GSAP 动画

文件：

```text
desktop/src/opening/OpeningIntroVideo.jsx
```

视频播放结束后，仍然进入 `OpeningIntroPanorama`，但传入 `handoffFromVideo`：

```jsx
<OpeningIntroPanorama startBgm={async () => {}} onComplete={onComplete} handoffFromVideo />
```

这样 GSAP 组件可以识别自己是从视频段进入，而不是独立播放。

### 2. 简化桥接层结构

文件：

```text
desktop/src/opening/OpeningIntroVideo.jsx
```

当前桥接层只保留：

```jsx
<div className="opening-video-bridge" aria-hidden="true">
  <img className="opening-video-bridge-frame" src={END_FRAME_SOURCE} alt="" />
  <span className="opening-video-bridge-warmth" />
  <span className="opening-video-bridge-grain" />
</div>
```

不再额外插入纸纹层和墨线层。

### 3. 收敛桥接动画时长

文件：

```text
desktop/src/opening/opening-intro-video.css
```

桥接动画时长从之前的 `1.72s` 缩短到：

```css
1.34s
```

动画只做轻量处理：

- 末帧轻微放大
- 明度轻微提高
- 暖光轻微扩散后淡出
- 颗粒层淡出
- 整体 opacity 淡出

### 4. 降低 GSAP 底层承接遮罩存在感

文件：

```text
desktop/src/opening/opening-intro-panorama.css
```

`panorama-intro.is-video-handoff` 状态下，底层仍然有暗场遮罩，但遮罩只承担“从视频暗场过渡到 GSAP 宣纸背景”的作用。

当前控制原则：

- 不制造明显新画面。
- 不提前展示复杂线稿。
- 不插入额外叙事。
- 只负责降低明度跳变。

## 当前动画流程

当前完整流程为：

```text
AI 视频 9s
→ 视频末帧轻量淡出桥接 1.34s
→ GSAP 版画动画约 10s
→ 分类页
```

## 验证结果

已执行：

```bash
cd desktop
npm run build
npm run test:ui
```

结果：

```text
构建通过
UI 自动验证通过
```

额外做了 9 秒附近的转场抽帧检查：

```text
9.00s：进入视频末帧桥接
9.40s：仍以暗场末帧为主，轻微淡开
9.85s：桥接层接近结束，GSAP 底层显现
10.40s：进入 GSAP 第一幕
```

## 当前修改文件清单

资源文件：

```text
desktop/public/opening/opening-guardian-ai.mp4
desktop/public/opening/opening-guardian-ai-end.jpg
```

代码文件：

```text
desktop/src/opening/OpeningIntroVideo.jsx
desktop/src/opening/OpeningIntroPanorama.jsx
desktop/src/opening/opening-intro-video.css
desktop/src/opening/opening-intro-panorama.css
```

## 后续建议

如果继续优化，建议优先方向不是继续加转场，而是统一 GSAP 后段的视觉质感：

1. 降低 GSAP 后段黄、蓝、红色块的现代平面感。
2. 增加旧纸、套印错位、木版墨痕质感。
3. 让 GSAP 更像“木版印刷过程”，而不是“展陈导视动画”。
4. 分类页入场可以与开屏最后一帧做更轻的视觉承接。

当前这轮优化的核心原则是：

```text
少做中间动画，减少割裂感。
让视频结束后自然让位给 GSAP。
```

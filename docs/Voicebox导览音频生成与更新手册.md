# Voicebox 导览音频生成与更新手册

> 文档版本：v1.0
> 整理日期：2026-07-25
> 适用范围：`desktop/` 离线藏品导览音频
> 当前模板：`title-description-v1`

## 1. 文档目的

本文档用于在藏品标题、简介或作品数量变化后，按照已经验证过的规则生成或增量更新 Desktop 导览音频。执行者应以本文档和 `scripts/generate_gallery_audio.py` 为准，不根据界面文案临时拼接音频文本。

目标是保证：

- 同一作品始终使用稳定的文件名和音色。
- 标题、简介、模板、音色或生成参数变化时自动重新生成。
- 未变化作品通过哈希校验跳过，避免重复推理。
- Voicebox 中断时保留已经完成的文件，重新运行即可续跑。
- 新增作品能够同时进入标准数据、Desktop 展示资产和音频目录。

## 2. 当前生产基线

### 2.1 数据与文件

| 项目 | 当前约定 |
|---|---|
| 音频标准数据源 | `data/exports/artworks.json` |
| 使用字段 | `slug`、`title`、`description` |
| 生成脚本 | `scripts/generate_gallery_audio.py` |
| 输出目录 | `desktop/public/audio/` |
| 文件命名 | `{slug}.m4a`，例如 `py-001.m4a` |
| 本地校验清单 | `desktop/public/audio/manifest.json` |
| 前端播放地址 | `/audio/{slug}.m4a` |

`desktop/public/data/artworks.json` 是通过资产脚本生成的运行副本，不是音频脚本的数据源。不要只修改该文件，否则下次生成资产时会被覆盖，音频脚本也不会读取到变化。

### 2.2 Voicebox 配置

| 参数 | 当前值 |
|---|---|
| 服务地址 | `http://127.0.0.1:17493` |
| Profile 名称 | `文博讲解 · 温润女声` |
| Profile ID | `706048fa-9f1d-40cc-8a8a-f0c0c589939f` |
| Engine | `qwen_custom_voice` |
| Voice | `Serena` |
| Model | `1.7B` |
| Language | `zh` |
| Personality | `false` |
| 最大分段字符数 | `100` |
| Crossfade | `0ms` |
| Normalize | `true` |

Profile ID 来自当前 Voicebox 本地数据。如果 Voicebox 被重装或 Profile 被重新创建，先从 `/profiles` 查询新 ID，再通过 `--profile-id` 传入；不要默认复用已经失效的 ID。

### 2.3 输出规格

- Voicebox 先生成 WAV。
- 脚本使用 macOS `afconvert` 转为 AAC M4A。
- 采样率为 24 kHz，单声道，目标码率 64 kbps，实测约 65 kbps。
- WAV 是临时文件，命名为 `.{slug}.wav`，成功或失败后都会清理。
- M4A 先写入临时文件，再原子替换正式文件，失败任务不会破坏旧音频。

2026-07-25 的生产结果：55 条音频，总时长 1,421.2 秒（23 分 41.2 秒），总字节数 11,940,378，约 11.4 MB。

## 3. 旁白生成规则

### 3.1 固定模板

旁白不是简单连接标题和简介，而是使用固定模板：

```text
您现在欣赏的是《{朗读标题}》。{description}
```

示例：

```text
您现在欣赏的是《牛郎织女》。画面上方点缀星辰，下方云间喜鹊搭成鹊桥……
```

不要在数据的 `description` 中重复加入“您现在欣赏的是”，该导语由脚本统一生成。

### 3.2 标题朗读转换

展示标题保持学术原文，只有送入 Voicebox 的朗读标题会转换：

| 展示标题 | 朗读标题 |
|---|---|
| `牛郎织女` | `牛郎织女` |
| `玉虎坠（一）` | `玉虎坠，第一幅` |
| `玉虎坠（二）` | `玉虎坠，第二幅` |
| `厨门神（东厨司命）` | `厨门神，东厨司命` |
| `官服门神（加官进禄）` | `官服门神，加官进禄` |

规则定义在 `spoken_title()`：

1. 全角括号中只有中文数字时，转换为“第 N 幅”。
2. 其他全角括号内容转换为逗号停顿。
3. 普通标题保持原样。
4. 不修改 `data/exports/artworks.json` 中的正式标题。

生僻字、专名或多音字必须人工抽听。如果 Voicebox 发音错误，应在脚本中增加针对该作品的朗读覆盖，不应为了纠正发音而篡改正式标题。

### 3.3 增量判断

每件作品在本地 manifest 中记录：

- `spokenTitle`
- `templateVersion`
- `descriptionSha256`
- `narrationSha256`
- `generationSettingsSha256`
- `profileId`
- `generationId`
- 输出文件 SHA-256、时长和字节数

只有以下条件同时满足才会跳过：

1. `{slug}.m4a` 已存在。
2. 完整旁白哈希一致。
3. 模板、模型和生成参数哈希一致。
4. Profile ID 一致。

因此，修改标题、简介、旁白模板、音色或模型参数都会自动触发重新生成；不需要删除旧文件，也不需要默认使用 `--force`。

## 4. 文案更新入口

### 4.1 仅修改已有作品标题或简介

当前音频标准源是 `data/exports/artworks.json`。修改已有作品时：

1. 根据稳定 `slug` 找到作品。
2. 更新 `title` 或 `description`。
3. 不修改 `slug`，否则前端会把它视为新作品，旧音频也会失去映射。
4. 同步数据库或上游编辑源，避免未来重新导入 Word 时覆盖人工修订。
5. 运行 Desktop 资产生成，使界面文案与标准数据一致。

```sh
cd desktop
npm run assets
```

如果本轮只更新结构化文案，不要盲目执行 `scripts/import_gallery.py`。该脚本会从完整 Word 文档重新生成数据库、原始 JSON、标准导出和图片；只有新的完整 Word 文档是本轮权威来源时才应执行。

### 4.2 从新的完整 Word 文档重新导入

仅当新文档保持当前 Word 97 结构、包含完整藏品记录和图片，并被确认是新的权威来源时执行：

```sh
python3 -m pip install -r requirements.txt
python3 scripts/import_gallery.py --source /absolute/path/to/new-catalog.doc
cd desktop
npm run assets
```

执行前必须：

- 保存当前 `data/exports/artworks.json`、`data/gallery.sqlite` 和 `assets/originals/`。
- 记录旧文件 Git 状态。
- 导入后检查作品数、slug、标题、简介、图片数和数据问题。
- 使用 `git diff -- data/exports/artworks.json` 人工审核变化。

不要用只包含增量内容或普通 `.docx` 排版的文档直接运行当前导入脚本；当前解析器针对既有 Word 97 OLE 文档结构。

### 4.3 新增作品

新增作品进入 `data/exports/artworks.json` 后，至少要保证：

- `slug` 唯一且稳定。
- `title` 非空。
- `description` 非空。
- `images`、题材、年代等字段满足 Desktop 数据结构。
- 对应图片资产已经生成到 `desktop/public/images/{slug}/`。

音频脚本只依赖 `slug/title/description`，但 Desktop 页面依赖完整作品结构。不要为了生成音频而加入只有三个字段的不完整作品。

新增作品不需要修改播放器代码。脚本会生成 `desktop/public/audio/{slug}.m4a`，详情页会按 slug 自动读取。

## 5. 标准执行流程

### 5.1 运行前检查

1. 确认文案已经进入标准数据：

```sh
jq -r '.artworks[] | [.slug, .title, .description] | @tsv' data/exports/artworks.json
```

2. 启动 Voicebox，检查健康状态和 Profile：

```sh
curl http://127.0.0.1:17493/health
curl http://127.0.0.1:17493/profiles | jq '.[] | select(.name == "文博讲解 · 温润女声")'
```

健康接口必须返回 `"status": "healthy"`。`model_loaded: false` 在首次生成前可以出现，第一条任务会加载模型。

3. 检查转换工具：

```sh
command -v afconvert
```

当前转换逻辑依赖 macOS。其他平台执行前需要为脚本增加等价的 AAC 转换器，不能假设 `afconvert` 存在。

4. 保留本地 manifest：

`desktop/public/audio/manifest.json` 当前被 Git 忽略，但它是增量跳过依据。不要随意删除。更换电脑时应与音频一起迁移；丢失后不会破坏音频，但脚本会认为全部作品需要重新生成。

### 5.2 先生成样本

每次批量更新前，先选 3–5 件代表作品：

- 普通标题。
- 编号标题。
- 括号副标题。
- 生僻字或专名。
- 本次最长的新简介。

示例：

```sh
python3 scripts/generate_gallery_audio.py \
  --only py-001 \
  --only py-002 \
  --only py-091 \
  --only py-098
```

只有被哈希判定为变化的样本才会生成。如果需要在文案不变时重新测试音色或发音，可加 `--force`：

```sh
python3 scripts/generate_gallery_audio.py --only py-098 --force
```

样本必须人工确认：

- 开头确实朗读作品标题。
- 标题与简介之间停顿自然。
- 编号和括号内容没有连读。
- 生僻字、人名、地名和戏曲名发音正确。
- 没有截断、重复、爆音或异常静音。

### 5.3 执行增量全量生成

样本通过后运行：

```sh
cd desktop
npm run audio
```

脚本按 `artworks.json` 顺序串行处理。首次模型加载可能需要约 5–6 分钟；完整 55 件在本机实测约 60–90 分钟。不要同时启动第二个生成命令。

任务中断后直接重新执行同一命令，已经完成且哈希一致的作品会显示 `[跳过]`。

## 6. 验收流程

### 6.1 数量与清单

```sh
jq '{
  items: (.items | length),
  upgraded: ([.items[] | select(.templateVersion == "title-description-v1")] | length),
  totalDuration: ([.items[].duration] | add),
  totalBytes: ([.items[].bytes] | add)
}' desktop/public/audio/manifest.json

find desktop/public/audio -maxdepth 1 -name 'py-*.m4a' | wc -l
```

作品数、manifest 条目数和 M4A 数量必须一致。

### 6.2 媒体解码

macOS 验证全部 M4A：

```sh
failed=0
for file in desktop/public/audio/py-*.m4a; do
  afinfo "$file" >/dev/null 2>&1 || { echo "decode failed: $file"; failed=1; }
done
exit "$failed"
```

### 6.3 文件哈希

```sh
failed=0
while IFS=$'\t' read -r slug expected; do
  actual=$(shasum -a 256 "desktop/public/audio/${slug}.m4a" | awk '{print $1}')
  if [[ "$actual" != "$expected" ]]; then
    echo "hash mismatch: $slug"
    failed=1
  fi
done < <(jq -r '.items | to_entries[] | [.key, .value.sha256] | @tsv' desktop/public/audio/manifest.json)
exit "$failed"
```

### 6.4 断点校验

再次运行：

```sh
cd desktop
npm run audio
```

预期结果是所有未变化作品显示 `[跳过]`，最后输出“新生成 0 件”。

### 6.5 Desktop 验证

```sh
cd desktop
npm run build
npm run dev -- --host 127.0.0.1 --port 1420
```

另开终端执行：

```sh
cd desktop
npm run test:ui
```

还需要人工打开详情页，试听本轮所有新增或更新作品。自动测试只能证明文件可加载并且播放时间推进，不能证明专名发音正确。

## 7. 常见故障与恢复

### 7.1 `Generation orphaned by worker`

这表示 Voicebox Worker 在生成过程中重启或旧 Server 占用了端口。不要并行重试多个任务。

处理步骤：

```sh
osascript -e 'quit app "Voicebox"'
open -a Voicebox
curl --retry 12 --retry-delay 2 --retry-connrefused http://127.0.0.1:17493/health
```

确认服务稳定后重新运行原命令。脚本使用原子替换，失败作品的旧 M4A 不会被覆盖。

### 7.2 无法连接 Voicebox

- 确认 Voicebox 应用已启动。
- 检查 17493 端口：`lsof -nP -iTCP:17493 -sTCP:LISTEN`。
- 检查是否存在父进程已退出的遗留 Server。
- 正常退出 Voicebox 后再重新打开，避免直接启动多个 Server。

### 7.3 Profile 不存在

查询：

```sh
curl http://127.0.0.1:17493/profiles | jq
```

找到正确 Profile ID 后：

```sh
python3 scripts/generate_gallery_audio.py --profile-id NEW_PROFILE_ID
```

Profile ID 变化会触发全部作品重新生成，这是预期行为。

### 7.4 `afconvert` 不存在或转换失败

当前脚本只支持带 `afconvert` 的 macOS 生成机。确认命令存在并有足够磁盘空间。不要把临时 WAV 手工改名为 M4A。

### 7.5 发音错误

1. 记录 slug、错误词、期望读音和出现位置。
2. 不修改用于展示的正式标题来迁就 TTS。
3. 在 `spoken_title()` 或后续的作品级朗读覆盖表中修正送入 Voicebox 的文本。
4. 使用 `--only {slug} --force` 重生成。
5. 人工复听后再覆盖正式提交。

## 8. 提交规则

一次完整音频更新通常需要提交：

- 上游标准文案或数据变更。
- `scripts/generate_gallery_audio.py` 的规则变化。
- `desktop/public/audio/py-*.m4a` 中实际变化的音频。
- README、实施总结和本手册中的基线变化。
- 与新流程对应的 UI 回归测试修改。

默认不提交：

- `desktop/public/audio/manifest.json`，当前由 `.gitignore` 排除。
- 临时 WAV、`.tmp` 文件。
- Voicebox 本地数据库、模型和应用缓存。
- 与本次音频无关的工作区改动。

提交前执行：

```sh
git status --short
git diff --check
```

只暂存本轮明确生成和修改的文件。若生成期间出现其他提交或并行修改，应先检查最新 Git 历史，不覆盖、不回退他人的工作。

## 9. 2026-07-25 实施记录

本轮从“仅简介”升级为“标题 + 简介”：

1. 增加 `title-description-v1` 模板。
2. 增加编号标题和括号副标题的朗读转换。
3. 增加完整旁白与生成参数哈希。
4. 先生成 `py-001`、`py-002`、`py-091`、`py-098` 四个样本。
5. 首次任务因旧 Voicebox Server 返回 `Generation orphaned by worker`；正常退出并重启 Voicebox 后恢复。
6. 断点生成其余 51 件，最终完成 55 件。
7. 55 个 M4A 全部通过 `afinfo` 解码和 SHA-256 校验。
8. 再次执行时 55 件全部跳过。
9. Desktop 生产构建、UI 回归和浏览器实际播放时间推进验证通过。

后续更新应重复第 4–8 节流程，不应依赖记忆临时操作。

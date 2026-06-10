# 头脑风暴：Metis TUI 界面重设计

**日期**：2026-06-08
**模式**：产品模式
**状态**：已确认，方案 A 已实现
**用户决策**：方案 A — Boot Splash + 单步引导

## 背景

用户反馈当前 Metis TUI「根本用不了」。运行 `metis tui` 后第一次打开完全不知道下一步该干什么，会直接关掉、暂时不用 Metis。

用户期望：
- 进来就能看到产品名字
- 千禧年代风格的占位符 Logo（ASCII / 低多边形 / Y2K 框）
- 明确引导用户进行下一步操作

## 关键发现

### 深度提问摘要

| 问题 | 回答 |
|------|------|
| Q1 谁在痛苦 | 用户本人，首次打开 TUI |
| Q2 现状 | 直接关掉，暂时不用 Metis（非 CLI 绕行） |
| Q3 最窄楔子 | 品牌感 + Logo + 引导下一步；非功能堆叠 |
| Q4 独特气质 | 千禧 workbench 美学 + 证据审查台（推断） |
| Q5 行为证据 | 零 onboarding 容忍，界面无第一步信号 |
| Q6 未来风险 | 若仍靠打字命令，Logo/Welcome 只是装饰 |

### 代码诊断（证据）

当前 TUI（`lib/tui/`）核心矛盾：

1. **伪 TUI / 真 Shell**：交互是打字命令（`plan` / `preview-diff` / `APPLY METIS`），无方向键选行、Enter 确认、数字快捷键
2. **装饰性布局**：左栏 workflow rail、证据表格、右侧 detail 只读；`select-evidence` 命令存在但 UI 无法触发
3. **Welcome 与入口错位**：Welcome 写 "Run plan"，底部却是 `metis ›` 命令行
4. **窄终端**：宽度 <120 列时 detail panel 消失
5. **可发现性为零**：底部 hint 格式为 `plan:view candidates`，对新手无意义

### 前提挑战

- **正确的问题？** 是。根因是进门零信号，不是缺 panel。
- **不做会怎样？** TUI 名存实亡，PRD「terminal-first」失效。
- **可复用资源**：`state.js` 状态机、`theme.js` truecolor、`buildWelcomeHints()` 文案；无需新依赖。

## 方案

### 方案 A：Boot Splash + 单步引导（✅ 已选）

- **核心思路**：进门先「开机」，再进工作台；第一屏只做品牌 + 引导
- **做什么**：
  - 新增 splash/onboarding 视图：ASCII Y2K 占位 Logo + `METIS` + tagline
  - 显示 `Found N evidence · audit ok/failed`
  - 可操作菜单：`[1] Review plan` `[2] Rescan` `[3] Open diff preview`
  - ↑↓ / 数字键 / Enter 执行；底部 `:plan` 保留 power user 模式
- **不做什么**：不重写全部 panel；不引入 blessed/ink
- **优点**：1–2 天可落地，直接解决首次流失
- **缺点**：老用户每次多一屏（需「不再显示」或记住 dismiss）
- **适合**：最快让 TUI 可用

### 方案 B：Persistent Header + 可操作 Action Rail

- 顶栏常驻 Logo；左栏变真菜单；主区 ↑↓ 选行；`:` 进命令模式
- 优点：长期主界面体验；缺点：3–5 天，改动面大

### 方案 C：Retro Wizard 四步流

- scan→plan→diff→apply 逐步向导；品牌感强但偏离 workbench 心智

### 推荐与理由

**方案 A**，两阶段：先 Boot Splash 解决流失，验证后再把菜单逻辑下沉到 rail（方案 B 子集）。

理由：用户痛点是「第一次就关掉」——全量改造太慢；用户明确要 Logo + 引导，方案 A 完全对齐。

## Logo 方向

```
        ╱╲    ╱╲
       ╱  ╲  ╱  ╲
      ╱ ▓▓ ╲╱ ▓▓ ╲
     ╱  ░░ METIS ░░ ╲
    ╱________________╲
      [ logo placeholder ]
```

配色复用 `theme.js`：accent `#7AD69D`、bronze `#C7A76A`。

## 实现清单（方案 A）

1. `lib/tui/logo.js` — ASCII art 渲染函数
2. `lib/tui/renderer.js` — 新增 `splashPanel()` / `actionMenuPanel()`
3. `lib/tui/shell.js` — 键位：↑↓/1-3/Enter 触发 state transition；`:` 切换命令模式
4. `lib/tui/session.js` — `focusIndex`, `inputMode: 'menu'|'command'`
5. 测试：`test/metis-tui.test.js` — splash 渲染、数字键导航、首次引导文案

## 对抗性审查

### 1. 最容易失败的点：首屏菜单与状态机脱节

`[3] Open diff preview` 在 `scan-results` 状态不能直接执行——需先 `plan`。菜单项必须映射到**合法 transition**，或自动链式执行并给用户反馈。

### 2. 最大的盲区：缺 Logo ≠ 缺导航；忽略失败态

启动时同步 scan+dry-run，audit failed / evidence=0 时菜单语义不清。需为失败态设计不同菜单（如 `[1] View audit issues`）。

### 3. 砍一半资源时先砍什么

先砍 Y2K 视觉和 `:` 双模输入；保留数字菜单 → 现有 `parseCommandLine()` 映射。Logo 可简化为一行 ASCII，不单独 splash 状态。

### 修正后的方案 A（对抗性审查后）

1. **不新增 splash 状态**——改造现有 welcome 面板为「品牌 + 可操作菜单」
2. **菜单项严格映射 state machine**：`[1] plan` → `[2] rescan` → audit 失败时 `[1] view audit`
3. **键位最小集**：`1`/`2`/`Enter`/`↑↓`，暂不实现 `:` 命令模式
4. **Logo 简化**：welcome 顶部 5–7 行 ASCII，不阻塞启动
5. **busy 态**：scan 未完成时显示 spinner +「Scanning…」，菜单禁用

## 下一步

- [ ] 用户确认思考文档
- [ ] 实现方案 A Boot Splash
- [ ] 验证首次打开体验（scripted + 手动）

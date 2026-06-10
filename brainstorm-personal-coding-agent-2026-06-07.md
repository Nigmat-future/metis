# 头脑风暴：Personal Coding Agent

**日期**：2026-06-07  
**模式**：产品模式  
**状态**：草案

## 背景

你想设计一个适合每个人自己的 Coding Agent：

- 像 Pi 一样长期理解个人，但比 Pi 的入门门槛低。
- 能扫描 Claude Code、Codex 等工具过去的使用记录，快速把用户已经形成的偏好、流程和功能迁移到脚手架里。
- 初始脚手架要有基本能力，后续能像 Hermes 一样自我进化。
- 代码哲学参考 Karpathy：少即是多，奥卡姆剃刀，先做最小、清晰、可解释的系统。
- 目标是做成史诗级开源产品，一上市就能在 GitHub 引爆。

## 核心结论

首版不要做新的 Coding Agent。正确起点是一个本地历史扫描器：

```text
AI coding history scanner -> personal agent scaffold
```

真正的第一性机会不是“更聪明的聊天机器人”，而是“个人 agent 配置迁移层”。重度 AI 编程用户已经在手工维护 `CLAUDE.md`、`AGENTS.md`、settings、hooks、skills、MCP、prompts、rules、workflows。问题不是他们没有偏好，而是偏好散落在不同工具、项目、历史会话和 shell 习惯里。

最窄楔子：扫描这些存量行为，把它们变成可执行、可审计、可回滚的 Personal Coding Agent 脚手架。

首版口号：

```text
Scan your AI coding history. Generate your personal agent scaffold.
```

更锋利的 GitHub 首屏文案：

```text
Your AI coding history is your config. Stop hand-writing CLAUDE.md.
```

## 目标用户

第一版只服务一种人：重度 AI 编程用户。

具体包括：

- Claude Code power users。
- Codex CLI users。
- Cursor rules/memories 重度使用者。
- 手工维护多个 `CLAUDE.md`、`AGENTS.md`、`.cursor/rules`、`.github/copilot-instructions.md` 的开发者。
- dotfiles nerds。
- 经常拼装 hooks、MCP、skills、prompts、workflows 的 AI workflow builders。

暂不服务：

- 只偶尔用 Copilot 补全的普通 IDE 用户。
- 不愿意看 diff、不理解本地配置的用户。
- 想购买“万能 AI 员工”的非技术用户。
- 一开始就要团队后台、权限系统、云端知识库的企业客户。

## 关键发现

### 1. 真实痛点不是“没有 Agent”，而是“个人化配置资产碎片化”

现在主流工具已经各自形成配置体系：

- Claude Code：`CLAUDE.md`、memory、settings、hooks、MCP、skills、`.claude`。
- Codex：`AGENTS.md`、project docs、CLI config。
- Cursor：User Rules、Project Rules、Memories、`.cursor/rules`。
- GitHub Copilot：`.github/copilot-instructions.md`、instructions、prompt files。
- Aider：`CONVENTIONS.md`、`.aider.conf.yml`。
- Cline / Windsurf / Continue：rules、memories、workflows、MCP、context providers。

这些工具都在变成可配置 agent substrate，但没有一个统一的个人迁移层。

### 2. “懂我”不能靠问卷，要靠扫描真实行为

Pi 的吸引力是“懂我”。但 Coding Agent 的“懂我”不应该让用户从空白问卷开始填几十个偏好。

更低门槛的方式是：

- 扫描用户已经写过的规则。
- 扫描他们反复运行的命令。
- 扫描项目中已有的 docs/scripts/Makefile/package scripts。
- 扫描失败日志、修复记录、commit message、review 习惯。
- 扫描 hooks/MCP/permissions 的真实使用模式。

用户过去的行为就是配置。

### 3. 自我进化必须是受控 diff，不是黑盒自动改写

Hermes 式自我进化可以作为长期方向，但首版不能让 agent 静默修改长期配置。

允许：

- 从新会话中提出配置变更提案。
- 给出证据来源。
- 给出影响范围。
- 给出验证命令。
- 让用户确认后应用。
- 支持 rollback。

禁止：

- 静默修改核心规则。
- 自动放宽权限。
- 把一次性偏好固化成长期记忆。
- 把恶意 prompt injection 写进配置。
- 让规则无限膨胀。

### 4. GitHub 爆点不是愿景，而是 30 秒可见的 aha moment

最强 demo 不是“我们做了一个 Personal AI”，而是：

```bash
pca scan
pca plan
pca init --dry-run
```

30 秒内让用户看到：

- 它找到了我常用的 test/build/lint 命令。
- 它读出了我反复写在 prompt 里的代码偏好。
- 它发现了我多个配置文件里的冲突规则。
- 它提醒我某个 hook/MCP permission 有风险。
- 它生成了一个可以直接审查的 `CLAUDE.md` / `AGENTS.md` / Cursor rules diff。

一句话：它读出了我真实的编码人格，并给了我一个可信 diff。

## 产品定位

### 做什么

做一个本地 CLI 工具，暂名 `pca`。

核心命令：

```bash
pca scan
pca plan
pca init --dry-run
```

后续命令：

```bash
pca lint
pca doctor
pca rollback <id>
pca evolve
```

首版价值：

- 扫描用户已有 AI coding 配置和历史痕迹。
- 抽取个人偏好、常用命令、踩坑教训、审批习惯、工具权限和工作流。
- 生成带证据、置信度和风险标记的 scaffold plan。
- 渲染为不同工具可用的配置文件。
- 默认 dry-run，只展示 diff，不擅自写入。
- 支持备份、回滚、冲突检测和敏感信息审计。

### 不做什么

首版明确不做：

- 不做新的 AI 聊天客户端。
- 不做新的 IDE。
- 不做模型网关。
- 不做多 agent 编排平台。
- 不做企业知识库。
- 不做团队权限后台。
- 不做云端记忆同步。
- 不做通用 MCP marketplace。
- 不做黑盒自我进化。
- 不要求用户填长问卷。

一句话：不和 Claude Code、Codex、Cursor 正面抢 agent runtime，而是把它们已有的个人化配置债整理成可执行资产。

## 产品哲学

### 像 Pi，但低门槛

Pi 的核心是长期理解个人。PCA 的“理解”不靠套话式聊天，而靠真实使用痕迹。

低门槛不是降低能力，而是降低初始化成本：

- 不让用户从空白问卷开始描述自己。
- 不让用户手写几十条规则。
- 不让用户手动迁移不同工具的 instructions。
- 直接读取用户已经形成的工作方式。

### 像 Hermes，但可审计

Hermes 的方向是自我改进。PCA 可以借这个哲学，但必须把“自我进化”产品化为：

```text
proposal -> review -> test -> apply -> rollback
```

它不是自动长出人格，而是逐步维护个人 agent 配置卫生。

### Karpathy / 奥卡姆剃刀

能用 Markdown、YAML、JSON、git diff 解决的，不上数据库。  
能用确定性规则抽取的，不先调用 LLM。  
能生成小文件的，不生成一份巨大的“个人宣言”。  
能做一个清晰 CLI 的，不做复杂平台。

首版系统应该保持这个形状：

```text
scan -> extract -> plan -> generate -> audit -> apply/rollback
```

## 方案

### 方案 A：历史扫描器（推荐，最小可行）

核心思路：扫描用户已有的 Claude Code、Codex、Cursor 等配置和历史痕迹，生成个人 agent scaffold。

做什么：

- 读取稳定的配置文件和项目文件。
- 抽取常用命令、规则、偏好、权限、工作流。
- 输出 `agent-profile.json` 和 `pca-plan.md`。
- 生成 `CLAUDE.md`、`AGENTS.md`、Cursor rules 等 dry-run diff。
- 默认本地、脱敏、只读、可回滚。

不做什么：

- 不做聊天界面。
- 不做云同步。
- 不做团队后台。
- 不做自动进化。
- 不追求首版覆盖所有工具。

优点：

- 瞄准真实高频痛点。
- GitHub demo 清晰。
- 不和现有 agent runtime 正面竞争。
- 可用确定性规则实现第一版。
- 隐私边界更容易讲清楚。

缺点：

- 历史数据路径和格式不稳定。
- 扫描质量决定成败。
- 如果输出泛泛而谈，会像“AI 算命”。

适合场景：首发开源、验证真实需求、快速形成 GitHub 传播。

### 方案 B：Pi-like 对话向导（理想但不该首发）

核心思路：让用户通过自然语言对话逐步生成自己的 Coding Agent 配置。

做什么：

- 通过问答理解用户偏好。
- 根据回答生成脚手架。
- 给出推荐的 rules、hooks、MCP、workflows。
- 降低非重度用户入门门槛。

不做什么：

- 不深度扫描历史。
- 不优先解决已有配置债。
- 不强调 cross-tool migration。

优点：

- 更像 Pi。
- 对普通开发者更友好。
- 体验上更产品化。

缺点：

- 问卷/对话会增加入门成本。
- 用户说的偏好不一定等于真实行为。
- 差异化弱，容易被 Claude/Cursor 内置向导复制。

适合场景：历史扫描器验证成功后，作为 onboarding 层加入。

### 方案 C：Hermes-like 自进化循环（长期方向）

核心思路：每次使用后自动复盘，提出配置改进，让 agent 越来越懂用户。

做什么：

- 分析最近会话、git diff、测试失败、用户纠正。
- 提出新增/修改/删除规则的 patch proposal。
- 绑定证据、验证命令和 rollback。
- 定期 prune/dedupe 规则。

不做什么：

- 不静默写入。
- 不自动放宽权限。
- 不默认远程上传历史。
- 不把所有短期偏好固化为长期记忆。

优点：

- 符合“越用越懂我”的长期愿景。
- 能形成复利。
- 可能成为真正护城河。

缺点：

- 信任风险高。
- 容易导致规则膨胀。
- 实现复杂，验证难。
- 太早做会稀释首版楔子。

适合场景：扫描器和脚手架生成器已经被验证后，作为 Phase 4。

### 推荐

推荐方案 A：历史扫描器。

理由：你已经明确首版用户是重度 AI 编程用户，他们的现状是手工拼装配置，最关键洞察是迁移存量行为。历史扫描器正好击中这三点。它足够窄，可以做出可信 demo；也足够强，能自然延伸到 Pi-like onboarding 和 Hermes-like evolution。

## 技术架构

### 总体结构

```text
Scanner Adapters
  -> Redactor
  -> Evidence Store
  -> Extractor
  -> Behavior IR
  -> Planner
  -> Safety Auditor
  -> Generator
  -> Applier / Rollback
```

### Scanner Adapters

作用：读取不同 agent/IDE 的历史和配置源，把碎片化文件转换成统一证据流。

首批稳定支持：

- Claude Code。
- Codex。
- Cursor。

实验性支持：

- Aider。
- Copilot。
- Windsurf。
- Cline。
- Continue。

每个 adapter 暴露：

- `detect()`：判断本机/项目是否存在相关配置。
- `collect()`：只读收集证据。
- `redact()`：脱敏。
- `summarize()`：输出候选行为资产。

证据项示例：

```json
{
  "id": "ev_001",
  "source": "claude-code",
  "path": ".claude/settings.json",
  "kind": "permission",
  "excerpt": "allowed tools include Bash(npm test)",
  "timestamp": "2026-06-07T00:00:00Z",
  "confidence": 0.86,
  "sensitivity": "low"
}
```

### Redactor

作用：保护隐私、密钥、商业代码和 prompt injection 风险。

必须默认启用：

- API key 检测。
- token 检测。
- 高熵字符串检测。
- 私有 URL 检测。
- 邮箱和个人路径脱敏。
- 公司内部域名提示。
- `.env`、secrets、credentials 路径 denylist。
- prompt injection markers 检测。

默认不上传任何内容。若未来需要 LLM 增强，必须显式 opt-in，并展示将发送的脱敏片段。

### Extractor

作用：从历史中提炼真实重复出现的行为资产，而不是总结废话。

优先使用确定性规则：

- 命令频率统计。
- test/build/lint 命令聚类。
- package scripts 识别。
- Makefile target 识别。
- 反复出现的 instructions。
- 多文件规则 dedupe。
- hooks/MCP 权限扫描。
- 失败后修复模式。
- git commit message 风格。
- review/checklist 习惯。

LLM 只做候选文案归纳，不直接写文件。

### Behavior IR

作用：跨工具中间表示，避免硬编码到某一个生态格式。

建议结构：

```json
{
  "identity": {},
  "rules": [],
  "commands": [],
  "lessons": [],
  "workflows": [],
  "permissions": [],
  "mcp": [],
  "hooks": [],
  "project_conventions": [],
  "risks": [],
  "targets": [],
  "provenance": []
}
```

核心原则：IR 中每一项都必须能回到 evidence id。

### Planner

`pca plan` 输出：

- 发现了什么。
- 为什么这么判断。
- 建议生成哪些文件。
- 哪些内容置信度高。
- 哪些内容可能冲突。
- 哪些内容有安全风险。
- 哪些内容需要用户确认。
- dry-run diff。

### Generator

首版 targets：

- `CLAUDE.md`
- `AGENTS.md`
- `.cursor/rules/personal.mdc`
- `.github/copilot-instructions.md`
- `CONVENTIONS.md`
- `.claude/settings.json` snippets
- hooks skeleton
- workflow/skill skeleton

原则：不要生成一份臃肿大文档。每个文件只写对该工具有用的最小规则。

### Safety Auditor

检查项：

- 敏感信息泄漏。
- 私有路径泄漏。
- README/AGENTS prompt injection。
- 危险 shell hooks。
- 过宽 MCP 权限。
- 自动执行命令风险。
- 规则互相冲突。
- memory 膨胀。
- 低置信度建议。

默认阻止高风险内容写入。

### Applier / Rollback

规则：

- 默认 dry-run。
- apply 前显示 diff。
- 检查 git 状态。
- 不覆盖未备份文件。
- 只写白名单路径。
- 每次写入生成 rollback id。
- 可选创建 git branch。

## 路线图

### Phase 0：README-Driven Blueprint

目标：把定位钉死，避免滑向“又一个 agent 平台”。

交付：

- README/PRD。
- 竞品矩阵。
- 数据源表。
- 生成物表。
- 安全原则。
- before/after 示例。
- 首屏 GitHub 文案。

成功指标：10 个目标用户读完后，8 个能在 30 秒内复述：这不是 agent，而是 behavior migration scanner。

### Phase 1：Local Scanner MVP

目标：让真实重度用户在本机看到第一次 aha moment。

交付：

- `pca scan` 支持 Claude Code、Codex、Cursor。
- 读取确定性配置源。
- 识别常用 test/build/lint commands。
- 提取重复规则和项目偏好。
- 生成 `agent-profile.json`。
- 默认 redaction。
- 默认 ignore。

成功指标：20 位重度用户中至少 12 位认为 scan 结果发现了他们懒得手写但确实有用的配置。

### Phase 2：Scaffold Generator

目标：把发现变成可执行配置，而不是报告。

交付：

- `pca plan` 输出证据化 Markdown + diff。
- `pca init --dry-run` 生成目标配置。
- 支持 `CLAUDE.md`、`AGENTS.md`、Cursor rules。
- Copilot/Aider 输出通用建议。
- 冲突检测。
- dedupe。
- backup。
- rollback。

成功指标：用户在现有 repo 运行一次后，下一轮 agent 会话明显减少重复解释项目习惯。

### Phase 3：Privacy & Permission Hardening

目标：建立信任护城河。

交付：

- secret scanner。
- MCP/tool permission audit。
- prompt injection 检查。
- dangerous hook 静态检查。
- 本地-only 模式。
- 可审计日志。
- `pca doctor`。

成功指标：默认配置无网络上传；安全审计能拦截密钥、危险 shell、恶意 instructions 三类高风险问题。

### Phase 4：Controlled Evolution Loop

目标：从一次性迁移器升级为长期 Personal Coding Agent 管家。

交付：

- `pca evolve` 生成小型配置提案。
- 每个提案绑定历史证据。
- 每个提案绑定验证命令或 checklist。
- 规则老化检测。
- 月度 prune/dedupe。
- rollback ledger。

成功指标：连续使用 2 周后，用户配置变得更短、更准，而不是膨胀。

### Phase 5：GitHub Launch Flywheel

目标：通过开源 demo 和 adapter 网络效应传播。

交付：

- one-command demo GIF。
- 匿名 fixtures。
- before/after gallery。
- adapter SDK。
- golden output tests。
- community templates。
- contribution guide。

成功指标：首周出现高质量 stars、issues 和 adapter PR；传播点集中在“它读出了我真实的编码人格”。

## 发布策略

### 首发叙事

不要说：

```text
We built a personal AI coding agent.
```

要说：

```text
We built a scanner that turns your AI coding history into a personal agent scaffold.
```

### README 第一屏

只放三件事：

1. 痛点截图：碎片化 `CLAUDE.md`、`AGENTS.md`、rules、hooks、MCP。
2. 30 秒命令：`pca scan -> pca plan -> pca init --dry-run`。
3. 生成结果 diff：从历史中提取的偏好、命令、风险和 scaffold。

不要第一屏讲架构图、长期愿景、研究哲学。

### Demo 节奏

0-5 秒：展示混乱配置文件。  
5-15 秒：运行 `pca scan`。  
15-25 秒：展示 extracted preferences / workflows / risks。  
25-30 秒：展示 dry-run diff。

Demo 必须能在没有本地历史时跑：

```bash
pca demo karpathy-style
```

### GitHub 仓库结构

建议：

```text
/adapters
/ir
/extractors
/generators
/auditors
/examples
/templates
/fixtures
/docs
```

每个 adapter 都应该有：

- fixture。
- golden output。
- path detection tests。
- redaction tests。
- supported versions。
- risk notes。

### 增长钩子

让用户愿意 star：

```text
Star if you have more than one AGENTS.md / CLAUDE.md / rules file.
```

让用户愿意晒：

- 生成可分享但已脱敏的 `MY_AGENT_PROFILE.md`。
- 展示“我的 agent 偏好来自哪些证据”。
- 不展示私有路径和代码。

让用户愿意贡献：

- `Add Cline adapter`
- `Add Continue adapter`
- `Improve Claude hooks extraction`
- `Add Windows path support`
- `Add Windsurf workflows fixture`

## 成功指标

### MVP 指标

- 20 个重度用户中，至少 12 个认为扫描结果有真实价值。
- 生成规则中至少 70% 被用户保留。
- 首次运行 3 分钟内能产出可审查 plan。
- 默认不上传任何历史内容。
- 高风险敏感信息写入率为 0。
- 用户愿意把部分生成 diff 合入 dotfiles 或 repo。

### 产品质量指标

- 人工修改率随版本下降。
- 重复规则数量下降。
- 下一轮 agent 会话中，用户重复解释项目习惯的次数下降。
- 危险 hook/MCP 建议被拦截。
- rollback 可用且可验证。

### 发布指标

- 首周获得高质量 issues 和 adapter PR，而不只是空 star。
- 用户反馈集中在“它读出了我的真实工作流”。
- 社区贡献围绕 adapter、fixtures、golden tests、安全规则，而不是要求做聊天 agent。

## 风险与应对

### 历史数据不可稳定访问

风险：产品叙事依赖 transcripts / usage traces，但这些路径、格式、权限、保留策略可能不稳定。

应对：

- MVP 定义为“配置与命令迁移器”。
- transcripts 只做 best-effort。
- 先支持确定性文件源。
- 在 20 台真实重度用户机器上验证命中率。
- README 不过度承诺“读取所有历史会话”。

### 隐私和安全事故

风险：扫描对象可能包含 API key、私有代码路径、shell history、公司域名、MCP 配置、hook 命令、失败日志。

应对：

- 默认 offline-only。
- 默认无遥测。
- 默认 dry-run。
- 默认不调用远程 LLM。
- 默认脱敏。
- 高风险内容阻止写入。
- 可分享 artifact 必须二次脱敏。

### Prompt injection 固化

风险：历史文件或 README 中可能包含恶意 instruction，扫描器把它写进长期配置后会污染 agent 行为。

应对：

- prompt-injection detector。
- README/AGENTS/规则文件风险扫描。
- 低置信度规则不自动生成。
- 涉及权限、执行命令、忽略安全限制的内容默认拦截。

### 自我进化过早复杂化

风险：Hermes 式叙事容易让团队过早投入 evolution loop，反而忽略首个 aha moment。

应对：

- 首发不主打 `pca evolve`。
- 先做 `pca lint`、`pca diff`、`pca prune`、`pca rollback`。
- 所有演化都是 proposal。
- 禁止自动 apply。

### 跨工具适配过宽

风险：同时支持所有工具会导致每个 adapter 都浅、脆、不可用。

应对：

- 首版只保证 Claude Code + Codex + Cursor。
- Aider/Copilot 输出通用 Markdown 建议。
- Windsurf/Cline/Continue 标为 experimental。
- 建立 adapter quality contract。
- 用 fixtures 和 golden tests 保证质量。

## 对抗性审查

最强反驳：这个产品最危险的地方是“大叙事太诱人”。Personal Coding Agent、Pi、Hermes、自我进化、GitHub 引爆，这些词都容易把团队带偏。

真正可能成立的不是“史诗级 agent”，而是一个极窄、极实用、极可信的本地扫描器。

如果第一版扫描结果不能让 Claude Code / Codex / Cursor 重度用户在 3 分钟内看到真实有用的偏好、命令、风险和生成 diff，后面的所有愿景都是空中楼阁。

因此必须砍掉：

- 过早的自我进化。
- 过宽的 adapter 覆盖。
- 云端同步。
- 团队平台。
- marketplace。
- 大而全 agent 叙事。
- 默认远程 LLM 总结。

应该保留：

- 本地只读扫描。
- dry-run。
- evidence-backed diff。
- secret redaction。
- prompt injection 检查。
- 最小 Claude/Codex/Cursor scaffold。
- rollback。

半数时间下的最小版本：

```text
pca scan              # 读配置和命令
pca plan              # 证据化计划
pca init --dry-run    # 生成 diff，不写入
pca lint              # 检查冲突和危险项
```

## 下一步

### 1. 固化项目边界

写一页 public manifest，明确：

- 这是 behavior migration scanner。
- 不是新的 coding agent。
- 默认本地。
- 默认 dry-run。
- 默认可回滚。

### 2. 做数据源实机验证

找 20 个重度用户，验证：

- Claude Code 能稳定读到哪些文件。
- Codex 能稳定读到哪些文件。
- Cursor rules/memories 哪些可读。
- shell history 是否有价值。
- git/scripts/docs 能提取多少命令和惯例。
- transcripts 是否可靠。

输出一张命中率表。

### 3. 定义 IR schema

先写最小 schema：

- rules。
- commands。
- lessons。
- workflows。
- permissions。
- evidence。
- risks。
- targets。

不要提前做开放标准。等 adapter 变多后再标准化。

### 4. 做 Claude + Codex + Cursor 三个 adapter

首版只保证这三个。

每个 adapter 必须有：

- detect。
- collect。
- redact。
- fixture。
- golden output。
- Windows/macOS/Linux 路径测试。

### 5. 做 dry-run 生成器

先生成：

- `CLAUDE.md`
- `AGENTS.md`
- `.cursor/rules/personal.mdc`
- `pca-plan.md`
- `agent-profile.json`

不要先做 hooks 自动启用。危险能力只做建议。

### 6. 做安全审计

优先级高于 LLM 总结。

必须包含：

- secret scanner。
- private path redaction。
- prompt injection 检查。
- dangerous hook 检查。
- MCP permission audit。

### 7. 做 README demo

README 第一版只证明一件事：

```text
从混乱历史和配置中，生成一个可信的个人 agent scaffold diff。
```

不要写愿景长文。不要讲“史诗级产品”。让 demo 自己说话。

## 用户决策

当前已确认：

- 模式：产品模式。
- 第一版用户：重度 AI 编程用户。
- 当前痛点：手工拼装配置、规则、hooks、skills、MCP、prompts、workflows。
- 最窄楔子：历史扫描器。
- 独特洞察：迁移存量行为，而不是让用户重新描述自己。

待确认：

- 首版技术栈：TypeScript / Python / Go / Rust。
- 首发仓库名：`pca` / `agentforge` / `ai-dotfiles` / `personal-agent-kit`。
- 第一版是否只做 Claude Code + Codex + Cursor。
- 是否先写 README-driven prototype，再写代码。

## 最终判断

Personal Coding Agent 的正确起点不是 agent，而是迁移器。

如果它能把用户过去 6 个月手工积累的 `CLAUDE.md`、`AGENTS.md`、rules、hooks、MCP、prompts、commands、踩坑教训，在 3 分钟内整理成一份可信 diff，它就有机会成为每个重度 AI 编程用户的必装工具。

如果它一开始就追求自我进化、跨工具全覆盖、云端平台和史诗叙事，它会死在复杂度和信任问题上。

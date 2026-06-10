# Draft: Personal Coding Agent Review

## Requirements (confirmed)
- 用户目标：做一个个人专属化的 Coding Agent。
- 灵感：Pi 的个人理解能力，但降低上手门槛。
- 数据源：扫描用户过往 Codex、Claude 记录，识别用户真正需要的功能。
- 演化方向：类似 Hermes，但自我进化必须更贴合用户。
- 工程原则：奥卡姆剃刀，用最精简代码达成最好的 token 节省。
- 当前请求：全面审查 Claude Code 生成的第一部分代码，总结宏图完成度与欠缺。

## Technical Decisions
- 审查按当前快照进行；项目不是 git 仓库，无法做基于 diff 的 PR 审查。
- 本轮保持只读，不修改源码；只写入 `.omo/drafts` 审查草稿。
- 评价分两层：当前 PRD skeleton 完成度，以及完整 PCA 宏图完成度。

## Research Findings
- 当前项目是无依赖 CommonJS Node CLI，核心命令为 `scan`、`plan`、`init --dry-run`。
- 已实现 Claude Code metadata-only 配置形状扫描：`CLAUDE.md`、settings、hooks、skills、MCP。
- 已有 README、PRD、架构、安全、贡献文档，定位清楚：不是新 agent runtime，而是本地扫描器和脚手架生成器。
- `npm test` 通过，9 个 Node built-in tests 全绿；`node --check` 通过核心 JS 文件。
- 核心代码体积克制：`bin/pca.js` 135 纯代码行，`lib/adapters/claude-code.js` 99 纯代码行，`test/pca-cli.test.js` 89 纯代码行。

## Findings
- P1: `--fixture` 缺失值会静默扫描当前目录并退出 0，可能违背用户显式指定扫描目标的预期。
- P2: 扫描会跟随 symlink，真实本地项目中可能越过目标根目录读取 JSON metadata。
- P2: 输出未净化的 root 路径和 JSON top-level keys；这属于 metadata sensitivity，可能泄露用户名、客户项目名、内部服务名，secret-like key 名和控制字符也可绕过当前“values not displayed”边界。
- P2: 嵌套 hooks/skills 会被报告为 present 但 0 file(s)，真实 Claude/Codex 风格目录容易低估。
- P3: 文件系统错误被吞掉，权限拒绝等会被折叠为 not found 或 0 file(s)，报告不够显式，容易让 evidence count 产生虚假的安全感。
- P3: 测试中的无写入断言会先删除 fixture 内 `.pca`，测试自身不是完全只读。

## Macro Assessment
- 当前 PRD skeleton 完成度：约 70/100。命令、文档、安全姿态、基础测试都已兑现，但参数解析、路径边界、metadata 输出净化、错误语义和测试隔离仍是基础可靠性缺口。
- 完整宏图完成度：约 24/100。项目仍是 Phase 0 + 极早 Phase 1 骨架。
- 最强项：定位锋利、MVP 边界克制、本地优先、无网络无写入、代码体积符合奥卡姆原则。
- 最大缺口：没有 Codex adapter，没有真实历史扫描，没有 evidence schema / extractor / Behavior IR / redactor / generator / rollback，没有可信 dry-run diff，也没有可审计 evolve loop。

## Recommended Next Steps
1. 修补扫描器可信地基：CLI 参数校验、路径 containment、输出净化、显式错误状态、递归/结构化 hooks 与 skills 计数、测试 fixture 隔离。
2. 定义 Evidence IR 最小 schema：source、path、kind、confidence、sensitivity、provenance、contradictions、targets。
3. 增加 Codex adapter：先支持 `AGENTS.md` 层级规则、Codex 配置、项目说明与常用命令识别。
4. 把 `pca plan` 从固定文案升级为 evidence-backed plan，输出 candidates、confidence、风险、target、review gate。
5. 让 `init --dry-run` 生成真实 scaffold diff，但仍不写文件。
6. 在 evolve 前先做 lint/doctor/redaction；自我进化应排在可信扫描和 dry-run diff 之后。

## Verification
- `npm test`
- `node --check bin/pca.js`
- `node --check lib/adapters/claude-code.js`
- `node --check test/pca-cli.test.js`
- `node bin/pca.js scan --fixture test/fixtures/claude-code-project`
- `node bin/pca.js plan --fixture test/fixtures/claude-code-project`
- `node bin/pca.js init --dry-run`
- `node bin/pca.js init`

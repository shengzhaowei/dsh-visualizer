// 新增与重构课程：dsh-scope 作用域隔离、完整安全审批链路、合并后的产品组装装机清单。
// 站在源码与设计角度编写，每课 6 步，全部配套定制 SVG 场景与真实源码锚点。
import { DSH_REPO, dshSrc, iso, kpi, lesson, namiSrc, src, steps, swim, tree } from '../helpers';

// ---------------------------------------------------------------------------
// CH2 · 5/5 · dsh-scope：作用域链、向上事件穿透与子 Agent 隔离
// ---------------------------------------------------------------------------
export const L_DSH_SCOPE = lesson(
  'dsh-scope',
  'ch02',
  2,
  'Cordis 主板与作用域',
  5,
  5,
  'dsh-scope：作用域链与子 Agent 隔离',
  '为什么 DSH 源码里 Cordis 原生 ctx.isolate 用量是 0？因为它用 packages/dsh-scope 在 Cordis 之上建了一套面向 Agent 树的作用域原语。',
  14,
  '进阶',
  [
    { text: '解释为何 DSH 用 dsh-scope 替代 Cordis 原生 ctx.isolate', completedAtStep: 2 },
    { text: '掌握 createScope / bindScopeParent 与双向规则（注册向下继承、事件向上穿透）', completedAtStep: 4 },
    { text: '说出子 Agent 生命周期如何借 Fiber uid 自动回收整棵子树资源', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '全局总线的难题',
      badge: 'PROBLEM',
      title: '当一个进程里同时跑主 Agent 和 3 个子 Agent',
      paragraphs: [
        '前四课我们看到的 Cordis 只有一棵全局服务表和一条全局事件总线。只有一个 Agent 时一切安好；但一旦主 Agent 派生出 3 个并行子 Agent（每个子 Agent 可能有不同的工作目录、权限预设、临时工具），全局扁平总线立刻撞墙。',
        '子 Agent A 注册的临时工具不该泄露给子 Agent B；子 Agent A 触发的 `tools/pre-execute` 审批事件，主 Agent 或预设层的审批器必须能收到，但子 Agent B 不该窃听到。这就是 `packages/dsh-scope` 要解决的问题。',
      ],
      callout: {
        kind: 'idea',
        title: '为什么不用 Cordis 原生 ctx.isolate？',
        text: 'Cordis 的 isolate 是静态按服务名硬切分的平行宇宙；而 Agent 运行时是动态生成的父子树——需要「配置与工具向下继承，事件与审批向上冒泡」，这是两个完全不同的拓扑。',
      },
      kpis: [
        kpi('原生 isolate 用量', '0 次', 'neutral'),
        kpi('作用域原语包', 'packages/dsh-scope', 'good'),
        kpi('核心拓扑', '动态父子作用域链', 'good'),
      ],
      scene: iso(
        '扁平总线 vs 分层作用域',
        [
          { id: 'preset', x: 380, y: 50, label: 'Agent Preset', sublabel: '常驻父作用域 · 审批与默认工具', tone: 'violet', size: 'lg', active: true, icon: 'layers' },
          { id: 'a1', x: 80, y: 240, label: 'Sub-Agent A', sublabel: 'scope: agent-a · 临时工具', tone: 'blue', icon: 'git-branch' },
          { id: 'a2', x: 380, y: 240, label: 'Sub-Agent B', sublabel: 'scope: agent-b · 只读边界', tone: 'green', icon: 'git-branch' },
          { id: 'a3', x: 680, y: 240, label: 'Sub-Agent C', sublabel: 'scope: agent-c · 独立会话', tone: 'orange', icon: 'git-branch' },
          { id: 'cordis', x: 180, y: 420, label: 'Cordis 全局内核 + dsh-scope', sublabel: '按 scope key 标记上下文，而非复制内核', tone: 'dark', size: 'platform', icon: 'cpu' },
        ],
        [
          { from: 'preset', to: 'a1', label: '向下继承', packetCount: 1, packetLabel: '工具/配置' },
          { from: 'preset', to: 'a2', label: '向下继承', packetCount: 1, packetLabel: '工具/配置' },
          { from: 'preset', to: 'a3', label: '向下继承', packetCount: 1, packetLabel: '工具/配置' },
          { from: 'a1', to: 'preset', label: '事件向上穿透', status: 'active', dashed: true, packetCount: 1, packetLabel: 'pre-execute' },
          { from: 'a1', to: 'cordis', packetCount: 1 },
          { from: 'a2', to: 'cordis', packetCount: 1 },
          { from: 'a3', to: 'cordis', packetCount: 1 },
        ],
        [{ x: 340, y: 375, text: '兄弟作用域彼此不可见，祖先可管辖全部后代', tone: 'violet' }],
      ),
    },
    {
      shortLabel: 'createScope 原语',
      badge: 'TECHNIQUE',
      title: 'createScope(ctx, key, { parent })：给 ctx 贴上作用域标签',
      paragraphs: [
        '`dsh-scope` 不另起炉灶，而是用 `createScope(ctx, key, options?)` 在现有 Fiber 之上铸造一个带作用域标签的子 `Context`。调用方可以同步立即使用它——不需要额外异步挂载一轮插件。',
        '传入 `options.parent` 时，框架会先通过 `bindScopeParent(key, parent)` 把当前 key 挂到父作用域链上；之后通过这个 scoped `ctx` 注册的每一项服务、监听器和 `effect`，都自动归属到创建它的那条 Fiber 账本上。',
      ],
      sourceDrawer: dshSrc(
        'createScope 与父链绑定（源码结构示意）',
        'packages/dsh-scope/src/index.ts',
        'ts',
        `export function createScope(
  ctx: Context,
  key: ScopeKey,
  options?: { parent?: ScopeKey },
): Context {
  if (options?.parent) bindScopeParent(key, options.parent)
  // 铸造带 scope 标签的派生 ctx，effect 仍按 uid 归属到当前 Fiber
  return ctx.extend({ [SCOPE_KEY]: key })
}`,
        '依据 packages/dsh-scope 公开原语整理：同步可用，服务解析回落到铸造插件的依赖面，effect 由 Fiber uid 记账。',
      ),
      kpis: [
        kpi('核心函数', 'createScope()', 'good'),
        kpi('父链绑定', 'bindScopeParent()', 'neutral'),
        kpi('调用方式', '同步即用', 'good'),
      ],
      scene: tree(
        'scopeChainOf(key)：从子作用域沿 parent 向上回溯',
        [
          { id: 'root', x: 500, y: 60, kind: 'root', label: 'root scope', sublabel: '全局默认层', status: 'done' },
          { id: 'ws', x: 500, y: 185, kind: 'service', label: 'workspace scope', sublabel: '工作区边界与预设', parentId: 'root' },
          { id: 'preset', x: 500, y: 315, kind: 'plugin', label: 'preset scope', sublabel: 'Agent 模板常驻挂载', parentId: 'workspace' },
          { id: 'live', x: 500, y: 445, kind: 'event', label: 'live agent scope', sublabel: '单次运行实例（可销毁）', status: 'active', parentId: 'preset', badge: '当前焦点' },
        ],
        [
          { from: 'root', to: 'ws', label: 'parent' },
          { from: 'ws', to: 'preset', label: 'parent' },
          { from: 'preset', to: 'live', label: 'bindScopeParent', animated: true },
        ],
        [{ x: 680, y: 260, text: 'scopeChainOf(live) = [live, preset, workspace, root]', tone: 'blue' }],
      ),
    },
    {
      shortLabel: '双向规则',
      badge: 'SOLUTION',
      title: '两条核心不变量：注册向下继承，事件向上穿透',
      paragraphs: [
        '`dsh-scope` 最精妙的设计是「读」与「听」的方向正好相反。对于**注册视图**（工具表、提示词段、配置项），子作用域沿 `scopeChainOf` **向下继承**祖先的全部注册，且**最近层覆盖最远层**（shadowing）。',
        '对于**事件准入**（`ctx.on` / `waterfall`），方向正好反过来：**向上穿透**。贴着祖先作用域标签的监听器，能收到所有后代作用域发出的事件；但子作用域监听器绝收不到祖先或兄弟作用域的事件。',
      ],
      callout: {
        kind: 'tip',
        title: '记住这两句话就吃透了 dsh-scope',
        text: '能力（工具/提示词）像 CSS 继承一样往下流、就近覆盖；治理（审批/审计/遥测）像 DOM 事件冒泡一样往上走、父级兜底。',
      },
      kpis: [
        kpi('注册视图方向', '向下继承 · 就近覆盖', 'good'),
        kpi('事件准入方向', '向上穿透 · 祖先可见', 'good'),
        kpi('兄弟隔离', '互不可见', 'good'),
      ],
      scene: iso(
        '向下继承 vs 向上穿透',
        [
          { id: 'anc', x: 120, y: 100, label: '祖先作用域', sublabel: '注册基础工具 + 挂审批监听', tone: 'violet', size: 'lg', active: true, icon: 'shield' },
          { id: 'child', x: 600, y: 100, label: '子作用域', sublabel: '覆盖局部工具 + 触发工具调用', tone: 'blue', size: 'lg', icon: 'git-branch' },
          { id: 'reg', x: 120, y: 340, label: '注册视图（读）', sublabel: 'child 看到 ancestor，同名则 child 胜出', tone: 'green', size: 'lg', icon: 'layers' },
          { id: 'evt', x: 600, y: 340, label: '事件准入（听）', sublabel: 'child 事件冒泡到 ancestor，反之拦截', tone: 'orange', size: 'lg', icon: 'eye' },
        ],
        [
          { from: 'anc', to: 'child', label: '注册向下继承', packetCount: 2, packetLabel: 'tools / prompt' },
          { from: 'child', to: 'anc', label: '事件向上穿透', status: 'active', packetCount: 2, packetLabel: 'tools/pre-execute' },
          { from: 'anc', to: 'reg', dashed: true, packetCount: 1 },
          { from: 'child', to: 'evt', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '同名覆盖与隔离',
      badge: 'INSIGHT',
      title: '最近覆盖最远：同名工具如何被安全收紧',
      paragraphs: [
        '假设全局根作用域注册了一个 `bash` 工具，而某个只读研究子 Agent 的作用域里注册了同名覆盖或策略限制。当该子 Agent 执行工具查找时，作用域链从近到远扫描：`[sub-agent, preset, workspace, root]`，命中最内层即停止。',
        '同一时刻，主 Agent 或另一个兄弟子 Agent 查到的仍然是外层的默认实现——没有任何全局状态被污染，也不需要深拷贝整份工具注册表。',
      ],
      kpis: [
        kpi('查找顺序', '由近及远', 'neutral'),
        kpi('全局污染', '0', 'good'),
        kpi('覆盖粒度', '单作用域', 'good'),
      ],
      scene: swim(
        '同进程双作用域并发查找与事件分发',
        [
          { id: 'root', label: 'root 作用域', sublabel: '全局默认 + 审批监听', tone: 'violet' },
          { id: 'subA', label: 'sub-agent A', sublabel: '覆盖 bash 为只读', tone: 'blue' },
          { id: 'subB', label: 'sub-agent B', sublabel: '无覆盖，继承默认', tone: 'green' },
        ],
        [
          { id: 'r1', laneId: 'root', start: 2, end: 26, label: '注册 bash(默认) + 挂审批', tone: 'violet', status: 'done' },
          { id: 'a1', laneId: 'subA', start: 28, end: 54, label: '局部覆盖 bash(只读)', tone: 'blue', status: 'done' },
          { id: 'a2', laneId: 'subA', start: 56, end: 82, label: '调用 bash → 命中只读版', tone: 'blue', status: 'running' },
          { id: 'b1', laneId: 'subB', start: 56, end: 82, label: '调用 bash → 继承默认版', tone: 'green', status: 'done' },
          { id: 'r2', laneId: 'root', start: 84, end: 98, label: '同时收到 A/B 审批事件', tone: 'violet', status: 'done' },
        ],
        [{ id: 'ev1', laneId: 'root', pos: 91, label: '祖先统一兜底', tone: 'orange', emphasized: true }],
        [{ pos: 0, label: '初始化' }, { pos: 55, label: '并发执行' }, { pos: 100, label: '事件冒泡' }],
        undefined,
        [
          { fromLaneId: 'subA', fromPos: 78, toLaneId: 'root', toPos: 86, label: '向上穿透' },
          { fromLaneId: 'subB', fromPos: 78, toLaneId: 'root', toPos: 86, dashed: true },
        ],
      ),
    },
    {
      shortLabel: '销毁与回收',
      badge: 'TECHNIQUE',
      title: 'Fiber uid 记账：子 Agent 结束时整棵作用域自动归零',
      paragraphs: [
        '每个通过 `createScope` 创建的作用域，底层的 `effect` 收集依然由 Cordis Fiber 的 `uid` 门控。这意味着子 Agent 在自己作用域里挂的所有临时工具、临时监听器、临时会话钩子，全记在它的 Fiber 账本里。',
        '当这个子 Agent 完成任务或被中途取消，框架卸载它的 Fiber——账本倒序撤销，该作用域下的全部注册与父链绑定一并清理干净，不会在主进程留下半条悬挂监听或内存泄漏。',
      ],
      kpis: [
        kpi('记账机制', 'Fiber uid 门控', 'good'),
        kpi('清理方式', '倒序自动撤销', 'good'),
        kpi('悬挂监听', '0', 'good'),
      ],
      scene: iso(
        '子 Agent 作用域的完整生命周期',
        [
          { id: 'spawn', x: 60, y: 200, label: '派生子 Agent', sublabel: 'createScope(ctx, id, { parent })', tone: 'blue', icon: 'git-branch' },
          { id: 'run', x: 370, y: 200, label: '作用域内运行', sublabel: '临时工具与监听记入 uid 账本', tone: 'green', active: true, icon: 'refresh-cw' },
          { id: 'dispose', x: 700, y: 200, label: 'Fiber 卸载', sublabel: '账本倒序撤销 · 作用域归零', tone: 'orange', icon: 'check-circle' },
        ],
        [
          { from: 'spawn', to: 'run', label: 'bindScopeParent', packetCount: 1, packetLabel: 'scope' },
          { from: 'run', to: 'dispose', label: '完成 / 取消', status: 'active', packetCount: 2, packetLabel: 'dispose()' },
        ],
        [{ x: 310, y: 110, text: '复用 Cordis 第 4 课的 effect 账本，零额外 GC 协议', tone: 'green' }],
      ),
    },
    {
      shortLabel: '作用域复盘',
      badge: 'RECAP',
      title: 'dsh-scope 三句话总结',
      paragraphs: [
        'Cordis 解决「插件怎么热插拔」，`dsh-scope` 解决「多 Agent / 多会话怎么分层隔离」。它把静态主板变成了动态作用域树，却没有侵入 Cordis 内核一行代码。',
        '带着「事件向上穿透」这条规则，接下来进入第 3 章看 Agent 循环，以及第 4 章看审批如何跨越父子作用域精准拦截高危工具。',
      ],
      recapTable: [
        { question: '为何不用 Cordis 原生 ctx.isolate？', decision: '在 Cordis 之上自建 packages/dsh-scope', because: 'Agent 需要动态父子继承与事件冒泡，不是静态平行切分' },
        { question: '注册与事件的方向有什么区别？', decision: '注册向下继承（就近覆盖），事件向上穿透（祖先可见）', because: '能力应由父传子、局部可覆写；安全治理必须由祖先统一兜底' },
        { question: '子 Agent 退出后怎么防泄漏？', decision: '所有 scoped 注册记入 Fiber uid 账本', because: '卸载 Fiber 时自动倒序撤销，整棵子树归零' },
      ],
      kpis: [
        kpi('双向规则', '注册↓ / 事件↑', 'good'),
        kpi('内核侵入', '0 行', 'good'),
        kpi('本课步骤', '6 步', 'neutral'),
      ],
      scene: tree(
        'dsh-scope 在整机架构中的位置',
        [
          { id: 'cordis', x: 500, y: 60, kind: 'root', label: 'Cordis 内核', sublabel: 'Fiber · Service · Events', status: 'done' },
          { id: 'scope', x: 500, y: 195, kind: 'service', label: 'packages/dsh-scope', sublabel: 'createScope · bindScopeParent · scopeChainOf', status: 'active' },
          { id: 'reg', x: 240, y: 340, kind: 'plugin', label: '注册视图 ↓', sublabel: '子承父业 · 就近覆盖' },
          { id: 'evt', x: 500, y: 340, kind: 'event', label: '事件准入 ↑', sublabel: '子事件冒泡至祖先' },
          { id: 'gc', x: 760, y: 340, kind: 'log', label: '资源回收', sublabel: '随 Fiber 卸载归零' },
        ],
        [
          { from: 'cordis', to: 'scope', animated: true },
          { from: 'scope', to: 'reg' },
          { from: 'scope', to: 'evt' },
          { from: 'scope', to: 'gc' },
        ],
      ),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH4 · 2/3 · 完整安全审批链路：策略门 → dsh-user-approval → 沙箱叠加
// ---------------------------------------------------------------------------
export const L_APPROVAL_PIPELINE = lesson(
  'approval-pipeline',
  'ch04',
  4,
  '工具管线与安全审批',
  2,
  3,
  '完整安全审批链路：策略门 → 人工审批 → 沙箱叠加',
  '从模型发出一条 rm / curl 命令，到真正触碰操作系统，DSH 竖起三道独立防线：策略判定、用户审批挂起、OS 沙箱硬边界。',
  15,
  '核心',
  [
    { text: '区分 allow / ask / deny 三态决策与 dsh-user-approval 挂起机制', completedAtStep: 2 },
    { text: '理解双闸门叠加原则：批准只授予尝试权，绝不绕过沙箱', completedAtStep: 4 },
    { text: '追踪子 Agent 触发高危工具时，审批如何借 dsh-scope 冒泡到父级', completedAtStep: 5 },
  ],
  steps([
    {
      shortLabel: '为什么需要三道防线',
      badge: 'PROBLEM',
      title: '单靠一道 pre-execute 为什么不够？',
      paragraphs: [
        '上一课我们看到 `tools/pre-execute` 可以写一个 10 行插件拦截工具。但在真实生产环境里，只靠「写死放行/拒绝」远远不够：有些命令（如修改项目外文件、发网络请求）既不能一刀切封死，也不能默许模型偷偷执行。',
        'DSH 把安全拆成三层解耦的防线：**策略门**（按规则分流 `allow / ask / deny`）→ **人工审批服务**（`@deepseek-ai/dsh-user-approval` 挂起等待确认）→ **沙箱硬边界**（`@deepseek-ai/dsh-sandbox` 在执行期做 OS 级物理隔离）。',
      ],
      kpis: [
        kpi('安全防线', '3 层解耦', 'good'),
        kpi('策略决策', 'allow / ask / deny', 'neutral'),
        kpi('原则', '逐层叠加，互不替代', 'good'),
      ],
      scene: iso(
        '高危工具调用的三道防线',
        [
          { id: 'call', x: 40, y: 200, label: '模型工具调用', sublabel: 'bash: curl / write', tone: 'violet', size: 'sm', icon: 'brain' },
          { id: 'policy', x: 240, y: 200, label: '1 · 策略门', sublabel: 'tools/pre-execute · allow/ask/deny', tone: 'orange', active: true, icon: 'shield' },
          { id: 'human', x: 510, y: 200, label: '2 · 人工审批', sublabel: 'dsh-user-approval · 挂起等确认', tone: 'rose', icon: 'users' },
          { id: 'sandbox', x: 770, y: 200, label: '3 · 硬沙箱', sublabel: 'dsh-sandbox · OS 边界', tone: 'green', icon: 'lock' },
        ],
        [
          { from: 'call', to: 'policy', packetCount: 1, packetLabel: 'exec' },
          { from: 'policy', to: 'human', label: 'ask', status: 'active', packetCount: 2, packetLabel: '审批请求' },
          { from: 'human', to: 'sandbox', label: '用户允许', packetCount: 1, packetLabel: '放行尝试' },
        ],
        [{ x: 290, y: 105, text: '每道门独立判定：任一环拒绝，链路立刻短路返回', tone: 'orange' }],
      ),
    },
    {
      shortLabel: '三态分流与挂起',
      badge: 'TECHNIQUE',
      title: 'allow / ask / deny：遇到 ask 时协程挂起等待应答',
      paragraphs: [
        '策略插件监听 `tools/pre-execute`，根据工具名、参数路径和当前预设给出三态结果：`allow` 立即 `next()`；`deny` 直接短路返回拒绝理由；`ask` 则调用 `@deepseek-ai/dsh-user-approval` 发起一次异步审批请求。',
        '挂起期间，Agent 循环停在这个 `await` 上，前端 Web UI 或 CLI 弹出确认卡片。关键安全兜底：**如果没有注册审批应答者（如无头模式无人值守）、用户取消或超时，审批门按 fail-closed 自动判为拒绝**。',
      ],
      sourceDrawer: dshSrc(
        'pre-execute 三态策略与审批挂起（源码结构示意）',
        'packages/core/dsh-user-approval/src/index.ts',
        'ts',
        `ctx.on('tools/pre-execute', async (exec, next) => {
  const verdict = evaluatePolicy(exec, workspaceRules)
  if (verdict.kind === 'deny') return { kind: 'deny', reason: verdict.reason }
  if (verdict.kind === 'ask') {
    const approved = await ctx.userApproval?.request(exec)
    if (!approved) return { kind: 'deny', reason: '未获审批或无应答者(fail-closed)' }
  }
  return next()
})`,
        '展示策略判定与 dsh-user-approval 挂起协作形状：无应答者 / 超时 / 取消统一 fail-closed 返回 deny。',
      ),
      kpis: [
        kpi('三态分支', 'allow / ask / deny', 'neutral'),
        kpi('无应答者时', 'fail-closed 拒绝', 'good'),
        kpi('阻断时机', '工具执行前', 'good'),
      ],
      scene: swim(
        'ask 分支的异步挂起与 fail-closed 兜底',
        [
          { id: 'loop', label: 'agent-loop', sublabel: 'await tools.execute()', tone: 'violet' },
          { id: 'pre', label: 'pre-execute', sublabel: '策略判定 → ask', tone: 'orange' },
          { id: 'appr', label: 'dsh-user-approval', sublabel: 'Web UI / CLI 弹窗', tone: 'rose' },
          { id: 'tool', label: 'tools/execute', sublabel: '工具本体', tone: 'blue' },
        ],
        [
          { id: 'b1', laneId: 'loop', start: 2, end: 18, label: '发起调用', tone: 'violet', status: 'done' },
          { id: 'b2', laneId: 'pre', start: 18, end: 34, label: '规则命中 ask', tone: 'orange', status: 'done' },
          { id: 'b3', laneId: 'appr', start: 34, end: 68, label: '挂起等待用户点击 允许 / 拒绝', tone: 'rose', status: 'running' },
          { id: 'b4', laneId: 'tool', start: 70, end: 96, label: '获批后执行（若拒则短路）', tone: 'blue', status: 'done' },
        ],
        [
          { id: 'e1', laneId: 'appr', pos: 51, label: '无应答者/超时 → deny', tone: 'rose', emphasized: true },
        ],
        [{ pos: 0, label: '调用' }, { pos: 34, label: '挂起' }, { pos: 70, label: '恢复' }, { pos: 100, label: '返回' }],
        undefined,
        [
          { fromLaneId: 'pre', fromPos: 34, toLaneId: 'appr', toPos: 36, label: 'request()' },
          { fromLaneId: 'appr', fromPos: 68, toLaneId: 'tool', toPos: 70, label: 'allow → next()' },
        ],
      ),
    },
    {
      shortLabel: '权限预设组合',
      badge: 'TECHNIQUE',
      title: '三种常见预设：把审批规则和工作区边界绑在一起',
      paragraphs: [
        '手工一条条配规则太繁琐，DSH 把「审批策略 + 沙箱边界」打包成语义化预设：`read-only`（只读探索，写操作直接拦）、`workspace-write`（工作区内可写、越界触发 `ask` 或拦）、`danger-full-access`（显式关闭隔离层，仅限受控环境）。',
        '预设不是硬编码在循环里的 `if/else`，而是通过 bundle/patch 组合不同的策略插件与沙箱配置项——随时可用 `--dump-config` 核验当前到底开了哪一档。',
      ],
      kpis: [
        kpi('只读模式', 'read-only', 'good'),
        kpi('默认推荐', 'workspace-write', 'good'),
        kpi('高危全开', 'danger-full-access', 'warn'),
      ],
      scene: tree(
        '安全预设 = 审批策略 × 沙箱模式',
        [
          { id: 'root', x: 500, y: 60, kind: 'root', label: '安全预设（Profile 配置）', sublabel: '策略门 + 沙箱协同', status: 'active' },
          { id: 'ro', x: 180, y: 210, kind: 'service', label: 'read-only', sublabel: '只读 · 写入直接拒绝' },
          { id: 'ww', x: 500, y: 210, kind: 'service', label: 'workspace-write', sublabel: '工作区内可写 · 越界需审批', status: 'highlight' },
          { id: 'full', x: 820, y: 210, kind: 'event', label: 'danger-full-access', sublabel: '关闭隔离 · 显式授权', status: 'dimmed' },
          { id: 'w1', x: 500, y: 360, kind: 'log', label: '边界核验：--dump-config', sublabel: '所见即生效，拒绝隐式提权' },
        ],
        [
          { from: 'root', to: 'ro' },
          { from: 'root', to: 'ww', animated: true },
          { from: 'root', to: 'full' },
          { from: 'ww', to: 'w1' },
        ],
      ),
    },
    {
      shortLabel: '双闸门叠加',
      badge: 'SOLUTION',
      title: '最容易误解的原则：审批通过 ≠ 绕过沙箱',
      paragraphs: [
        '很多新手会误以为「我在弹窗里点了允许，这条命令就应该能写 `/etc/hosts`」。在 DSH 的安全模型里，答案是**不能**：审批门和沙箱是**叠加（Stacking）**关系，而不是覆盖关系。',
        '审批门回答的是**「人同不同意尝试这件事」**（在 `pre-execute` 层）；沙箱回答的是**「操作系统允不允许进程触碰这个路径/网络」**（在 `execute` 层）。哪怕人工点了 `allow`，越界写入仍会被 OS 沙箱挡下并返回权限错误。',
      ],
      callout: {
        kind: 'warn',
        title: '双闸门黄金法则',
        text: 'Approval grants an attempt, NOT a bypass. 审批只给「尝试权」，不给「特权」；想越出工作区，必须显式切换沙箱配置，而不是靠弹窗绕过。',
      },
      kpis: [
        kpi('闸门 1（审批）', '决定能否尝试', 'neutral'),
        kpi('闸门 2（沙箱）', '决定物理边界', 'good'),
        kpi('能否互相绕过', '绝不能', 'good'),
      ],
      scene: iso(
        '双闸门叠加：两道门都过才真正生效',
        [
          { id: 'req', x: 60, y: 190, label: '写 /etc/hosts', sublabel: '越界路径请求', tone: 'violet', size: 'sm', icon: 'file-text' },
          { id: 'g1', x: 290, y: 190, label: '闸门 1 · 人工审批', sublabel: '用户点击 Allow → 放行尝试', tone: 'orange', icon: 'shield' },
          { id: 'g2', x: 580, y: 190, label: '闸门 2 · OS 沙箱', sublabel: 'workspace-write → EACCES 拦截', tone: 'rose', active: true, icon: 'lock' },
          { id: 'res', x: 380, y: 400, label: '结果回流会话', sublabel: '权限错误作为 tool-result 告知模型', tone: 'blue', size: 'lg', icon: 'database' },
        ],
        [
          { from: 'req', to: 'g1', packetCount: 1, packetLabel: 'exec' },
          { from: 'g1', to: 'g2', label: '审批通过 ≠ 绕过', status: 'active', packetCount: 2, packetLabel: '尝试执行' },
          { from: 'g2', to: 'res', label: 'OS 硬拦截', status: 'error', packetCount: 1, packetLabel: 'EACCES' },
        ],
      ),
    },
    {
      shortLabel: '子 Agent 审批冒泡',
      badge: 'INSIGHT',
      title: '串联 dsh-scope：子 Agent 的高危调用如何冒泡到父级',
      paragraphs: [
        '还记得第 2 章 `dsh-scope` 的「事件向上穿透」吗？它的杀手级应用场景正是安全审批：当主 Agent 派生一个子 Agent 去改代码，子 Agent 自己不需要重复挂载审批插件。',
        '子 Agent 触发 `tools/pre-execute` 时，事件沿着 `scopeChainOf` 自动向上穿透到父级（或工作区级）的审批监听器——主界面的审批弹窗立刻收到请求，显示「来自子 Agent X 的高危操作」，拒绝后直接阻断子 Agent 执行。',
      ],
      kpis: [
        kpi('穿透机制', 'dsh-scope 事件向上', 'good'),
        kpi('子 Agent 逃逸', '不可能', 'good'),
        kpi('审计统一性', '父级全量可见', 'good'),
      ],
      scene: tree(
        '子 Agent 审批沿作用域链自动冒泡',
        [
          { id: 'ui', x: 500, y: 60, kind: 'root', label: '主界面 · dsh-user-approval', sublabel: '挂在根/工作区作用域', status: 'active' },
          { id: 'main', x: 500, y: 195, kind: 'service', label: '主 Agent 作用域', sublabel: '监听 tools/pre-execute', parentId: 'root' },
          { id: 'sub1', x: 260, y: 340, kind: 'plugin', label: '子 Agent A', sublabel: '执行 npm test（allow）', parentId: 'main' },
          { id: 'sub2', x: 740, y: 340, kind: 'event', label: '子 Agent B', sublabel: '尝试 rm -rf（ask → 向上冒泡）', status: 'highlight', parentId: 'main', badge: '拦截点' },
        ],
        [
          { from: 'ui', to: 'main' },
          { from: 'main', to: 'sub1' },
          { from: 'main', to: 'sub2', label: '事件向上穿透审批', animated: true },
        ],
        [{ x: 650, y: 135, text: '子作用域无法屏蔽祖先监听器', tone: 'rose' }],
      ),
    },
    {
      shortLabel: '安全链路复盘',
      badge: 'RECAP',
      title: '完整安全审批链路：四条工程底线',
      paragraphs: [
        '把策略门、人工审批、硬沙箱、作用域冒泡拼在一起，就是 DSH 完整的安全审批闭环：规则可插拔、弹窗可挂起、缺省 fail-closed、沙箱永不被审批绕过、子 Agent 永不脱离父级监管。',
        '下一课深入第三道防线本身：本地执行器、OS 级沙箱（`bwrap` / `Landlock` / `Seatbelt`）与 E2B 云端沙箱的实现细节。',
      ],
      recapTable: [
        { question: 'ask 状态无人应答怎么办？', decision: 'fail-closed 自动拒绝', because: '审批服务缺失或超时不能默许高危操作执行' },
        { question: '用户点了允许，就能写工作区外吗？', decision: '不能，仍受 OS 沙箱约束', because: '审批与沙箱是叠加双闸门，批准只授予尝试权' },
        { question: '子 Agent 会不会绕过审批？', decision: '不会，事件沿 dsh-scope 向上穿透', because: '祖先作用域的 pre-execute 监听天然覆盖所有后代' },
      ],
      kpis: [
        kpi('防线数', '3 层 + 作用域兜底', 'good'),
        kpi('核心改动', '0 行（全插件）', 'good'),
        kpi('本课步骤', '6 步', 'neutral'),
      ],
      scene: swim(
        '完整安全审批链路全景时序',
        [
          { id: 'sub', label: '子/主 Agent', sublabel: 'tools.execute()', tone: 'violet' },
          { id: 'pre', label: 'pre-execute', sublabel: '策略 allow/ask/deny', tone: 'orange' },
          { id: 'usr', label: 'user-approval', sublabel: '人工确认 / 超时拒', tone: 'rose' },
          { id: 'sbx', label: 'dsh-sandbox', sublabel: 'OS 硬隔离执行', tone: 'green' },
        ],
        [
          { id: 's1', laneId: 'sub', start: 2, end: 18, label: '发起工具调用', tone: 'violet', status: 'done' },
          { id: 's2', laneId: 'pre', start: 18, end: 38, label: 'scope 冒泡 → 策略判 ask', tone: 'orange', status: 'done' },
          { id: 's3', laneId: 'usr', start: 38, end: 64, label: '人工审批通过（尝试权）', tone: 'rose', status: 'done' },
          { id: 's4', laneId: 'sbx', start: 64, end: 96, label: '沙箱边界内执行 → post-execute', tone: 'green', status: 'done' },
        ],
        [{ id: 'ev', laneId: 'sbx', pos: 80, label: '双闸门叠加', tone: 'green', emphasized: true }],
        [{ pos: 0, label: '发起' }, { pos: 38, label: '审批' }, { pos: 64, label: '沙箱' }, { pos: 100, label: '回写' }],
        undefined,
        [
          { fromLaneId: 'sub', fromPos: 18, toLaneId: 'pre', toPos: 20 },
          { fromLaneId: 'pre', fromPos: 38, toLaneId: 'usr', toPos: 40 },
          { fromLaneId: 'usr', fromPos: 64, toLaneId: 'sbx', toPos: 66 },
        ],
      ),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH5 · 1/2 · 合并重构：从 spine 到多形态产品（profile / bundle / patch）
// ---------------------------------------------------------------------------
export const L_PRODUCT_ASSEMBLY = lesson(
  'product-assembly',
  'ch05',
  5,
  '产品组装与源码对照',
  1,
  2,
  '从 spine 到多形态产品：profile / bundle / patch',
  '把核心套件 spine、定义/提供/使用三分工，与 profile / bundle / patch 四层配置叠加合在一起看：同一核心如何零分叉变出 web、headless、SDK、ACP。',
  15,
  '核心',
  [
    { text: '解释 spine 套件的留白原则与定义 / 提供 / 使用三种角色', completedAtStep: 2 },
    { text: '掌握 profile / bundle / patch 四层叠加顺序与 patch 整行替换语义', completedAtStep: 4 },
    { text: '用 --dump-config 验算配置树并理解 npx @deepseek-ai/dsh web 的启动链路', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: 'spine 的留白',
      badge: 'PROBLEM',
      title: 'spine 装机清单：只装每个 Agent 都需要的东西',
      paragraphs: [
        'DSH 的同一套核心可以组装出 Web 应用、命令行 headless、SDK 和 ACP 协议端。如果每种产品都靠 fork 分支改代码，核心很快分叉。DSH 的第一招是最小套件 `spine`：**只装每个 Agent 都需要的核心能力，把「连哪家模型」和「用什么入口」故意留在外面**。',
        '迷你版 `spine` 的 `apply` 就是连续 7 行 `ctx.plugin(...)`（`LlmRuntime`、`SessionStore`、`ToolRuntime`、`SystemPrompt`、`toolTime`、`toolFs`、`AgentLoop`）；真实 DSH 的 `agent-spine-demo` 是同一思路的工业版（20+ 插件），读源码从它入手最快。',
      ],
      sourceDrawer: namiSrc(
        'spine apply：无分支的装机清单',
        'packages/agent-spine/src/index.ts',
        'ts',
        `export function apply(ctx: Context, config: Config) {
  ctx.plugin(LlmRuntime)
  ctx.plugin(SessionStore)
  ctx.plugin(ToolRuntime)
  ctx.plugin(SystemPrompt, { persona: config.persona })
  ctx.plugin(toolTime)
  ctx.plugin(toolFs, { root: config.workspace })
  ctx.plugin(AgentLoop, config.agent)
}`,
        '模型适配器与入口插件故意不在 spine 里，由外层产品 profile 决定。',
      ),
      kpis: [
        kpi('迷你版 spine', '7 个核心插件', 'neutral'),
        kpi('模型 / 入口在内吗', '故意留白', 'good'),
        kpi('核心代码分叉', '0', 'good'),
      ],
      scene: tree(
        'spine 套件的边界：装什么、留白什么',
        [
          { id: 'spine', x: 500, y: 60, kind: 'root', label: 'agent-spine 套件', sublabel: '每个 Agent 的最小公共核', status: 'active' },
          { id: 'in1', x: 180, y: 200, kind: 'service', label: 'llm · tools', sublabel: '在套件内（定义接口）' },
          { id: 'in2', x: 500, y: 200, kind: 'service', label: 'sessions · systemPrompt', sublabel: '在套件内（记忆与提示）' },
          { id: 'in3', x: 820, y: 200, kind: 'plugin', label: 'agent-loop · 基础工具', sublabel: '在套件内（循环驱动）' },
          { id: 'out1', x: 280, y: 345, kind: 'plugin', label: '模型适配器', sublabel: '留在外面 · deepseek / mock', status: 'dimmed' },
          { id: 'out2', x: 720, y: 345, kind: 'plugin', label: '入口 webserver / CLI', sublabel: '留在外面 · 决定产品形态', status: 'dimmed' },
        ],
        [
          { from: 'spine', to: 'in1' },
          { from: 'spine', to: 'in2' },
          { from: 'spine', to: 'in3' },
          { from: 'spine', to: 'out1', label: '外部装配' },
          { from: 'spine', to: 'out2', label: '外部装配' },
        ],
      ),
    },
    {
      shortLabel: '三种角色与 dsh-base',
      badge: 'TECHNIQUE',
      title: '定义 / 提供 / 使用 + dsh-base 底座',
      paragraphs: [
        'DSH 的插件严格分成三种角色：**定义服务**（`llm`、`tools` 只定协议）、**提供实现**（`llm-deepseek`、`tool-fs` 注册实现并在卸载时自动注销）、**使用服务**（`agent-loop`、`webserver` 只认服务名）。',
        '在此之上，工业部署把约 90 个公共插件打成第一层底座 `dsh-base`（适配器、工具、持久化、沙箱、审批、凭据、遥测），再叠上 4 种产品层之一：`dsh-web-app`、`dsh-headless`、`dsh-sdk-app`、`dsh-acp-app`（默认部署共约 159 个插件）。',
      ],
      kpis: [
        kpi('插件角色', '定义 / 提供 / 使用', 'good'),
        kpi('dsh-base 底座', '约 90 插件', 'neutral'),
        kpi('默认完整部署', '约 159 插件', 'neutral'),
      ],
      scene: iso(
        '底座在下，产品在上：同一核心变出四种形态',
        [
          { id: 'web', x: 90, y: 60, label: 'dsh-web-app', sublabel: '网页入口', tone: 'blue', size: 'sm', icon: 'globe' },
          { id: 'head', x: 310, y: 60, label: 'dsh-headless', sublabel: '命令行', tone: 'green', size: 'sm', icon: 'terminal' },
          { id: 'sdk', x: 530, y: 60, label: 'dsh-sdk-app', sublabel: 'SDK 嵌入', tone: 'orange', size: 'sm', icon: 'package' },
          { id: 'acp', x: 740, y: 60, label: 'dsh-acp-app', sublabel: 'ACP 协议', tone: 'rose', size: 'sm', icon: 'plug' },
          { id: 'base', x: 180, y: 210, label: 'dsh-base（第一层底座 · ~90 插件）', sublabel: '定义 + 提供 + 安全审批 + 沙箱 + 持久化 + 遥测', tone: 'violet', size: 'platform', active: true, icon: 'layers', meter: { value: 90, label: '基础层占比' } },
          { id: 'cordis', x: 180, y: 350, label: 'Cordis 主板 + dsh-scope', sublabel: 'vendor/cordis · packages/dsh-scope', tone: 'dark', size: 'platform', icon: 'cpu' },
        ],
        [
          { from: 'web', to: 'base', packetCount: 1 },
          { from: 'head', to: 'base', packetCount: 1 },
          { from: 'sdk', to: 'base', packetCount: 1 },
          { from: 'acp', to: 'base', packetCount: 1 },
          { from: 'base', to: 'cordis', label: '全量挂在主板上', packetCount: 2, packetLabel: '插件树' },
        ],
        undefined,
        [{ x: 70, y: 38, w: 860, h: 92, label: '产品层（决定形态）', tone: 'blue' }],
      ),
    },
    {
      shortLabel: '四层叠加顺序',
      badge: 'SOLUTION',
      title: 'profile / bundle / patch：把组装写成四层配置',
      paragraphs: [
        '有了底座和产品层，怎么声明最终装什么？DSH 用三个数据概念：`profile` 是菜单（列出要装哪些 bundle 并附带 `cordis.patch.yml`），`bundle` 是打包好的插件配置行，`patch` 是按 `id` 改写或插入配置行。',
        '解析严格按四层顺序叠加，**越靠后优先级越高**：① 按 profile 顺序装 `bundles` → ② `profile patch`（`cordis.patch.yml`）→ ③ 家目录 `home patch` → ④ 命令行 `--patch`。',
      ],
      sourceDrawer: src(
        '四层叠加顺序（后者覆盖前者）',
        'harness home / profile 配置（示意）',
        `${DSH_REPO}`,
        'text',
        `解析优先级（低 → 高）：
1. bundles        —— 按 profile 列表依次展开（dsh-base → 产品层）
2. profile patch  —— profile 自带的 cordis.patch.yml
3. home patch     —— 用户家目录级个人覆盖
4. --patch        —— 单次命令行临时覆盖`,
        '组装是纯数据叠加，不靠代码分支。',
      ),
      kpis: [
        kpi('配置概念', 'profile / bundle / patch', 'neutral'),
        kpi('叠加层数', '4 层固定顺序', 'good'),
        kpi('优先级', '越靠后越高', 'good'),
      ],
      scene: swim(
        '四层配置叠加：从低优先级到高优先级',
        [
          { id: 'l1', label: '1 · bundles', sublabel: 'dsh-base → 产品层', tone: 'blue' },
          { id: 'l2', label: '2 · profile patch', sublabel: 'cordis.patch.yml', tone: 'violet' },
          { id: 'l3', label: '3 · home patch', sublabel: '家目录级覆盖', tone: 'orange' },
          { id: 'l4', label: '4 · --patch', sublabel: '命令行最高优', tone: 'rose' },
        ],
        [
          { id: 'b1', laneId: 'l1', start: 2, end: 56, label: '展开 bundles（约 90 → 159 插件）', tone: 'blue', status: 'done' },
          { id: 'b2', laneId: 'l2', start: 56, end: 72, label: 'profile 定制', tone: 'violet', status: 'done' },
          { id: 'b3', laneId: 'l3', start: 72, end: 85, label: '家目录改写', tone: 'orange', status: 'done' },
          { id: 'b4', laneId: 'l4', start: 85, end: 98, label: 'CLI 覆盖', tone: 'rose', status: 'done' },
        ],
        [{ id: 'e1', laneId: 'l4', pos: 92, label: '最终生效树', tone: 'rose', emphasized: true }],
        [{ pos: 0, label: '低优先级' }, { pos: 100, label: '高优先级' }],
      ),
    },
    {
      shortLabel: 'patch 整行替换',
      badge: 'INSIGHT',
      title: 'patch 的语义：按 id 整行替换，不做深合并',
      paragraphs: [
        '`patch` 找到匹配的 `id` 后是**整行替换**（或在指定位置插入新行），刻意不做嵌套字段的深度合并。虽然写 patch 时需要把完整配置行写全，但换来极高的确定性——看到这一行就知道最终生效的全部字段，不必在脑子里算四层深合并。',
        '常见踩坑：误以为只写一个 `model` 字段会保留旧行的其他参数，结果把原行其他配置覆盖掉了。修改前先用 `--dump-config` 导出原行对照。',
      ],
      callout: {
        kind: 'warn',
        title: '避坑提示',
        text: 'patch 不是 Object.assign / deepMerge，而是按 id 整行替换。改之前先 dump 出来看清完整字段。',
      },
      kpis: [
        kpi('替换粒度', '按 id 整行', 'neutral'),
        kpi('深度字段合并', '刻意不做', 'warn'),
        kpi('配置可预测性', '极高', 'good'),
      ],
      scene: iso(
        'patch 语义：整行替换，拒绝隐式合并',
        [
          { id: 'old', x: 70, y: 200, label: '旧行 id: llm', sublabel: 'provider: deepseek · model: v4', tone: 'neutral', dimmed: true },
          { id: 'patch', x: 380, y: 200, label: 'patch 命中 id', sublabel: '整行替换 · 旧字段不自动保留', tone: 'rose', active: true, icon: 'alert-triangle' },
          { id: 'new', x: 710, y: 200, label: '新行 id: llm', sublabel: '完整新配置生效', tone: 'green', icon: 'check-circle' },
        ],
        [
          { from: 'old', to: 'patch', label: '匹配 id', dashed: true, packetCount: 1, packetLabel: 'id' },
          { from: 'patch', to: 'new', label: '整行覆盖', status: 'active', packetCount: 2, packetLabel: '新行' },
        ],
      ),
    },
    {
      shortLabel: '验算与启动',
      badge: 'TECHNIQUE',
      title: '真相来源 --dump-config 与 npx @deepseek-ai/dsh web',
      paragraphs: [
        '想知道叠加四层之后到底装了什么？执行 `dsh --profile web --dump-config`，直接打印解析后的完整配置树——调不通先看它，而不是猜。',
        '顺带印证一个事实：CLI 只硬编码了 `web` 和 `plugin` 两个子命令，`headless`、`run` 只是 profile 名。执行 `npx @deepseek-ai/dsh web`（需 Node ≥ 22）会按 `web` profile 装配插件并默认监听 `127.0.0.1:3080`——默认只绑本机，同样体现 fail-closed 思想。',
      ],
      sourceDrawer: src(
        '验算配置树 & 启动 Web UI',
        '终端命令',
        `${DSH_REPO}`,
        'text',
        `# 1. 打印四层叠加后的最终配置树（真相来源）
$ dsh --profile web --dump-config

# 2. 按 web profile 装配并启动本机 Web UI（Node >= 22）
$ npx @deepseek-ai/dsh web
# Listening on http://127.0.0.1:3080`,
        '基线 0.1.0-rc.5；默认仅监听 127.0.0.1，不对外网暴露。',
      ),
      kpis: [
        kpi('硬编码子命令', '仅 web / plugin', 'good'),
        kpi('默认监听', '127.0.0.1:3080', 'good'),
        kpi('真相来源', '--dump-config', 'good'),
      ],
      scene: swim(
        'npx @deepseek-ai/dsh web 启动全流程',
        [
          { id: 'cli', label: 'CLI 入口', sublabel: 'web / plugin 子命令', tone: 'blue' },
          { id: 'cfg', label: '配置解析器', sublabel: 'bundle + 3 层 patch', tone: 'violet' },
          { id: 'app', label: 'Cordis 实例', sublabel: '挂载插件树 + 监听', tone: 'green' },
        ],
        [
          { id: 'a', laneId: 'cli', start: 2, end: 24, label: '命中 web 子命令', tone: 'blue', status: 'done' },
          { id: 'b', laneId: 'cfg', start: 26, end: 58, label: '四层叠加 → 配置树', tone: 'violet', status: 'done' },
          { id: 'c', laneId: 'app', start: 60, end: 96, label: '挂插件 → 监听 127.0.0.1:3080', tone: 'green', status: 'done' },
        ],
        [{ id: 'ev', laneId: 'app', pos: 78, label: 'Web UI 就绪', tone: 'green', emphasized: true }],
        [{ pos: 0, label: '命令' }, { pos: 58, label: '配置就绪' }, { pos: 100, label: '可访问' }],
      ),
    },
    {
      shortLabel: '装机复盘',
      badge: 'RECAP',
      title: '产品组装三句话',
      paragraphs: [
        '最小套件 `spine` 只装公共核、把模型与入口留白；插件按「定义 / 提供 / 使用」三分工解耦；产品形态靠 `profile + bundle + patch` 四层纯数据叠加切换，并用 `--dump-config` 验算真相。',
        '最后一课回到原点：把 680 行迷你版和 2693 行真 Cordis 摆在一起对照，看清工程复杂度到底花在哪里。',
      ],
      recapTable: [
        { question: '一套核心怎么变出多种产品？', decision: 'spine 留白 + profile/bundle/patch 四层叠加', because: '产品差异是配置数据差异，不是代码分叉' },
        { question: 'patch 冲突或改字段怎么算？', decision: '越靠后优先级越高；按 id 整行替换', because: '拒绝隐式深合并，配置结果完全可预测' },
        { question: '怎么确认最终生效了什么？', decision: '运行 dsh --profile web --dump-config', because: '解析树是唯一真相来源，CLI 也只硬编码 web/plugin' },
      ],
      kpis: [
        kpi('复用底座', 'spine + dsh-base', 'good'),
        kpi('产品形态', '4 种零分叉', 'good'),
        kpi('本课步骤', '6 步', 'neutral'),
      ],
      scene: tree(
        '从 spine 留白到多形态产品',
        [
          { id: 'sp', x: 500, y: 60, kind: 'root', label: 'spine / dsh-base', sublabel: '公共核 + 底座', status: 'active' },
          { id: 'cfg', x: 240, y: 200, kind: 'service', label: 'profile + patch', sublabel: '四层叠加 · 整行替换' },
          { id: 'adp', x: 500, y: 200, kind: 'plugin', label: '模型适配器', sublabel: 'deepseek / mock' },
          { id: 'ent', x: 760, y: 200, kind: 'plugin', label: '入口插件', sublabel: 'web / headless / SDK / ACP' },
          { id: 'out', x: 500, y: 345, kind: 'log', label: '最终产品配置树', sublabel: '--dump-config 验算', status: 'highlight' },
        ],
        [
          { from: 'sp', to: 'cfg' },
          { from: 'sp', to: 'adp' },
          { from: 'sp', to: 'ent' },
          { from: 'cfg', to: 'out', animated: true },
          { from: 'adp', to: 'out' },
          { from: 'ent', to: 'out' },
        ],
      ),
    },
  ]),
);

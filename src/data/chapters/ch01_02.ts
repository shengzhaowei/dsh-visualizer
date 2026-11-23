// 第 1–2 章：理念与分层、Cordis 主板（前半）
// 内容依据：NamiDSH docs/01、02、03 与 DSH 公开资料；示意数字已在文内注明。
import { chapter, dshSrc, DSH_REPO, iso, kpi, lesson, namiSrc, src, steps, swim, tree } from '../helpers';

const L1 = lesson(
  'plugin-everything',
  'ch01',
  1,
  '理念与分层',
  1,
  2,
  '一切皆插件',
  'DeepSeek Harness 最核心的设计：模型、工具、会话、提示词，连 Agent 循环本身，都是插在同一块主板上的插件。',
  12,
  '入门',
  [
    { text: '说清「一切皆插件」指的是什么：谁是插件，谁是主板', completedAtStep: 2 },
    { text: '用换模型、加审批、卸载清理三个问题验算这套设计', completedAtStep: 4 },
    { text: '画出 DSH 的两层全貌：上层插件，下层 Cordis 框架', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '先看骨架',
      badge: 'PROBLEM',
      title: '一百多万行代码，先看骨架',
      paragraphs: [
        'DeepSeek Harness（DSH）有一百多万行代码，直接读源码很吃力。但它的骨架其实只有一个想法：`一切皆插件`。模型、工具、会话、提示词，连 Agent 循环本身，都是插在同一块「主板」上的卡。',
        '这块主板叫 `Cordis`，来自 Koishi 生态，DSH 把它 vendored 进仓库（`vendor/cordis`）。读懂 Cordis，就读懂了 DSH 的骨架——仓库里有 519 个文件 import 了它。',
      ],
      kpis: [kpi('代码规模', '约 100 万行', 'neutral'), kpi('骨架想法', '1 个', 'good'), kpi('import Cordis 的文件', '519 个', 'neutral')],
      scene: iso('DSH 全貌：插件插在 Cordis 主板上', [
        { id: 'cordis', x: 180, y: 420, label: 'Cordis 主板', sublabel: 'vendor/cordis · Context / Fiber / 服务表 / 事件总线', tone: 'dark', size: 'platform', icon: 'layers' },
        { id: 'loop', x: 120, y: 180, label: 'agent-loop', sublabel: 'Agent 循环', tone: 'violet', active: true, icon: 'refresh-cw' },
        { id: 'llm', x: 330, y: 180, label: 'llm', sublabel: '模型服务', tone: 'blue', icon: 'brain' },
        { id: 'tools', x: 540, y: 180, label: 'tools', sublabel: '工具表', tone: 'orange', icon: 'wrench' },
        { id: 'sessions', x: 750, y: 180, label: 'sessions', sublabel: '会话存储', tone: 'green', icon: 'database' },
        { id: 'prompt', x: 410, y: 60, label: 'system-prompt', sublabel: '提示词组装', tone: 'rose', size: 'sm', icon: 'message-square-text' },
      ], [
        { from: 'loop', to: 'cordis', label: '挂载', packetCount: 2, packetLabel: '挂载' },
        { from: 'llm', to: 'cordis', packetCount: 1, packetLabel: 'llm' },
        { from: 'tools', to: 'cordis', packetCount: 1, packetLabel: 'tools' },
        { from: 'sessions', to: 'cordis', packetCount: 1, packetLabel: 'sessions' },
        { from: 'prompt', to: 'loop', dashed: true, label: '提供段落', packetCount: 1, packetLabel: '段落' },
      ], [{ x: 620, y: 120, text: '没有特权内核', tone: 'violet' }], [{ x: 80, y: 40, w: 840, h: 300, label: '插件层', tone: 'violet' }, { x: 160, y: 400, w: 680, h: 104, label: 'Cordis 主板', tone: 'dark' }]),
    },
    {
      shortLabel: '插件的定义',
      badge: 'TECHNIQUE',
      title: '插件的定义：挂在主板上的卡',
      paragraphs: [
        '在 DSH 里，`每个功能都是一个插件`。Agent 循环是插件，DeepSeek 模型接入是插件，读文件的工具是插件，会话存储也是插件。',
        '插件之间不互相 `import`。它们只认服务名（`ctx.llm`、`ctx.tools`）和事件名（`tools/pre-execute`、`agent/text-delta`）。插件挂在一个框架上，框架负责：谁先启动、谁在等谁、谁卸载时要清理什么。',
      ],
      callout: { kind: 'idea', title: '关键区分', text: '「一切皆插件」的另一面是「没有特权内核」：Agent 循环和一个读文件的小工具，在框架眼里是同一种东西。' },
      kpis: [kpi('插件间 import', '0 次', 'good'), kpi('约定的名字', '服务名 + 事件名', 'neutral'), kpi('启动顺序', '框架决定', 'neutral')],
      scene: tree('一棵插件树：根在 new Context()', [
        { id: 'root', x: 500, y: 60, kind: 'root', label: 'new Context()', sublabel: '根 ctx', status: 'active' },
        { id: 'spine', x: 500, y: 180, kind: 'plugin', label: 'agent-spine', sublabel: '套件插件', status: 'highlight' },
        { id: 'llm', x: 180, y: 320, kind: 'service', label: 'llm', sublabel: 'LlmRuntime' },
        { id: 'tools', x: 380, y: 320, kind: 'service', label: 'tools', sublabel: 'ToolRuntime' },
        { id: 'loop', x: 580, y: 320, kind: 'plugin', label: 'agent-loop', sublabel: 'AgentLoop', status: 'highlight' },
        { id: 'sess', x: 780, y: 320, kind: 'service', label: 'sessions', sublabel: 'SessionStore' },
        { id: 'ds', x: 180, y: 460, kind: 'plugin', label: 'llm-deepseek', sublabel: '适配器' },
        { id: 'time', x: 380, y: 460, kind: 'plugin', label: 'tool-time', sublabel: 'get_time' },
      ], [
        { from: 'root', to: 'spine' },
        { from: 'spine', to: 'llm' },
        { from: 'spine', to: 'tools' },
        { from: 'spine', to: 'loop' },
        { from: 'spine', to: 'sess' },
        { from: 'llm', to: 'ds', label: '注册适配器' },
        { from: 'tools', to: 'time', label: '登记工具' },
      ]),
    },
    {
      shortLabel: 'AgentLoop',
      badge: 'SOLUTION',
      title: 'AgentLoop 的开头只有声明，没有模型',
      paragraphs: [
        'DSH 里负责 Agent 循环的是 `packages/core/agent-loop`。它的开头没有出现任何具体的模型，也没有出现任何具体的工具，只声明了一件事：我需要 `llm`、`tools`、`sessions` 这几样东西，名字叫这个就行，谁提供的我不关心。',
        '循环调模型时也不 import 模型：它调的是 `this.loopCtx.llm.stream(request)`。`llm` 是服务名，背后是哪家模型，由插上去的适配器插件决定。',
      ],
      sourceDrawer: dshSrc(
        'AgentLoop：只声明依赖，不 import 模型',
        'packages/core/agent-loop/src/index.ts',
        'ts',
        `export class AgentLoop extends Service implements AgentFactory {
  static inject = ['agents', 'sessions', 'llm', 'tools', 'systemPrompt']

  constructor(ctx: Context, config: Config) {
    super(ctx, 'agentLoop')
    ctx.effect(() => ctx.agents.setFactory(this))
    // ...
  }
}`,
        '引自 NamiDSH docs/01 对 DSH 源码的引用。static inject 是依赖声明，setFactory 用 effect 登记，卸载自动撤销。',
      ),
      kpis: [kpi('inject 声明的服务', '5 个', 'good'), kpi('import 的具体模型', '0 个', 'good'), kpi('import 的具体工具', '0 个', 'good')],
      scene: iso('AgentLoop 只认服务名', [
        { id: 'loop', x: 400, y: 200, label: 'AgentLoop', sublabel: 'static inject = [agents, sessions, llm, tools, systemPrompt]', tone: 'violet', size: 'lg', active: true },
        { id: 'llm', x: 120, y: 80, label: 'ctx.llm', sublabel: 'LlmRuntime', tone: 'blue' },
        { id: 'tools', x: 700, y: 80, label: 'ctx.tools', sublabel: 'ToolRuntime', tone: 'orange' },
        { id: 'sess', x: 120, y: 380, label: 'ctx.sessions', sublabel: 'SessionStore', tone: 'green' },
        { id: 'prompt', x: 700, y: 380, label: 'ctx.systemPrompt', sublabel: 'SystemPrompt', tone: 'rose' },
      ], [
        { from: 'loop', to: 'llm', label: 'stream()', packetCount: 1, packetLabel: 'stream' },
        { from: 'loop', to: 'tools', label: 'execute()', packetCount: 1, packetLabel: 'execute' },
        { from: 'loop', to: 'sess', label: 'append()', packetCount: 1, packetLabel: 'append' },
        { from: 'loop', to: 'prompt', label: '组装', packetCount: 1, packetLabel: '提示词' },
      ]),
    },
    {
      shortLabel: '三个问题',
      badge: 'INSIGHT',
      title: '三个问题，验算这套设计',
      paragraphs: [
        '只看概念有点虚。换成三个具体问题，价值就清楚了。第一，`换一家模型，要改多少代码？`一行都不改：模型接入是一个插件，拔掉 DeepSeek 插件、插上另一家，Agent 循环完全不知道发生了什么。',
        '第二，`想在工具执行前加一道审批，要改哪里？`不改工具，也不改循环。工具执行要经过 `tools/pre-execute` 事件，挂一个监听，想拦就拦。DSH 里的权限、沙箱、超时，都是这么挂上去的。第三，`一个插件卸载了，它注册的东西会不会留下垃圾？`不会：每一件注册都记在插件自己名下，卸载时由框架统一撤销。',
      ],
      kpis: [kpi('换模型改动', '0 行', 'good'), kpi('加审批改动', '0 行核心代码', 'good'), kpi('卸载残留', '0', 'good')],
      scene: swim('三个问题，三种零改动', [
        { id: 'model', label: '换模型', sublabel: '拔掉 deepseek，插上别家', tone: 'blue' },
        { id: 'guard', label: '加审批', sublabel: '挂 tools/pre-execute 监听', tone: 'orange' },
        { id: 'unload', label: '卸载插件', sublabel: '注册随插件一起撤销', tone: 'green' },
      ], [
        { id: 'm1', laneId: 'model', start: 4, end: 40, label: '拔掉适配器插件', tone: 'blue', status: 'done' },
        { id: 'm2', laneId: 'model', start: 44, end: 88, label: '插上新适配器 · 循环无感知', tone: 'blue', status: 'done' },
        { id: 'g1', laneId: 'guard', start: 4, end: 50, label: '监听 tools/pre-execute', tone: 'orange', status: 'done' },
        { id: 'g2', laneId: 'guard', start: 54, end: 88, label: '拦截 / 放行 · 工具与循环不动', tone: 'orange', status: 'done' },
        { id: 'u1', laneId: 'unload', start: 4, end: 46, label: '插件 UNLOADING', tone: 'green', status: 'done' },
        { id: 'u2', laneId: 'unload', start: 50, end: 88, label: '账本倒序撤销 · 无残留', tone: 'green', status: 'done' },
      ], [
        { id: 'e1', laneId: 'model', pos: 42, label: '0 行改动', tone: 'blue', emphasized: true },
        { id: 'e2', laneId: 'guard', pos: 52, label: '只加监听', tone: 'orange' },
      ], [{ pos: 0, label: '开始' }, { pos: 50, label: '中途' }, { pos: 100, label: '完成' }]),
    },
    {
      shortLabel: '为什么做迷你版',
      badge: 'TECHNIQUE',
      title: '为什么要做一个迷你版',
      paragraphs: [
        'DSH 的 Cordis 本身就有 2693 行，里面有大量工程细节：调用栈追踪、作用域隔离、可调用服务、类型体操。第一次读源码，很容易陷在细节里，看不清主线。',
        '所以作者 @antiAIvo 做了 NamiDSH，一个按原样缩小的复刻版：迷你版 Cordis 约 680 行，文件结构和真 Cordis 一一对应，API 名字也一样；迷你版 DSH 是 11 个包，名字对应 DSH 的同名包。更关键的是验证：14 个测试场景分别跑在迷你版和真 Cordis 上，输出逐行一致。',
      ],
      sourceDrawer: namiSrc(
        '同一份测试，跑两边实现',
        'tests/compat.ts',
        'ts',
        `// 测试代码不 import 任何一边，运行时决定加载哪个实现
const lib = await import(
  process.env.CORDIS || '../packages/cordis/src/index.ts'
)
const { Context, Service } = lib`,
        '不设环境变量跑迷你版；CORDIS 指向 DSH 仓库里编译好的真 Cordis，就跑真 Cordis。114 行输出逐行一致。',
      ),
      kpis: [kpi('真 Cordis', '2693 行', 'neutral'), kpi('迷你版 Cordis', '约 680 行', 'good'), kpi('对照场景', '14 个', 'good')],
      scene: tree('迷你版 vs 真 Cordis：文件一一对应', [
        { id: 'real', x: 300, y: 60, kind: 'root', label: '真 Cordis · 2693 行', sublabel: 'vendor/cordis/src' },
        { id: 'mini', x: 700, y: 60, kind: 'root', label: '迷你 Cordis · 约 680 行', sublabel: 'packages/cordis/src' },
        { id: 'f1', x: 120, y: 200, kind: 'plugin', label: 'fiber.ts', sublabel: '754 → 329' },
        { id: 'f2', x: 300, y: 200, kind: 'plugin', label: 'reflect.ts', sublabel: '418 → 122' },
        { id: 'f3', x: 480, y: 200, kind: 'plugin', label: 'events.ts', sublabel: '352 → 107' },
        { id: 'f4', x: 660, y: 200, kind: 'plugin', label: 'registry.ts', sublabel: '337 → 129' },
        { id: 'f5', x: 840, y: 200, kind: 'plugin', label: 'context.ts', sublabel: '146 → 89' },
        { id: 'svc', x: 500, y: 340, kind: 'service', label: 'service.ts', sublabel: '115 → 27 · Service 基类' },
        { id: 'test', x: 500, y: 470, kind: 'event', label: 'tests/compat.ts', sublabel: '14 场景 · 114 行输出一致', status: 'highlight' },
      ], [
        { from: 'real', to: 'f1' }, { from: 'real', to: 'f2' }, { from: 'real', to: 'f3' },
        { from: 'mini', to: 'f4' }, { from: 'mini', to: 'f5' },
        { from: 'f3', to: 'svc' }, { from: 'f4', to: 'svc' },
        { from: 'svc', to: 'test', label: '同一份测试跑两边', animated: true },
      ]),
    },
    {
      shortLabel: '两层全貌',
      badge: 'RECAP',
      title: '全貌：上层插件，下层框架',
      paragraphs: [
        '整个项目可以画成两层：上层是插件（`webserver`、`agent-loop`、`llm`、`tools`、`session`、`system-prompt`，还有模型适配器和工具插件），对应 DSH 的 `packages/*`；下层是框架（`Context`、`Registry`、`Fiber`、服务表、事件总线），对应 DSH 的 `vendor/cordis`。',
        '建议的学习顺序：先把这张图从头到尾点一遍，再按第 2–5 课拆框架，最后用第 6 课把 11 个插件搭成一个能对话的 Agent，第 7 课（本课第 14 课）再回到真 Cordis 逐行对照。',
      ],
      recapTable: [
        { question: 'DSH 这么大，从哪下手？', decision: '先看骨架：一切皆插件 + Cordis 主板', because: '519 个文件 import Cordis，骨架决定了其余一切的组织方式' },
        { question: '插件之间怎么协作？', decision: '只认服务名和事件名，不互相 import', because: '名字是唯一的耦合点，换实现、加能力都不用改调用方' },
        { question: '迷你版可信吗？', decision: '可信：14 个场景双实现输出逐行一致', because: '比的不只是结果，还有状态变化的先后顺序' },
      ],
      kpis: [kpi('全貌层数', '2 层', 'good'), kpi('迷你版包数', '11 个', 'neutral'), kpi('本课步骤', '6 步', 'neutral')],
      scene: iso('两层全貌', [
        { id: 'apps', x: 180, y: 60, label: '上层：插件 packages/*', sublabel: 'webserver · agent-loop · llm · tools · session · system-prompt', tone: 'violet', size: 'platform', icon: 'package' },
        { id: 'cordis', x: 180, y: 420, label: '下层：框架 vendor/cordis', sublabel: 'Context · Registry · Fiber · 服务表 · 事件总线', tone: 'dark', size: 'platform', icon: 'layers' },
        { id: 'adapter', x: 120, y: 220, label: '模型适配器', sublabel: 'llm-deepseek / llm-mock', tone: 'blue', icon: 'brain' },
        { id: 'toolp', x: 700, y: 220, label: '工具插件', sublabel: 'tool-fs · tool-time', tone: 'orange', icon: 'wrench' },
      ], [
        { from: 'adapter', to: 'cordis', packetCount: 1, packetLabel: '适配器' },
        { from: 'toolp', to: 'cordis', packetCount: 1, packetLabel: '工具' },
        { from: 'apps', to: 'adapter', dashed: true, packetCount: 1 },
        { from: 'apps', to: 'toolp', dashed: true, packetCount: 1 },
      ], undefined, [{ x: 100, y: 40, w: 800, h: 100, label: '上层：插件', tone: 'violet' }, { x: 100, y: 200, w: 800, h: 100, label: '接入层', tone: 'blue' }, { x: 160, y: 400, w: 680, h: 104, label: '下层：框架', tone: 'dark' }]),
    },
  ]),
);

const L2 = lesson(
  'profile-bundle-patch',
  'ch01',
  1,
  '理念与分层',
  2,
  2,
  '分层叠加：profile / bundle / patch',
  '同一套核心怎么变出 web、headless、SDK、ACP 多种产品？答案不是改代码，而是把组合写成配置，再一层一层叠上去。',
  14,
  '核心',
  [
    { text: '区分 profile、bundle、patch 三个概念', completedAtStep: 2 },
    { text: '说出四层叠加顺序，并解释 patch 为何是整行替换', completedAtStep: 4 },
    { text: '用 dsh --profile web --dump-config 验算解析结果', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '同一核心多产品',
      badge: 'PROBLEM',
      title: '同一套核心，怎么变出多种产品',
      paragraphs: [
        'DSH 的同一套核心，可以组装成命令行工具、网页应用、编辑器插件等多种产品。如果每种产品都靠改代码、fork 分支来做，核心很快会分叉，改一处 bug 要同步多处。',
        'DSH 的解法是把「组装」本身变成配置：`profile` 是一份命名的组合清单，`bundle` 是一组插件的打包，`patch` 是对组合的修改。三者都是数据，不是代码。',
      ],
      kpis: [kpi('产品形态', 'web / headless / SDK / ACP', 'neutral'), kpi('组装方式', '配置，不是代码', 'good'), kpi('核心分叉', '0', 'good')],
      scene: iso('一套核心，多种产品', [
        { id: 'core', x: 400, y: 230, label: '同一套核心', sublabel: 'agent-loop · llm · tools · sessions · system-prompt', tone: 'violet', size: 'lg', active: true, icon: 'refresh-cw' },
        { id: 'web', x: 60, y: 60, label: 'dsh-web-app', sublabel: '网页应用', tone: 'blue', size: 'sm', icon: 'globe' },
        { id: 'head', x: 340, y: 60, label: 'dsh-headless', sublabel: '命令行', tone: 'green', size: 'sm', icon: 'terminal' },
        { id: 'sdk', x: 620, y: 60, label: 'dsh-sdk-app', sublabel: 'SDK', tone: 'orange', size: 'sm', icon: 'package' },
        { id: 'acp', x: 800, y: 60, label: 'dsh-acp-app', sublabel: 'ACP 协议', tone: 'rose', size: 'sm', icon: 'plug' },
        { id: 'base', x: 180, y: 420, label: 'dsh-base（第一层）', sublabel: '约 90 个插件', tone: 'dark', size: 'platform', icon: 'layers', meter: { value: 90, label: '插件规模' } },
      ], [
        { from: 'core', to: 'web', packetCount: 1, packetLabel: 'bundle' },
        { from: 'core', to: 'head', packetCount: 1, packetLabel: 'bundle' },
        { from: 'core', to: 'sdk', packetCount: 1, packetLabel: 'bundle' },
        { from: 'core', to: 'acp', packetCount: 1, packetLabel: 'bundle' },
        { from: 'base', to: 'core', label: '先装 base', packetCount: 2, packetLabel: '插件' },
      ], undefined, [{ x: 40, y: 40, w: 920, h: 100, label: '产品层', tone: 'blue' }, { x: 160, y: 400, w: 680, h: 104, label: 'dsh-base', tone: 'dark' }]),
    },
    {
      shortLabel: '三个概念',
      badge: 'TECHNIQUE',
      title: '三个概念：profile、bundle、patch',
      paragraphs: [
        '`profile` 是一份命名的组合：在 harness home（家目录配置）里列出若干 bundle，再加上自己的一份 `cordis.patch.yml`。`bundle` 是 Cordis 的配置行加代码：每行配置声明挂哪个插件、带什么参数。',
        '`patch` 是对组合的修改：按 `id` 替换一整行配置，或者插入一行新配置。profile、bundle、patch 三者分工明确：profile 说「用什么」，bundle 说「有什么」，patch 说「改什么」。',
      ],
      callout: { kind: 'tip', title: '记忆口诀', text: 'profile 是菜单，bundle 是菜，patch 是「这道菜不要香菜」——改的是整道菜，不是调料。' },
      kpis: [kpi('概念数', '3 个', 'neutral'), kpi('dsh-base 插件', '约 90 个', 'neutral'), kpi('默认部署插件', '约 159 个', 'neutral')],
      scene: tree('profile → bundle → 插件', [
        { id: 'profile', x: 500, y: 60, kind: 'root', label: 'profile: web', sublabel: '命名的组合', status: 'active' },
        { id: 'b1', x: 240, y: 190, kind: 'plugin', label: 'dsh-base', sublabel: 'bundle · 约 90 插件' },
        { id: 'b2', x: 500, y: 190, kind: 'plugin', label: 'dsh-web-app', sublabel: 'bundle · 网页入口' },
        { id: 'b3', x: 760, y: 190, kind: 'plugin', label: 'cordis.patch.yml', sublabel: 'profile 自身的 patch' },
        { id: 'p1', x: 120, y: 320, kind: 'service', label: '模型适配器', sublabel: 'llm-deepseek' },
        { id: 'p2', x: 360, y: 320, kind: 'service', label: '工具与沙箱', sublabel: 'tools · sandbox' },
        { id: 'p3', x: 620, y: 320, kind: 'service', label: '审批与凭据', sublabel: 'approval · credentials' },
        { id: 'p4', x: 860, y: 320, kind: 'service', label: '持久化与遥测', sublabel: 'session · telemetry' },
      ], [
        { from: 'profile', to: 'b1' },
        { from: 'profile', to: 'b2' },
        { from: 'profile', to: 'b3' },
        { from: 'b1', to: 'p1' },
        { from: 'b1', to: 'p2' },
        { from: 'b2', to: 'p3' },
        { from: 'b2', to: 'p4' },
      ]),
    },
    {
      shortLabel: '叠加顺序',
      badge: 'SOLUTION',
      title: '叠加顺序：bundle 在先，patch 在后',
      paragraphs: [
        '解析一层一层来，顺序是固定的：先按 profile 里的顺序装各个 bundle，再叠 profile 自身的 patch，然后是 home（家目录）的 patch，最后是命令行 `--patch` 带来的覆盖。',
        '这个顺序就是优先级：越靠后的层，越能改写前面的结果。想知道最终装了什么，不用猜，看解析结果就行。',
      ],
      sourceDrawer: src(
        '四层叠加顺序（示意）',
        'harness home / profile 配置（示意）',
        `${DSH_REPO}`,
        'text',
        `叠加顺序（后者覆盖前者）：
1. bundles —— 按 profile 里的顺序
2. profile patch —— cordis.patch.yml
3. home patch —— 家目录级 patch
4. --patch —— 命令行覆盖`,
        '示意文本：顺序来自 DSH 公开的组合机制说明，具体字段以仓库实际配置为准。',
      ),
      kpis: [kpi('叠加层', '4 层', 'good'), kpi('替换粒度', '整行配置', 'neutral'), kpi('优先级', '越后越高', 'neutral')],
      scene: swim('四层叠加：越靠后，优先级越高', [
        { id: 'l1', label: '1 · bundles', sublabel: '按 profile 顺序', tone: 'blue' },
        { id: 'l2', label: '2 · profile patch', sublabel: 'cordis.patch.yml', tone: 'violet' },
        { id: 'l3', label: '3 · home patch', sublabel: '家目录级', tone: 'orange' },
        { id: 'l4', label: '4 · --patch', sublabel: '命令行覆盖', tone: 'rose' },
      ], [
        { id: 'b1', laneId: 'l1', start: 2, end: 60, label: '装 bundle：dsh-base → dsh-web-app', tone: 'blue', status: 'done' },
        { id: 'b2', laneId: 'l2', start: 60, end: 74, label: '替换 / 插入配置行', tone: 'violet', status: 'done' },
        { id: 'b3', laneId: 'l3', start: 74, end: 86, label: '家目录级改写', tone: 'orange', status: 'done' },
        { id: 'b4', laneId: 'l4', start: 86, end: 98, label: '命令行最终覆盖', tone: 'rose', status: 'done' },
      ], [{ id: 'e1', laneId: 'l4', pos: 98, label: '最终配置', tone: 'rose', emphasized: true }], [{ pos: 0, label: '低优先级' }, { pos: 100, label: '高优先级' }]),
    },
    {
      shortLabel: 'patch 语义',
      badge: 'INSIGHT',
      title: 'patch 的语义：整行替换，不是字段合并',
      paragraphs: [
        '`patch` 按 `id` 找到一行配置，整行替换掉；或者在指定位置插入一行新配置。它不做字段级合并——这正是它可预测的原因：你看到 patch，就知道最终是哪一行配置生效，不用在心里做多层合并运算。',
        '代价是 patch 写起来要完整：一行配置被替换后，旧行里的字段不会自动保留。改一行之前，先看清它原来的全部内容。',
      ],
      callout: { kind: 'warn', title: '常见坑', text: '以为 patch 是「只改一个字段」的人，经常在替换后丢掉旧行的其他字段。替换前先 dump 出来对照。' },
      kpis: [kpi('替换单位', '整行', 'neutral'), kpi('字段合并', '不做', 'warn'), kpi('可预测性', '高', 'good')],
      scene: iso('patch：按 id 整行替换', [
        { id: 'old', x: 120, y: 200, label: '旧配置行 id: llm', sublabel: 'provider: deepseek · model: v4', tone: 'neutral', dimmed: true },
        { id: 'patch', x: 420, y: 200, label: 'patch', sublabel: 'id: llm → 整行新内容', tone: 'rose', active: true },
        { id: 'new', x: 720, y: 200, label: '新配置行 id: llm', sublabel: 'provider: deepseek · model: 新模型', tone: 'green' },
      ], [
        { from: 'old', to: 'patch', label: '按 id 找到', dashed: true, packetCount: 1, packetLabel: 'id' },
        { from: 'patch', to: 'new', label: '整行替换', status: 'active', packetCount: 2, packetLabel: '新配置' },
      ], [{ x: 500, y: 120, text: '旧行字段不会自动保留', tone: 'rose' }]),
    },
    {
      shortLabel: 'dsh-base',
      badge: 'TECHNIQUE',
      title: 'dsh-base：第一层装了什么',
      paragraphs: [
        '`dsh-base` 是叠加的第一层，约 90 个插件：模型适配器、工具、持久化、沙箱、审批、凭据、遥测。它们是每种产品形态都需要的公共能力。',
        '然后才是产品层：`dsh-web-app`、`dsh-headless`、`dsh-sdk-app`、`dsh-acp-app` 各自只加自己那份入口与形态相关的插件。默认部署大约 159 个插件——这个数字会随版本变化，重要的是分层思路，而不是具体数字。',
      ],
      kpis: [kpi('dsh-base', '约 90 个插件', 'neutral'), kpi('默认部署', '约 159 个插件', 'neutral'), kpi('产品层', '4 个', 'neutral')],
      scene: iso('分层：base 在下，产品在上', [
        { id: 'web', x: 120, y: 60, label: 'dsh-web-app', sublabel: '网页入口', tone: 'blue', size: 'sm', icon: 'globe' },
        { id: 'head', x: 300, y: 60, label: 'dsh-headless', sublabel: '命令行', tone: 'green', size: 'sm', icon: 'terminal' },
        { id: 'sdk', x: 480, y: 60, label: 'dsh-sdk-app', sublabel: 'SDK', tone: 'orange', size: 'sm', icon: 'package' },
        { id: 'acp', x: 660, y: 60, label: 'dsh-acp-app', sublabel: 'ACP', tone: 'rose', size: 'sm', icon: 'plug' },
        { id: 'base', x: 180, y: 200, label: 'dsh-base', sublabel: '模型适配器 · 工具 · 持久化 · 沙箱 · 审批 · 凭据 · 遥测', tone: 'dark', size: 'platform', icon: 'layers' },
        { id: 'cordis', x: 180, y: 330, label: 'Cordis 主板', sublabel: 'vendor/cordis', tone: 'dark', size: 'platform', icon: 'cpu' },
      ], [
        { from: 'web', to: 'base', packetCount: 1 },
        { from: 'head', to: 'base', packetCount: 1 },
        { from: 'sdk', to: 'base', packetCount: 1 },
        { from: 'acp', to: 'base', packetCount: 1 },
        { from: 'base', to: 'cordis', label: '都挂在 Cordis 上', packetCount: 2, packetLabel: '挂载' },
      ], undefined, [{ x: 100, y: 40, w: 800, h: 92, label: '产品层', tone: 'blue' }, { x: 160, y: 180, w: 680, h: 104, label: 'dsh-base', tone: 'dark' }, { x: 160, y: 310, w: 680, h: 104, label: 'Cordis', tone: 'dark' }]),
    },
    {
      shortLabel: '导出配置',
      badge: 'RECAP',
      title: 'dump-config 是真相来源',
      paragraphs: [
        '组合写得再清楚，也可能和实际生效的不一致。DSH 提供了验算命令：`dsh --profile web --dump-config`，打印解析后的完整配置树。调不通时先看它，而不是猜。',
        '顺带一提，CLI 只硬编码了 `web` 和 `plugin` 两个子命令；`headless`、`run` 这些只是 profile 的名字，不是写死在 CLI 里的命令——这本身就是「组合是配置」的证据。',
      ],
      sourceDrawer: src(
        '验算解析结果',
        '终端（示意）',
        `${DSH_REPO}`,
        'text',
        `$ dsh --profile web --dump-config
# 打印解析后的完整配置树：
# bundles → profile patch → home patch → --patch
# 逐层叠加后的最终结果`,
        '命令名来自 DSH 公开说明；输出为示意，实际输出以所装版本为准。',
      ),
      recapTable: [
        { question: '一套核心怎么变出多种产品？', decision: 'profile + bundle + patch，三层配置叠加', because: '组装是数据，改组合不用改代码、不产生分叉' },
        { question: '两层 patch 冲突了谁赢？', decision: '越靠后的层赢：--patch > home > profile > bundle', because: '叠加顺序固定，优先级就是层的位置' },
        { question: '最终到底装了什么？', decision: '跑 dsh --profile web --dump-config 看解析树', because: '配置是真相来源，猜测不是' },
      ],
      kpis: [kpi('硬编码子命令', '2 个：web / plugin', 'good'), kpi('headless / run', '只是 profile 名', 'neutral'), kpi('验算命令', '1 条', 'good')],
      scene: tree('从 profile 到最终配置树', [
        { id: 'cmd', x: 500, y: 60, kind: 'root', label: 'dsh --profile web --dump-config', sublabel: '验算命令', status: 'active' },
        { id: 'b', x: 200, y: 190, kind: 'plugin', label: 'bundles', sublabel: 'dsh-base → dsh-web-app' },
        { id: 'p', x: 500, y: 190, kind: 'plugin', label: 'patches', sublabel: 'profile → home → --patch' },
        { id: 't', x: 800, y: 190, kind: 'service', label: '最终配置树', sublabel: '约 159 个插件', status: 'highlight' },
        { id: 'web', x: 800, y: 330, kind: 'plugin', label: 'web 子命令', sublabel: 'CLI 硬编码' },
        { id: 'plug', x: 500, y: 330, kind: 'plugin', label: 'plugin 子命令', sublabel: 'CLI 硬编码' },
        { id: 'head', x: 200, y: 330, kind: 'plugin', label: 'headless / run', sublabel: '只是 profile 名', status: 'dimmed' },
      ], [
        { from: 'cmd', to: 'b' },
        { from: 'cmd', to: 'p' },
        { from: 'b', to: 't' },
        { from: 'p', to: 't', label: '逐层叠加', animated: true },
        { from: 't', to: 'web' },
        { from: 't', to: 'plug' },
        { from: 't', to: 'head', label: '不是子命令' },
      ]),
    },
  ]),
);

export const L3 = lesson(
  'context-plugin',
  'ch02',
  2,
  'Cordis 主板',
  1,
  4,
  'Context 与插件三种写法',
  '插件拿到的 ctx 到底是什么？ctx.plugin() 那一瞬间发生了什么？本课从最底层开始拆。',
  12,
  '核心',
  [
    { text: '写出插件的三种写法，并说清框架靠什么认出它们', completedAtStep: 2 },
    { text: '讲清 ctx.plugin() 内部做的三件事', completedAtStep: 3 },
    { text: '解释子 ctx 的意义：注册归属与干净热插拔的根基', completedAtStep: 5 },
  ],
  steps([
    {
      shortLabel: '插件长什么样',
      badge: 'PROBLEM',
      title: '插件长什么样：三种写法',
      paragraphs: [
        '在 Cordis 里，插件可以写成三种形式，框架都认：函数、带 `apply` 方法的对象（或模块）、class（通常继承 `Service`）。DSH 里三种都有，最常见的是后两种。',
        '服务写成 class（DSH 里有 62 个），小插件写成一个模块，用 `export const name`、`export const inject`、`export function apply` 导出，挂载时直接 `ctx.plugin(模块)`。',
      ],
      kpis: [kpi('插件写法', '3 种', 'neutral'), kpi('DSH 服务类', '62 个', 'neutral'), kpi('小插件写法', '模块 + apply', 'neutral')],
      scene: iso('三种写法，一个入口', [
        { id: 'fn', x: 60, y: 180, label: '函数', sublabel: 'function hello(ctx, config)', tone: 'blue' },
        { id: 'obj', x: 330, y: 180, label: '对象 / 模块', sublabel: '{ name, inject, apply }', tone: 'green' },
        { id: 'cls', x: 600, y: 180, label: 'class', sublabel: 'extends Service', tone: 'violet', active: true },
        { id: 'reg', x: 180, y: 400, label: 'Registry', sublabel: 'ctx.plugin() · resolve()', tone: 'dark', size: 'platform' },
      ], [
        { from: 'fn', to: 'reg', label: '本身就是函数', packetCount: 1, packetLabel: '函数' },
        { from: 'obj', to: 'reg', label: '取 .apply', packetCount: 1, packetLabel: 'apply' },
        { from: 'cls', to: 'reg', label: '本身就是函数', packetCount: 1, packetLabel: 'Service' },
      ]),
    },
    {
      shortLabel: '框架怎么认',
      badge: 'TECHNIQUE',
      title: '框架怎么认：只看能不能拿到可调用的东西',
      paragraphs: [
        '框架认出三种写法的办法很简单：只看一件事，能不能拿到一个「可调用的东西」。函数和 class 本身就是函数；对象就取它的 `apply`。',
        '这个函数同时也是插件的「身份」：同一个插件挂多少次，都共享一个身份，框架用它来记录这个插件有几个实例。',
      ],
      sourceDrawer: namiSrc(
        'resolve：三种写法归一',
        'packages/cordis/src/registry.ts',
        'ts',
        `resolve(plugin: Plugin): Function | undefined {
  if (typeof plugin === 'function') return plugin
  if (plugin && typeof plugin === 'object'
    && typeof plugin.apply === 'function') return plugin.apply
}`,
        '迷你版 registry.ts 对真 Cordis 同名文件的简化复刻，行为一致。',
      ),
      kpis: [kpi('判断依据', '可调用', 'good'), kpi('插件身份', '可调用函数本身', 'neutral'), kpi('同插件多实例', '共享身份', 'neutral')],
      scene: swim('resolve 的两条判断', [
        { id: 'in', label: '输入插件', sublabel: '三种写法任一', tone: 'neutral' },
        { id: 'check', label: '判断', sublabel: 'typeof === function？', tone: 'blue' },
        { id: 'out', label: '输出', sublabel: '可调用函数 = 身份', tone: 'green' },
      ], [
        { id: 'a', laneId: 'in', start: 2, end: 30, label: '传入插件', tone: 'neutral', status: 'done' },
        { id: 'b', laneId: 'check', start: 32, end: 62, label: '是函数 → 直接返回', tone: 'blue', status: 'done' },
        { id: 'c', laneId: 'check', start: 32, end: 62, label: '是对象 → 取 .apply', tone: 'blue', status: 'done' },
        { id: 'd', laneId: 'out', start: 66, end: 96, label: '返回可调用物', tone: 'green', status: 'done' },
      ], [{ id: 'e', laneId: 'out', pos: 96, label: '身份确立', tone: 'green', emphasized: true }]),
    },
    {
      shortLabel: '插件三件事',
      badge: 'SOLUTION',
      title: 'ctx.plugin() 做了三件事',
      paragraphs: [
        '挂载一个插件只有一行：`app.plugin(hello, { name: \'nami\' })`。框架内部做了三件事：找到或创建这个插件的登记项（`runtime`）；为这次挂载创建一个 `Fiber`；返回这个 Fiber，外面包一层让它可以被 `await`。',
        '这里出现了一个新名字：`Fiber`。一个插件挂一次，就产生一个 Fiber，它代表「这个插件的这一次运行」：它现在是什么状态、依赖到齐没有、做过哪些注册。下一课整课讲它。',
      ],
      sourceDrawer: namiSrc(
        'plugin()：登记、建 Fiber、返回',
        'packages/cordis/src/registry.ts',
        'ts',
        `plugin(ctx, plugin, config) {
  const callback = this.resolve(plugin)
  let runtime = this._internal.get(callback) // 1. 找到或创建登记项
  if (!runtime) { /* 新建，记下名字和配置校验规则 */ }
  const fiber = new Fiber(                  // 2. 创建一个插件实例
    ctx, config, Inject.resolve(plugin.inject), runtime)
  return /* fiber，外面包一层，让它可以被 await */ // 3. 返回
}`,
        '简化版，省略了配置校验与返回值包装的细节，主干与真 Cordis 一致。',
      ),
      kpis: [kpi('内部步骤', '3 件', 'good'), kpi('Fiber', '一次挂载一个', 'neutral'), kpi('返回值', '可 await', 'neutral')],
      scene: swim('plugin() 的三步', [
        { id: 'reg', label: '登记项 runtime', sublabel: '名字 + 配置校验规则', tone: 'blue' },
        { id: 'fiber', label: 'Fiber', sublabel: '这次运行的实例', tone: 'violet' },
        { id: 'ret', label: '返回', sublabel: '可 await 的包装', tone: 'green' },
      ], [
        { id: 'a', laneId: 'reg', start: 2, end: 30, label: '找或建登记项', tone: 'blue', status: 'done' },
        { id: 'b', laneId: 'fiber', start: 32, end: 64, label: 'new Fiber(...)', tone: 'violet', status: 'done' },
        { id: 'c', laneId: 'ret', start: 66, end: 96, label: '返回，可 await', tone: 'green', status: 'done' },
      ], [], [{ pos: 0, label: '调用' }, { pos: 100, label: '返回' }]),
    },
    {
      shortLabel: '异步加载',
      badge: 'INSIGHT',
      title: '插件是异步加载的',
      paragraphs: [
        '注意：插件不是在 `ctx.plugin()` 里同步执行的。兼容性测试的第一个场景验证了这一点，迷你版和真 Cordis 输出完全一样：`ctx.plugin()` 已经返回了，`apply` 才执行，之后状态才从 `LOADING` 变成 `ACTIVE`。',
        '这样设计有两个好处：一是插件的 `apply` 可以是异步的（连数据库、读配置）；二是一个插件出错，异常不会冒到挂载它的地方，把后面的插件都拖垮。想等加载完，就 `await app.plugin(hello)`，加载失败时这里会抛出插件的错误。',
      ],
      kpis: [kpi('plugin() 返回时', 'apply 尚未执行', 'warn'), kpi('apply 可异步', '是', 'good'), kpi('出错影响', '只影响自己', 'good')],
      scene: swim('异步加载的时间线', [
        { id: 'caller', label: '调用方', sublabel: 'app.plugin(hello)', tone: 'neutral' },
        { id: 'fiber', label: 'Fiber', sublabel: '状态变化', tone: 'violet' },
        { id: 'apply', label: 'apply', sublabel: '插件本体', tone: 'green' },
      ], [
        { id: 'a', laneId: 'caller', start: 2, end: 18, label: '调用 plugin()', tone: 'neutral', status: 'done' },
        { id: 'b', laneId: 'caller', start: 20, end: 34, label: '已返回', tone: 'neutral', status: 'done' },
        { id: 'c', laneId: 'fiber', start: 4, end: 30, label: 'PENDING → LOADING', tone: 'violet', status: 'done' },
        { id: 'd', laneId: 'apply', start: 36, end: 66, label: 'apply 执行', tone: 'green', status: 'done' },
        { id: 'e', laneId: 'fiber', start: 68, end: 96, label: 'LOADING → ACTIVE', tone: 'violet', status: 'done' },
      ], [{ id: 'ev', laneId: 'caller', pos: 27, label: '返回 ≠ 执行完', tone: 'orange', emphasized: true }], [{ pos: 0, label: 't0' }, { pos: 50, label: '让出一拍' }, { pos: 100, label: 'ACTIVE' }]),
    },
    {
      shortLabel: '子 ctx',
      badge: 'TECHNIQUE',
      title: '每个插件拿到自己的子 ctx',
      paragraphs: [
        '插件的 `apply(ctx)` 拿到的 `ctx`，不是全局那个根 ctx，而是专门为它造的子 ctx：`Object.create(this)` 让子 ctx 原型继承父 ctx，父 ctx 上有的方法子 ctx 都能用；子 ctx 只多了一个自己的属性 `fiber`，指向这个插件实例。',
        '为什么要多此一举？看 `ctx.on`：它把调用它的那个 ctx 传给事件服务，事件服务再通过 `ctx.fiber` 知道这个监听是哪个插件注册的，于是把「撤销这个监听」记在那个插件名下。插件卸载时，框架把这个插件名下记的东西全部撤销，插件自己不用写一行清理代码。这就是子 ctx 的意义：`让每一次注册都知道自己属于谁`，这是 Cordis 能做到干净热插拔的根基。',
      ],
      sourceDrawer: namiSrc(
        'extend 与 on：注册知道自己属于谁',
        'packages/cordis/src/context.ts',
        'ts',
        `extend(meta: object = {}): this {
  const self = Object.create(this)   // 原型继承父 ctx
  for (const prop of Reflect.ownKeys(meta)) {
    Object.defineProperty(self, prop,
      Reflect.getOwnPropertyDescriptor(meta, prop)!)
  }
  return self
}

on(name, listener, options?) {
  return this.events.on(this, name, listener, options)
  // 把 this 传给事件服务，服务用 ctx.fiber 记账
}`,
        'Fiber 构造时执行 parent.extend({ fiber: this })，每个插件得到自己的子 ctx。',
      ),
      kpis: [kpi('子 ctx 多出的属性', '1 个：fiber', 'good'), kpi('注册归属', '100% 可追溯', 'good'), kpi('手写清理代码', '0 行', 'good')],
      scene: tree('父 ctx → 子 ctx：只多一个 fiber', [
        { id: 'root', x: 500, y: 60, kind: 'root', label: '根 ctx', sublabel: 'plugin / on / provide / emit', status: 'active' },
        { id: 'c1', x: 240, y: 200, kind: 'plugin', label: '子 ctx · 插件 A', sublabel: 'fiber → Fiber A', status: 'highlight' },
        { id: 'c2', x: 760, y: 200, kind: 'plugin', label: '子 ctx · 插件 B', sublabel: 'fiber → Fiber B' },
        { id: 'r1', x: 120, y: 340, kind: 'event', label: 'on(greet)', sublabel: '记在 A 名下' },
        { id: 'r2', x: 360, y: 340, kind: 'event', label: 'provide(db)', sublabel: '记在 A 名下' },
        { id: 'r3', x: 640, y: 340, kind: 'event', label: 'on(agent/text-delta)', sublabel: '记在 B 名下' },
        { id: 'r4', x: 880, y: 340, kind: 'event', label: 'plugin(child)', sublabel: '记在 B 名下' },
      ], [
        { from: 'root', to: 'c1' },
        { from: 'root', to: 'c2' },
        { from: 'c1', to: 'r1' },
        { from: 'c1', to: 'r2' },
        { from: 'c2', to: 'r3' },
        { from: 'c2', to: 'r4' },
      ]),
    },
    {
      shortLabel: '根 ctx 与插件树',
      badge: 'RECAP',
      title: '根 ctx 与插件树',
      paragraphs: [
        '整个应用从一个根 ctx 开始。构造函数做了三件事：包一层 `Proxy`（以后读 `ctx.llm` 都经过它去服务表里找）；创建根 Fiber（根 Fiber 一出生就是运行状态，所有插件都挂在它下面）；装上四个内置服务：`reflect`（服务表）、`registry`（插件登记）、`events`（事件总线）、`logger`（日志）。',
        '有了子 ctx，插件里还可以再挂插件：子插件挂在父插件的 ctx 上，父插件卸载时子插件跟着一起卸载——因为「挂载子插件」本身也是父插件的一次注册。DSH 的 `agent-spine` 套件插件就是这么在自己的 `apply` 里一口气挂上二十多个核心插件的，整个 Agent 就是一棵插件树，根在 `new Context()`。',
      ],
      recapTable: [
        { question: '插件有几种写法？', decision: '三种：函数、带 apply 的对象、class', because: '框架只认「可调用的东西」，resolve 后归一处理' },
        { question: 'ctx.plugin() 返回时插件跑完了吗？', decision: '没有：apply 是异步执行的', because: 'Fiber 让出一拍后才执行 apply，调用方可 await 等待' },
        { question: '卸载为什么能清理干净？', decision: '每个插件有自己的子 ctx，注册都记在它名下', because: 'ctx.fiber 让每一次注册都知道自己属于谁' },
      ],
      kpis: [kpi('根 ctx 内置服务', '4 个', 'neutral'), kpi('插件树根', 'new Context()', 'neutral'), kpi('嵌套卸载', '级联', 'good')],
      scene: tree('根 ctx：Proxy + 根 Fiber + 4 个内置服务', [
        { id: 'root', x: 500, y: 60, kind: 'root', label: '根 ctx（Proxy）', sublabel: '读 ctx.llm 时去服务表找', status: 'active' },
        { id: 'fiber', x: 200, y: 190, kind: 'plugin', label: '根 Fiber', sublabel: '一出生就是运行状态' },
        { id: 'reflect', x: 420, y: 190, kind: 'service', label: 'reflect', sublabel: '服务表' },
        { id: 'registry', x: 620, y: 190, kind: 'service', label: 'registry', sublabel: '插件登记' },
        { id: 'events', x: 820, y: 190, kind: 'service', label: 'events', sublabel: '事件总线' },
        { id: 'logger', x: 500, y: 320, kind: 'service', label: 'logger', sublabel: '日志' },
        { id: 'spine', x: 500, y: 450, kind: 'plugin', label: 'agent-spine', sublabel: '挂 20+ 核心插件', status: 'highlight' },
      ], [
        { from: 'root', to: 'fiber' },
        { from: 'root', to: 'reflect' },
        { from: 'root', to: 'registry' },
        { from: 'root', to: 'events' },
        { from: 'root', to: 'logger' },
        { from: 'root', to: 'spine', label: '插件树向下生长', animated: true },
      ]),
    },
  ]),
);

export const L4 = lesson(
  'fiber-lifecycle',
  'ch02',
  2,
  'Cordis 主板',
  2,
  4,
  'Fiber 一生六态',
  '每挂载一次插件，框架就创建一个 Fiber。它的一生只有六种状态，但记账、隔离与自动重启的全部秘密都在这六态之间。',
  14,
  '核心',
  [
    { text: '背出 Fiber 的六种状态与数值，说清正常流转路径', completedAtStep: 2 },
    { text: '讲清 effect 记账与倒序撤销的规则', completedAtStep: 3 },
    { text: '解释 epoch 如何让依赖一换、插件自动重启', completedAtStep: 5 },
  ],
  steps([
    {
      shortLabel: 'Fiber 是什么',
      badge: 'PROBLEM',
      title: 'Fiber：一个插件的一生由它管',
      paragraphs: [
        '一个插件挂一次，就产生一个 Fiber，它代表「这个插件的这一次运行」：它现在是什么状态、依赖到齐没有、做过哪些注册。',
        'DSH 里有 59 处代码读取 `FiberState`，主要用在调试工具和遥测上：有了这些状态，就能知道整棵插件树上每个插件此刻在干什么。',
      ],
      kpis: [kpi('Fiber 对应', '一次挂载', 'neutral'), kpi('读取 FiberState 处', '59 处', 'neutral'), kpi('用途', '调试 + 遥测', 'neutral')],
      scene: tree('Fiber 管什么', [
        { id: 'fiber', x: 500, y: 60, kind: 'root', label: 'Fiber', sublabel: '一个插件的一次运行', status: 'active' },
        { id: 'state', x: 200, y: 200, kind: 'plugin', label: '状态', sublabel: '六态之一' },
        { id: 'deps', x: 500, y: 200, kind: 'service', label: '依赖', sublabel: 'inject 到齐没有' },
        { id: 'ledger', x: 800, y: 200, kind: 'log', label: '账本 _disposables', sublabel: '做过哪些注册' },
        { id: 'epoch', x: 500, y: 340, kind: 'event', label: 'epoch', sublabel: '依赖提供者的编号拼接' },
      ], [
        { from: 'fiber', to: 'state' },
        { from: 'fiber', to: 'deps' },
        { from: 'fiber', to: 'ledger' },
        { from: 'deps', to: 'epoch' },
      ]),
    },
    {
      shortLabel: '六种状态',
      badge: 'TECHNIQUE',
      title: '六种状态，数值和真 Cordis 一致',
      paragraphs: [
        '一个 Fiber 在任意时刻都处于六种状态之一，数值和真 Cordis 完全一样：`PENDING 0`（依赖没到齐，等着）、`LOADING 1`（正在执行 apply，可能是异步的）、`ACTIVE 2`（运行中）、`FAILED 3`（apply 出错了，被隔离，不影响别人）、`DISPOSED 4`（已卸载）、`UNLOADING 5`（正在执行清理）。',
        '正常的一生是 `PENDING → LOADING → ACTIVE → UNLOADING → DISPOSED`。但它不一定一路走到底：依赖消失了，它会从 ACTIVE 退回 PENDING，等依赖回来再重新启动；`apply` 抛错了，它会停在 FAILED。',
      ],
      sourceDrawer: namiSrc(
        'FiberState：六态与数值',
        'packages/cordis/src/fiber.ts',
        'ts',
        `export const FiberState = {
  PENDING: 0,   // 依赖没到齐，等着
  LOADING: 1,   // 正在执行 apply（可能是异步的）
  ACTIVE: 2,    // 运行中
  FAILED: 3,    // apply 出错了，被隔离，不影响别人
  DISPOSED: 4,  // 已卸载
  UNLOADING: 5, // 正在执行清理
} as const`,
        '数值与真 Cordis 完全一样；迷你版 fiber.ts 329 行，真 Cordis 754 行。',
      ),
      kpis: [kpi('状态数', '6 种', 'neutral'), kpi('正常路径', '5 步', 'good'), kpi('出错终态', 'FAILED', 'warn')],
      scene: swim('正常一生：五步走完', [
        { id: 'life', label: 'Fiber 的一生', sublabel: 'PENDING → … → DISPOSED', tone: 'violet' },
        { id: 'alt', label: '分支', sublabel: '依赖消失 / apply 出错', tone: 'orange' },
      ], [
        { id: 'a', laneId: 'life', start: 2, end: 18, label: 'PENDING 0', tone: 'violet', status: 'done' },
        { id: 'b', laneId: 'life', start: 20, end: 36, label: 'LOADING 1', tone: 'violet', status: 'done' },
        { id: 'c', laneId: 'life', start: 38, end: 58, label: 'ACTIVE 2', tone: 'violet', status: 'done' },
        { id: 'd', laneId: 'life', start: 60, end: 76, label: 'UNLOADING 5', tone: 'violet', status: 'done' },
        { id: 'e', laneId: 'life', start: 78, end: 96, label: 'DISPOSED 4', tone: 'violet', status: 'done' },
        { id: 'f', laneId: 'alt', start: 38, end: 58, label: '依赖消失 → 退回 PENDING', tone: 'orange', status: 'blocked' },
        { id: 'g', laneId: 'alt', start: 60, end: 76, label: 'apply 出错 → FAILED 3', tone: 'orange', status: 'error' },
      ], [{ id: 'ev', laneId: 'life', pos: 48, label: '运行中', tone: 'violet', emphasized: true }], [{ pos: 0, label: '挂载' }, { pos: 100, label: '卸载' }]),
    },
    {
      shortLabel: 'effect 记账',
      badge: 'SOLUTION',
      title: 'effect：可撤销的注册，卸载时倒序撤销',
      paragraphs: [
        '插件做的每一件「会留下痕迹」的事，都要通过 `ctx.effect` 来做：`effect` 接收一个函数，这个函数做一次注册，然后返回撤销函数。Fiber 把撤销函数记在自己的账本 `_disposables` 里。',
        '关键在于：提供服务、监听事件、挂载子插件，在框架内部全都是用 effect 实现的。所以插件根本不用自己调 `effect` 去管这些，只要是通过 ctx 做的注册，自动入账。账本还有一个细节：`后注册的先撤销`。先开连接再在连接上开订阅，卸载时就得先关订阅再关连接，倒序撤销保证了这个顺序。',
      ],
      sourceDrawer: dshSrc(
        'Agent 循环把自己登记成工厂：也是一个 effect',
        'packages/core/agent-loop/src/index.ts',
        'ts',
        `ctx.effect(() => ctx.agents.setFactory(this))`,
        'setFactory 返回一个撤销函数，Agent 循环卸载时，工厂登记自动撤掉。DSH 里 ctx.effect 出现了 130 次，都是插件自己需要清理的事：登记工具、开定时器、建连接。',
      ),
      kpis: [kpi('ctx.effect 出现', '130 次', 'neutral'), kpi('撤销顺序', '后注册先撤销', 'good'), kpi('手写清理', '0 行', 'good')],
      scene: iso('账本 _disposables：后进先出', [
        { id: 'e1', x: 120, y: 120, label: 'effect 1', sublabel: '开连接 → 撤销：关连接', tone: 'blue' },
        { id: 'e2', x: 420, y: 120, label: 'effect 2', sublabel: '开订阅 → 撤销：关订阅', tone: 'green' },
        { id: 'e3', x: 700, y: 120, label: 'effect 3', sublabel: '监听事件 → 撤销：摘监听', tone: 'orange', active: true },
        { id: 'book', x: 180, y: 360, label: '_disposables 账本', sublabel: '卸载时倒序执行撤销函数', tone: 'dark', size: 'platform' },
      ], [
        { from: 'e3', to: 'book', label: '先撤销', packetCount: 1, packetLabel: '撤销函数' },
        { from: 'e2', to: 'book', label: '再撤销', packetCount: 1, packetLabel: '撤销函数' },
        { from: 'e1', to: 'book', label: '最后撤销', packetCount: 1, packetLabel: '撤销函数' },
      ]),
    },
    {
      shortLabel: '加载与隔离',
      badge: 'INSIGHT',
      title: '加载与卸载：异步、串行、一个出错只影响自己',
      paragraphs: [
        '状态流转的核心是两个异步方法：`_reload`（加载）和 `_unload`（卸载）。加载时先拍一张依赖快照，让出一拍（`await Promise.resolve()`——这就是 `ctx.plugin()` 已返回、`apply` 才执行的原因），再校验配置、执行插件本体；出错就记下错误，状态变成 FAILED。',
        '卸载是把账本里的撤销函数全部执行一遍，某一个撤销函数出错只记一条日志，不影响其他撤销函数。加载和卸载不会同时进行，Fiber 用 `inertia` 记住当前正在进行的切换，新的状态变化要等当前切换结束后才处理。',
      ],
      callout: { kind: 'idea', title: '错误隔离', text: '一个插件出错，只影响它自己：bad 停在 FAILED，good 完全不受影响。对几百个插件组成的系统，这一点非常重要——某个第三方插件写坏了，整个 Agent 照样能启动，只是少了这一个功能。' },
      kpis: [kpi('隔离粒度', '1 个插件', 'good'), kpi('加载 / 卸载', '串行，不并发', 'neutral'), kpi('配置校验失败', '进 FAILED', 'warn')],
      scene: swim('错误隔离：bad 坏了，good 照常', [
        { id: 'bad', label: '插件 bad', sublabel: 'apply 抛错 boom', tone: 'rose' },
        { id: 'good', label: '插件 good', sublabel: '正常运行', tone: 'green' },
      ], [
        { id: 'a', laneId: 'bad', start: 2, end: 24, label: 'PENDING → LOADING', tone: 'rose', status: 'done' },
        { id: 'b', laneId: 'bad', start: 26, end: 52, label: 'apply 抛错', tone: 'rose', status: 'error' },
        { id: 'c', laneId: 'bad', start: 54, end: 96, label: 'UNLOADING → FAILED', tone: 'rose', status: 'error' },
        { id: 'd', laneId: 'good', start: 2, end: 24, label: 'PENDING → LOADING', tone: 'green', status: 'done' },
        { id: 'e', laneId: 'good', start: 26, end: 96, label: 'ACTIVE · 正常运行', tone: 'green', status: 'done' },
      ], [{ id: 'ev', laneId: 'good', pos: 60, label: '不受影响', tone: 'green', emphasized: true }], [{ pos: 0, label: '挂载' }, { pos: 100, label: '结束' }]),
    },
    {
      shortLabel: 'epoch 自动重启',
      badge: 'TECHNIQUE',
      title: 'epoch：依赖换了，插件自动重启',
      paragraphs: [
        '一个插件声明了 `inject: [\'llm\']`，框架要回答两个问题：llm 到齐了没有？到齐的是哪一个？Fiber 用一个字符串同时回答这两个问题，叫 `epoch`：每个 Fiber 都有唯一编号 `uid`，epoch 就是「所有依赖的提供者编号」拼起来的字符串，比如 `:3:7`。',
        '依赖不齐，epoch 是 `INACTIVE`，插件停在 PENDING；依赖到齐，epoch 变成 `:3:7`，插件开始加载；`提供者换了`——哪怕服务名一样，只要提供者的 Fiber 变了，epoch 就会变成 `:5:7`，插件先卸载再重新加载，拿到新的服务。没有任何地方写着「模型换了，请重启循环」，连锁反应完全来自两条规则：依赖不齐就停下，依赖到齐就启动。',
      ],
      sourceDrawer: namiSrc(
        '_refresh：epoch 就是依赖编号的拼接',
        'packages/cordis/src/fiber.ts',
        'ts',
        `_refresh() {
  let epoch = ''
  for (const name of Object.keys(this.inject)) {
    const impl = this._store[name]
    if (!impl) { epoch = INACTIVE; break }  // 有一个依赖不在，就是「未就绪」
    epoch += ':' + impl.fiber.uid           // 拼上每个依赖的提供者编号
  }
  this._setEpoch(epoch)
}`,
        'llm 插件改配置重启时，依赖它的 loop 插件跟着重启：先 UNLOADING 回 PENDING，等 llm 重新 ACTIVE 后再 LOADING → ACTIVE。',
      ),
      kpis: [kpi('epoch 例子', ':3:7 → :5:7', 'neutral'), kpi('重启胶水代码', '0 行', 'good'), kpi('依赖不齐时', '停在 PENDING', 'neutral')],
      scene: swim('换模型配置：llm 重启，loop 跟着重启', [
        { id: 'llm', label: 'llm 插件', sublabel: 'flash → pro', tone: 'blue' },
        { id: 'loop', label: 'loop 插件', sublabel: 'inject: [llm]', tone: 'violet' },
      ], [
        { id: 'a', laneId: 'llm', start: 2, end: 22, label: 'ACTIVE · flash', tone: 'blue', status: 'done' },
        { id: 'b', laneId: 'llm', start: 24, end: 38, label: 'UNLOADING', tone: 'blue', status: 'done' },
        { id: 'c', laneId: 'llm', start: 40, end: 58, label: 'LOADING → ACTIVE · pro', tone: 'blue', status: 'done' },
        { id: 'd', laneId: 'loop', start: 2, end: 22, label: 'ACTIVE · 用 flash', tone: 'violet', status: 'done' },
        { id: 'e', laneId: 'loop', start: 24, end: 44, label: 'UNLOADING → PENDING', tone: 'violet', status: 'done' },
        { id: 'f', laneId: 'loop', start: 60, end: 96, label: 'LOADING → ACTIVE · 用 pro', tone: 'violet', status: 'done' },
      ], [{ id: 'ev', laneId: 'loop', pos: 52, label: 'epoch 变了', tone: 'orange', emphasized: true }], [{ pos: 0, label: '改配置' }, { pos: 100, label: '全部恢复' }]),
    },
    {
      shortLabel: '五条规则',
      badge: 'RECAP',
      title: '五条规则里，Fiber 占两条',
      paragraphs: [
        '读完这一课，Cordis 的核心可以浓缩成五条规则，其中两条属于 Fiber：插件做的每一次注册都记在自己名下，卸载时倒序撤销；插件用服务名提供和使用能力，依赖不齐就等着，到齐就启动，换人就重启。',
        '其余三条是：一切都是插件，每个插件拿到自己的 ctx；插件之间用事件广播，waterfall 让任何环节都能被插手；一个插件出错，只影响它自己。下一课讲服务与依赖注入——`ctx.llm` 到底是怎么来的。',
      ],
      recapTable: [
        { question: 'Fiber 是什么？', decision: '一个插件的一次运行：状态 + 依赖 + 账本', because: '挂载、等待、重启、清理都要有一个记账的主体' },
        { question: '卸载为什么干净？', decision: '所有注册走 effect 进账本，倒序撤销', because: '先开的后关，依赖关系不会在清理时断裂' },
        { question: '提供者换了怎么办？', decision: 'epoch 变化 → 消费者自动先卸后装', because: 'epoch 同时编码了「齐不齐」和「是谁」' },
      ],
      kpis: [kpi('核心规则', '5 条', 'good'), kpi('Fiber 占', '2 条', 'neutral'), kpi('状态数', '6 种', 'neutral')],
      scene: tree('Fiber 的一生：状态机总览', [
        { id: 'p', x: 160, y: 90, kind: 'plugin', label: 'PENDING 0', sublabel: '依赖没到齐' },
        { id: 'l', x: 400, y: 90, kind: 'plugin', label: 'LOADING 1', sublabel: '执行 apply', status: 'highlight' },
        { id: 'a', x: 640, y: 90, kind: 'service', label: 'ACTIVE 2', sublabel: '运行中', status: 'highlight' },
        { id: 'u', x: 840, y: 90, kind: 'plugin', label: 'UNLOADING 5', sublabel: '执行清理' },
        { id: 'd', x: 840, y: 260, kind: 'log', label: 'DISPOSED 4', sublabel: '已卸载' },
        { id: 'f', x: 400, y: 260, kind: 'event', label: 'FAILED 3', sublabel: 'apply 出错被隔离' },
        { id: 'back', x: 160, y: 260, kind: 'event', label: '依赖消失 → 回 PENDING', sublabel: '等依赖回来再启动' },
      ], [
        { from: 'p', to: 'l' },
        { from: 'l', to: 'a' },
        { from: 'a', to: 'u' },
        { from: 'u', to: 'd' },
        { from: 'l', to: 'f', label: '出错' },
        { from: 'a', to: 'back', label: '依赖消失', animated: true },
        { from: 'back', to: 'p' },
      ]),
    },
  ]),
);

export const CHAPTERS_01_02 = [
  chapter('ch01', 1, '理念与分层', 'sage', [L1, L2]),
];

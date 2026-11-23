// 第 3–4 章：Agent 循环、工具与审批
// 内容依据：NamiDSH docs/04、05、06 与 DSH 公开资料；示意数字已在文内注明。
import { chapter, dshSrc, iso, kpi, lesson, namiSrc, steps, swim, tree } from '../helpers';
import { L3, L4 } from './ch01_02';

const L5 = lesson(
  'service-inject',
  'ch02',
  2,
  'Cordis 主板',
  3,
  4,
  '服务与依赖注入：ctx.llm 是怎么来的',
  'Agent 循环里写着 ctx.llm、ctx.tools，却没有 import 任何模型或工具的代码。这篇讲这背后的机制。',
  14,
  '核心',
  [
    { text: '说清 provide 的三条规则：effect、记提供者、一名一主', completedAtStep: 2 },
    { text: '解释 inject 如何决定启动顺序与重启', completedAtStep: 3 },
    { text: '讲清一次 ctx.llm 属性读取背后的查找过程', completedAtStep: 4 },
  ],
  steps([
    {
      shortLabel: '提供服务',
      badge: 'PROBLEM',
      title: '提供服务：provide',
      paragraphs: [
        '一个插件想把自己的能力给别人用，就提供一个服务：`ctx.provide(\'db\', { name: \'sqlite\' })`。或者写成 Service 类，构造时自动提供：`Service` 的构造函数里调 `ctx.provide(name, this)`。',
        'DSH 里的核心能力几乎都是这么写的：`LlmRuntime` 提供 `llm`，`ToolRuntime` 提供 `tools`，`SessionStore` 提供 `sessions`，`AgentLoop` 提供 `agentLoop`。',
      ],
      kpis: [kpi('提供方式', '2 种', 'neutral'), kpi('核心服务', 'llm / tools / sessions', 'neutral'), kpi('Service 构造', '自动 provide', 'good')],
      scene: iso('Service 类：构造即提供', [
        { id: 'llm', x: 60, y: 180, label: 'LlmRuntime', sublabel: '→ 提供 llm', tone: 'blue' },
        { id: 'tools', x: 300, y: 180, label: 'ToolRuntime', sublabel: '→ 提供 tools', tone: 'orange' },
        { id: 'sess', x: 540, y: 180, label: 'SessionStore', sublabel: '→ 提供 sessions', tone: 'green' },
        { id: 'loop', x: 780, y: 180, label: 'AgentLoop', sublabel: '→ 提供 agentLoop', tone: 'violet', size: 'sm' },
        { id: 'table', x: 180, y: 400, label: '服务表 store', sublabel: '名字 → { 值, 提供者 Fiber }', tone: 'dark', size: 'platform' },
      ], [
        { from: 'llm', to: 'table' },
        { from: 'tools', to: 'table' },
        { from: 'sess', to: 'table' },
        { from: 'loop', to: 'table' },
      ]),
    },
    {
      shortLabel: '一名一主',
      badge: 'TECHNIQUE',
      title: '一名一主：同名服务冲突直接报错',
      paragraphs: [
        '`provide` 有三个要点。第一，它是一个 effect，所以服务会随插件一起下线，不用手动注销。第二，服务表里记的不只是值，还有提供者是哪个 Fiber——上一课的 epoch 就靠这一点。',
        '第三，`一个名字只能有一个提供者`。第二个插件再提供同名服务，直接报错，进入 FAILED，原来的服务不受影响。这是一个「宁可报错，不要猜」的设计：悄悄覆盖看起来更方便，但会出现两个「真相」——服务表里是新的，已经拿到旧服务的插件手里还是旧的。',
      ],
      sourceDrawer: namiSrc(
        'provide：effect + 冲突即报错',
        'packages/cordis/src/reflect.ts',
        'ts',
        `provide(ctx, name, value?) {
  return ctx.fiber.effect(() => {
    if (this.store[name]) {
      throw new Error(
        \`service "\${name}" has been registered at <\${this.store[name].fiber.name}>\`)
    }
    const impl = { name, value, fiber: ctx.fiber }
    this.store[name] = impl
    // ...下线时删除并通知依赖方
  }, \`ctx.provide(\${JSON.stringify(name)})\`)
}`,
        '简化版。DSH 里 ctx.provide 出现 16 次，ctx.get 出现 178 次。',
      ),
      kpis: [kpi('同名提供者', '只允许 1 个', 'warn'), kpi('冲突结果', '后来者 FAILED', 'neutral'), kpi('原服务', '不受影响', 'good')],
      scene: swim('同名冲突：b 报错，a 不受影响', [
        { id: 'a', label: '插件 a', sublabel: '先提供 db = A', tone: 'green' },
        { id: 'b', label: '插件 b', sublabel: '后提供 db = B', tone: 'rose' },
      ], [
        { id: 'a1', laneId: 'a', start: 2, end: 30, label: 'provide(db, A)', tone: 'green', status: 'done' },
        { id: 'a2', laneId: 'a', start: 32, end: 96, label: 'ACTIVE · db = A', tone: 'green', status: 'done' },
        { id: 'b1', laneId: 'b', start: 30, end: 52, label: 'provide(db, B) 抛错', tone: 'rose', status: 'error' },
        { id: 'b2', laneId: 'b', start: 54, end: 96, label: 'UNLOADING → FAILED', tone: 'rose', status: 'error' },
      ], [{ id: 'ev', laneId: 'b', pos: 41, label: '已注册，拒绝覆盖', tone: 'rose', emphasized: true }]),
    },
    {
      shortLabel: '声明依赖',
      badge: 'SOLUTION',
      title: '声明依赖：inject，挂载顺序随意',
      paragraphs: [
        '用服务的一方，要先声明自己依赖什么：`inject: [\'db\']`。它告诉框架两件事：这个插件需要 `db`；在 `db` 到齐之前，别启动我。`inject` 是 DSH 里出现最多的写法，一共 395 处。',
        '所以挂载顺序无所谓。先挂消费者也没关系，它会停在 PENDING 等着；提供者一变成 ACTIVE，消费者自动启动。框架靠 `notify` 知道「提供者好了，该通知消费者」：服务一有变化，就把所有 inject 了它的插件挨个叫醒，重新检查依赖。细节：`_checkImpl` 只认状态是 ACTIVE 的提供者，避免消费者拿到一个没初始化完的服务。',
      ],
      kpis: [kpi('inject 出现', '395 处', 'neutral'), kpi('挂载顺序', '随意', 'good'), kpi('只认的提供者', 'ACTIVE 状态', 'neutral')],
      scene: swim('依赖等待：消费者先挂，也没关系', [
        { id: 'c', label: '消费者 consumer', sublabel: 'inject: [db]', tone: 'violet' },
        { id: 'p', label: '提供者 provider', sublabel: '提供 db = sqlite', tone: 'green' },
      ], [
        { id: 'c1', laneId: 'c', start: 2, end: 34, label: 'PENDING · 等 db', tone: 'violet', status: 'blocked' },
        { id: 'c2', laneId: 'c', start: 36, end: 58, label: 'LOADING', tone: 'violet', status: 'done' },
        { id: 'c3', laneId: 'c', start: 60, end: 96, label: 'ACTIVE · 拿到 sqlite', tone: 'violet', status: 'done' },
        { id: 'p1', laneId: 'p', start: 2, end: 30, label: 'LOADING', tone: 'green', status: 'done' },
        { id: 'p2', laneId: 'p', start: 32, end: 96, label: 'ACTIVE · notify 叫醒消费者', tone: 'green', status: 'done' },
      ], [{ id: 'ev', laneId: 'p', pos: 32, label: 'notify', tone: 'orange', emphasized: true }]),
    },
    {
      shortLabel: 'ctx.llm 读取',
      badge: 'TECHNIQUE',
      title: 'ctx.llm：一次属性读取背后的事',
      paragraphs: [
        '声明了依赖，插件里就可以直接写 `ctx.db`。这不是普通的属性，`ctx` 是一个 Proxy：先看 Context 自己有没有这个属性（`plugin`、`on`……）；根 ctx 不受限制；否则沿着插件树往上找，看当前 Fiber 的 `store` 里有没有，有就返回，没有就往父插件找，一直找到根。',
        '`没声明的服务，读不到`——哪怕服务表里明明有。这条规则保证了一件事：插件依赖什么，看它的 `inject` 就全知道了。真的需要「有就用、没有也行」的服务，有两个办法：`ctx.get(\'name\')` 直接查服务表（DSH 用了 178 次）；`ctx.inject([\'name\'], callback)` 等服务到了再执行 callback（DSH 用了 39 次）。',
      ],
      sourceDrawer: namiSrc(
        'Proxy 的 get：沿插件树向上找',
        'packages/cordis/src/reflect.ts',
        'ts',
        `get(target, prop, ctx) {
  if (isSpecialProperty(prop) || Reflect.has(target, prop)) {
    return Reflect.get(target, prop, ctx)   // Context 自己的方法
  }
  if (!ctx.fiber.runtime) return target.reflect.get(prop, false)
  let fiber = ctx.fiber
  while (true) {                            // 沿插件树往上找
    const impl = fiber.store?.[prop]
    if (impl) return impl.value
    if (prop in fiber.inject) {
      throw new Error(\`cannot get required service "\${prop}" in inactive context\`)
    }
    if (!fiber.runtime) throw new Error(\`cannot get property "\${prop}" without inject\`)
    fiber = fiber.parent.fiber
  }
}`,
        '简化版。没 inject 的服务读不到；可选依赖用 ctx.get 或 ctx.inject。',
      ),
      kpis: [kpi('查找方向', '沿插件树向上', 'neutral'), kpi('ctx.get 出现', '178 次', 'neutral'), kpi('ctx.inject 出现', '39 次', 'neutral')],
      scene: tree('读 ctx.llm：从当前 Fiber 沿树向上找', [
        { id: 'loop', x: 500, y: 70, kind: 'plugin', label: 'agent-loop', sublabel: '读 ctx.llm', status: 'highlight' },
        { id: 'spine', x: 500, y: 200, kind: 'plugin', label: 'agent-spine', sublabel: '父插件' },
        { id: 'root', x: 500, y: 330, kind: 'root', label: '根 ctx', sublabel: '服务表 store' },
        { id: 'llm', x: 200, y: 460, kind: 'service', label: 'llm 服务', sublabel: 'LlmRuntime · 找到，返回' },
        { id: 'secret', x: 800, y: 460, kind: 'service', label: 'secret 服务', sublabel: '没 inject → 读不到', status: 'dimmed' },
      ], [
        { from: 'loop', to: 'spine', label: '本 Fiber 没有' },
        { from: 'spine', to: 'root', label: '继续向上' },
        { from: 'root', to: 'llm', label: '命中', animated: true },
        { from: 'root', to: 'secret', label: '无 inject 拒绝' },
      ]),
    },
    {
      shortLabel: '拔掉提供者',
      badge: 'INSIGHT',
      title: '拔掉提供者：先存盘，再拔电源',
      paragraphs: [
        '服务下线时，顺序很讲究。`provide` 返回的撤销函数做四件事：从服务表删掉；通知依赖方；`等依赖方清理完`；最后才从自己的快照里删掉。',
        '第 3 步是关键：提供者要等所有依赖方清理完，才真正下线。依赖方清理时读的是自己的快照，所以还能用这个服务，比如关闭前最后写一次日志、存一次盘。这就像先让电脑保存文件，再拔电源——顺序反了，循环收尾时就会报错。',
      ],
      kpis: [kpi('下线步骤', '4 步', 'neutral'), kpi('依赖方清理时', '服务仍可用', 'good'), kpi('提供者真正下线', '最后一步', 'neutral')],
      scene: swim('拔掉提供者：消费者先清理，提供者后下线', [
        { id: 'p', label: '提供者 provider', sublabel: '提供 sqlite', tone: 'green' },
        { id: 'c', label: '消费者 consumer', sublabel: 'inject: [db]', tone: 'violet' },
      ], [
        { id: 'p1', laneId: 'p', start: 2, end: 24, label: 'ACTIVE', tone: 'green', status: 'done' },
        { id: 'p2', laneId: 'p', start: 26, end: 50, label: 'UNLOADING · 等待', tone: 'green', status: 'blocked' },
        { id: 'p3', laneId: 'p', start: 72, end: 96, label: 'DISPOSED', tone: 'green', status: 'done' },
        { id: 'c1', laneId: 'c', start: 2, end: 24, label: 'ACTIVE', tone: 'violet', status: 'done' },
        { id: 'c2', laneId: 'c', start: 26, end: 68, label: 'UNLOADING · 清理时还能用 sqlite', tone: 'violet', status: 'done' },
        { id: 'c3', laneId: 'c', start: 70, end: 96, label: 'PENDING · 等新提供者', tone: 'violet', status: 'done' },
      ], [{ id: 'ev', laneId: 'c', pos: 47, label: '先存盘', tone: 'orange', emphasized: true }], [{ pos: 0, label: '拔掉' }, { pos: 100, label: '下线完成' }]),
    },
    {
      shortLabel: '类型声明合并',
      badge: 'RECAP',
      title: '类型：declare module 让 ctx.llm 有提示',
      paragraphs: [
        '最后一个问题：`ctx.llm` 在 TypeScript 里是什么类型？Context 类上并没有 `llm` 这个字段。答案是声明合并：提供服务的包，顺手给 Context 补一个类型声明。',
        'DSH 的每个服务包都这么做（`declare module \'@deepseek-ai/cordis\'`）。于是，只要 import 了这个包，所有插件里的 `ctx.llm` 都有完整的类型提示，但运行时依然只靠服务名，彼此没有代码上的依赖。类型是编译时的糖，解耦是运行时的真。',
      ],
      sourceDrawer: namiSrc(
        '服务包给 Context 补类型',
        'packages/llm/src/index.ts',
        'ts',
        `// packages/llm/src/index.ts
declare module '@nami/cordis' {
  interface Context {
    llm: LlmRuntime
  }
}` ,
        'DSH 里对应写法是 declare module \'@deepseek-ai/cordis\'。类型提示来自声明合并，运行时只靠服务名。',
      ),
      recapTable: [
        { question: '服务怎么提供？', decision: 'Service 构造时 ctx.provide，一名只能一主', because: 'provide 是 effect，随插件上下线；冲突报错避免两个真相' },
        { question: '依赖怎么声明？', decision: 'static inject / inject 数组', because: '框架据此决定启动顺序、重启与下线通知' },
        { question: '没声明的服务能偷读吗？', decision: '不能；可选依赖用 ctx.get 或 ctx.inject', because: '依赖必须可被框架看见，否则下线时不知道通知谁' },
      ],
      kpis: [kpi('类型机制', 'declare module', 'good'), kpi('运行时耦合', '只靠服务名', 'good'), kpi('本课步骤', '6 步', 'neutral')],
      scene: iso('三角色：定义 / 提供 / 使用', [
        { id: 'def', x: 60, y: 200, label: '定义服务', sublabel: 'llm 包：只定义接口', tone: 'blue' },
        { id: 'prov', x: 380, y: 200, label: '提供实现', sublabel: 'llm-deepseek：注册适配器', tone: 'green', active: true },
        { id: 'use', x: 700, y: 200, label: '使用服务', sublabel: 'agent-loop：只认 ctx.llm', tone: 'violet' },
        { id: 'table', x: 180, y: 420, label: '服务表 + declare module', sublabel: '运行时靠名字，编译时靠类型', tone: 'dark', size: 'platform' },
      ], [
        { from: 'def', to: 'table', label: '声明 llm: LlmRuntime' },
        { from: 'prov', to: 'table', label: 'provide' },
        { from: 'use', to: 'table', label: 'inject + 读取' },
      ]),
    },
  ]),
);

const L6 = lesson(
  'events-bus',
  'ch02',
  2,
  'Cordis 主板',
  4,
  4,
  '五种事件与 waterfall 陷阱',
  '服务是「我要用你」，事件是「我广播一下，谁感兴趣谁来」。审批、沙箱、重试都挂在事件上。',
  14,
  '核心',
  [
    { text: '区分 emit / parallel / serial / bail / waterfall 五种触发方式', completedAtStep: 2 },
    { text: '讲清 waterfall 的洋葱模型与 next() 的责任', completedAtStep: 3 },
    { text: '说出 DSH 里事件的用量分布与 internal/* 的用途', completedAtStep: 5 },
  ],
  steps([
    {
      shortLabel: 'on 与 emit',
      badge: 'PROBLEM',
      title: 'on 和 emit：说的一方不知道谁在听',
      paragraphs: [
        '最基本的用法：一个插件监听，另一个插件触发。`ctx.on(\'greet\', who => …)` 只管听，`ctx.emit(\'greet\', \'nami\')` 只管说，它不知道 A 的存在。',
        '和服务不同，事件不需要 inject。说的一方和听的一方只约定一个事件名。监听也是一次注册，同样记在插件的账本上：插件卸载，它挂的监听自动摘掉。DSH 里 `ctx.on` 出现了 183 次，是除了 inject 之外用得最多的 API。',
      ],
      kpis: [kpi('ctx.on 出现', '183 次', 'neutral'), kpi('事件需要 inject', '不需要', 'good'), kpi('卸载后监听', '自动摘掉', 'good')],
      scene: iso('事件：只约定一个名字', [
        { id: 'a', x: 120, y: 200, label: '插件 A', sublabel: 'ctx.on(\'greet\', …)', tone: 'blue' },
        { id: 'bus', x: 420, y: 200, label: '事件总线', sublabel: 'events · _hooks[name]', tone: 'dark', active: true },
        { id: 'b', x: 720, y: 200, label: '插件 B', sublabel: 'ctx.emit(\'greet\', \'nami\')', tone: 'green' },
      ], [
        { from: 'a', to: 'bus', label: '监听' },
        { from: 'b', to: 'bus', label: '触发' },
      ], [{ x: 480, y: 120, text: '双方互不知道对方存在', tone: 'neutral' }]),
    },
    {
      shortLabel: '五种触发',
      badge: 'TECHNIQUE',
      title: '五种触发方式：区别在返回值怎么处理',
      paragraphs: [
        '「触发一个事件」听起来只有一种做法，但 Cordis 提供了五种，区别在于怎么处理监听者的返回值：`emit` 同步全部调用、什么都不返回（DSH 用 24 次）；`parallel` 异步一起跑，等全部完成，有失败就一起抛出（1 次）；`serial` 异步一个一个 await，返回第一个非空返回值（0 次）；`bail` 同步一个一个调用，返回第一个非空返回值（3 次）；`waterfall` 洋葱式，每层拿到 `next`，返回最终结果（13 次）。',
        '`bail` 适合「找一个能处理的人」：比如有好几个插件都能解析某种文件，谁先认领就用谁的。三个监听者（第一个返回 undefined，第二个返回 `second`，第三个返回 `third`）时，`bail` 和 `serial` 都停在 `second`，第三个监听者根本没被调用。',
      ],
      kpis: [kpi('emit', '24 次', 'neutral'), kpi('waterfall', '13 次', 'good'), kpi('bail / parallel / serial', '3 / 1 / 0 次', 'neutral')],
      scene: swim('五种触发方式一览', [
        { id: 'emit', label: 'emit', sublabel: '同步 · 全调 · 无返回', tone: 'blue' },
        { id: 'par', label: 'parallel', sublabel: '异步一起跑', tone: 'green' },
        { id: 'ser', label: 'serial / bail', sublabel: '第一个非空即停', tone: 'orange' },
        { id: 'wf', label: 'waterfall', sublabel: '洋葱 · 每层拿 next', tone: 'violet' },
      ], [
        { id: 'a', laneId: 'emit', start: 2, end: 40, label: '全部监听同步调用', tone: 'blue', status: 'done' },
        { id: 'b', laneId: 'par', start: 2, end: 55, label: '并行 await 全部', tone: 'green', status: 'parallel' },
        { id: 'c', laneId: 'ser', start: 2, end: 45, label: '监听 1 → undefined', tone: 'orange', status: 'done' },
        { id: 'd', laneId: 'ser', start: 46, end: 70, label: '监听 2 → second · 停', tone: 'orange', status: 'done' },
        { id: 'e', laneId: 'wf', start: 2, end: 90, label: '监听 1 → next() → 监听 2 → next() → 默认实现', tone: 'violet', status: 'done' },
      ], [{ id: 'ev', laneId: 'ser', pos: 58, label: '监听 3 没被调用', tone: 'orange', emphasized: true }]),
    },
    {
      shortLabel: 'waterfall 洋葱',
      badge: 'SOLUTION',
      title: 'waterfall：留给别人插手的口子',
      paragraphs: [
        '五种方式里，`waterfall` 最值得细看。它是 DSH 能做到「不改核心代码就能改行为」的关键。触发方把「默认怎么做」作为最后一个参数传进来；每个监听者拿到 `next`，可以放行（调 `next()` 交给下一层）、拦截（不调 `next()`，直接返回自己的结果）、改写（改一下参数再调 `next()`，或者调完 `next()` 改一下结果）。',
        '看迷你版 tools 服务里的工具执行：每次工具调用都要过三道瀑布（`tools/pre-execute`、`tools/execute`、`tools/post-execute`）。没人监听时，三道瀑布都直接执行默认实现，就是普通的工具调用。想加一道审批？写一个插件挂在 `tools/pre-execute` 上，工具和 Agent 循环一行没改，审批就生效了；卸载这个插件，审批随之消失。',
      ],
      sourceDrawer: namiSrc(
        'waterfall：洋葱式 dispatch',
        'packages/cordis/src/events.ts',
        'ts',
        `waterfall(...args: any[]) {
  const cbs = this.dispatch('waterfall', args)
  const inner = args.pop()          // 最后一个参数：最里层的默认实现
  const next = (): any => {
    const cb = cbs.shift() ?? inner
    return cb(...args)
  }
  args.push(next)
  return next()
}`,
        'DSH 真实的 tools 包同样定义了这三道瀑布事件，在核心代码里分别出现 49、35、55 次。',
      ),
      kpis: [kpi('工具执行瀑布', '3 道', 'good'), kpi('pre-execute 出现', '49 次', 'neutral'), kpi('无监听时', '直接跑默认实现', 'neutral')],
      scene: swim('三道瀑布：工具执行要过三关', [
        { id: 'pre', label: 'tools/pre-execute', sublabel: '审批、权限、沙箱', tone: 'orange' },
        { id: 'exe', label: 'tools/execute', sublabel: '真正执行工具', tone: 'blue' },
        { id: 'post', label: 'tools/post-execute', sublabel: '结果加工、记录', tone: 'green' },
      ], [
        { id: 'a', laneId: 'pre', start: 2, end: 30, label: 'guard 监听 → next() 放行', tone: 'orange', status: 'done' },
        { id: 'b', laneId: 'exe', start: 32, end: 60, label: '执行 get_time', tone: 'blue', status: 'done' },
        { id: 'c', laneId: 'post', start: 62, end: 90, label: '默认实现返回结果', tone: 'green', status: 'done' },
      ], [{ id: 'ev', laneId: 'pre', pos: 16, label: '不调 next() 即拦截', tone: 'rose', emphasized: true }], [{ pos: 0, label: '调用工具' }, { pos: 100, label: '拿到结果' }]),
    },
    {
      shortLabel: 'waterfall 陷阱',
      badge: 'INSIGHT',
      title: 'waterfall 陷阱：忘了 next()，链就断了',
      paragraphs: [
        'waterfall 的威力来自一个约定，也带来一个陷阱：`监听者必须调用 next()，链才会继续`。一个监听者忘了调 `next()`——或者有意不调——后面的监听者和最里层的默认行为都不会执行。',
        '有意不调就是拦截（审批拒绝时就该这样）；无意忘了调，就是 bug：工具明明没被审批拒绝，却永远不执行；模型请求明明没人拦截，却永远不到适配器。写 waterfall 监听时，先问自己：我是要放行、拦截，还是改写？三者只有拦截可以不调 `next()`。',
      ],
      callout: { kind: 'warn', title: '调试线索', text: '工具调用「悄无声息地没执行」，先查 tools/pre-execute 上是不是挂了一个忘了调 next() 的监听；模型请求「发不出去」，同理查 llm/stream。' },
      kpis: [kpi('忘了 next()', '链截断', 'bad'), kpi('有意不调', '拦截', 'neutral'), kpi('放行 / 改写', '必须调 next()', 'good')],
      scene: swim('忘了 next()：默认实现永远到不了', [
        { id: 'ok', label: '正确：放行', sublabel: '监听 → next() → 默认实现', tone: 'green' },
        { id: 'bad', label: '错误：忘调 next()', sublabel: '监听返回，链断了', tone: 'rose' },
      ], [
        { id: 'a', laneId: 'ok', start: 2, end: 34, label: '监听：检查后 next()', tone: 'green', status: 'done' },
        { id: 'b', laneId: 'ok', start: 36, end: 90, label: '默认实现执行', tone: 'green', status: 'done' },
        { id: 'c', laneId: 'bad', start: 2, end: 40, label: '监听：返回 undefined，没调 next()', tone: 'rose', status: 'error' },
        { id: 'd', laneId: 'bad', start: 42, end: 90, label: '默认实现：永远到不了', tone: 'rose', status: 'blocked' },
      ], [{ id: 'ev', laneId: 'bad', pos: 41, label: '链在这里断了', tone: 'rose', emphasized: true }]),
    },
    {
      shortLabel: 'internal 事件',
      badge: 'TECHNIQUE',
      title: '框架自己的事件：internal/*',
      paragraphs: [
        '每触发一个普通事件，框架都会顺带发一个 `internal/dispatch`。框架自己也通过事件对外报告发生了什么，迷你版保留了四个：`internal/dispatch`（任何业务事件被触发时，DSH 用 23 次）、`internal/plugin`（插件挂载、卸载时，8 次）、`internal/service`（服务上线、下线时，2 次）、`internal/status`（插件状态变化时，1 次）。',
        'DSH 用 `internal/dispatch` 做遥测和调试：挂一个监听，就能看到整个系统里所有事件的流动。兼容性测试里打印的每一行 `[status] xxx: PENDING -> LOADING`，用的就是 `internal/status`。可视化页面里的状态面板，背后也是这个思路。',
      ],
      kpis: [kpi('internal/dispatch', '23 次', 'neutral'), kpi('internal/plugin', '8 次', 'neutral'), kpi('internal/status', '1 次', 'neutral')],
      scene: tree('internal/*：框架的自我报告', [
        { id: 'bus', x: 500, y: 60, kind: 'root', label: '事件总线', sublabel: '每次 dispatch 都顺带发 internal/dispatch', status: 'active' },
        { id: 'd', x: 160, y: 200, kind: 'event', label: 'internal/dispatch', sublabel: '任何业务事件 · 23 次' },
        { id: 'p', x: 380, y: 200, kind: 'event', label: 'internal/plugin', sublabel: '挂载 / 卸载 · 8 次' },
        { id: 's', x: 620, y: 200, kind: 'event', label: 'internal/service', sublabel: '上线 / 下线 · 2 次' },
        { id: 'st', x: 840, y: 200, kind: 'event', label: 'internal/status', sublabel: '状态变化 · 1 次', status: 'highlight' },
        { id: 'tel', x: 500, y: 340, kind: 'log', label: '遥测 / 调试 / 可视化状态面板', sublabel: '挂一个监听，看见所有事件流动' },
      ], [
        { from: 'bus', to: 'd' },
        { from: 'bus', to: 'p' },
        { from: 'bus', to: 's' },
        { from: 'bus', to: 'st' },
        { from: 'st', to: 'tel', label: '[status] xxx: PENDING → LOADING', animated: true },
        { from: 'd', to: 'tel' },
      ]),
    },
    {
      shortLabel: '事件总复盘',
      badge: 'RECAP',
      title: '服务 vs 事件：两种联系方式',
      paragraphs: [
        '服务是「我要用你」：点对点、有类型、要声明 inject，适合能力调用。事件是「我广播一下，谁感兴趣谁来」：一对多、无需 inject、只约定名字，适合扩展点与通知。',
        'DSH 的审批、沙箱、重试、持久化，几乎都挂在事件上——尤其是 waterfall。记住它的三条军规：放行要调 `next()`，拦截可以不调，改写可以在 `next()` 前后动手脚。',
      ],
      recapTable: [
        { question: '什么时候用服务，什么时候用事件？', decision: '能力调用用服务，扩展与通知用事件', because: '服务是点对点的契约，事件是一对多的广播' },
        { question: '怎么不改核心代码加能力？', decision: '挂 waterfall 监听（pre-execute / llm/stream）', because: '默认实现是最里层，监听在外层决定放行、拦截或改写' },
        { question: '监听会不会泄漏？', decision: '不会：监听是 effect，随插件卸载自动摘除', because: 'ctx.on 内部走 ctx.fiber.effect 记账' },
      ],
      kpis: [kpi('两种联系', '服务 + 事件', 'good'), kpi('waterfall 用量', '13 次', 'neutral'), kpi('本课步骤', '6 步', 'neutral')],
      scene: iso('服务 vs 事件', [
        { id: 'svc', x: 120, y: 200, label: '服务 ctx.llm', sublabel: '点对点 · 要 inject · 有类型', tone: 'blue' },
        { id: 'evt', x: 620, y: 200, label: '事件 tools/pre-execute', sublabel: '一对多 · 不要 inject · 只约定名字', tone: 'orange', active: true },
        { id: 'loop', x: 370, y: 60, label: 'agent-loop', sublabel: '既用服务，也发事件', tone: 'violet', size: 'sm' },
      ], [
        { from: 'loop', to: 'svc', label: '调用能力' },
        { from: 'loop', to: 'evt', label: '广播 / 被插手' },
      ]),
    },
  ]),
);

const L7 = lesson(
  'ask-journey',
  'ch03',
  3,
  'Agent 循环',
  1,
  2,
  '一次提问「现在几点？」完整旅程',
  '在网页上问一句「现在几点？」，请求从浏览器进来，经过哪些插件，又怎么一个字一个字流回去？本课跟着它走完全程。',
  16,
  '核心',
  [
    { text: '按顺序说出一次提问经过的 8 个关键节点', completedAtStep: 3 },
    { text: '解释 webserver 为什么只监听事件、不直接调循环', completedAtStep: 4 },
    { text: '讲清工具结果如何触发第二轮模型调用', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '入口三行',
      badge: 'PROBLEM',
      title: '入口只有三行：spine + 模型 + 入口',
      paragraphs: [
        '整个 Agent 的入口只有几行（`apps/web/src/main.ts`）：挂核心套件 `spine`，挂模型适配器（有 API Key 就接 DeepSeek，没有就用离线假模型），挂入口 `webserver`。',
        '`spine` 是一个套件插件，在自己的 `apply` 里一口气挂上核心插件：`LlmRuntime`、`SessionStore`、`ToolRuntime`、`SystemPrompt`、两个工具插件、`AgentLoop`。这完全照搬 DSH 的做法——DSH 的 `agent-spine-demo` 说明里写得很清楚：套件只装「每个 Agent 都需要的东西」，连哪家模型、用什么入口故意留在外面，由使用方决定。',
      ],
      sourceDrawer: namiSrc(
        '入口：三行挂起整个 Agent',
        'apps/web/src/main.ts',
        'ts',
        `const app = new Context()

// 1. 核心套件：llm、sessions、tools、systemPrompt、agentLoop，外加两个工具插件
app.plugin(spine, { workspace: env.WORKSPACE ?? process.cwd() })

// 2. 模型适配器：有 API Key 就接 DeepSeek，没有就用离线假模型
if (apiKey) app.plugin(deepseek, { apiKey, baseURL: env.BASE_URL, model: env.MODEL })
else app.plugin(mock)

// 3. 入口：网页服务
app.plugin(webserver, { port: Number(env.PORT ?? 3000), staticDir })`,
        '迷你版入口。DSH 的 dsh-base + 产品层是同一思路的工业版：核心套件 + 适配器 + 入口。',
      ),
      kpis: [kpi('入口代码', '3 次 plugin', 'good'), kpi('spine 挂插件', '7 个', 'neutral'), kpi('模型选择', '运行时决定', 'neutral')],
      scene: tree('入口三行挂起的插件树', [
        { id: 'app', x: 500, y: 60, kind: 'root', label: 'new Context()', sublabel: 'apps/web/src/main.ts', status: 'active' },
        { id: 'spine', x: 240, y: 190, kind: 'plugin', label: 'spine', sublabel: '核心套件 · 7 个插件', status: 'highlight' },
        { id: 'model', x: 500, y: 190, kind: 'plugin', label: 'deepseek / mock', sublabel: '模型适配器' },
        { id: 'web', x: 760, y: 190, kind: 'plugin', label: 'webserver', sublabel: '入口 · port 3000', status: 'highlight' },
        { id: 'loop', x: 120, y: 330, kind: 'plugin', label: 'AgentLoop', sublabel: 'agentLoop' },
        { id: 'llm', x: 360, y: 330, kind: 'service', label: 'LlmRuntime', sublabel: 'ctx.llm' },
        { id: 'tools', x: 620, y: 330, kind: 'service', label: 'ToolRuntime', sublabel: 'ctx.tools' },
        { id: 'sess', x: 860, y: 330, kind: 'service', label: 'SessionStore', sublabel: 'ctx.sessions' },
      ], [
        { from: 'app', to: 'spine' },
        { from: 'app', to: 'model' },
        { from: 'app', to: 'web' },
        { from: 'spine', to: 'loop' },
        { from: 'spine', to: 'llm' },
        { from: 'spine', to: 'tools' },
        { from: 'spine', to: 'sess' },
      ]),
    },
    {
      shortLabel: '请求进来',
      badge: 'TECHNIQUE',
      title: '第 1–4 步：请求进来，webserver 只监听',
      paragraphs: [
        '浏览器把问题 POST 到 `/api/chat`。`webserver` 插件用 `ctx.sessions` 找到这次对话的会话（它能读到 `ctx.sessions`，是因为它声明了 `inject: [\'agentLoop\', \'sessions\']`），然后在事件总线上挂两个监听：`agent/text-delta` 和 `agent/tool-call`。',
        '`webserver` 不知道谁会发这两个事件，它只管听。这是事件解耦的典型用法：入口不知道循环的存在，循环也不知道入口的存在。',
      ],
      sourceDrawer: namiSrc(
        'webserver：挂两个监听，等事件流回来',
        'packages/webserver/src/index.ts',
        'ts',
        `const disposers = [
  ctx.on('agent/text-delta', (s, text) => {
    if (s === session) send('delta', { text })
  }),
  ctx.on('agent/tool-call', (s, call) => {
    if (s === session) send('tool', { name: call.name })
  }),
]`,
        '两个监听在响应结束时撤销（disposers），不会泄漏到下一次请求。',
      ),
      kpis: [kpi('webserver 监听', '2 个事件', 'neutral'), kpi('webserver 的 inject', 'agentLoop + sessions', 'neutral'), kpi('入口知道循环吗', '不知道', 'good')],
      scene: swim('请求进来：POST → 找会话 → 挂监听', [
        { id: 'browser', label: '浏览器', sublabel: 'POST /api/chat「现在几点？」', tone: 'blue' },
        { id: 'web', label: 'webserver', sublabel: '找会话 + 挂监听', tone: 'green' },
        { id: 'loop', label: 'agent-loop', sublabel: '稍后被调用', tone: 'violet' },
      ], [
        { id: 'a', laneId: 'browser', start: 2, end: 20, label: 'POST 问题', tone: 'blue', status: 'done' },
        { id: 'b', laneId: 'web', start: 22, end: 48, label: 'ctx.sessions 找会话', tone: 'green', status: 'done' },
        { id: 'c', laneId: 'web', start: 50, end: 78, label: 'on(agent/text-delta) + on(agent/tool-call)', tone: 'green', status: 'done' },
        { id: 'd', laneId: 'loop', start: 80, end: 98, label: 'ctx.agentLoop.run()', tone: 'violet', status: 'running' },
      ], [], [{ pos: 0, label: '第 1 步' }, { pos: 100, label: '第 5 步' }]),
    },
    {
      shortLabel: '进入循环',
      badge: 'SOLUTION',
      title: '第 5–7 步：进入 Agent 循环，写日志、拼提示词',
      paragraphs: [
        '`ctx.agentLoop.run()` 先把用户消息写进会话日志——会话是一条只追加的事件日志，每写一条广播一次 `session/event`——再拼装系统提示词。提示词不是写死的字符串，而是各个插件贡献的段落按顺序拼起来的。',
        '到这里，循环还没有见过模型。它只做了两件准备工作：记录（会话日志）与组装（系统提示词）。这两件工作分别属于 `sessions` 与 `systemPrompt` 两个服务，循环只是调用方。',
      ],
      kpis: [kpi('写日志', 'append + 广播 session/event', 'neutral'), kpi('系统提示词', '多插件段落拼接', 'neutral'), kpi('循环见模型了吗', '还没有', 'neutral')],
      scene: swim('进入循环：记录 → 组装', [
        { id: 'loop', label: 'agent-loop', sublabel: 'run()', tone: 'violet' },
        { id: 'sess', label: 'sessions', sublabel: '只追加事件日志', tone: 'green' },
        { id: 'prompt', label: 'systemPrompt', sublabel: '段落拼接', tone: 'rose' },
      ], [
        { id: 'a', laneId: 'loop', start: 2, end: 26, label: 'run() 开始', tone: 'violet', status: 'done' },
        { id: 'b', laneId: 'sess', start: 28, end: 54, label: 'append 用户消息 + 广播', tone: 'green', status: 'done' },
        { id: 'c', laneId: 'prompt', start: 56, end: 82, label: '拼装系统提示词', tone: 'rose', status: 'done' },
        { id: 'd', laneId: 'loop', start: 84, end: 98, label: '准备调用模型', tone: 'violet', status: 'running' },
      ], [{ id: 'ev', laneId: 'sess', pos: 54, label: 'session/event', tone: 'green' }]),
    },
    {
      shortLabel: '调用模型',
      badge: 'TECHNIQUE',
      title: '第 8–10 步：调用模型，模型决定调工具',
      paragraphs: [
        '循环调 `ctx.llm.stream()`，经过 `llm/stream` 瀑布，到达适配器。适配器看到「几点」，又发现工具表里有 `get_time`，于是返回一个工具调用，而不是文字。',
        '注意这里的决策权：`要不要调工具，是模型决定的`，不是循环写死的。循环只负责把工具表（`ctx.tools` 里的工具描述）交给模型，再把模型返回的工具调用执行掉。工具表里没有 `get_time`，模型就不会调它。',
      ],
      kpis: [kpi('模型调用', 'ctx.llm.stream()', 'neutral'), kpi('经过瀑布', 'llm/stream', 'neutral'), kpi('模型返回', '工具调用，不是文字', 'good')],
      scene: swim('调用模型：stream → 瀑布 → 适配器', [
        { id: 'loop', label: 'agent-loop', sublabel: 'ctx.llm.stream()', tone: 'violet' },
        { id: 'llm', label: 'llm 服务', sublabel: 'waterfall llm/stream', tone: 'blue' },
        { id: 'ad', label: 'deepseek 适配器', sublabel: 'OpenAI 兼容接口', tone: 'green' },
      ], [
        { id: 'a', laneId: 'loop', start: 2, end: 24, label: 'stream(请求)', tone: 'violet', status: 'done' },
        { id: 'b', laneId: 'llm', start: 26, end: 50, label: 'llm/stream 瀑布', tone: 'blue', status: 'done' },
        { id: 'c', laneId: 'ad', start: 52, end: 80, label: '看到「几点」+ 工具表有 get_time', tone: 'green', status: 'done' },
        { id: 'd', laneId: 'loop', start: 82, end: 98, label: '收到工具调用', tone: 'violet', status: 'running' },
      ], [{ id: 'ev', laneId: 'ad', pos: 66, label: '返回工具调用', tone: 'green', emphasized: true }]),
    },
    {
      shortLabel: '执行工具',
      badge: 'SOLUTION',
      title: '第 11–13 步：执行工具，结果写回日志',
      paragraphs: [
        '循环把工具调用交给 `ctx.tools.execute()`，过三道瀑布，最后执行 `tool-time` 插件登记的 `get_time`，结果写回会话日志。',
        '循环在执行前还会广播一次 `agent/tool-call`——第 1 步里 `webserver` 挂的监听收到后，会把工具名推给浏览器，前端可以显示「正在查询时间…」。工具执行与界面反馈之间，依然只靠事件连接。',
      ],
      sourceDrawer: namiSrc(
        '循环：广播工具调用，执行，结果写回日志',
        'packages/agent-loop/src/index.ts',
        'ts',
        `for (const call of calls) {
  this.ctx.emit('agent/tool-call', session, call)
  const result = await tools.execute({
    name: call.name, args, sessionId: session.id,
  })
  session.append({
    type: 'tool-result', toolCallId: call.id,
    name: call.name, content: result.content,
  })
}`,
        'execute 内部过三道瀑布（pre-execute / execute / post-execute），见第 9 课。',
      ),
      kpis: [kpi('工具执行', 'tools.execute()', 'neutral'), kpi('瀑布', '3 道', 'neutral'), kpi('结果去向', '写回会话日志', 'good')],
      scene: swim('执行工具：广播 → 三道瀑布 → 写回', [
        { id: 'loop', label: 'agent-loop', sublabel: 'for 每个工具调用', tone: 'violet' },
        { id: 'tools', label: 'tools', sublabel: '三道瀑布', tone: 'orange' },
        { id: 'time', label: 'tool-time', sublabel: 'get_time', tone: 'green' },
        { id: 'sess', label: 'sessions', sublabel: 'append tool-result', tone: 'blue' },
      ], [
        { id: 'a', laneId: 'loop', start: 2, end: 22, label: 'emit agent/tool-call', tone: 'violet', status: 'done' },
        { id: 'b', laneId: 'tools', start: 24, end: 48, label: 'pre → execute → post', tone: 'orange', status: 'done' },
        { id: 'c', laneId: 'time', start: 50, end: 68, label: 'get_time 执行', tone: 'green', status: 'done' },
        { id: 'd', laneId: 'sess', start: 70, end: 96, label: 'append tool-result', tone: 'blue', status: 'done' },
      ], [{ id: 'ev', laneId: 'loop', pos: 12, label: '前端显示「查询中」', tone: 'violet' }]),
    },
    {
      shortLabel: '回答流回',
      badge: 'RECAP',
      title: '第 14–16 步：带着工具结果再问一次，文字流回浏览器',
      paragraphs: [
        '带着工具结果进入第二轮。这次模型给出文字，循环每收到一小段就广播一次 `agent/text-delta`。第 1 步挂好的监听收到后，转成 SSE 推给浏览器，文字就一个字一个字地出现了。最后撤销这两个监听，关闭响应。',
        '整个过程中，`webserver`、`agent-loop`、`llm`、`tools`、`tool-time` 互相都没有 import 对方，全靠服务名和事件名连在一起。拔掉其中任何一个，旅程就在对应的节点停下——这正是下一课要讲的热插拔。',
      ],
      recapTable: [
        { question: '一次提问经过了谁？', decision: '浏览器 → webserver → loop → llm → 适配器 → tools → tool-time → 再回 loop → 浏览器', because: '每一步的交接点都是服务名或事件名' },
        { question: '文字怎么一个字一个字出现？', decision: 'agent/text-delta 事件 → SSE 推送', because: '循环每收到一小段就广播，webserver 的监听负责转发' },
        { question: '工具结果去了哪？', decision: '先写回会话日志，再进入第二轮模型调用', because: '会话是只追加日志，模型可见即已记录' },
      ],
      kpis: [kpi('全程步骤', '16 步', 'neutral'), kpi('插件间 import', '0 次', 'good'), kpi('流式推送', 'SSE + text-delta', 'good')],
      scene: swim('第二轮：带工具结果再问，文字流回', [
        { id: 'loop', label: 'agent-loop', sublabel: '第二轮 stream()', tone: 'violet' },
        { id: 'llm', label: 'llm + 适配器', sublabel: '返回文字流', tone: 'blue' },
        { id: 'web', label: 'webserver', sublabel: '监听转发 SSE', tone: 'green' },
        { id: 'browser', label: '浏览器', sublabel: '逐字显示', tone: 'orange' },
      ], [
        { id: 'a', laneId: 'loop', start: 2, end: 24, label: '带工具结果再调 stream', tone: 'violet', status: 'done' },
        { id: 'b', laneId: 'llm', start: 26, end: 52, label: '返回文字流', tone: 'blue', status: 'done' },
        { id: 'c', laneId: 'loop', start: 54, end: 70, label: '每段 emit text-delta', tone: 'violet', status: 'done' },
        { id: 'd', laneId: 'web', start: 54, end: 78, label: '监听 → SSE 推送', tone: 'green', status: 'done' },
        { id: 'e', laneId: 'browser', start: 72, end: 96, label: '逐字显示 · 撤销监听 · 关闭', tone: 'orange', status: 'done' },
      ], [{ id: 'ev', laneId: 'loop', pos: 62, label: 'agent/text-delta × N', tone: 'violet', emphasized: true }]),
    },
  ]),
);

const L8 = lesson(
  'agent-loop',
  'ch03',
  3,
  'Agent 循环',
  2,
  2,
  'AgentLoop 与 setFactory',
  'Agent 循环本身也是插件：它用 setFactory 把自己登记成 Agent 工厂，循环内部是 turn 套 step 的两层结构。',
  14,
  '进阶',
  [
    { text: '解释 setFactory 的作用：循环如何成为「默认的 Agent 工厂」', completedAtStep: 2 },
    { text: '区分 turn（一轮对话）与 step（一步工具调用）', completedAtStep: 3 },
    { text: '说清循环调模型时为什么不 import 模型', completedAtStep: 5 },
  ],
  steps([
    {
      shortLabel: '循环也是插件',
      badge: 'PROBLEM',
      title: '循环本身也是插件：没有特权',
      paragraphs: [
        '很多人第一次听说「Agent 循环是插件」会愣一下：循环不是最核心的东西吗？在 DSH 里，核心不等于特权。`AgentLoop` 和一个读文件的小工具一样，都是挂在 Cordis 上的插件，区别只在于它声明的依赖更多、提供的服务更关键。',
        '这意味着循环也可以被替换：写一个自己的循环插件，同样 `setFactory` 登记上去，整个系统就用你的循环跑。框架不关心谁是「正统」循环，只认最后登记的那个工厂。',
      ],
      kpis: [kpi('循环的地位', '插件，无特权', 'neutral'), kpi('可替换', '是', 'good'), kpi('决定权', '最后登记的工厂', 'neutral')],
      scene: iso('循环：插件，不是内核', [
        { id: 'cordis', x: 180, y: 400, label: 'Cordis 主板', sublabel: '没有特权内核', tone: 'dark', size: 'platform' },
        { id: 'loop', x: 120, y: 180, label: 'AgentLoop', sublabel: '也是一个插件', tone: 'violet', active: true },
        { id: 'fs', x: 380, y: 180, label: 'tool-fs', sublabel: '读文件工具', tone: 'green' },
        { id: 'time', x: 640, y: 180, label: 'tool-time', sublabel: '时间工具', tone: 'orange' },
        { id: 'alt', x: 760, y: 60, label: '我的循环', sublabel: '也可以 setFactory', tone: 'blue', size: 'sm' },
      ], [
        { from: 'loop', to: 'cordis' },
        { from: 'fs', to: 'cordis' },
        { from: 'time', to: 'cordis' },
        { from: 'alt', to: 'cordis', dashed: true, label: '替换' },
      ]),
    },
    {
      shortLabel: 'setFactory',
      badge: 'TECHNIQUE',
      title: 'setFactory：把自己登记成 Agent 工厂',
      paragraphs: [
        '`AgentLoop` 的构造函数里有一行关键代码：`ctx.effect(() => ctx.agents.setFactory(this))`。`agents` 服务维护着「当前用哪个工厂创建 Agent」，循环把自己登记上去，于是 `webserver` 调 `ctx.agentLoop.run()` 时，跑的就是这个循环。',
        '因为登记走的是 `effect`，循环卸载时工厂登记自动撤销；如果有另一个循环插件后登记上去，它就成为新的工厂。这就是「工厂」模式在插件世界的样子：登记与撤销都由框架记账。',
      ],
      sourceDrawer: dshSrc(
        'setFactory 登记：一个 effect',
        'packages/core/agent-loop/src/index.ts',
        'ts',
        `export class AgentLoop extends Service implements AgentFactory {
  static inject = ['agents', 'sessions', 'llm', 'tools', 'systemPrompt']

  constructor(ctx: Context, config: Config) {
    super(ctx, 'agentLoop')
    ctx.effect(() => ctx.agents.setFactory(this))
  }
}`,
        'setFactory 返回撤销函数，放进 effect：循环卸载，工厂登记自动撤掉。',
      ),
      kpis: [kpi('登记方式', 'effect', 'good'), kpi('卸载时', '自动撤销', 'good'), kpi('inject 服务数', '5 个', 'neutral')],
      scene: tree('agents 服务：工厂登记表', [
        { id: 'agents', x: 500, y: 60, kind: 'root', label: 'ctx.agents', sublabel: 'Agent 工厂登记处', status: 'active' },
        { id: 'loop', x: 240, y: 200, kind: 'plugin', label: 'AgentLoop', sublabel: 'setFactory(this)', status: 'highlight' },
        { id: 'alt', x: 760, y: 200, kind: 'plugin', label: '另一个循环', sublabel: '后登记 → 成为新工厂', status: 'dimmed' },
        { id: 'web', x: 500, y: 340, kind: 'plugin', label: 'webserver', sublabel: '只认工厂，不认实现' },
      ], [
        { from: 'agents', to: 'loop', label: '当前工厂', animated: true },
        { from: 'agents', to: 'alt', label: '可替换' },
        { from: 'web', to: 'agents', label: 'run() 走工厂' },
      ]),
    },
    {
      shortLabel: 'turn 与 step',
      badge: 'SOLUTION',
      title: 'turn 套 step：两层循环',
      paragraphs: [
        '一次 `run()` 是一轮 `turn`（一轮对话）；turn 里面是一步步的 `step`：调模型 → 拿到工具调用 → 执行工具 → 结果写回日志 → 再调模型……直到模型不再调工具、只给文字，或者达到步数上限。',
        '区分这两层很重要：turn 的边界是「一次用户提问」，step 的边界是「一次模型调用加工具执行」。会话日志按 turn 组织，工具调用按 step 计数，超时与步数上限也按 step 控制。',
      ],
      kpis: [kpi('turn', '一次用户提问', 'neutral'), kpi('step', '一次模型调用 + 工具执行', 'neutral'), kpi('循环终止', '无工具调用 / 步数上限', 'neutral')],
      scene: swim('turn 套 step', [
        { id: 'turn', label: 'turn（一轮对话）', sublabel: 'run() 一次', tone: 'violet' },
        { id: 'step', label: 'step', sublabel: '模型调用 + 工具执行', tone: 'blue' },
      ], [
        { id: 'a', laneId: 'turn', start: 2, end: 96, label: 'turn：用户提问 → 最终回答', tone: 'violet', status: 'running' },
        { id: 'b', laneId: 'step', start: 6, end: 30, label: 'step 1：调模型 → 调 get_time', tone: 'blue', status: 'done' },
        { id: 'c', laneId: 'step', start: 34, end: 58, label: 'step 2：带结果再调模型 → 文字', tone: 'blue', status: 'done' },
        { id: 'd', laneId: 'step', start: 62, end: 86, label: 'step 3（若模型还调工具）…', tone: 'blue', status: 'queued' },
      ], [{ id: 'ev', laneId: 'step', pos: 46, label: '无工具调用即结束', tone: 'green', emphasized: true }]),
    },
    {
      shortLabel: '收件箱与中断',
      badge: 'INSIGHT',
      title: '真实循环还有：收件箱、中断、并行工具调用',
      paragraphs: [
        '迷你版的循环是最小实现，真实 DSH 的 `packages/core/agent-loop` 还有更多机制：收件箱（用户在中途发新消息、取消，循环要能响应）、中断（工具执行可以被打断）、并行工具调用（一次返回多个工具调用时一起执行）。',
        '这些机制不改变本课的骨架：循环依然是 `inject` 五个服务、调 `llm.stream`、走 `tools.execute` 的插件。读真实源码时，可以把注意力放在循环本身的逻辑上，而不是再去猜它怎么拿到模型和工具。',
      ],
      callout: { kind: 'tip', title: '读源码的顺序', text: '先读 packages/examples/agent-spine-demo（装机清单），再读 packages/core/agent-loop（循环逻辑），最后读 packages/core/tools（执行管线）。' },
      kpis: [kpi('真实循环 extras', '收件箱 / 中断 / 并行', 'neutral'), kpi('骨架变化', '0', 'good'), kpi('读源码入口', 'agent-spine-demo', 'neutral')],
      scene: iso('真实循环的附加机制', [
        { id: 'loop', x: 400, y: 200, label: 'AgentLoop', sublabel: 'inject 5 服务 · llm.stream · tools.execute', tone: 'violet', size: 'lg', active: true },
        { id: 'inbox', x: 60, y: 60, label: '收件箱', sublabel: '中途消息 / 取消', tone: 'blue', size: 'sm' },
        { id: 'int', x: 340, y: 60, label: '中断', sublabel: '打断工具执行', tone: 'orange', size: 'sm' },
        { id: 'par', x: 620, y: 60, label: '并行工具调用', sublabel: '多个调用一起执行', tone: 'green', size: 'sm' },
        { id: 'llm', x: 120, y: 400, label: 'ctx.llm', sublabel: 'stream()', tone: 'blue' },
        { id: 'tools', x: 700, y: 400, label: 'ctx.tools', sublabel: 'execute()', tone: 'orange' },
      ], [
        { from: 'inbox', to: 'loop', dashed: true },
        { from: 'int', to: 'loop', dashed: true },
        { from: 'par', to: 'loop', dashed: true },
        { from: 'loop', to: 'llm' },
        { from: 'loop', to: 'tools' },
      ]),
    },
    {
      shortLabel: '不 import 模型',
      badge: 'TECHNIQUE',
      title: '循环调模型：stream()，没有模型 import',
      paragraphs: [
        '循环调用模型只有一行：`this.loopCtx.llm.stream(request)`。没有 import 任何模型，没有 `if (provider === \'deepseek\')` 这样的分支。模型差异被收敛在两个地方：适配器插件（把统一格式翻译成各家接口），以及 `llm/stream` 瀑布（重试、日志、改写请求都可以从这里插进去）。',
        '这就是服务定义的价值：`llm` 服务只定义「模型调用长什么样」，自己不连任何模型。换模型是换插件，不是改循环。',
      ],
      kpis: [kpi('循环里的模型分支', '0 个', 'good'), kpi('模型差异收敛处', '适配器 + 瀑布', 'neutral'), kpi('换模型改动', '换插件', 'good')],
      scene: tree('llm.stream() 的两条路', [
        { id: 'loop', x: 500, y: 60, kind: 'plugin', label: 'AgentLoop', sublabel: 'this.loopCtx.llm.stream(request)', status: 'active' },
        { id: 'wf', x: 500, y: 190, kind: 'event', label: 'llm/stream 瀑布', sublabel: '重试 · 日志 · 改写请求', status: 'highlight' },
        { id: 'ds', x: 240, y: 330, kind: 'service', label: 'deepseek 适配器', sublabel: 'OpenAI 兼容格式' },
        { id: 'mock', x: 760, y: 330, kind: 'service', label: 'mock / replay 适配器', sublabel: '离线假模型' },
      ], [
        { from: 'loop', to: 'wf' },
        { from: 'wf', to: 'ds', label: '有 API Key' },
        { from: 'wf', to: 'mock', label: '无 API Key' },
      ]),
    },
    {
      shortLabel: '循环复盘',
      badge: 'RECAP',
      title: '循环三句话',
      paragraphs: [
        'Agent 循环可以用三句话概括：它是一个插件，用 `setFactory` 把自己登记成工厂；它跑 `turn` 套 `step` 的两层循环，`step` 里调模型、执行工具、写回日志；它调模型只认 `ctx.llm.stream`，调工具只认 `ctx.tools.execute`，其余一概不认。',
        '下一章讲工具执行的那三道瀑布：审批门就挂在第一道上。',
      ],
      recapTable: [
        { question: '循环是什么？', decision: '一个插件，setFactory 登记成 Agent 工厂', because: '没有特权内核，循环也可以被替换' },
        { question: 'turn 和 step 怎么分？', decision: 'turn 是一次提问，step 是一次模型调用加工具执行', because: '日志按 turn 组织，步数与超时按 step 控制' },
        { question: '循环怎么调模型？', decision: '只调 this.loopCtx.llm.stream(request)', because: '模型差异收敛在适配器与 llm/stream 瀑布里' },
      ],
      kpis: [kpi('循环三句话', '插件 / 两层 / 只认服务名', 'good'), kpi('本课步骤', '6 步', 'neutral'), kpi('下一课', '工具审批门', 'neutral')],
      scene: iso('AgentLoop 全貌', [
        { id: 'loop', x: 400, y: 180, label: 'AgentLoop', sublabel: 'turn 套 step · setFactory', tone: 'violet', size: 'lg', active: true },
        { id: 'agents', x: 120, y: 60, label: 'agents', sublabel: '工厂登记处', tone: 'blue', size: 'sm' },
        { id: 'llm', x: 700, y: 60, label: 'llm', sublabel: 'stream()', tone: 'blue', size: 'sm' },
        { id: 'tools', x: 120, y: 380, label: 'tools', sublabel: 'execute()', tone: 'orange', size: 'sm' },
        { id: 'sess', x: 700, y: 380, label: 'sessions', sublabel: 'append()', tone: 'green', size: 'sm' },
      ], [
        { from: 'loop', to: 'agents', label: 'setFactory' },
        { from: 'loop', to: 'llm' },
        { from: 'loop', to: 'tools' },
        { from: 'loop', to: 'sess' },
      ]),
    },
  ]),
);

const L9 = lesson(
  'tools-preexecute',
  'ch04',
  4,
  '工具与审批',
  1,
  2,
  'tools/pre-execute 审批门',
  '工具执行前有一道门：tools/pre-execute 瀑布。审批、权限、沙箱都挂在这里，不改工具、不改循环。',
  12,
  '核心',
  [
    { text: '说出工具执行的三道瀑布及其顺序', completedAtStep: 2 },
    { text: '写出一个审批监听的形状：放行调 next()，拦截直接返回', completedAtStep: 3 },
    { text: '解释为什么审批插件卸载后立刻失效', completedAtStep: 5 },
  ],
  steps([
    {
      shortLabel: '工具执行三关',
      badge: 'PROBLEM',
      title: '每次工具调用，都要过三道瀑布',
      paragraphs: [
        '工具执行不是直接调函数。迷你版 `tools` 服务的 `execute` 里，每次工具调用都要过三道瀑布：`tools/pre-execute`（执行前）、`tools/execute`（执行本身）、`tools/post-execute`（执行后）。没人监听时，三道瀑布都直接执行默认实现，就是普通的工具调用。',
        'DSH 真实的 `tools` 包同样定义了这几个瀑布事件，在核心代码里分别出现 49、35、55 次。审批、沙箱这类能力就是通过它们接进工具执行流程的。',
      ],
      kpis: [kpi('瀑布道数', '3 道', 'good'), kpi('pre-execute 出现', '49 次', 'neutral'), kpi('execute / post-execute', '35 / 55 次', 'neutral')],
      scene: swim('三道瀑布', [
        { id: 'pre', label: 'tools/pre-execute', sublabel: '审批、权限', tone: 'orange' },
        { id: 'exe', label: 'tools/execute', sublabel: '执行工具本体', tone: 'blue' },
        { id: 'post', label: 'tools/post-execute', sublabel: '结果加工', tone: 'green' },
      ], [
        { id: 'a', laneId: 'pre', start: 2, end: 32, label: '监听检查 → next()', tone: 'orange', status: 'done' },
        { id: 'b', laneId: 'exe', start: 34, end: 64, label: '查工具表 → 执行', tone: 'blue', status: 'done' },
        { id: 'c', laneId: 'post', start: 66, end: 96, label: '加工结果 → 返回', tone: 'green', status: 'done' },
      ], [], [{ pos: 0, label: 'execute()' }, { pos: 100, label: '返回结果' }]),
    },
    {
      shortLabel: '审批门代码',
      badge: 'TECHNIQUE',
      title: '审批门：tools/pre-execute 上的一行监听',
      paragraphs: [
        '想加一道审批？写一个插件挂在 `tools/pre-execute` 上。真实 DSH 的审批门在 `packages/core/tools/src/index.ts` 里就是一行瀑布调用：把执行请求 `exec` 和默认行为（放行）一起传进去，瀑布的每一层决定放行还是拦截。',
        '工具和 Agent 循环一行没改，审批就生效了；卸载这个插件，审批随之消失。审批不是循环的功能，也不是工具的功能，它是挂在瀑布上的一个插件。',
      ],
      sourceDrawer: dshSrc(
        '审批门：tools/pre-execute 瀑布调用',
        'packages/core/tools/src/index.ts',
        'ts',
        `await ctx.waterfall(
  carrier, 'tools/pre-execute', exec,
  () => Promise.resolve({ kind: 'allow' }),
)`,
        '第四个参数是默认实现：没人监听时直接放行。监听者不调 next()、直接返回拒绝结果，就是拦截。',
      ),
      kpis: [kpi('审批改动', '0 行核心代码', 'good'), kpi('默认行为', '放行 allow', 'neutral'), kpi('拦截方式', '不调 next() 直接返回', 'neutral')],
      scene: iso('审批门挂在第一道瀑布上', [
        { id: 'guard', x: 120, y: 180, label: '审批插件 guard', sublabel: 'on(tools/pre-execute)', tone: 'orange', active: true },
        { id: 'pre', x: 420, y: 180, label: 'tools/pre-execute', sublabel: '第一道瀑布', tone: 'rose' },
        { id: 'exe', x: 720, y: 180, label: 'tools/execute', sublabel: '执行工具', tone: 'blue' },
        { id: 'def', x: 420, y: 400, label: '默认实现 allow', sublabel: '无人监听时直接放行', tone: 'green' },
      ], [
        { from: 'guard', to: 'pre', label: '监听' },
        { from: 'pre', to: 'exe', label: 'next() 放行' },
        { from: 'pre', to: 'def', label: '无监听时', dashed: true },
      ]),
    },
    {
      shortLabel: '写一个审批',
      badge: 'SOLUTION',
      title: '写一个审批插件：五分钟，零改动',
      paragraphs: [
        '一个最简单的审批插件长这样：监听 `tools/pre-execute`，名字是 `get_time` 就拦截并给出理由，其他一律 `next()` 放行。把它挂上去，`get_time` 就被拦下；把它卸掉，立刻恢复。',
        '`tests/agent.ts` 演示了这四种操作：调用工具 `get_time` 成功；审批插件拦截了 `get_time`；卸载审批插件后恢复；拔掉 `tool-time` 后，工具表里没有 `get_time` 了。这些都不是专门写的「热更新」功能，而是第 3、4 课那几条规则自然的结果。',
      ],
      sourceDrawer: namiSrc(
        '审批插件：拦截 get_time，其余放行',
        'packages/tools/src/index.ts（迷你版工具执行，简化）',
        'ts',
        `app.plugin({
  name: 'guard',
  apply(ctx) {
    ctx.on('tools/pre-execute', (exec, next) => {
      return exec.name === 'get_time'
        ? { allow: false, reason: '演示拦截' }
        : next()
    })
  },
})`,
        '迷你版示例。真实 DSH 的审批门同样挂在 tools/pre-execute 上，决策结构为 { kind: \'allow\' | \'deny\' }。',
      ),
      kpis: [kpi('审批插件代码', '约 10 行', 'good'), kpi('拦截后恢复', '卸载即恢复', 'good'), kpi('热插拔', '框架规则自然结果', 'neutral')],
      scene: swim('审批拦截与恢复', [
        { id: 'g', label: 'guard 审批插件', sublabel: '拦截 get_time', tone: 'orange' },
        { id: 't', label: 'get_time 调用', sublabel: '工具执行', tone: 'blue' },
      ], [
        { id: 'a', laneId: 'g', start: 2, end: 30, label: '挂上 guard', tone: 'orange', status: 'done' },
        { id: 'b', laneId: 't', start: 32, end: 52, label: '调用被拦截 · 已拦截：演示拦截', tone: 'blue', status: 'error' },
        { id: 'c', laneId: 'g', start: 54, end: 68, label: '卸载 guard', tone: 'orange', status: 'done' },
        { id: 'd', laneId: 't', start: 70, end: 96, label: '调用恢复 · 正常执行', tone: 'blue', status: 'done' },
      ], [{ id: 'ev', laneId: 't', pos: 42, label: 'isError: true', tone: 'rose', emphasized: true }]),
    },
    {
      shortLabel: '拦截的形状',
      badge: 'INSIGHT',
      title: '拦截的形状：返回拒绝，而不是抛错',
      paragraphs: [
        '注意审批拦截的返回形状：它不是抛错，而是一次正常的瀑布返回值——拒绝结果。循环收到拒绝后，把「已拦截：理由」当作一条工具结果写回会话，模型能看到这次调用被拦下了，并且知道为什么。',
        '这个细节很重要：拦截是业务语义，不是系统故障。抛错会让 Fiber 进 FAILED、让整条链以为出 bug 了；返回拒绝结果，则让模型有机会换个方式继续完成任务（比如改用别的工具，或者向用户说明）。',
      ],
      callout: { kind: 'idea', title: '设计原则', text: '审批拒绝是「工具执行的一种正常结果」，不是异常。异常留给真正的故障：工具崩了、超时了、沙箱挂了。' },
      kpis: [kpi('拦截返回', '拒绝结果，非异常', 'good'), kpi('模型可见', '拦截理由进会话', 'neutral'), kpi('Fiber 状态', '保持 ACTIVE', 'good')],
      scene: iso('拦截 vs 抛错', [
        { id: 'deny', x: 120, y: 200, label: '返回拒绝结果', sublabel: 'isError: true · 理由进会话', tone: 'green' },
        { id: 'throw', x: 620, y: 200, label: '抛错', sublabel: 'Fiber → FAILED · 链以为出故障', tone: 'rose', dimmed: true },
        { id: 'model', x: 370, y: 60, label: '模型', sublabel: '看到拒绝，换个方式继续', tone: 'violet', size: 'sm' },
      ], [
        { from: 'model', to: 'deny', label: '正确：继续任务' },
        { from: 'model', to: 'throw', label: '错误：任务中断', dashed: true },
      ]),
    },
    {
      shortLabel: '挂在哪都行',
      badge: 'TECHNIQUE',
      title: '权限、沙箱、超时：都挂在同一个地方',
      paragraphs: [
        '审批门只是一个例子。DSH 里的权限、沙箱、超时，都是以同样的方式挂在工具执行流程上的：权限检查挂 `pre-execute`，沙箱执行挂 `execute` 附近，超时与结果呈现挂 `post-execute`。',
        '这就是 waterfall 作为扩展点的真正含义：核心流程只有一份，能力以插件的形式挂在流程的各个关口上。想知道一个能力在哪生效，找它监听的事件名，而不是翻核心代码。',
      ],
      kpis: [kpi('挂接点', '同一套瀑布', 'good'), kpi('核心流程', '1 份', 'neutral'), kpi('找能力位置', '查事件名', 'neutral')],
      scene: iso('同一套瀑布，挂多种能力', [
        { id: 'pre', x: 60, y: 180, label: 'pre-execute', sublabel: '权限 · 审批', tone: 'orange' },
        { id: 'exe', x: 380, y: 180, label: 'execute', sublabel: '沙箱执行', tone: 'blue', active: true },
        { id: 'post', x: 700, y: 180, label: 'post-execute', sublabel: '超时 · 结果呈现', tone: 'green' },
        { id: 'core', x: 180, y: 400, label: '核心流程只有一份', sublabel: '能力以插件形式挂在关口上', tone: 'dark', size: 'platform' },
      ], [
        { from: 'pre', to: 'core' },
        { from: 'exe', to: 'core' },
        { from: 'post', to: 'core' },
      ]),
    },
    {
      shortLabel: '审批门复盘',
      badge: 'RECAP',
      title: '审批门三句话',
      paragraphs: [
        '工具执行有三道瀑布，审批挂在第一道 `tools/pre-execute` 上；审批插件只做一件事——监听事件，放行调 `next()`，拦截直接返回拒绝结果；卸载审批插件，审批立刻消失，因为监听是记在插件账本上的 effect。',
        '下一课讲执行本身的安全：工具跑在哪里，跑坏了怎么办。',
      ],
      recapTable: [
        { question: '加审批要改哪里？', decision: '哪都不改：写个插件监听 tools/pre-execute', because: '瀑布的默认实现是最里层，监听在外层决定放行或拦截' },
        { question: '拦截后模型怎么办？', decision: '拒绝结果写回会话，模型换方式继续', because: '拦截是业务语义，不是异常' },
        { question: '审批怎么下线？', decision: '卸载插件，监听自动摘除', because: 'ctx.on 是 effect，随 Fiber 卸载撤销' },
      ],
      kpis: [kpi('三道瀑布', 'pre / execute / post', 'good'), kpi('核心改动', '0 行', 'good'), kpi('本课步骤', '6 步', 'neutral')],
      scene: swim('审批门全流程', [
        { id: 'loop', label: 'agent-loop', sublabel: 'tools.execute()', tone: 'violet' },
        { id: 'pre', label: 'pre-execute', sublabel: 'guard 审批', tone: 'orange' },
        { id: 'exe', label: 'execute', sublabel: '工具本体', tone: 'blue' },
        { id: 'post', label: 'post-execute', sublabel: '结果', tone: 'green' },
      ], [
        { id: 'a', laneId: 'loop', start: 2, end: 16, label: 'execute(exec)', tone: 'violet', status: 'done' },
        { id: 'b', laneId: 'pre', start: 18, end: 42, label: '审批：放行 next()', tone: 'orange', status: 'done' },
        { id: 'c', laneId: 'exe', start: 44, end: 68, label: '执行工具', tone: 'blue', status: 'done' },
        { id: 'd', laneId: 'post', start: 70, end: 96, label: '返回结果', tone: 'green', status: 'done' },
      ], [], [{ pos: 0, label: '调用' }, { pos: 100, label: '完成' }]),
    },
  ]),
);

const L10 = lesson(
  'sandbox-failclosed',
  'ch04',
  4,
  '工具与审批',
  2,
  2,
  '沙箱 fail-closed',
  '工具能跑 shell 命令，跑在哪里、跑坏了怎么办？DSH 的答案是沙箱与 fail-closed：不确定就拒绝。',
  12,
  '进阶',
  [
    { text: '区分本地执行器与 E2B 沙箱两种执行环境', completedAtStep: 2 },
    { text: '解释 fail-closed 的含义：不确定就拒绝', completedAtStep: 3 },
    { text: '说出沙箱能力在工具管线里的挂接位置', completedAtStep: 5 },
  ],
  steps([
    {
      shortLabel: '工具能跑命令',
      badge: 'PROBLEM',
      title: '工具能跑 shell，跑在哪里？',
      paragraphs: [
        'Agent 的工具不只是查时间、读文件，还包括跑 shell 命令：`bash`、沙箱化的 `bash`、`PowerShell`。模型让工具跑命令时，命令到底在哪里执行，直接决定了风险：跑在本机，就是本机的权限；跑在沙箱里，就是沙箱的权限。',
        'DSH 把「在哪里执行」做成可配置的执行环境，而不是写死在工具里。工具只说「我要跑这条命令」，执行环境由部署决定。',
      ],
      kpis: [kpi('可跑的 shell', 'bash / 沙箱 bash / PowerShell', 'neutral'), kpi('执行地点', '可配置', 'good'), kpi('决定者', '部署，不是工具', 'neutral')],
      scene: iso('工具只说跑什么，环境决定跑在哪', [
        { id: 'tool', x: 400, y: 120, label: 'shell 工具', sublabel: '我要跑这条命令', tone: 'orange', size: 'lg', active: true },
        { id: 'local', x: 120, y: 320, label: '本地执行器', sublabel: '本机权限 · 开发调试', tone: 'blue' },
        { id: 'e2b', x: 620, y: 320, label: 'E2B 沙箱', sublabel: '隔离环境 · 默认推荐', tone: 'green' },
      ], [
        { from: 'tool', to: 'local', label: '部署选本地' },
        { from: 'tool', to: 'e2b', label: '部署选沙箱', status: 'active' },
      ]),
    },
    {
      shortLabel: '两种执行环境',
      badge: 'TECHNIQUE',
      title: '本地执行器 vs E2B 沙箱',
      paragraphs: [
        '本地执行器直接跑在本机上，方便调试，但权限就是本机的权限，适合可信的开发环境。E2B 沙箱把命令跑在隔离的云端沙箱里，文件系统、网络都与本机隔离，适合不可信的模型输出。',
        '两种环境对工具来说接口相同，切换不需要改工具代码——又是「定义、提供、使用」三分工：工具定义「跑命令」，执行环境提供「在哪里跑」，循环只负责调用。',
      ],
      kpis: [kpi('本地执行器', '方便 · 本机权限', 'warn'), kpi('E2B 沙箱', '隔离 · 推荐', 'good'), kpi('切换成本', '改配置，不改工具', 'good')],
      scene: tree('执行环境：同接口，不同隔离级别', [
        { id: 'tool', x: 500, y: 60, kind: 'root', label: 'shell 工具', sublabel: '接口相同', status: 'active' },
        { id: 'local', x: 240, y: 200, kind: 'plugin', label: '本地执行器', sublabel: '本机权限 · 调试用' },
        { id: 'e2b', x: 760, y: 200, kind: 'plugin', label: 'E2B 沙箱', sublabel: '隔离 · 推荐', status: 'highlight' },
        { id: 'fs', x: 240, y: 340, kind: 'log', label: '文件系统：本机', sublabel: '风险高' },
        { id: 'fs2', x: 760, y: 340, kind: 'log', label: '文件系统：沙箱内', sublabel: '与本机隔离' },
      ], [
        { from: 'tool', to: 'local' },
        { from: 'tool', to: 'e2b' },
        { from: 'local', to: 'fs' },
        { from: 'e2b', to: 'fs2' },
      ]),
    },
    {
      shortLabel: 'fail-closed',
      badge: 'SOLUTION',
      title: 'fail-closed：不确定，就拒绝',
      paragraphs: [
        '`fail-closed` 是安全设计的默认姿势：当系统无法确定一次执行是否安全时，`拒绝执行`，而不是放行。沙箱不可用、审批服务没响应、权限信息不完整——这些「不知道」的情况，默认答案都是「不跑」。',
        '这和审批门的默认 `allow` 形成对照：瀑布的默认实现是放行，因为「没人监听」等于「没人反对」；而沙箱层的默认是拒绝，因为「环境不确定」等于「风险不确定」。两个默认值的方向不同，原因也不同：前者是扩展点的默认，后者是安全边界的默认。',
      ],
      callout: { kind: 'warn', title: '不要把两者搞混', text: 'pre-execute 无人监听 → 默认放行；沙箱状态未知 → 默认拒绝。一个管「有没有人反对」，一个管「能不能证明安全」。' },
      kpis: [kpi('沙箱未知时', '拒绝执行', 'good'), kpi('审批无人监听时', '默认放行', 'neutral'), kpi('设计原则', '不确定即拒绝', 'good')],
      scene: swim('fail-closed：未知状态的默认答案', [
        { id: 'ok', label: '沙箱就绪', sublabel: '状态明确', tone: 'green' },
        { id: 'unknown', label: '沙箱未知', sublabel: '不可用 / 无响应', tone: 'rose' },
      ], [
        { id: 'a', laneId: 'ok', start: 2, end: 40, label: '检查通过', tone: 'green', status: 'done' },
        { id: 'b', laneId: 'ok', start: 42, end: 96, label: '执行命令', tone: 'green', status: 'done' },
        { id: 'c', laneId: 'unknown', start: 2, end: 40, label: '检查：状态未知', tone: 'rose', status: 'blocked' },
        { id: 'd', laneId: 'unknown', start: 42, end: 96, label: '拒绝执行 · 返回错误', tone: 'rose', status: 'error' },
      ], [{ id: 'ev', laneId: 'unknown', pos: 41, label: '默认拒绝', tone: 'rose', emphasized: true }]),
    },
    {
      shortLabel: '挂接位置',
      badge: 'INSIGHT',
      title: '沙箱挂在哪：execute 瀑布附近',
      paragraphs: [
        '沙箱能力和审批一样，是挂在工具执行流程上的：审批在 `pre-execute` 决定放不放行，沙箱在 `execute` 附近决定在哪里执行、怎么隔离。工具本体只负责「做什么」，执行环境负责「在哪里做、安不安全」。',
        '这种分层让安全策略可以独立演进：换一家沙箱供应商、收紧网络策略、加一层超时，都不需要改工具、改循环，只需要换掉或调整挂在管线上的插件。',
      ],
      kpis: [kpi('审批位置', 'pre-execute', 'neutral'), kpi('沙箱位置', 'execute 附近', 'neutral'), kpi('换沙箱成本', '换插件', 'good')],
      scene: iso('管线上的安全能力', [
        { id: 'pre', x: 60, y: 200, label: 'pre-execute', sublabel: '审批 · 权限', tone: 'orange' },
        { id: 'exe', x: 380, y: 200, label: 'execute', sublabel: '沙箱执行', tone: 'blue', active: true },
        { id: 'post', x: 700, y: 200, label: 'post-execute', sublabel: '超时 · 结果', tone: 'green' },
        { id: 'tool', x: 370, y: 60, label: '工具本体', sublabel: '只负责「做什么」', tone: 'violet', size: 'sm' },
      ], [
        { from: 'tool', to: 'exe', label: '交给管线' },
        { from: 'pre', to: 'exe' },
        { from: 'exe', to: 'post' },
      ]),
    },
    {
      shortLabel: '预览期提醒',
      badge: 'TECHNIQUE',
      title: '预览期的一点提醒：本地 API 鉴权',
      paragraphs: [
        'DSH 目前是开发者预览版（developer preview，基线 0.1.0-rc.5）。预览期出现过一个本地 API 鉴权问题，已在 0.1.2-alpha.1 / alpha.2 中修复。',
        '这句话的实际意思是：如果你在跑预览版，`先确认版本`。安全相关的行为最容易随版本变化，读源码、配沙箱之前，先看一眼自己装的是哪个版本，再对照该版本的说明。本站的内容以 0.1.0-rc.5 基线核对，版本变了，细节可能跟着变。',
      ],
      callout: { kind: 'tip', title: '习惯', text: '调不通时先报版本号：dsh --version（或等价命令）+ 所用 profile，再去翻对应版本的文档。' },
      kpis: [kpi('当前基线', '0.1.0-rc.5', 'neutral'), kpi('鉴权问题修复', '0.1.2-alpha.1/2', 'good'), kpi('先确认', '版本号', 'neutral')],
      scene: tree('预览期：先确认版本', [
        { id: 'v', x: 500, y: 60, kind: 'root', label: 'DSH 开发者预览版', sublabel: '基线 0.1.0-rc.5', status: 'active' },
        { id: 'fix', x: 240, y: 200, kind: 'service', label: '本地 API 鉴权修复', sublabel: '0.1.2-alpha.1 / alpha.2', status: 'highlight' },
        { id: 'check', x: 760, y: 200, kind: 'service', label: '先确认版本', sublabel: '再对照文档' },
        { id: 'note', x: 500, y: 340, kind: 'log', label: '本站以 0.1.0-rc.5 核对', sublabel: '版本变了，细节可能变' },
      ], [
        { from: 'v', to: 'fix' },
        { from: 'v', to: 'check' },
        { from: 'fix', to: 'note' },
        { from: 'check', to: 'note' },
      ]),
    },
    {
      shortLabel: '沙箱复盘',
      badge: 'RECAP',
      title: '沙箱三句话',
      paragraphs: [
        '工具能跑 shell，但跑在哪里由执行环境决定：本地执行器方便调试，E2B 沙箱隔离更彻底；不确定就拒绝，这是 fail-closed；审批与沙箱都挂在工具执行管线上，换能力不需要改工具、改循环。',
        '下一章讲会话：模型看到的东西，是怎么被记录下来的。',
      ],
      recapTable: [
        { question: '命令跑在哪里？', decision: '执行环境决定：本地或 E2B 沙箱', because: '工具只说跑什么，部署决定跑在哪' },
        { question: '沙箱状态未知时怎么办？', decision: '拒绝执行（fail-closed）', because: '无法证明安全时，放行的代价比拒绝大得多' },
        { question: '安全能力怎么演进？', decision: '换挂在管线上的插件', because: '审批、沙箱、超时都挂在瀑布上，不在核心代码里' },
      ],
      kpis: [kpi('执行环境', '2 种', 'neutral'), kpi('未知时默认', '拒绝', 'good'), kpi('本课步骤', '6 步', 'neutral')],
      scene: iso('沙箱全貌', [
        { id: 'tool', x: 400, y: 120, label: 'shell 工具', sublabel: '只说跑什么', tone: 'orange', size: 'lg', active: true },
        { id: 'pre', x: 60, y: 320, label: 'pre-execute', sublabel: '审批放行？', tone: 'rose', size: 'sm' },
        { id: 'e2b', x: 330, y: 320, label: 'E2B 沙箱', sublabel: '隔离执行', tone: 'green', size: 'sm' },
        { id: 'local', x: 600, y: 320, label: '本地执行器', sublabel: '本机执行', tone: 'blue', size: 'sm' },
        { id: 'fc', x: 800, y: 320, label: 'fail-closed', sublabel: '未知即拒绝', tone: 'rose', size: 'sm' },
      ], [
        { from: 'tool', to: 'pre' },
        { from: 'pre', to: 'e2b', label: '放行' },
        { from: 'pre', to: 'local', dashed: true },
        { from: 'e2b', to: 'fc', dashed: true, label: '未知时' },
      ]),
    },
  ]),
);

export const CHAPTERS_03_04 = [
  chapter('ch02', 2, 'Cordis 主板', 'blue', [L3, L4, L5, L6]),
  chapter('ch03', 3, 'Agent 循环', 'violet', [L7, L8]),
  chapter('ch04', 4, '工具与审批', 'amber', [L9, L10]),
];

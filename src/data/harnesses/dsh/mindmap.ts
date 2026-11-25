// DeepSeek Harness (DSH) 交互式源码思维导图数据结构
// 与 5 章 15 课深度绑定，全部根节点、分支节点与末节点均附带对应 TypeScript 源码实现。
import type { MindNode } from '../../../types/mindmap';

export const DSH_MINDMAP_DATA: MindNode = {
  id: 'root',
  label: 'DeepSeek Harness (DSH)',
  sub: 'Cordis 插件化 Agent 整机架构',
  tone: 'emerald',
  badge: 'ARCHITECTURE',
  file: 'packages/spine/src/index.ts',
  lessonSlug: 'plugin-everything',
  stepNumber: 1,
  summary:
    'DeepSeek Harness 将整个 Agent 运行时构建在 Cordis IoC 插件树之上：入口层、核心套件 spine、模型适配器、父子作用域 dsh-scope 与安全审批沙箱全部以插件形式挂载在根 Context 上，依靠 inject 依赖调度、waterfall 洋葱拦截与 Fiber 生命周期实现高内聚可插拔。',
  points: [
    '一切皆插件：LLM、Tool、Session、审批门、沙箱均为独立可插拔 Fiber',
    'dsh-scope 实现「注册向下继承、事件向上穿透」，天然支撑多 Agent 监管树',
    '审批与 OS 沙箱均挂接在 tools/pre-execute 瀑布上，双闸门叠加且 fail-closed',
  ],
  codeLang: 'text',
  code: `dsh/
├── cordis/                # Context · Registry · Fiber · Service · Events
├── dsh-scope/             # createScope · 父子作用域树（注册下沉 / 事件上浮）
├── spine/                 # LlmRuntime · ToolRuntime · SessionStore · AgentLoop
├── dsh-user-approval/     # 命中 ask 挂起人工确认，超时/无应答 fail-closed
├── dsh-sandbox/           # bwrap / Landlock / Seatbelt / E2B 物理沙箱
└── products/              # webserver · CLI · SDK · ACP 多端装机`,
  children: [
    {
      id: 'dsh-b-overview',
      label: '1 · 整机全景与核心旅程',
      sub: 'plugin-everything · ask-journey',
      tone: 'emerald',
      badge: 'CH 1 · OVERVIEW',
      file: 'packages/spine/src/index.ts',
      lessonSlug: 'plugin-everything',
      stepNumber: 1,
      summary:
        '从根 Context 出发，入口层接入请求，spine 套件驱动 turn/step 循环，模型适配器与工具在事件总线上协作完成一次完整问答。',
      points: [
        '一个 turn 对应一次用户提问，可包含多个「模型推理 + 工具执行」step',
        'spine 刻意留白模型与入口，使同一核心同时跑在 CLI、Web 与测试回放上',
      ],
      codeLang: 'ts',
      code: `export function apply(ctx: Context) {
  ctx.plugin(SessionStore);
  ctx.plugin(SystemPrompt);
  ctx.plugin(LlmRuntime);
  ctx.plugin(ToolRuntime);
  ctx.plugin(AgentLoop);
}`,
      children: [
        {
          id: 'dsh-plugin-tree',
          label: '五层插件树装配',
          sub: '入口 / spine / 模型 / scope / Cordis',
          tone: 'emerald',
          badge: 'SPINE',
          file: 'packages/spine/src/index.ts',
          lessonSlug: 'plugin-everything',
          stepNumber: 2,
          summary: '整机没有全局单例硬编码，所有能力通过 ctx.plugin() 逐层挂在根 Context 树上。',
          points: [
            '入口层仅订阅 agent/text-delta 与 agent/tool-call 流式事件',
            '模型适配器（llm-deepseek / llm-mock）卸载时自动注销，支持零改造单测回放',
          ],
          codeLang: 'ts',
          code: `const root = new Context();
root.plugin(SpineBundle);        // 最小公共核
root.plugin(DeepSeekAdapter);    // 注册 ctx.llm 适配器
root.plugin(ApprovalPlugin);     // 挂接 tools/pre-execute 审批门
root.plugin(SandboxPlugin);      // 挂接 OS 物理沙箱
root.plugin(WebServerEntry);     // POST /api/chat -> SSE 推送`,
        },
        {
          id: 'dsh-ask-journey',
          label: 'turn / step 16 步全景流',
          sub: 'POST /api/chat → SSE 逐字回流',
          tone: 'emerald',
          badge: 'PIPELINE',
          file: 'packages/webserver/src/chat.ts',
          lessonSlug: 'ask-journey',
          stepNumber: 1,
          summary: '一次提问穿过请求接入、日志追加、LLM 流式调用、三道工具瀑布与第二轮流式收口。',
          points: [
            '请求入口先注册 agent/text-delta 监听，请求结束自动 dispose 避免内存泄漏',
            '每轮工具执行结果追加进会话日志，自动驱动下一 step 模型推理',
          ],
          codeLang: 'ts',
          code: `const disposeDelta = ctx.on('agent/text-delta', (ev) => {
  if (ev.sessionId === session.id) res.write(\`data: \${JSON.stringify(ev)}\\n\\n\`);
});
try {
  await ctx.agent.runTurn(session.id, userInput);
} finally {
  disposeDelta();
}`,
        },
        {
          id: 'dsh-llm-adapter',
          label: 'LlmRuntime 与流式适配',
          sub: 'ctx.llm.stream() · llm/stream 瀑布',
          tone: 'emerald',
          badge: 'LLM',
          file: 'packages/spine/src/llm.ts',
          lessonSlug: 'ask-journey',
          stepNumber: 4,
          summary: 'LlmRuntime 将模型调用统一抽象为可拦截的 llm/stream 瀑布，方便外挂重试、计费与 Mock 回放。',
          points: [
            '调用方不关心底层厂商协议，统一消费 text-delta / tool-call 块',
            'llm-mock 可按录制脚本确定性重放整条对话流',
          ],
          codeLang: 'ts',
          code: `export class LlmRuntime extends Service {
  stream(req: LlmRequest) {
    return this.ctx.waterfall('llm/stream', req, async (input) => {
      const adapter = this.resolveAdapter(input.model);
      return adapter.stream(input);
    });
  }
}`,
        },
      ],
    },
    {
      id: 'dsh-b-cordis',
      label: '2 · Cordis 主板与 dsh-scope',
      sub: 'Context · Fiber · Service · Events · Scope',
      tone: 'blue',
      badge: 'CH 2 · CORDIS',
      file: 'packages/cordis/src/context.ts',
      lessonSlug: 'context-plugin',
      stepNumber: 1,
      summary:
        'Cordis 提供依赖注入、Fiber 生命周期记账与五种事件原语；dsh-scope 在其上扩展出适合多 Agent 树的父子作用域规则。',
      points: [
        '每个插件对应一个 Fiber，所有副作用（监听、注册、定时器）自动入账并在卸载时倒序清空',
        'Service + inject 声明式解决启动顺序问题，无需手写初始化编排',
      ],
      codeLang: 'ts',
      code: `export class Context {
  plugin<T>(plugin: Plugin<T>, config?: T): ForkScope {
    const fiber = new Fiber(this, plugin, config);
    return fiber.start();
  }
  effect(dispose: () => void): () => void {
    this.fiber.disposables.push(dispose);
    return dispose;
  }
}`,
      children: [
        {
          id: 'dsh-fiber',
          label: 'Fiber 生命周期与倒序卸载',
          sub: 'effect 记账 · 零残留热拔插',
          tone: 'blue',
          badge: 'FIBER',
          file: 'packages/cordis/src/fiber.ts',
          lessonSlug: 'fiber-lifecycle',
          stepNumber: 2,
          summary: 'Fiber 记录插件创建的全部子插件、事件监听与服务注册，卸载时按 LIFO 倒序回收。',
          points: [
            '子插件与父插件形成级联树，父 Fiber dispose 会连带清理整棵子树',
            '彻底杜绝插件热重载后的僵尸监听与重复注册',
          ],
          codeLang: 'ts',
          code: `dispose() {
  for (const child of [...this.children].reverse()) {
    child.dispose();
  }
  while (this.disposables.length > 0) {
    const fn = this.disposables.pop()!;
    fn();
  }
}`,
        },
        {
          id: 'dsh-service-inject',
          label: 'Service 注册与 inject 调度',
          sub: '依赖就绪自动拉起 · 缺失自动挂起',
          tone: 'blue',
          badge: 'DI',
          file: 'packages/cordis/src/service.ts',
          lessonSlug: 'service-inject',
          stepNumber: 2,
          summary: '插件通过 static inject = ["llm", "tools"] 声明依赖，Cordis 监听服务就绪信号自动挂载。',
          points: [
            '必选依赖缺失时插件保持 PENDING，不会在运行时报 undefined 崩溃',
            '可选依赖可通过 ctx.get("sessionPersistence") 动态探活',
          ],
          codeLang: 'ts',
          code: `export class AgentLoop extends Service {
  static inject = ['llm', 'tools', 'sessions', 'systemPrompt'];

  constructor(ctx: Context) {
    super(ctx, 'agent', true);
  }
}`,
        },
        {
          id: 'dsh-events-waterfall',
          label: '五种事件与 waterfall 洋葱',
          sub: 'emit / parallel / serial / bail / waterfall',
          tone: 'blue',
          badge: 'EVENTS',
          file: 'packages/cordis/src/events.ts',
          lessonSlug: 'events-bus',
          stepNumber: 2,
          summary: 'waterfall 是 DSH 最核心的扩展原语：审批门、沙箱、限流和日志都能以中间件洋葱式包在业务外层。',
          points: [
            'DSH 源码中 emit 24 次、waterfall 13 次、bail 3 次、parallel 1 次',
            '外层中间件可改写入参、短路拒绝，或在 next() 之后审计返回值',
          ],
          codeLang: 'ts',
          code: `async waterfall<T, R>(name: string, input: T, core: (x: T) => Promise<R>): Promise<R> {
  const hooks = this.collectListeners(name);
  const dispatch = (i: number, val: T): Promise<R> => {
    if (i >= hooks.length) return core(val);
    return hooks[i](val, (nextVal = val) => dispatch(i + 1, nextVal));
  };
  return dispatch(0, input);
}`,
        },
        {
          id: 'dsh-scope-tree',
          label: 'dsh-scope 父子双向作用域',
          sub: '注册向下继承 · 事件向上穿透',
          tone: 'blue',
          badge: 'SCOPE',
          file: 'packages/dsh-scope/src/index.ts',
          lessonSlug: 'dsh-scope',
          stepNumber: 3,
          summary: '解决多 Agent 树的核心难题：子 Agent 继承父级工具与策略，同时高危事件自动冒泡到祖先审批器。',
          points: [
            '读取注册表沿 scopeChain 从近到远查找，子作用域可局部 shadowing 收紧权限',
            '事件派发允许祖先监听后代，但兄弟作用域完全隔离互不可见',
          ],
          codeLang: 'ts',
          code: `export function createScope(ctx: Context, key: string, opts?: { parent?: Context }) {
  const parent = opts?.parent ?? ctx;
  const scoped = parent.extend({ [SCOPE_KEY]: key });
  bindScopeParent(scoped, parent);
  return scoped;
}

export function isAncestorScope(listenerScope: ScopeId, targetScope: ScopeId): boolean {
  return scopeChainOf(targetScope).includes(listenerScope);
}`,
        },
      ],
    },
    {
      id: 'dsh-b-loop',
      label: '3 · Agent 循环与事件溯源记忆',
      sub: 'AgentLoop · SessionStore · SystemPrompt',
      tone: 'violet',
      badge: 'CH 3 · LOOP',
      file: 'packages/spine/src/agent-loop.ts',
      lessonSlug: 'agent-loop',
      stepNumber: 1,
      summary:
        '极简异步主循环负责驱动模型推理与工具执行，会话采用只追加事件日志（Append-only），提示词由各插件按稳定前缀动态拼装。',
      points: [
        '模型可见即已记录：每条消息与工具结果先落会话日志再喂给下一轮 LLM',
        'SystemPrompt 由各插件注册贡献段，避免巨型硬编码字符串破坏缓存',
      ],
      codeLang: 'ts',
      code: `while (step < maxSteps) {
  const messages = ctx.sessions.buildMessages(sessionId);
  const system = await ctx.systemPrompt.render(sessionId);
  const reply = await ctx.llm.stream({ system, messages, tools });
  ctx.sessions.append(sessionId, reply.message);
  if (reply.toolCalls.length === 0) break;
  for (const call of reply.toolCalls) {
    const res = await ctx.tools.execute(call);
    ctx.sessions.append(sessionId, { role: 'tool', callId: call.id, content: res });
  }
  step++;
}`,
      children: [
        {
          id: 'dsh-agent-loop',
          label: 'AgentLoop 步进与终止控制',
          sub: 'step 轮转 · AbortSignal · 上限保护',
          tone: 'violet',
          badge: 'LOOP',
          file: 'packages/spine/src/agent-loop.ts',
          lessonSlug: 'agent-loop',
          stepNumber: 2,
          summary: '每轮循环只做三件事：构造视图 → 流式调模型 → 执行工具并回写结果，直到无工具调用或触发中止。',
          points: [
            '工具拒绝理由作为普通 tool-result 回写，引导模型自我纠偏而非崩溃中断',
            '支持 AbortSignal 随时中断流与正在运行的工具子进程',
          ],
          codeLang: 'ts',
          code: `if (signal?.aborted) {
  ctx.emit('agent/turn-aborted', { sessionId, step });
  return { status: 'aborted' };
}
ctx.emit('agent/step-end', { sessionId, step, toolCount: reply.toolCalls.length });`,
        },
        {
          id: 'dsh-session-log',
          label: 'Append-only 会话日志与持久化',
          sub: 'sessions.jsonl · SQLite 可选后端',
          tone: 'violet',
          badge: 'SESSION',
          file: 'packages/spine/src/session-store.ts',
          lessonSlug: 'session-log',
          stepNumber: 2,
          summary: 'SessionStore 将对话建模为不可变追加事件流，通过可选 sessionPersistence 服务透明切换 JSONL 或 SQLite。',
          points: [
            '追加事件同时广播 session/event，UI 与持久化插件各自订阅互不耦合',
            '天然支持全量重放、崩溃恢复与分叉调试',
          ],
          codeLang: 'ts',
          code: `append(sessionId: string, event: SessionEvent) {
  const entry = { id: ulid(), ts: Date.now(), sessionId, ...event };
  this.memory.get(sessionId)!.push(entry);
  this.ctx.emit('session/event', entry);
  this.ctx.get('sessionPersistence')?.append(entry);
}`,
        },
        {
          id: 'dsh-system-prompt',
          label: 'SystemPrompt 插件化拼装',
          sub: '稳定前缀排序 · Prompt Caching 友好',
          tone: 'violet',
          badge: 'PROMPT',
          file: 'packages/spine/src/system-prompt.ts',
          lessonSlug: 'system-prompt',
          stepNumber: 2,
          summary: '各个能力插件通过 registerSection() 贡献自己的系统提示词片段，并按优先级稳定排序。',
          points: [
            '静态规则排在前部保持前缀稳定，动态上下文放在尾部，最大化命中缓存',
            '插件卸载时对应提示词片段随 Fiber 自动撤回',
          ],
          codeLang: 'ts',
          code: `registerSection(section: PromptSection) {
  this.sections.push(section);
  return this.ctx.effect(() => {
    const idx = this.sections.indexOf(section);
    if (idx >= 0) this.sections.splice(idx, 1);
  });
}`,
        },
      ],
    },
    {
      id: 'dsh-b-security',
      label: '4 · 工具管线与三道安全防线',
      sub: 'pre-execute · user-approval · sandbox',
      tone: 'amber',
      badge: 'CH 4 · SECURITY',
      file: 'packages/spine/src/tools.ts',
      lessonSlug: 'tools-preexecute',
      stepNumber: 1,
      summary:
        'ToolRuntime 通过 pre-execute / execute / post-execute 三道瀑布将策略分流、人工审批与 OS 物理沙箱层层叠加。',
      points: [
        'Approval 只授予「尝试权」，绝不绕过底层 OS 沙箱边界',
        '未知策略、审批超时或沙箱不可用统一 fail-closed 拒绝',
      ],
      codeLang: 'ts',
      code: `async execute(call: ToolCall): Promise<ToolResult> {
  const checked = await this.ctx.waterfall('tools/pre-execute', call, async (c) => c);
  if (checked.blocked) return { ok: false, output: checked.reason };
  const raw = await this.ctx.waterfall('tools/execute', checked, (c) => this.runTool(c));
  return this.ctx.waterfall('tools/post-execute', raw, async (r) => r);
}`,
      children: [
        {
          id: 'dsh-preexecute',
          label: 'tools/pre-execute 策略门',
          sub: 'allow / ask / deny 三态分流',
          tone: 'amber',
          badge: 'POLICY',
          file: 'packages/spine/src/tools.ts',
          lessonSlug: 'tools-preexecute',
          stepNumber: 2,
          summary: '在真正触达工具实现前，策略插件按工具名与参数决定直接放行、挂起询问还是返回拒绝理由。',
          points: [
            '拒绝返回结构化业务结果而非抛未捕获异常，让模型知晓原因并换路',
            '多个安全插件可按优先级叠加，任意一层拒绝即刻短路',
          ],
          codeLang: 'ts',
          code: `ctx.waterfall('tools/pre-execute', async (call, next) => {
  const decision = policy.evaluate(call.name, call.args);
  if (decision === 'deny') {
    return { ...call, blocked: true, reason: 'Blocked by workspace policy' };
  }
  return next(call);
});`,
        },
        {
          id: 'dsh-approval',
          label: 'dsh-user-approval 人工审批门',
          sub: '挂起等确认 · 超时/无应答 fail-closed',
          tone: 'amber',
          badge: 'APPROVAL',
          file: 'packages/dsh-user-approval/src/index.ts',
          lessonSlug: 'approval-pipeline',
          stepNumber: 3,
          summary: '命中 ask 时向 UI/CLI 派发审批请求并挂起当前工具调用，通过 dsh-scope 自动覆盖所有子 Agent。',
          points: [
            '若无任何前端应答者或等待超时，默认返回拒绝（fail-closed）',
            '子 Agent 触发的审批会沿 dsh-scope 向上穿透到父级审批准入器',
          ],
          codeLang: 'ts',
          code: `const verdict = await ctx.serial('approval/request', {
  tool: call.name,
  args: call.args,
  scope: call.scopeId,
});
if (!verdict || verdict.decision !== 'allow') {
  return { ...call, blocked: true, reason: verdict?.reason ?? 'Approval denied (fail-closed)' };
}`,
        },
        {
          id: 'dsh-sandbox',
          label: 'dsh-sandbox OS 物理沙箱',
          sub: 'bwrap / Landlock / Seatbelt / E2B',
          tone: 'amber',
          badge: 'SANDBOX',
          file: 'packages/dsh-sandbox/src/index.ts',
          lessonSlug: 'sandbox-failclosed',
          stepNumber: 2,
          summary: '在 tools/execute 瀑布层把高危 Shell / 代码执行关进操作系统内核隔离边界，杜绝越权写盘与外泄。',
          points: [
            '沙箱后端不可用时绝不静默降级裸奔，严格 fail-closed 报错拒绝',
            '审批门与沙箱呈交集关系（Approval ∩ Sandbox），用户点 Allow 仍受目录边界限制',
          ],
          codeLang: 'ts',
          code: `export async function execInSandbox(cmd: string, policy: SandboxPolicy) {
  const driver = detectOsSandboxDriver(); // bwrap | seatbelt | e2b
  if (!driver && policy.mode !== 'danger-unrestricted') {
    throw new SandboxUnavailableError('Fail-closed: no OS sandbox driver available');
  }
  return driver.spawn(cmd, { writableRoots: policy.workspaceRoots, network: false });
}`,
        },
      ],
    },
    {
      id: 'dsh-b-assembly',
      label: '5 · 多端产品组装与源码对照',
      sub: 'Profile / Bundle · 迷你版 vs 真 Cordis',
      tone: 'cyan',
      badge: 'CH 5 · ASSEMBLY',
      file: 'packages/products/src/assemble.ts',
      lessonSlug: 'product-assembly',
      stepNumber: 1,
      summary:
        '通过 Profile / Bundle / Patch 声明式装配同一套 spine 内核，零分叉衍生出 CLI、WebServer、SDK 与 ACP 编辑器协议端。',
      points: [
        '所有差异封装在薄薄一层 Profile 清单里，核心业务逻辑零复制粘贴',
        '对照 680 行迷你版与 2693 行真 Cordis，掌握框架演进的真实边界',
      ],
      codeLang: 'ts',
      code: `export function assembleProduct(profile: ProductProfile) {
  const ctx = new Context();
  for (const mod of profile.bundles) ctx.plugin(mod.plugin, mod.config);
  for (const patch of profile.patches) patch(ctx);
  return ctx;
}`,
      children: [
        {
          id: 'dsh-product-assembly',
          label: 'Profile / Bundle / Patch 装机',
          sub: '一套 spine 驱动 CLI / Web / ACP',
          tone: 'cyan',
          badge: 'PROFILE',
          file: 'packages/products/src/profiles.ts',
          lessonSlug: 'product-assembly',
          stepNumber: 3,
          summary: '不同形态产品只需声明插件清单与差异化 Patch，即可组合出专属安全级别与交互入口。',
          points: [
            'CI 模式替换为自动拒绝审批插件 + 只读沙箱，零代码改动',
            'ACP 适配器把事件流直接映射为 IDE 协议消息',
          ],
          codeLang: 'ts',
          code: `export const CLI_PROFILE: ProductProfile = {
  bundles: [
    { plugin: SpineBundle },
    { plugin: DeepSeekAdapter },
    { plugin: SandboxPlugin, config: { mode: 'workspace-write' } },
    { plugin: CliEntryPlugin },
  ],
  patches: [(ctx) => ctx.plugin(TerminalApprovalUi)],
};`,
        },
        {
          id: 'dsh-mini-vs-real',
          label: '迷你版 680 行 vs 真 Cordis 2693 行',
          sub: '核心骨架一致 · 工程健壮性补齐',
          tone: 'cyan',
          badge: 'COMPARE',
          file: 'packages/cordis/src/registry.ts',
          lessonSlug: 'mini-vs-real',
          stepNumber: 2,
          summary: '拆解真实生产版 Cordis 多出的 2000 行到底解决什么问题：Proxy 懒访问、微任务防抖、循环依赖诊断与类型推断。',
          points: [
            '核心概念（Context / Fiber / Service / Events）在 680 行迷你版里已 100% 完整',
            '生产版额外补齐了 HMR 热替换、异步状态机锁与严格 TypeScript 泛型约束',
          ],
          codeLang: 'ts',
          code: `// 真 Cordis 通过 Proxy 拦截 ctx[serviceName]
// 自动把属性访问绑定到当前调用方的作用域 Fiber 上
const proxy = new Proxy(ctx, {
  get(target, prop) {
    const svc = target.root.registry.get(prop);
    return svc ? svc.bindScope(target) : Reflect.get(target, prop);
  },
});`,
        },
      ],
    },
  ],
};

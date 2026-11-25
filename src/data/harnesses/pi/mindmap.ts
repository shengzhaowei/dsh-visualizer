// Pi Agent (badlogic/pi-mono) 交互式源码思维导图数据结构
// 与 4 章 8 课深度绑定，全部根节点、分支节点与末节点均附带对应 TypeScript 源码实现。
import type { MindNode } from '../../../types/mindmap';

export const PI_MINDMAP_DATA: MindNode = {
  id: 'root',
  label: 'Pi Agent (pi-mono)',
  sub: '极简四层 × 双队列转向 × 树形会话',
  tone: 'emerald',
  badge: 'MONOREPO',
  file: 'packages/agent/src/agent-loop.ts',
  lessonSlug: 'pi-layered-arch',
  stepNumber: 1,
  summary:
    'Pi Agent 以极致克制著称：用 4 层单向依赖包 + 4 个正交 Unix 工具原语把上下文留给真正的代码，靠 Steering / Follow-up 双队列实现不强杀的实时转向，用单文件树形 JSONL 像 Git 一样分叉探索，再以轻量原生 TS 扩展开放全部能力。',
  points: [
    'packages/ai → agent → coding-agent → tui 四层严格单向依赖，零循环耦合',
    'read / write / edit / bash 四个极简工具 + content/details 双通道返回',
    'Steering（内层实时转向）+ Follow-up（外层收敛接力）双层循环状态机',
  ],
  codeLang: 'text',
  code: `pi-mono/
├── packages/ai/            # streamSimple · EventStream · 20+ 模型统一网关
├── packages/agent/         # agentLoop · Agent · Steering/Follow-up 双队列
├── packages/coding-agent/  # 4 原语工具 · SessionManager(树) · compaction · Extensions
└── packages/tui/           # 差量终端渲染 · Print / JSON-RPC 无头模式`,
  children: [
    {
      id: 'pi-b-arch',
      label: '1 · 四层极简架构与四原语工具',
      sub: 'pi-ai → agent → coding-agent → tui',
      tone: 'emerald',
      badge: 'CH 1 · ARCH',
      file: 'packages/coding-agent/src/tools/index.ts',
      lessonSlug: 'pi-layered-arch',
      stepNumber: 1,
      summary:
        '把模型网关、纯内存循环、编码助手与终端 UI 彻底解耦，并只向模型暴露 read / write / edit / bash 四个正交工具。',
      points: [
        'TUI、Print 与 RPC 三种模式共享同一份 AgentSession 事件流，零逻辑分叉',
        'ToolResult 拆分 content（给模型看）与 details（给 UI 渲染 Diff/进度）',
      ],
      codeLang: 'ts',
      code: `export function createCodingTools(cwd: string): AgentTool[] {
  return [
    createReadTool(cwd),
    createWriteTool(cwd),
    createEditTool(cwd),
    createBashTool(cwd),
  ];
}`,
      children: [
        {
          id: 'pi-layers',
          label: '四层包单向依赖设计',
          sub: 'ai / agent / coding-agent / tui',
          tone: 'emerald',
          badge: 'LAYERS',
          file: 'packages/ai/src/stream.ts',
          lessonSlug: 'pi-layered-arch',
          stepNumber: 2,
          summary: 'packages/agent 完全不知道磁盘文件与终端 UI 的存在，使其能作为纯内存内核嵌入任意宿主。',
          points: [
            'packages/ai 抹平 Anthropic / OpenAI / Google 等 20+ 厂商流式协议与思考块',
            'coding-agent 负责装配工具、JSONL 会话树与扩展加载',
          ],
          codeLang: 'ts',
          code: `export function streamSimple(
  model: Model,
  context: Context,
  options?: StreamOptions,
): AssistantMessageEventStream {
  const provider = getProvider(model.api);
  return provider.stream(model, context, options);
}`,
        },
        {
          id: 'pi-four-tools',
          label: 'read / edit / write / bash 四原语',
          sub: '唯一匹配 edit · 尾部截断 bash',
          tone: 'emerald',
          badge: 'TOOLS',
          file: 'packages/coding-agent/src/tools/edit.ts',
          lessonSlug: 'pi-four-tools',
          stepNumber: 2,
          summary: '拒绝塞入 40 个碎片工具：edit 严格要求 oldText 唯一命中，bash 超限自动尾部截断并把完整日志落盘 /tmp。',
          points: [
            'edit 匹配次数 !== 1 时直接拒绝写盘，杜绝改错同名代码段',
            'bash 通过 onUpdate 实时流式推送输出，并支持 AbortSignal 杀进程树',
          ],
          codeLang: 'ts',
          code: `const matches = countOccurrences(source, oldText);
if (matches === 0) throw new Error('oldText not found in file');
if (matches > 1) throw new Error(\`oldText matched \${matches} times; provide more context\`);
const next = source.replace(oldText, newText);
await fs.writeFile(absPath, next, 'utf8');
return {
  content: [{ type: 'text', text: \`Updated \${path}\` }],
  details: { diff: buildUnifiedDiff(source, next) },
};`,
        },
        {
          id: 'pi-tool-channels',
          label: 'content / details 双通道与动态裁剪',
          sub: '保护模型上下文 · 丰富 UI 展示',
          tone: 'emerald',
          badge: 'RESULT',
          file: 'packages/agent/src/types.ts',
          lessonSlug: 'pi-four-tools',
          stepNumber: 4,
          summary: '工具返回值把发给 LLM 的精简文本（content）和给前端渲染的富结构（details）物理隔离。',
          points: [
            '前端拿到 details.diff / lineCount 渲染高亮视图，完全不消耗模型 Token',
            '可通过 setActiveTools() 按阶段动态开关可用工具集',
          ],
          codeLang: 'ts',
          code: `export interface AgentToolResult<TDetails = unknown> {
  /** 写入对话历史并回传给 LLM 的精简内容 */
  content: (TextContent | ImageContent)[];
  /** 仅给 TUI / 扩展 / 日志消费的富元数据，不发给模型 */
  details: TDetails;
}`,
        },
      ],
    },
    {
      id: 'pi-b-loop',
      label: '2 · 双层循环与实时双队列',
      sub: 'agentLoop · Steering · Follow-up · EventStream',
      tone: 'cyan',
      badge: 'CH 2 · LOOP',
      file: 'packages/agent/src/agent-loop.ts',
      lessonSlug: 'steering-followup',
      stepNumber: 1,
      summary:
        '不到 300 行的双层 while 循环是 Pi 的灵魂：内层在每个工具边界检测 Steering 立刻转向，外层等内层彻底收敛后拉起 Follow-up 接力。',
      points: [
        '用户输入永不锁框，无需粗暴 Ctrl+C 强杀即可优雅纠偏',
        '所有状态跃迁通过统一 EventStream 向 TUI / Print / RPC 广播',
      ],
      codeLang: 'ts',
      code: `while (true) {
  let hasMoreToolCalls = true;
  while (hasMoreToolCalls || pendingMessages.length > 0) {
    if (pendingMessages.length > 0) injectMessages(pendingMessages);
    const assistant = await streamAssistantResponse(context, config, stream);
    hasMoreToolCalls = assistant.toolCalls.length > 0;
    if (hasMoreToolCalls) {
      pendingMessages = await executeToolCalls(assistant.toolCalls, config, stream);
    }
  }
  const followUps = await config.getFollowUpMessages?.() ?? [];
  if (followUps.length === 0) break;
  pendingMessages = followUps;
}`,
      children: [
        {
          id: 'pi-steering',
          label: 'Steering 实时转向与 Skipped 合成',
          sub: '每个工具结束后检查 · 保持 API 合法',
          tone: 'cyan',
          badge: 'STEERING',
          file: 'packages/agent/src/agent-loop.ts',
          lessonSlug: 'steering-followup',
          stepNumber: 3,
          summary: '每执行完一个工具立刻轮询 getSteeringMessages()；一旦命中新指令，立即跳过剩余工具并合成 Skipped toolResult。',
          points: [
            '合成 Skipped toolResult 保证每个 tool_use 都有配对 tool_result，避免 API 报 400',
            '默认 one-at-a-time 逐条消费，避免连续插队指令互相覆盖',
          ],
          codeLang: 'ts',
          code: `for (let i = 0; i < toolCalls.length; i++) {
  await runSingleTool(toolCalls[i]);
  const steering = await config.getSteeringMessages?.() ?? [];
  if (steering.length > 0) {
    for (const skipped of toolCalls.slice(i + 1)) {
      emitSkippedToolResult(skipped, 'Skipped due to user steering message');
    }
    return steering;
  }
}`,
        },
        {
          id: 'pi-followup',
          label: 'Follow-up 收敛接力队列',
          sub: '外层循环触发 · 不打断当前工作',
          tone: 'cyan',
          badge: 'FOLLOW-UP',
          file: 'packages/agent/src/agent.ts',
          lessonSlug: 'steering-followup',
          stepNumber: 4,
          summary: '当用户希望「做完眼前任务后顺手再跑单测」时，消息进入 Follow-up 队列，等内层循环彻底完成后无缝接力。',
          points: [
            '与 Steering 清晰分工：Steering 立刻打断剩余工具，Follow-up 零打断排队',
            '同样支持 one-at-a-time 与 all 两种消费模式',
          ],
          codeLang: 'ts',
          code: `agent.steer('停下，先别改 CSS，优先修 auth.ts 报错');
agent.followUp('修完之后跑一遍 pnpm test 并整理变更摘要');`,
        },
        {
          id: 'pi-eventstream',
          label: 'EventStream 细粒度事件协议',
          sub: 'agent_start / turn / message_update / tool',
          tone: 'cyan',
          badge: 'EVENTS',
          file: 'packages/agent/src/types.ts',
          lessonSlug: 'pi-event-stream',
          stepNumber: 2,
          summary: '对称的生命周期事件流让 TUI、CLI 打印模式和外部 IDE RPC 客户端完全复用同一套订阅模型。',
          points: [
            '成对事件：agent_start/end、turn_start/end、message_start/update/end、tool_execution_start/update/end',
            'RPC 模式直接按行 JSONL 输出事件，轻松接入任意语言前端',
          ],
          codeLang: 'ts',
          code: `export type AgentEvent =
  | { type: 'agent_start' }
  | { type: 'turn_start' }
  | { type: 'message_update'; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent }
  | { type: 'tool_execution_start'; toolCallId: string; toolName: string; args: unknown }
  | { type: 'tool_execution_update'; toolCallId: string; partialResult: AgentToolResult }
  | { type: 'tool_execution_end'; toolCallId: string; result: AgentToolResult; isError: boolean }
  | { type: 'agent_end'; messages: AgentMessage[] };`,
        },
      ],
    },
    {
      id: 'pi-b-context',
      label: '3 · 两段上下文投影与树形会话',
      sub: 'transformContext → convertToLlm · id/parentId',
      tone: 'violet',
      badge: 'CH 3 · TREE',
      file: 'packages/coding-agent/src/core/session-manager.ts',
      lessonSlug: 'pi-context-pipeline',
      stepNumber: 1,
      summary:
        '持久化历史永不删改：每次调用模型前通过两段投影把富会话实时转为合法消息数组，并将全部探索分支存在同一份 JSONL 树中。',
      points: [
        'transformContext（裁剪/注入）→ convertToLlm（过滤自定义 UI 节点并翻译为 3 角色）',
        '单文件 JSONL 以 id + parentId 形成 DAG/树，切分支只需移动 leafId',
      ],
      codeLang: 'ts',
      code: `let messages = context.messages;
if (config.transformContext) {
  messages = await config.transformContext(messages, signal);
}
const llmMessages = await config.convertToLlm(messages);
return streamSimple(model, { systemPrompt, messages: llmMessages, tools });`,
      children: [
        {
          id: 'pi-two-stage',
          label: 'transformContext → convertToLlm',
          sub: '不改原历史 · 发前实时投影',
          tone: 'violet',
          badge: 'PIPELINE',
          file: 'packages/coding-agent/src/core/messages.ts',
          lessonSlug: 'pi-context-pipeline',
          stepNumber: 2,
          summary: 'AgentMessage 允许混存 UI 提示、压缩节点与扩展状态，convertToLlm 在发请求前过滤并翻译为标准角色。',
          points: [
            '避免扩展写入的自定义节点触发 LLM API 400 校验错误',
            '扩展可监听 context 事件动态裁剪视图而不破坏持久历史',
          ],
          codeLang: 'ts',
          code: `export function convertToLlm(messages: AgentMessage[]): Message[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant' || m.role === 'toolResult')
    .map((m) => stripUiMetadata(m));
}`,
        },
        {
          id: 'pi-session-tree',
          label: '单文件 JSONL 树形会话',
          sub: 'id + parentId · /tree 秒切分支',
          tone: 'violet',
          badge: 'TREE',
          file: 'packages/coding-agent/src/core/session-manager.ts',
          lessonSlug: 'pi-session-tree',
          stepNumber: 2,
          summary: '每行一条带 parentId 的 JSON 记录，在同一文件里原生承载无限次试错分叉与时间回溯。',
          points: [
            'buildSessionContext() 从当前 leafId 沿 parentId 回溯到根，遇 compaction 自动截断',
            '切换分支零拷贝、零覆盖，旧分支永远可随时切回',
          ],
          codeLang: 'ts',
          code: `buildSessionContext(leafId = this.leafId): SessionContext {
  const path: SessionEntry[] = [];
  let cur = leafId ? this.byId.get(leafId) : undefined;
  while (cur) {
    path.push(cur);
    cur = cur.parentId ? this.byId.get(cur.parentId) : undefined;
  }
  path.reverse();
  return materializeFromLatestCompaction(path);
}`,
        },
        {
          id: 'pi-branch-summary',
          label: 'branch_summary 跨分支带走经验',
          sub: '放弃死胡同但不丢踩坑结论',
          tone: 'violet',
          badge: 'BRANCH',
          file: 'packages/coding-agent/src/core/session-manager.ts',
          lessonSlug: 'pi-session-tree',
          stepNumber: 4,
          summary: '当某条试错分支走不通、用户用 /tree 回退分叉时，可将旧分支教训浓缩为 branch_summary 挂到新分支起点。',
          points: [
            '新分支不背负旧分支几万 Token 噪音，却保留了「方案 A 为何失败」的关键结论',
            '作为普通树节点写入 JSONL，全程可审计可回溯',
          ],
          codeLang: 'ts',
          code: `appendBranchSummary(parentId: string, fromId: string, summary: string) {
  return this.appendEntry({
    type: 'branch_summary',
    id: generateId(),
    parentId,
    fromId,
    summary,
  });
}`,
        },
      ],
    },
    {
      id: 'pi-b-ext',
      label: '4 · 无损压缩与原生 TS 扩展',
      sub: 'compaction.ts · ExtensionAPI',
      tone: 'amber',
      badge: 'CH 4 · EXTEND',
      file: 'packages/coding-agent/src/core/extensions/types.ts',
      lessonSlug: 'pi-compaction',
      stepNumber: 1,
      summary:
        '通过安全切点与确定性文件追踪让长对话压缩不丢现场；通过零样板原生 TypeScript 扩展自由接管工具、权限与会话生命周期。',
      points: [
        'findCutPoint 强制对齐合法轮次边界，绝不拆散 tool_use / tool_result 对',
        '几十行 TS 即可在 .pi/extensions/ 编写安全护栏、远程容器工具与斜杠命令',
      ],
      codeLang: 'ts',
      code: `export default function (pi: ExtensionAPI) {
  pi.on('tool_call', async (ev, ctx) => {
    if (ev.toolName === 'bash' && /rm\\s+-rf/.test(String(ev.input.command))) {
      const ok = await ctx.ui.confirm('高危命令确认', String(ev.input.command));
      if (!ok) return { block: true, reason: 'Blocked by user confirmation' };
    }
  });
}`,
      children: [
        {
          id: 'pi-cutpoint',
          label: 'findCutPoint 安全边界切分',
          sub: '永不拆散 toolCall / toolResult',
          tone: 'amber',
          badge: 'COMPACT',
          file: 'packages/coding-agent/src/core/compaction/compaction.ts',
          lessonSlug: 'pi-compaction',
          stepNumber: 2,
          summary: '压缩时从尾部回推保留最近 Token 预算，并把切点对齐到安全的消息起点 firstKeptEntryId。',
          points: [
            '避免切在 toolResult 中间导致缺失前置 tool_use 引发 API 报错',
            '原始旧记录依然保留在 JSONL 磁盘上，随时可无损回看',
          ],
          codeLang: 'ts',
          code: `export function findCutPoint(entries: SessionEntry[], keepRecentTokens: number) {
  let acc = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    acc += estimateEntryTokens(entries[i]);
    if (acc >= keepRecentTokens && isSafeTurnBoundary(entries[i])) {
      return { firstKeptEntryId: entries[i].id, cutIndex: i };
    }
  }
  return { firstKeptEntryId: entries[0]?.id, cutIndex: 0 };
}`,
        },
        {
          id: 'pi-file-tracking',
          label: '确定性活跃文件追踪',
          sub: 'readFiles / modifiedFiles 静态扫描',
          tone: 'amber',
          badge: 'TRACKING',
          file: 'packages/coding-agent/src/core/compaction/compaction.ts',
          lessonSlug: 'pi-compaction',
          stepNumber: 4,
          summary: '不指望 LLM 摘要靠记忆背诵文件路径，压缩器直接确定性扫描历史 read / edit / write 参数附进摘要尾部。',
          points: [
            '自动区分只读过的 readFiles 与实际改写过的 modifiedFiles',
            '压缩后模型第一时间仍精确掌握当前改动面',
          ],
          codeLang: 'ts',
          code: `for (const call of extractToolCalls(oldEntries)) {
  const filePath = typeof call.args.path === 'string' ? call.args.path : null;
  if (!filePath) continue;
  if (call.name === 'read') readFiles.add(filePath);
  if (call.name === 'edit' || call.name === 'write') modifiedFiles.add(filePath);
}`,
        },
        {
          id: 'pi-extension-api',
          label: 'ExtensionAPI 生命周期与热载',
          sub: 'tool_call · context · registerTool · appendEntry',
          tone: 'amber',
          badge: 'EXTENSION',
          file: 'packages/coding-agent/src/core/extensions/types.ts',
          lessonSlug: 'pi-extensions',
          stepNumber: 2,
          summary: '扩展可直接监听所有生命周期事件、同名覆写内置 bash 实现容器沙箱，并将状态随分支一起写入会话树。',
          points: [
            'pi.on("session_before_compact") 可换用更便宜的小模型跑摘要',
            'pi.appendEntry() 让扩展自定义状态自动跟随 /tree 分支切换复原',
          ],
          codeLang: 'ts',
          code: `pi.registerTool({
  name: 'bash',
  description: 'Run command inside Docker sandbox',
  parameters: BashParamsSchema,
  execute: async (_id, params, signal) => runInDocker(params.command, signal),
});

pi.appendEntry('sandbox-state', { containerId, image: 'node:22-slim' });`,
        },
      ],
    },
  ],
};

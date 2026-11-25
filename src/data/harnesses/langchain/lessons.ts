// LangChain / LangGraph（langchain-ai/langgraph）交互式源码教程：4 章 · 8 课 · 48 步
// 对应仓库：https://github.com/langchain-ai/langgraph
import { chapter, iso, kpi, lesson, lgSrc, steps, swim, tree } from '../../helpers';
import type { Chapter } from '../../../types/lesson';

// ---------------------------------------------------------------------------
// CH1 · 1/2 · StateGraph 有向状态图与共享状态
// ---------------------------------------------------------------------------
const L_LG_STATEGRAPH = lesson(
  'lg-state-graph',
  'lg-ch01',
  1,
  'StateGraph 与通道归约',
  1,
  2,
  'StateGraph：把 Agent 建模为有向状态图',
  '不同于传统 while 循环，LangGraph（LangChain v1 底层执行引擎）将 Agent 显式抽象为共享 State、纯节点函数与条件路由边的有向图。',
  10,
  '入门',
  [
    { text: '理解为什么 LangChain 从 DAG 链（LCEL）演进到有环 StateGraph', completedAtStep: 2 },
    { text: '掌握 StateGraph 的三要素：State Schema、Node 增量更新与 Edge/Command 路由', completedAtStep: 4 },
    { text: '了解 compile() 如何将声明式 StateGraph 编译为 Pregel 运行时引擎', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '从链到有环图',
      badge: 'PROBLEM',
      title: 'DAG 流水线跑不了 Agent：因为 Agent 天生需要循环与回溯',
      paragraphs: [
        '早期 LangChain 的 Chain / LCEL 是无环有向图（DAG）：A → B → C 跑完就结束。但真实 Agent 必须不断「思考 → 调工具 → 看报错 → 再思考」，甚至在审核不通过时打回重写、中途挂起等人类批准。',
        'LangGraph（`libs/langgraph/langgraph/graph/state.py`）用 **StateGraph** 优雅统一了确定性业务流程与自主 Agent 循环：节点只负责读共享 State 并返回增量补丁，边与 `Command` 负责动态路由！',
      ],
      callout: {
        kind: 'idea',
        title: '核心范式差异',
        text: 'Pi / Codex / Claude Code 把循环藏在命令式 `while` 代码里；LangGraph 把循环**显式图结构化**，从而天然获得每步持久化、中断恢复、时间旅行与可视化调试。',
      },
      kpis: [
        kpi('核心抽象', 'StateGraph → Pregel', 'good'),
        kpi('节点协议', 'fn(state) -> partial dict', 'good'),
        kpi('核心文件', 'graph/state.py', 'neutral'),
      ],
      scene: iso(
        'StateGraph 典型 ReAct 循环拓扑',
        [
          { id: 'st', x: 70, y: 210, label: 'START', sublabel: '入口虚拟节点', tone: 'blue', size: 'sm', icon: 'layers' },
          { id: 'llm', x: 320, y: 210, label: 'agent (LLM Node)', sublabel: '读取 messages → 返回 AIMessage', tone: 'violet', size: 'lg', active: true, icon: 'brain' },
          { id: 'tl', x: 670, y: 95, label: 'tools (ToolNode)', sublabel: '并行执行 tool_calls 返回 ToolMessage', tone: 'orange', size: 'lg', active: true, icon: 'wrench' },
          { id: 'end', x: 670, y: 330, label: 'END', sublabel: '无 tool_calls 时收敛结束', tone: 'green', size: 'sm', icon: 'check-circle' },
        ],
        [
          { from: 'st', to: 'llm', status: 'active', packetCount: 1 },
          { from: 'llm', to: 'tl', label: 'has tool_calls', status: 'active', packetCount: 2, packetLabel: 'tools_condition' },
          { from: 'tl', to: 'llm', label: '循环回边', status: 'active', packetCount: 2, packetLabel: 'ToolMessage' },
          { from: 'llm', to: 'end', label: '无工具调用', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'StateGraph 源码写法',
      badge: 'TECHNIQUE',
      title: '20 行 Python 声明一个带环、可持久化的 Agent 图',
      paragraphs: [
        '在 `StateGraph` 中，状态是一个强类型 `TypedDict` 或 Pydantic 模型；每个节点只需要返回**它想更新的那几个字段**，无需拷贝整份 State；最后调用 `.compile(checkpointer=...)` 生成继承自 `Pregel` 的 `CompiledStateGraph`。',
      ],
      sourceDrawer: lgSrc(
        '声明 StateGraph 并编译为 Pregel 运行时',
        'libs/langgraph/langgraph/graph/state.py',
        'py',
        `from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

builder = StateGraph(AgentState)
builder.add_node("agent", call_model)
builder.add_node("tools", ToolNode(tools))
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", tools_condition)  # 有调用去 tools，否则去 END
builder.add_edge("tools", "agent")

graph = builder.compile(checkpointer=checkpointer)`,
        'LangChain v1 的 create_agent 底层正是编译成这样的 CompiledStateGraph。',
      ),
      kpis: [
        kpi('状态定义', 'TypedDict / Pydantic', 'good'),
        kpi('编译产物', 'CompiledStateGraph', 'good'),
        kpi('入口/出口', 'START / END 哨兵', 'neutral'),
      ],
      scene: iso(
        '从声明式 Builder 到 Pregel 可执行图',
        [
          { id: 'b', x: 80, y: 210, label: 'StateGraph (Builder)', sublabel: '声明 schema / nodes / edges', tone: 'blue', size: 'lg', icon: 'git-branch' },
          { id: 'cmp', x: 420, y: 210, label: '.compile(checkpointer)', sublabel: '校验拓扑 + 为每个字段生成 Channel', tone: 'violet', size: 'lg', active: true, icon: 'cpu' },
          { id: 'pr', x: 760, y: 210, label: 'CompiledStateGraph (Pregel)', sublabel: 'invoke / stream / astream_events', tone: 'green', size: 'lg', active: true, icon: 'refresh-cw' },
        ],
        [
          { from: 'b', to: 'cmp', status: 'active', packetCount: 1 },
          { from: 'cmp', to: 'pr', status: 'active', packetCount: 2, packetLabel: 'Channels + Nodes' },
        ],
      ),
    },
    {
      shortLabel: '节点只返回增量补丁',
      badge: 'SOLUTION',
      title: '为什么节点绝不原地 mutate state，而是返回 Partial Dict？',
      paragraphs: [
        '在并行执行两个节点（例如同时跑「查天气」和「查日历」）时，如果两个节点都原地修改同一个全局字典，立刻产生并发覆盖竞态。',
        'LangGraph 要求节点作为纯函数只返回**局部增量**（例如 `{"messages": [ai_msg]}`），真正的合并由底层 Channels 和 Reducers 在超步末尾统一完成！',
      ],
      kpis: [
        kpi('节点返回', '仅增量字段 dict', 'good'),
        kpi('并行写入安全', 'Channel Reducer 统一归约', 'good'),
        kpi('可测试性', '单节点可直接单测', 'good'),
      ],
      scene: swim(
        '节点返回增量补丁 → Channel 统一归约合并',
        [
          { id: 'n1', label: 'Node A (并行)', tone: 'blue' },
          { id: 'n2', label: 'Node B (并行)', tone: 'violet' },
          { id: 'ch', label: 'Channel Reducers', tone: 'green' },
        ],
        [
          { id: 'a1', laneId: 'n1', start: 6, end: 46, label: '产出 {"docs": [docA]}', tone: 'blue', status: 'parallel' },
          { id: 'a2', laneId: 'n2', start: 6, end: 52, label: '产出 {"docs": [docB]}', tone: 'violet', status: 'parallel' },
          { id: 'a3', laneId: 'ch', start: 58, end: 95, label: 'operator.add 原子归约为 [docA, docB]', tone: 'green', status: 'done' },
        ],
      ),
    },
    {
      shortLabel: 'Schema 分层隔离',
      badge: 'TECHNIQUE',
      title: 'Input / Private / Output 多 Schema 隐藏内部草稿',
      paragraphs: [
        '`StateGraph(OverallState, input_schema=InputState, output_schema=OutputState)` 允许图对外只暴露干净的入参和出参，同时在图内部节点之间传递私有中间状态（如重试计数、内部检索草稿、评分器打分），彻底封装内部实现细节。',
      ],
      kpis: [
        kpi('对外入参', 'input_schema', 'neutral'),
        kpi('内部草稿', 'PrivateState（仅节点间可见）', 'good'),
        kpi('对外出参', 'output_schema', 'good'),
      ],
      scene: iso(
        'StateGraph 三层 Schema 封装',
        [
          { id: 'in', x: 70, y: 210, label: 'InputState', sublabel: '{ query: str }', tone: 'blue', icon: 'inbox' },
          { id: 'all', x: 410, y: 210, label: 'Overall / Private State', sublabel: 'messages + retries + internal_notes', tone: 'violet', size: 'lg', active: true, icon: 'database' },
          { id: 'out', x: 770, y: 210, label: 'OutputState', sublabel: '{ final_answer: str }', tone: 'green', icon: 'check-circle' },
        ],
        [
          { from: 'in', to: 'all', status: 'active', packetCount: 1 },
          { from: 'all', to: 'out', label: '出口投影裁剪私有字段', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'Command 合二为一',
      badge: 'INSIGHT',
      title: 'Command(update=..., goto=...)：把状态更新与动态跳转合二为一',
      paragraphs: [
        '传统写法需要节点先返回状态更新，再单独写一个条件边函数决定下一跳。LangGraph 引入了 `Command` 原语：节点可以直接返回 `Command(update={"plan": ...}, goto="reviewer")`，在一个原子返回值里同时完成「改状态 + 指明路由目标」，特别适合多 Agent 交接（Handoff）！',
      ],
      kpis: [
        kpi('动态原语', 'Command(update, goto)', 'good'),
        kpi('跨图跳转', 'graph=Command.PARENT', 'good'),
        kpi('适用场景', '多 Agent 交接 / 审批恢复', 'good'),
      ],
      scene: iso(
        'Command 原子组合「状态更新 + 路由跳转」',
        [
          { id: 'n', x: 100, y: 210, label: 'Planner Node', sublabel: '返回 Command(update=..., goto="coder")', tone: 'violet', size: 'lg', active: true, icon: 'brain' },
          { id: 'u', x: 520, y: 110, label: '写入 State Channels', tone: 'blue', size: 'lg', icon: 'database' },
          { id: 'g', x: 520, y: 315, label: '直接路由到 coder 节点', tone: 'green', size: 'lg', active: true, icon: 'git-branch' },
        ],
        [
          { from: 'n', to: 'u', status: 'active', packetCount: 1, packetLabel: 'update' },
          { from: 'n', to: 'g', status: 'active', packetCount: 2, packetLabel: 'goto' },
        ],
      ),
    },
    {
      shortLabel: 'StateGraph 复盘',
      badge: 'RECAP',
      title: 'StateGraph 核心理念复盘',
      paragraphs: [
        '把 Agent 从隐式 while 循环提升为显式 StateGraph，是 LangGraph 整套持久化、流式观测、人机审批和时间旅行能力的共同地基。',
      ],
      recapTable: [
        { question: '为什么 Agent 不能只用无环 DAG 链？', decision: '采用支持循环回边与动态路由的有向 StateGraph', because: '真实 Agent 必须反复调用工具、遇错重试与审核打回。' },
        { question: '节点为什么只返回增量 dict 而不直接修改 state？', decision: '纯增量更新交给 Channel Reducer 统一归约', because: '彻底消除并行节点同时写状态时的数据竞争覆盖。' },
        { question: '如何简化复杂的条件边路由？', decision: '节点直接返回 Command(update=..., goto=...)', because: '把状态变更与下一跳决策收拢在同一个强类型返回值里。' },
      ],
      kpis: [
        kpi('底层引擎', 'Pregel', 'good'),
        kpi('节点协议', 'Partial Update / Command', 'good'),
        kpi('封装能力', 'Input/Private/Output Schema', 'good'),
      ],
      scene: iso('StateGraph 复盘', [
        { id: 'a', x: 200, y: 200, label: 'StateGraph', tone: 'blue' },
        { id: 'b', x: 500, y: 200, label: 'compile()', tone: 'violet', active: true },
        { id: 'c', x: 800, y: 200, label: 'Pregel Runtime', tone: 'green' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH1 · 2/2 · Channels 通道与 Reducer 归约机制
// ---------------------------------------------------------------------------
const L_LG_CHANNELS = lesson(
  'lg-channels-reducers',
  'lg-ch01',
  1,
  'StateGraph 与通道归约',
  2,
  2,
  'Channels 通道与 Reducer：LastValue 到 add_messages',
  '拆开编译后的 StateGraph 引擎盖：TypedDict 里的每一个字段，在运行时都会被编译成一个独立的 Channel 通道对象。',
  10,
  '核心',
  [
    { text: '理解 LastValue 通道为何禁止同一超步内两个并行节点同时覆盖', completedAtStep: 2 },
    { text: '掌握 BinaryOperatorAggregate（Annotated Reducer）与 add_messages 按 ID 去重/删除机制', completedAtStep: 4 },
    { text: '了解 EphemeralValue / Topic 通道如何驱动节点触发与边信号传递', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '并发写冲突',
      badge: 'PROBLEM',
      title: '两个并行节点同时更新同一个字段，谁覆盖谁？',
      paragraphs: [
        '假设节点 A 和节点 B 在同一个超步（Superstep）里并行运行，两者都返回 `{"status": ...}`。如果默默让后跑完的覆盖先跑完的，系统就会陷入不可复现的竞态 Bug！',
        'LangGraph 的默认通道 `LastValue`（`libs/langgraph/langgraph/channels/last_value.py`）选择**宁可报错也不静默覆盖**：同一超步收到 >1 次写入直接抛出 `InvalidUpdateError`，倒逼开发者为并发字段显式声明 Reducer！',
      ],
      kpis: [
        kpi('默认通道', 'LastValue（每步最多 1 写）', 'warn'),
        kpi('并发归约', 'BinaryOperatorAggregate', 'good'),
        kpi('冲突策略', 'Fail-Fast 拒绝静默覆盖', 'good'),
      ],
      scene: iso(
        'LastValue 拒绝并发覆写 vs Reducer 安全归约',
        [
          { id: 'w1', x: 80, y: 110, label: '并行节点 A 写入', tone: 'blue', icon: 'cpu' },
          { id: 'w2', x: 80, y: 315, label: '并行节点 B 写入', tone: 'violet', icon: 'cpu' },
          { id: 'lv', x: 480, y: 110, label: 'LastValue Channel', sublabel: '收到 2 次写入 → 立即抛 InvalidUpdateError!', tone: 'rose', size: 'lg', icon: 'alert-triangle' },
          { id: 'rd', x: 480, y: 315, label: 'BinaryOperatorAggregate', sublabel: '用 Annotated[list, add] 无损合并两路结果', tone: 'green', size: 'lg', active: true, icon: 'check-circle' },
        ],
        [
          { from: 'w1', to: 'lv', status: 'error', dashed: true, packetCount: 1 },
          { from: 'w2', to: 'lv', status: 'error', dashed: true, packetCount: 1 },
          { from: 'w1', to: 'rd', status: 'active', packetCount: 1 },
          { from: 'w2', to: 'rd', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'LastValue 源码',
      badge: 'TECHNIQUE',
      title: 'last_value.py：短短 20 行守住状态一致性底线',
      paragraphs: [
        '查看 `libs/langgraph/langgraph/channels/last_value.py` 的 `update(values)` 方法：每轮超步结束后，Pregel 收集所有节点发往该字段的写入列表 `values`——长度为 0 不变，长度为 1 赋值，长度大于 1 直接报错！',
      ],
      sourceDrawer: lgSrc(
        'LastValue 通道核心实现示意',
        'libs/langgraph/langgraph/channels/last_value.py',
        'py',
        `class LastValue(Generic[Value], BaseChannel[Value, Value, Value]):
    def update(self, values: Sequence[Value]) -> bool:
        if len(values) == 0:
            return False
        if len(values) != 1:
            raise InvalidUpdateError(
                f"At key '{self.key}': Can receive only one value per step. "
                "Use an Annotated key to handle multiple values."
            )
        self.value = values[-1]
        return True`,
        '真实还原 LangGraph channels/last_value.py 的 Fail-Fast 并发写校验。',
      ),
      kpis: [
        kpi('源码路径', 'channels/last_value.py', 'neutral'),
        kpi('多写检测', 'len(values) != 1 即报错', 'good'),
        kpi('触发判断', '返回 bool 指示版本递增', 'good'),
      ],
      scene: tree(
        'LangGraph 四大内置 Channel 家族',
        [
          { id: 'base', x: 500, y: 55, kind: 'root', label: 'BaseChannel 抽象接口', sublabel: 'get() / update() / checkpoint() / from_checkpoint()', status: 'active' },
          { id: 'lv', x: 160, y: 245, kind: 'service', label: 'LastValue', sublabel: '普通字段默认 · 每步单写', parentId: 'base' },
          { id: 'bin', x: 400, y: 245, kind: 'plugin', label: 'BinaryOperatorAggregate', sublabel: 'Annotated Reducer 归约', parentId: 'base', status: 'active' },
          { id: 'eph', x: 640, y: 245, kind: 'event', label: 'EphemeralValue', sublabel: '边触发信号 · 读完即清空', parentId: 'base' },
          { id: 'top', x: 860, y: 245, kind: 'log', label: 'Topic', sublabel: '发布订阅多值累加队列', parentId: 'base' },
        ],
        [
          { from: 'base', to: 'lv' },
          { from: 'base', to: 'bin', animated: true },
          { from: 'base', to: 'eph' },
          { from: 'base', to: 'top' },
        ],
      ),
    },
    {
      shortLabel: 'add_messages 魔法',
      badge: 'SOLUTION',
      title: 'add_messages Reducer：不只是 append，还支持按 ID 原地更新与删除',
      paragraphs: [
        '在 Agent 对话状态里，最常用的 Reducer 是 `Annotated[list[AnyMessage], add_messages]`。它比单纯的 `operator.add` 聪明得多：',
        '1. 新消息默认追加；2. 如果传入一条带有**相同 `id`** 的消息，则原地替换旧消息（方便人类审校修改草稿）；3. 如果传入 `RemoveMessage(id=...)`，则精准删除指定旧消息（实现窗口裁剪或总结替换）！',
      ],
      kpis: [
        kpi('追加新消息', '自动补全 UUID', 'good'),
        kpi('同 ID 消息', '原地覆写更新', 'good'),
        kpi('RemoveMessage', '精准删除/裁剪窗口', 'good'),
      ],
      scene: iso(
        'add_messages Reducer 三种语义操作',
        [
          { id: 'cur', x: 70, y: 215, label: '现有 messages[]', sublabel: '[msg_1, msg_2, msg_3]', tone: 'blue', size: 'lg', icon: 'database' },
          { id: 'op1', x: 430, y: 85, label: '新消息 (新 ID)', sublabel: '→ 追加到末尾', tone: 'green', icon: 'check-circle' },
          { id: 'op2', x: 430, y: 215, label: '同 ID 消息 (msg_2\')', sublabel: '→ 原地替换 msg_2', tone: 'violet', active: true, icon: 'refresh-cw' },
          { id: 'op3', x: 430, y: 345, label: 'RemoveMessage(msg_1)', sublabel: '→ 从列表删除（裁剪压缩）', tone: 'orange', icon: 'shield' },
          { id: 'res', x: 790, y: 215, label: '新 messages[] 快照', tone: 'green', size: 'lg', icon: 'layers' },
        ],
        [
          { from: 'cur', to: 'op1', packetCount: 1 },
          { from: 'cur', to: 'op2', status: 'active', packetCount: 1 },
          { from: 'cur', to: 'op3', packetCount: 1 },
          { from: 'op1', to: 'res', packetCount: 1 },
          { from: 'op2', to: 'res', status: 'active', packetCount: 1 },
          { from: 'op3', to: 'res', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '边也是隐藏通道',
      badge: 'INSIGHT',
      title: '冷知识：图里的每一条 Edge 底层其实都是一条 EphemeralValue 通道',
      paragraphs: [
        '打开 Pregel 编译细节你会大吃一惊：当写 `builder.add_edge("agent", "tools")` 时，编译器悄悄创建了一条名为 `branch:to:tools` 的隐式 `EphemeralValue` 通道！',
        '`agent` 跑完向该通道写入信号，`tools` 节点订阅了这个通道，因此在下一个超步被唤醒执行，执行完后该通道值自动清空——**状态字段和控制流边在 Pregel 底层被统一成了同一种 Channel 原语！**',
      ],
      kpis: [
        kpi('统一原语', '数据流与控制流同构', 'good'),
        kpi('通道生命周期', '每超步后自动清空', 'neutral'),
        kpi('版本号追踪', 'channel_versions 字典', 'good'),
      ],
      scene: iso(
        '数据通道与控制边通道在 Pregel 中完全同构',
        [
          { id: 'ag', x: 80, y: 210, label: 'agent 节点执行完', tone: 'violet', size: 'lg', active: true, icon: 'brain' },
          { id: 'dch', x: 440, y: 110, label: '数据通道: messages', sublabel: 'add_messages 追加 AIMessage · ver +1', tone: 'blue', size: 'lg', icon: 'database' },
          { id: 'cch', x: 440, y: 315, label: '控制通道: branch:to:tools', sublabel: 'EphemeralValue 置位 · ver +1', tone: 'orange', size: 'lg', active: true, icon: 'git-branch' },
          { id: 'tl', x: 790, y: 210, label: '唤醒订阅者 tools 节点', tone: 'green', size: 'lg', icon: 'wrench' },
        ],
        [
          { from: 'ag', to: 'dch', packetCount: 1 },
          { from: 'ag', to: 'cch', status: 'active', packetCount: 2, packetLabel: 'trigger' },
          { from: 'cch', to: 'tl', label: '版本递增触发', status: 'active', packetCount: 2 },
        ],
      ),
    },
    {
      shortLabel: '长对话窗口裁剪',
      badge: 'TECHNIQUE',
      title: '用 RemoveMessage + Summarization 节点实现无损长对话瘦身',
      paragraphs: [
        '当 `messages` 超过阈值，LangGraph 只需在图里加一个 `summarize_conversation` 节点：生成摘要写进 `state["summary"]`，同时返回 `[RemoveMessage(id=m.id) for m in old_messages]` 精准删掉旧消息，下一轮发给 LLM 时拼上 `summary + recent_messages` 即可！',
      ],
      kpis: [
        kpi('裁剪手段', 'RemoveMessage(id=...)', 'good'),
        kpi('历史回溯', '旧 Checkpoint 仍保留原文', 'good'),
        kpi('图内原生', '作为一个普通 Node 插入', 'good'),
      ],
      scene: swim(
        '图内 Summarize Node 配合 RemoveMessage 瘦身',
        [
          { id: 'chk', label: '长度判断边', tone: 'blue' },
          { id: 'sum', label: 'summarize 节点', tone: 'violet' },
          { id: 'st', label: 'State.messages', tone: 'green' },
        ],
        [
          { id: 's1', laneId: 'chk', start: 5, end: 28, label: 'len(messages) > 20', tone: 'orange', status: 'done' },
          { id: 's2', laneId: 'sum', start: 30, end: 64, label: '生成摘要 + 产出 RemoveMessage 列表', tone: 'violet', status: 'running' },
          { id: 's3', laneId: 'st', start: 66, end: 95, label: 'add_messages 删旧留新 + 更新 summary', tone: 'green', status: 'done' },
        ],
      ),
    },
    {
      shortLabel: '通道复盘',
      badge: 'RECAP',
      title: 'Channels 与 Reducer 复盘',
      paragraphs: [
        'Channel 是 LangGraph 最容易被忽略却最底层的精妙设计：它既用 Fail-Fast 守住了并行写安全，又把数据字段和边触发统一成了可序列化、可做版本快照的单一模型。',
      ],
      recapTable: [
        { question: '默认字段为什么不允许同一超步写入两次？', decision: 'LastValue 遇到多次并发写直接抛 InvalidUpdateError', because: '宁可开发期立刻暴露竞态，也绝不悄悄覆盖丢失并行节点产出。' },
        { question: 'add_messages 比普通 list 拼接强在哪？', decision: '支持按消息 ID 原地更新和 RemoveMessage 精准删除', because: '天然支持人工改写历史消息与图内上下文窗口瘦身。' },
        { question: 'LangGraph 底层怎么知道下一步该激活哪些节点？', decision: '边编译为 EphemeralValue 通道，对比 channel_versions 递增即触发', because: '所有状态和调度信号全部收口在 Channel 版本快照中，易于持久化恢复。' },
      ],
      kpis: [
        kpi('并发安全', 'LastValue Fail-Fast', 'good'),
        kpi('消息归约', 'add_messages', 'good'),
        kpi('控制同构', 'Edge = EphemeralValue', 'good'),
      ],
      scene: iso('Channels 复盘', [
        { id: 'a', x: 200, y: 200, label: 'LastValue', tone: 'rose' },
        { id: 'b', x: 500, y: 200, label: 'add_messages', tone: 'green', active: true },
        { id: 'c', x: 800, y: 200, label: 'EphemeralValue', tone: 'orange' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH2 · 1/2 · Pregel BSP 同步超步模型：Plan → Execute → Update
// ---------------------------------------------------------------------------
const L_LG_PREGEL = lesson(
  'lg-pregel-superstep',
  'lg-ch02',
  2,
  'Pregel 超步引擎与工具节点',
  1,
  2,
  'Pregel BSP 超步引擎：Plan → Execute → Update',
  '深入 libs/langgraph/langgraph/pregel/_loop.py：借鉴 Google Pregel 大规模图计算思想，用三阶段离散超步驱动确定性并行执行与原子落盘。',
  12,
  '核心',
  [
    { text: '掌握 Pregel 单个超步（Superstep）的三大阶段：Plan → Execute → Update', completedAtStep: 2 },
    { text: '理解 BSP（Bulk Synchronous Parallel）同步屏障如何保证并行节点读到一致快照', completedAtStep: 4 },
    { text: '了解 PregelLoop 的 Pending Writes 容错机制与 recursion_limit 防死循环', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '借鉴 Google Pregel',
      badge: 'PROBLEM',
      title: '多节点并行执行，什么时候写 Checkpoint 才不会拿到半成品状态？',
      paragraphs: [
        '如果 3 个并行分支各自跑完立刻原地改状态、各自触发下游节点，整个执行过程就像一团失控的回调意大利面：半途崩溃时你根本说不清哪些节点算完、哪些没算完，更没法做时间旅行回放！',
        'LangGraph 借鉴 Google **Pregel（BSP 整体同步并行模型）**：把整个执行切分为一个个离散的**超步（Superstep 0, 1, 2...）**，每个超步严格走完 **Plan → Execute → Update + Checkpoint** 三拍子！',
      ],
      kpis: [
        kpi('计算模型', 'Google Pregel (BSP)', 'good'),
        kpi('每步三阶段', 'Plan → Execute → Update', 'good'),
        kpi('源码位置', 'pregel/_loop.py', 'neutral'),
      ],
      scene: iso(
        'Pregel 单个 Superstep 的三阶段循环',
        [
          { id: 'p', x: 80, y: 210, label: '1 · Plan 规划', sublabel: '扫描版本递增的 Channel → 选出本步待跑节点', tone: 'blue', size: 'lg', active: true, icon: 'eye' },
          { id: 'e', x: 420, y: 210, label: '2 · Execute 并行执行', sublabel: '所有选中节点并发运行，读同一份冻结快照', tone: 'orange', size: 'lg', active: true, icon: 'cpu' },
          { id: 'u', x: 760, y: 210, label: '3 · Update + Checkpoint', sublabel: '同步屏障汇合 → 写入 Channels → 拍快照落盘', tone: 'green', size: 'lg', active: true, icon: 'database' },
        ],
        [
          { from: 'p', to: 'e', label: 'tasks[]', status: 'active', packetCount: 2, packetLabel: 'Superstep N' },
          { from: 'e', to: 'u', label: 'pending_writes', status: 'active', packetCount: 2, packetLabel: 'Barrier' },
          { from: 'u', to: 'p', label: '进入 Superstep N+1', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '_loop.py 源码骨架',
      badge: 'TECHNIQUE',
      title: 'PregelLoop.tick() 与 after_tick()：精确掌控每一拍节奏',
      paragraphs: [
        '打开 `libs/langgraph/langgraph/pregel/_loop.py`，`SyncPregelLoop` / `AsyncPregelLoop` 的核心循环极其规整：`tick()` 负责 Plan 阶段准备任务清单（若无任务则图收敛结束），并发执行器跑完所有任务并先记录 `put_writes`，然后 `after_tick()` 把写入原子应用到所有 Channels 并写入新的 `Checkpoint`！',
      ],
      sourceDrawer: lgSrc(
        'PregelLoop 超步推进主循环示意',
        'libs/langgraph/langgraph/pregel/_loop.py',
        'py',
        `# 简化还原 libs/langgraph/langgraph/pregel/_loop.py 超步推进节奏
while loop.tick():
    # 1. Plan: loop.tasks 已根据 channel_versions 选出本超步全部就绪节点
    # 2. Execute: 并发执行全部 tasks（共享本超步只读快照，互不干扰）
    runner.tick(
        loop.tasks.values(),
        reraise=False,
        timeout=step_timeout,
        retry_policy=retry_policy,
    )
    # 3. Update & Checkpoint: 应用所有 writes 到 Channels 并原子保存 Checkpoint
    loop.after_tick()`,
        '每个 Superstep 结束都有完整一致的 Checkpoint，且内置节点级 RetryPolicy 与超步上限保护。',
      ),
      kpis: [
        kpi('循环类', 'Sync / AsyncPregelLoop', 'good'),
        kpi('防死循环', 'recursion_limit (默认 25)', 'good'),
        kpi('容错支持', 'RetryPolicy 节点级自动重试', 'good'),
      ],
      scene: swim(
        '三个连续 Superstep 的 BSP 同步屏障时序',
        [
          { id: 'n1', label: 'agent 节点', tone: 'violet' },
          { id: 'n2', label: 'worker A (并行)', tone: 'blue' },
          { id: 'n3', label: 'worker B (并行)', tone: 'blue' },
          { id: 'cp', label: 'Checkpointer', tone: 'green' },
        ],
        [
          { id: 's0', laneId: 'n1', start: 4, end: 24, label: 'Step 1: 规划任务', tone: 'violet', status: 'done' },
          { id: 'c1', laneId: 'cp', start: 25, end: 32, label: 'CP #1', tone: 'green', status: 'done' },
          { id: 's1a', laneId: 'n2', start: 35, end: 62, label: 'Step 2: 并发查库 A', tone: 'blue', status: 'parallel' },
          { id: 's1b', laneId: 'n3', start: 35, end: 56, label: 'Step 2: 并发查库 B', tone: 'blue', status: 'parallel' },
          { id: 'c2', laneId: 'cp', start: 64, end: 71, label: 'CP #2', tone: 'green', status: 'done' },
          { id: 's2', laneId: 'n1', start: 74, end: 90, label: 'Step 3: 汇总结论', tone: 'violet', status: 'done' },
          { id: 'c3', laneId: 'cp', start: 91, end: 98, label: 'CP #3', tone: 'green', status: 'done' },
        ],
      ),
    },
    {
      shortLabel: '快照隔离一致性',
      badge: 'SOLUTION',
      title: '同一超步内的并行节点，永远看不到彼此的半途输出',
      paragraphs: [
        '在 Step 2 里，哪怕 `worker B` 比 `worker A` 早跑完 500 毫秒，`worker B` 的输出也只是先暂存在 `pending_writes` 缓冲区里，不会立刻改写共享 State。',
        '这保证了同一超步内所有并行节点看到的输入状态 100% 确定一致，彻底消除「谁跑得快谁影响另一个节点」的幽灵 Bug！',
      ],
      kpis: [
        kpi('读一致性', '超步级冻结快照', 'good'),
        kpi('写生效时机', '同步屏障 Update 阶段', 'good'),
        kpi('竞态概率', '0', 'good'),
      ],
      scene: iso(
        '超步冻结快照与 pending_writes 暂存缓冲',
        [
          { id: 'snap', x: 80, y: 210, label: 'CP #1 冻结快照', sublabel: '本超步所有节点共享同一份只读视图', tone: 'blue', size: 'lg', icon: 'database' },
          { id: 'a', x: 420, y: 110, label: 'Worker A (慢 · 800ms)', tone: 'violet', icon: 'cpu' },
          { id: 'b', x: 420, y: 315, label: 'Worker B (快 · 300ms)', tone: 'violet', icon: 'cpu' },
          { id: 'buf', x: 760, y: 210, label: 'pending_writes → 统一提交', sublabel: '全员就绪后原子写入 CP #2', tone: 'green', size: 'lg', active: true, icon: 'check-circle' },
        ],
        [
          { from: 'snap', to: 'a', packetCount: 1 },
          { from: 'snap', to: 'b', packetCount: 1 },
          { from: 'a', to: 'buf', status: 'active', packetCount: 1 },
          { from: 'b', to: 'buf', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '半步故障自动续跑',
      badge: 'INSIGHT',
      title: 'Pending Writes 容错：并行 A 成功、B 挂了，重试时绝不重跑 A！',
      paragraphs: [
        '这是 Pregel 引擎在生产环境极其值钱的韧性设计：在同一个超步里，如果 Worker A（调用了昂贵的 LLM 或扣费 API）已经成功，而 Worker B 因为网络超时失败，Checkpointer 已经通过 `put_writes` 把 Worker A 的结果持久化下来！',
        '当你重新恢复该 `thread_id` 时，Pregel 只重跑失败的 Worker B，直接复用 Worker A 已落盘的 `pending_writes`，避免重复计费与重复副作用！',
      ],
      callout: {
        kind: 'tip',
        title: 'Durable Execution（耐久执行）',
        text: '超步级 `Checkpoint` + 任务级 `put_writes` 组合，让 LangGraph 拥有了类 Temporal 的耐久工作流容错能力。',
      },
      kpis: [
        kpi('已成功并行分支', '零重跑（读 pending_writes）', 'good'),
        kpi('失败分支', '精准单点重跑', 'good'),
        kpi('重复副作用', '有效避免', 'good'),
      ],
      scene: swim(
        '并行超步局部失败后的精准恢复',
        [
          { id: 'wa', label: 'Worker A (扣费 API)', tone: 'green' },
          { id: 'wb', label: 'Worker B (网络抖动)', tone: 'rose' },
          { id: 'db', label: 'Checkpointer', tone: 'blue' },
        ],
        [
          { id: 'a1', laneId: 'wa', start: 5, end: 36, label: '执行成功 → put_writes 落盘', tone: 'green', status: 'done' },
          { id: 'b1', laneId: 'wb', start: 5, end: 42, label: '503 超时失败', tone: 'rose', status: 'error' },
          { id: 'd1', laneId: 'db', start: 46, end: 60, label: '保存 A 的 pending_writes', tone: 'blue', status: 'done' },
          { id: 'b2', laneId: 'wb', start: 64, end: 95, label: '恢复重跑：跳过 A，仅重跑 B → 汇合成功！', tone: 'green', status: 'running' },
        ],
      ),
    },
    {
      shortLabel: '多维度流式输出',
      badge: 'TECHNIQUE',
      title: 'stream_mode：从 Token 级到每超步完整状态任意订阅',
      paragraphs: [
        '通过 `graph.stream(input, stream_mode=["messages", "updates", "values", "custom"])`，前端可以同时订阅 LLM 逐字 Token 流（`messages`）、每个节点的增量补丁（`updates`）、每超步后的全量状态（`values`）以及工具内部发射的自定义进度事件（`custom`）。',
      ],
      kpis: [
        kpi('messages', 'LLM 逐 Token 流式输出', 'good'),
        kpi('updates', '每节点增量变更', 'neutral'),
        kpi('custom', '节点内自定义进度推送', 'good'),
      ],
      scene: iso(
        'Pregel 多模式流式输出总线',
        [
          { id: 'pr', x: 90, y: 215, label: 'Pregel Loop', tone: 'violet', size: 'lg', active: true, icon: 'refresh-cw' },
          { id: 'm1', x: 520, y: 80, label: 'messages: 逐字 Token 流', tone: 'green', icon: 'message-square-text' },
          { id: 'm2', x: 520, y: 170, label: 'updates: 节点增量补丁', tone: 'blue', icon: 'layers' },
          { id: 'm3', x: 520, y: 260, label: 'values: 超步全量快照', tone: 'orange', icon: 'database' },
          { id: 'm4', x: 520, y: 350, label: 'custom: 工具实时进度', tone: 'violet', icon: 'terminal' },
        ],
        [
          { from: 'pr', to: 'm1', status: 'active', packetCount: 2 },
          { from: 'pr', to: 'm2', packetCount: 1 },
          { from: 'pr', to: 'm3', packetCount: 1 },
          { from: 'pr', to: 'm4', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'Pregel 复盘',
      badge: 'RECAP',
      title: 'Pregel BSP 超步引擎复盘',
      paragraphs: [
        'Pregel 是 LangGraph 区别于普通脚本框架的真正内核：离散超步、同步屏障、冻结快照和任务级 `pending_writes` 让复杂多步 Agent 具备了分布式系统级的可靠性。',
      ],
      recapTable: [
        { question: 'Pregel 一个 Superstep 严格做哪三件事？', decision: 'Plan（选就绪节点）→ Execute（并行执行）→ Update（汇合写通道与快照）', because: '同步屏障让每步边界清晰，天然支持持久化与确定性重放。' },
        { question: '并行分支一个成功一个失败，恢复时会重复调用成功节点吗？', decision: '不会，Checkpointer 已通过 put_writes 缓存成功分支输出', because: '恢复时只重跑失败任务，实现 Durable Execution。' },
        { question: '如何防止有环图进入死循环烧光 Token？', decision: '内置 recursion_limit（默认 25 步）超限立即抛出 GraphRecursionError', because: '在运行时兜底限制最大超步数。' },
      ],
      kpis: [
        kpi('同步模型', 'BSP 三阶段超步', 'good'),
        kpi('容错机制', 'pending_writes 续跑', 'good'),
        kpi('防死循环', 'recursion_limit', 'good'),
      ],
      scene: iso('Pregel 复盘', [
        { id: 'a', x: 200, y: 200, label: 'Plan', tone: 'blue' },
        { id: 'b', x: 500, y: 200, label: 'Execute', tone: 'orange', active: true },
        { id: 'c', x: 800, y: 200, label: 'Update + CP', tone: 'green' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH2 · 2/2 · ToolNode 与条件边 / Send 动态扇出
// ---------------------------------------------------------------------------
const L_LG_TOOLNODE = lesson(
  'lg-tool-node-routing',
  'lg-ch02',
  2,
  'Pregel 超步引擎与工具节点',
  2,
  2,
  'ToolNode 与 Send 动态扇出（Map-Reduce）',
  '看清 LangGraph 如何通过预置 ToolNode 并行跑工具、用 InjectedState 隐藏敏感参数，以及用 Send 原语在运行时动态扇出任意数量的并行子任务。',
  10,
  '核心',
  [
    { text: '掌握 ToolNode 如何并发执行 AIMessage 中的多个 tool_calls 并捕获工具异常', completedAtStep: 2 },
    { text: '理解 InjectedState 如何把用户身份/内部状态安全注入工具而不暴露给 LLM', completedAtStep: 4 },
    { text: '学会用 Send(node, arg) 实现运行时数量未知的 Map-Reduce 动态扇出', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: 'ToolNode 并行执行',
      badge: 'TECHNIQUE',
      title: 'ToolNode：自动并发执行多个 tool_calls 并把错误转为 ToolMessage',
      paragraphs: [
        '在 `libs/langgraph/langgraph/prebuilt/tool_node.py` 中，`ToolNode` 从最新一条 `AIMessage.tool_calls` 中提取所有工具请求，使用线程池/asyncio **并行执行**所有调用，并为每个调用返回精确绑定 `tool_call_id` 的 `ToolMessage`。',
        '更重要的是 `handle_tool_errors=True`（默认开启）：当工具参数校验失败或抛出异常时，它不会崩掉整个图，而是把报错文本装进 `ToolMessage(status="error")` 返给 LLM，让模型自我纠正！',
      ],
      kpis: [
        kpi('多工具并发', '自动并行执行', 'good'),
        kpi('错误自愈', '异常转 ToolMessage 喂回模型', 'good'),
        kpi('源码路径', 'prebuilt/tool_node.py', 'neutral'),
      ],
      scene: iso(
        'ToolNode 并发执行与错误自愈',
        [
          { id: 'ai', x: 80, y: 210, label: 'AIMessage', sublabel: '包含 3 个并行 tool_calls', tone: 'violet', size: 'lg', icon: 'brain' },
          { id: 'tn', x: 420, y: 210, label: 'ToolNode', sublabel: '并发分发 + InjectedState + 异常捕获', tone: 'orange', size: 'lg', active: true, icon: 'wrench' },
          { id: 'ok', x: 770, y: 110, label: 'ToolMessage (ok)', tone: 'green', icon: 'check-circle' },
          { id: 'er', x: 770, y: 315, label: 'ToolMessage (error)', sublabel: '不崩图 → 返给 LLM 自我修复', tone: 'rose', icon: 'alert-triangle' },
        ],
        [
          { from: 'ai', to: 'tn', status: 'active', packetCount: 3, packetLabel: 'tool_calls' },
          { from: 'tn', to: 'ok', status: 'active', packetCount: 2 },
          { from: 'tn', to: 'er', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'InjectedState 安全注入',
      badge: 'SOLUTION',
      title: 'InjectedState：把 user_id / auth_token 注入工具，绝不让 LLM 伪造',
      paragraphs: [
        '假设你写了一个 `cancel_order(order_id, user_id)` 工具。如果把 `user_id` 暴露在工具 Schema 里让 LLM 填，Prompt 注入可以轻易诱导模型把 `user_id` 改成别人来越权删单！',
        '`ToolNode` 支持 `Annotated[dict, InjectedState]` 与 `InjectedStore`：该参数会被自动从发给 LLM 的 JSON Schema 中**隐藏**，执行时由 `ToolNode` 直接从可信 Graph State 注入！',
      ],
      sourceDrawer: lgSrc(
        'InjectedState 隐藏敏感参数 + 工具返回 Command 更新状态',
        'libs/langgraph/langgraph/prebuilt/tool_node.py',
        'py',
        `from typing import Annotated
from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState

@tool
def cancel_order(
    order_id: str,
    # 自动从 LLM Schema 隐藏，执行时由 ToolNode 从可信 State 注入！
    user_id: Annotated[str, InjectedState("user_id")],
) -> str:
    return order_service.cancel(order_id=order_id, owner=user_id)`,
        '防止 LLM 编造或被 Prompt 注入篡改租户 ID、鉴权令牌等敏感上下文参数。',
      ),
      kpis: [
        kpi('LLM 可见参数', '仅 order_id', 'good'),
        kpi('运行时注入', 'InjectedState("user_id")', 'good'),
        kpi('越权伪造风险', '0', 'good'),
      ],
      scene: iso(
        'InjectedState 隔离可信状态与 LLM 填参',
        [
          { id: 'llm', x: 80, y: 110, label: 'LLM 只填业务参数', sublabel: '{ order_id: "ORD-42" }', tone: 'orange', size: 'lg', icon: 'brain' },
          { id: 'st', x: 80, y: 315, label: '可信 Graph State', sublabel: '{ user_id: "u_9527" } (对模型不可伪造)', tone: 'blue', size: 'lg', icon: 'shield' },
          { id: 'tn', x: 480, y: 210, label: 'ToolNode 拼装实参', sublabel: 'cancel_order("ORD-42", owner="u_9527")', tone: 'green', size: 'lg', active: true, icon: 'lock' },
        ],
        [
          { from: 'llm', to: 'tn', packetCount: 1 },
          { from: 'st', to: 'tn', label: 'InjectedState', status: 'active', packetCount: 2, packetLabel: '可信注入' },
        ],
      ),
    },
    {
      shortLabel: 'Send 动态扇出',
      badge: 'TECHNIQUE',
      title: 'Send(node, payload)：运行时才确定要并行跑多少个 Worker',
      paragraphs: [
        '静态边要求编译前就写死有几个分支；但如果任务是「分析这份 PR 修改的 N 个文件」（N 可能是 2，也可能是 18），怎么动态扇出？',
        '条件边可以直接返回 `[Send("analyze_file", {"file": f}) for f in state["files"]]`！Pregel 会在下一个超步动态派生 N 个隔离的 `analyze_file` 任务并行运行，最后通过 Reducer（如 `Annotated[list, operator.add]`）自动 Reduce 汇合！',
      ],
      sourceDrawer: lgSrc(
        '用 Send 实现动态 Map-Reduce 并行扇出',
        'libs/langgraph/langgraph/types.py',
        'py',
        `from langgraph.types import Send

def fan_out_files(state: ReviewState) -> list[Send]:
    # 运行时按实际文件数动态派生 N 个并行 worker，彼此独立私有输入
    return [
        Send("review_worker", {"file_path": f, "diff": d})
        for f, d in state["changed_files"].items()
    ]

builder.add_conditional_edges("split_pr", fan_out_files, ["review_worker"])
builder.add_edge("review_worker", "aggregate_report")`,
        'Map-Reduce 范式一等公民：Send 派发动态并行分片，Reducer 自动汇合进入 Reduce 节点。',
      ),
      kpis: [
        kpi('动态扇出', 'Send(node, payload)', 'good'),
        kpi('并行度', '运行时动态决定 N', 'good'),
        kpi('结果归约', 'Annotated Reducer 自动汇合', 'good'),
      ],
      scene: iso(
        'Send 动态 Map-Reduce 并行扇出与归约',
        [
          { id: 'sp', x: 70, y: 215, label: 'split_pr (Map)', sublabel: '解析出 N 个改动文件', tone: 'blue', size: 'lg', active: true, icon: 'git-branch' },
          { id: 'w1', x: 430, y: 80, label: 'Send("worker", file_1)', tone: 'violet', active: true, icon: 'cpu' },
          { id: 'w2', x: 430, y: 215, label: 'Send("worker", file_2)', tone: 'violet', active: true, icon: 'cpu' },
          { id: 'w3', x: 430, y: 350, label: 'Send("worker", file_N)', tone: 'violet', active: true, icon: 'cpu' },
          { id: 'ag', x: 790, y: 215, label: 'aggregate (Reduce)', sublabel: 'Reducer 合并全部报告', tone: 'green', size: 'lg', icon: 'layers' },
        ],
        [
          { from: 'sp', to: 'w1', status: 'active', packetCount: 1 },
          { from: 'sp', to: 'w2', status: 'active', packetCount: 1 },
          { from: 'sp', to: 'w3', status: 'active', packetCount: 1 },
          { from: 'w1', to: 'ag', status: 'active', packetCount: 1 },
          { from: 'w2', to: 'ag', status: 'active', packetCount: 1 },
          { from: 'w3', to: 'ag', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '工具直接更新状态',
      badge: 'INSIGHT',
      title: '工具也可以返回 Command，直接更新共享 State 或移交控制权',
      paragraphs: [
        '在复杂多 Agent 系统里，一个工具（比如 `transfer_to_billing_agent` 或 `update_customer_profile`）不仅要返回 `ToolMessage`，还可能需要顺手把验证后的字段写进 Graph State 甚至切换当前负责的 Agent。`ToolNode` 原生支持工具返回 `Command(update=..., goto=...)`！',
      ],
      kpis: [
        kpi('工具返回 Command', '支持改 State + 跳转', 'good'),
        kpi('多 Agent 交接', 'Handoff 极其简洁', 'good'),
        kpi('协议完整', '同时写入配对 ToolMessage', 'good'),
      ],
      scene: iso(
        'Tool 返回 Command 实现多 Agent Handoff',
        [
          { id: 'a1', x: 80, y: 210, label: '客服分诊 Agent', tone: 'blue', size: 'lg', icon: 'users' },
          { id: 'tl', x: 420, y: 210, label: 'transfer_to_refund Tool', sublabel: '返回 Command(update=..., goto="refund_agent")', tone: 'orange', size: 'lg', active: true, icon: 'wrench' },
          { id: 'a2', x: 770, y: 210, label: '退款专员 Agent', tone: 'green', size: 'lg', active: true, icon: 'users' },
        ],
        [
          { from: 'a1', to: 'tl', status: 'active', packetCount: 1 },
          { from: 'tl', to: 'a2', status: 'active', packetCount: 2, packetLabel: 'Handoff' },
        ],
      ),
    },
    {
      shortLabel: 'Defer 延迟汇合',
      badge: 'TECHNIQUE',
      title: 'defer=True：等所有异步多跳分支彻底收束后再做汇总',
      paragraphs: [
        '如果扇出的每个并行分支长度不一致（分支 A 跑 1 步，分支 B 跑 3 步），汇总节点容易被提前触发两次。给汇总节点加上 `defer=True`，Pregel 会自动等到图中没有其他活跃待办任务时，才最后一次触发汇总节点！',
      ],
      kpis: [
        kpi('不对称汇合', 'add_node(..., defer=True)', 'good'),
        kpi('防重复触发', '等所有上游分支彻底完结', 'good'),
        kpi('适用场景', '不均等深度研究/Map-Reduce', 'neutral'),
      ],
      scene: swim(
        'defer=True 等待不等长并行分支彻底收敛',
        [
          { id: 'b1', label: '短分支 A (1 步)', tone: 'blue' },
          { id: 'b2', label: '长分支 B (3 步)', tone: 'violet' },
          { id: 'df', label: '汇总节点 (defer=True)', tone: 'green' },
        ],
        [
          { id: 'x1', laneId: 'b1', start: 5, end: 28, label: 'Step 1 完成', tone: 'blue', status: 'done' },
          { id: 'x2', laneId: 'b2', start: 5, end: 72, label: 'Step 1 → Step 2 → Step 3 完成', tone: 'violet', status: 'done' },
          { id: 'x3', laneId: 'df', start: 76, end: 96, label: '所有上游收敛 → 仅触发一次最终汇总', tone: 'green', status: 'running' },
        ],
      ),
    },
    {
      shortLabel: '工具路由复盘',
      badge: 'RECAP',
      title: 'ToolNode 与动态路由复盘',
      paragraphs: [
        '并发工具执行 + `InjectedState` 安全防伪造 + `Send` 动态 Map-Reduce + `defer=True` 不等长汇合，让 LangGraph 能优雅承载最复杂的生产级编排需求。',
      ],
      recapTable: [
        { question: '怎么防止 Prompt 注入让工具篡改 user_id？', decision: '使用 InjectedState 将敏感参数从 LLM Schema 隐藏', because: '由可信运行时直接从 State 注入，模型既看不到也改不了。' },
        { question: '编译期不知道有几个并行子任务怎么编排？', decision: '在条件边返回动态列表 [Send("worker", item) for ...]', because: '运行时按需扇出任意数量并行任务，并由 Reducer 自动汇合。' },
        { question: '多条并行分支步数不同，如何避免汇总节点被提前触发？', decision: '对汇总节点声明 defer=True', because: '延迟到所有上游活跃任务彻底收敛后再统一执行一次。' },
      ],
      kpis: [
        kpi('安全注入', 'InjectedState', 'good'),
        kpi('动态并行', 'Send Map-Reduce', 'good'),
        kpi('最终汇合', 'defer=True', 'good'),
      ],
      scene: iso('ToolNode & Send 复盘', [
        { id: 'a', x: 200, y: 200, label: 'ToolNode', tone: 'orange', active: true },
        { id: 'b', x: 500, y: 200, label: 'Send Fan-out', tone: 'violet', active: true },
        { id: 'c', x: 800, y: 200, label: 'defer Reduce', tone: 'green' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH3 · 1/2 · BaseCheckpointSaver 快照落盘与 Thread 隔离
// ---------------------------------------------------------------------------
const L_LG_CHECKPOINT = lesson(
  'lg-checkpointer-state',
  'lg-ch03',
  3,
  'Checkpointer 持久化与人机协同',
  1,
  2,
  'Checkpointer 持久化：每步快照与 Thread 隔离',
  'Checkpointer 是 LangGraph 的超级引擎：每个 Superstep 结束自动拍下完整 State 快照落盘，让多轮记忆、崩溃恢复、人工审批和时间旅行一气呵成。',
  10,
  '核心',
  [
    { text: '掌握 thread_id、checkpoint_ns 与 checkpoint_id 三级定位坐标', completedAtStep: 2 },
    { text: '理解 BaseCheckpointSaver 抽象接口与 Memory / Sqlite / Postgres 实现切换', completedAtStep: 4 },
    { text: '了解 Checkpoint 元数据（source / step / parent_config）如何串成可回溯链条', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '无状态服务的痛点',
      badge: 'PROBLEM',
      title: 'Web 服务重启了、审批等了 3 小时，Agent 运行到一半的状态去哪了？',
      paragraphs: [
        '在 CLI 里进程可以一直挂着等用户；但在 Web 后端或分布式微服务里，HTTP 请求几秒就断开了，Pod 随时可能重启，人类审批可能发生在 6 小时之后的另一台机器上！',
        'LangGraph 用 **Checkpointer（`BaseCheckpointSaver`）** 彻底解决状态驻留问题：每跑完一个 Superstep，图状态和通道版本号立刻序列化写入数据库（PostgreSQL / SQLite / Redis），内存随时可销毁，随时可从任意节点无损复活！',
      ],
      kpis: [
        kpi('落盘粒度', '每个 Superstep 自动快照', 'good'),
        kpi('隔离键', 'configurable.thread_id', 'good'),
        kpi('后端实现', 'Memory / SQLite / Postgres', 'neutral'),
      ],
      scene: iso(
        'Checkpointer 驱动跨进程无状态复活',
        [
          { id: 'p1', x: 70, y: 110, label: 'Pod A (09:00)', sublabel: '跑到 Step 2 暂停 → 进程释放', tone: 'blue', size: 'lg', icon: 'cpu' },
          { id: 'db', x: 430, y: 215, label: 'PostgresSaver (Checkpointer)', sublabel: '保存 thread_id + checkpoint_id + channel_values', tone: 'violet', size: 'lg', active: true, icon: 'database' },
          { id: 'p2', x: 780, y: 315, label: 'Pod B (15:00)', sublabel: '按 thread_id 载入快照 → 从 Step 3 无缝续跑', tone: 'green', size: 'lg', active: true, icon: 'refresh-cw' },
        ],
        [
          { from: 'p1', to: 'db', label: 'aput(checkpoint)', status: 'active', packetCount: 2, packetLabel: 'Snapshot' },
          { from: 'db', to: 'p2', label: 'aget_tuple(thread_id)', status: 'active', packetCount: 2, packetLabel: 'Resume' },
        ],
      ),
    },
    {
      shortLabel: 'Checkpoint 数据结构',
      badge: 'TECHNIQUE',
      title: 'CheckpointTuple 里到底存了什么？',
      paragraphs: [
        '在 `libs/checkpoint/langgraph/checkpoint/base/__init__.py` 中，每次落盘的 `Checkpoint` 不仅存了所有 `channel_values`（完整业务 State），还存了 `channel_versions`（每条通道的版本号）和 `versions_seen`（每个节点上次看过的版本号），从而能精确还原「下一拍到底该唤醒谁」。',
      ],
      sourceDrawer: lgSrc(
        'Checkpoint 与 BaseCheckpointSaver 核心契约',
        'libs/checkpoint/langgraph/checkpoint/base/__init__.py',
        'py',
        `class Checkpoint(TypedDict):
    v: int                                    # 格式版本号
    id: str                                   # 单调递增 UUID6 checkpoint_id
    ts: str                                   # ISO 时间戳
    channel_values: dict[str, Any]            # 所有 Channel 的当前状态值
    channel_versions: dict[str, int | str]    # 各 Channel 最新版本
    versions_seen: dict[str, dict[str, Any]]  # 各节点已消费过的通道版本

class BaseCheckpointSaver:
    def get_tuple(self, config: RunnableConfig) -> CheckpointTuple | None: ...
    def put(self, config, checkpoint, metadata, new_versions) -> RunnableConfig: ...
    def put_writes(self, config, writes, task_id) -> None: ...`,
        '只需换一行 Checkpointer 实现（MemorySaver → PostgresSaver），图代码零改动即获生产持久化。',
      ),
      kpis: [
        kpi('唯一主键', '(thread_id, ns, checkpoint_id)', 'good'),
        kpi('父指针', 'parent_config 串起历史链', 'good'),
        kpi('任务容错', 'put_writes 单独持久化', 'good'),
      ],
      scene: tree(
        '一个 Thread 内的连续 Checkpoint 父子链',
        [
          { id: 'c0', x: 500, y: 55, kind: 'root', label: 'CP #0 (input)', sublabel: 'step: -1 · 接收用户提问', hexId: '1ef001', status: 'done' },
          { id: 'c1', x: 500, y: 185, kind: 'assistant', label: 'CP #1 (agent)', sublabel: 'step: 0 · 产生 tool_call', hexId: '1ef002', parentId: '1ef001', status: 'done' },
          { id: 'c2', x: 500, y: 315, kind: 'tool', label: 'CP #2 (tools)', sublabel: 'step: 1 · 工具结果写入', hexId: '1ef003', parentId: '1ef002', status: 'done' },
          { id: 'c3', x: 500, y: 445, kind: 'assistant', label: 'CP #3 (agent)', sublabel: 'step: 2 · 输出最终回答', hexId: '1ef004', parentId: '1ef003', status: 'active', badge: 'Latest' },
        ],
        [
          { from: 'c0', to: 'c1' },
          { from: 'c1', to: 'c2' },
          { from: 'c2', to: 'c3', animated: true },
        ],
      ),
    },
    {
      shortLabel: '三级定位坐标',
      badge: 'TECHNIQUE',
      title: 'thread_id + checkpoint_ns + checkpoint_id',
      paragraphs: [
        '调用图时传入 `config = {"configurable": {"thread_id": "conv-101"}}`：',
        '- **`thread_id`**：标识一次独立的会话/工单线程，不同用户的状态完全隔离；',
        '- **`checkpoint_ns`**：标识嵌套的子图命名空间（根图为空，子图带唯一路径前缀），让父图与子图共享同一个数据库却绝不串台；',
        '- **`checkpoint_id`**：精确指向该线程历史上的某一步快照（省略则默认取最新）。',
      ],
      kpis: [
        kpi('thread_id', '会话级隔离', 'good'),
        kpi('checkpoint_ns', '父子图命名空间隔离', 'good'),
        kpi('checkpoint_id', '任意历史步精准寻址', 'good'),
      ],
      scene: iso(
        'Checkpointer 三级寻址坐标',
        [
          { id: 't', x: 80, y: 210, label: 'thread_id: "order-88"', sublabel: '顶层会话隔离键', tone: 'blue', size: 'lg', icon: 'users' },
          { id: 'ns', x: 420, y: 210, label: 'checkpoint_ns: "sub:pay"', sublabel: '嵌套子图独立命名空间', tone: 'violet', size: 'lg', active: true, icon: 'git-branch' },
          { id: 'cid', x: 760, y: 210, label: 'checkpoint_id: "1ef003"', sublabel: '精确锁定第 N 个超步快照', tone: 'green', size: 'lg', icon: 'clock' },
        ],
        [
          { from: 't', to: 'ns', status: 'active', packetCount: 1 },
          { from: 'ns', to: 'cid', status: 'active', packetCount: 2, packetLabel: 'StateSnapshot' },
        ],
      ),
    },
    {
      shortLabel: '按环境热切换存储',
      badge: 'SOLUTION',
      title: '同一张图：本地单测用 InMemorySaver，上线一行换 PostgresSaver',
      paragraphs: [
        '因为 `CompiledStateGraph` 只依赖 `BaseCheckpointSaver` 抽象，开发期用 `InMemorySaver` 零配置跑通逻辑，本地 CLI 用 `SqliteSaver` 存单文件，生产高并发集群只需换成 `AsyncPostgresSaver`（带连接池与异步写入）——整张业务图代码一行不改！',
      ],
      kpis: [
        kpi('单测/原型', 'InMemorySaver', 'neutral'),
        kpi('本地单机', 'SqliteSaver', 'good'),
        kpi('生产集群', 'AsyncPostgresSaver', 'good'),
      ],
      scene: iso(
        'BaseCheckpointSaver 可插拔持久化后端',
        [
          { id: 'g', x: 100, y: 215, label: 'CompiledStateGraph', tone: 'violet', size: 'lg', active: true, icon: 'cpu' },
          { id: 's1', x: 540, y: 95, label: 'InMemorySaver', sublabel: '内存字典 · 毫秒级单测', tone: 'blue', icon: 'layers' },
          { id: 's2', x: 540, y: 215, label: 'SqliteSaver', sublabel: '本地单文件 · 桌面/CLI', tone: 'green', icon: 'hard-drive' },
          { id: 's3', x: 540, y: 335, label: 'AsyncPostgresSaver', sublabel: '分布式高可用生产集群', tone: 'orange', active: true, icon: 'database' },
        ],
        [
          { from: 'g', to: 's1', dashed: true, packetCount: 1 },
          { from: 'g', to: 's2', dashed: true, packetCount: 1 },
          { from: 'g', to: 's3', status: 'active', packetCount: 2, packetLabel: '生产落盘' },
        ],
      ),
    },
    {
      shortLabel: '状态实时透视',
      badge: 'INSIGHT',
      title: 'graph.get_state(config)：随时从外部观测图的当前快照与下一跳',
      paragraphs: [
        '在任何外部服务或管理后台，只需调用 `snapshot = graph.get_state(config)`，就能拿到 `snapshot.values`（当前全部 State）、`snapshot.next`（接下来将要执行的节点列表）和 `snapshot.tasks`（包含挂起中的中断详情与报错信息），可观测性拉满。',
      ],
      kpis: [
        kpi('当前值', 'snapshot.values', 'good'),
        kpi('待跑节点', 'snapshot.next', 'good'),
        kpi('挂起详情', 'snapshot.tasks / interrupts', 'good'),
      ],
      scene: iso(
        'StateSnapshot 外部实时透视视图',
        [
          { id: 'api', x: 90, y: 210, label: '管理台 / 前端 API', sublabel: 'graph.get_state(config)', tone: 'blue', size: 'lg', icon: 'eye' },
          { id: 'sn', x: 520, y: 210, label: 'StateSnapshot', sublabel: 'values + next[] + metadata + interrupts', tone: 'green', size: 'lg', active: true, icon: 'database' },
        ],
        [{ from: 'api', to: 'sn', status: 'active', packetCount: 2, packetLabel: '只读查询' }],
      ),
    },
    {
      shortLabel: '持久化复盘',
      badge: 'RECAP',
      title: 'Checkpointer 持久化复盘',
      paragraphs: [
        'Checkpointer 把「内存中的 Agent 运行状态」变成了「数据库里的版本化快照链」，为下一课的 `interrupt()` 人机审批和第 4 章的时间旅行打下地基。',
      ],
      recapTable: [
        { question: 'Checkpoint 除了存业务 State 还存了什么？', decision: 'channel_versions、versions_seen 与任务级 pending_writes', because: '这样才能精确还原下一步该唤醒哪些节点，并跳过已成功的并行分支。' },
        { question: '多用户与嵌套子图怎么保证状态互不串台？', decision: '靠 (thread_id, checkpoint_ns, checkpoint_id) 三级坐标', because: '会话级与子图命名空间级双重隔离。' },
        { question: '不配 Checkpointer 会失去哪些能力？', decision: '失去多轮记忆、interrupt() 暂停恢复、容错续跑与时间旅行', because: '这些高阶能力全都依赖快照持久化链。' },
      ],
      kpis: [
        kpi('核心基类', 'BaseCheckpointSaver', 'good'),
        kpi('三级坐标', 'thread / ns / cp_id', 'good'),
        kpi('零改切换', 'Memory → Postgres', 'good'),
      ],
      scene: iso('Checkpointer 复盘', [
        { id: 'a', x: 200, y: 200, label: 'Superstep', tone: 'violet' },
        { id: 'b', x: 500, y: 200, label: 'Checkpointer', tone: 'blue', active: true },
        { id: 'c', x: 800, y: 200, label: 'StateSnapshot', tone: 'green' },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH3 · 2/2 · interrupt() 冻结与 Command(resume=...) 恢复（★ 带互动实验台）
// ---------------------------------------------------------------------------
const L_LG_INTERRUPT = lesson(
  'lg-interrupt-command',
  'lg-ch03',
  3,
  'Checkpointer 持久化与人机协同',
  2,
  2,
  'interrupt() 与 Command(resume)：人机协同暂停与恢复',
  'LangGraph 最具魔力的原语：在任意节点代码中间调用一行 interrupt(payload)，整张图立刻冻结落盘；几小时后人类发回 Command(resume=...)，代码原位拿到审批结果继续往下跑！',
  14,
  '核心',
  [
    { text: '掌握 interrupt(payload) 内部通过 GraphInterrupt 异常冻结超步的机制', completedAtStep: 2 },
    { text: '理解恢复执行时节点会从头重放（幂等性要求），并在 interrupt() 处直接返回 resume 值', completedAtStep: 4 },
    { text: '学会结合 interrupt() 实现「批准 / 拒绝 / 修改工具参数」三种人机协同模式', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '阻塞等待的死穴',
      badge: 'PROBLEM',
      title: '不能在服务器节点里用 input() 干等人类 3 小时！',
      paragraphs: [
        '当 Agent 准备执行敏感转账或发邮件，需要人工审批时：在本地 CLI 可以卡住终端等键盘输入；但在生产服务器上，绝不能让一个协程/线程干等 3 小时不释放内存和连接。',
        'LangGraph 的 **`interrupt(value)`**（`libs/langgraph/langgraph/types.py`）用极其优雅的方式实现了「无线程占用的长周期人机协同（Human-in-the-Loop）」。',
      ],
      callout: {
        kind: 'idea',
        title: '冻结而不阻塞',
        text: '调用 `interrupt(payload)` 会把图状态完整存入 Checkpointer，立即结束本次 HTTP 调用返回 `__interrupt__` 载荷给前端；等人类 3 小时后提交审批，再以 `Command(resume=decision)` 唤醒！',
      },
      kpis: [
        kpi('暂停原语', 'interrupt(payload)', 'good'),
        kpi('恢复原语', 'Command(resume=val)', 'good'),
        kpi('等待内存占用', '0（彻底落盘释放）', 'good'),
      ],
      scene: iso(
        'interrupt() 冻结与 Command(resume) 跨时空恢复',
        [
          { id: 'n', x: 70, y: 210, label: 'review_node', sublabel: '执行到 decision = interrupt(payload)', tone: 'orange', size: 'lg', active: true, icon: 'pause' },
          { id: 'cp', x: 420, y: 105, label: 'Checkpointer 冻结落盘', sublabel: '保存现场 + 返回 __interrupt__ 给前端', tone: 'violet', size: 'lg', active: true, icon: 'database' },
          { id: 'hu', x: 420, y: 325, label: '人类审批（几秒或几天后）', sublabel: '点击 批准 / 修改参数 / 拒绝', tone: 'blue', size: 'lg', icon: 'users' },
          { id: 'res', x: 770, y: 210, label: 'Command(resume=decision)', sublabel: '节点恢复，interrupt() 返回 decision 继续跑！', tone: 'green', size: 'lg', active: true, icon: 'check-circle' },
        ],
        [
          { from: 'n', to: 'cp', label: '抛 GraphInterrupt', status: 'active', packetCount: 1 },
          { from: 'cp', to: 'hu', label: '推送审批卡片', dashed: true, packetCount: 1 },
          { from: 'hu', to: 'res', status: 'active', packetCount: 2, packetLabel: 'resume' },
        ],
      ),
    },
    {
      shortLabel: 'interrupt() 源码写法',
      badge: 'TECHNIQUE',
      title: '一行 interrupt() 写出像同步代码一样自然的人工审批',
      paragraphs: [
        '看这段真实 LangGraph 节点代码：你甚至不需要把一个节点手动拆成「审批前节点」和「审批后节点」——就在逻辑需要人类拍板的那一行写 `decision = interrupt({...})` 即可！',
      ],
      sourceDrawer: lgSrc(
        '在节点中使用 interrupt() 审批或改写工具参数',
        'libs/langgraph/langgraph/types.py',
        'py',
        `from langgraph.types import interrupt, Command

def human_approval_node(state: AgentState):
    pending_call = state["messages"][-1].tool_calls[0]
    # 首次执行到此立即冻结并落盘；恢复执行时此行直接返回人类传入的 resume 值！
    decision = interrupt({
        "action": pending_call["name"],
        "args": pending_call["args"],
        "question": "是否允许执行该敏感操作？",
    })

    if decision["type"] == "approve":
        return Command(goto="tools")
    elif decision["type"] == "edit":
        return Command(update={"edited_args": decision["args"]}, goto="tools")
    else:
        return Command(update={"feedback": decision["reason"]}, goto="agent")`,
        '单靠 interrupt() + Command 就同时支持批准、原地修改参数和带理由打回三种人机协同。',
      ),
      kpis: [
        kpi('三种人机动作', '批准 / 改参 / 拒绝打回', 'good'),
        kpi('强制前提', '必须配置 Checkpointer', 'warn'),
        kpi('支持位置', '任意节点甚至嵌套子图内', 'good'),
      ],
      scene: swim(
        'interrupt() 冻结与 Command(resume) 恢复的完整时序',
        [
          { id: 'api', label: '客户端 / 前端', tone: 'blue' },
          { id: 'pr', label: 'Pregel Loop', tone: 'violet' },
          { id: 'nd', label: 'approval 节点', tone: 'orange' },
          { id: 'cp', label: 'Checkpointer', tone: 'green' },
        ],
        [
          { id: 'a1', laneId: 'api', start: 4, end: 16, label: 'invoke(input, tid)', tone: 'blue', status: 'done' },
          { id: 'a2', laneId: 'nd', start: 18, end: 36, label: '命中 interrupt() 抛内部信号', tone: 'orange', status: 'blocked' },
          { id: 'a3', laneId: 'cp', start: 38, end: 52, label: '落盘快照并返回 __interrupt__', tone: 'green', status: 'done' },
          { id: 'a4', laneId: 'api', start: 54, end: 72, label: '人类审核 → invoke(Command(resume))', tone: 'blue', status: 'done' },
          { id: 'a5', laneId: 'pr', start: 74, end: 84, label: '加载快照 + 注入 resume 值', tone: 'violet', status: 'done' },
          { id: 'a6', laneId: 'nd', start: 84, end: 97, label: '重放节点 → interrupt() 返回值 → 放行！', tone: 'green', status: 'running' },
        ],
      ),
    },
    {
      shortLabel: '重放语义与幂等红线',
      badge: 'INSIGHT',
      title: '核心原理警告：恢复时节点是从头重跑的，别把副作用写在 interrupt() 前面！',
      paragraphs: [
        'Python 无法把任意栈帧序列化到数据库，所以 `interrupt()` 的底层机制是 **Replay（确定性重放）**：',
        '首次跑到 `interrupt()` 时抛出内部 `GraphInterrupt` 信号中止当前节点；恢复时 Pregel **从该节点的第一行重新开始执行**，当再次走到第 1 个 `interrupt()` 时，直接从已保存的 `resume` 列表中按序弹出人类返回值，不再暂停！',
        '因此绝对铁律是：**不要把发邮件、扣款、写库等非幂等副作用放在 `interrupt()` 之前**（应该放在它之后，或者拆进前置独立节点）。你可以在顶部切到**「实验台」**亲手操作整个超步暂停、恢复与分叉！',
      ],
      callout: {
        kind: 'warn',
        title: '幂等性黄金红线',
        text: '同一个节点内的多个 `interrupt()` 按调用顺序匹配 resume 值，切勿用 `if random()` 改变 `interrupt()` 的调用顺序，也切勿把不可重放副作用放在 `interrupt()` 之前！',
      },
      kpis: [
        kpi('底层原理', '节点级确定性 Replay', 'warn'),
        kpi('副作用位置', '放在 interrupt() 之后', 'good'),
        kpi('互动体验', '顶部可切换实验台', 'good'),
      ],
      scene: iso(
        '节点恢复时的确定性重放（Replay）规则',
        [
          { id: 'top', x: 80, y: 210, label: '节点头部（只读/纯计算）', sublabel: '恢复时会重跑一遍 → 必须幂等', tone: 'blue', size: 'lg', icon: 'refresh-cw' },
          { id: 'int', x: 430, y: 210, label: 'decision = interrupt(...)', sublabel: '首次：抛信号冻结 | 恢复：直接返回 resume 值', tone: 'orange', size: 'lg', active: true, icon: 'pause' },
          { id: 'eff', x: 770, y: 210, label: '节点后部（真实副作用）', sublabel: '仅在人类批准恢复后执行一次！', tone: 'green', size: 'lg', active: true, icon: 'check-circle' },
        ],
        [
          { from: 'top', to: 'int', status: 'active', packetCount: 1 },
          { from: 'int', to: 'eff', label: '批准后才到达', status: 'active', packetCount: 2, packetLabel: 'Execute Once' },
        ],
      ),
    },
    {
      shortLabel: '动态中断 vs 静态断点',
      badge: 'TECHNIQUE',
      title: 'interrupt() 动态中断 vs interrupt_before 静态断点',
      paragraphs: [
        '除了节点内灵活按条件触发的 `interrupt()`（例如「仅当转账金额 > ¥5000 时才中断」），`compile(interrupt_before=["tools"])` 还支持静态断点——每次进入 `tools` 节点前无条件暂停，非常适合开发调试和全量工具人工把关。',
      ],
      kpis: [
        kpi('动态中断', '节点内条件调用 interrupt()', 'good'),
        kpi('静态断点', 'interrupt_before / after', 'neutral'),
        kpi('推荐方式', '生产优先用动态 interrupt()', 'good'),
      ],
      scene: iso(
        '静态断点 vs 动态条件中断',
        [
          { id: 'st', x: 110, y: 120, label: '静态断点 (interrupt_before)', sublabel: '无条件在节点前停下 · 适合调试与全量审核', tone: 'blue', size: 'lg', icon: 'shield' },
          { id: 'dy', x: 110, y: 315, label: '动态中断 (interrupt())', sublabel: '按金额/风险条件触发 · 支持传自定义载荷与直接收返回值', tone: 'green', size: 'lg', active: true, icon: 'pause' },
          { id: 'cp', x: 560, y: 215, label: '统一由 Checkpointer 持久化', tone: 'violet', size: 'lg', icon: 'database' },
        ],
        [
          { from: 'st', to: 'cp', packetCount: 1 },
          { from: 'dy', to: 'cp', status: 'active', packetCount: 2 },
        ],
      ),
    },
    {
      shortLabel: '并行多中断匹配',
      badge: 'INSIGHT',
      title: '多个并行节点同时触发 interrupt() 时如何精准回复？',
      paragraphs: [
        '在 Map-Reduce 并行超步里，如果 3 个并行分支同时调用了 `interrupt()`，每个中断都会分配唯一 `interrupt_id`。前端可以一次性通过 `Command(resume={id1: "approve", id2: "reject", id3: "approve"})` 批量把每个中断的决策精准路由回对应分支！',
      ],
      kpis: [
        kpi('并行中断', '每个中断带唯一 interrupt_id', 'good'),
        kpi('批量恢复', 'Command(resume={id: val})', 'good'),
        kpi('嵌套子图', '自动冒泡到顶层返回', 'good'),
      ],
      scene: iso(
        '多并行节点同时触发中断并按 ID 批量恢复',
        [
          { id: 'i1', x: 80, y: 110, label: '分支 A interrupt (id_1)', tone: 'orange', icon: 'pause' },
          { id: 'i2', x: 80, y: 315, label: '分支 B interrupt (id_2)', tone: 'orange', icon: 'pause' },
          { id: 'cmd', x: 460, y: 210, label: 'Command(resume={id_1: ok, id_2: deny})', sublabel: '按 interrupt_id 精确分发给各自节点', tone: 'green', size: 'lg', active: true, icon: 'check-circle' },
        ],
        [
          { from: 'i1', to: 'cmd', packetCount: 1 },
          { from: 'i2', to: 'cmd', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: 'HITL 复盘',
      badge: 'RECAP',
      title: 'interrupt() 人机协同复盘',
      paragraphs: [
        '把长周期人工审批抽象成「冻结快照 + `Command(resume)` 确定性重放」，是 LangGraph 在企业级生产工作流中脱颖而出的杀手级特性。',
      ],
      recapTable: [
        { question: 'interrupt() 暂停期间会一直占着服务器内存吗？', decision: '不会，状态落盘 Checkpointer 后立刻释放内存与连接', because: '几天后甚至另一台机器都能按 thread_id 无缝唤醒。' },
        { question: '为什么不能把扣款/发邮件写在 interrupt() 之前？', decision: '恢复时节点会从第一行确定性重放（Replay）', because: '前置副作用会被重复执行；应放在 interrupt() 之后或独立前置节点。' },
        { question: '人类审批除了批准/拒绝还能做什么？', decision: '可以通过 resume 传回修改后的工具参数或补充反馈', because: '把人工纠偏平滑融入下一跳状态更新。' },
      ],
      kpis: [
        kpi('零占用等待', '快照落盘释放进程', 'good'),
        kpi('恢复原理', '节点级确定性 Replay', 'good'),
        kpi('互动体验', '可切顶部实验台体验', 'good'),
      ],
      scene: iso('interrupt() 复盘', [
        { id: 'a', x: 200, y: 200, label: 'interrupt()', tone: 'orange', active: true },
        { id: 'b', x: 500, y: 200, label: 'Checkpointer', tone: 'violet' },
        { id: 'c', x: 800, y: 200, label: 'Command(resume)', tone: 'green', active: true },
      ], [
        { from: 'a', to: 'b', packetCount: 1 },
        { from: 'b', to: 'c', packetCount: 1 },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH4 · 1/2 · 时间旅行（get_state_history & Fork）
// ---------------------------------------------------------------------------
const L_LG_TIMETRAVEL = lesson(
  'lg-time-travel',
  'lg-ch04',
  4,
  '时间旅行与子图组合',
  1,
  2,
  '时间旅行：历史回放、状态篡改与分支重跑',
  '因为每一步 Superstep 都有不可变 Checkpoint，你可以像用 Git 一样查看完整历史、跳回第 3 步修改状态，并分叉出一条全新的平行时间线重跑！',
  9,
  '进阶',
  [
    { text: '掌握 get_state_history() 遍历线程完整 Checkpoint 历史链', completedAtStep: 2 },
    { text: '理解「直接从历史 checkpoint_id 重放（Replay）」与「update_state 产生分叉（Fork）」的区别', completedAtStep: 4 },
    { text: '了解时间旅行在生产故障复现、A/B 评测和人机纠偏中的工程价值', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '线上踩坑难复现',
      badge: 'PROBLEM',
      title: 'Agent 跑到第 8 步答偏了——想从第 4 步改个参数重跑，不必从头再来！',
      paragraphs: [
        '复杂 Agent 往往跑了 15 步，花了 2 分钟才走到关键决策点，结果在第 5 步选错了工具参数导致后面 10 步全偏。普通循环只能全部推倒从第 1 步重新跑。',
        '在 LangGraph 里，因为每个 Superstep 的 Checkpoint 都是**不可变历史快照**，你可以直接调 `get_state_history(config)` 浏览每一步状态，精准锚定到第 4 步的 `checkpoint_id`，原地分叉（Fork）重跑！',
      ],
      kpis: [
        kpi('历史查询', 'get_state_history()', 'good'),
        kpi('原位重放', '传历史 checkpoint_id', 'good'),
        kpi('改态分叉', 'update_state() → 新分支', 'good'),
      ],
      scene: tree(
        'Checkpointer 不可变快照树：Replay 与 Fork 时间线',
        [
          { id: 'c0', x: 500, y: 55, kind: 'root', label: 'CP #0 (用户提问)', hexId: 'cp0001', status: 'done' },
          { id: 'c1', x: 500, y: 175, kind: 'assistant', label: 'CP #1 (生成查询计划)', hexId: 'cp0002', parentId: 'cp0001', status: 'done' },
          { id: 'old1', x: 230, y: 315, kind: 'tool', label: '旧时间线 CP #2 (查错表)', hexId: 'cp0003', parentId: 'cp0002', status: 'dimmed' },
          { id: 'old2', x: 230, y: 445, kind: 'assistant', label: '旧结果（保留审计）', hexId: 'cp0004', parentId: 'cp0003', status: 'dimmed' },
          { id: 'f1', x: 750, y: 315, kind: 'event', label: 'Fork CP #2\' (update_state 改参)', hexId: 'cp0005', parentId: 'cp0002', status: 'active', badge: 'Fork' },
          { id: 'f2', x: 750, y: 445, kind: 'assistant', label: '新时间线 CP #3\' (正确结果)', hexId: 'cp0006', parentId: 'cp0005', status: 'highlight' },
        ],
        [
          { from: 'c0', to: 'c1' },
          { from: 'c1', to: 'old1' },
          { from: 'old1', to: 'old2' },
          { from: 'c1', to: 'f1', label: 'update_state()', animated: true },
          { from: 'f1', to: 'f2', label: 'invoke(None)', animated: true },
        ],
      ),
    },
    {
      shortLabel: '时间旅行三步代码',
      badge: 'TECHNIQUE',
      title: 'get_state_history → update_state → invoke(None)',
      paragraphs: [
        '时间旅行分叉只需三行代码：1. 找出目标历史步的 `state.config`（包含 `checkpoint_id`）；2. 调用 `new_config = graph.update_state(target_config, values=..., as_node=...)` 写入一个新分叉 Checkpoint（绝不破坏旧历史）；3. 传入 `None` 作为输入沿 `new_config` 接着往下跑！',
      ],
      sourceDrawer: lgSrc(
        '时间旅行：回溯历史 Checkpoint 并分叉重跑',
        'libs/langgraph/langgraph/pregel/main.py',
        'py',
        `# 1. 遍历该 thread 的全部历史快照（按时间倒序）
history = list(graph.get_state_history({"configurable": {"thread_id": "t-1"}}))
target_cp = history[2]  # 定位到出偏差前的一步

# 2. 在该历史快照上修改状态，铸造新分支 Checkpoint（原历史 100% 保留）
fork_config = graph.update_state(
    target_cp.config,
    values={"query": "更精确的 SQL 查询条件"},
    as_node="planner",
)

# 3. 传 None 从分叉点继续向后执行！
result = graph.invoke(None, config=fork_config)`,
        'as_node 告诉 Pregel 假装这次更新是由哪个节点产出的，从而精确决定接下来的出边路由。',
      ),
      kpis: [
        kpi('旧历史保护', '不可变，永不覆盖', 'good'),
        kpi('控制下游边', 'as_node 参数指定', 'good'),
        kpi('续跑输入', 'invoke(None, fork_config)', 'neutral'),
      ],
      scene: iso(
        '时间旅行三步操作流',
        [
          { id: 's1', x: 80, y: 210, label: '1 · get_state_history', sublabel: '选中历史 CP #1', tone: 'blue', size: 'lg', icon: 'clock' },
          { id: 's2', x: 420, y: 210, label: '2 · update_state(as_node)', sublabel: '生成新分叉 CP #2\'', tone: 'violet', size: 'lg', active: true, icon: 'git-branch' },
          { id: 's3', x: 760, y: 210, label: '3 · invoke(None, fork_cfg)', sublabel: '从分叉点继续推进', tone: 'green', size: 'lg', active: true, icon: 'refresh-cw' },
        ],
        [
          { from: 's1', to: 's2', status: 'active', packetCount: 1 },
          { from: 's2', to: 's3', status: 'active', packetCount: 2, packetLabel: 'Fork Run' },
        ],
      ),
    },
    {
      shortLabel: 'Replay 零重算前置',
      badge: 'SOLUTION',
      title: '直接 Replay：跳过前面 5 步昂贵调用，只重跑第 6 步',
      paragraphs: [
        '如果你不想改状态，只是修改了第 6 个节点的 Prompt 或修复了工具 Bug 想重测：直接把第 5 步结束时的 `checkpoint_id` 传给 `graph.invoke(None, config)`，Pregel 会跳过前面 5 步的 LLM 调用，直接从第 6 步开跑，开发调试速度提升 5 倍！',
      ],
      kpis: [
        kpi('前置 LLM 费用', '0（直接复用快照）', 'good'),
        kpi('调试提速', '直达故障节点', 'good'),
        kpi('评测价值', '固定前置状态对比新旧模型', 'good'),
      ],
      scene: swim(
        '从第 5 步直接 Replay 对比新旧 Prompt',
        [
          { id: 'pre', label: '步骤 1..5 (已落盘)', tone: 'blue' },
          { id: 'r1', label: '原执行 (Prompt v1)', tone: 'orange' },
          { id: 'r2', label: 'Replay (Prompt v2)', tone: 'green' },
        ],
        [
          { id: 'a1', laneId: 'pre', start: 4, end: 48, label: '复用 CP #5（零重复开销）', tone: 'blue', status: 'done' },
          { id: 'a2', laneId: 'r1', start: 50, end: 88, label: 'v1 结果（历史归档）', tone: 'orange', status: 'done' },
          { id: 'a3', laneId: 'r2', start: 50, end: 94, label: '从 CP #5 直接重跑 v2 对比效果！', tone: 'green', status: 'running' },
        ],
      ),
    },
    {
      shortLabel: 'as_node 路由控制',
      badge: 'INSIGHT',
      title: 'as_node 的精妙作用：决定图醒来后往哪条边走',
      paragraphs: [
        '调用 `update_state` 修改状态时，默认把它视作来自输入通道；但传入 `as_node="agent"` 时，Pregel 会连同 `agent` 节点的隐式出边信号一起写入新快照，确保恢复运行后严格按 `agent` 的下游边继续流转（而不是重新跑一遍 `agent`）。',
      ],
      kpis: [
        kpi('as_node 省略', '可能重跑当前节点', 'neutral'),
        kpi('as_node 指定', '按该节点出边直奔下游', 'good'),
        kpi('可控性', '100% 精确跳转', 'good'),
      ],
      scene: iso(
        'as_node 精确控制分叉后的下一跳',
        [
          { id: 'up', x: 80, y: 210, label: 'update_state(..., as_node="agent")', tone: 'violet', size: 'lg', active: true, icon: 'git-branch' },
          { id: 'ed', x: 460, y: 210, label: '模拟 agent 出边信号', sublabel: '跳过重跑 agent，直接评估条件边', tone: 'blue', size: 'lg', icon: 'layers' },
          { id: 'nx', x: 800, y: 210, label: '直达 tools / END', tone: 'green', icon: 'check-circle' },
        ],
        [
          { from: 'up', to: 'ed', status: 'active', packetCount: 1 },
          { from: 'ed', to: 'nx', status: 'active', packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '可观测与 LangSmith 联动',
      badge: 'INSIGHT',
      title: 'LangGraph Studio + Checkpointer：可视化时间旅行调试台',
      paragraphs: [
        '把这套不可变 Checkpoint 树接入图形界面（如 LangGraph Studio），工程师可以直接在可视化图上点击任意历史超步、检查当时的全部 `messages` 与变量、修改某个字段后点 Fork 重跑——把黑盒 Agent 变成透明可调试的白盒状态机。',
      ],
      kpis: [
        kpi('调试形态', '白盒状态机可视化', 'good'),
        kpi('线上回溯', '按 thread_id 拉取生产现场', 'good'),
        kpi('审计合规', '完整操作留痕', 'good'),
      ],
      scene: iso(
        '白盒状态机全链路可观测',
        [
          { id: 'pr', x: 100, y: 210, label: '生产故障 Thread', tone: 'orange', size: 'lg', icon: 'alert-triangle' },
          { id: 'cp', x: 430, y: 210, label: '导出 Checkpoint 快照链', tone: 'blue', size: 'lg', active: true, icon: 'database' },
          { id: 'st', x: 770, y: 210, label: '本地 Studio 复现 & Fork 修复', tone: 'green', size: 'lg', icon: 'check-circle' },
        ],
        [
          { from: 'pr', to: 'cp', packetCount: 1 },
          { from: 'cp', to: 'st', status: 'active', packetCount: 2 },
        ],
      ),
    },
    {
      shortLabel: '时间旅行复盘',
      badge: 'RECAP',
      title: '时间旅行与分叉重跑复盘',
      paragraphs: [
        '不可变快照链把「对话与执行历史」变成了类似 Git Commit DAG 的结构，赋予 Agent 前所未有的可调试性与可评测性。',
      ],
      recapTable: [
        { question: 'Replay 和 Fork 的本质区别是什么？', decision: 'Replay 直接重跑历史步，Fork 先 update_state 产生新分叉再继续跑', because: '前者适合改代码/Prompt 后重测，后者适合人工修正中间状态继续推进。' },
        { question: 'Fork 会覆盖掉原来的历史记录吗？', decision: '绝不会，所有 Checkpoint 均为不可变记录', because: '每条时间线都完整留痕，方便审计与 A/B 效果对比。' },
        { question: '为什么要给 update_state 传 as_node？', decision: '精确告诉 Pregel 模拟哪个节点刚跑完，从而正确触发后续边', because: '避免恢复时误把前置节点再跑一遍。' },
      ],
      kpis: [
        kpi('核心 API', 'get_state_history + update_state', 'good'),
        kpi('历史不变性', '100% 不可变', 'good'),
        kpi('调试效率', '直达任意步', 'good'),
      ],
      scene: tree('时间旅行复盘', [
        { id: 'a', x: 500, y: 100, kind: 'root', label: 'CP #1' },
        { id: 'b', x: 300, y: 320, kind: 'log', label: 'Old Path', parentId: 'a' },
        { id: 'c', x: 700, y: 320, kind: 'assistant', label: 'Forked Path', parentId: 'a', status: 'active' },
      ], [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'c', animated: true },
      ]),
    },
  ]),
);

// ---------------------------------------------------------------------------
// CH4 · 2/2 · Subgraph 多 Agent 嵌套与 Store 跨线程长记忆
// ---------------------------------------------------------------------------
const L_LG_SUBGRAPH = lesson(
  'lg-subgraphs-store',
  'lg-ch04',
  4,
  '时间旅行与子图组合',
  2,
  2,
  'Subgraph 多 Agent 组合与 Store 跨线程长记忆',
  '当系统演化为多专家团队协同与跨会话用户记忆，LangGraph 用「Subgraph 编译组合」和「BaseStore 跨线程记忆库」完成最后一块拼图。',
  10,
  '进阶',
  [
    { text: '掌握将子 Agent 编译为 Subgraph 节点嵌入父 StateGraph 的两种模式（共享/独立 Schema）', completedAtStep: 2 },
    { text: '理解子图 Checkpointer 自动继承与 Command(graph=Command.PARENT) 跨图移交', completedAtStep: 4 },
    { text: '区分 Thread 级短期记忆（Checkpointer）与跨 Thread 长期记忆（BaseStore）', completedAtStep: 6 },
  ],
  steps([
    {
      shortLabel: '大图的模块化拆解',
      badge: 'PROBLEM',
      title: '30 个节点全画在一张巨型 StateGraph 里，团队根本没法协作维护',
      paragraphs: [
        '随着业务变复杂（例如「调研团队 + 编码团队 + 审校团队」），把所有节点和私有字段堆在一张平面图里会造成严重的命名冲突与状态污染。',
        'LangGraph 的解决方案极其纯粹：**因为每一个 `CompiledStateGraph` 本身都符合节点接口，你可以直接把它作为一个普通 Node 嵌入父图！**',
      ],
      kpis: [
        kpi('组合方式', '子图直接作为父图 Node', 'good'),
        kpi('状态模式', '共享 Key 或私有 Schema 包装', 'good'),
        kpi('持久化继承', '父图 Checkpointer 自动透传子图', 'good'),
      ],
      scene: iso(
        '父 StateGraph 嵌套多专家 Subgraph',
        [
          { id: 'sup', x: 80, y: 215, label: 'Supervisor 父图', sublabel: '全局任务拆解与路由调度', tone: 'violet', size: 'lg', active: true, icon: 'users' },
          { id: 'sg1', x: 470, y: 105, label: 'Research Subgraph', sublabel: '独立私有状态：搜索 → 摘要 → 验证', tone: 'blue', size: 'lg', active: true, icon: 'git-branch' },
          { id: 'sg2', x: 470, y: 325, label: 'Coding Subgraph', sublabel: '独立私有状态：改码 → 单测 → 修复', tone: 'green', size: 'lg', active: true, icon: 'wrench' },
          { id: 'st', x: 810, y: 215, label: 'BaseStore 共享长记忆', sublabel: '跨 Thread 语义/键值记忆', tone: 'orange', icon: 'database' },
        ],
        [
          { from: 'sup', to: 'sg1', label: '委托调研', status: 'active', packetCount: 1 },
          { from: 'sup', to: 'sg2', label: '委托编码', status: 'active', packetCount: 1 },
          { from: 'sg1', to: 'st', dashed: true, packetCount: 1 },
          { from: 'sg2', to: 'st', dashed: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '两种嵌入模式',
      badge: 'TECHNIQUE',
      title: '共享状态直嵌 vs 独立私有 Schema 适配包装',
      paragraphs: [
        '1. **共享键直嵌**：若父子图共享 `messages` 等字段，直接 `parent.add_node("research", research_subgraph)`，自动透传共享键与流式事件；',
        '2. **完全独立 Schema**：用几行包装函数把父状态映射为子图入参、调用 `subgraph.invoke()`，再把精炼结果写回父状态——彻底隔离各自内部草稿！',
      ],
      sourceDrawer: lgSrc(
        'Subgraph 嵌入 + BaseStore 跨线程长期记忆用法',
        'libs/langgraph/langgraph/graph/state.py',
        'py',
        `from langgraph.store.memory import InMemoryStore
from langgraph.runtime import Runtime

# 1. 把独立编译的子 Agent 直接注册为父图节点
parent = StateGraph(ParentState)
parent.add_node("researcher", research_graph)   # 自动继承父图 Checkpointer！
parent.add_node("coder", coding_graph)

# 2. 编译父图时同时挂接 Checkpointer（会话内）与 Store（跨会话）
store = InMemoryStore()
app = parent.compile(checkpointer=checkpointer, store=store)

# 3. 任意节点内通过 runtime.store 读写跨线程用户偏好与知识
def coder_node(state: ParentState, *, runtime: Runtime):
    prefs = runtime.store.search(("user", state["user_id"], "prefs"))
    ...`,
        'Checkpointer 负责单线程状态推进与断点恢复，Store 负责跨线程长期记忆共享。',
      ),
      kpis: [
        kpi('子图中断', '子图内 interrupt() 自动冒泡到父图', 'good'),
        kpi('子图流式', 'stream(subgraphs=True) 全程可见', 'good'),
        kpi('跨图跳转', 'Command(graph=Command.PARENT)', 'good'),
      ],
      scene: iso(
        '子图内 interrupt() 向上冒泡与 Command.PARENT 跨图移交',
        [
          { id: 'c', x: 90, y: 210, label: 'Subgraph 内部节点', sublabel: '触发 interrupt() 或 Command.PARENT', tone: 'blue', size: 'lg', active: true, icon: 'git-branch' },
          { id: 'ns', x: 430, y: 210, label: '独立 checkpoint_ns', sublabel: '共享父图 Checkpointer 却隔离命名空间', tone: 'violet', size: 'lg', icon: 'database' },
          { id: 'p', x: 770, y: 210, label: '父图接收并统一向客户端返回', tone: 'green', size: 'lg', active: true, icon: 'layers' },
        ],
        [
          { from: 'c', to: 'ns', status: 'active', packetCount: 1 },
          { from: 'ns', to: 'p', label: '自动冒泡', status: 'active', packetCount: 2, packetLabel: 'Bubble Up' },
        ],
      ),
    },
    {
      shortLabel: 'Checkpointer vs Store',
      badge: 'SOLUTION',
      title: '双记忆分层：Checkpointer（短期线程态）vs BaseStore（跨线程长记忆）',
      paragraphs: [
        '初学者常把两种记忆混为一谈：',
        '- **Checkpointer** 按 `thread_id` 强隔离，记录「这一次会话进行到哪一步了」，适合对话历史、工具结果、审批断点；',
        '- **BaseStore** 按分层命名空间（如 `("org", "user_42", "preferences")`）组织，支持键值读写与向量语义搜索，让用户在**新开的 Thread #2** 里依然保留 Thread #1 沉淀的个人偏好与领域事实！',
      ],
      kpis: [
        kpi('Checkpointer', '单 Thread 短期执行状态', 'good'),
        kpi('BaseStore', '跨 Thread 长期语义/KV 记忆', 'good'),
        kpi('命名空间', '元组路径 (tenant, user, topic)', 'good'),
      ],
      scene: iso(
        'Checkpointer（纵向线程）× BaseStore（横向跨线程）',
        [
          { id: 't1', x: 90, y: 110, label: 'Thread #1 (周一会话)', sublabel: 'Checkpointer 独立保存对话态', tone: 'blue', size: 'lg', icon: 'clock' },
          { id: 't2', x: 90, y: 315, label: 'Thread #2 (周三新会话)', sublabel: '全新对话，但仍需记住用户偏好', tone: 'green', size: 'lg', active: true, icon: 'clock' },
          { id: 'st', x: 540, y: 210, label: 'BaseStore (跨线程长记忆库)', sublabel: 'namespace: ("user", "u_42", "prefs") · KV + 向量检索', tone: 'violet', size: 'lg', active: true, icon: 'database' },
        ],
        [
          { from: 't1', to: 'st', label: 'put(偏好事实)', status: 'active', packetCount: 1 },
          { from: 'st', to: 't2', label: 'search(语义召回)', status: 'active', packetCount: 2, packetLabel: 'Long-term' },
        ],
      ),
    },
    {
      shortLabel: '五大 Harness 横向定位',
      badge: 'INSIGHT',
      title: '站在全局看 5 大 Harness：何时该选 LangGraph？',
      paragraphs: [
        '学完 5 个 Harness，它们的基因差异已一目了然：',
        '- **DeepSeek Harness**：Cordis 无特权插件主板 + `dsh-scope` 作用域，强在多产品零分叉装配与插件化治理；',
        '- **Pi Agent**：4 原语极简内核 + Steering/Follow-up 双队列，强在丝滑个人终端交互与 TS 轻扩展；',
        '- **Codex**：Rust 双队列 + 正交安全策略 + 原生 OS 沙箱，强在本地高自治安全围栏；',
        '- **Claude Code**：单主循环 + 确定性 Hooks + 分层 `CLAUDE.md` + Subagent/Worktree，强在零改内核的工程化团队治理；',
        '- **LangGraph**：显式 StateGraph + Pregel 耐久超步 + Checkpointer/interrupt/Time-Travel，强在**服务端长周期有状态业务工作流与多 Agent 精准编排**！',
      ],
      kpis: [
        kpi('LangGraph 主场', '服务端耐久工作流与多 Agent 编排', 'good'),
        kpi('核心杀手锏', 'Pregel + interrupt() + Time Travel', 'good'),
        kpi('生态融合', 'LangChain v1 默认底层引擎', 'good'),
      ],
      scene: iso(
        '五大 Agent Harness 架构定位图谱',
        [
          { id: 'dsh', x: 70, y: 95, label: 'DeepSeek Harness', sublabel: 'Cordis 插件主板 · dsh-scope', tone: 'blue', icon: 'layers' },
          { id: 'pi', x: 390, y: 95, label: 'Pi Agent', sublabel: '双队列 Steering · 极简 4 工具', tone: 'green', icon: 'refresh-cw' },
          { id: 'cdx', x: 710, y: 95, label: 'Codex', sublabel: 'Rust SQ/EQ · OS 内核沙箱', tone: 'violet', icon: 'lock' },
          { id: 'cc', x: 220, y: 315, label: 'Claude Code', sublabel: '单主循环 · Hooks · Subagent', tone: 'orange', icon: 'shield' },
          { id: 'lg', x: 560, y: 315, label: 'LangGraph', sublabel: 'StateGraph · Pregel · Checkpointer', tone: 'green', active: true, icon: 'git-branch' },
        ],
        [
          { from: 'dsh', to: 'cc', dashed: true, packetCount: 1 },
          { from: 'pi', to: 'cdx', dashed: true, packetCount: 1 },
          { from: 'cc', to: 'lg', status: 'active', dotted: true, packetCount: 1 },
        ],
      ),
    },
    {
      shortLabel: '生产部署形态',
      badge: 'TECHNIQUE',
      title: 'LangGraph Server：开箱即用的持久化线程 API 与后台 Cron',
      paragraphs: [
        '编译好的 `CompiledStateGraph` 可直接托管在 LangGraph Server / Agent Server 中，自动获得持久化 Threads API、断线重连 SSE 流、双发请求防撞策略（`multitask_strategy`: `reject` / `enqueue` / `interrupt` / `rollback`）与定时后台任务。',
      ],
      kpis: [
        kpi('并发冲突策略', 'reject/enqueue/interrupt/rollback', 'good'),
        kpi('断线重连', 'SSE 流按事件 ID 续传', 'good'),
        kpi('生态支持', 'Python & TypeScript 双 SDK', 'good'),
      ],
      scene: iso(
        'LangGraph Server 生产运行时能力',
        [
          { id: 'cli', x: 80, y: 210, label: 'Web / App 客户端', tone: 'blue', size: 'lg', icon: 'globe' },
          { id: 'srv', x: 430, y: 210, label: 'LangGraph Agent Server', sublabel: 'Threads API · Multitask 策略 · SSE 续传', tone: 'violet', size: 'lg', active: true, icon: 'cpu' },
          { id: 'db', x: 780, y: 210, label: 'Postgres Checkpointer + Store', tone: 'green', size: 'lg', icon: 'database' },
        ],
        [
          { from: 'cli', to: 'srv', status: 'active', packetCount: 2, packetLabel: 'Stream' },
          { from: 'srv', to: 'db', status: 'active', packetCount: 2 },
        ],
      ),
    },
    {
      shortLabel: 'LangGraph 复盘',
      badge: 'RECAP',
      title: 'LangChain / LangGraph 全景复盘',
      paragraphs: [
        'StateGraph + Channels + Pregel BSP 超步 + Checkpointer + `interrupt()` + Time Travel + Subgraph/Store——你已经彻底打通了图式 Agent Harness 的完整源码心智模型！',
      ],
      recapTable: [
        { question: '多专家团队如何模块化拆分并协同？', decision: '每个专家编译为独立 Subgraph 嵌入父图，用 Command.PARENT 移交', because: '既隔离内部私有状态，又共享同一持久化 Checkpointer 与流式观测。' },
        { question: 'Checkpointer 和 Store 分别管什么记忆？', decision: 'Checkpointer 管单 Thread 会话执行态，Store 管跨 Thread 长期记忆', because: '把短期流程恢复与长期用户知识清晰解耦。' },
        { question: '构建服务端长周期、强审批 Agent 为什么首选 LangGraph？', decision: '天然内置耐久超步、落盘暂停恢复、时间旅行与并发冲突治理', because: '省去手写分布式状态机与断点恢复的巨量基础设施代码。' },
      ],
      kpis: [
        kpi('全课覆盖', '4 章 8 课 48 步', 'good'),
        kpi('核心仓库', 'langchain-ai/langgraph', 'good'),
        kpi('核心哲学', '显式状态图 · 耐久超步执行', 'good'),
      ],
      scene: iso('LangGraph 全景', [
        { id: 'l1', x: 140, y: 210, label: 'StateGraph + Channels', tone: 'blue' },
        { id: 'l2', x: 440, y: 210, label: 'Pregel + interrupt()', tone: 'violet', active: true },
        { id: 'l3', x: 740, y: 210, label: 'Time Travel + Subgraph', tone: 'green', active: true },
      ], [
        { from: 'l1', to: 'l2', packetCount: 1 },
        { from: 'l2', to: 'l3', packetCount: 1 },
      ]),
    },
  ]),
);

export const LANGCHAIN_CHAPTERS: Chapter[] = [
  chapter('lg-ch01', 1, 'StateGraph 与通道归约', 'teal', [L_LG_STATEGRAPH, L_LG_CHANNELS]),
  chapter('lg-ch02', 2, 'Pregel 超步引擎与工具节点', 'blue', [L_LG_PREGEL, L_LG_TOOLNODE]),
  chapter('lg-ch03', 3, 'Checkpointer 持久化与人机协同', 'violet', [L_LG_CHECKPOINT, L_LG_INTERRUPT]),
  chapter('lg-ch04', 4, '时间旅行与子图组合', 'sage', [L_LG_TIMETRAVEL, L_LG_SUBGRAPH]),
];

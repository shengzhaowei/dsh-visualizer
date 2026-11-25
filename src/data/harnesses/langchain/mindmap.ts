// LangChain / LangGraph (langchain-ai/langgraph) 交互式源码思维导图数据结构
// 与 4 章 8 课深度绑定，全部根节点、分支节点与末节点均附带对应 Python 源码实现。
import type { MindNode } from '../../../types/mindmap';

export const LANGCHAIN_MINDMAP_DATA: MindNode = {
  id: 'root',
  label: 'LangGraph (StateGraph)',
  sub: '有环状态图 × Pregel BSP × interrupt 耐久执行',
  tone: 'cyan',
  badge: 'RUNTIME',
  file: 'libs/langgraph/langgraph/graph/state.py',
  lessonSlug: 'lg-state-graph',
  stepNumber: 1,
  summary:
    'LangGraph 把命令式 Agent 循环编译为显式有环状态图（StateGraph），底层由受 Google Pregel 启发的 BSP 同步超步引擎驱动：数据字段与控制流边在 Channel 层完全同构，每超步自动落盘不可变 Checkpoint，原生获得容错续跑、零内存占用的 interrupt() 跨天审批以及 Git 式时间旅行。',
  points: [
    '节点只返回局部增量 dict，由 Channel Reducer 统一归约，杜绝并行写覆盖',
    'Pregel 三拍超步（Plan → Execute → Update）+ pending_writes 单点故障续跑',
    'Checkpointer（单线程执行态）与 BaseStore（跨线程语义记忆）双轨分离',
  ],
  codeLang: 'text',
  code: `libs/langgraph/langgraph/
├── graph/state.py            # StateGraph · add_node · add_conditional_edges · compile()
├── channels/                 # LastValue · BinaryOperatorAggregate · EphemeralValue
├── pregel/_loop.py           # Sync/AsyncPregelLoop · Plan → Execute → Update
├── prebuilt/tool_node.py     # ToolNode · InjectedState · Command 工具路由
├── types.py                  # interrupt() · Command(goto/update/resume) · Send
└── checkpoint/ & store/      # BaseCheckpointSaver(短期) · BaseStore(跨线程长记忆)`,
  children: [
    {
      id: 'lg-b-stategraph',
      label: '1 · StateGraph 与通道归约核',
      sub: 'StateGraph · LastValue · add_messages · EphemeralValue',
      tone: 'cyan',
      badge: 'CH 1 · GRAPH',
      file: 'libs/langgraph/langgraph/graph/state.py',
      lessonSlug: 'lg-state-graph',
      stepNumber: 1,
      summary:
        '用户用 TypedDict / Annotated 声明图状态与节点函数，compile() 将其翻译为由 Channel 驱动的 Pregel 执行计划。',
      points: [
        '节点绝不原地 mutate state，只吐出局部增量 dict 交给通道归约',
        '控制流边在编译期同样降维为 EphemeralValue 通道，数据与控制流完全同构',
      ],
      codeLang: 'py',
      code: `class AgentState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
    step_count: int

builder = StateGraph(AgentState)
builder.add_node("agent", call_model)
builder.add_node("tools", ToolNode(tools))
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", tools_condition)
builder.add_edge("tools", "agent")
graph = builder.compile(checkpointer=PostgresSaver(pool))`,
      children: [
        {
          id: 'lg-lastvalue',
          label: 'LastValue 与 Fail-Fast 并发保护',
          sub: '同超步多写直接抛 InvalidUpdateError',
          tone: 'cyan',
          badge: 'CHANNEL',
          file: 'libs/langgraph/langgraph/channels/last_value.py',
          lessonSlug: 'lg-channels-reducers',
          stepNumber: 2,
          summary: '未标注 Reducer 的普通字段默认映射为 LastValue 通道：同一超步若被两个并行节点同时写入，立刻 Fail-Fast 报错而非静默丢数据。',
          points: [
            '倒逼开发者对并发汇聚字段显式声明归约语义（如 operator.add）',
            '彻底消灭多线程 Agent 常见的竞态覆盖 Bug',
          ],
          codeLang: 'py',
          code: `class LastValue(BaseChannel[Value, Value, Value]):
    def update(self, values: Sequence[Value]) -> bool:
        if len(values) == 0:
            return False
        if len(values) != 1:
            raise InvalidUpdateError("Can receive only one value per step.")
        self.value = values[-1]
        return True`,
        },
        {
          id: 'lg-add-messages',
          label: 'add_messages 智能消息归约器',
          sub: '按 ID 原地更新 · RemoveMessage 精准裁剪',
          tone: 'cyan',
          badge: 'REDUCER',
          file: 'libs/langgraph/langgraph/graph/message.py',
          lessonSlug: 'lg-channels-reducers',
          stepNumber: 3,
          summary: '相比简单 list 拼接，add_messages 为每条消息维护唯一 ID，支持增量追加、按 ID 原地覆写以及用 RemoveMessage 精准删除旧消息。',
          points: [
            '流式纠偏或窗口裁剪时无需整段重建列表',
            '天然兼容 LangChain Message 对象与 dict 简写格式',
          ],
          codeLang: 'py',
          code: `def trim_old_messages(state: AgentState):
    to_drop = [RemoveMessage(id=m.id) for m in state["messages"][:-10]]
    return {"messages": to_drop}  # add_messages 自动按 ID 移除`,
        },
        {
          id: 'lg-ephemeral-edge',
          label: 'EphemeralValue 控制流同构编译',
          sub: 'branch:to:<node> 瞬时触发通道',
          tone: 'cyan',
          badge: 'COMPILE',
          file: 'libs/langgraph/langgraph/channels/ephemeral_value.py',
          lessonSlug: 'lg-channels-reducers',
          stepNumber: 4,
          summary: '图中的每一条边在编译后都会变成一个 EphemeralValue 通道：上游写完即唤醒下游，下个超步消费完毕自动清空。',
          points: [
            'Pregel 内核无需单独写「边调度器」，只需统一按通道版本号触发节点',
            '保证循环图每次回边都能干净重新激活目标节点',
          ],
          codeLang: 'py',
          code: `class EphemeralValue(BaseChannel[Value, Value, Value]):
    def update(self, values: Sequence[Value]) -> bool:
        if len(values) == 0:
            self.value = MISSING  # 下一超步未写入则自动清空
            return False
        self.value = values[-1]
        return True`,
        },
      ],
    },
    {
      id: 'lg-b-pregel',
      label: '2 · Pregel BSP 超步与工具路由',
      sub: 'Plan → Execute → Update · Send 扇出 · ToolNode',
      tone: 'blue',
      badge: 'CH 2 · PREGEL',
      file: 'libs/langgraph/langgraph/pregel/_loop.py',
      lessonSlug: 'lg-pregel-superstep',
      stepNumber: 1,
      summary:
        'Pregel 运行时按离散超步（Superstep）推进：先规划本步就绪节点，再基于同一冻结快照并发执行，最后在同步屏障按 Reducer 归约并递增通道版本号。',
      points: [
        '每个超步内并发节点读完全一致的快照，互不干扰',
        '单分支失败时成功分支已借 put_writes 落盘，恢复仅单点重跑失败节点',
      ],
      codeLang: 'py',
      code: `while self.tick():  # 1. Plan: 对比 channel_versions vs versions_seen 选出 tasks
    # 2. Execute: 并行执行本超步所有就绪节点，逐任务 put_writes 落盘
    await execute_tasks_concurrently(self.tasks)
    # 3. Update: 同步屏障归约全部 pending_writes，递增版本号并保存 Checkpoint
    self.after_tick()`,
      children: [
        {
          id: 'lg-bsp-versions',
          label: 'channel_versions 版本驱动调度',
          sub: 'versions_seen 差值精准唤醒节点',
          tone: 'blue',
          badge: 'PLAN',
          file: 'libs/langgraph/langgraph/pregel/_algo.py',
          lessonSlug: 'lg-pregel-superstep',
          stepNumber: 2,
          summary: '每个节点记录自己上次见过的通道版本（versions_seen）；只要订阅通道出现更高版本，Plan 阶段即将其加入本超步并发队列。',
          points: [
            '天然支持任意 DAG 扇出、多路汇合与有环回跳',
            '配合 recursion_limit 防止坏提示词导致无限死循环',
          ],
          codeLang: 'py',
          code: `def is_node_triggered(node, channel_versions, versions_seen):
    seen = versions_seen.get(node.name, {})
    return any(
        channel_versions.get(ch) > seen.get(ch, 0)
        for ch in node.triggers
    )`,
        },
        {
          id: 'lg-pending-writes',
          label: 'pending_writes 容错与单点续跑',
          sub: '成功分支免重复调 LLM / 扣费',
          tone: 'blue',
          badge: 'DURABLE',
          file: 'libs/langgraph/langgraph/pregel/_loop.py',
          lessonSlug: 'lg-pregel-superstep',
          stepNumber: 4,
          summary: '当同一超步内 3 个并行节点有 2 个成功、1 个因网络超时失败时，成功节点的输出已落盘 pending_writes，重试只重跑失败那 1 个。',
          points: [
            '在长链路生产 Agent 中大幅节省重复 LLM 调用开销',
            '确保外部副作用具备幂等恢复基础',
          ],
          codeLang: 'py',
          code: `def put_writes(self, task_id: str, writes: Sequence[tuple[str, Any]]):
    self.checkpointer.put_writes(self.checkpoint_config, writes, task_id)
    # 恢复同一超步时自动跳过已完成 task_id，直接复用其持久化写入`,
        },
        {
          id: 'lg-send-fanout',
          label: 'Send 动态 Map-Reduce 与 defer 汇合',
          sub: '运行时按数据量动态派生 N 路并行',
          tone: 'blue',
          badge: 'MAP-REDUCE',
          file: 'libs/langgraph/langgraph/types.py',
          lessonSlug: 'lg-tool-node-routing',
          stepNumber: 4,
          summary: '当分支数在编译期未知（例如搜索出 N 篇论文需逐篇总结），条件边可返回 Send 列表动态扇出，下游汇总节点设 defer=True 等待全部汇合。',
          points: [
            '每个 Send 携带独立子状态，汇总时通过 Annotated[list, operator.add] 自动聚合',
            'defer=True 解决各并行分支深度不等导致的提前触发问题',
          ],
          codeLang: 'py',
          code: `def fan_out_docs(state: ResearchState):
    return [Send("summarize", {"doc": d}) for d in state["docs"]]

builder.add_conditional_edges("search", fan_out_docs, ["summarize"])
builder.add_node("reduce", merge_summaries, defer=True)`,
        },
        {
          id: 'lg-toolnode-injected',
          label: 'ToolNode 与 InjectedState 防注入',
          sub: '从 LLM Schema 隐藏敏感字段 · 运行时可信注入',
          tone: 'blue',
          badge: 'TOOLNODE',
          file: 'libs/langgraph/langgraph/prebuilt/tool_node.py',
          lessonSlug: 'lg-tool-node-routing',
          stepNumber: 2,
          summary: 'ToolNode 并发执行模型返回的多个 tool_calls；使用 InjectedState 可把 user_id / auth_token 从模型可见参数中隐藏并在运行时自动注入。',
          points: [
            '彻底杜绝 Prompt 注入诱导模型篡改 user_id 越权查他人数据',
            '工具还可直接返回 Command(update=..., goto=...) 一步改状态并跳转节点',
          ],
          codeLang: 'py',
          code: `@tool
def query_orders(
    status: str,
    user_id: Annotated[str, InjectedState("user_id")],  # 对 LLM 完全不可见
) -> str:
    return db.find_orders(owner=user_id, status=status)`,
        },
      ],
    },
    {
      id: 'lg-b-hitl',
      label: '3 · Checkpointer 与 interrupt() 人机协同',
      sub: 'thread_id · interrupt(payload) · Command(resume)',
      tone: 'violet',
      badge: 'CH 3 · HITL',
      file: 'libs/langgraph/langgraph/types.py',
      lessonSlug: 'lg-checkpointer-state',
      stepNumber: 1,
      summary:
        'Checkpointer 在每个超步后落盘不可变状态快照；任意节点调用 interrupt() 即可释放内存冻结整张图，数小时或数天后凭 Command(resume) 原位唤醒。',
      points: [
        '等待人类审批期间 0 进程内存占用，服务重启也不丢失进度',
        '通过 (thread_id, checkpoint_ns, checkpoint_id) 三级坐标彻底隔离多用户与嵌套子图',
      ],
      codeLang: 'py',
      code: `def human_review(state: State):
    decision = interrupt({
        "action": "wire_transfer",
        "amount": state["amount"],
    })
    if decision["approved"]:
        return Command(goto="execute_payment", update={"amount": decision.get("amount", state["amount"])})
    return Command(goto="cancel")`,
      children: [
        {
          id: 'lg-checkpointer',
          label: 'BaseCheckpointSaver 三级坐标隔离',
          sub: 'thread_id · checkpoint_ns · checkpoint_id',
          tone: 'violet',
          badge: 'SAVER',
          file: 'libs/checkpoint/langgraph/checkpoint/base/__init__.py',
          lessonSlug: 'lg-checkpointer-state',
          stepNumber: 2,
          summary: 'Checkpointer 以 thread_id 隔离会话、checkpoint_ns 隔离嵌套子图、单调递增的 checkpoint_id 串联全部历史快照。',
          points: [
            '本地开发用 MemorySaver / SqliteSaver，生产集群无缝切换 AsyncPostgresSaver',
            '每份快照不可变（Immutable），天然成为时间旅行的数据基石',
          ],
          codeLang: 'py',
          code: `config = {
    "configurable": {
        "thread_id": "order-8821",
        "checkpoint_ns": "",  # 子图自动追加命名空间前缀，绝不串台
    }
}
snapshot = graph.get_state(config)`,
        },
        {
          id: 'lg-interrupt-replay',
          label: 'interrupt() 冻结与确定性重放',
          sub: '严禁在 interrupt() 前放不可幂等副作用',
          tone: 'violet',
          badge: 'INTERRUPT',
          file: 'libs/langgraph/langgraph/types.py',
          lessonSlug: 'lg-interrupt-command',
          stepNumber: 3,
          summary: 'interrupt() 内部抛出 GraphInterrupt 信号冻结状态落盘；当外部传入 Command(resume=val) 唤醒时，节点从头确定性重放并让 interrupt() 直接返回 val。',
          points: [
            '核心铁律：扣款/发邮件等副作用必须放在 interrupt() 之后或拆到下游节点',
            '支持同一节点内串行多次 interrupt()，按调用序号依次匹配 resume 值',
          ],
          codeLang: 'py',
          code: `# 外部客户端在 3 小时后收到主管审批，原位唤醒：
result = graph.invoke(
    Command(resume={"approved": True, "amount": 500}),
    config={"configurable": {"thread_id": "order-8821"}},
)`,
        },
        {
          id: 'lg-command-routing',
          label: 'Command 状态更新 + 动态跳转',
          sub: 'update + goto + Command.PARENT',
          tone: 'violet',
          badge: 'COMMAND',
          file: 'libs/langgraph/langgraph/types.py',
          lessonSlug: 'lg-interrupt-command',
          stepNumber: 4,
          summary: 'Command 将「写入 State」与「指定下一跳节点」合二为一，特别适合多 Agent Handoff 与子图直接跳回父图节点。',
          points: [
            '无需额外写冗长的条件边路由函数即可实现动态专家交接',
            '设置 graph=Command.PARENT 可从嵌套 Subgraph 跨层路由回父图',
          ],
          codeLang: 'py',
          code: `def triage_agent(state: State) -> Command[Literal["billing", "tech_support"]]:
    target = classify_ticket(state["messages"])
    return Command(
        update={"assigned_team": target},
        goto=target,
    )`,
        },
      ],
    },
    {
      id: 'lg-b-timetravel',
      label: '4 · 时间旅行、子图嵌套与双轨记忆',
      sub: 'get_state_history · Fork · Subgraph · BaseStore',
      tone: 'emerald',
      badge: 'CH 4 · SCALE',
      file: 'libs/store/langgraph/store/base/__init__.py',
      lessonSlug: 'lg-time-travel',
      stepNumber: 1,
      summary:
        '不可变快照链赋予 Agent Git 式分叉回放能力；通过 Subgraph 组合多专家团队，并用 BaseStore 补齐跨会话的长期语义记忆。',
      points: [
        'Fork 重跑从不覆盖旧时间线，便于线上坏例回放与 A/B 提示词对比',
        'Checkpointer 管单 Thread 短期执行态，BaseStore 管跨 Thread 长期记忆',
      ],
      codeLang: 'py',
      code: `# 1. 倒序浏览全部历史快照
history = list(graph.get_state_history(config))
target_snap = history[2]
# 2. 在历史节点上分叉改写状态（不破坏原分支）
fork_cfg = graph.update_state(target_snap.config, {"query": "修正后的检索词"}, as_node="planner")
# 3. 从分叉点直接继续向后执行
graph.invoke(None, fork_cfg)`,
      children: [
        {
          id: 'lg-time-travel',
          label: 'Replay / Fork 时间旅行与 as_node',
          sub: '零覆写分叉重跑 · 跳过前置昂贵调用',
          tone: 'emerald',
          badge: 'FORK',
          file: 'libs/langgraph/langgraph/pregel/main.py',
          lessonSlug: 'lg-time-travel',
          stepNumber: 3,
          summary: '选中任意历史 checkpoint_id 调用 update_state(..., as_node=...) 即可铸造新分支快照，精确激活下游出边并跳过前半段昂贵步骤。',
          points: [
            'as_node 告知 Pregel 模拟哪个节点刚写完，从而准确触发后续路由',
            '非常适合在长任务第 8 步翻车时回到第 6 步改参数重跑',
          ],
          codeLang: 'py',
          code: `fork_config = graph.update_state(
    past_snapshot.config,
    values={"messages": [HumanMessage(content="改用只读 SQL 查询")]},
    as_node="agent",
)
for chunk in graph.stream(None, fork_config, stream_mode="updates"):
    print(chunk)`,
        },
        {
          id: 'lg-subgraph',
          label: 'Subgraph 多专家嵌套组合',
          sub: '独立 Schema · 命名空间透传 · 子图级流式',
          tone: 'emerald',
          badge: 'SUBGRAPH',
          file: 'libs/langgraph/langgraph/graph/state.py',
          lessonSlug: 'lg-subgraphs-store',
          stepNumber: 1,
          summary: '任何编译后的子图都可作为普通节点嵌入父图，既可共享 State 键，也可在包装节点中做私有状态隔离与投影。',
          points: [
            '父图只需配置一次 Checkpointer，会自动按 checkpoint_ns 向下透传给所有子图',
            '开启 subgraphs=True 即可在单条 SSE 流中同时透视父子图全部事件',
          ],
          codeLang: 'py',
          code: `research_subgraph = build_research_graph().compile()

parent = StateGraph(ParentState)
parent.add_node("researcher", research_subgraph)  # 子图直接作为节点挂载
parent.add_node("writer", write_report)
parent.add_edge(START, "researcher")
parent.add_edge("researcher", "writer")
app = parent.compile(checkpointer=checkpointer)`,
        },
        {
          id: 'lg-basestore',
          label: 'BaseStore 跨线程长期语义记忆',
          sub: '层级命名空间 (org, user, topic) + 向量 search()',
          tone: 'emerald',
          badge: 'STORE',
          file: 'libs/store/langgraph/store/base/__init__.py',
          lessonSlug: 'lg-subgraphs-store',
          stepNumber: 3,
          summary: 'Checkpointer 按 thread_id 严格隔离，新对话即清零；BaseStore 按层级命名空间元组存储用户偏好与沉淀事实，并支持语义检索。',
          points: [
            '节点通过注入参数 store: BaseStore 直接读写跨会话记忆',
            '支持精确 KV get/put 与向量相似度 search(namespace, query=...)',
          ],
          codeLang: 'py',
          code: `def personalize(state: State, config: RunnableConfig, *, store: BaseStore):
    ns = ("memories", config["configurable"]["user_id"])
    hits = store.search(ns, query=state["messages"][-1].content, limit=3)
    store.put(ns, "pref-lang", {"language": "zh-CN", "style": "concise"})
    return {"context": [h.value for h in hits]}`,
        },
      ],
    },
  ],
};

// 第 5–6 章：会话与提示词、组装与对照
// 内容依据：NamiDSH docs/06、07 与 DSH 公开资料；示意数字已在文内注明。
import { chapter, dshSrc, DSH_REPO, iso, kpi, lesson, namiSrc, src, steps, swim, tree } from '../helpers';

const L11 = lesson(
  'session-log',
  'ch05',
  5,
  '会话与提示词',
  1,
  2,
  '会话事件溯源：模型可见即已记录',
  '会话不是一堆消息，而是一条只追加的事件日志。模型能看到什么，日志里就有什么——反过来也一样。',
  12,
  '核心',
  [
    { text: '解释「模型可见即已记录」的含义', completedAtStep: 2 },
    { text: '说出会话日志的追加规则与 session/event 广播', completedAtStep: 3 },
    { text: '区分 JSONL 与 SQLite 两种持久化后端', completedAtStep: 5 },
  ],
  steps([
    {
      shortLabel: '会话不是消息堆',
      badge: 'PROBLEM',
      title: '会话不是一堆消息，而是一条日志',
      paragraphs: [
        '直觉上，会话就是「用户说了什么、模型回了什么」两列消息。但 DSH 的会话是一条`只追加的事件日志`（append-only event log）：用户消息、模型回复、工具调用、工具结果、系统提示词的组装结果，都是往日志里追加的事件。',
        '这就是事件溯源（event sourcing）：当前状态不是存下来的，而是把日志从头重放算出来的。想知道模型此刻能看到什么，不用猜，重放日志就行。',
      ],
      kpis: [kpi('会话本质', '只追加事件日志', 'good'), kpi('当前状态', '重放算出', 'neutral'), kpi('删除 / 修改', '不直接改日志', 'neutral')],
      scene: tree('会话 = 只追加的事件日志', [
        { id: 'log', x: 500, y: 60, kind: 'root', label: '会话日志（append-only）', sublabel: '事件溯源 event sourcing', status: 'active', hexId: 'a1b2c3' },
        { id: 'u', x: 160, y: 200, kind: 'user', label: '用户消息', sublabel: '现在几点？', hexId: 'e7a1f2', parentId: 'log' },
        { id: 'a', x: 380, y: 200, kind: 'assistant', label: '模型回复', sublabel: '工具调用 get_time', hexId: 'c4d5e6', parentId: 'log' },
        { id: 't', x: 620, y: 200, kind: 'tool', label: '工具结果', sublabel: '当前时间 …', hexId: '9f8e7d', parentId: 'log' },
        { id: 'a2', x: 840, y: 200, kind: 'assistant', label: '模型回复', sublabel: '现在是 …', hexId: '3b4c5d', parentId: 'log' },
        { id: 'state', x: 500, y: 340, kind: 'log', label: '当前状态 = 从头重放', sublabel: '模型可见即已记录', status: 'highlight', hexId: '1a2b3c', parentId: 'log' },
      ], [
        { from: 'log', to: 'u' },
        { from: 'log', to: 'a' },
        { from: 'log', to: 't' },
        { from: 'log', to: 'a2' },
        { from: 'u', to: 'state', label: '重放', animated: true },
        { from: 'a2', to: 'state' },
      ], undefined, { title: 'sessions.jsonl — append-only', lines: [{ text: '{"seq": 1, "type": "user", "content": "现在几点？"}', highlight: true }, { text: '{"seq": 2, "type": "assistant", "toolCall": "get_time"}' }, { text: '{"seq": 3, "type": "tool-result", "content": "15:04"}' }, { text: '{"seq": 4, "type": "assistant", "content": "现在是 15:04"}', highlight: true }, { text: '// 只追加：新事件永远写在末尾', muted: true } ] }),
    },
    {
      shortLabel: '模型可见即已记录',
      badge: 'TECHNIQUE',
      title: '模型可见即已记录',
      paragraphs: [
        '「模型可见即已记录」是理解会话的关键一句：凡是模型在上下文里能看到的东西，一定已经写进日志了；反过来，日志里有的东西，经过组装，模型都能看到。',
        '这句话的实用价值在于调试：模型说了奇怪的话，先查日志——它是不是看到了不该看的东西，或者没看到该看的东西？日志是唯一的真相来源，上下文只是日志的一次投影。',
      ],
      callout: { kind: 'idea', title: '一句话', text: '模型可见即已记录：日志与上下文是同一份事实的两种形态，日志是源，上下文是投影。' },
      kpis: [kpi('真相来源', '日志', 'good'), kpi('上下文', '日志的投影', 'neutral'), kpi('调试第一步', '查日志', 'neutral')],
      scene: iso('日志是源，上下文是投影', [
        { id: 'log', x: 120, y: 200, label: '会话日志', sublabel: '唯一真相来源', tone: 'green', active: true, icon: 'database' },
        { id: 'ctx', x: 620, y: 200, label: '模型上下文', sublabel: '日志的一次投影', tone: 'blue', icon: 'brain' },
      ], [
        { from: 'log', to: 'ctx', label: '组装 / 投影', status: 'active', packetCount: 2, packetLabel: '投影' },
      ], [{ x: 480, y: 120, text: '模型可见 ⟺ 日志已有', tone: 'green' }]),
    },
    {
      shortLabel: '追加与广播',
      badge: 'SOLUTION',
      title: '追加一条，广播一次 session/event',
      paragraphs: [
        '每往日志里追加一条事件，`SessionStore` 就会广播一次 `session/event`。持久化、界面更新、遥测，都可以挂在这个事件上——它们不需要轮询日志，只需要监听。',
        '只追加的规则也让并发变得简单：写操作永远是追加，不存在「两个人同时改同一条消息」的冲突。需要「修改」时，追加一条修正事件，而不是改写历史。',
      ],
      sourceDrawer: namiSrc(
        '循环写工具结果：append 就是写日志',
        'packages/agent-loop/src/index.ts',
        'ts',
        `session.append({
  type: 'tool-result', toolCallId: call.id,
  name: call.name, content: result.content,
})`,
        'append 后，SessionStore 广播 session/event；持久化插件监听它，把事件写进 JSONL 或 SQLite。',
      ),
      kpis: [kpi('写操作', '只有追加', 'good'), kpi('追加后', '广播 session/event', 'neutral'), kpi('修改历史', '追加修正事件', 'neutral')],
      scene: swim('追加 → 广播 → 各方消费', [
        { id: 'loop', label: 'agent-loop', sublabel: 'append 事件', tone: 'violet' },
        { id: 'store', label: 'SessionStore', sublabel: '广播 session/event', tone: 'green' },
        { id: 'sub', label: '订阅方', sublabel: '持久化 / 界面 / 遥测', tone: 'blue' },
      ], [
        { id: 'a', laneId: 'loop', start: 2, end: 26, label: 'append(tool-result)', tone: 'violet', status: 'done' },
        { id: 'b', laneId: 'store', start: 28, end: 52, label: 'emit session/event', tone: 'green', status: 'done' },
        { id: 'c', laneId: 'sub', start: 54, end: 96, label: '持久化写入 · 界面更新', tone: 'blue', status: 'done' },
      ], [{ id: 'ev', laneId: 'store', pos: 40, label: 'session/event', tone: 'green', emphasized: true }], undefined, [{ start: 0, end: 26, label: '追加', tone: 'violet' }, { start: 26, end: 52, label: '广播', tone: 'green' }, { start: 52, end: 100, label: '消费', tone: 'blue' }], [{ fromLaneId: 'loop', fromPos: 26, toLaneId: 'store', toPos: 28 }, { fromLaneId: 'store', fromPos: 52, toLaneId: 'sub', toPos: 54 }]),
    },
    {
      shortLabel: '只追加的好处',
      badge: 'INSIGHT',
      title: '只追加带来什么：可重放、可审计、可恢复',
      paragraphs: [
        '只追加的日志有三个直接好处。第一，`可重放`：从头 replay 就能恢复任意时刻的状态，调试时可以精确复现一次对话。第二，`可审计`：历史不可篡改，谁在什么时候调了什么工具，都有据可查。',
        '第三，`可恢复`：进程崩了，读日志就能恢复会话，不需要额外的快照机制。代价是日志只会变长，需要压缩与归档策略——但那是另一个话题，本课先记住「追加」这个基本盘。',
      ],
      kpis: [kpi('可重放', '是', 'good'), kpi('可审计', '是', 'good'), kpi('可恢复', '读日志即可', 'good')],
      scene: tree('日志的三个好处', [
        { id: 'log', x: 500, y: 60, kind: 'root', label: '只追加日志', sublabel: 'append-only', status: 'active', hexId: 'a1b2c3' },
        { id: 'r', x: 200, y: 200, kind: 'log', label: '可重放', sublabel: '从头 replay 复现对话', hexId: 'f1e2d3', parentId: 'log' },
        { id: 'a', x: 500, y: 200, kind: 'log', label: '可审计', sublabel: '历史不可篡改', hexId: '4a5b6c', parentId: 'log' },
        { id: 'c', x: 800, y: 200, kind: 'log', label: '可恢复', sublabel: '崩了读日志恢复', hexId: '7d8e9f', parentId: 'log' },
      ], [
        { from: 'log', to: 'r' },
        { from: 'log', to: 'a' },
        { from: 'log', to: 'c' },
      ]),
    },
    {
      shortLabel: '两种持久化',
      badge: 'TECHNIQUE',
      title: '持久化后端：JSONL 与 SQLite',
      paragraphs: [
        '会话持久化在 DSH 里是可选服务 `ctx.sessionPersistence`：有就用，没有就算了（循环里用 `ctx.get(\'sessionPersistence\')` 查，见第 5 课）。两种后端：`JSONL`（每行一个事件，人可读、好排查）与 `SQLite`（可查询、适合多会话管理）。',
        '后端也是插件：换后端不需要改循环、不改会话服务，只需要换一个提供 `sessionPersistence` 的插件。',
      ],
      kpis: [kpi('后端', 'JSONL / SQLite', 'neutral'), kpi('服务名', 'sessionPersistence', 'neutral'), kpi('可选性', 'ctx.get 查询', 'good')],
      scene: iso('持久化：可选服务，两种后端', [
        { id: 'store', x: 400, y: 120, label: 'SessionStore', sublabel: 'ctx.get(\'sessionPersistence\')', tone: 'green', size: 'lg', active: true, icon: 'database' },
        { id: 'jsonl', x: 120, y: 320, label: 'JSONL', sublabel: '每行一个事件 · 人可读', tone: 'blue', icon: 'file-text' },
        { id: 'sqlite', x: 620, y: 320, label: 'SQLite', sublabel: '可查询 · 多会话', tone: 'violet', icon: 'hard-drive' },
      ], [
        { from: 'store', to: 'jsonl', label: '有就用', packetCount: 1, packetLabel: '写入' },
        { from: 'store', to: 'sqlite', label: '换后端 = 换插件' },
      ]),
    },
    {
      shortLabel: '会话复盘',
      badge: 'RECAP',
      title: '会话三句话',
      paragraphs: [
        '会话是一条只追加的事件日志，模型可见即已记录；每追加一条就广播一次 `session/event`，持久化与界面都挂在这个事件上；持久化是可选服务，JSONL 与 SQLite 两种后端，换后端就是换插件。',
        '下一课讲提示词：系统提示词不是写死的字符串，而是各个插件贡献的段落拼起来的。',
      ],
      recapTable: [
        { question: '会话存的是什么？', decision: '只追加的事件日志，不是消息堆', because: '事件溯源：状态靠重放算出，历史可审计、可恢复' },
        { question: '模型为什么能看到工具结果？', decision: '工具结果 append 进日志，组装时进入上下文', because: '模型可见即已记录' },
        { question: '持久化怎么换？', decision: '换提供 sessionPersistence 的插件', because: '持久化是可选服务，循环用 ctx.get 查询' },
      ],
      kpis: [kpi('会话本质', '事件日志', 'good'), kpi('广播事件', 'session/event', 'neutral'), kpi('本课步骤', '6 步', 'neutral')],
      scene: tree('会话全貌', [
        { id: 'log', x: 500, y: 60, kind: 'root', label: '会话日志', sublabel: 'append-only · 事件溯源', status: 'active', hexId: 'a1b2c3' },
        { id: 'ev', x: 200, y: 200, kind: 'event', label: 'session/event', sublabel: '每追加一次广播一次', hexId: 'b2c3d4', parentId: 'log' },
        { id: 'ctx', x: 500, y: 200, kind: 'assistant', label: '模型上下文', sublabel: '日志的投影', hexId: 'c3d4e5', parentId: 'log' },
        { id: 'per', x: 800, y: 200, kind: 'service', label: 'sessionPersistence', sublabel: 'JSONL / SQLite · 可选', hexId: 'd4e5f6', parentId: 'log' },
      ], [
        { from: 'log', to: 'ev' },
        { from: 'log', to: 'ctx', label: '组装' },
        { from: 'ev', to: 'per', label: '监听写入' },
      ]),
    },
  ]),
);

const L12 = lesson(
  'system-prompt',
  'ch05',
  5,
  '会话与提示词',
  2,
  2,
  '系统提示词组装',
  '系统提示词不是写死在代码里的一大段字符串，而是各个插件贡献的段落，按顺序拼起来的。',
  10,
  '入门',
  [
    { text: '解释系统提示词为什么是「组装」出来的', completedAtStep: 2 },
    { text: '说出段落的来源：各插件贡献，systemPrompt 服务汇总', completedAtStep: 3 },
    { text: '讲清改提示词为什么不需要改循环', completedAtStep: 5 },
  ],
  steps([
    {
      shortLabel: '不是写死字符串',
      badge: 'PROBLEM',
      title: '系统提示词不是写死的字符串',
      paragraphs: [
        '新手容易以为系统提示词就是代码里的一大段常量字符串。在 DSH 里不是：提示词是各个插件贡献的段落，按顺序拼起来的。时间插件贡献「现在的时间是……」，文件工具贡献「你可以读写这些目录」，每个插件只写自己那一段。',
        '好处是显而易见的：加一个工具，提示词里自动多一段对它的说明；拔掉一个工具，对应的说明自动消失。提示词与能力永远同步，不会「工具已经没了，提示词还在介绍它」。',
      ],
      kpis: [kpi('提示词形态', '多段落拼接', 'good'), kpi('段落来源', '各插件贡献', 'neutral'), kpi('能力与提示词', '永远同步', 'good')],
      scene: iso('提示词：各插件贡献段落', [
        { id: 'time', x: 60, y: 180, label: 'tool-time', sublabel: '贡献：时间说明', tone: 'orange', size: 'sm' },
        { id: 'fs', x: 300, y: 180, label: 'tool-fs', sublabel: '贡献：目录说明', tone: 'green', size: 'sm' },
        { id: 'agent', x: 540, y: 180, label: 'agent-loop', sublabel: '贡献：行为约束', tone: 'violet', size: 'sm' },
        { id: 'sp', x: 180, y: 400, label: 'systemPrompt 服务', sublabel: '按顺序拼接各段落', tone: 'dark', size: 'platform' },
      ], [
        { from: 'time', to: 'sp' },
        { from: 'fs', to: 'sp' },
        { from: 'agent', to: 'sp' },
      ]),
    },
    {
      shortLabel: '提示词服务',
      badge: 'TECHNIQUE',
      title: 'systemPrompt 服务：汇总，不生产',
      paragraphs: [
        '`SystemPrompt` 服务本身不写提示词内容，它只负责汇总：收集各插件贡献的段落，按顺序拼成最终的系统提示词，交给循环。',
        '这又是「定义、提供、使用」的三分工：`system-prompt` 包定义服务，各插件提供段落，`agent-loop` 使用拼好的提示词。循环的 `inject` 里有 `systemPrompt`，用的就是这个汇总结果。',
      ],
      kpis: [kpi('服务职责', '汇总，不生产', 'neutral'), kpi('循环的 inject', '含 systemPrompt', 'neutral'), kpi('段落顺序', '固定可预测', 'neutral')],
      scene: tree('systemPrompt：汇总者', [
        { id: 'sp', x: 500, y: 60, kind: 'root', label: 'ctx.systemPrompt', sublabel: '汇总服务', status: 'active' },
        { id: 'a', x: 200, y: 200, kind: 'plugin', label: '插件 A 的段落', sublabel: '贡献' },
        { id: 'b', x: 500, y: 200, kind: 'plugin', label: '插件 B 的段落', sublabel: '贡献' },
        { id: 'c', x: 800, y: 200, kind: 'plugin', label: '插件 C 的段落', sublabel: '贡献' },
        { id: 'loop', x: 500, y: 340, kind: 'plugin', label: 'agent-loop', sublabel: '使用拼好的提示词' },
      ], [
        { from: 'sp', to: 'a' },
        { from: 'sp', to: 'b' },
        { from: 'sp', to: 'c' },
        { from: 'sp', to: 'loop', label: '拼好后交给循环', animated: true },
      ]),
    },
    {
      shortLabel: '加工具自动加说明',
      badge: 'SOLUTION',
      title: '加工具，提示词自动多一段',
      paragraphs: [
        '工具插件在登记工具时，顺手贡献一段提示词：这个工具是干什么的、参数长什么样、什么时候该用。模型在上下文里看到工具描述，靠的就是这段文字。',
        '所以「工具表」与「提示词」是同一份事实的两种表现：工具登记了，提示词里就有它；工具拔掉了，提示词里自动没它。两者不可能不同步，因为它们来自同一次注册。',
      ],
      kpis: [kpi('工具登记', '附带提示词段落', 'good'), kpi('拔工具后', '说明自动消失', 'good'), kpi('同步机制', '同一次注册', 'neutral')],
      scene: swim('登记工具 = 登记说明', [
        { id: 'reg', label: '工具插件', sublabel: '登记 get_time', tone: 'green' },
        { id: 'tools', label: 'tools 服务', sublabel: '工具表', tone: 'orange' },
        { id: 'sp', label: 'systemPrompt', sublabel: '提示词段落', tone: 'rose' },
      ], [
        { id: 'a', laneId: 'reg', start: 2, end: 30, label: '登记工具 + 贡献段落', tone: 'green', status: 'done' },
        { id: 'b', laneId: 'tools', start: 32, end: 60, label: '工具表多一项', tone: 'orange', status: 'done' },
        { id: 'c', laneId: 'sp', start: 62, end: 96, label: '提示词多一段', tone: 'rose', status: 'done' },
      ], [{ id: 'ev', laneId: 'reg', pos: 16, label: '一次注册，两处生效', tone: 'green', emphasized: true }]),
    },
    {
      shortLabel: '顺序与优先级',
      badge: 'INSIGHT',
      title: '段落顺序：谁先谁后，有讲究',
      paragraphs: [
        '段落不是随便拼的：身份与角色在前，能力说明在中，行为约束与安全规则在后。顺序影响模型对提示词的理解——越靠前的内容，模型越不容易忽略。',
        '如果两个插件的段落冲突了（比如都规定了同一件事的不同做法），拼出来的提示词会让模型无所适从。这时要修的不是提示词文本，而是贡献段落的插件：收敛规则，而不是在拼接处打补丁。',
      ],
      callout: { kind: 'warn', title: '常见坑', text: '提示词冲突不要在拼接处打补丁：找到贡献冲突段落的插件，收敛规则本身。' },
      kpis: [kpi('段落顺序', '身份 → 能力 → 约束', 'neutral'), kpi('冲突处理', '收敛插件规则', 'warn'), kpi('拼接处打补丁', '不要', 'bad')],
      scene: tree('段落顺序', [
        { id: 'p1', x: 500, y: 70, kind: 'plugin', label: '1 · 身份与角色', sublabel: '你是谁', status: 'active' },
        { id: 'p2', x: 500, y: 190, kind: 'plugin', label: '2 · 能力说明', sublabel: '你能用什么工具' },
        { id: 'p3', x: 500, y: 310, kind: 'plugin', label: '3 · 行为约束与安全规则', sublabel: '什么不能做' },
        { id: 'out', x: 500, y: 440, kind: 'assistant', label: '最终系统提示词', sublabel: '按顺序拼接' },
      ], [
        { from: 'p1', to: 'p2' },
        { from: 'p2', to: 'p3' },
        { from: 'p3', to: 'out' },
      ]),
    },
    {
      shortLabel: '改提示词不改循环',
      badge: 'TECHNIQUE',
      title: '改提示词，不需要改循环',
      paragraphs: [
        '想调整 Agent 的行为，第一反应往往是改循环代码。在 DSH 里，更常见的办法是改提示词：加一个贡献段落的插件，或者调整某个插件贡献的段落内容。',
        '循环只负责「把拼好的提示词交给模型」，提示词里写什么，由贡献段落的插件决定。行为调整的成本从「改核心逻辑」降到了「换一段文字」。',
      ],
      kpis: [kpi('改行为成本', '换一段文字', 'good'), kpi('改循环代码', '不需要', 'good'), kpi('生效方式', '重拼提示词', 'neutral')],
      scene: iso('改提示词 ≠ 改循环', [
        { id: 'para', x: 120, y: 200, label: '改段落插件', sublabel: '换一段文字', tone: 'green', active: true },
        { id: 'sp', x: 420, y: 200, label: 'systemPrompt', sublabel: '重新拼接', tone: 'rose' },
        { id: 'loop', x: 720, y: 200, label: 'agent-loop', sublabel: '一行不改', tone: 'violet', dimmed: true },
      ], [
        { from: 'para', to: 'sp', label: '新段落', status: 'active' },
        { from: 'sp', to: 'loop', label: '新提示词', dashed: true },
      ]),
    },
    {
      shortLabel: '提示词复盘',
      badge: 'RECAP',
      title: '提示词三句话',
      paragraphs: [
        '系统提示词是各插件贡献的段落按顺序拼起来的；`systemPrompt` 服务只汇总、不生产内容；改行为先改段落，改循环是最后手段。',
        '下一章把前面所有的零件组装起来：从 spine 到 web、headless，同一核心，多种产品。',
      ],
      recapTable: [
        { question: '提示词是谁写的？', decision: '各插件各写一段，systemPrompt 汇总', because: '能力与说明来自同一次注册，永远同步' },
        { question: '段落顺序重要吗？', decision: '重要：身份 → 能力 → 约束', because: '越靠前，模型越不容易忽略' },
        { question: '想改 Agent 行为先改哪？', decision: '先改提示词段落，再考虑改循环', because: '循环只负责传提示词，行为在文字里' },
      ],
      kpis: [kpi('提示词形态', '拼接', 'good'), kpi('改行为成本', '一段文字', 'good'), kpi('本课步骤', '6 步', 'neutral')],
      scene: iso('提示词全貌', [
        { id: 'sp', x: 400, y: 200, label: 'systemPrompt', sublabel: '汇总各插件段落 → 交给循环', tone: 'rose', size: 'lg', active: true },
        { id: 'p', x: 120, y: 60, label: '各插件段落', sublabel: '工具 / 行为 / 安全', tone: 'blue', size: 'sm' },
        { id: 'loop', x: 700, y: 60, label: 'agent-loop', sublabel: '使用', tone: 'violet', size: 'sm' },
        { id: 'llm', x: 120, y: 380, label: '模型', sublabel: '看到最终提示词', tone: 'green', size: 'sm' },
      ], [
        { from: 'p', to: 'sp' },
        { from: 'sp', to: 'loop' },
        { from: 'loop', to: 'llm', label: 'stream(提示词 + 消息)' },
      ]),
    },
  ]),
);

const L13 = lesson(
  'spine-to-products',
  'ch06',
  6,
  '组装与对照',
  1,
  2,
  '从 spine 到 web / headless：同一核心，多种产品',
  '套件只装「每个 Agent 都需要的东西」，模型与入口故意留在外面。同一套核心，换入口就是新产品。',
  12,
  '核心',
  [
    { text: '解释 spine 套件的取舍：装什么、不装什么', completedAtStep: 2 },
    { text: '说出 web 与 headless 两种产品的组装差异', completedAtStep: 4 },
    { text: '用 dsh web 命令说明入口如何启动', completedAtStep: 5 },
  ],
  steps([
    {
      shortLabel: '套件的取舍',
      badge: 'PROBLEM',
      title: 'spine：只装每个 Agent 都需要的东西',
      paragraphs: [
        'DSH 有一个 `agent-spine-demo` 包，它的说明里写得很清楚：套件只装「每个 Agent 都需要的东西」，`连哪家模型、用什么入口（命令行、网页、IDE 插件）故意留在外面`，由使用方决定。',
        '这个取舍是整套分层设计的关键：套件越小，可复用的面越广；模型与入口越晚决定，组合的自由度越高。迷你版的 `spine` 完全照搬了这个做法：挂 7 个核心插件，模型与入口都不在里面。',
      ],
      kpis: [kpi('spine 挂插件', '7 个', 'neutral'), kpi('模型在内吗', '不在', 'good'), kpi('入口在内吗', '不在', 'good')],
      scene: tree('spine 的取舍', [
        { id: 'spine', x: 500, y: 60, kind: 'root', label: 'agent-spine 套件', sublabel: '只装每个 Agent 都需要的', status: 'active' },
        { id: 'in1', x: 160, y: 200, kind: 'service', label: 'llm · tools', sublabel: '在内' },
        { id: 'in2', x: 400, y: 200, kind: 'service', label: 'sessions · systemPrompt', sublabel: '在内' },
        { id: 'in3', x: 640, y: 200, kind: 'plugin', label: 'agent-loop · 工具', sublabel: '在内' },
        { id: 'out1', x: 240, y: 340, kind: 'plugin', label: '模型适配器', sublabel: '在外 · 使用方决定', status: 'dimmed' },
        { id: 'out2', x: 760, y: 340, kind: 'plugin', label: '入口 webserver / CLI', sublabel: '在外 · 使用方决定', status: 'dimmed' },
      ], [
        { from: 'spine', to: 'in1' },
        { from: 'spine', to: 'in2' },
        { from: 'spine', to: 'in3' },
        { from: 'spine', to: 'out1', label: '故意留出' },
        { from: 'spine', to: 'out2', label: '故意留出' },
      ]),
    },
    {
      shortLabel: 'spine 代码',
      badge: 'TECHNIQUE',
      title: 'spine 的 apply：一口气挂 7 个插件',
      paragraphs: [
        '迷你版 `spine` 的 `apply` 就是一连串的 `ctx.plugin(...)`：`LlmRuntime`、`SessionStore`、`ToolRuntime`、`SystemPrompt`、`toolTime`、`toolFs`、`AgentLoop`。没有条件分支，没有配置魔法，就是一份装机清单。',
        'DSH 的 `agent-spine-demo` 是同一份清单的工业版：二十多个插件，每个都有说明。读 DSH 源码时，从这份清单入手，比从任意一个核心文件入手都快。',
      ],
      sourceDrawer: namiSrc(
        'spine apply：装机清单',
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
        'DSH 的 agent-spine-demo 是同一思路：二十多个插件的装机清单，每个插件都有说明。',
      ),
      kpis: [kpi('迷你版 spine', '7 个插件', 'neutral'), kpi('DSH spine-demo', '20+ 个插件', 'neutral'), kpi('条件分支', '0', 'good')],
      scene: swim('spine apply 的挂载顺序', [
        { id: 's', label: 'spine apply', sublabel: '一连串 ctx.plugin()', tone: 'violet' },
      ], [
        { id: 'a', laneId: 's', start: 2, end: 16, label: 'LlmRuntime', tone: 'blue', status: 'done' },
        { id: 'b', laneId: 's', start: 18, end: 32, label: 'SessionStore', tone: 'green', status: 'done' },
        { id: 'c', laneId: 's', start: 34, end: 48, label: 'ToolRuntime', tone: 'orange', status: 'done' },
        { id: 'd', laneId: 's', start: 50, end: 64, label: 'SystemPrompt', tone: 'rose', status: 'done' },
        { id: 'e', laneId: 's', start: 66, end: 80, label: 'toolTime + toolFs', tone: 'green', status: 'done' },
        { id: 'f', laneId: 's', start: 82, end: 96, label: 'AgentLoop', tone: 'violet', status: 'done' },
      ], [], [{ pos: 0, label: '开始' }, { pos: 100, label: '装机完成' }]),
    },
    {
      shortLabel: '三种角色',
      badge: 'SOLUTION',
      title: '三种角色：定义、提供、使用',
      paragraphs: [
        '看第 6 课那张表，插件可以分成三种角色，DSH 的设计文档把它叫做 Service Definition / Service Provider / Consumer：`定义服务`（`llm`、`tools` 只定义「模型调用长什么样」「工具长什么样」，自己不连任何模型，也不包含任何工具）、`提供实现`（`llm-deepseek`、`tool-fs` 往这些服务里注册具体的实现）、`使用服务`（`agent-loop`、`webserver` 只认服务名，用就行）。',
        '拿模型来说，`llm` 服务的核心只有两个方法：`registerAdapter`（注册适配器）与 `stream`（调适配器，中间套 `llm/stream` 瀑布）。DeepSeek 适配器只做一件事：用 `ctx.effect` 把自己注册进去，卸载时自动注销。',
      ],
      kpis: [kpi('角色', '3 种', 'neutral'), kpi('llm 核心方法', '2 个', 'neutral'), kpi('适配器职责', '注册自己', 'good')],
      scene: iso('定义 / 提供 / 使用', [
        { id: 'def', x: 60, y: 200, label: '定义服务', sublabel: 'llm：registerAdapter + stream', tone: 'blue' },
        { id: 'prov', x: 380, y: 200, label: '提供实现', sublabel: 'llm-deepseek 注册适配器', tone: 'green', active: true },
        { id: 'use', x: 700, y: 200, label: '使用服务', sublabel: 'agent-loop：ctx.llm.stream()', tone: 'violet' },
      ], [
        { from: 'def', to: 'prov', label: '接口' },
        { from: 'prov', to: 'use', label: '服务名' },
      ]),
    },
    {
      shortLabel: '双端形态',
      badge: 'INSIGHT',
      title: 'web 与 headless：只差一个入口插件',
      paragraphs: [
        '同一套核心，换入口就是新产品：网页应用多挂一个 `webserver`，命令行多挂一个 CLI 入口，其余 7 个核心插件完全相同。`dsh --profile web` 与 `headless` 的差别不在核心，而在 profile 里列的 bundle 不同。',
        '这也是第 2 课分层叠加的落地点：产品差异是配置差异，不是代码差异。',
      ],
      kpis: [kpi('核心插件', '相同', 'good'), kpi('差异', '入口插件 + profile', 'neutral'), kpi('产品形态', 'web / headless / SDK / ACP', 'neutral')],
      scene: iso('同一核心，两个入口', [
        { id: 'core', x: 400, y: 230, label: '同一套核心 spine', sublabel: '7 个核心插件', tone: 'violet', size: 'lg', active: true },
        { id: 'web', x: 120, y: 60, label: 'webserver 入口', sublabel: 'dsh --profile web', tone: 'blue' },
        { id: 'cli', x: 680, y: 60, label: 'CLI 入口', sublabel: 'headless profile', tone: 'green' },
        { id: 'user', x: 400, y: 420, label: '用户', sublabel: '浏览器 / 终端', tone: 'neutral' },
      ], [
        { from: 'web', to: 'core' },
        { from: 'cli', to: 'core' },
        { from: 'user', to: 'web', dashed: true },
        { from: 'user', to: 'cli', dashed: true },
      ]),
    },
    {
      shortLabel: 'dsh web',
      badge: 'TECHNIQUE',
      title: '跑起来：npx dsh web',
      paragraphs: [
        'DSH 的启动方式本身就是这套设计的演示：`npx @deepseek-ai/dsh web`，在 `127.0.0.1:3080` 上提供 Web UI。`web` 是 CLI 硬编码的两个子命令之一（另一个是 `plugin`），它做的事情就是：按 `web` 这个 profile 解析配置、挂插件、启动入口。',
        '注意地址是 `127.0.0.1`：默认只监听本机。想让别人访问，需要显式改配置——又是 fail-closed 的影子：默认不对外暴露。',
      ],
      sourceDrawer: src(
        '启动 Web UI',
        '终端',
        `${DSH_REPO}`,
        'text',
        `$ npx @deepseek-ai/dsh web
# Web UI: http://127.0.0.1:3080`,
        '基线 0.1.0-rc.5。npx 会下载并运行官方包；需要 Node.js ≥ 22。',
      ),
      kpis: [kpi('启动命令', 'npx @deepseek-ai/dsh web', 'good'), kpi('默认地址', '127.0.0.1:3080', 'neutral'), kpi('Node 要求', '≥ 22', 'neutral')],
      scene: swim('npx dsh web 的启动', [
        { id: 'cli', label: 'CLI', sublabel: 'npx @deepseek-ai/dsh web', tone: 'blue' },
        { id: 'prof', label: 'profile 解析', sublabel: 'web profile → 配置树', tone: 'violet' },
        { id: 'app', label: '应用', sublabel: '挂插件 → 启动入口', tone: 'green' },
      ], [
        { id: 'a', laneId: 'cli', start: 2, end: 26, label: '解析 web 子命令', tone: 'blue', status: 'done' },
        { id: 'b', laneId: 'prof', start: 28, end: 56, label: '叠加 bundle + patch', tone: 'violet', status: 'done' },
        { id: 'c', laneId: 'app', start: 58, end: 96, label: '监听 127.0.0.1:3080', tone: 'green', status: 'done' },
      ], [{ id: 'ev', laneId: 'app', pos: 77, label: 'Web UI 就绪', tone: 'green', emphasized: true }]),
    },
    {
      shortLabel: '组装复盘',
      badge: 'RECAP',
      title: '组装三句话',
      paragraphs: [
        '套件只装每个 Agent 都需要的东西，模型与入口留在外面；插件分定义、提供、使用三种角色，接口、实现、调用方彼此分开；同一核心换入口就是新产品，产品差异是配置差异。',
        '最后一课回到起点：迷你版和真 Cordis 到底一样到什么程度，省掉的两千行在做什么。',
      ],
      recapTable: [
        { question: '套件该装什么？', decision: '只装每个 Agent 都需要的', because: '套件越小，可复用面越广；模型与入口越晚决定越自由' },
        { question: '怎么换模型 / 换入口？', decision: '换插件，不改核心', because: '定义、提供、使用三分工，调用方只认服务名' },
        { question: 'web 与 headless 差在哪？', decision: '只差入口插件与 profile', because: '产品差异是配置差异' },
      ],
      kpis: [kpi('套件原则', '只装必需', 'good'), kpi('角色', '定义 / 提供 / 使用', 'neutral'), kpi('本课步骤', '6 步', 'neutral')],
      scene: tree('从 spine 到产品', [
        { id: 'spine', x: 500, y: 60, kind: 'root', label: 'spine 套件', sublabel: '7 个核心插件', status: 'active' },
        { id: 'model', x: 200, y: 200, kind: 'service', label: '+ 模型适配器', sublabel: 'deepseek / mock' },
        { id: 'entry', x: 500, y: 200, kind: 'plugin', label: '+ 入口', sublabel: 'webserver / CLI' },
        { id: 'prod', x: 800, y: 200, kind: 'plugin', label: '产品', sublabel: 'web / headless / SDK / ACP', status: 'highlight' },
      ], [
        { from: 'spine', to: 'model' },
        { from: 'spine', to: 'entry' },
        { from: 'model', to: 'prod' },
        { from: 'entry', to: 'prod' },
      ]),
    },
  ]),
);

const L14 = lesson(
  'mini-vs-real',
  'ch06',
  6,
  '组装与对照',
  2,
  2,
  '迷你版 vs 真 Cordis：省了什么',
  '14 个场景、114 行输出逐行一致。省掉的两千行在做什么？答案是：DSH 业务代码几乎用不到的东西。',
  14,
  '进阶',
  [
    { text: '说出 14 个对照场景的验证方法：同一份测试跑两边', completedAtStep: 2 },
    { text: '列出迷你版省略的功能及其在 DSH 里的用量', completedAtStep: 4 },
    { text: '讲清剩下的两千行主要花在三件事上', completedAtStep: 5 },
  ],
  steps([
    {
      shortLabel: '文件对照',
      badge: 'PROBLEM',
      title: '文件对照：结构一一对应，行数差四倍',
      paragraphs: [
        '迷你版的文件结构和 DSH 仓库里的 `vendor/cordis/src` 一一对应：`fiber.ts`（754 → 329）、`reflect.ts`（418 → 122）、`events.ts`（352 → 107）、`registry.ts`（337 → 129）、`utils.ts`（287 → 60）、`logger.ts`（270 → 27）、`context.ts`（146 → 89）、`service.ts`（115 → 27）。',
        '合计：真 Cordis 2693 行，迷你版约 900 行（含注释），去掉注释和空行是 679 行。行数差了四倍，但 API 与行为是一致的——下一节讲怎么证明。',
      ],
      kpis: [kpi('真 Cordis', '2693 行', 'neutral'), kpi('迷你版', '约 680 行有效', 'good'), kpi('文件对应', '8 / 8', 'good')],
      scene: tree('文件对照表', [
        { id: 'real', x: 300, y: 60, kind: 'root', label: '真 Cordis · 2693 行', sublabel: 'vendor/cordis/src' },
        { id: 'mini', x: 700, y: 60, kind: 'root', label: '迷你版 · 约 680 行', sublabel: 'packages/cordis/src' },
        { id: 'f1', x: 120, y: 200, kind: 'plugin', label: 'fiber.ts', sublabel: '754 → 329' },
        { id: 'f2', x: 300, y: 200, kind: 'plugin', label: 'reflect.ts', sublabel: '418 → 122' },
        { id: 'f3', x: 480, y: 200, kind: 'plugin', label: 'events.ts', sublabel: '352 → 107' },
        { id: 'f4', x: 660, y: 200, kind: 'plugin', label: 'registry.ts', sublabel: '337 → 129' },
        { id: 'f5', x: 840, y: 200, kind: 'plugin', label: 'context.ts', sublabel: '146 → 89' },
        { id: 's', x: 500, y: 340, kind: 'service', label: 'service.ts · 115 → 27', sublabel: '另有 utils 287→60、logger 270→27' },
      ], [
        { from: 'real', to: 'f1' },
        { from: 'real', to: 'f2' },
        { from: 'real', to: 'f3' },
        { from: 'mini', to: 'f4' },
        { from: 'mini', to: 'f5' },
        { from: 'f3', to: 's' },
        { from: 'f4', to: 's' },
      ]),
    },
    {
      shortLabel: '怎么验证',
      badge: 'TECHNIQUE',
      title: '怎么验证「行为一致」：同一份测试跑两边',
      paragraphs: [
        '光说一致没有说服力。作者写了一份兼容性测试 `tests/compat.ts`，覆盖 14 个场景：插件异步加载、依赖等待、拔掉提供者、同名冲突、配置热更新、错误隔离、配置校验、Service 类、五种事件、自动取消监听、嵌套卸载、注入检查、可选依赖、异步 effect。',
        '关键在于：测试代码不 import 任何一边，而是在运行时决定加载哪个实现。不设环境变量跑迷你版；把 `CORDIS` 指向 DSH 仓库里编译好的真 Cordis，就跑真 Cordis。每个场景都用 `internal/status` 记录每个插件的每一次状态变化，最后输出成文本，两边 diff：`114 行输出逐行一致`。比的不只是最终结果，还有状态变化的先后顺序。',
      ],
      sourceDrawer: namiSrc(
        '运行时决定加载哪一边',
        'tests/compat.ts',
        'ts',
        `const lib = await import(
  process.env.CORDIS || '../packages/cordis/src/index.ts'
)
const { Context, Service } = lib`,
        'node tests/compat.ts 跑迷你版；CORDIS=/path/to/deepseek-harness/vendor/cordis/lib/index.js node tests/compat.ts 跑真 Cordis；diff 两份输出。',
      ),
      kpis: [kpi('对照场景', '14 个', 'good'), kpi('输出行数', '114 行', 'neutral'), kpi('一致程度', '逐行一致', 'good')],
      scene: swim('同一份测试，跑两边', [
        { id: 'test', label: 'tests/compat.ts', sublabel: '14 个场景', tone: 'violet' },
        { id: 'mini', label: '迷你版', sublabel: '默认', tone: 'blue' },
        { id: 'real', label: '真 Cordis', sublabel: 'CORDIS 环境变量', tone: 'green' },
        { id: 'diff', label: 'diff', sublabel: '114 行逐行一致', tone: 'orange' },
      ], [
        { id: 'a', laneId: 'test', start: 2, end: 30, label: '同一份测试代码', tone: 'violet', status: 'done' },
        { id: 'b', laneId: 'mini', start: 32, end: 58, label: '跑迷你版 → mini.txt', tone: 'blue', status: 'done' },
        { id: 'c', laneId: 'real', start: 32, end: 58, label: '跑真 Cordis → real.txt', tone: 'green', status: 'done' },
        { id: 'd', laneId: 'diff', start: 60, end: 96, label: 'diff mini.txt real.txt → 无差异', tone: 'orange', status: 'done' },
      ], [{ id: 'ev', laneId: 'diff', pos: 78, label: '连状态顺序都一致', tone: 'orange', emphasized: true }]),
    },
    {
      shortLabel: '一个保留差异',
      badge: 'INSIGHT',
      title: '一处有意保留的差异：plugin() 返回值',
      paragraphs: [
        '只有一个地方，两边行为不同。`ctx.plugin()` 的返回值可以 await。真 Cordis 的实现是用 `Object.create(fiber)` 造一个包装对象，再给它加一个 `then` 方法；如果在这个包装对象上调用 `update(config)` 改配置，方法里的 `this` 是包装对象，状态会被写到包装对象上，而不是真正的 Fiber 上，依赖它的插件在检查时读的是真正 Fiber 的旧状态，重启顺序会和预期不一样。',
        '迷你版用 Proxy 做包装，把所有方法都绑定回真正的 Fiber，所以没有这个问题。测试里改成通过 `ctx.fiber.update()` 改配置，绕开这个差异，两边就一致了。知道差异的存在，比假装没有差异更重要。',
      ],
      kpis: [kpi('行为差异', '1 处', 'neutral'), kpi('原因', '包装对象的 this 指向', 'neutral'), kpi('绕开方式', 'ctx.fiber.update()', 'good')],
      scene: iso('包装对象 vs Proxy', [
        { id: 'real', x: 120, y: 200, label: '真 Cordis', sublabel: 'Object.create(fiber) + then', tone: 'blue' },
        { id: 'mini', x: 620, y: 200, label: '迷你版', sublabel: 'Proxy 绑定回真 Fiber', tone: 'green', active: true },
        { id: 'bug', x: 370, y: 60, label: 'update() 的 this 指向', sublabel: '真版写到包装对象上', tone: 'rose', size: 'sm' },
      ], [
        { from: 'bug', to: 'real', label: '状态写错地方', dashed: true },
        { from: 'bug', to: 'mini', label: '无此问题', status: 'active' },
      ]),
    },
    {
      shortLabel: '省了什么',
      badge: 'SOLUTION',
      title: '省了什么：DSH 业务代码几乎用不到的功能',
      paragraphs: [
        '迷你版没有实现的功能，以及它们在 DSH 里的用量（统计范围是 import 了 Cordis 的 519 个文件）：`isolate` / `intercept`（0 / 0 次）、`once`（0 次）、`ctx.set`（0 次）、`@Inject` 装饰器（0 次）、`mixin` / `accessor`（各 1 次）、生成器形式的 effect（只在框架内部）、调用栈追踪（框架内部）、可调用服务（框架内部）。',
        '可以看到，DSH 业务代码里几乎用不到的功能，迷你版都没做；DSH 里用得多的，迷你版全都保留了：`inject` 395 次、`Config` 187 次、`ctx.on` 183 次、`ctx.get` 178 次、`ctx.effect` 130 次、`extends Service` 62 次、`FiberState` 59 次、`internal/*` 58 次、`ctx.plugin` 47 次、`ctx.inject` 39 次、`ctx.emit` 24 次、`ctx.provide` 16 次、`waterfall` 13 次。',
      ],
      kpis: [kpi('省略功能用量', '0–1 次', 'good'), kpi('保留功能用量', '13–395 次', 'good'), kpi('判断标准', 'DSH 业务代码用不用', 'neutral')],
      scene: tree('省掉的 vs 保留的', [
        { id: 'omit', x: 240, y: 60, kind: 'root', label: '省略（用量 0–1）', sublabel: 'isolate / once / ctx.set / @Inject', status: 'dimmed' },
        { id: 'keep', x: 760, y: 60, kind: 'root', label: '保留（用量 13–395）', sublabel: 'inject / on / get / effect / waterfall', status: 'active' },
        { id: 'o1', x: 120, y: 200, kind: 'plugin', label: 'isolate / intercept', sublabel: '0 / 0 次' },
        { id: 'o2', x: 360, y: 200, kind: 'plugin', label: 'once · ctx.set', sublabel: '0 次' },
        { id: 'k1', x: 640, y: 200, kind: 'service', label: 'inject · 395 次', sublabel: '保留' },
        { id: 'k2', x: 880, y: 200, kind: 'service', label: 'ctx.on · 183 次', sublabel: '保留' },
      ], [
        { from: 'omit', to: 'o1' },
        { from: 'omit', to: 'o2' },
        { from: 'keep', to: 'k1' },
        { from: 'keep', to: 'k2' },
      ]),
    },
    {
      shortLabel: '两千行去哪了',
      badge: 'TECHNIQUE',
      title: '剩下的两千行：三件事',
      paragraphs: [
        '剩下的两千行，大部分花在三件事上。第一，`更强的 effect`：支持生成器、异步迭代器，支持在 effect 执行到一半时被取消，并且保证取消和完成之间不会出现竞态——真 Cordis 的 `effect` 方法一个就有一百多行。',
        '第二，`更好的报错`：插件出错时能告诉你它是在哪一行被挂载的，这对一个由几百个插件组成的系统非常重要。第三，`作用域隔离`：`isolate` 和 `intercept`，以及支撑它们的「可追踪对象」机制。这些都是工程上必须的，但不影响理解核心原理。',
      ],
      kpis: [kpi('更强的 effect', '生成器 / 取消 / 无竞态', 'neutral'), kpi('更好的报错', '挂载位置追踪', 'neutral'), kpi('作用域隔离', 'isolate / intercept', 'neutral')],
      scene: iso('两千行的去向', [
        { id: 'e', x: 60, y: 200, label: '更强的 effect', sublabel: '一个方法 100+ 行', tone: 'blue' },
        { id: 'err', x: 380, y: 200, label: '更好的报错', sublabel: '出错时报挂载位置', tone: 'orange' },
        { id: 'iso', x: 700, y: 200, label: '作用域隔离', sublabel: 'isolate / intercept', tone: 'violet', active: true },
        { id: 'core', x: 180, y: 400, label: '核心原理不受影响', sublabel: '五条规则 680 行就能写出来', tone: 'dark', size: 'platform' },
      ], [
        { from: 'e', to: 'core' },
        { from: 'err', to: 'core' },
        { from: 'iso', to: 'core' },
      ]),
    },
    {
      shortLabel: '五条规则',
      badge: 'RECAP',
      title: '结语：五条规则',
      paragraphs: [
        'DeepSeek Harness 一百多万行代码，真正撑起整个系统的，是 Cordis 这两千多行，而 Cordis 的核心，又可以浓缩成五条规则：一切都是插件，每个插件拿到自己的 ctx；插件做的每一次注册都记在自己名下，卸载时倒序撤销；插件用服务名提供和使用能力，依赖不齐就等着，到齐就启动，换人就重启；插件之间用事件广播，waterfall 让任何环节都能被插手；一个插件出错，只影响它自己。',
        '这五条规则，用 680 行就能写出来，跑出来的行为和真 Cordis 一样。剩下的，都是在把这五条规则做得更稳。读完本站，再打开 DSH 仓库，建议按这个顺序：`vendor/cordis/src/fiber.ts`（先找 `_reload`、`_unload`、`_refresh`、`_setEpoch`）、`vendor/cordis/src/reflect.ts`（找 `handler.get`、`provide`、`notify`）、`packages/examples/agent-spine-demo`（装机清单）、`packages/core/agent-loop`、`packages/core/tools`。',
      ],
      sourceDrawer: dshSrc(
        '接下来读 DSH 源码的顺序',
        'vendor/cordis/src/fiber.ts',
        'ts',
        `// 1. vendor/cordis/src/fiber.ts
//    先找 _reload、_unload、_refresh、_setEpoch
// 2. vendor/cordis/src/reflect.ts
//    找 handler.get、provide、notify
// 3. packages/examples/agent-spine-demo
//    装机清单：二十多个插件各是干什么的
// 4. packages/core/agent-loop
// 5. packages/core/tools`,
        '顺序来自 NamiDSH docs/07。更细的拆解见 namiai.tech 上的「拆机 DeepSeek Harness」系列。',
      ),
      recapTable: [
        { question: '迷你版可信吗？', decision: '可信：14 场景双实现 114 行输出逐行一致', because: '比的不只是结果，还有状态变化的先后顺序' },
        { question: '省掉的两千行重要吗？', decision: '工程上重要，理解原理时可以先放下', because: '省略的都是 DSH 业务代码用量 0–1 次的功能' },
        { question: '读完本站下一步？', decision: '按 fiber → reflect → spine-demo → agent-loop → tools 的顺序读 DSH', because: '骨架已懂，剩下的就是往骨架上贴细节' },
      ],
      kpis: [kpi('核心规则', '5 条', 'good'), kpi('迷你版行数', '约 680 行', 'good'), kpi('全课程', '14 课 · 84 步', 'good')],
      scene: tree('五条规则', [
        { id: 'r', x: 500, y: 60, kind: 'root', label: 'Cordis 五条规则', sublabel: '680 行就能写出来', status: 'active' },
        { id: 'a', x: 140, y: 200, kind: 'plugin', label: '一切皆插件', sublabel: '各拿自己的 ctx' },
        { id: 'b', x: 380, y: 200, kind: 'plugin', label: '注册即记账', sublabel: '卸载倒序撤销' },
        { id: 'c', x: 620, y: 200, kind: 'service', label: '服务名协作', sublabel: '不齐等 · 到齐启 · 换人重启' },
        { id: 'd', x: 860, y: 200, kind: 'event', label: '事件广播', sublabel: 'waterfall 可插手' },
        { id: 'e', x: 500, y: 340, kind: 'log', label: '出错只影响自己', sublabel: 'FAILED 隔离' },
      ], [
        { from: 'r', to: 'a' },
        { from: 'r', to: 'b' },
        { from: 'r', to: 'c' },
        { from: 'r', to: 'd' },
        { from: 'r', to: 'e' },
      ]),
    },
  ]),
);

export const CHAPTERS_05_06 = [
  chapter('ch05', 5, '会话与提示词', 'coral', [L11, L12]),
  chapter('ch06', 6, '组装与对照', 'teal', [L13, L14]),
];

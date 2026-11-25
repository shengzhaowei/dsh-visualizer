// DSH 插件全息收藏卡：5 张章节核心插件卡 + 1 张全课通关 EX 架构师卡。
// 全部决策与路径均与课程已核实内容严格一致。

export type HoloCardFoil = 'emerald' | 'cyan' | 'violet' | 'amber' | 'teal' | 'prismatic';
export type HoloCardRarity = 'SR' | 'SSR' | 'UR' | 'EX';

export interface HoloCardDecision {
  q: string;
  a: string;
}

export interface PluginHoloCard {
  id: string;
  /** 对应章节 id（'ch01'..'ch05'），终极卡为 'all' */
  chapterId: string;
  code: string;
  rarity: HoloCardRarity;
  foil: HoloCardFoil;
  icon: 'layers' | 'git-branch' | 'refresh-cw' | 'shield' | 'package' | 'sparkles';
  title: string;
  subtitle: string;
  pkgPath: string;
  motto: string;
  stats: { label: string; value: string }[];
  lessonSlug: string;
  decisions: HoloCardDecision[];
}

export const PLUGIN_HOLO_CARDS: PluginHoloCard[] = [
  {
    id: 'cordis-mainboard',
    chapterId: 'ch01',
    code: 'DSH-01',
    rarity: 'SR',
    foil: 'emerald',
    icon: 'layers',
    title: 'Cordis 无特权主板',
    subtitle: '第 1 章 · 整机全景与核心理念',
    pkgPath: 'vendor/cordis · Context',
    motto: '一切皆插件，没有特权内核；服务名与事件名是唯一耦合点。',
    stats: [
      { label: '核心耦合', value: '0 import' },
      { label: '全景链路', value: '16 步' },
    ],
    lessonSlug: 'plugin-everything',
    decisions: [
      { q: '为什么连 AgentLoop 也是插件？', a: '取消特权内核，让循环、模型、工具均可热替换。' },
      { q: '插件之间如何协作？', a: '只认服务名（ctx.llm）与事件名，不直接 import 实现。' },
      { q: '为什么先看 16 步全景？', a: '建立 HTTP → Session → LLM → Tool → SSE 端到端直觉。' },
    ],
  },
  {
    id: 'dsh-scope-prism',
    chapterId: 'ch02',
    code: 'DSH-02',
    rarity: 'SSR',
    foil: 'cyan',
    icon: 'git-branch',
    title: 'dsh-scope 作用域棱镜',
    subtitle: '第 2 章 · Cordis 主板与作用域',
    pkgPath: 'packages/dsh-scope',
    motto: '注册向下继承（就近覆盖），事件向上穿透（祖先兜底）。',
    stats: [
      { label: '核心原语', value: 'createScope' },
      { label: '资源回收', value: 'Fiber uid' },
    ],
    lessonSlug: 'dsh-scope',
    decisions: [
      { q: '为何不用 Cordis 原生 isolate？', a: 'Agent 需要动态父子继承与事件冒泡，而非静态平行切分。' },
      { q: '子 Agent 工具会泄露给兄弟吗？', a: '不会：作用域链只沿 parent 查找，兄弟节点彼此不可见。' },
      { q: '子 Agent 结束怎么防泄漏？', a: 'scoped 注册绑定 Fiber uid 账本，卸载时自动倒序归零。' },
    ],
  },
  {
    id: 'agent-loop-core',
    chapterId: 'ch03',
    code: 'DSH-03',
    rarity: 'SSR',
    foil: 'violet',
    icon: 'refresh-cw',
    title: 'AgentLoop 双层循环核',
    subtitle: '第 3 章 · Agent 循环与记忆',
    pkgPath: 'packages/agent-loop · sessions',
    motto: '外层 turn 管一次提问，内层 step 跑推理 + 工具；模型可见即已记录。',
    stats: [
      { label: '循环结构', value: 'turn × step' },
      { label: '日志模型', value: 'Append-Only' },
    ],
    lessonSlug: 'agent-loop',
    decisions: [
      { q: '循环如何对外暴露？', a: '通过 setFactory 登记成工厂，自身只是普通插件。' },
      { q: '为什么会话是只追加事件日志？', a: '模型可见即已记录，天然支持重放、审计与持久化分叉。' },
      { q: '系统提示词如何维护？', a: '由各插件按稳定顺序贡献段落，不硬编码巨型模板。' },
    ],
  },
  {
    id: 'security-trinity',
    chapterId: 'ch04',
    code: 'DSH-04',
    rarity: 'UR',
    foil: 'amber',
    icon: 'shield',
    title: '三道安全审批闸门',
    subtitle: '第 4 章 · 工具管线与安全审批',
    pkgPath: 'pre-execute · approval · sandbox',
    motto: '策略门分流 → 人工审批挂起 → OS 沙箱硬隔离；未知即 fail-closed。',
    stats: [
      { label: '审批与沙箱', value: '叠加不绕过' },
      { label: '缺省策略', value: 'fail-closed' },
    ],
    lessonSlug: 'approval-pipeline',
    decisions: [
      { q: '拦截时为何返回拒绝而非抛错？', a: '拒绝是业务结果，写入会话让模型换方式继续，不把 Fiber 打成 FAILED。' },
      { q: '点了允许就能绕过沙箱吗？', a: '绝不能：审批授予尝试权，OS 沙箱（bwrap/Seatbelt/E2B）守物理边界。' },
      { q: '子 Agent 高危操作会逃逸吗？', a: '不会：pre-execute 事件沿 dsh-scope 自动向上冒泡到父级审批器。' },
    ],
  },
  {
    id: 'spine-manifest',
    chapterId: 'ch05',
    code: 'DSH-05',
    rarity: 'SR',
    foil: 'teal',
    icon: 'package',
    title: 'spine 装机清单',
    subtitle: '第 5 章 · 产品组装与源码对照',
    pkgPath: 'profile / bundle / patch',
    motto: '模型与入口故意留白；四层配置叠加，同一核心零分叉变出四种产品。',
    stats: [
      { label: '叠加层级', value: '4 层配置' },
      { label: '真相来源', value: '--dump-config' },
    ],
    lessonSlug: 'product-assembly',
    decisions: [
      { q: 'patch 为何整行替换不做深合并？', a: '牺牲少量冗余换取 100% 可预测，避免脑算多层合并。' },
      { q: 'web 与 headless 差在哪？', a: '核心插件完全一致，只差入口插件与 profile 清单。' },
      { q: '680 行迷你版省掉了什么？', a: '省掉 DSH 几乎不用的高级隔离与边界报错，核心五规则一致。' },
    ],
  },
  {
    id: 'dsh-architect',
    chapterId: 'all',
    code: 'DSH-EX',
    rarity: 'EX',
    foil: 'prismatic',
    icon: 'sparkles',
    title: 'DSH 架构师全息徽章',
    subtitle: '全课通关 · 5 章 15 课 90 步',
    pkgPath: 'deepseek-ai/deepseek-harness',
    motto: '主板之上无特权，作用域中见秩序，双闸门下守边界。',
    stats: [
      { label: '掌握课程', value: '15 / 15 课' },
      { label: '架构步数', value: '90 步全通' },
    ],
    lessonSlug: 'plugin-everything',
    decisions: [
      { q: '架构核心思想', a: '一切皆插件 + 作用域树 + 瀑布扩展点 + 纯数据产品装配。' },
      { q: '源码阅读起点', a: '从 agent-spine 装机清单与 --dump-config 配置树切入最快。' },
      { q: '下一步实践', a: '基于 Cordis 写一个监听 tools/pre-execute 的自定义插件。' },
    ],
  },
];

export function getCardByChapterId(chapterId: string): PluginHoloCard | undefined {
  return PLUGIN_HOLO_CARDS.find((c) => c.chapterId === chapterId);
}

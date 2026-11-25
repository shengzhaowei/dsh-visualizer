import type { HarnessId } from '../types/lesson';

export type StudioIconName =
  | 'layers'
  | 'cpu'
  | 'refresh-cw'
  | 'shield'
  | 'package'
  | 'terminal'
  | 'git-branch'
  | 'network'
  | 'lock'
  | 'sparkles';

export interface StudioPillar {
  num: string;
  chapterId: string;
  slug: string;
  icon: StudioIconName;
  title: string;
}

export interface HarnessStudioConfig {
  id: Exclude<HarnessId, 'claude-code'>;
  mascotName: string;
  standeeSrc: string;
  standeeAlt: string;
  headline: {
    prefix1: string;
    em1: string;
    suffix1: string;
    prefix2: string;
    em2: string;
    suffix2: string;
  };
  accent: string;
  accentDeep: string;
  accentSoft: string;
  glow: string;
  speechLines: string[];
  pillars: StudioPillar[];
}

export const HARNESS_STUDIOS: Record<Exclude<HarnessId, 'claude-code'>, HarnessStudioConfig> = {
  dsh: {
    id: 'dsh',
    mascotName: 'Whale-chan',
    standeeSrc: '/dsh-chan-standee.png',
    standeeAlt: 'DeepSeek-chan 鲸鱼娘全身立绘',
    headline: {
      prefix1: '用',
      em1: 'Cordis 插件树',
      suffix1: '自由装配整机，',
      prefix2: '用',
      em2: 'dsh-scope 与双闸门',
      suffix2: '守住边界',
    },
    accent: 'var(--ch-blue)',
    accentDeep: 'var(--blue-stroke)',
    accentSoft: 'color-mix(in srgb, var(--ch-blue) 14%, transparent)',
    glow: 'color-mix(in srgb, var(--ch-blue) 26%, transparent)',
    speechLines: [
      '整个 Agent 就是挂在根 Context 上的一棵插件树，卸载 Fiber 时所有副作用倒序归零。',
      '审批门、OS 沙箱、日志和重试全挂在 waterfall 洋葱瀑布上，不改核心循环一行代码。',
      'dsh-scope 的秘诀是「注册向下继承，事件向上穿透」，子 Agent 越权操作会自动冒泡到父级审批！',
      '用户点 Allow 只授予尝试权，底层 bwrap / Seatbelt 沙箱边界绝不被绕过。',
      '一套 spine 核心靠 Profile / Bundle / Patch 声明式装机，同时驱动 CLI、Web 与 ACP。',
    ],
    pillars: [
      { num: '01', chapterId: 'ch01', slug: 'plugin-everything', icon: 'layers', title: '整机全景与核心理念' },
      { num: '02', chapterId: 'ch02', slug: 'context-plugin', icon: 'cpu', title: 'Cordis 主板与作用域' },
      { num: '03', chapterId: 'ch03', slug: 'agent-loop', icon: 'refresh-cw', title: 'Agent 循环与记忆' },
      { num: '04', chapterId: 'ch04', slug: 'tools-preexecute', icon: 'shield', title: '工具管线与安全审批' },
      { num: '05', chapterId: 'ch05', slug: 'product-assembly', icon: 'package', title: '产品组装与源码对照' },
    ],
  },
  pi: {
    id: 'pi',
    mascotName: 'Pi-chan',
    standeeSrc: '/pi-chan-standee.svg',
    standeeAlt: 'Pi-chan 全身立绘',
    headline: {
      prefix1: '用',
      em1: '极简四原语',
      suffix1: '把窗口留给代码，',
      prefix2: '用',
      em2: 'Steering 双队列',
      suffix2: '优雅实时转向',
    },
    accent: 'var(--ch-sage)',
    accentDeep: 'var(--green-stroke)',
    accentSoft: 'color-mix(in srgb, var(--ch-sage) 15%, transparent)',
    glow: 'color-mix(in srgb, var(--ch-sage) 26%, transparent)',
    speechLines: [
      '少即是多！read / edit / write / bash 四个正交工具就足够驱动资深级编码推理。',
      '想立刻纠偏？发一条 Steering，跑完当前工具立刻转向，剩余工具自动合成 Skipped 保持协议合法。',
      '不打断眼前任务？把后续想法放进 Follow-up 队列，等内层循环收敛后自动无缝接力。',
      '所有探索分支存在同一份树形 JSONL 里，/tree 切换分支只需移动 leafId 指针。',
      '几十行 TypeScript 放进 .pi/extensions/ 就能热载安全门、容器沙箱和自定义命令。',
    ],
    pillars: [
      { num: '01', chapterId: 'pi-ch01', slug: 'pi-layered-arch', icon: 'layers', title: '四层极简架构与四原语' },
      { num: '02', chapterId: 'pi-ch02', slug: 'steering-followup', icon: 'refresh-cw', title: '双层循环与实时队列' },
      { num: '03', chapterId: 'pi-ch03', slug: 'pi-context-pipeline', icon: 'git-branch', title: '上下文投影与树形会话' },
      { num: '04', chapterId: 'pi-ch04', slug: 'pi-compaction', icon: 'package', title: '无损压缩与 TS 扩展' },
    ],
  },
  codex: {
    id: 'codex',
    mascotName: 'Codex-chan',
    standeeSrc: '/codex-chan-standee.svg',
    standeeAlt: 'Codex-chan 全身立绘',
    headline: {
      prefix1: '用',
      em1: 'SQ ⇄ EQ 异步双队列',
      suffix1: '解耦内核，',
      prefix2: '用',
      em2: 'OS 原生沙箱',
      suffix2: '锁死物理边界',
    },
    accent: 'var(--cdx-violet)',
    accentDeep: 'var(--cdx-blue)',
    accentSoft: 'color-mix(in srgb, var(--cdx-violet) 16%, transparent)',
    glow: 'var(--cdx-glow)',
    speechLines: [
      'UI 和内核绝不直接互调，一切交互全走强类型 SQ（Op）⇄ EQ（EventMsg）双通道。',
      'AskForApproval 管「问不问人」，SandboxPolicy 管「内核给不给写盘和联网」，二维正交。',
      'macOS Seatbelt 与 Linux Landlock + seccomp 默认物理断网，Prompt 注入也偷不走密钥。',
      '模型总爱数错行号？apply_patch 去行号上下文锚定 + 三阶段渐进匹配一次打准。',
      '按 Esc 触发 Op::Interrupt，CancellationToken 毫秒级同步切断 SSE、审批挂起与进程组。',
    ],
    pillars: [
      { num: '01', chapterId: 'codex-ch01', slug: 'codex-sq-eq', icon: 'network', title: 'Workspace 与双队列协议' },
      { num: '02', chapterId: 'codex-ch02', slug: 'codex-turn-loop', icon: 'cpu', title: 'Core 控制面与 Turn 循环' },
      { num: '03', chapterId: 'codex-ch03', slug: 'codex-approval-policy', icon: 'shield', title: '二维正交策略与 ExecPolicy' },
      { num: '04', chapterId: 'codex-ch04', slug: 'codex-os-sandbox', icon: 'lock', title: 'OS 原生内核沙箱与净化' },
      { num: '05', chapterId: 'codex-ch05', slug: 'codex-apply-patch', icon: 'terminal', title: '代码补丁与抗漂移压缩' },
      { num: '06', chapterId: 'codex-ch06', slug: 'codex-config-mcp', icon: 'layers', title: '配置层、MCP 与多端生态' },
    ],
  },
  langchain: {
    id: 'langchain',
    mascotName: 'Graph-chan',
    standeeSrc: '/langchain-chan-standee.svg',
    standeeAlt: 'LangGraph-chan 全身立绘',
    headline: {
      prefix1: '用',
      em1: 'StateGraph 状态图',
      suffix1: '显式编排循环，',
      prefix2: '用',
      em2: 'interrupt() 与快照链',
      suffix2: '实现耐久执行',
    },
    accent: 'var(--ch-teal)',
    accentDeep: 'var(--blue-stroke)',
    accentSoft: 'color-mix(in srgb, var(--ch-teal) 15%, transparent)',
    glow: 'color-mix(in srgb, var(--ch-teal) 26%, transparent)',
    speechLines: [
      '节点绝不原地改 state，只返回局部增量 dict 交给 Channel Reducer 归约，消灭并发覆盖。',
      'Pregel 按 Plan → Execute → Update 离散超步推进，单分支失败只需单点重跑，不重复扣费。',
      '一行 interrupt() 冻结全图落盘，零内存占用等人类数小时，Command(resume) 原位唤醒！',
      '历史快照不可变：用 update_state(..., as_node=...) 随时像 Git 一样分叉时间旅行重跑。',
      'Checkpointer 管单会话执行断点，BaseStore 管跨会话长期语义记忆，双轨各司其职。',
    ],
    pillars: [
      { num: '01', chapterId: 'lg-ch01', slug: 'lg-state-graph', icon: 'git-branch', title: 'StateGraph 与通道归约' },
      { num: '02', chapterId: 'lg-ch02', slug: 'lg-pregel-superstep', icon: 'refresh-cw', title: 'Pregel 超步与工具路由' },
      { num: '03', chapterId: 'lg-ch03', slug: 'lg-checkpointer-state', icon: 'shield', title: 'Checkpointer 与人机协同' },
      { num: '04', chapterId: 'lg-ch04', slug: 'lg-time-travel', icon: 'layers', title: '时间旅行与子图组合' },
    ],
  },
};

import { useState } from 'react';
import { ArrowRight, CheckCircle2, FileText, GitBranch, Layers, Shield, Terminal, Users } from 'lucide-react';
import { playCardFlip, playPackBurst, playStepTick } from '../../utils/sound';

type PlayTab = 'hooks' | 'memory' | 'subagent';
type PermMode = 'plan' | 'default' | 'acceptEdits' | 'dontAsk' | 'bypassPermissions';
type ToolReqId = 'read-env' | 'edit-auth' | 'bash-pytest' | 'bash-push';

interface CascadeStep {
  title: string;
  detail: string;
  status: 'pass' | 'block' | 'warn' | 'rewrite' | 'dim';
}

function simulateHooksCascade(
  req: ToolReqId,
  mode: PermMode,
  preHookOn: boolean,
  postHookOn: boolean,
): { verdict: string; tone: 'good' | 'warn' | 'bad'; steps: CascadeStep[] } {
  if (req === 'read-env') {
    if (preHookOn) {
      return {
        verdict: 'PreToolUse Hook 返回 Exit Code 2 硬拦截（哪怕开启 bypassPermissions 依然 100% 拦截！）',
        tone: 'bad',
        steps: [
          { title: '1 · PreToolUse Hook (guard.sh)', detail: '命中 *.env → stderr 输出理由并返回 Exit 2 硬拦截', status: 'block' },
          { title: '2 · permissions.deny 规则', detail: '已提前阻断，无需继续', status: 'dim' },
          { title: '3 · Permission Mode', detail: `当前模式 ${mode} 无法绕过 PreToolUse Hook`, status: 'dim' },
          { title: '4 · 工具执行与 PostToolUse', detail: '未执行；stderr 反馈已写回模型引导改读 .env.example', status: 'dim' },
        ],
      };
    }
    return {
      verdict: 'permissions.deny 规则一票否决（deny 永远压倒 ask 与 allow）',
      tone: 'bad',
      steps: [
        { title: '1 · PreToolUse Hook', detail: '未开启（跳过）', status: 'dim' },
        { title: '2 · permissions.deny 规则', detail: '命中 Read(./.env) → 级联一票否决！', status: 'block' },
        { title: '3 · Permission Mode / allow', detail: '被 deny 截断，不可放行', status: 'dim' },
        { title: '4 · 工具执行', detail: '已安全阻止敏感文件泄露', status: 'dim' },
      ],
    };
  }

  if (req === 'edit-auth') {
    if (mode === 'plan') {
      return {
        verdict: 'plan 纯只读规划模式阻止写入：先对齐架构方案再切回编码模式',
        tone: 'warn',
        steps: [
          { title: '1 · PreToolUse Hook', detail: preHookOn ? 'Exit 0 放行' : '未开启', status: preHookOn ? 'pass' : 'dim' },
          { title: '2 · deny / ask 规则', detail: '未命中禁令', status: 'pass' },
          { title: '3 · Permission Mode = plan', detail: '只读模式禁止 Edit/Write → 拒绝写盘', status: 'block' },
          { title: '4 · PostToolUse Hook', detail: '未执行', status: 'dim' },
        ],
      };
    }
    if (mode === 'dontAsk') {
      return {
        verdict: 'dontAsk 严格模式：未在 allow 白名单的 Edit 操作静默拒绝',
        tone: 'warn',
        steps: [
          { title: '1 · PreToolUse Hook', detail: preHookOn ? 'Exit 0 放行' : '未开启', status: preHookOn ? 'pass' : 'dim' },
          { title: '2 · deny / ask 规则', detail: '未命中', status: 'pass' },
          { title: '3 · Permission Mode = dontAsk', detail: 'Edit 不在 allow 列表 → 静默拒绝（不弹窗）', status: 'block' },
          { title: '4 · PostToolUse Hook', detail: '未执行', status: 'dim' },
        ],
      };
    }
    const auto = mode === 'acceptEdits' || mode === 'bypassPermissions';
    return {
      verdict: auto
        ? `自动放行 Edit${postHookOn ? ' + PostToolUse 自动运行 Prettier 格式化' : ''}`
        : `default 模式弹窗确认后落盘${postHookOn ? ' + PostToolUse 自动 Prettier' : ''}`,
      tone: 'good',
      steps: [
        { title: '1 · PreToolUse Hook', detail: preHookOn ? 'Exit 0 放行（校验非敏感文件）' : '未开启', status: preHookOn ? 'pass' : 'dim' },
        { title: '2 · Read-before-Edit & mtime 校验', detail: '已读且未被外部编辑器修改 → 通过', status: 'pass' },
        { title: `3 · Permission Mode = ${mode}`, detail: auto ? '自动放行文件编辑' : '弹窗展示结构化 Diff 待人类确认', status: auto ? 'pass' : 'warn' },
        { title: '4 · PostToolUse Hook', detail: postHookOn ? '自动执行 npx prettier --write src/auth.ts 零风格漂移' : '未开启', status: postHookOn ? 'pass' : 'dim' },
      ],
    };
  }

  if (req === 'bash-pytest') {
    if (mode === 'plan') {
      return {
        verdict: 'plan 模式下仅允许只读查询命令，测试写入命令被拦截',
        tone: 'warn',
        steps: [
          { title: '1 · PreToolUse Hook', detail: preHookOn ? 'updatedInput 注入 --tb=short -q' : '未开启', status: preHookOn ? 'rewrite' : 'dim' },
          { title: '2 · Permission Mode = plan', detail: '只读规划模式阻断非只读 Bash', status: 'block' },
          { title: '3 · 执行结果', detail: '待切回 default / acceptEdits 后运行', status: 'dim' },
        ],
      };
    }
    return {
      verdict: preHookOn
        ? 'PreToolUse 返回 updatedInput 原地注入 --tb=short -q，命中 allow 白名单零弹窗跑出精简输出！'
        : '命中 permissions.allow Bash(pytest*) 直接放行（原始冗长输出）',
      tone: 'good',
      steps: [
        {
          title: '1 · PreToolUse Hook',
          detail: preHookOn ? 'Exit 0 + updatedInput: {"command":"pytest tests/ --tb=short -q"}' : '未开启',
          status: preHookOn ? 'rewrite' : 'dim',
        },
        { title: '2 · deny / ask 规则', detail: '未命中', status: 'pass' },
        { title: '3 · permissions.allow 白名单', detail: '命中 Bash(pytest*) → 自动放行', status: 'pass' },
        { title: '4 · OS Bash 沙箱执行', detail: '在工作区边界内执行完毕并回传结果', status: 'pass' },
      ],
    };
  }

  // bash-push
  if (mode === 'bypassPermissions') {
    return {
      verdict: 'bypassPermissions 跳过了 ask 弹窗（因此绝对不能放行的红线必须写进 PreToolUse Hook！）',
      tone: 'warn',
      steps: [
        { title: '1 · PreToolUse Hook', detail: preHookOn ? '未拦截普通 git push（仅拦 --force）→ Exit 0' : '未开启', status: preHookOn ? 'pass' : 'dim' },
        { title: '2 · permissions.ask 规则', detail: '命中 Bash(git push *)', status: 'warn' },
        { title: '3 · Permission Mode = bypassPermissions', detail: '跳过人工确认弹窗 → 直接执行！', status: 'warn' },
      ],
    };
  }
  if (mode === 'plan' || mode === 'dontAsk') {
    return {
      verdict: `${mode} 模式直接拦截 git push（不弹窗、不推送）`,
      tone: 'bad',
      steps: [
        { title: '1 · PreToolUse Hook', detail: preHookOn ? 'Exit 0 交由权限层' : '未开启', status: preHookOn ? 'pass' : 'dim' },
        { title: `2 · Permission Mode = ${mode}`, detail: '禁止外部推送操作 → 静默拒绝', status: 'block' },
      ],
    };
  }
  return {
    verdict: '命中 permissions.ask Bash(git push *) → 挂起弹窗请求人类确认',
    tone: 'warn',
    steps: [
      { title: '1 · PreToolUse Hook', detail: preHookOn ? '校验非 --force，Exit 0 放行给权限级联' : '未开启', status: preHookOn ? 'pass' : 'dim' },
      { title: '2 · permissions.deny', detail: '未命中（非 --force）', status: 'pass' },
      { title: '3 · permissions.ask', detail: '命中 Bash(git push *) → 弹出人工审批框！', status: 'warn' },
    ],
  };
}

interface TargetFileSpec {
  path: string;
  label: string;
  activeRules: string[];
  savedTokens: number;
}

const TARGET_FILES: TargetFileSpec[] = [
  { path: 'packages/api/src/login.ts', label: '后端鉴权路由', activeRules: ['root', 'api-sub', 'rule-api', 'auto'], savedTokens: 4820 },
  { path: 'apps/web/src/Button.tsx', label: '前端 React 组件', activeRules: ['root', 'web-sub', 'rule-fe', 'auto'], savedTokens: 5140 },
  { path: 'db/migrations/001_init.sql', label: '数据库迁移脚本', activeRules: ['root', 'rule-sql', 'auto'], savedTokens: 5690 },
];

const MEMORY_LAYERS = [
  { id: 'root', path: 'repo/CLAUDE.md', desc: '项目根架构总览与通用命令（≤200 行，始终预加载）', tokens: 680 },
  { id: 'api-sub', path: 'packages/api/CLAUDE.md', desc: '子目录规范：API 模块目录结构与错误码约定（按目录懒加载）', tokens: 920 },
  { id: 'web-sub', path: 'apps/web/CLAUDE.md', desc: '子目录规范：组件无障碍标准与 CSS Token 约束（按目录懒加载）', tokens: 850 },
  { id: 'rule-api', path: '.claude/rules/api-security.md', desc: 'paths: packages/api/** — 强制 Zod 校验与禁打 Token 日志', tokens: 1240 },
  { id: 'rule-fe', path: '.claude/rules/frontend-a11y.md', desc: 'paths: apps/web/** — 键盘导航与暗色模式检查清单', tokens: 1180 },
  { id: 'rule-sql', path: '.claude/rules/sql-migration.md', desc: 'paths: db/migrations/** — 禁锁表 DDL 与回滚脚本铁律', tokens: 1490 },
  { id: 'auto', path: '~/.claude/projects/.../MEMORY.md', desc: 'Claude 自动记忆：跨 Worktree 共享的本地纠偏笔记（前 200 行）', tokens: 420 },
];

/** Claude Code 三合一交互演练场：Hooks 权限级联 + CLAUDE.md 懒加载透视 + Subagent 防火墙与 Worktree 隔离。 */
export function ClaudePlaygroundView({ onJumpToLesson }: { onJumpToLesson: (slug: string, stepNumber?: number) => void }) {
  const [tab, setTab] = useState<PlayTab>('hooks');

  // Tab 1: Hooks & Permission Cascade
  const [req, setReq] = useState<ToolReqId>('read-env');
  const [permMode, setPermMode] = useState<PermMode>('bypassPermissions');
  const [preHookOn, setPreHookOn] = useState(true);
  const [postHookOn, setPostHookOn] = useState(true);

  // Tab 2: Memory Hierarchy Lazy Load
  const [activeFile, setActiveFile] = useState<string>(TARGET_FILES[0].path);

  // Tab 3: Subagent & Worktree
  const [useSubagent, setUseSubagent] = useState(true);
  const [useWorktree, setUseWorktree] = useState(true);

  const hookResult = simulateHooksCascade(req, permMode, preHookOn, postHookOn);
  const fileSpec = TARGET_FILES.find((f) => f.path === activeFile) ?? TARGET_FILES[0];

  return (
    <div className="cc-studio-scroll">
      <div className="cc-play-shell">
        <div className="cc-play-header">
          <div className="cc-play-tabs" role="tablist" aria-label="Claude Code 演练模块">
            <button
              type="button"
              className={`cc-play-tab ${tab === 'hooks' ? 'cc-play-tab--active' : ''}`}
              onClick={() => { playStepTick(); setTab('hooks'); }}
            >
              <Shield size={14} /> PreToolUse Hooks & 权限级联
            </button>
            <button
              type="button"
              className={`cc-play-tab ${tab === 'memory' ? 'cc-play-tab--active' : ''}`}
              onClick={() => { playStepTick(); setTab('memory'); }}
            >
              <Layers size={14} /> CLAUDE.md 懒加载透视
            </button>
            <button
              type="button"
              className={`cc-play-tab ${tab === 'subagent' ? 'cc-play-tab--active' : ''}`}
              onClick={() => { playStepTick(); setTab('subagent'); }}
            >
              <GitBranch size={14} /> Subagent 防火墙 & Worktree
            </button>
          </div>
        </div>

        {/* TAB 1: HOOKS & PERMISSIONS */}
        {tab === 'hooks' && (
          <div className="cc-play-grid">
            <section className="cc-play-card">
              <div className="cc-play-card-title">
                <span><Terminal size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Hooks 与权限</span>
                <button type="button" className="cdx-inline-link" style={{ color: 'var(--cc-accent)' }} onClick={() => onJumpToLesson('cc-hooks-lifecycle', 3)}>
                  对应课程 <ArrowRight size={12} />
                </button>
              </div>

              <div>
                <div className="cdx-wb-label mono" style={{ marginBottom: 6 }}>工具调用</div>
                <div className="cc-play-pills">
                  {([
                    { id: 'read-env', label: 'Read("./.env")' },
                    { id: 'edit-auth', label: 'Edit("src/auth.ts")' },
                    { id: 'bash-pytest', label: 'Bash("pytest tests/")' },
                    { id: 'bash-push', label: 'Bash("git push origin feat")' },
                  ] as const).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`cc-play-pill mono ${req === item.id ? 'cc-play-pill--active' : ''}`}
                      onClick={() => { playStepTick(); setReq(item.id); }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="cdx-wb-label mono" style={{ marginBottom: 6 }}>Permission Mode</div>
                <div className="cc-play-pills">
                  {(['plan', 'default', 'acceptEdits', 'dontAsk', 'bypassPermissions'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`cc-play-pill mono ${permMode === m ? 'cc-play-pill--active' : ''}`}
                      onClick={() => { playCardFlip(); setPermMode(m); }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="cdx-wb-label mono" style={{ marginBottom: 6 }}>Hooks</div>
                <div className="cc-play-pills">
                  <button
                    type="button"
                    className={`cc-play-pill mono ${preHookOn ? 'cc-play-pill--active' : ''}`}
                    onClick={() => { playCardFlip(); setPreHookOn((v) => !v); }}
                  >
                    PreToolUse: {preHookOn ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    className={`cc-play-pill mono ${postHookOn ? 'cc-play-pill--active' : ''}`}
                    onClick={() => { playCardFlip(); setPostHookOn((v) => !v); }}
                  >
                    PostToolUse: {postHookOn ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </section>

            <section className="cc-play-card">
              <div className="cc-play-card-title">
                <span>执行路径</span>
              </div>
              <div className={`lab-result lab-result--${hookResult.tone}`}>
                <div className="lab-result-verdict">{hookResult.verdict}</div>
              </div>
              <div className="cc-cascade-list">
                {hookResult.steps.map((s, i) => (
                  <div key={i} className={`cc-cascade-step cc-cascade-step--${s.status}`}>
                    <strong className="mono">{s.title}</strong>
                    <span style={{ color: 'var(--muted)', textAlign: 'right' }}>{s.detail}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: CLAUDE.MD LAZY LOADING */}
        {tab === 'memory' && (
          <div className="cc-play-grid">
            <section className="cc-play-card">
              <div className="cc-play-card-title">
                <span><FileText size={15} style={{ verticalAlign: -2, marginRight: 6 }} />选择 Claude 正在读取的文件</span>
                <button type="button" className="cdx-inline-link" style={{ color: 'var(--cc-accent)' }} onClick={() => onJumpToLesson('cc-memory-hierarchy', 2)}>
                  记忆分层课 <ArrowRight size={12} />
                </button>
              </div>
              <div className="cc-cascade-list">
                {TARGET_FILES.map((f) => (
                  <button
                    key={f.path}
                    type="button"
                    className={`cdx-op-btn ${activeFile === f.path ? 'cc-play-pill--active' : ''}`}
                    style={{ borderColor: activeFile === f.path ? 'var(--cc-accent)' : undefined }}
                    onClick={() => { playPackBurst(); setActiveFile(f.path); }}
                  >
                    <span className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>Read(&quot;{f.path}&quot;)</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{f.label} · 仅命中相关规则，省下约 {f.savedTokens} Token 无关噪音</span>
                  </button>
                ))}
              </div>
              <div className="lab-result lab-result--good">
                <div className="lab-result-verdict">
                  高信噪比秘诀：Monorepo 子目录 CLAUDE.md 与 .claude/rules (paths) 按需懒加载，不碰该目录时 0 Token 占用！
                </div>
              </div>
            </section>

            <section className="cc-play-card">
              <div className="cc-play-card-title">
                <span>上下文窗口实时注入视图</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--cc-emerald)' }}>
                  已省 {fileSpec.savedTokens} Tokens
                </span>
              </div>
              <div className="cc-cascade-list">
                {MEMORY_LAYERS.map((layer) => {
                  const active = fileSpec.activeRules.includes(layer.id);
                  return (
                    <div key={layer.id} className={`cc-memory-layer ${active ? 'cc-memory-layer--active' : 'cc-memory-layer--dormant'}`}>
                      <div className="cc-memory-head">
                        <span className="mono">{layer.path}</span>
                        <span className={`cc-tag mono ${active ? 'cc-tag--on' : 'cc-tag--off'}`}>
                          {active ? `已注入 +${layer.tokens} tok` : '休眠 0 tok'}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{layer.desc}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: SUBAGENT & WORKTREE */}
        {tab === 'subagent' && (
          <div className="cc-play-grid">
            <section className="cc-play-card">
              <div className="cc-play-card-title">
                <span><Users size={15} style={{ verticalAlign: -2, marginRight: 6 }} />上下文防火墙对比（翻阅 30 个源码文件）</span>
                <button type="button" className="cdx-inline-link" style={{ color: 'var(--cc-accent)' }} onClick={() => onJumpToLesson('cc-subagent-delegation', 1)}>
                  Subagent 课 <ArrowRight size={12} />
                </button>
              </div>
              <div className="cc-play-pills">
                <button type="button" className={`cc-play-pill ${!useSubagent ? 'cc-play-pill--active' : ''}`} onClick={() => { playCardFlip(); setUseSubagent(false); }}>
                  直接在主窗口读 30 文件
                </button>
                <button type="button" className={`cc-play-pill ${useSubagent ? 'cc-play-pill--active' : ''}`} onClick={() => { playPackBurst(); setUseSubagent(true); }}>
                  派 Explore Subagent 隔窗探索
                </button>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }} className="mono">
                  <span>主 Agent 上下文窗口占用</span>
                  <strong style={{ color: useSubagent ? 'var(--cc-emerald)' : 'var(--cc-rose)' }}>
                    {useSubagent ? '12% (仅收 480 tok 精炼结论)' : '86% (塞入 85,000 tok 噪音濒临腐烂!)'}
                  </strong>
                </div>
                <div className="cc-meter-bar">
                  <div
                    className="cc-meter-fill"
                    style={{
                      width: useSubagent ? '12%' : '86%',
                      background: useSubagent ? 'var(--cc-emerald)' : 'var(--cc-rose)',
                    }}
                  />
                </div>
              </div>

              <div className={`lab-result ${useSubagent ? 'lab-result--good' : 'lab-result--bad'}`}>
                <div className="lab-result-verdict">
                  {useSubagent
                    ? 'Subagent 独立窗口跑完 30 个文件检索后就地销毁 85K 过程噪音，只将精准文件行号与根因报告回传主循环！'
                    : '30 个文件的全文永久滞留在主窗口，后续写代码推理质量急剧下降且极快触发 /compact！'}
                </div>
              </div>
            </section>

            <section className="cc-play-card">
              <div className="cc-play-card-title">
                <span><GitBranch size={15} style={{ verticalAlign: -2, marginRight: 6 }} />双并行编码 Subagent 目录隔离</span>
                <button type="button" className="cdx-inline-link" style={{ color: 'var(--cc-accent)' }} onClick={() => onJumpToLesson('cc-worktree-isolation', 1)}>
                  Worktree 课 <ArrowRight size={12} />
                </button>
              </div>
              <div className="cc-play-pills">
                <button type="button" className={`cc-play-pill ${!useWorktree ? 'cc-play-pill--active' : ''}`} onClick={() => { playCardFlip(); setUseWorktree(false); }}>
                  共享同一工作目录
                </button>
                <button type="button" className={`cc-play-pill ${useWorktree ? 'cc-play-pill--active' : ''}`} onClick={() => { playPackBurst(); setUseWorktree(true); }}>
                  isolation: worktree（推荐）
                </button>
              </div>
              <div className="cc-cascade-list">
                <div className={`cc-cascade-step ${useWorktree ? 'cc-cascade-step--pass' : 'cc-cascade-step--block'}`}>
                  <span className="mono">Subagent A (feat/auth)</span>
                  <span>{useWorktree ? '独立目录 .worktrees/auth · 测试通过' : '改写 src/index.ts 被 B 覆盖冲突!'}</span>
                </div>
                <div className={`cc-cascade-step ${useWorktree ? 'cc-cascade-step--pass' : 'cc-cascade-step--block'}`}>
                  <span className="mono">Subagent B (fix/cache)</span>
                  <span>{useWorktree ? '独立目录 .worktrees/cache · 干净提交分支' : 'git checkout 踩烂 A 的暂存区!'}</span>
                </div>
                <div className="cc-cascade-step cc-cascade-step--pass">
                  <span className="mono"><CheckCircle2 size={13} style={{ verticalAlign: -2, marginRight: 4 }} />Auto Memory</span>
                  <span>两棵 Worktree 仍共享同一份 MEMORY.md 踩坑经验</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

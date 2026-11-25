import { useState } from 'react';
import { ArrowRight, BookOpen, FlaskConical, GitBranch, Layers, RefreshCw, Shield, Sparkles } from 'lucide-react';
import { CLAUDE_CODE_BUNDLE } from '../../data/harnesses/claude-code';
import { playCardFlip, playStepTick } from '../../utils/sound';

interface ClaudeStudioViewProps {
  completedLessons: Set<string>;
  onJumpToLesson: (slug: string, stepNumber?: number) => void;
  onOpenPlayground: () => void;
  onOpenDeck: () => void;
}

const SPEECH_LINES = [
  '软建议写进 CLAUDE.md，绝不能出错的硬红线交给 PreToolUse Hook。',
  '切换新任务时直接输入 /clear，别让旧日志把上下文拖垮。',
  '要翻 30 个文件查 Bug？派 Explore Subagent 去独立窗口探索，主窗口只收结论。',
  '多个 Agent 并行改代码？一行 isolation: worktree 秒建独立工作目录。',
  '哪怕开启 bypassPermissions，PreToolUse Hook 依然 100% 强制执行。',
];

const PILLARS = [
  { num: '01', chapterId: 'cc-ch01', slug: 'cc-master-loop', icon: RefreshCw, title: '单主循环与 Agentic Search' },
  { num: '02', chapterId: 'cc-ch02', slug: 'cc-hooks-lifecycle', icon: Shield, title: 'Hooks 护栏与权限级联' },
  { num: '03', chapterId: 'cc-ch03', slug: 'cc-memory-hierarchy', icon: Layers, title: 'CLAUDE.md 分层记忆' },
  { num: '04', chapterId: 'cc-ch04', slug: 'cc-subagent-delegation', icon: GitBranch, title: 'Subagent 与 Worktree 隔离' },
];

/** Claude Code 欢迎画室：透明全身立绘 Claude-chan + 四大章节入口。 */
export function ClaudeStudioView({
  completedLessons,
  onJumpToLesson,
  onOpenPlayground,
  onOpenDeck,
}: ClaudeStudioViewProps) {
  const [lineIdx, setLineIdx] = useState(0);
  const currentLine = SPEECH_LINES[lineIdx % SPEECH_LINES.length];
  const allLessons = CLAUDE_CODE_BUNDLE.chapters.flatMap((c) => c.lessons);
  const doneCount = allLessons.filter((l) => completedLessons.has(l.slug)).length;

  const cycleSpeech = () => {
    playCardFlip();
    setLineIdx((i) => (i + 1) % SPEECH_LINES.length);
  };

  return (
    <div className="cc-studio-scroll">
      <div className="cc-studio-page">
        <section className="cc-hero">
          <div className="cc-hero-copy">
            <h1 className="cc-hero-title">
              用<em>极简单主循环</em>释放推理上限，<br />
              用<em>确定性 Hooks</em> 守住生产底线
            </h1>

            <div className="cc-hero-actions">
              <button
                type="button"
                className="cc-btn-primary"
                onClick={() => {
                  playStepTick();
                  const next = allLessons.find((l) => !completedLessons.has(l.slug)) ?? allLessons[0];
                  onJumpToLesson(next.slug, 1);
                }}
              >
                <BookOpen size={15} /> {doneCount > 0 ? '继续学习' : '开始学习'} <ArrowRight size={15} />
              </button>
              <button
                type="button"
                className="cc-btn-ghost"
                onClick={() => {
                  playStepTick();
                  onOpenPlayground();
                }}
              >
                <FlaskConical size={15} /> 演练场
              </button>
              <button
                type="button"
                className="cc-btn-ghost"
                onClick={() => {
                  playStepTick();
                  onOpenDeck();
                }}
              >
                <Sparkles size={15} /> 全息卡册
              </button>
            </div>
          </div>

          <div
            className="cc-standee-stage"
            onClick={cycleSpeech}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && cycleSpeech()}
            title="点击 Claude-chan 切换下一句"
          >
            <div className="cc-speech-bubble" key={lineIdx}>
              <span className="cc-speech-bubble-text">{currentLine}</span>
            </div>
            <div className="cc-standee-figure">
              <div className="cc-standee-aura" aria-hidden="true" />
              <img
                src="/claude-chan-standee.png"
                alt="Claude-chan 全身立绘"
                className="cc-standee-img"
                draggable={false}
              />
            </div>
          </div>
        </section>

        <section className="cc-pillars-grid" aria-label="Claude Code 章节入口">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            const ch = CLAUDE_CODE_BUNDLE.chapters.find((c) => c.id === p.chapterId);
            const chDone = ch ? ch.lessons.filter((l) => completedLessons.has(l.slug)).length : 0;
            const chTotal = ch ? ch.lessons.length : 2;
            return (
              <button
                key={p.num}
                type="button"
                className="cc-pillar-card"
                onClick={() => {
                  playStepTick();
                  onJumpToLesson(p.slug, 1);
                }}
              >
                <div className="cc-pillar-top">
                  <span className="cc-pillar-num mono">{p.num}</span>
                  <Icon size={17} style={{ color: 'var(--cc-accent)' }} />
                </div>
                <h2 className="cc-pillar-title">{p.title}</h2>
                <div className="cc-pillar-foot">
                  <span className="mono">{chDone}/{chTotal}</span>
                  <ArrowRight size={14} />
                </div>
              </button>
            );
          })}
        </section>
      </div>
    </div>
  );
}

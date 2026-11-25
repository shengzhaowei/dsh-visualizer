import { useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  BookOpen,
  Cpu,
  FlaskConical,
  GitBranch,
  Layers,
  Lock,
  Network,
  Package,
  RefreshCw,
  Shield,
  Sparkles,
  Terminal,
  type LucideIcon,
} from 'lucide-react';
import type { Chapter } from '../types/lesson';
import type { HarnessStudioConfig, StudioIconName } from '../data/studios';
import { playCardFlip, playStepTick } from '../utils/sound';

const STUDIO_ICONS: Record<StudioIconName, LucideIcon> = {
  layers: Layers,
  cpu: Cpu,
  'refresh-cw': RefreshCw,
  shield: Shield,
  package: Package,
  terminal: Terminal,
  'git-branch': GitBranch,
  network: Network,
  lock: Lock,
  sparkles: Sparkles,
};

interface HarnessStudioViewProps {
  config: HarnessStudioConfig;
  chapters: Chapter[];
  completedLessons: Set<string>;
  onJumpToLesson: (slug: string, stepNumber?: number) => void;
  onOpenMindmap: () => void;
  onOpenDeck: () => void;
  extraAction?: {
    label: string;
    onClick: () => void;
  };
}

/** 通用架构欢迎画室：专属透明全身立绘互动气泡 + 主标题行动入口 + 章节卡片网格。 */
export function HarnessStudioView({
  config,
  chapters,
  completedLessons,
  onJumpToLesson,
  onOpenMindmap,
  onOpenDeck,
  extraAction,
}: HarnessStudioViewProps) {
  const [lineIdx, setLineIdx] = useState(0);
  const currentLine = config.speechLines[lineIdx % config.speechLines.length];
  const allLessons = chapters.flatMap((c) => c.lessons);
  const doneCount = allLessons.filter((l) => completedLessons.has(l.slug)).length;

  const cycleSpeech = () => {
    playCardFlip();
    setLineIdx((i) => (i + 1) % config.speechLines.length);
  };

  const themeVars = {
    ['--cc-accent' as string]: config.accent,
    ['--cc-accent-deep' as string]: config.accentDeep,
    ['--cc-accent-soft' as string]: config.accentSoft,
    ['--cc-glow' as string]: config.glow,
  } as CSSProperties;

  return (
    <div className="cc-studio-scroll" style={themeVars}>
      <div className="cc-studio-page">
        <section className="cc-hero">
          <div className="cc-hero-copy">
            <h1 className="cc-hero-title">
              {config.headline.prefix1}
              <em>{config.headline.em1}</em>
              {config.headline.suffix1}
              <br />
              {config.headline.prefix2}
              <em>{config.headline.em2}</em>
              {config.headline.suffix2}
            </h1>

            <div className="cc-hero-actions">
              <button
                type="button"
                className="cc-btn-primary"
                onClick={() => {
                  playStepTick();
                  const next = allLessons.find((l) => !completedLessons.has(l.slug)) ?? allLessons[0];
                  if (next) onJumpToLesson(next.slug, 1);
                }}
              >
                <BookOpen size={15} /> {doneCount > 0 ? '继续学习' : '开始学习'} <ArrowRight size={15} />
              </button>
              <button
                type="button"
                className="cc-btn-ghost"
                onClick={() => {
                  playStepTick();
                  onOpenMindmap();
                }}
              >
                <Network size={15} /> 源码脑图
              </button>
              {extraAction && (
                <button
                  type="button"
                  className="cc-btn-ghost"
                  onClick={() => {
                    playStepTick();
                    extraAction.onClick();
                  }}
                >
                  <FlaskConical size={15} /> {extraAction.label}
                </button>
              )}
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
            title={`点击 ${config.mascotName} 切换下一句`}
          >
            <div className="cc-speech-bubble" key={lineIdx}>
              <span className="cc-speech-bubble-text">{currentLine}</span>
            </div>
            <div className="cc-standee-figure">
              <div className="cc-standee-aura" aria-hidden="true" />
              <img
                src={config.standeeSrc}
                alt={config.standeeAlt}
                className="cc-standee-img"
                draggable={false}
              />
            </div>
          </div>
        </section>

        <section
          className={`cc-pillars-grid ${config.pillars.length >= 5 ? 'cc-pillars-grid--three' : ''}`}
          aria-label="章节入口"
        >
          {config.pillars.map((p) => {
            const Icon = STUDIO_ICONS[p.icon];
            const ch = chapters.find((c) => c.id === p.chapterId);
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
                  <span className="mono">
                    {chDone}/{chTotal}
                  </span>
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

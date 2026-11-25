import type { MouseEvent } from 'react';
import { ArrowLeft, BookOpen, Code2, ExternalLink, Home, Menu, Moon, Network, Search, Sparkles, Sun, Volume2, VolumeX, Waves } from 'lucide-react';

export type DshMode = 'studio' | 'learn' | 'mindmap' | 'cheatsheet' | 'deck';
export type HarnessMode = DshMode;

interface TopBarProps {
  brandName: string;
  brandIcon: string;
  repoUrl: string;
  repoLabel?: string;
  mode: HarnessMode;
  theme: 'light' | 'dark' | 'deepsea';
  soundMuted: boolean;
  unlockedCardsCount: number;
  totalCardsCount: number;
  onChangeMode: (mode: HarnessMode) => void;
  onOpenSearch: () => void;
  onToggleSound: () => void;
  onToggleTheme: (e: MouseEvent<HTMLButtonElement>) => void;
  onOpenMobileDrawer: () => void;
  onBackToPortal: () => void;
  onGoFirstLesson: () => void;
}

export function TopBar({
  brandName,
  brandIcon,
  repoUrl,
  repoLabel = '源码仓库',
  mode,
  theme,
  soundMuted,
  unlockedCardsCount,
  totalCardsCount,
  onChangeMode,
  onOpenSearch,
  onToggleSound,
  onToggleTheme,
  onOpenMobileDrawer,
  onBackToPortal,
  onGoFirstLesson,
}: TopBarProps) {
  return (
    <header className="topbar">
      <button type="button" className="tactile-btn topbar-icon-btn topbar-menu-btn" onClick={onOpenMobileDrawer} aria-label="打开课程目录">
        <Menu size={15} />
      </button>
      <button type="button" className="topbar-pill" onClick={onBackToPortal} title="返回 Learn Agent 学习包">
        <ArrowLeft size={13} /> Learn Agent
      </button>
      <div className="brand" onClick={onGoFirstLesson} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onGoFirstLesson()}>
        <img className="brand-mark-img" src={brandIcon} alt={brandName} />
        <span className="brand-title">{brandName}</span>
      </div>
      <nav className="topbar-modes" aria-label="视图切换">
        <button type="button" className={`topbar-pill ${mode === 'studio' ? 'topbar-pill--active' : ''}`} onClick={() => onChangeMode('studio')}>
          <Home size={13} /> 欢迎画室
        </button>
        <button type="button" className={`topbar-pill ${mode === 'mindmap' ? 'topbar-pill--active' : ''}`} onClick={() => onChangeMode('mindmap')}>
          <Network size={13} /> 源码脑图
        </button>
        <button type="button" className={`topbar-pill ${mode === 'learn' ? 'topbar-pill--active' : ''}`} onClick={() => onChangeMode('learn')}>
          <BookOpen size={13} /> 学习
        </button>
        <button type="button" className={`topbar-pill ${mode === 'cheatsheet' ? 'topbar-pill--active' : ''}`} onClick={() => onChangeMode('cheatsheet')}>
          速查表
        </button>
        <button type="button" className={`topbar-pill ${mode === 'deck' ? 'topbar-pill--active' : ''}`} onClick={() => onChangeMode('deck')}>
          <Sparkles size={13} /> 卡册
          <span className="topbar-deck-badge">{unlockedCardsCount}/{totalCardsCount}</span>
        </button>
      </nav>
      <div className="topbar-spacer" />
      <button type="button" className="topbar-search" onClick={onOpenSearch} aria-label="搜索课程">
        <Search size={13} />
        <span>搜索课程…</span>
        <span className="kbd">Ctrl K</span>
      </button>
      <div className="topbar-links">
        <a className="topbar-pill" href={repoUrl} target="_blank" rel="noopener noreferrer">
          <Code2 size={13} /> {repoLabel} <ExternalLink size={11} />
        </a>
      </div>
      <button
        type="button"
        className="tactile-btn topbar-icon-btn"
        onClick={onToggleSound}
        title={soundMuted ? '开启音效' : '静音'}
        aria-label={soundMuted ? '开启音效' : '静音'}
        aria-pressed={!soundMuted}
      >
        {soundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
      </button>
      <button
        type="button"
        className="tactile-btn topbar-icon-btn topbar-theme-btn"
        onClick={onToggleTheme}
        title={theme === 'light' ? '切换深海主题' : theme === 'deepsea' ? '切换深色主题' : '切换浅色主题'}
        aria-label="切换主题"
      >
        {theme === 'light' ? <Waves size={15} /> : theme === 'deepsea' ? <Moon size={15} /> : <Sun size={15} />}
      </button>
    </header>
  );
}

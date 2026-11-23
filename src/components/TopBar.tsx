import type { MouseEvent } from 'react';
import { BookOpen, Code2, ExternalLink, Menu, Moon, Search, Sun } from 'lucide-react';

export type AppMode = 'learn' | 'cheatsheet';

interface TopBarProps {
  mode: AppMode;
  theme: 'light' | 'dark';
  onChangeMode: (mode: AppMode) => void;
  onOpenSearch: () => void;
  onToggleTheme: (e: MouseEvent<HTMLButtonElement>) => void;
  onOpenMobileDrawer: () => void;
  onGoHome: () => void;
}

export function TopBar({ mode, theme, onChangeMode, onOpenSearch, onToggleTheme, onOpenMobileDrawer, onGoHome }: TopBarProps) {
  return (
    <header className="topbar">
      <button type="button" className="tactile-btn topbar-icon-btn topbar-menu-btn" onClick={onOpenMobileDrawer} aria-label="打开课程目录">
        <Menu size={15} />
      </button>
      <div className="brand" onClick={onGoHome} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onGoHome()}>
        <span className="brand-mark">DS</span>
        <span>
          <span className="brand-title">DSH Agent Loop Visualizer</span>
          <br />
          <span className="brand-sub">一张图看懂 DeepSeek Harness · 一切皆插件</span>
        </span>
      </div>
      <nav className="topbar-modes" aria-label="视图切换">
        <button type="button" className={`topbar-pill ${mode === 'learn' ? 'topbar-pill--active' : ''}`} onClick={() => onChangeMode('learn')}>
          <BookOpen size={13} /> 学习
        </button>
        <button type="button" className={`topbar-pill ${mode === 'cheatsheet' ? 'topbar-pill--active' : ''}`} onClick={() => onChangeMode('cheatsheet')}>
          速查表
        </button>
      </nav>
      <div className="topbar-spacer" />
      <button type="button" className="topbar-search" onClick={onOpenSearch} aria-label="搜索课程">
        <Search size={13} />
        <span>搜索课程…</span>
        <span className="kbd">Ctrl K</span>
      </button>
      <div className="topbar-links">
        <a className="topbar-pill" href="https://github.com/deepseek-ai/deepseek-harness" target="_blank" rel="noopener noreferrer">
          <Code2 size={13} /> DSH 源码 <ExternalLink size={11} />
        </a>
        <a className="topbar-pill" href="https://namiai.tech/dsh/" target="_blank" rel="noopener noreferrer">
          namiai.tech/dsh <ExternalLink size={11} />
        </a>
      </div>
      <button type="button" className="tactile-btn topbar-icon-btn" onClick={onToggleTheme} aria-label={theme === 'dark' ? '切换到浅色' : '切换到深色'}>
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </header>
  );
}

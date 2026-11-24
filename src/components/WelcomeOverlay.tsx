import { useEffect, useRef } from 'react';
import { ArrowRight, Boxes, Map, Package, X } from 'lucide-react';

interface WelcomeOverlayProps {
  isOpen: boolean;
  onStart: () => void;
  onDismiss: () => void;
}

const ROWS = [
  { icon: Boxes, title: '一切皆插件', text: 'DSH 的核心思想：Cordis 主板 + 插件，拼出整个 Agent 循环' },
  { icon: Map, title: '6 章 · 14 课 · 84 步', text: '跟着舞台上的架构图，一步一步拆' },
  { icon: Package, title: '跟着数据包走', text: '每条边上的小药丸，就是模块之间流动的真实数据' },
];

export function WelcomeOverlay({ isOpen, onStart, onDismiss }: WelcomeOverlayProps) {
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    startRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  return (
    <div className="guide-overlay" role="dialog" aria-modal="true" aria-label="开始引导" onClick={(event) => { if (event.target === event.currentTarget) onDismiss(); }}>
      <div className="guide-card">
        <button type="button" className="guide-close" onClick={onDismiss} aria-label="关闭引导">
          <X size={15} />
        </button>
        <img className="guide-icon" src="/whale-girl-icon.png" alt="鲸鱼娘" />
        <h2 className="guide-title">图解 DSH 源码</h2>
        <p className="guide-sub">一张图看懂 DeepSeek Harness · 一切皆插件</p>
        <div className="guide-rows">
          {ROWS.map((row) => (
            <div className="guide-row" key={row.title}>
              <span className="guide-row-icon"><row.icon size={16} /></span>
              <span className="guide-row-text"><strong>{row.title}</strong>{row.text}</span>
            </div>
          ))}
        </div>
        <div className="guide-actions">
          <button type="button" className="guide-start" ref={startRef} onClick={onStart}>
            开始学习 <ArrowRight size={15} />
          </button>
          <button type="button" className="guide-skip" onClick={onDismiss}>直接进入</button>
        </div>
        <p className="guide-note">14 课 · 84 步 · 随时按 Ctrl K 搜索 · 右上角可切换深海主题</p>
      </div>
    </div>
  );
}

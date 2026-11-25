import { useEffect, useRef } from 'react';
import { ArrowRight, Boxes, Map, Package, X } from 'lucide-react';
import { ALL_LESSONS, CHAPTERS } from '../data/curriculum';

interface WelcomeOverlayProps {
  isOpen: boolean;
  onStart: () => void;
  onDismiss: () => void;
}

const TOTAL_CHAPTERS = CHAPTERS.length;
const TOTAL_LESSONS = ALL_LESSONS.length;
const TOTAL_STEPS = ALL_LESSONS.reduce((sum, l) => sum + l.steps.length, 0);

const ROWS = [
  { icon: Boxes, title: '一切皆插件', text: 'DSH 的核心思想：Cordis 主板 + dsh-scope 作用域，拼出完整 Agent 循环' },
  { icon: Map, title: `${TOTAL_CHAPTERS} 章 · ${TOTAL_LESSONS} 课 · ${TOTAL_STEPS} 步`, text: '先看全景旅程，再逐层拆解主板、循环、安全审批与装机清单' },
  { icon: Package, title: '跟着数据包走', text: '每条边上流动的光点就是模块间传递的数据，悬停连线可查看具体载荷' },
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
      </div>
    </div>
  );
}

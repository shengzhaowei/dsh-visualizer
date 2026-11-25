import { useEffect, useRef, useState } from 'react';
import { ArrowRight, GitBranch, Layers, Package, RefreshCw, Shield, Sparkles } from 'lucide-react';
import type { PluginHoloCard } from '../data/cards';
import { Spring } from '../utils/spring';
import { playCardFlip } from '../utils/sound';

interface HoloCardProps {
  card: PluginHoloCard;
  size?: 'md' | 'lg';
  onJumpToLesson?: (slug: string) => void;
  /** 是否默认显示正面（可控或非受控） */
  initialFlipped?: boolean;
}

const ICONS = {
  layers: Layers,
  'git-branch': GitBranch,
  'refresh-cw': RefreshCw,
  shield: Shield,
  package: Package,
  sparkles: Sparkles,
};

function prefersReducedMotion(): boolean {
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** 通用 3D 全息插件卡：Spring 弹簧物理驱动倾角与回弹，多层纯 CSS 全息箔片反光，点击 3D 翻转看设计决策。 */
export function HoloCard({ card, size = 'md', onJumpToLesson, initialFlipped = false }: HoloCardProps) {
  const [flipped, setFlipped] = useState(initialFlipped);
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);

  const springsRef = useRef({
    rx: new Spring(0, 210, 20),
    ry: new Spring(0, 210, 20),
    mx: new Spring(50, 180, 22),
    my: new Spring(50, 180, 22),
    glare: new Spring(0, 160, 22),
  });

  const ensureLoop = () => {
    if (rafRef.current !== null) return;
    lastTsRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTsRef.current) / 1000;
      lastTsRef.current = now;
      const s = springsRef.current;
      const rx = s.rx.step(dt);
      const ry = s.ry.step(dt);
      const mx = s.mx.step(dt);
      const my = s.my.step(dt);
      const glare = s.glare.step(dt);

      const el = cardRef.current;
      if (el) {
        el.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
        el.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
        el.style.setProperty('--mx', `${mx.toFixed(2)}%`);
        el.style.setProperty('--my', `${my.toFixed(2)}%`);
        el.style.setProperty('--glare', glare.toFixed(3));
        el.style.setProperty('--foil-x', `${(mx * 1.4 - 20).toFixed(1)}%`);
        el.style.setProperty('--foil-y', `${(my * 1.4 - 20).toFixed(1)}%`);
      }

      if (
        s.rx.isSettled(0.02) &&
        s.ry.isSettled(0.02) &&
        s.mx.isSettled(0.08) &&
        s.my.isSettled(0.08) &&
        s.glare.isSettled(0.005)
      ) {
        rafRef.current = null;
        return;
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const px = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const py = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const s = springsRef.current;
    s.ry.setTarget((px - 0.5) * 24);
    s.rx.setTarget((0.5 - py) * 20);
    s.mx.setTarget(px * 100);
    s.my.setTarget(py * 100);
    s.glare.setTarget(1);
    ensureLoop();
  };

  const handlePointerEnter = () => {
    setHovered(true);
    if (prefersReducedMotion()) return;
    springsRef.current.glare.setTarget(0.85);
    ensureLoop();
  };

  const handlePointerLeave = () => {
    setHovered(false);
    const s = springsRef.current;
    s.rx.setTarget(0);
    s.ry.setTarget(0);
    s.mx.setTarget(50);
    s.my.setTarget(50);
    s.glare.setTarget(0);
    ensureLoop();
  };

  const toggleFlip = () => {
    playCardFlip();
    setFlipped((f) => !f);
  };

  const Icon = ICONS[card.icon];

  return (
    <div
      ref={cardRef}
      className={`holo-card holo-card--${card.foil} holo-card--${size} ${hovered ? 'holo-card--hovered' : ''}`}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={toggleFlip}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleFlip();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`${card.title} 全息卡，点击翻转查看核心设计决策`}
    >
      <div className={`holo-card-inner ${flipped ? 'holo-card-inner--flipped' : ''}`}>
        {/* 正面：全息箔片视觉 + 核心原语 */}
        <div className="holo-face holo-face--front">
          <div className="holo-foil" aria-hidden="true" />
          <div className="holo-glare" aria-hidden="true" />
          <div className="holo-content">
            <div className="holo-top">
              <span className="holo-code mono">{card.code}</span>
              <span className={`holo-rarity holo-rarity--${card.rarity} mono`}>{card.rarity}</span>
            </div>

            <div className="holo-emblem-wrap">
              <div className="holo-emblem-ring">
                {card.rarity === 'EX' ? (
                  <img src="/whale-girl-icon.png" alt="鲸鱼娘" className="holo-whale-img" />
                ) : (
                  <Icon size={size === 'lg' ? 40 : 32} strokeWidth={1.9} />
                )}
              </div>
              <span className="holo-pkg mono">{card.pkgPath}</span>
            </div>

            <div className="holo-head">
              <h3 className="holo-title">{card.title}</h3>
            </div>

            <p className="holo-motto">{card.motto}</p>

            <div className="holo-stats">
              {card.stats.map((st) => (
                <div key={st.label} className="holo-stat">
                  <span className="holo-stat-label">{st.label}</span>
                  <span className="holo-stat-val mono">{st.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 背面：3 条黄金设计决策 + 课程跳转 */}
        <div className="holo-face holo-face--back">
          <div className="holo-foil holo-foil--subtle" aria-hidden="true" />
          <div className="holo-glare" aria-hidden="true" />
          <div className="holo-content holo-content--back">
            <div className="holo-top">
              <span className="holo-code mono">{card.code}</span>
              <span className={`holo-rarity holo-rarity--${card.rarity} mono`}>{card.rarity}</span>
            </div>
            <h4 className="holo-back-title">{card.title}</h4>
            <ul className="holo-decisions">
              {card.decisions.map((d, i) => (
                <li key={i}>
                  <div className="holo-dec-q">{d.q}</div>
                  <div className="holo-dec-a">{d.a}</div>
                </li>
              ))}
            </ul>
            {onJumpToLesson && (
              <div className="holo-back-actions">
                <button
                  type="button"
                  className="holo-jump-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onJumpToLesson(card.lessonSlug);
                  }}
                >
                  对应课程 <ArrowRight size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

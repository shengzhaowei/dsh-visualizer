import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import type { PluginHoloCard } from '../data/cards';
import { HoloCard } from './HoloCard';
import { playPackBurst, playPackRip } from '../utils/sound';

interface PluginPackModalProps {
  card: PluginHoloCard | null;
  isDemo?: boolean;
  packLabel?: string;
  brandIcon?: string;
  onClose: () => void;
  onJumpToLesson?: (slug: string) => void;
  onOpenDeck?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vrot: number;
  life: number;
  maxLife: number;
}

const PARTICLE_COLORS = ['#7fc278', '#6fe3f2', '#bda1e8', '#f5c46b', '#ff8c7a', '#ffffff'];

/** 生成不规则锯齿撕裂路径（72 段），模拟真实铝箔卡包封口。 */
function buildJaggedPath(width: number, yBase: number, segments = 72): string {
  const step = width / segments;
  let d = `M 0 ${yBase}`;
  for (let i = 1; i <= segments; i++) {
    const x = i * step;
    const amp = i % 2 === 0 ? -3.2 : 3.2;
    const jitter = Math.sin(i * 1.9) * 1.1;
    d += ` L ${x.toFixed(1)} ${(yBase + amp + jitter).toFixed(1)}`;
  }
  return d;
}

function prefersReducedMotion(): boolean {
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** 拆插件卡包弹窗：支持拖动铝箔封条撕开（带实时 Web Audio 撕裂声）或一键/回车拆包，完成后粒子绽放并弹出 3D 全息卡。 */
export function PluginPackModal({
  card,
  isDemo = false,
  packLabel = 'DEEPSEEK HARNESS · PLUGIN PACK',
  brandIcon = '/whale-girl-icon.png',
  onClose,
  onJumpToLesson,
  onOpenDeck,
}: PluginPackModalProps) {
  const [phase, setPhase] = useState<'sealed' | 'ripping' | 'revealed'>('sealed');
  const [ripProgress, setRipProgress] = useState(0);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const stripWidthRef = useRef(260);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const packRef = useRef<HTMLDivElement>(null);

  const jaggedPath = useMemo(() => buildJaggedPath(300, 12, 72), []);

  useEffect(() => {
    if (!card) return;
    setPhase('sealed');
    setRipProgress(0);
    draggingRef.current = false;
  }, [card]);

  const fireConfetti = useCallback(() => {
    if (prefersReducedMotion()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = w / 2;
    const cy = h / 2 - 20;
    const particles: Particle[] = Array.from({ length: 64 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 180 + Math.random() * 440;
      return {
        x: cx + (Math.random() - 0.5) * 80,
        y: cy + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 180,
        size: 4 + Math.random() * 6,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 11,
        life: 0,
        maxLife: 0.75 + Math.random() * 0.6,
      };
    });

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      let alive = 0;
      for (const p of particles) {
        p.life += dt;
        if (p.life >= p.maxLife) continue;
        alive++;
        p.vy += 680 * dt;
        p.vx *= 0.985;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vrot * dt;
        const alpha = 1 - p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
        ctx.restore();
      }
      if (alive > 0) window.requestAnimationFrame(loop);
      else ctx.clearRect(0, 0, w, h);
    };
    window.requestAnimationFrame(loop);
  }, []);

  const triggerReveal = useCallback(() => {
    setRipProgress(1);
    setPhase('revealed');
    playPackBurst();
    fireConfetti();
  }, [fireConfetti]);

  const autoRip = useCallback(() => {
    if (phase !== 'sealed') return;
    if (prefersReducedMotion()) {
      triggerReveal();
      return;
    }
    setPhase('ripping');
    const start = performance.now();
    const duration = 360;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setRipProgress(eased);
      playPackRip(eased);
      if (t < 1) {
        window.requestAnimationFrame(step);
      } else {
        triggerReveal();
      }
    };
    window.requestAnimationFrame(step);
  }, [phase, triggerReveal]);

  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.key === 'Enter' || e.key === ' ') && phase === 'sealed') {
        e.preventDefault();
        autoRip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, phase, autoRip, onClose]);

  if (!card) return null;

  const onStripPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'sealed') return;
    draggingRef.current = true;
    startXRef.current = e.clientX;
    stripWidthRef.current = Math.max(180, packRef.current?.getBoundingClientRect().width ?? 280);
    e.currentTarget.setPointerCapture(e.pointerId);
    playPackRip(0.05);
  };

  const onStripPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || phase !== 'sealed') return;
    const dx = Math.max(0, e.clientX - startXRef.current);
    const p = Math.min(1, dx / (stripWidthRef.current * 0.72));
    setRipProgress(p);
    if (p > 0.04) playPackRip(p);
    if (p >= 0.88) {
      draggingRef.current = false;
      triggerReveal();
    }
  };

  const onStripPointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (ripProgress >= 0.55) autoRip();
    else setRipProgress(0);
  };

  return (
    <div
      className="pack-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`拆开 ${card.title} 插件卡包`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <canvas ref={canvasRef} className="pack-confetti" aria-hidden="true" />

      <div className="pack-stage">
        <button type="button" className="pack-close-btn" onClick={onClose} aria-label="关闭拆包弹窗">
          <X size={16} />
        </button>

        {phase !== 'revealed' ? (
          <div className="pack-sealed-wrap">
            <div className="pack-banner">
              <Sparkles size={14} />
              <span>{isDemo ? '体验拆包 · 拖动封条或点击开包' : '章节通关解锁 · 新插件全息卡'}</span>
            </div>

            <div
              ref={packRef}
              className={`foil-pack foil-pack--${card.foil}`}
              style={{ ['--rip' as string]: ripProgress.toFixed(3) }}
              onClick={() => {
                if (!draggingRef.current && ripProgress < 0.05) autoRip();
              }}
            >
              <div
                className="foil-pack-strip"
                onPointerDown={onStripPointerDown}
                onPointerMove={onStripPointerMove}
                onPointerUp={onStripPointerUp}
                onPointerCancel={onStripPointerUp}
                onClick={(e) => e.stopPropagation()}
                role="slider"
                aria-label="向右拖动撕开卡包封条"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(ripProgress * 100)}
                tabIndex={0}
              >
                <div className="foil-pack-strip-crimp" />
                <span className="foil-pack-strip-hint">
                  向右拖动撕开 ⟶ {Math.round(ripProgress * 100)}%
                </span>
                <svg className="foil-pack-teeth" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
                  <path d={jaggedPath} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeDasharray="4 3" />
                </svg>
              </div>

              <div className="foil-pack-body">
                <div className="foil-pack-sheen" aria-hidden="true" />
                <div className="foil-pack-label mono">{packLabel}</div>
                <div className="foil-pack-emblem">
                  <img src={brandIcon} alt={card.title} />
                </div>
                <div className="foil-pack-chapter">{card.subtitle}</div>
                <div className="foil-pack-rarity mono">含 1 张 {card.rarity} 级架构全息卡</div>
                <div className="foil-pack-crimp-bottom" />
              </div>
            </div>

            <div className="pack-actions">
              <button type="button" className="tactile-btn tactile-btn--primary" onClick={autoRip}>
                <Sparkles size={14} /> 一键拆开卡包（Enter）
              </button>
              <button type="button" className="pack-skip-btn" onClick={onClose}>
                稍后再看
              </button>
            </div>
          </div>
        ) : (
          <div className="pack-revealed-wrap">
            <div className="pack-banner pack-banner--unlocked">
              <Sparkles size={14} />
              <span>{isDemo ? '体验展示 · 悬停倾斜，点击翻转看决策' : '已收入插件卡册 · 悬停倾斜，点击翻转'}</span>
            </div>

            <div className="pack-card-pop">
              <HoloCard
                card={card}
                size="lg"
                exIcon={brandIcon}
                onJumpToLesson={
                  onJumpToLesson
                    ? (slug) => {
                        onClose();
                        onJumpToLesson(slug);
                      }
                    : undefined
                }
              />
            </div>

            <div className="pack-actions">
              {onOpenDeck && (
                <button
                  type="button"
                  className="tactile-btn tactile-btn--primary"
                  onClick={() => {
                    onClose();
                    onOpenDeck();
                  }}
                >
                  查看全部插件卡册 <ArrowRight size={14} />
                </button>
              )}
              <button type="button" className="tactile-btn" onClick={onClose}>
                继续学习
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { playPortalWarp } from '../utils/sound';

export interface WarpRequest {
  id: number;
  harness: 'dsh' | 'pi' | 'codex' | 'claude-code' | 'langchain' | 'portal';
  label: string;
  /** 归一化起点坐标 0..1（来自被点击卡片中心） */
  originX: number;
  originY: number;
  onMidpoint: () => void;
}

interface Palette {
  bgInner: string;
  bgOuter: string;
  ring: string;
  streaks: string[];
  text: string;
}

const PALETTES: Record<WarpRequest['harness'], Palette> = {
  dsh: {
    bgInner: '#1c409c',
    bgOuter: '#08122b',
    ring: 'rgba(130, 224, 255, 0.75)',
    streaks: ['#ffffff', '#9be4ff', '#5897ff', '#c9e8ff'],
    text: '#eef7ff',
  },
  pi: {
    bgInner: '#6b3626',
    bgOuter: '#21130e',
    ring: 'rgba(255, 214, 130, 0.75)',
    streaks: ['#fff7e6', '#ffd27a', '#f28b79', '#7cc4e8'],
    text: '#fff6ea',
  },
  codex: {
    bgInner: '#362a78',
    bgOuter: '#0b0d18',
    ring: 'rgba(184, 166, 255, 0.75)',
    streaks: ['#ffffff', '#c8b8ff', '#8273ff', '#8ee6ff'],
    text: '#f3f0ff',
  },
  'claude-code': {
    bgInner: '#78341c',
    bgOuter: '#1f0e08',
    ring: 'rgba(255, 198, 164, 0.75)',
    streaks: ['#fff5ed', '#ffc7a6', '#eb845d', '#ffe0ba'],
    text: '#fff3ea',
  },
  langchain: {
    bgInner: '#135948',
    bgOuter: '#061f1a',
    ring: 'rgba(138, 245, 210, 0.75)',
    streaks: ['#f0fff9', '#8af5d2', '#2ec49c', '#ffe49e'],
    text: '#ebfff8',
  },
  portal: {
    bgInner: '#594636',
    bgOuter: '#211a14',
    ring: 'rgba(246, 210, 122, 0.65)',
    streaks: ['#fffaf0', '#f6d27a', '#e8c49b', '#ffffff'],
    text: '#fdf6ea',
  },
};

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function easeOutCubic(t: number): number {
  const k = 1 - clamp01(t);
  return 1 - k * k * k;
}

interface Streak {
  angle: number;
  radiusBase: number;
  z: number;
  speed: number;
  width: number;
  color: string;
}

const DURATION_MS = 940;
const MIDPOINT_MS = 540;

/** 顶层 60fps Canvas 2D 星际光隧穿越层：驻留在父窗口最顶层，幕后无感切换路由，零硬切帧。 */
export function PortalWarpOverlay({
  request,
  onDone,
}: {
  request: WarpRequest | null;
  onDone: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!request) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      request.onMidpoint();
      onDoneRef.current();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      request.onMidpoint();
      onDoneRef.current();
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      request.onMidpoint();
      onDoneRef.current();
      return;
    }

    playPortalWarp();

    const palette = PALETTES[request.harness] ?? PALETTES.dsh;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth;
    let h = window.innerHeight;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // 96 条透视星轨光束，分布在各个深度层
    const streaks: Streak[] = Array.from({ length: 96 }, (_, i) => ({
      angle: (i / 96) * Math.PI * 2 + (Math.random() - 0.5) * 0.14,
      radiusBase: 0.14 + Math.random() * 0.92,
      z: 0.12 + Math.random() * 1.45,
      speed: 0.75 + Math.random() * 1.05,
      width: 1.1 + Math.random() * 2.1,
      color: palette.streaks[i % palette.streaks.length],
    }));

    const start = performance.now();
    let prev = start;
    let swapped = false;
    let rafId = 0;

    const render = (now: number) => {
      const elapsed = now - start;
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const u = clamp01(elapsed / DURATION_MS);

      if (!swapped && elapsed >= MIDPOINT_MS) {
        swapped = true;
        request.onMidpoint();
      }

      ctx.clearRect(0, 0, w, h);

      // 起点从被点中的卡片中心平滑收敛到画面正中
      const centerMix = smoothstep(0.05, 0.5, u);
      const cx = (request.originX * (1 - centerMix) + 0.5 * centerMix) * w;
      const cy = (request.originY * (1 - centerMix) + 0.5 * centerMix) * h;
      const diag = Math.hypot(w, h);

      // 平滑背景幕布包络（渐入 -> 柔和驻留 -> 溶散）
      const rise = smoothstep(0.06, 0.5, u);
      const fall = 1 - easeOutCubic((u - 0.6) / 0.4);
      const veilAlpha = u < 0.6 ? rise * 0.96 : fall * 0.96;

      // 1. 径向深空光晕底幕（随进度柔和扩张）
      const portalR = diag * (0.18 + smoothstep(0, 0.58, u) * 0.95);
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, portalR);
      bg.addColorStop(0, palette.bgInner);
      bg.addColorStop(0.55, palette.bgOuter);
      bg.addColorStop(1, palette.bgOuter);
      ctx.save();
      ctx.globalAlpha = veilAlpha;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // 2. 透视星轨光束（中段平滑加速、末段柔和减速）
      const speedEnv = Math.pow(Math.sin(Math.PI * clamp01((u - 0.02) / 0.94)), 1.25);
      const streakAlpha = u < 0.62 ? smoothstep(0.04, 0.34, u) : fall;
      const focal = Math.min(w, h) * 0.52;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const s of streaks) {
        const dz = dt * (0.45 + speedEnv * 2.45) * s.speed;
        const zPrev = s.z;
        s.z -= dz;
        if (s.z <= 0.06) {
          s.z += 1.45;
          continue;
        }
        const zTail = Math.min(1.8, zPrev + speedEnv * 0.18 * s.speed);
        const rHead = (s.radiusBase * focal) / s.z;
        const rTail = (s.radiusBase * focal) / zTail;
        const cos = Math.cos(s.angle);
        const sin = Math.sin(s.angle);
        const x1 = cx + cos * rTail;
        const y1 = cy + sin * rTail;
        const x2 = cx + cos * rHead;
        const y2 = cy + sin * rHead;

        const depthFade = clamp01(1 - s.z / 1.55);
        const alpha = streakAlpha * depthFade * 0.85;
        if (alpha <= 0.01) continue;

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, s.color);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.width * (0.6 + depthFade * 1.1);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // 3. 三重柔和扩散光环（从卡片位置呼吸式展开）
      for (let i = 0; i < 3; i++) {
        const ru = clamp01((u - i * 0.1) / 0.68);
        if (ru <= 0 || ru >= 1) continue;
        const radius = easeOutCubic(ru) * diag * 0.62;
        const ringAlpha = Math.sin(Math.PI * ru) * 0.42 * streakAlpha;
        ctx.globalAlpha = ringAlpha;
        ctx.strokeStyle = palette.ring;
        ctx.lineWidth = 2.5 - i * 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. 中心柔和光核（在切换瞬间提供温柔白光溶镜，绝不刺眼）
      const flashBell = Math.sin(Math.PI * smoothstep(0.32, 0.72, u));
      if (flashBell > 0.01) {
        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, diag * 0.36);
        core.addColorStop(0, 'rgba(255, 255, 255, 0.46)');
        core.addColorStop(0.5, palette.ring);
        core.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.globalAlpha = flashBell * 0.72;
        ctx.fillStyle = core;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();

      // 5. 目标名称随隧道轻盈浮现并迎面掠过
      if (request.label) {
        const textIn = smoothstep(0.2, 0.44, u);
        const textOut = 1 - smoothstep(0.56, 0.76, u);
        const textAlpha = Math.min(textIn, textOut);
        if (textAlpha > 0.01) {
          const textScale = 0.88 + smoothstep(0.2, 0.76, u) * 0.24;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(textScale, textScale);
          ctx.globalAlpha = textAlpha;
          ctx.fillStyle = palette.text;
          ctx.font = '800 28px "Noto Sans SC", system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = palette.ring;
          ctx.shadowBlur = 18;
          ctx.fillText(request.label, 0, 0);
          ctx.restore();
        }
      }

      if (elapsed < DURATION_MS) {
        rafId = window.requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, w, h);
        onDoneRef.current();
      }
    };

    rafId = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [request]);

  if (!request) return null;

  return <canvas ref={canvasRef} className="portal-warp-canvas" aria-hidden="true" />;
}

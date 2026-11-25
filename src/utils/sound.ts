// 零外部素材 Web Audio 实时合成音效引擎：切步微动、卡片翻转、铝箔撕裂、解锁和弦。
// 静音偏好持久化到 localStorage；未发生用户交互前自动静默，不产生浏览器警告。

const STORAGE_MUTE_KEY = 'dsh-visualizer-sound-muted';

let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let lastRipSoundAt = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (isSoundMuted()) return null;
  const Ctor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => {
      /* 等待下一次用户手势 */
    });
  }
  return audioCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const len = Math.floor(ctx.sampleRate * 0.45);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buf;
  return buf;
}

export function isSoundMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_MUTE_KEY, muted ? '1' : '0');
  } catch {
    // ignore
  }
}

/** 切步翻页：极轻柔的纸片/机械微动声（26ms）。 */
export function playStepTick(): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(240, now + 0.026);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.032, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.032);
}

/** 全息卡翻转：短促空气扫频 + 轻脆落点。 */
export function playCardFlip(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(900, now);
  filter.frequency.exponentialRampToValueAtTime(2800, now + 0.09);
  filter.Q.value = 2.4;

  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.0001, now);
  nGain.gain.linearRampToValueAtTime(0.06, now + 0.025);
  nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

  src.connect(filter);
  filter.connect(nGain);
  nGain.connect(ctx.destination);
  src.start(now);
  src.stop(now + 0.12);

  const osc = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(660, now + 0.05);
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
  oGain.gain.setValueAtTime(0.0001, now + 0.05);
  oGain.gain.linearRampToValueAtTime(0.035, now + 0.06);
  oGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
  osc.connect(oGain);
  oGain.connect(ctx.destination);
  osc.start(now + 0.05);
  osc.stop(now + 0.14);
}

/** 拖动撕开铝箔封条：高频滤波短噪声脉冲（自动节流）。 */
export function playPackRip(progress: number): void {
  const nowMs = performance.now();
  if (nowMs - lastRipSoundAt < 42) return;
  lastRipSoundAt = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  const baseFreq = 1800 + Math.min(1, Math.max(0, progress)) * 2200 + Math.random() * 320;
  filter.frequency.setValueAtTime(baseFreq, now);
  filter.Q.value = 3.2;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.075, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.048);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(now, Math.random() * 0.25, 0.055);
}

/** 拆包成功爆开：清脆撕裂尾音 + 温暖大九和弦琶音。 */
export function playPackBurst(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // 铝箔彻底撕断声
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(2200, now);
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.0001, now);
  nGain.gain.linearRampToValueAtTime(0.09, now + 0.01);
  nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
  src.connect(hp);
  hp.connect(nGain);
  nGain.connect(ctx.destination);
  src.start(now, 0, 0.15);

  // 明亮晶莹的四音琶音（C5 - E5 - G5 - B5 - D6）
  const freqs = [523.25, 659.25, 783.99, 987.77, 1174.66];
  freqs.forEach((freq, i) => {
    const t = now + 0.04 + i * 0.055;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = i % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.055, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.45);
  });
}

/** 切换音效开启时的确认提示音。 */
export function playSoundEnabledPing(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  [587.33, 880].forEach((freq, i) => {
    const t = now + i * 0.06;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.045, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}

/** 穿越光隧音效：低频柔和滤波扫频 + 晶莹五度泛音（约 0.72s，丝滑不刺耳）。 */
export function playPortalWarp(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // 柔和气流滤波扫频
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 2.6;
  filter.frequency.setValueAtTime(220, now);
  filter.frequency.exponentialRampToValueAtTime(1650, now + 0.48);
  filter.frequency.exponentialRampToValueAtTime(420, now + 0.74);

  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.0001, now);
  nGain.gain.linearRampToValueAtTime(0.05, now + 0.24);
  nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

  src.connect(filter);
  filter.connect(nGain);
  nGain.connect(ctx.destination);
  src.start(now);
  src.stop(now + 0.78);

  // 温暖上升五度和弦（D4 -> A4 -> E5）
  const notes = [293.66, 440.0, 659.25];
  notes.forEach((f, i) => {
    const t = now + i * 0.07;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f * 0.92, t);
    osc.frequency.exponentialRampToValueAtTime(f * 1.06, t + 0.56);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.036, t + 0.14);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.66);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.7);
  });
}

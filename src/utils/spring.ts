// 轻量二阶弹簧物理引擎（子步进防发散），驱动全息卡 3D 倾斜、回弹与拆包动效。

const MAX_SUB_DT = 1 / 120;

export class Spring {
  value: number;
  target: number;
  velocity = 0;
  stiffness: number;
  damping: number;

  constructor(initial: number, stiffness = 220, damping = 22) {
    this.value = initial;
    this.target = initial;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  setTarget(next: number): void {
    this.target = next;
  }

  snap(next: number): void {
    this.value = next;
    this.target = next;
    this.velocity = 0;
  }

  impulse(vel: number): void {
    this.velocity += vel;
  }

  step(dtSeconds: number): number {
    let remaining = Math.min(Math.max(dtSeconds, 0), 0.064);
    while (remaining > 0) {
      const h = Math.min(remaining, MAX_SUB_DT);
      const force = -this.stiffness * (this.value - this.target);
      const drag = -this.damping * this.velocity;
      this.velocity += (force + drag) * h;
      this.value += this.velocity * h;
      remaining -= h;
    }
    return this.value;
  }

  isSettled(epsilon = 0.001): boolean {
    return Math.abs(this.value - this.target) < epsilon && Math.abs(this.velocity) < epsilon;
  }
}

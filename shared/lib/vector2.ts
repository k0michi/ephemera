export default class Vector2 {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static add(v1: Vector2, v2: Vector2): Vector2 {
    return new Vector2(v1.x + v2.x, v1.y + v2.y);
  }

  static sub(v1: Vector2, v2: Vector2): Vector2 {
    return new Vector2(v1.x - v2.x, v1.y - v2.y);
  }

  static mul(v: Vector2, s: number): Vector2 {
    return new Vector2(v.x * s, v.y * s);
  }

  static dot(v1: Vector2, v2: Vector2): number {
    return v1.x * v2.x + v1.y * v2.y;
  }

  static norm(v: Vector2): Vector2 {
    const l = Math.sqrt(v.x * v.x + v.y * v.y);
    return l === 0 ? new Vector2(0, 0) : new Vector2(v.x / l, v.y / l);
  }

  static angleBetween(v1: Vector2, v2: Vector2): number {
    const dot = v1.x * v2.x + v1.y * v2.y;
    const clamped = Math.max(-1, Math.min(1, dot));
    return Math.acos(clamped);
  }
}
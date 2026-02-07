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

  static lengthSquared(v: Vector2): number {
    return Vector2.dot(v, v);
  }

  static length(v: Vector2): number {
    return Math.sqrt(Vector2.lengthSquared(v));
  }

  static norm(v: Vector2): Vector2 {
    const l = Vector2.length(v);
    return l === 0 ? new Vector2(0, 0) : new Vector2(v.x / l, v.y / l);
  }

  static angleBetween(v1: Vector2, v2: Vector2): number {
    const l1 = Vector2.length(v1);
    const l2 = Vector2.length(v2);

    if (l1 === 0 || l2 === 0) {
      return 0;
    }

    const cosTheta = Vector2.dot(v1, v2) / (l1 * l2);
    const clamped = Math.max(-1, Math.min(1, cosTheta));
    return Math.acos(clamped);
  }
}
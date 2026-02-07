export default class MathHelper {
  static floorMod(a: number, b: number): number {
    return a - b * Math.floor(a / b);
  }

  static slerp(a1: number, a2: number, t: number): number {
    let diff = a2 - a1;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    else if (diff < -Math.PI) diff += 2 * Math.PI;

    let result = a1 + (diff * t);
    return (result + 2 * Math.PI) % (2 * Math.PI);
  }

  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  static reflect(x: number, min: number, max: number): number {
    const range = max - min;

    if (range === 0) {
      return min;
    }

    const relativeX = x - min;
    const mod = this.floorMod(relativeX, 2 * range);
    return min + (range - Math.abs(range - mod));
  }

  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  static normalize(value: number, min: number, max: number): number {
    if (max - min === 0) {
      return 0;
    }

    return (value - min) / (max - min);
  }

  static toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
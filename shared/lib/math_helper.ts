export default class MathHelper {
  static floorMod(a: number, b: number): number {
    return a - b * Math.floor(a / b);
  }

  static slerp(a1: number, a2: number, t: number): number {
    let diff = a2 - a1;
    if (diff > 180) diff -= 360;
    else if (diff < -180) diff += 360;

    let result = a1 + (diff * t);
    return (result + 360) % 360;
  }

  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  static reflect(x: number, min: number, max: number): number {
    const range = max - min;

    if (range <= 0) {
      return min;
    }

    const relativeX = x - min;
    const mod = this.floorMod(relativeX, 2 * range);
    return min + (range - Math.abs(range - mod));
  }
}
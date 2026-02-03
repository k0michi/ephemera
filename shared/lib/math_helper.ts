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
}
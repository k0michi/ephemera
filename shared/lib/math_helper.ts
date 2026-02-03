export default class MathHelper {
  static floorMod(a: number, b: number): number {
    return a - b * Math.floor(a / b);
  }
}
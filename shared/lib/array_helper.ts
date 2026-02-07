export default class ArrayHelper {
  static strictGet<T>(array: ArrayLike<T>, index: number): T {
    if (index < 0 || index >= array.length) {
      throw new Error(`Index ${index} is out of bounds for array of length ${array.length}.`);
    }

    return array[index] as T;
  }

  static strictSet<T>(array: ArrayLike<T> & { [index: number]: T }, index: number, value: T): void {
    if (index < 0 || index >= array.length) {
      throw new Error(`Index ${index} is out of bounds for array of length ${array.length}.`);
    }

    array[index] = value;
  }

  static equals<T>(a: ArrayLike<T>, b: ArrayLike<T>, compare: (x: T, y: T) => boolean = (x, y) => x === y): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (!compare(this.strictGet(a, i), this.strictGet(b, i))) {
        return false;
      }
    }

    return true;
  }

  static getOrDefault<T>(array: ArrayLike<T>, index: number, defaultValue: T): T {
    if (index < 0 || index >= array.length) {
      return defaultValue;
    }

    return array[index] as T;
  }
}
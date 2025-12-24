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
}
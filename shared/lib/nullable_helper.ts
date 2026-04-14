export default class NullableHelper {
  static unwrap<T>(value: T | null | undefined): T {
    if (value === null || value === undefined) {
      throw new Error("Expected value to be non-null and non-undefined.");
    }
    return value;
  }

  static map<T, U>(value: NonNullable<T>, fn: (val: NonNullable<T>) => U): U;
  static map<T, U>(value: undefined, fn: (val: NonNullable<T>) => U): undefined;
  static map<T, U>(value: null, fn: (val: NonNullable<T>) => U): null;
  static map<T, U>(value: NonNullable<T> | undefined, fn: (val: NonNullable<T>) => U): U | undefined;
  static map<T, U>(value: NonNullable<T> | null, fn: (val: NonNullable<T>) => U): U | null;
  static map<T, U>(
    value: NonNullable<T> | null | undefined,
    fn: (val: NonNullable<T>) => U
  ): U | null | undefined;
  static map<T, U>(
    value: NonNullable<T> | null | undefined,
    fn: (val: NonNullable<T>) => U
  ): U | null | undefined {
    if (value === null) {
      return null;
    }
    if (value === undefined) {
      return undefined;
    }
    return fn(value);
  }

  static * toIterable<T>(value: T | null | undefined): IterableIterator<T> {
    if (value != null) {
      yield value;
    }
  }
}
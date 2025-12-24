export default class NullableHelper {
  static unwrap<T>(value: T | null | undefined): T {
    if (value === null || value === undefined) {
      throw new Error("Expected value to be non-null and non-undefined.");
    }
    return value;
  }

  static map<T, U>(
    value: T | null | undefined,
    fn: (val: T) => U
  ): U | null | undefined {
    if (value === null) {
      return null;
    }
    if (value === undefined) {
      return undefined;
    }
    return fn(value);
  }
}
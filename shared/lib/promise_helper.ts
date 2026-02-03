export default class PromiseHelper {
  static then<T, U>(x: T | Promise<T>, f: (y: T) => U): U | Promise<U> {
    if (x instanceof Promise) {
      return x.then(f);
    } else {
      return f(x);
    }
  }
}
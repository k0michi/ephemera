export default class PromiseHelper {
  static then<T, U>(x: T | Promise<T>, f: (y: T) => U): U | Promise<U> {
    if (x instanceof Promise) {
      return x.then(f);
    } else {
      return f(x);
    }
  }

  static tap<T>(x: T | Promise<T>, f: (y: T) => void): T | Promise<T> {
    return this.then(x, (y) => {
      f(y);
      return y;
    });
  }
}
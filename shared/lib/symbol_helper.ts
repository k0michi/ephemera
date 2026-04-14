import 'core-js/modules/es.symbol.dispose';
import 'core-js/modules/es.symbol.async-dispose';

export default class SymbolHelper {
  static dispose: typeof Symbol.dispose = Symbol.dispose;
  static asyncDispose: typeof Symbol.asyncDispose = Symbol.asyncDispose;
}
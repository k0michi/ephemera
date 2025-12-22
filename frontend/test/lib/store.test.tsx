import { describe, it, expect } from 'vitest';
import { Store } from '../../lib/store';

class TestStore extends Store {
  value = 0;

  setValue(v: number) {
    this.value = v;
    this.notifyListeners();
  }
}

describe('Store', () => {
  it('should notify subscribers on state change', () => {
    const store = new TestStore();
    let notified = false;
    store.subscribe(() => { notified = true; });
    store.setValue(42);
    expect(notified).toBe(true);
    expect(store.value).toBe(42);
  });
});

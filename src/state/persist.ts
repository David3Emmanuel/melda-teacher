// Persistence seam for the store, kept separate from store.ts so it can be
// exercised by a runnable check with a fake key-value store (importing store.ts
// would pull in the native AsyncStorage module and its load-time side effect).
//
// Behaviour: hydrate from storage, then persist on every change. The writer is
// attached only after hydration resolves, so hydration never redundantly
// re-writes the value it just read, and the seed is persisted only once a real
// change lands (a pristine install therefore always reflects the latest seed).
// A corrupt or absent stored value leaves the seed in place.

import type { Dataset } from '../domain/models';

export interface AsyncKV {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface DataStore {
  setState(partial: { data: Dataset }): void;
  subscribe(listener: (state: { data: Dataset }) => void): () => void;
}

/**
 * Wire a store to a storage backend. Resolves once hydration has been applied
 * and the change-writer is attached (the returned promise is mainly a test hook).
 */
export function attachPersistence(store: DataStore, storage: AsyncKV, key: string): Promise<void> {
  return storage
    .getItem(key)
    .then((raw) => {
      if (raw) store.setState({ data: JSON.parse(raw) as Dataset });
    })
    .catch(() => {})
    .finally(() => {
      store.subscribe((s) => {
        void storage.setItem(key, JSON.stringify(s.data)).catch(() => {});
      });
    });
}

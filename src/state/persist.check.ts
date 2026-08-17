// Runnable check for the store's persistence seam. Guards the round-trip that
// keeps a demo alive across reloads: stored data must hydrate over the seed, a
// mutation must be written through, a pristine start must not persist anything
// yet, and a corrupt stored value must never crash the app. Run with
// `pnpm check:persist` (tsx), driven by an in-memory fake so it needs no native
// AsyncStorage.

import { attachPersistence, type AsyncKV, type DataStore } from './persist';
import type { Dataset } from '../domain/models';

function ok(value: unknown, msg?: string): asserts value {
  if (!value) throw new Error(msg ?? 'assertion failed');
}
function eq<T>(actual: T, expected: T, msg?: string): void {
  if (actual !== expected) {
    throw new Error(`${msg ?? 'not equal'}: got ${String(actual)}, want ${String(expected)}`);
  }
}

let checks = 0;
const check = async (label: string, fn: () => Promise<void>): Promise<void> => {
  await fn();
  checks++;
  console.log(`  ok  ${label}`);
};

// The seam only ever reads/writes the `data` slice, so a tagged stand-in stands
// in for the full Dataset - keeps the check about persistence, not the schema.
const KEY = 'test-key';
const asData = (tag: string): Dataset => ({ tag }) as unknown as Dataset;
const tagOf = (d: Dataset): string => (d as unknown as { tag: string }).tag;

function fakeKV(seed?: Record<string, string>): AsyncKV & { map: Map<string, string> } {
  const map = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    map,
    getItem: (k) => Promise.resolve(map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => {
      map.set(k, v);
      return Promise.resolve();
    },
  };
}

function fakeStore(initial: Dataset): DataStore & { getData: () => Dataset } {
  let state = { data: initial };
  const listeners = new Set<(s: { data: Dataset }) => void>();
  return {
    getData: () => state.data,
    setState: (partial) => {
      state = { ...state, ...partial };
      listeners.forEach((l) => l(state));
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

async function main(): Promise<void> {
  await check('stored data hydrates over the seed', async () => {
    const kv = fakeKV({ [KEY]: JSON.stringify(asData('stored')) });
    const store = fakeStore(asData('seed'));
    await attachPersistence(store, kv, KEY);
    eq(tagOf(store.getData()), 'stored');
  });

  await check('a mutation is written through to storage', async () => {
    const kv = fakeKV();
    const store = fakeStore(asData('seed'));
    await attachPersistence(store, kv, KEY);
    store.setState({ data: asData('edited') });
    const raw = kv.map.get(KEY);
    ok(raw, 'something was persisted');
    eq(tagOf(JSON.parse(raw as string) as Dataset), 'edited');
  });

  await check('a pristine start persists nothing until the first change', async () => {
    const kv = fakeKV();
    const store = fakeStore(asData('seed'));
    await attachPersistence(store, kv, KEY);
    ok(!kv.map.has(KEY), 'seed was not written on a cold start');
  });

  await check('a corrupt stored value leaves the seed intact', async () => {
    const kv = fakeKV({ [KEY]: '{ not valid json' });
    const store = fakeStore(asData('seed'));
    await attachPersistence(store, kv, KEY);
    eq(tagOf(store.getData()), 'seed');
  });

  console.log(`\n${checks} persistence checks passed.`);
}

void main();

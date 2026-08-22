// Runnable check for weakestConcept: it picks the lowest non-null mastery, skips
// concepts with no data, breaks ties toward the first given, and returns
// undefined when nothing is assessed. No framework. `pnpm check:insights` (tsx).

import type { StudentConceptMastery } from 'melda-shared';
import { weakestConcept } from './weakestConcept';

let passed = 0;
function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error('FAIL: ' + msg);
  passed++;
  console.log('  ok -', msg);
}

const c = (conceptId: string, masteryPct: number | null): StudentConceptMastery => ({
  conceptId,
  name: conceptId,
  masteryPct,
  struggling: masteryPct !== null && masteryPct < 50,
});

try {
  console.log('weakestConcept');

  ok(weakestConcept([c('a', 80), c('b', 30), c('c', 55)])?.conceptId === 'b', 'picks the lowest');
  ok(
    weakestConcept([c('a', null), c('b', 40), c('c', 90)])?.conceptId === 'b',
    'skips null mastery',
  );
  ok(
    weakestConcept([c('a', null), c('b', 70)])?.conceptId === 'b',
    'a null does not block a real pick',
  );
  ok(weakestConcept([c('a', null), c('b', null)]) === undefined, 'all-null yields undefined');
  ok(weakestConcept([]) === undefined, 'empty yields undefined');
  ok(weakestConcept([c('a', 30), c('b', 30)])?.conceptId === 'a', 'a tie keeps the first');

  console.log(`\nAll ${passed} assertions passed.`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

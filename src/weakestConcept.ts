// Picks the concept a student is weakest at - the lowest non-null mastery. The
// student drill-down points its two quick actions (see the whole class for the
// concept, or set a review on it) at this spot, so "act fast" lands where it
// helps most. Concepts with no data (masteryPct null) are skipped, and a student
// with nothing assessed yields undefined so the caller hides the actions rather
// than routing nowhere. A tie keeps the first in the given (server) order, so the
// pick is stable, not arbitrary.

import type { StudentConceptMastery } from 'melda-shared';

export function weakestConcept(
  perConcept: StudentConceptMastery[],
): StudentConceptMastery | undefined {
  let weakest: StudentConceptMastery | undefined;
  let lowest = Infinity;
  for (const c of perConcept) {
    if (c.masteryPct !== null && c.masteryPct < lowest) {
      lowest = c.masteryPct;
      weakest = c;
    }
  }
  return weakest;
}

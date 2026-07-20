import { describe, expect, it } from 'vitest';

import { shouldRequestMonthlyClassification } from './monthly-classification-request-policy';

describe('monthly classification request policy', () => {
  it('waits until all monthly sources are confirmed', () => {
    expect(
      shouldRequestMonthlyClassification({
        competence: '2026-06',
        coverageComplete: false,
        reviewLoaded: true,
        hasJob: false,
        requestedCompetence: null,
        localStatus: null,
      }),
    ).toBe(false);
  });

  it('requests once when coverage is complete and no job exists', () => {
    expect(
      shouldRequestMonthlyClassification({
        competence: '2026-06',
        coverageComplete: true,
        reviewLoaded: true,
        hasJob: false,
        requestedCompetence: null,
        localStatus: null,
      }),
    ).toBe(true);

    expect(
      shouldRequestMonthlyClassification({
        competence: '2026-06',
        coverageComplete: true,
        reviewLoaded: true,
        hasJob: false,
        requestedCompetence: '2026-06',
        localStatus: null,
      }),
    ).toBe(false);
  });
});

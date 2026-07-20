import { describe, expect, it } from 'vitest';

import {
  buildMonthlyClosureViewModel,
  canConfirmMonthlyClosure,
  createMonthlyClosureIdempotencyKey,
  sanitizeAcknowledgedCheckCodes,
  type MonthlyClosureReadiness,
} from './monthly-closure-presentation-model';

const readiness: MonthlyClosureReadiness = {
  competence: '2026-07',
  status: 'attention',
  fingerprint: 'readiness-v1:synthetic',
  sources: [
    { source: 'businessBank', status: 'missing' },
    { source: 'personalBank', status: 'confirmed' },
    { source: 'creditCard', status: 'preview' },
  ],
  checks: [
    {
      code: 'SOURCE_COVERAGE_PARTIAL',
      title: 'Cobertura parcial',
      description: 'Uma fonte ainda não foi confirmada.',
      status: 'needsAcknowledgement',
      acknowledgementAllowed: true,
    },
    {
      code: 'FINANCIAL_CALCULATION_UNAVAILABLE',
      title: 'Cálculo financeiro indisponível',
      description: 'Nenhum valor oficial será publicado.',
      status: 'unavailable',
      acknowledgementAllowed: true,
    },
    {
      code: 'ECONOMIC_NATURE_REVIEWED',
      title: 'Natureza Econômica revisada',
      description: 'Os grupos materiais foram revisados.',
      status: 'passed',
      acknowledgementAllowed: false,
    },
  ],
};

describe('monthly closure presentation model', () => {
  it('orders the three sources and separates checks by action', () => {
    const model = buildMonthlyClosureViewModel(readiness, []);

    expect(model.sources.map((source) => source.source)).toEqual([
      'personalBank',
      'creditCard',
      'businessBank',
    ]);
    expect(model.sources.map((source) => source.statusLabel)).toEqual([
      'Confirmado',
      'Prévia pendente',
      'Ausente',
    ]);
    expect(model.passedChecks.map((check) => check.code)).toEqual([
      'ECONOMIC_NATURE_REVIEWED',
    ]);
    expect(model.acknowledgementChecks.map((check) => check.code)).toEqual([
      'SOURCE_COVERAGE_PARTIAL',
      'FINANCIAL_CALCULATION_UNAVAILABLE',
    ]);
    expect(model.blockingChecks).toEqual([]);
  });

  it('requires every permitted acknowledgement and sends no foreign code', () => {
    const model = buildMonthlyClosureViewModel(readiness, []);
    const partial = new Set(['SOURCE_COVERAGE_PARTIAL', 'FORGED_CODE']);
    const complete = new Set([
      'SOURCE_COVERAGE_PARTIAL',
      'FINANCIAL_CALCULATION_UNAVAILABLE',
      'FORGED_CODE',
    ]);

    expect(canConfirmMonthlyClosure(model, partial)).toBe(false);
    expect(canConfirmMonthlyClosure(model, complete)).toBe(true);
    expect(sanitizeAcknowledgedCheckCodes(model, complete)).toEqual([
      'FINANCIAL_CALCULATION_UNAVAILABLE',
      'SOURCE_COVERAGE_PARTIAL',
    ]);
  });

  it('never permits confirmation while a non-acknowledgeable check blocks', () => {
    const model = buildMonthlyClosureViewModel(
      {
        ...readiness,
        status: 'blocked',
        checks: [
          ...readiness.checks,
          {
            code: 'READINESS_SEARCH_NOT_EXHAUSTIVE',
            title: 'Verificação incompleta',
            description: 'A busca não foi exaustiva.',
            status: 'blocked',
            acknowledgementAllowed: false,
          },
        ],
      },
      [],
    );

    expect(
      canConfirmMonthlyClosure(
        model,
        new Set(model.acknowledgementChecks.map((check) => check.code)),
      ),
    ).toBe(false);
  });

  it('renders a closed revision without inventing official values', () => {
    const model = buildMonthlyClosureViewModel(readiness, [
      {
        closureId: 'closure-synthetic',
        competence: '2026-07',
        revisionNumber: 2n,
        closedAt: Date.UTC(2026, 6, 19, 15, 30),
        confidenceAtClosure: 'partial',
        financialCalculationStatus: 'unavailable',
        acknowledgedCheckCodes: ['SOURCE_COVERAGE_PARTIAL'],
      },
    ]);

    expect(model.existingClosure).toMatchObject({
      revisionLabel: 'Revisão 2',
      confidenceLabel: 'Confiança parcial',
      calculationTitle: 'Valores financeiros indisponíveis',
    });
    expect(model.existingClosure?.calculationDescription).not.toContain('R$');
    expect(canConfirmMonthlyClosure(model, new Set())).toBe(false);
  });

  it('creates a stable key from an explicit attempt id', () => {
    expect(
      createMonthlyClosureIdempotencyKey(
        readiness.competence,
        readiness.fingerprint,
        'attempt-synthetic',
      ),
    ).toBe(
      'monthly-closure-v1:2026-07:readiness-v1:synthetic:attempt-synthetic',
    );
  });
});

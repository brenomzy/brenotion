import { describe, expect, it } from 'vitest';

import {
  buildHomeActivationModel,
  currentHomeCompetence,
  shiftHomeCompetence,
  type HomeActivationData,
} from './home-activation-model';

describe('home activation model', () => {
  it('guides an empty competence to import without inventing a snapshot', () => {
    const model = buildHomeActivationModel(baseData());

    expect(model.coverageSummary).toBe(
      '0 de 3 entradas mensais confirmadas.',
    );
    expect(model.nextAction).toMatchObject({
      route: '/import',
      label: 'Adicionar arquivo',
    });
    expect(model.officialSnapshot).toEqual({
      title: 'Retrato financeiro ainda não publicado',
      description:
        'O Início não exibirá Disponível para Gastar, reservas ou saldos até existir um cálculo oficial versionado.',
      asOf: null,
    });
  });

  it('prioritizes review and then obligations as activation advances', () => {
    const completeCoverage = baseData({
      coverage: {
        complete: true,
        confirmedCount: 3,
        isSearchExhaustive: true,
        sources: confirmedSources(),
      },
    });
    expect(buildHomeActivationModel(completeCoverage).nextAction.route).toBe(
      '/review',
    );

    const reviewStarted = baseData({
      ...completeCoverage,
      review: {
        classificationDecisionCount: 2,
        isSearchExhaustive: true,
      },
    });
    expect(buildHomeActivationModel(reviewStarted).nextAction.route).toBe(
      '/obligations',
    );

    const configured = baseData({
      ...reviewStarted,
      obligations: {
        activeCount: 3,
        needsPaymentOriginConfirmationCount: 0,
        isSearchExhaustive: true,
      },
    });
    expect(buildHomeActivationModel(configured).nextAction.route).toBe(
      '/close',
    );
    expect(buildHomeActivationModel(configured).steps.at(-1)).toMatchObject({
      id: 'closure',
      status: 'attention',
    });
  });

  it('shows the closed revision and does not ask to close it again', () => {
    const data = baseData({
      coverage: {
        complete: true,
        confirmedCount: 3,
        isSearchExhaustive: true,
        sources: confirmedSources(),
      },
      review: {
        classificationDecisionCount: 2,
        isSearchExhaustive: true,
      },
      obligations: {
        activeCount: 3,
        needsPaymentOriginConfirmationCount: 0,
        isSearchExhaustive: true,
      },
      monthlyClosure: {
        closureId: 'closure-synthetic',
        revisionNumber: 2n,
        closedAt: Date.UTC(2026, 6, 19, 15, 30),
        confidenceAtClosure: 'partial',
        financialCalculationStatus: 'unavailable',
      },
    });
    const model = buildHomeActivationModel(data);

    expect(model.monthlyClosure).toMatchObject({
      status: 'closed',
      revisionLabel: 'Revisão 2',
      closedAt: Date.UTC(2026, 6, 19, 15, 30),
    });
    expect(model.steps.at(-1)).toMatchObject({
      id: 'closure',
      status: 'done',
      statusLabel: 'Revisão 2 registrada',
    });
    expect(model.nextAction.route).toBe('/review');
    expect(model.nextAction.title).toBe('Continue o acompanhamento mensal');
  });

  it('offers closure readiness after every operational area has started', () => {
    const model = buildHomeActivationModel(
      baseData({
        coverage: {
          complete: false,
          confirmedCount: 1,
          isSearchExhaustive: true,
          sources: [
            {
              source: 'personalBank',
              status: 'confirmed',
              transactionCount: 4,
            },
            { source: 'creditCard', status: 'missing', transactionCount: 0 },
            {
              source: 'businessBank',
              status: 'missing',
              transactionCount: 0,
            },
          ],
        },
        review: {
          classificationDecisionCount: 1,
          isSearchExhaustive: true,
        },
        obligations: {
          activeCount: 1,
          needsPaymentOriginConfirmationCount: 0,
          isSearchExhaustive: true,
        },
      }),
    );

    expect(model.nextAction).toMatchObject({
      route: '/close',
      label: 'Revisar Fechamento',
    });
  });

  it('uses São Paulo for the current competence and shifts across years', () => {
    expect(
      currentHomeCompetence(new Date('2026-08-01T01:30:00.000Z')),
    ).toBe('2026-07');
    expect(shiftHomeCompetence('2026-01', -1)).toBe('2025-12');
    expect(shiftHomeCompetence('2026-12', 1)).toBe('2027-01');
  });
});

function baseData(overrides: Partial<HomeActivationData> = {}): HomeActivationData {
  return {
    competence: '2026-07',
    coverage: {
      complete: false,
      confirmedCount: 0,
      isSearchExhaustive: true,
      sources: [
        { source: 'personalBank', status: 'missing', transactionCount: 0 },
        { source: 'creditCard', status: 'missing', transactionCount: 0 },
        { source: 'businessBank', status: 'missing', transactionCount: 0 },
      ],
    },
    review: {
      classificationDecisionCount: 0,
      isSearchExhaustive: true,
    },
    obligations: {
      activeCount: 0,
      needsPaymentOriginConfirmationCount: 0,
      isSearchExhaustive: true,
    },
    monthlyClosure: null,
    officialSnapshot: null,
    ...overrides,
  };
}

function confirmedSources(): HomeActivationData['coverage']['sources'] {
  return [
    { source: 'personalBank', status: 'confirmed', transactionCount: 4 },
    { source: 'creditCard', status: 'confirmed', transactionCount: 7 },
    { source: 'businessBank', status: 'confirmed', transactionCount: 3 },
  ];
}

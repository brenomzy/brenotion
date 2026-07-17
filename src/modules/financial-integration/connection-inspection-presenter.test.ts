import { describe, expect, it } from 'vitest';

import { presentConnectionInspection } from './connection-inspection-presenter';

describe('presentConnectionInspection', () => {
  it('presents ready coverage without financial details', () => {
    const presentation = presentConnectionInspection({
      availability: 'ready',
      connectorName: 'Conector de teste',
      itemStatus: 'UPDATED',
      executionStatus: 'SUCCESS',
      lastUpdatedAt: '2026-07-16T10:00:00.000Z',
      nextAutoSyncAt: null,
      accountWarningCount: 0,
      accounts: {
        total: 2,
        bank: 1,
        credit: 1,
        subtypes: ['CHECKING_ACCOUNT', 'CREDIT_CARD'],
      },
    });

    expect(presentation).toEqual({
      tone: 'success',
      title: 'Conexão pronta',
      description: 'Os dados disponíveis foram atualizados com sucesso.',
      connectorLabel: 'Conector de teste',
      lastUpdatedLabel: '16/07/2026 às 07:00',
      coverageLabel: '2 contas detectadas: 1 bancária e 1 cartão.',
    });
    expect(JSON.stringify(presentation)).not.toContain('CHECKING_ACCOUNT');
    expect(JSON.stringify(presentation)).not.toContain('CREDIT_CARD');
  });

  it('makes partial coverage explicit', () => {
    const presentation = presentConnectionInspection({
      availability: 'partial',
      connectorName: 'Conector de teste',
      itemStatus: 'UPDATED',
      executionStatus: 'PARTIAL_SUCCESS',
      lastUpdatedAt: null,
      nextAutoSyncAt: null,
      accountWarningCount: 1,
      accounts: null,
    });

    expect(presentation).toEqual({
      tone: 'warning',
      title: 'Dados parciais',
      description: 'A conexão respondeu, mas a cobertura de contas está incompleta.',
      connectorLabel: 'Conector de teste',
      lastUpdatedLabel: 'Atualização não informada',
      coverageLabel: 'Cobertura de contas não disponível.',
    });
  });

  it('does not present unavailable data as ready', () => {
    const presentation = presentConnectionInspection({
      availability: 'unavailable',
      connectorName: 'Conector de teste',
      itemStatus: 'UPDATING',
      executionStatus: 'CREATED',
      lastUpdatedAt: null,
      nextAutoSyncAt: null,
      accountWarningCount: 0,
      accounts: null,
    });

    expect(presentation).toEqual({
      tone: 'neutral',
      title: 'Conexão indisponível',
      description: 'A conexão ainda não disponibilizou contas para esta verificação.',
      connectorLabel: 'Conector de teste',
      lastUpdatedLabel: 'Atualização não informada',
      coverageLabel: 'Cobertura de contas não disponível.',
    });
  });
});

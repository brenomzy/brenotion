import { describe, expect, it } from 'vitest';

import {
  buildObligationFormViewState,
  buildObligationListItems,
  createObligationKey,
  formatObligationDueDay,
  formatObligationEconomicNature,
  formatObligationExpectedAmount,
  formatObligationPaymentOrigin,
  validateObligationForm,
  type Obligation,
  type ObligationFormValues,
} from './obligations-presentation-model';

const validForm: ObligationFormValues = {
  obligationKey: 'recurring-service',
  name: 'Serviço recorrente demonstrativo',
  economicNature: 'personal',
  paymentOrigin: 'business',
  expectedAmount: '',
  dueDayOfMonth: '12',
  isActive: true,
};

function obligation(
  overrides: Partial<Obligation> & Pick<Obligation, 'obligationId' | 'name'>,
): Obligation {
  return {
    obligationKey: overrides.obligationId,
    economicNature: 'personal',
    paymentOrigin: 'needsConfirmation',
    isActive: true,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('obligations presentation model', () => {
  it('keeps economic nature and payment origin as independent labels', () => {
    const [item] = buildObligationListItems([
      obligation({
        obligationId: 'item',
        name: 'Obrigação demonstrativa',
        economicNature: 'personal',
        paymentOrigin: 'business',
        dueDayOfMonth: 1,
      }),
    ]);

    expect(item.economicNatureLabel).toBe('Pessoal');
    expect(item.paymentOriginLabel).toBe('Empresa');
    expect(item.paymentOriginDescription).toBe(
      'Origem pagadora habitual: Empresa',
    );
    expect(item.recurrenceLabel).toBe('Mensal');
    expect(item.dueLabel).toBe('Vence todo dia 1');
  });

  it('sorts active obligations by due day and leaves inactive ones last', () => {
    const items = buildObligationListItems([
      obligation({
        obligationId: 'inactive',
        name: 'Inativa',
        dueDayOfMonth: 1,
        isActive: false,
      }),
      obligation({
        obligationId: 'later',
        name: 'Ativa posterior',
        dueDayOfMonth: 31,
      }),
      obligation({
        obligationId: 'earlier',
        name: 'Ativa anterior',
        dueDayOfMonth: 1,
      }),
      obligation({
        obligationId: 'without-day',
        name: 'Ativa sem dia',
      }),
    ]);

    expect(items.map((item) => item.id)).toEqual([
      'earlier',
      'later',
      'without-day',
      'inactive',
    ]);
  });

  it('formats every persisted state without conflating its meaning', () => {
    expect(formatObligationEconomicNature('business')).toBe('Empresa');
    expect(formatObligationPaymentOrigin('needsConfirmation')).toBe('A confirmar');
    expect(formatObligationDueDay(undefined)).toBe(
      'Vencimento mensal não informado',
    );
    expect(formatObligationExpectedAmount(undefined)).toBeNull();
    expect(
      formatObligationExpectedAmount({
        amountInMinorUnits: 1n,
        currency: 'BRL',
        minorUnit: 'cent',
      }),
    ).toBe('R$\u00a00,01');
  });
});

describe('obligation form validation', () => {
  it('generates a hidden stable key without colliding with existing obligations', () => {
    const first = createObligationKey(new Set(), 1_000, 0.5);
    const second = createObligationKey(new Set([first]), 1_000, 0.5);

    expect(first).toMatch(/^obligation-[a-z0-9]+-[a-z0-9]{6}$/);
    expect(second).toBe(`${first}-2`);
  });

  it('normalizes a valid form into the backend contract', () => {
    const validation = validateObligationForm({
      ...validForm,
      obligationKey: '  recurring-service  ',
      name: '  Serviço   recorrente demonstrativo  ',
      expectedAmount: 'R$ 0,01',
    });

    expect(validation).toEqual({
      status: 'valid',
      errors: {},
      formError: null,
      value: {
        obligationKey: 'recurring-service',
        name: 'Serviço recorrente demonstrativo',
        economicNature: 'personal',
        paymentOrigin: 'business',
        expectedAmount: {
          amountInMinorUnits: 1n,
          currency: 'BRL',
          minorUnit: 'cent',
        },
        dueDayOfMonth: 12,
        isActive: true,
      },
    });
  });

  it('keeps optional amount and due day absent instead of inventing defaults', () => {
    const validation = validateObligationForm({
      ...validForm,
      expectedAmount: ' ',
      dueDayOfMonth: '',
    });

    expect(validation.status).toBe('valid');
    if (validation.status === 'valid') {
      expect(validation.value).not.toHaveProperty('expectedAmount');
      expect(validation.value).not.toHaveProperty('dueDayOfMonth');
    }
  });

  it('reports every field that violates the backend limits', () => {
    const validation = validateObligationForm({
      obligationKey: 'Chave inválida',
      name: ' ',
      economicNature: '',
      paymentOrigin: '',
      expectedAmount: '-1,00',
      dueDayOfMonth: '32',
      isActive: true,
    });

    expect(validation.status).toBe('invalid');
    expect(validation.errors).toEqual({
      name: expect.any(String),
      economicNature: expect.any(String),
      paymentOrigin: expect.any(String),
      expectedAmount: expect.any(String),
      dueDayOfMonth: expect.any(String),
    });
    expect(validation.formError).toBeTruthy();
  });

  it('rejects an invalid hidden key without exposing it as a field error', () => {
    const validation = validateObligationForm({
      ...validForm,
      obligationKey: 'INVALID KEY',
    });

    expect(validation).toMatchObject({
      status: 'invalid',
      errors: {},
      formError: expect.any(String),
    });
  });

  it('exposes submission states needed to disable and inform the form', () => {
    expect(buildObligationFormViewState(validForm, 'idle')).toMatchObject({
      canSubmit: true,
      isReadOnly: false,
      feedbackLabel: null,
    });
    expect(buildObligationFormViewState(validForm, 'submitting')).toMatchObject({
      canSubmit: false,
      isReadOnly: true,
      feedbackLabel: 'Salvando Obrigação…',
    });
    expect(
      buildObligationFormViewState(
        { ...validForm, economicNature: '' },
        'error',
      ),
    ).toMatchObject({
      canSubmit: false,
      isReadOnly: false,
      feedbackLabel: 'Não foi possível salvar. Revise os dados e tente novamente.',
    });
    expect(buildObligationFormViewState(validForm, 'saved')).toMatchObject({
      canSubmit: true,
      isReadOnly: false,
      feedbackLabel: 'Obrigação salva.',
    });
  });
});

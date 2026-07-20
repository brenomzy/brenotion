export type ObligationEconomicNature = 'personal' | 'business';

export type ObligationPaymentOrigin =
  | 'personal'
  | 'business'
  | 'needsConfirmation';

export type ObligationMoney = Readonly<{
  amountInMinorUnits: bigint;
  currency: 'BRL';
  minorUnit: 'cent';
}>;

export type Obligation = Readonly<{
  obligationId: string;
  obligationKey: string;
  name: string;
  economicNature: ObligationEconomicNature;
  paymentOrigin: ObligationPaymentOrigin;
  expectedAmount?: ObligationMoney;
  dueDayOfMonth?: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}>;

export type ObligationListItem = Readonly<{
  id: string;
  key: string;
  name: string;
  economicNature: ObligationEconomicNature;
  economicNatureLabel: string;
  paymentOrigin: ObligationPaymentOrigin;
  paymentOriginLabel: string;
  paymentOriginDescription: string;
  recurrence: 'monthly';
  recurrenceLabel: 'Mensal';
  dueDayOfMonth?: number;
  dueLabel: string;
  expectedAmountLabel: string | null;
  status: 'active' | 'inactive';
  statusLabel: 'Ativa' | 'Desativada';
}>;

export type ObligationFormValues = Readonly<{
  obligationKey: string;
  name: string;
  economicNature: ObligationEconomicNature | '';
  paymentOrigin: ObligationPaymentOrigin | '';
  expectedAmount: string;
  dueDayOfMonth: string;
  isActive: boolean;
}>;

export type ObligationFormField = Exclude<
  keyof ObligationFormValues,
  'isActive' | 'obligationKey'
>;

export type ObligationFormErrors = Partial<
  Readonly<Record<ObligationFormField, string>>
>;

export type ObligationUpsertInput = Readonly<{
  obligationKey: string;
  name: string;
  economicNature: ObligationEconomicNature;
  paymentOrigin: ObligationPaymentOrigin;
  expectedAmount?: ObligationMoney;
  dueDayOfMonth?: number;
  isActive: boolean;
}>;

export type ObligationFormValidation =
  | Readonly<{
      status: 'invalid';
      errors: ObligationFormErrors;
      formError: string | null;
    }>
  | Readonly<{
      status: 'valid';
      errors: Readonly<Record<string, never>>;
      formError: null;
      value: ObligationUpsertInput;
    }>;

export type ObligationFormSubmissionStatus =
  | 'idle'
  | 'submitting'
  | 'saved'
  | 'error';

export type ObligationFormViewState = Readonly<{
  validation: ObligationFormValidation;
  canSubmit: boolean;
  isReadOnly: boolean;
  feedbackLabel: string | null;
}>;

const economicNatureLabels: Readonly<
  Record<ObligationEconomicNature, string>
> = {
  personal: 'Pessoal',
  business: 'Empresa',
};

const paymentOriginLabels: Readonly<Record<ObligationPaymentOrigin, string>> = {
  personal: 'Pessoal',
  business: 'Empresa',
  needsConfirmation: 'A confirmar',
};

const obligationNameCollator = new Intl.Collator('pt-BR', {
  sensitivity: 'base',
  numeric: true,
});

export function buildObligationListItems(
  obligations: readonly Obligation[],
): ObligationListItem[] {
  return obligations
    .map(toObligationListItem)
    .sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === 'active' ? -1 : 1;
      }

      const leftDueDay = left.dueDayOfMonth ?? Number.POSITIVE_INFINITY;
      const rightDueDay = right.dueDayOfMonth ?? Number.POSITIVE_INFINITY;

      if (leftDueDay !== rightDueDay) {
        return leftDueDay - rightDueDay;
      }

      const nameComparison = obligationNameCollator.compare(left.name, right.name);
      return nameComparison || left.key.localeCompare(right.key);
    });
}

export function createObligationKey(
  existingKeys: ReadonlySet<string>,
  now = Date.now(),
  random = Math.random(),
): string {
  const timestamp = now.toString(36);
  const entropy = Math.floor(random * 36 ** 6)
    .toString(36)
    .padStart(6, '0');
  const base = `obligation-${timestamp}-${entropy}`;
  let candidate = base;
  let suffix = 2;

  while (existingKeys.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export function formatObligationEconomicNature(
  economicNature: ObligationEconomicNature,
): string {
  return economicNatureLabels[economicNature];
}

export function formatObligationPaymentOrigin(
  paymentOrigin: ObligationPaymentOrigin,
): string {
  return paymentOriginLabels[paymentOrigin];
}

export function formatObligationDueDay(dueDayOfMonth: number | undefined): string {
  return dueDayOfMonth === undefined
    ? 'Vencimento mensal não informado'
    : `Vence todo dia ${dueDayOfMonth}`;
}

export function formatObligationExpectedAmount(
  expectedAmount: ObligationMoney | undefined,
): string | null {
  if (!expectedAmount) {
    return null;
  }

  const wholeUnits = expectedAmount.amountInMinorUnits / 100n;
  const cents = expectedAmount.amountInMinorUnits % 100n;
  const groupedWholeUnits = wholeUnits
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `R$\u00a0${groupedWholeUnits},${cents.toString().padStart(2, '0')}`;
}

export function validateObligationForm(
  values: ObligationFormValues,
): ObligationFormValidation {
  const errors: Record<string, string> = {};
  let formError: string | null = null;
  const obligationKey = values.obligationKey.trim();
  const name = values.name.trim().replace(/\s+/g, ' ');
  const economicNature = values.economicNature || null;
  const paymentOrigin = values.paymentOrigin || null;
  const expectedAmount = parseExpectedAmount(values.expectedAmount);
  const dueDayOfMonth = parseDueDay(values.dueDayOfMonth);

  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(obligationKey)) {
    formError =
      'Não foi possível identificar esta Obrigação. Reabra o formulário e tente novamente.';
  }

  if (name.length < 1 || name.length > 120) {
    errors.name = 'Informe um nome com até 120 caracteres.';
  }

  if (!economicNature) {
    errors.economicNature = 'Escolha Pessoal ou Empresa.';
  }

  if (!paymentOrigin) {
    errors.paymentOrigin = 'Escolha a origem pagadora ou marque A confirmar.';
  }

  if (expectedAmount === null) {
    errors.expectedAmount =
      'Informe um valor em reais não negativo, com no máximo duas casas decimais.';
  }

  if (dueDayOfMonth === null) {
    errors.dueDayOfMonth = 'Informe um dia inteiro entre 1 e 31.';
  }

  if (
    formError !== null ||
    Object.keys(errors).length > 0 ||
    !economicNature ||
    !paymentOrigin ||
    expectedAmount === null ||
    dueDayOfMonth === null
  ) {
    return { status: 'invalid', errors, formError };
  }

  const value: ObligationUpsertInput = {
    obligationKey,
    name,
    economicNature,
    paymentOrigin,
    ...(expectedAmount === undefined ? {} : { expectedAmount }),
    ...(dueDayOfMonth === undefined ? {} : { dueDayOfMonth }),
    isActive: values.isActive,
  };

  return {
    status: 'valid',
    errors: {},
    formError: null,
    value,
  };
}

export function buildObligationFormViewState(
  values: ObligationFormValues,
  submissionStatus: ObligationFormSubmissionStatus,
): ObligationFormViewState {
  const validation = validateObligationForm(values);
  const isReadOnly = submissionStatus === 'submitting';

  return {
    validation,
    canSubmit: validation.status === 'valid' && !isReadOnly,
    isReadOnly,
    feedbackLabel:
      submissionStatus === 'submitting'
        ? 'Salvando Obrigação…'
        : submissionStatus === 'saved'
          ? 'Obrigação salva.'
          : submissionStatus === 'error'
            ? 'Não foi possível salvar. Revise os dados e tente novamente.'
            : null,
  };
}

function toObligationListItem(obligation: Obligation): ObligationListItem {
  return {
    id: obligation.obligationId,
    key: obligation.obligationKey,
    name: obligation.name,
    economicNature: obligation.economicNature,
    economicNatureLabel: formatObligationEconomicNature(
      obligation.economicNature,
    ),
    paymentOrigin: obligation.paymentOrigin,
    paymentOriginLabel: formatObligationPaymentOrigin(obligation.paymentOrigin),
    paymentOriginDescription: `Origem pagadora habitual: ${formatObligationPaymentOrigin(
      obligation.paymentOrigin,
    )}`,
    recurrence: 'monthly',
    recurrenceLabel: 'Mensal',
    dueDayOfMonth: obligation.dueDayOfMonth,
    dueLabel: formatObligationDueDay(obligation.dueDayOfMonth),
    expectedAmountLabel: formatObligationExpectedAmount(obligation.expectedAmount),
    status: obligation.isActive ? 'active' : 'inactive',
    statusLabel: obligation.isActive ? 'Ativa' : 'Desativada',
  };
}

function parseExpectedAmount(value: string): ObligationMoney | undefined | null {
  const normalized = value.trim().replace(/^R\$\s?/, '').replace(/\s/g, '');

  if (normalized.length === 0) {
    return undefined;
  }

  if (
    !/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(normalized)
  ) {
    return null;
  }

  const [wholePart, fractionPart = ''] = normalized.split(',');
  const wholeUnits = BigInt(wholePart.replace(/\./g, ''));
  const cents = BigInt(fractionPart.padEnd(2, '0'));

  return {
    amountInMinorUnits: wholeUnits * 100n + cents,
    currency: 'BRL',
    minorUnit: 'cent',
  };
}

function parseDueDay(value: string): number | undefined | null {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return undefined;
  }

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const day = Number(normalized);
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
}

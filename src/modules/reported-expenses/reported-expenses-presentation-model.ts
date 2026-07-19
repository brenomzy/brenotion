export type ReportedExpenseMoney = Readonly<{
  amountInMinorUnits: bigint;
  currency: 'BRL';
  minorUnit: 'cent';
}>;

export type ReportedExpenseEconomicNature = 'personal' | 'business';
export type ReportedExpenseSourcePatrimony =
  | 'personal'
  | 'business'
  | 'needsConfirmation';
export type ReportedExpenseStatus = 'provisional' | 'reconciled' | 'voided';

export type FinancialCycle = Readonly<{
  financialCycleId: string;
  startedOn: string;
  expectedNextReceiptOn: string;
  status: 'open';
}>;

export type ReportedExpense = Readonly<{
  reportedExpenseId: string;
  financialCycleId: string;
  amount: ReportedExpenseMoney;
  description: string;
  occurredOn: string;
  economicNature: ReportedExpenseEconomicNature;
  sourcePatrimony: ReportedExpenseSourcePatrimony;
  status: ReportedExpenseStatus;
  createdAt: number;
  updatedAt: number;
}>;

export type ReconciliationCandidate = Readonly<{
  sourceTransactionId: string;
  postedOn: string;
  description: string;
  amount: ReportedExpenseMoney;
  explanation: string;
}>;

export type FinancialCycleFormValues = Readonly<{
  startedOn: string;
  expectedNextReceiptOn: string;
}>;

export type ReportedExpenseFormValues = Readonly<{
  amount: string;
  description: string;
  occurredOn: string;
  economicNature: ReportedExpenseEconomicNature | '';
  sourcePatrimony: ReportedExpenseSourcePatrimony | '';
}>;

export type FinancialCycleFormValidation =
  | Readonly<{
      status: 'invalid';
      errors: Partial<Record<keyof FinancialCycleFormValues, string>>;
    }>
  | Readonly<{
      status: 'valid';
      errors: Readonly<Record<string, never>>;
      value: FinancialCycleFormValues;
    }>;

export type ReportedExpenseFormValidation =
  | Readonly<{
      status: 'invalid';
      errors: Partial<Record<keyof ReportedExpenseFormValues, string>>;
    }>
  | Readonly<{
      status: 'valid';
      errors: Readonly<Record<string, never>>;
      value: Readonly<{
        amount: ReportedExpenseMoney;
        description: string;
        occurredOn: string;
        economicNature: ReportedExpenseEconomicNature;
        sourcePatrimony: ReportedExpenseSourcePatrimony;
      }>;
    }>;

export type ReportedExpenseListItem = Readonly<{
  id: string;
  description: string;
  amountLabel: string;
  occurredOnLabel: string;
  economicNatureLabel: string;
  sourcePatrimonyLabel: string;
  status: ReportedExpenseStatus;
  statusLabel: string;
  canEdit: boolean;
  canVoid: boolean;
  canReconcile: boolean;
}>;

const ISO_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export const EMPTY_FINANCIAL_CYCLE_FORM: FinancialCycleFormValues = {
  startedOn: '',
  expectedNextReceiptOn: '',
};

export const EMPTY_REPORTED_EXPENSE_FORM: ReportedExpenseFormValues = {
  amount: '',
  description: '',
  occurredOn: '',
  economicNature: '',
  sourcePatrimony: '',
};

export function validateFinancialCycleForm(
  values: FinancialCycleFormValues,
): FinancialCycleFormValidation {
  const errors: Partial<Record<keyof FinancialCycleFormValues, string>> = {};
  const startedOn = values.startedOn.trim();
  const expectedNextReceiptOn = values.expectedNextReceiptOn.trim();

  if (!isValidIsoDate(startedOn)) {
    errors.startedOn = 'Informe a data inicial no formato AAAA-MM-DD.';
  }
  if (!isValidIsoDate(expectedNextReceiptOn)) {
    errors.expectedNextReceiptOn =
      'Informe o próximo recebimento no formato AAAA-MM-DD.';
  }
  if (
    isValidIsoDate(startedOn) &&
    isValidIsoDate(expectedNextReceiptOn) &&
    expectedNextReceiptOn <= startedOn
  ) {
    errors.expectedNextReceiptOn =
      'O próximo recebimento deve ocorrer depois do início do ciclo.';
  }

  return Object.keys(errors).length > 0
    ? { status: 'invalid', errors }
    : {
        status: 'valid',
        errors: {},
        value: { startedOn, expectedNextReceiptOn },
      };
}

export function validateReportedExpenseForm(
  values: ReportedExpenseFormValues,
): ReportedExpenseFormValidation {
  const errors: Partial<Record<keyof ReportedExpenseFormValues, string>> = {};
  const amount = parsePositiveAmount(values.amount);
  const description = values.description.trim().replace(/\s+/g, ' ');
  const occurredOn = values.occurredOn.trim();
  const economicNature = values.economicNature || null;
  const sourcePatrimony = values.sourcePatrimony || null;

  if (!amount) {
    errors.amount = 'Informe um valor positivo em reais.';
  }
  if (description.length < 1 || description.length > 160) {
    errors.description = 'Informe uma descrição com até 160 caracteres.';
  }
  if (!isValidIsoDate(occurredOn)) {
    errors.occurredOn = 'Informe a data no formato AAAA-MM-DD.';
  }
  if (!economicNature) {
    errors.economicNature = 'Escolha Pessoal ou Empresa.';
  }
  if (!sourcePatrimony) {
    errors.sourcePatrimony =
      'Escolha o Patrimônio de Origem ou marque A confirmar.';
  }

  if (
    Object.keys(errors).length > 0 ||
    !amount ||
    !economicNature ||
    !sourcePatrimony
  ) {
    return { status: 'invalid', errors };
  }

  return {
    status: 'valid',
    errors: {},
    value: {
      amount,
      description,
      occurredOn,
      economicNature,
      sourcePatrimony,
    },
  };
}

export function buildReportedExpenseListItems(
  expenses: readonly ReportedExpense[],
): ReportedExpenseListItem[] {
  return [...expenses]
    .sort(
      (left, right) =>
        right.occurredOn.localeCompare(left.occurredOn) ||
        right.updatedAt - left.updatedAt,
    )
    .map((expense) => ({
      id: expense.reportedExpenseId,
      description: expense.description,
      amountLabel: formatMoney(expense.amount),
      occurredOnLabel: formatDate(expense.occurredOn),
      economicNatureLabel:
        expense.economicNature === 'personal' ? 'Pessoal' : 'Empresa',
      sourcePatrimonyLabel:
        expense.sourcePatrimony === 'personal'
          ? 'Pessoal'
          : expense.sourcePatrimony === 'business'
            ? 'Empresa'
            : 'A confirmar',
      status: expense.status,
      statusLabel:
        expense.status === 'provisional'
          ? 'Provisório'
          : expense.status === 'reconciled'
            ? 'Conciliado'
            : 'Anulado',
      canEdit: expense.status === 'provisional',
      canVoid: expense.status === 'provisional',
      canReconcile: expense.status === 'provisional',
    }));
}

export function expenseToFormValues(
  expense: ReportedExpense,
): ReportedExpenseFormValues {
  return {
    amount: formatMoneyInput(expense.amount),
    description: expense.description,
    occurredOn: expense.occurredOn,
    economicNature: expense.economicNature,
    sourcePatrimony: expense.sourcePatrimony,
  };
}

export function formatCyclePeriod(cycle: FinancialCycle): string {
  return `${formatDate(cycle.startedOn)} até ${formatDate(
    cycle.expectedNextReceiptOn,
  )}`;
}

function parsePositiveAmount(value: string): ReportedExpenseMoney | null {
  const normalized = value.trim().replace(/^R\$\s?/, '').replace(/\s/g, '');
  if (
    !/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(normalized)
  ) {
    return null;
  }

  const [wholeText, fractionText = ''] = normalized.split(',');
  const amountInMinorUnits =
    BigInt(wholeText.replace(/\./g, '')) * 100n +
    BigInt(fractionText.padEnd(2, '0'));

  return amountInMinorUnits > 0n
    ? {
        amountInMinorUnits,
        currency: 'BRL',
        minorUnit: 'cent',
      }
    : null;
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

function formatMoney(money: ReportedExpenseMoney): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(money.amountInMinorUnits) / 100);
}

function formatMoneyInput(money: ReportedExpenseMoney): string {
  const whole = money.amountInMinorUnits / 100n;
  const cents = money.amountInMinorUnits % 100n;
  return `${whole.toString()},${cents.toString().padStart(2, '0')}`;
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(`${isoDate}T00:00:00.000Z`))
    .replace('.', '');
}

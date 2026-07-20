export const MAX_ITAU_CREDIT_CARD_XLSX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_ITAU_CREDIT_CARD_TRANSACTIONS = 1_000;
export const ITAU_CREDIT_CARD_XLSX_PARSER_VERSION = 'itau-credit-card-xlsx-v3';

const MONEY_FLOAT_NOISE_TOLERANCE = 1e-7;
const HEADER_SEARCH_ROW_LIMIT = 40;
const STATEMENT_TITLE_PATTERN =
  /^Fatura\s+(?:Paga|Aberta)\s*-\s*([A-Za-zÀ-ÿ]+)\/(\d{4})$/i;

export type ItauCreditCardXlsxParseErrorCode =
  | 'XLSX_EMPTY_FILE'
  | 'XLSX_INVALID_FORMAT'
  | 'XLSX_INVALID_SUMMARY'
  | 'XLSX_INVALID_TRANSACTION'
  | 'XLSX_SUBCENT_VALUE'
  | 'XLSX_TOO_MANY_TRANSACTIONS'
  | 'XLSX_TOTAL_MISMATCH';

export type CreditCardTransactionKind =
  | 'purchase'
  | 'creditAdjustment'
  | 'statementPayment';

export type ParsedItauCreditCardTransaction = Readonly<{
  sequence: number;
  postedOn: string;
  amountInMinorUnits: bigint;
  description: string;
  transactionType: CreditCardTransactionKind;
  installmentCurrent: number | null;
  installmentTotal: number | null;
}>;

export type ParsedItauCreditCardStatement = Readonly<{
  statementTitle: string;
  statementCompetence: string;
  statementDueOn: string;
  statementTotalInMinorUnits: bigint;
  periodStart: string;
  periodEnd: string;
  transactions: readonly ParsedItauCreditCardTransaction[];
  creditTotalInMinorUnits: bigint;
  debitTotalInMinorUnits: bigint;
  purchaseTotalInMinorUnits: bigint;
  creditAdjustmentTotalInMinorUnits: bigint;
  settlementTotalInMinorUnits: bigint;
}>;

export class ItauCreditCardXlsxParseError extends Error {
  readonly code: ItauCreditCardXlsxParseErrorCode;

  constructor(code: ItauCreditCardXlsxParseErrorCode) {
    super(code);
    this.name = 'ItauCreditCardXlsxParseError';
    this.code = code;
  }
}

export function parseItauCreditCardStatementRows(
  rows: readonly (readonly unknown[])[],
): ParsedItauCreditCardStatement {
  if (rows.length === 0) {
    throw new ItauCreditCardXlsxParseError('XLSX_EMPTY_FILE');
  }

  const headerRowIndex = findHeaderRow(rows);
  if (headerRowIndex === -1) {
    throw new ItauCreditCardXlsxParseError('XLSX_INVALID_FORMAT');
  }

  const statementTitle = findStatementTitle(rows, headerRowIndex);
  const statementCompetence = parseStatementCompetence(statementTitle);
  const statementTotalInMinorUnits = findSummaryMoney(
    rows,
    headerRowIndex,
    'total da fatura',
  );
  const statementDueOn = findSummaryDate(rows, headerRowIndex, 'vencimento');
  const transactions = parseTransactions(rows, headerRowIndex);

  if (transactions.length === 0) {
    throw new ItauCreditCardXlsxParseError('XLSX_INVALID_TRANSACTION');
  }
  if (transactions.length > MAX_ITAU_CREDIT_CARD_TRANSACTIONS) {
    throw new ItauCreditCardXlsxParseError('XLSX_TOO_MANY_TRANSACTIONS');
  }

  let reconciledStatementTotal = 0n;
  let purchaseTotalInMinorUnits = 0n;
  let creditAdjustmentTotalInMinorUnits = 0n;
  let settlementTotalInMinorUnits = 0n;

  for (const transaction of transactions) {
    if (transaction.transactionType === 'purchase') {
      purchaseTotalInMinorUnits += -transaction.amountInMinorUnits;
      reconciledStatementTotal += -transaction.amountInMinorUnits;
    } else if (transaction.transactionType === 'creditAdjustment') {
      creditAdjustmentTotalInMinorUnits += transaction.amountInMinorUnits;
      reconciledStatementTotal -= transaction.amountInMinorUnits;
    } else {
      settlementTotalInMinorUnits += transaction.amountInMinorUnits;
    }
  }

  if (reconciledStatementTotal !== statementTotalInMinorUnits) {
    throw new ItauCreditCardXlsxParseError('XLSX_TOTAL_MISMATCH');
  }

  const postedDates = transactions.map((transaction) => transaction.postedOn).sort();

  return {
    statementTitle,
    statementCompetence,
    statementDueOn,
    statementTotalInMinorUnits,
    periodStart: postedDates[0],
    periodEnd: postedDates[postedDates.length - 1],
    transactions,
    creditTotalInMinorUnits:
      creditAdjustmentTotalInMinorUnits + settlementTotalInMinorUnits,
    debitTotalInMinorUnits: purchaseTotalInMinorUnits,
    purchaseTotalInMinorUnits,
    creditAdjustmentTotalInMinorUnits,
    settlementTotalInMinorUnits,
  };
}

function findHeaderRow(rows: readonly (readonly unknown[])[]): number {
  const limit = Math.min(rows.length, HEADER_SEARCH_ROW_LIMIT);

  for (let rowIndex = 0; rowIndex < limit; rowIndex += 1) {
    const row = rows[rowIndex];
    if (
      normalizeLabel(row[1]) === 'data' &&
      normalizeLabel(row[2]) === 'lancamento' &&
      normalizeLabel(row[3]) === 'parcelamento' &&
      normalizeLabel(row[4]) === 'valor'
    ) {
      return rowIndex;
    }
  }

  return -1;
}

function findStatementTitle(
  rows: readonly (readonly unknown[])[],
  headerRowIndex: number,
): string {
  for (let rowIndex = 0; rowIndex < headerRowIndex; rowIndex += 1) {
    const row = rows[rowIndex];
    for (let columnIndex = 0; columnIndex <= 4; columnIndex += 1) {
      const value = row[columnIndex];
      if (typeof value === 'string') {
        const sanitized = sanitizeText(value, 120);
        if (STATEMENT_TITLE_PATTERN.test(sanitized)) {
          return sanitized;
        }
      }
    }
  }

  throw new ItauCreditCardXlsxParseError('XLSX_INVALID_SUMMARY');
}

function parseStatementCompetence(title: string): string {
  const match = STATEMENT_TITLE_PATTERN.exec(title);
  const month = match ? MONTHS[normalizeLabel(match[1])] : undefined;
  const year = match ? Number(match[2]) : Number.NaN;

  if (!month || !Number.isSafeInteger(year) || year < 2000 || year > 2200) {
    throw new ItauCreditCardXlsxParseError('XLSX_INVALID_SUMMARY');
  }

  return `${year.toString().padStart(4, '0')}-${month}`;
}

function findSummaryMoney(
  rows: readonly (readonly unknown[])[],
  headerRowIndex: number,
  label: string,
): bigint {
  const cell = findSummaryValueCell(rows, headerRowIndex, label);
  return parseMoneyNumber(cell);
}

function findSummaryDate(
  rows: readonly (readonly unknown[])[],
  headerRowIndex: number,
  label: string,
): string {
  const cell = findSummaryValueCell(rows, headerRowIndex, label);
  return parseDateCell(cell);
}

function findSummaryValueCell(
  rows: readonly (readonly unknown[])[],
  headerRowIndex: number,
  label: string,
): unknown {
  for (let rowIndex = 0; rowIndex < headerRowIndex; rowIndex += 1) {
    const row = rows[rowIndex];
    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      if (normalizeLabel(row[columnIndex]) === label) {
        const nextRow = rows[rowIndex + 1];
        if (!nextRow) {
          break;
        }
        return nextRow[columnIndex];
      }
    }
  }

  const knownSummaryRow = rows[headerRowIndex - 4];
  const knownSummaryColumn =
    label === 'total da fatura' ? 6 : label === 'vencimento' ? 8 : -1;
  if (knownSummaryRow && knownSummaryColumn !== -1) {
    const value = knownSummaryRow[knownSummaryColumn];
    if (!isEmptyCell(value)) {
      return value;
    }
  }

  throw new ItauCreditCardXlsxParseError('XLSX_INVALID_SUMMARY');
}

function parseTransactions(
  rows: readonly (readonly unknown[])[],
  headerRowIndex: number,
): ParsedItauCreditCardTransaction[] {
  const transactions: ParsedItauCreditCardTransaction[] = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const relevantCells = row.slice(1, 5);

    if (relevantCells.every(isEmptyCell)) {
      if (transactions.length > 0) {
        break;
      }
      continue;
    }

    const postedOn = parseDateCell(row[1]);
    const description =
      typeof row[2] === 'string' ? sanitizeText(row[2], 240) : '';
    const statementAmountInMinorUnits = parseMoneyNumber(row[4]);
    const installment = parseInstallment(row[3]);

    if (!description || statementAmountInMinorUnits === 0n) {
      throw new ItauCreditCardXlsxParseError('XLSX_INVALID_TRANSACTION');
    }

    const isStatementPayment = normalizeLabel(description) === 'pagamento efetuado';
    const transactionType: CreditCardTransactionKind = isStatementPayment
      ? 'statementPayment'
      : statementAmountInMinorUnits > 0n
        ? 'purchase'
        : 'creditAdjustment';

    if (
      transactionType !== 'purchase' &&
      (installment.current !== null || installment.total !== null)
    ) {
      throw new ItauCreditCardXlsxParseError('XLSX_INVALID_TRANSACTION');
    }

    transactions.push({
      sequence: transactions.length,
      postedOn,
      amountInMinorUnits: -statementAmountInMinorUnits,
      description,
      transactionType,
      installmentCurrent: installment.current,
      installmentTotal: installment.total,
    });
  }

  return transactions;
}

function parseInstallment(value: unknown): {
  current: number | null;
  total: number | null;
} {
  if (isEmptyCell(value)) {
    return { current: null, total: null };
  }
  if (typeof value !== 'string') {
    throw new ItauCreditCardXlsxParseError('XLSX_INVALID_TRANSACTION');
  }

  const match = /^Parcela\s+(\d+)\s+de\s+(\d+)$/i.exec(value.trim());
  const current = match ? Number(match[1]) : Number.NaN;
  const total = match ? Number(match[2]) : Number.NaN;

  if (
    !Number.isSafeInteger(current) ||
    !Number.isSafeInteger(total) ||
    current < 1 ||
    total < current ||
    total > 999
  ) {
    throw new ItauCreditCardXlsxParseError('XLSX_INVALID_TRANSACTION');
  }

  return { current, total };
}

function parseMoneyNumber(value: unknown): bigint {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ItauCreditCardXlsxParseError('XLSX_INVALID_TRANSACTION');
  }

  const roundedMinorUnits = Math.round(value * 100);
  const roundedValue = roundedMinorUnits / 100;

  if (Math.abs(value - roundedValue) > MONEY_FLOAT_NOISE_TOLERANCE) {
    throw new ItauCreditCardXlsxParseError('XLSX_SUBCENT_VALUE');
  }
  if (!Number.isSafeInteger(roundedMinorUnits)) {
    throw new ItauCreditCardXlsxParseError('XLSX_INVALID_TRANSACTION');
  }

  return BigInt(roundedMinorUnits);
}

function parseDateCell(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatAndValidateDate(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate(),
    );
  }
  if (typeof value === 'string') {
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (iso) {
      return formatAndValidateDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    }
    const brazilian = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
    if (brazilian) {
      return formatAndValidateDate(
        Number(brazilian[3]),
        Number(brazilian[2]),
        Number(brazilian[1]),
      );
    }
  }

  throw new ItauCreditCardXlsxParseError('XLSX_INVALID_TRANSACTION');
}

function formatAndValidateDate(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ItauCreditCardXlsxParseError('XLSX_INVALID_TRANSACTION');
  }

  return `${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function normalizeLabel(value: unknown): string {
  return typeof value === 'string'
    ? value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
    : '';
}

function sanitizeText(value: string, maxLength: number): string {
  return value
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function isEmptyCell(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

const MONTHS: Readonly<Record<string, string>> = {
  janeiro: '01',
  fevereiro: '02',
  marco: '03',
  abril: '04',
  maio: '05',
  junho: '06',
  julho: '07',
  agosto: '08',
  setembro: '09',
  outubro: '10',
  novembro: '11',
  dezembro: '12',
};

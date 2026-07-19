export type ReviewMoney = Readonly<{
  amountInMinorUnits: bigint;
  currency: 'BRL';
  minorUnit: 'cent';
}>;

export type ReviewImportBatch = Readonly<{
  id: string;
  format: 'ofx' | 'itauCreditCardXlsx';
  sourceAccountKind: 'bankAccount' | 'creditCard';
  parserVersion: string;
  periodStart: string | null;
  periodEnd: string | null;
  statementTitle: string | null;
  statementCompetence: string | null;
  statementDueOn: string | null;
  statementTotal: ReviewMoney | null;
  purchaseTotal: ReviewMoney | null;
  creditAdjustmentTotal: ReviewMoney | null;
  settlementTotal: ReviewMoney | null;
  transactionCount: number;
  duplicateCount: number;
  insertedCount: number;
  creditTotal: ReviewMoney;
  debitTotal: ReviewMoney;
  confirmedAt: number;
}>;

export type ReviewSourceTransaction = Readonly<{
  id: string;
  importBatchId: string;
  postedOn: string;
  amount: ReviewMoney;
  description: string;
  transactionType: string;
  sourceAccountKind: 'bankAccount' | 'creditCard';
  installmentCurrent: number | null;
  installmentTotal: number | null;
}>;

export type ReviewDataOrigin =
  | Readonly<{ kind: 'persisted' }>
  | Readonly<{
      kind: 'synthetic';
      label: 'Demonstração com dados sintéticos';
    }>;

export type ReviewReadyModel = Readonly<{
  status: 'ready';
  origin: ReviewDataOrigin;
  selectedBatchId: string;
  batches: readonly ReviewImportBatch[];
  hasMoreBatches: boolean;
  isLoadingMoreBatches: boolean;
  transactions: readonly ReviewSourceTransaction[];
  isLoadingTransactions: boolean;
  hasMoreTransactions: boolean;
  isLoadingMoreTransactions: boolean;
}>;

export type ReviewScreenModel =
  | Readonly<{ status: 'loading'; origin: ReviewDataOrigin }>
  | Readonly<{
      status: 'empty';
      origin: ReviewDataOrigin;
      title: string;
      description: string;
    }>
  | Readonly<{
      status: 'error';
      origin: ReviewDataOrigin;
      title: string;
      description: string;
    }>
  | ReviewReadyModel;

export type ReviewScreenActions = Readonly<{
  selectBatch: (batchId: string) => void;
  loadMoreBatches: () => void;
  loadMoreTransactions: () => void;
  retry: () => void;
  startImport: () => void;
}>;

export function getSelectedBatch(model: ReviewReadyModel): ReviewImportBatch {
  const selected = model.batches.find((batch) => batch.id === model.selectedBatchId);

  if (!selected) {
    throw new Error('Selected import batch is not available in the review model.');
  }

  return selected;
}

export function formatReviewDate(isoDate: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(`${isoDate}T00:00:00.000Z`))
    .replace('.', '');
}

export function formatReviewTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(timestamp))
    .replace('.', '');
}

export function formatReviewPeriod(batch: ReviewImportBatch): string {
  if (
    batch.format === 'itauCreditCardXlsx' &&
    batch.statementCompetence &&
    /^\d{4}-\d{2}$/.test(batch.statementCompetence)
  ) {
    const [year, month] = batch.statementCompetence.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, 1)));
  }

  if (!batch.periodStart || !batch.periodEnd) {
    return 'Período não informado';
  }

  if (batch.periodStart === batch.periodEnd) {
    return formatReviewDate(batch.periodStart);
  }

  return `${formatReviewDate(batch.periodStart)} – ${formatReviewDate(batch.periodEnd)}`;
}

export const CARD_SETTLEMENT_RULE_VERSION =
  'exact-opposite-within-seven-days-v1' as const;
export const CARD_SETTLEMENT_MAX_DAY_DISTANCE = 7;

type SettlementTransaction = Readonly<{
  postedOn: string;
  amountInMinorUnits: bigint;
  transactionType: string;
  sourceAccountKind: 'bankAccount' | 'creditCard' | null;
}>;

export function getCardSettlementDayDistance(
  statementPaymentPostedOn: string,
  bankDebitPostedOn: string,
): number {
  return Math.abs(
    isoDateToEpochDay(statementPaymentPostedOn) - isoDateToEpochDay(bankDebitPostedOn),
  );
}

export function isCardSettlementCandidate(
  statementPayment: SettlementTransaction,
  bankDebit: SettlementTransaction,
): boolean {
  return (
    statementPayment.transactionType === 'statementPayment' &&
    statementPayment.sourceAccountKind === 'creditCard' &&
    statementPayment.amountInMinorUnits > 0n &&
    bankDebit.sourceAccountKind === 'bankAccount' &&
    bankDebit.amountInMinorUnits < 0n &&
    statementPayment.amountInMinorUnits === -bankDebit.amountInMinorUnits &&
    getCardSettlementDayDistance(statementPayment.postedOn, bankDebit.postedOn) <=
      CARD_SETTLEMENT_MAX_DAY_DISTANCE
  );
}

export function shiftIsoDate(isoDate: string, days: number): string {
  const epochDay = isoDateToEpochDay(isoDate);
  return new Date((epochDay + days) * 86_400_000).toISOString().slice(0, 10);
}

function isoDateToEpochDay(isoDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new Error('Card settlement date must use YYYY-MM-DD.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error('Card settlement date must be a valid calendar date.');
  }

  return Math.floor(timestamp / 86_400_000);
}

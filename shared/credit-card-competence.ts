const COMPETENCE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function creditCardSpendingCompetence(
  statementCompetence: string | null | undefined,
): string | null {
  if (!statementCompetence) return null;

  const match = COMPETENCE_PATTERN.exec(statementCompetence);
  if (!match) return null;

  const year = Number(match[1]);
  const paymentMonth = Number(match[2]);
  const spendingDate = new Date(Date.UTC(year, paymentMonth - 2, 1));

  return `${spendingDate.getUTCFullYear()}-${String(
    spendingDate.getUTCMonth() + 1,
  ).padStart(2, '0')}`;
}

export function creditCardStatementMatchesSpendingCompetence(
  statementCompetence: string | null | undefined,
  spendingCompetence: string,
): boolean {
  return (
    creditCardSpendingCompetence(statementCompetence) === spendingCompetence
  );
}

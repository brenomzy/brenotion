export async function createOfxSourceKey(input: {
  sourcePatrimony: 'personal' | 'business';
  externalId: string | null;
  postedOn: string;
  amountInMinorUnits: bigint;
  description: string;
}): Promise<string> {
  return await sha256Hex(
    [
      input.sourcePatrimony,
      input.externalId ?? 'missing-external-id',
      input.postedOn,
      input.amountInMinorUnits.toString(),
      input.description,
    ].join('\u001F'),
  );
}

export async function createCreditCardSourceKey(input: {
  sourcePatrimony: 'personal' | 'business';
  statementCompetence: string;
  sequence: number;
  postedOn: string;
  amountInMinorUnits: bigint;
  description: string;
  transactionType: string;
  installmentCurrent: number | null;
  installmentTotal: number | null;
}): Promise<string> {
  return await sha256Hex(
    [
      'itauCreditCardXlsx',
      input.sourcePatrimony,
      input.statementCompetence,
      input.sequence.toString(),
      input.postedOn,
      input.amountInMinorUnits.toString(),
      input.description,
      input.transactionType,
      input.installmentCurrent?.toString() ?? '',
      input.installmentTotal?.toString() ?? '',
    ].join('\u001F'),
  );
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

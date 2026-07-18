export const MAX_OFX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_OFX_TRANSACTIONS = 1_000;

export type OfxParseErrorCode =
  | 'OFX_EMPTY_FILE'
  | 'OFX_INVALID_FORMAT'
  | 'OFX_UNSUPPORTED_CURRENCY'
  | 'OFX_INVALID_PERIOD'
  | 'OFX_INVALID_TRANSACTION'
  | 'OFX_TOO_MANY_TRANSACTIONS';

export type ParsedOfxTransaction = Readonly<{
  sequence: number;
  externalId: string | null;
  postedOn: string;
  amountInMinorUnits: bigint;
  description: string;
  transactionType: string;
}>;

export type ParsedOfx = Readonly<{
  periodStart: string;
  periodEnd: string;
  transactions: readonly ParsedOfxTransaction[];
  creditTotalInMinorUnits: bigint;
  debitTotalInMinorUnits: bigint;
}>;

export class OfxParseError extends Error {
  readonly code: OfxParseErrorCode;

  constructor(code: OfxParseErrorCode) {
    super(code);
    this.name = 'OfxParseError';
    this.code = code;
  }
}

export function decodeOfxBytes(bytes: ArrayBuffer): string {
  const headerBytes = bytes.slice(0, Math.min(bytes.byteLength, 2_048));
  const header = new TextDecoder('windows-1252').decode(headerBytes);
  const encoding = readHeaderValue(header, 'ENCODING');
  const charset = readHeaderValue(header, 'CHARSET');
  const declaredEncoding = `${encoding ?? ''} ${charset ?? ''}`.toUpperCase();
  const decoder = declaredEncoding.includes('1252')
    ? new TextDecoder('windows-1252')
    : new TextDecoder('utf-8');

  return decoder.decode(bytes);
}

export function parseOfx(content: string): ParsedOfx {
  const normalized = content.replace(/^\uFEFF/, '').trim();

  if (!normalized) {
    throw new OfxParseError('OFX_EMPTY_FILE');
  }

  if (!/<OFX(?:\s|>)/i.test(normalized)) {
    throw new OfxParseError('OFX_INVALID_FORMAT');
  }

  const currency = readTagValue(normalized, 'CURDEF')?.toUpperCase();

  if (currency && currency !== 'BRL') {
    throw new OfxParseError('OFX_UNSUPPORTED_CURRENCY');
  }

  const transactionBlocks = readTransactionBlocks(normalized);

  if (transactionBlocks.length === 0) {
    throw new OfxParseError('OFX_INVALID_FORMAT');
  }

  if (transactionBlocks.length > MAX_OFX_TRANSACTIONS) {
    throw new OfxParseError('OFX_TOO_MANY_TRANSACTIONS');
  }

  const transactions = transactionBlocks.map((block, sequence) =>
    parseTransaction(block, sequence),
  );
  const postedDates = transactions.map((transaction) => transaction.postedOn).sort();
  const declaredStart = readTagValue(normalized, 'DTSTART');
  const declaredEnd = readTagValue(normalized, 'DTEND');
  const periodStart = declaredStart ? parseOfxDate(declaredStart) : postedDates[0];
  const periodEnd = declaredEnd
    ? parseOfxDate(declaredEnd)
    : postedDates[postedDates.length - 1];

  if (!periodStart || !periodEnd || periodStart > periodEnd) {
    throw new OfxParseError('OFX_INVALID_PERIOD');
  }

  let creditTotalInMinorUnits = 0n;
  let debitTotalInMinorUnits = 0n;

  for (const transaction of transactions) {
    if (transaction.amountInMinorUnits > 0n) {
      creditTotalInMinorUnits += transaction.amountInMinorUnits;
    } else if (transaction.amountInMinorUnits < 0n) {
      debitTotalInMinorUnits += -transaction.amountInMinorUnits;
    }
  }

  return {
    periodStart,
    periodEnd,
    transactions,
    creditTotalInMinorUnits,
    debitTotalInMinorUnits,
  };
}

function parseTransaction(block: string, sequence: number): ParsedOfxTransaction {
  const date = readTagValue(block, 'DTPOSTED');
  const amount = readTagValue(block, 'TRNAMT');

  if (!date || !amount) {
    throw new OfxParseError('OFX_INVALID_TRANSACTION');
  }

  const transactionType = sanitizeText(readTagValue(block, 'TRNTYPE') ?? 'OTHER', 32);
  const description = sanitizeText(
    readTagValue(block, 'MEMO') ?? readTagValue(block, 'NAME') ?? transactionType,
    240,
  );
  const externalId = sanitizeNullableText(readTagValue(block, 'FITID'), 160);

  if (!description) {
    throw new OfxParseError('OFX_INVALID_TRANSACTION');
  }

  return {
    sequence,
    externalId,
    postedOn: parseOfxDate(date),
    amountInMinorUnits: parseMoneyInMinorUnits(amount),
    description,
    transactionType,
  };
}

function readTransactionBlocks(content: string): string[] {
  const blocks: string[] = [];
  const pattern = /<STMTTRN(?:\s[^>]*)?>([\s\S]*?)(?=<\/STMTTRN>|<STMTTRN(?:\s|>)|<\/BANKTRANLIST>)/gi;

  for (const match of content.matchAll(pattern)) {
    if (match[1]?.trim()) {
      blocks.push(match[1]);
    }
  }

  return blocks;
}

function readTagValue(content: string, tag: string): string | null {
  const pattern = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([^<\\r\\n]+?)(?=<|\\r?\\n|$)`,
    'i',
  );
  const value = pattern.exec(content)?.[1];

  return value ? decodeEntities(value.trim()) : null;
}

function readHeaderValue(content: string, name: string): string | null {
  const pattern = new RegExp(`(?:^|\\r?\\n)${name}:\\s*([^\\r\\n]+)`, 'i');
  return pattern.exec(content)?.[1]?.trim() ?? null;
}

function parseOfxDate(value: string): string {
  const match = /^(\d{4})(\d{2})(\d{2})/.exec(value.trim());

  if (!match) {
    throw new OfxParseError('OFX_INVALID_TRANSACTION');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new OfxParseError('OFX_INVALID_TRANSACTION');
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function parseMoneyInMinorUnits(value: string): bigint {
  const normalized = value.trim().replace(',', '.');
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(normalized);

  if (!match) {
    throw new OfxParseError('OFX_INVALID_TRANSACTION');
  }

  const fractional = match[3] ?? '';

  if (fractional.length > 2 && /[1-9]/.test(fractional.slice(2))) {
    throw new OfxParseError('OFX_INVALID_TRANSACTION');
  }

  const sign = match[1] === '-' ? -1n : 1n;
  const cents = BigInt(`${match[2]}${fractional.slice(0, 2).padEnd(2, '0')}`);

  return sign * cents;
}

function sanitizeNullableText(value: string | null, maxLength: number): string | null {
  if (!value) {
    return null;
  }

  const sanitized = sanitizeText(value, maxLength);
  return sanitized || null;
}

function sanitizeText(value: string, maxLength: number): string {
  return value.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

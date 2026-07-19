export const TRANSACTION_DESCRIPTION_NORMALIZATION_VERSION = 'description-v1' as const;

export type TransactionGroupingMetadata = Readonly<{
  transactionType: string;
  sourceKind?: string;
}>;

export type TransactionDescriptionInput = Readonly<{
  description: string;
  metadata: TransactionGroupingMetadata;
}>;

export type DescriptionTransformation =
  | 'unicode-compatibility'
  | 'case-folding'
  | 'diacritic-folding'
  | 'separator-folding'
  | 'whitespace-folding'
  | 'volatile-identifier-removal';

export type RemovedNoiseSummary = Readonly<{
  kind: 'uuid';
  count: number;
}>;

export type NormalizedTransactionDescription = Readonly<{
  originalDescription: string;
  normalizedDescription: string;
  groupKey: string;
  explanation: Readonly<{
    version: typeof TRANSACTION_DESCRIPTION_NORMALIZATION_VERSION;
    appliedTransformations: readonly DescriptionTransformation[];
    removedNoise: readonly RemovedNoiseSummary[];
    groupingBasis: 'normalized-description' | 'original-description-fallback';
    groupDimensions: Readonly<{
      transactionType: string;
      sourceKind: string | null;
    }>;
  }>;
}>;

const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const COMBINING_MARK_PATTERN = /\p{M}+/gu;
const SEPARATOR_PATTERN = /[^\p{L}\p{N}\s]+/gu;
const WHITESPACE_PATTERN = /\s+/gu;

export function normalizeTransactionDescription(
  input: TransactionDescriptionInput,
): NormalizedTransactionDescription {
  const transformations: DescriptionTransformation[] = [];
  const compatibilityFolded = input.description.normalize('NFKC');

  if (compatibilityFolded !== input.description) {
    transformations.push('unicode-compatibility');
  }

  const caseFolded = compatibilityFolded.toLowerCase();

  if (caseFolded !== compatibilityFolded) {
    transformations.push('case-folding');
  }

  const decomposed = caseFolded.normalize('NFD');
  const diacriticFolded = decomposed.replace(COMBINING_MARK_PATTERN, '');

  if (diacriticFolded !== decomposed) {
    transformations.push('diacritic-folding');
  }

  const noiseResult = removeVolatileIdentifiers(diacriticFolded);

  if (noiseResult.removedNoise.length > 0) {
    transformations.push('volatile-identifier-removal');
  }

  const normalizedDescription = foldSeparatorsAndWhitespace(
    noiseResult.text,
    transformations,
  );
  const groupingBasis =
    normalizedDescription.length > 0
      ? 'normalized-description'
      : 'original-description-fallback';
  const groupingText =
    groupingBasis === 'normalized-description'
      ? normalizedDescription
      : compatibilityFolded.toLowerCase().trim();
  const transactionType = normalizeMetadataValue(input.metadata.transactionType);
  const sourceKind =
    input.metadata.sourceKind === undefined
      ? null
      : normalizeMetadataValue(input.metadata.sourceKind);

  return {
    originalDescription: input.description,
    normalizedDescription,
    groupKey: createGroupKey({
      groupingBasis,
      groupingText,
      transactionType,
      sourceKind,
    }),
    explanation: {
      version: TRANSACTION_DESCRIPTION_NORMALIZATION_VERSION,
      appliedTransformations: transformations,
      removedNoise: noiseResult.removedNoise,
      groupingBasis,
      groupDimensions: {
        transactionType,
        sourceKind,
      },
    },
  };
}

function removeVolatileIdentifiers(text: string): Readonly<{
  text: string;
  removedNoise: readonly RemovedNoiseSummary[];
}> {
  let uuidCount = 0;
  const withoutUuids = text.replace(UUID_PATTERN, () => {
    uuidCount += 1;
    return ' ';
  });
  const tokens = tokenize(withoutUuids);

  // Removing identifiers is deliberately restricted to a structurally
  // recognizable UUID. Long numeric tokens may identify a PIX counterparty,
  // contract or invoice and therefore remain part of the grouping evidence.
  if (tokens.length < 2 || uuidCount === 0) {
    return {
      text,
      removedNoise: [],
    };
  }

  return {
    text: tokens.join(' '),
    removedNoise: [{ kind: 'uuid', count: uuidCount }],
  };
}

function tokenize(text: string): string[] {
  return text
    .replace(SEPARATOR_PATTERN, ' ')
    .trim()
    .split(WHITESPACE_PATTERN)
    .filter(Boolean);
}

function foldSeparatorsAndWhitespace(
  text: string,
  transformations: DescriptionTransformation[],
): string {
  const separatorFolded = text.replace(SEPARATOR_PATTERN, ' ');

  if (separatorFolded !== text) {
    transformations.push('separator-folding');
  }

  const whitespaceFolded = separatorFolded.replace(WHITESPACE_PATTERN, ' ').trim();

  if (whitespaceFolded !== separatorFolded) {
    transformations.push('whitespace-folding');
  }

  return whitespaceFolded;
}

function normalizeMetadataValue(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARK_PATTERN, '')
    .replace(SEPARATOR_PATTERN, ' ')
    .replace(WHITESPACE_PATTERN, ' ')
    .trim();
}

function createGroupKey(input: {
  groupingBasis: 'normalized-description' | 'original-description-fallback';
  groupingText: string;
  transactionType: string;
  sourceKind: string | null;
}): string {
  const dimensions = [
    TRANSACTION_DESCRIPTION_NORMALIZATION_VERSION,
    `transaction-type=${encodeURIComponent(input.transactionType)}`,
    `source-kind=${encodeURIComponent(input.sourceKind ?? '')}`,
    `basis=${input.groupingBasis}`,
    `description=${encodeURIComponent(input.groupingText)}`,
  ];

  return dimensions.join('|');
}

export const CLASSIFICATION_TAXONOMY_VERSION = 'classification-taxonomy-v1' as const;
export const CLASSIFICATION_SANITIZER_VERSION = 'classification-sanitizer-v1' as const;
export const CLASSIFICATION_PROMPT_VERSION = 'monthly-classification-prompt-v1' as const;
export const CLASSIFICATION_SCHEMA_VERSION = 'monthly-classification-schema-v1' as const;

export const CLASSIFICATION_CATEGORIES = [
  {
    id: 'housing',
    label: 'Moradia',
    description: 'Aluguel, condomínio, energia, água, manutenção e custos da casa.',
  },
  {
    id: 'food',
    label: 'Alimentação',
    description: 'Mercado, restaurante, padaria, delivery e refeições.',
  },
  {
    id: 'transport',
    label: 'Transporte',
    description: 'Combustível, transporte por aplicativo, estacionamento e manutenção.',
  },
  {
    id: 'health',
    label: 'Saúde',
    description: 'Plano de saúde, consultas, exames, farmácia e cuidados de saúde.',
  },
  {
    id: 'education',
    label: 'Educação',
    description: 'Cursos, livros, mensalidades e materiais de estudo.',
  },
  {
    id: 'leisure',
    label: 'Lazer',
    description: 'Passeios, jogos, viagens, cultura e entretenimento.',
  },
  {
    id: 'subscriptions',
    label: 'Assinaturas e serviços',
    description: 'Software, streaming, internet, telefone e serviços recorrentes.',
  },
  {
    id: 'taxes_and_fees',
    label: 'Impostos e tarifas',
    description: 'Tributos, tarifas bancárias, juros, multas e taxas públicas.',
  },
  {
    id: 'business_operations',
    label: 'Operação da Empresa',
    description: 'Ferramentas, fornecedores e serviços necessários à operação empresarial.',
  },
  {
    id: 'other',
    label: 'Outros',
    description: 'Finalidade identificável que não pertence às demais categorias.',
  },
] as const;

export type ClassificationCategoryId =
  (typeof CLASSIFICATION_CATEGORIES)[number]['id'];

export const CLASSIFICATION_CATEGORY_IDS = CLASSIFICATION_CATEGORIES.map(
  (category) => category.id,
) as readonly ClassificationCategoryId[];

export const CLASSIFICATION_EVIDENCE = [
  'known_merchant',
  'description_semantics',
  'recurring_pattern',
  'insufficient',
] as const;

export type ClassificationEvidence = (typeof CLASSIFICATION_EVIDENCE)[number];

export const CLASSIFICATION_UNCERTAINTIES = ['low', 'medium', 'high'] as const;
export type ClassificationUncertainty =
  (typeof CLASSIFICATION_UNCERTAINTIES)[number];

export const MANUAL_REVIEW_REASONS = [
  'sensitive_transfer',
  'possible_prompt_injection',
  'empty_after_redaction',
] as const;

export type ManualReviewReason = (typeof MANUAL_REVIEW_REASONS)[number];

export type SanitizedClassificationDescription =
  | Readonly<{
      kind: 'safe';
      text: string;
    }>
  | Readonly<{
      kind: 'manual_review';
      reason: ManualReviewReason;
    }>;

const TRANSFER_PATTERN =
  /\b(?:pix|ted|doc|transfer(?:encia|ido|ida)?|pagamento\s+(?:a|para)|recebido\s+de|enviado\s+para)\b/iu;
const PROMPT_INJECTION_PATTERN =
  /\b(?:ignore|ignorar|desconsidere|sistema|system|developer|assistant|instru(?:cao|coes)|prompt|execute|responda|retorne)\b/iu;
const EMAIL_PATTERN = /\b[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}\b/giu;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/giu;
const LABELED_IDENTIFIER_PATTERN =
  /\b(?:cpf|cnpj|conta|agencia|cartao|documento|chave|telefone|celular)\s*[:#-]?\s*[\p{L}\p{N}./-]+/giu;
const DIGIT_PATTERN = /\p{N}+/gu;
const COMBINING_MARK_PATTERN = /\p{M}+/gu;
const UNSAFE_CHARACTER_PATTERN = /[^\p{L}\s]+/gu;
const WHITESPACE_PATTERN = /\s+/gu;
const MAX_SANITIZED_DESCRIPTION_LENGTH = 96;

export function sanitizeClassificationDescription(
  value: string,
): SanitizedClassificationDescription {
  const compatibilityFolded = value.normalize('NFKC');
  const lowercase = compatibilityFolded.toLowerCase();
  const folded = lowercase
    .normalize('NFD')
    .replace(COMBINING_MARK_PATTERN, '');

  if (TRANSFER_PATTERN.test(folded)) {
    return { kind: 'manual_review', reason: 'sensitive_transfer' };
  }

  if (PROMPT_INJECTION_PATTERN.test(folded)) {
    return { kind: 'manual_review', reason: 'possible_prompt_injection' };
  }

  const redacted = folded
    .replace(EMAIL_PATTERN, ' ')
    .replace(URL_PATTERN, ' ')
    .replace(LABELED_IDENTIFIER_PATTERN, ' ')
    .replace(DIGIT_PATTERN, ' ')
    .replace(UNSAFE_CHARACTER_PATTERN, ' ')
    .replace(WHITESPACE_PATTERN, ' ')
    .trim()
    .slice(0, MAX_SANITIZED_DESCRIPTION_LENGTH)
    .trim();

  if (redacted.length === 0) {
    return { kind: 'manual_review', reason: 'empty_after_redaction' };
  }

  return { kind: 'safe', text: redacted };
}

export function isClassificationCategoryId(
  value: unknown,
): value is ClassificationCategoryId {
  return (
    typeof value === 'string' &&
    (CLASSIFICATION_CATEGORY_IDS as readonly string[]).includes(value)
  );
}

export function classificationCategoryLabel(
  categoryId: ClassificationCategoryId,
): string {
  const category = CLASSIFICATION_CATEGORIES.find(
    (candidate) => candidate.id === categoryId,
  );

  if (!category) {
    throw new Error('UNKNOWN_CLASSIFICATION_CATEGORY');
  }

  return category.label;
}

export type ModelClassification = Readonly<{
  groupId: string;
  suggestedCategoryId: ClassificationCategoryId | null;
  evidence: ClassificationEvidence;
  uncertainty: ClassificationUncertainty;
}>;

export function validateModelClassifications(
  value: unknown,
  expectedGroupIds: readonly string[],
): readonly ModelClassification[] {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('classifications' in value) ||
    !Array.isArray((value as { classifications?: unknown }).classifications)
  ) {
    throw new Error('AI_INVALID_RESPONSE');
  }

  const classifications = (
    value as { classifications: readonly unknown[] }
  ).classifications;
  const expectedIds = new Set(expectedGroupIds);
  const seenIds = new Set<string>();
  const parsed: ModelClassification[] = [];

  if (classifications.length !== expectedGroupIds.length) {
    throw new Error('AI_INVALID_RESPONSE');
  }

  for (const candidate of classifications) {
    if (typeof candidate !== 'object' || candidate === null) {
      throw new Error('AI_INVALID_RESPONSE');
    }

    const item = candidate as Record<string, unknown>;
    const keys = Object.keys(item).sort();
    const expectedKeys = [
      'evidence',
      'groupId',
      'suggestedCategoryId',
      'uncertainty',
    ];

    if (
      keys.length !== expectedKeys.length ||
      keys.some((key, index) => key !== expectedKeys[index]) ||
      typeof item.groupId !== 'string' ||
      !expectedIds.has(item.groupId) ||
      seenIds.has(item.groupId) ||
      (item.suggestedCategoryId !== null &&
        !isClassificationCategoryId(item.suggestedCategoryId)) ||
      typeof item.evidence !== 'string' ||
      !(CLASSIFICATION_EVIDENCE as readonly string[]).includes(item.evidence) ||
      typeof item.uncertainty !== 'string' ||
      !(CLASSIFICATION_UNCERTAINTIES as readonly string[]).includes(
        item.uncertainty,
      )
    ) {
      throw new Error('AI_INVALID_RESPONSE');
    }

    seenIds.add(item.groupId);
    parsed.push({
      groupId: item.groupId,
      suggestedCategoryId:
        item.suggestedCategoryId as ClassificationCategoryId | null,
      evidence: item.evidence as ClassificationEvidence,
      uncertainty: item.uncertainty as ClassificationUncertainty,
    });
  }

  return parsed;
}

export function createClassificationJsonSchema(
  groupIds: readonly string[],
): Readonly<Record<string, unknown>> {
  return {
    type: 'object',
    properties: {
      classifications: {
        type: 'array',
        minItems: groupIds.length,
        maxItems: groupIds.length,
        items: {
          type: 'object',
          properties: {
            groupId: { type: 'string', enum: [...groupIds] },
            suggestedCategoryId: {
              anyOf: [
                {
                  type: 'string',
                  enum: [...CLASSIFICATION_CATEGORY_IDS],
                },
                { type: 'null' },
              ],
            },
            evidence: {
              type: 'string',
              enum: [...CLASSIFICATION_EVIDENCE],
            },
            uncertainty: {
              type: 'string',
              enum: [...CLASSIFICATION_UNCERTAINTIES],
            },
          },
          required: [
            'groupId',
            'suggestedCategoryId',
            'evidence',
            'uncertainty',
          ],
          additionalProperties: false,
        },
      },
    },
    required: ['classifications'],
    additionalProperties: false,
  };
}

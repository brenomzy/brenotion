import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const brlMoneyValidator = v.object({
  amountInMinorUnits: v.int64(),
  currency: v.literal('BRL'),
  minorUnit: v.literal('cent'),
});

export const confidenceValidator = v.union(
  v.literal('recent'),
  v.literal('partial'),
  v.literal('stale'),
);

export const importBatchStatusValidator = v.union(
  v.literal('preview'),
  v.literal('confirmed'),
  v.literal('discarded'),
  v.literal('rejected'),
);

export const importUploadStatusValidator = v.union(
  v.literal('pending'),
  v.literal('attached'),
  v.literal('consumed'),
  v.literal('cleaned'),
);

export const importFormatValidator = v.union(
  v.literal('ofx'),
  v.literal('itauCreditCardXlsx'),
);

export const sourceAccountKindValidator = v.union(
  v.literal('bankAccount'),
  v.literal('creditCard'),
);

export const sourcePatrimonyValidator = v.union(
  v.literal('personal'),
  v.literal('business'),
);

export const reportedExpenseSourcePatrimonyValidator = v.union(
  sourcePatrimonyValidator,
  v.literal('needsConfirmation'),
);

export const reportedExpenseStatusValidator = v.union(
  v.literal('provisional'),
  v.literal('reconciled'),
  v.literal('voided'),
);

export const creditCardTransactionKindValidator = v.union(
  v.literal('purchase'),
  v.literal('creditAdjustment'),
  v.literal('statementPayment'),
);

export const economicNatureValidator = v.union(
  v.literal('personal'),
  v.literal('business'),
);

export const classificationCategoryValidator = v.union(
  v.literal('housing'),
  v.literal('food'),
  v.literal('transport'),
  v.literal('health'),
  v.literal('education'),
  v.literal('leisure'),
  v.literal('subscriptions'),
  v.literal('taxes_and_fees'),
  v.literal('business_operations'),
  v.literal('other'),
);

export const aiClassificationJobStatusValidator = v.union(
  v.literal('queued'),
  v.literal('running'),
  v.literal('needs_review'),
  v.literal('completed'),
  v.literal('failed'),
);

export const aiClassificationEvidenceValidator = v.union(
  v.literal('known_merchant'),
  v.literal('description_semantics'),
  v.literal('recurring_pattern'),
  v.literal('insufficient'),
);

export const aiClassificationUncertaintyValidator = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
);

export const aiClassificationSuggestionStatusValidator = v.union(
  v.literal('pending'),
  v.literal('confirmed'),
  v.literal('corrected'),
  v.literal('abstained'),
);

export const paymentOriginValidator = v.union(
  v.literal('personal'),
  v.literal('business'),
  v.literal('needsConfirmation'),
);

export const obligationOccurrenceStatusValidator = v.union(
  v.literal('pending'),
  v.literal('completed'),
  v.literal('waived'),
  v.literal('needsAttention'),
);

export const obligationOccurrenceCompletionKindValidator = v.literal(
  'manualConfirmation',
);

export const obligationOccurrenceWaiverReasonValidator = v.union(
  v.literal('notDueThisCompetence'),
  v.literal('cancelledForCompetence'),
  v.literal('duplicateOccurrence'),
);

export const monthlyClosureCheckCodeValidator = v.union(
  v.literal('OWNER_PROFILE_UNAVAILABLE'),
  v.literal('IMPORT_SEARCH_TRUNCATED'),
  v.literal('OBLIGATION_SEARCH_TRUNCATED'),
  v.literal('PERSONAL_BANK_MISSING'),
  v.literal('PERSONAL_BANK_PREVIEW_ONLY'),
  v.literal('CREDIT_CARD_MISSING'),
  v.literal('CREDIT_CARD_PREVIEW_ONLY'),
  v.literal('BUSINESS_BANK_MISSING'),
  v.literal('BUSINESS_BANK_PREVIEW_ONLY'),
  v.literal('OBLIGATION_OCCURRENCES_NOT_MATERIALIZED'),
  v.literal('OBLIGATION_OCCURRENCES_PENDING'),
  v.literal('OBLIGATION_OCCURRENCES_NEED_ATTENTION'),
  v.literal('CLASSIFICATION_COMPLETENESS_UNAVAILABLE'),
  v.literal('OBLIGATION_PAYMENT_IDENTIFICATION_UNAVAILABLE'),
  v.literal('REPORTED_EXPENSE_CLOSURE_CHECK_UNAVAILABLE'),
  v.literal('DOCUMENT_CHECK_UNAVAILABLE'),
  v.literal('DISTRIBUTION_CHECK_UNAVAILABLE'),
  v.literal('MARGIN_CHECK_UNAVAILABLE'),
  v.literal('BUSINESS_SUMMARY_UNAVAILABLE'),
  v.literal('FINANCIAL_CALCULATION_UNAVAILABLE'),
);

export const monthlyClosureUnavailableCapabilityValidator = v.union(
  v.literal('classificationCompleteness'),
  v.literal('identifiedObligationPayments'),
  v.literal('reportedExpenseClosureCheck'),
  v.literal('documents'),
  v.literal('distributions'),
  v.literal('unexpectedMargin'),
  v.literal('businessSummary'),
  v.literal('financialCalculation'),
);

const monthlyClosureSourceSnapshotValidator = v.object({
  status: v.union(
    v.literal('missing'),
    v.literal('preview'),
    v.literal('confirmed'),
  ),
  batchId: v.union(v.id('importBatches'), v.null()),
  importedAt: v.union(v.number(), v.null()),
});

export default defineSchema({
  ownerProfiles: defineTable({
    ownerId: v.string(),
    preferredCurrency: v.literal('BRL'),
    locale: v.literal('pt-BR'),
    timeZone: v.string(),
    updatedAt: v.number(),
  }).index('by_ownerId', ['ownerId']),
  financialSnapshots: defineTable({
    ownerId: v.string(),
    availableToSpend: brlMoneyValidator,
    asOf: v.number(),
    timeZone: v.string(),
    confidence: confidenceValidator,
    calculationVersion: v.string(),
    updatedAt: v.number(),
  }).index('by_ownerId', ['ownerId']),
  importUploads: defineTable({
    ownerId: v.string(),
    format: v.optional(importFormatValidator),
    sourcePatrimony: v.optional(sourcePatrimonyValidator),
    status: importUploadStatusValidator,
    storageId: v.optional(v.id('_storage')),
    fileHash: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.number(),
    attachedAt: v.optional(v.number()),
    consumedAt: v.optional(v.number()),
    cleanedAt: v.optional(v.number()),
  }).index('by_ownerId_and_createdAt', ['ownerId', 'createdAt']),
  importBatches: defineTable({
    ownerId: v.string(),
    fileHash: v.string(),
    format: importFormatValidator,
    sourceAccountKind: v.optional(sourceAccountKindValidator),
    sourcePatrimony: v.optional(sourcePatrimonyValidator),
    parserVersion: v.optional(v.string()),
    status: importBatchStatusValidator,
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    statementTitle: v.optional(v.string()),
    statementCompetence: v.optional(v.string()),
    statementDueOn: v.optional(v.string()),
    statementTotal: v.optional(brlMoneyValidator),
    purchaseTotal: v.optional(brlMoneyValidator),
    creditAdjustmentTotal: v.optional(brlMoneyValidator),
    settlementTotal: v.optional(brlMoneyValidator),
    transactionCount: v.number(),
    duplicateCount: v.number(),
    creditTotal: brlMoneyValidator,
    debitTotal: brlMoneyValidator,
    rejectionCode: v.optional(v.string()),
    rawFileStatus: v.literal('deleted'),
    rawDeletedAt: v.number(),
    insertedCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    confirmedAt: v.optional(v.number()),
    discardedAt: v.optional(v.number()),
  })
    .index('by_ownerId_and_fileHash', ['ownerId', 'fileHash'])
    .index('by_ownerId_and_fileHash_and_sourcePatrimony', [
      'ownerId',
      'fileHash',
      'sourcePatrimony',
    ])
    .index('by_ownerId_and_createdAt', ['ownerId', 'createdAt'])
    .index('by_ownerId_and_status_and_confirmedAt', [
      'ownerId',
      'status',
      'confirmedAt',
    ]),
  importBatchEntries: defineTable({
    ownerId: v.string(),
    batchId: v.id('importBatches'),
    sequence: v.number(),
    sourceKey: v.string(),
    postedOn: v.string(),
    amount: brlMoneyValidator,
    description: v.string(),
    transactionType: v.string(),
    sourceAccountKind: v.optional(sourceAccountKindValidator),
    sourcePatrimony: v.optional(sourcePatrimonyValidator),
    installmentCurrent: v.optional(v.number()),
    installmentTotal: v.optional(v.number()),
    isDuplicate: v.boolean(),
  }).index('by_batchId_and_sequence', ['batchId', 'sequence']),
  sourceTransactions: defineTable({
    ownerId: v.string(),
    sourceKey: v.string(),
    importBatchId: v.id('importBatches'),
    postedOn: v.string(),
    amount: brlMoneyValidator,
    description: v.string(),
    transactionType: v.string(),
    sourceAccountKind: v.optional(sourceAccountKindValidator),
    sourcePatrimony: v.optional(sourcePatrimonyValidator),
    installmentCurrent: v.optional(v.number()),
    installmentTotal: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_ownerId_and_sourceKey', ['ownerId', 'sourceKey'])
    .index('by_ownerId_and_postedOn', ['ownerId', 'postedOn'])
    .index('by_ownerId_and_importBatchId_and_postedOn', [
      'ownerId',
      'importBatchId',
      'postedOn',
    ]),
  cardSettlementReconciliations: defineTable({
    ownerId: v.string(),
    statementPaymentTransactionId: v.id('sourceTransactions'),
    bankDebitTransactionId: v.id('sourceTransactions'),
    ruleVersion: v.literal('exact-opposite-within-seven-days-v1'),
    dayDistance: v.number(),
    confirmedAt: v.number(),
  })
    .index('by_ownerId_and_statementPaymentTransactionId', [
      'ownerId',
      'statementPaymentTransactionId',
    ])
    .index('by_ownerId_and_bankDebitTransactionId', [
      'ownerId',
      'bankDebitTransactionId',
    ]),
  obligations: defineTable({
    ownerId: v.string(),
    obligationKey: v.string(),
    name: v.string(),
    economicNature: economicNatureValidator,
    paymentOrigin: paymentOriginValidator,
    expectedAmount: v.optional(brlMoneyValidator),
    dueDayOfMonth: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    revisionNumber: v.optional(v.int64()),
    currentRevisionId: v.optional(v.id('obligationRevisions')),
  })
    .index('by_ownerId_and_obligationKey', ['ownerId', 'obligationKey'])
    .index('by_ownerId_and_name', ['ownerId', 'name'])
    .index('by_ownerId_and_isActive_and_name', ['ownerId', 'isActive', 'name']),
  obligationOccurrences: defineTable({
    ownerId: v.string(),
    obligationId: v.id('obligations'),
    sourceObligationRevisionId: v.optional(v.id('obligationRevisions')),
    competence: v.string(),
    obligationKey: v.string(),
    name: v.string(),
    economicNature: economicNatureValidator,
    paymentOrigin: paymentOriginValidator,
    expectedAmount: v.optional(brlMoneyValidator),
    dueDayOfMonth: v.optional(v.number()),
    dueOn: v.optional(v.string()),
    status: obligationOccurrenceStatusValidator,
    materializedAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
    completionKind: v.optional(obligationOccurrenceCompletionKindValidator),
    waivedAt: v.optional(v.number()),
    waiverReason: v.optional(obligationOccurrenceWaiverReasonValidator),
  })
    .index('by_ownerId_and_competence_and_obligationId', [
      'ownerId',
      'competence',
      'obligationId',
    ])
    .index('by_ownerId_and_competence_and_dueOn', [
      'ownerId',
      'competence',
      'dueOn',
    ])
    .index('by_ownerId_and_competence_and_status_and_dueOn', [
      'ownerId',
      'competence',
      'status',
      'dueOn',
    ]),
  monthlyClosures: defineTable({
    ownerId: v.string(),
    competence: v.string(),
    revisionNumber: v.int64(),
    supersedesClosureId: v.optional(v.id('monthlyClosures')),
    closedAt: v.number(),
    timeZone: v.string(),
    readinessVersion: v.literal('monthly-closure-readiness-v1'),
    closurePolicyVersion: v.literal('metadata-only-partial-v1'),
    inputFingerprint: v.string(),
    sourceCoverage: v.object({
      personalBank: monthlyClosureSourceSnapshotValidator,
      creditCard: monthlyClosureSourceSnapshotValidator,
      businessBank: monthlyClosureSourceSnapshotValidator,
    }),
    occurrenceSummary: v.object({
      total: v.number(),
      pending: v.number(),
      completed: v.number(),
      waived: v.number(),
      needsAttention: v.number(),
      manualCompletionCount: v.number(),
      identifiedPaymentCount: v.literal(0),
      isSearchExhaustive: v.boolean(),
    }),
    acknowledgedCheckCodes: v.array(monthlyClosureCheckCodeValidator),
    unavailableCapabilities: v.array(
      monthlyClosureUnavailableCapabilityValidator,
    ),
    confidenceAtClosure: v.literal('partial'),
    financialCalculationStatus: v.literal('unavailable'),
    idempotencyKey: v.string(),
  })
    .index('by_ownerId_and_competence_and_revisionNumber', [
      'ownerId',
      'competence',
      'revisionNumber',
    ])
    .index('by_ownerId_and_closedAt', ['ownerId', 'closedAt'])
    .index('by_ownerId_and_idempotencyKey', ['ownerId', 'idempotencyKey']),
  financialCycles: defineTable({
    ownerId: v.string(),
    startedOn: v.string(),
    expectedNextReceiptOn: v.string(),
    timeZone: v.string(),
    status: v.literal('open'),
    clientRequestId: v.string(),
    openedAt: v.number(),
  })
    .index('by_ownerId_and_status', ['ownerId', 'status'])
    .index('by_ownerId_and_clientRequestId', ['ownerId', 'clientRequestId']),
  reportedExpenses: defineTable({
    ownerId: v.string(),
    financialCycleId: v.id('financialCycles'),
    amount: brlMoneyValidator,
    description: v.string(),
    occurredOn: v.string(),
    economicNature: economicNatureValidator,
    sourcePatrimony: reportedExpenseSourcePatrimonyValidator,
    status: reportedExpenseStatusValidator,
    clientRequestId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    revisionNumber: v.int64(),
    currentRevisionId: v.optional(v.id('reportedExpenseRevisions')),
  })
    .index('by_ownerId_and_financialCycleId_and_occurredOn', [
      'ownerId',
      'financialCycleId',
      'occurredOn',
    ])
    .index('by_ownerId_and_clientRequestId', ['ownerId', 'clientRequestId']),
  reportedExpenseRevisions: defineTable({
    ownerId: v.string(),
    reportedExpenseId: v.id('reportedExpenses'),
    revisionNumber: v.int64(),
    reason: v.union(
      v.literal('created'),
      v.literal('updated'),
      v.literal('voided'),
      v.literal('reconciled'),
    ),
    snapshot: v.object({
      amount: brlMoneyValidator,
      description: v.string(),
      occurredOn: v.string(),
      economicNature: economicNatureValidator,
      sourcePatrimony: reportedExpenseSourcePatrimonyValidator,
      status: reportedExpenseStatusValidator,
      updatedAt: v.number(),
    }),
    recordedAt: v.number(),
  }).index('by_ownerId_and_reportedExpenseId_and_revisionNumber', [
    'ownerId',
    'reportedExpenseId',
    'revisionNumber',
  ]),
  reportedExpenseReconciliations: defineTable({
    ownerId: v.string(),
    reportedExpenseId: v.id('reportedExpenses'),
    sourceTransactionId: v.id('sourceTransactions'),
    ruleVersion: v.literal('exact-opposite-within-seven-days-v1'),
    dayDistance: v.number(),
    confirmedAt: v.number(),
  })
    .index('by_ownerId_and_reportedExpenseId', ['ownerId', 'reportedExpenseId'])
    .index('by_ownerId_and_sourceTransactionId', [
      'ownerId',
      'sourceTransactionId',
    ]),
  classificationDecisions: defineTable({
    ownerId: v.string(),
    groupKey: v.string(),
    normalizedDescription: v.string(),
    economicNature: economicNatureValidator,
    decidedAt: v.number(),
    updatedAt: v.number(),
    revisionNumber: v.optional(v.int64()),
    currentRevisionId: v.optional(v.id('classificationDecisionRevisions')),
  }).index('by_ownerId_and_groupKey', ['ownerId', 'groupKey']),
  classificationRules: defineTable({
    ownerId: v.string(),
    groupKey: v.string(),
    categoryId: classificationCategoryValidator,
    taxonomyVersion: v.literal('classification-taxonomy-v1'),
    ruleVersion: v.literal('classification-rule-v1'),
    confirmedAt: v.number(),
    updatedAt: v.number(),
    revisionNumber: v.int64(),
    currentRevisionId: v.optional(v.id('classificationRuleRevisions')),
  }).index('by_ownerId_and_groupKey', ['ownerId', 'groupKey']),
  classificationRuleRevisions: defineTable({
    ownerId: v.string(),
    ruleId: v.id('classificationRules'),
    revisionNumber: v.int64(),
    reason: v.union(v.literal('created'), v.literal('updated')),
    snapshot: v.object({
      groupKey: v.string(),
      categoryId: classificationCategoryValidator,
      taxonomyVersion: v.literal('classification-taxonomy-v1'),
      ruleVersion: v.literal('classification-rule-v1'),
      confirmedAt: v.number(),
      updatedAt: v.number(),
    }),
    recordedAt: v.number(),
  }).index('by_ownerId_and_ruleId_and_revisionNumber', [
    'ownerId',
    'ruleId',
    'revisionNumber',
  ]),
  aiClassificationJobs: defineTable({
    ownerId: v.string(),
    competence: v.string(),
    inputHash: v.string(),
    status: aiClassificationJobStatusValidator,
    adapter: v.union(v.literal('openai'), v.literal('fake')),
    model: v.string(),
    promptVersion: v.literal('monthly-classification-prompt-v1'),
    schemaVersion: v.literal('monthly-classification-schema-v1'),
    taxonomyVersion: v.literal('classification-taxonomy-v1'),
    sanitizerVersion: v.literal('classification-sanitizer-v1'),
    attemptCount: v.number(),
    modelCallCount: v.number(),
    totalGroupCount: v.number(),
    resolvedByRuleCount: v.number(),
    manualReviewCount: v.number(),
    suggestedCount: v.number(),
    abstainedCount: v.number(),
    rejectedCount: v.number(),
    requestedAt: v.number(),
    updatedAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    estimatedCostInUsdMicros: v.optional(v.number()),
    pricingVersion: v.optional(v.literal('openai-standard-2026-07-19')),
    responseId: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    retryable: v.optional(v.boolean()),
  })
    .index('by_ownerId_and_inputHash', ['ownerId', 'inputHash'])
    .index('by_ownerId_and_competence_and_requestedAt', [
      'ownerId',
      'competence',
      'requestedAt',
    ]),
  aiClassificationSuggestions: defineTable({
    ownerId: v.string(),
    jobId: v.id('aiClassificationJobs'),
    groupId: v.string(),
    groupKey: v.string(),
    sanitizedDescription: v.union(v.string(), v.null()),
    source: v.union(v.literal('model'), v.literal('manual_review')),
    manualReviewReason: v.optional(
      v.union(
        v.literal('sensitive_transfer'),
        v.literal('possible_prompt_injection'),
        v.literal('empty_after_redaction'),
      ),
    ),
    suggestedCategoryId: v.union(classificationCategoryValidator, v.null()),
    evidence: aiClassificationEvidenceValidator,
    uncertainty: aiClassificationUncertaintyValidator,
    status: aiClassificationSuggestionStatusValidator,
    selectedCategoryId: v.optional(classificationCategoryValidator),
    createdAt: v.number(),
    decidedAt: v.optional(v.number()),
  })
    .index('by_jobId_and_groupId', ['jobId', 'groupId'])
    .index('by_ownerId_and_jobId', ['ownerId', 'jobId']),
  obligationRevisions: defineTable({
    ownerId: v.string(),
    obligationId: v.id('obligations'),
    revisionNumber: v.int64(),
    reason: v.union(
      v.literal('created'),
      v.literal('updated'),
      v.literal('legacyBaseline'),
    ),
    snapshot: v.object({
      obligationKey: v.string(),
      name: v.string(),
      economicNature: economicNatureValidator,
      paymentOrigin: paymentOriginValidator,
      expectedAmount: v.optional(brlMoneyValidator),
      dueDayOfMonth: v.optional(v.number()),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    recordedAt: v.number(),
  }).index('by_ownerId_and_obligationId_and_revisionNumber', [
    'ownerId',
    'obligationId',
    'revisionNumber',
  ]),
  classificationDecisionRevisions: defineTable({
    ownerId: v.string(),
    decisionId: v.id('classificationDecisions'),
    revisionNumber: v.int64(),
    reason: v.union(
      v.literal('created'),
      v.literal('updated'),
      v.literal('legacyBaseline'),
    ),
    snapshot: v.object({
      groupKey: v.string(),
      normalizedDescription: v.string(),
      economicNature: economicNatureValidator,
      decidedAt: v.number(),
      updatedAt: v.number(),
    }),
    recordedAt: v.number(),
  }).index('by_ownerId_and_decisionId_and_revisionNumber', [
    'ownerId',
    'decisionId',
    'revisionNumber',
  ]),
  auditEvents: defineTable({
    ownerId: v.string(),
    action: v.union(
      v.literal('owner_profile.created'),
      v.literal('owner_profile.preferences_updated'),
      v.literal('financial_snapshot.replaced'),
      v.literal('import_upload.expired'),
      v.literal('import_upload.cleaned'),
      v.literal('import_batch.preview_created'),
      v.literal('import_batch.confirmed'),
      v.literal('import_batch.discarded'),
      v.literal('import_batch.rejected'),
      v.literal('bank_file.deleted'),
      v.literal('obligation.created'),
      v.literal('obligation.updated'),
      v.literal('obligation_occurrence.materialized'),
      v.literal('obligation_occurrence.manual_completion_confirmed'),
      v.literal('obligation_occurrence.waived'),
      v.literal('obligation_occurrence.marked_needs_attention'),
      v.literal('obligation_occurrence.reopened'),
      v.literal('monthly_closure.closed'),
      v.literal('financial_cycle.opened'),
      v.literal('reported_expense.created'),
      v.literal('reported_expense.updated'),
      v.literal('reported_expense.voided'),
      v.literal('reported_expense.reconciled'),
      v.literal('classification_decision.upserted'),
      v.literal('classification_job.requested'),
      v.literal('classification_suggestion.reviewed'),
      v.literal('classification_rule.upserted'),
      v.literal('card_settlement.reconciled'),
    ),
    targetType: v.union(
      v.literal('owner_profile'),
      v.literal('financial_snapshot'),
      v.literal('import_upload'),
      v.literal('import_batch'),
      v.literal('obligation'),
      v.literal('obligation_occurrence'),
      v.literal('monthly_closure'),
      v.literal('financial_cycle'),
      v.literal('reported_expense'),
      v.literal('reported_expense_reconciliation'),
      v.literal('classification_decision'),
      v.literal('classification_job'),
      v.literal('classification_suggestion'),
      v.literal('classification_rule'),
      v.literal('card_settlement_reconciliation'),
    ),
    targetId: v.union(
      v.id('ownerProfiles'),
      v.id('financialSnapshots'),
      v.id('importUploads'),
      v.id('importBatches'),
      v.id('obligations'),
      v.id('obligationOccurrences'),
      v.id('monthlyClosures'),
      v.id('financialCycles'),
      v.id('reportedExpenses'),
      v.id('reportedExpenseReconciliations'),
      v.id('classificationDecisions'),
      v.id('aiClassificationJobs'),
      v.id('aiClassificationSuggestions'),
      v.id('classificationRules'),
      v.id('cardSettlementReconciliations'),
    ),
    revisionId: v.optional(
      v.union(
        v.id('obligationRevisions'),
        v.id('classificationDecisionRevisions'),
        v.id('classificationRuleRevisions'),
        v.id('reportedExpenseRevisions'),
      ),
    ),
    occurrenceCompletionKind: v.optional(
      obligationOccurrenceCompletionKindValidator,
    ),
    occurrenceWaiverReason: v.optional(
      obligationOccurrenceWaiverReasonValidator,
    ),
    result: v.literal('succeeded'),
    occurredAt: v.number(),
  }).index('by_ownerId_and_occurredAt', ['ownerId', 'occurredAt']),
});

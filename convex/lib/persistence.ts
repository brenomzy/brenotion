import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';

type AuditEvent =
  | {
      action: 'owner_profile.created' | 'owner_profile.preferences_updated';
      targetType: 'owner_profile';
      targetId: Id<'ownerProfiles'>;
    }
  | {
      action: 'financial_snapshot.replaced';
      targetType: 'financial_snapshot';
      targetId: Id<'financialSnapshots'>;
    }
  | {
      action: 'classification_decision.upserted';
      targetType: 'classification_decision';
      targetId: Id<'classificationDecisions'>;
      revisionId: Id<'classificationDecisionRevisions'>;
    }
  | {
      action: 'obligation.created' | 'obligation.updated';
      targetType: 'obligation';
      targetId: Id<'obligations'>;
      revisionId: Id<'obligationRevisions'>;
    }
  | {
      action: 'import_upload.expired' | 'import_upload.cleaned';
      targetType: 'import_upload';
      targetId: Id<'importUploads'>;
    }
  | {
      action:
        | 'import_batch.preview_created'
        | 'import_batch.confirmed'
        | 'import_batch.discarded'
        | 'import_batch.rejected'
        | 'bank_file.deleted';
      targetType: 'import_batch';
      targetId: Id<'importBatches'>;
    }
  | {
      action: 'card_settlement.reconciled';
      targetType: 'card_settlement_reconciliation';
      targetId: Id<'cardSettlementReconciliations'>;
    };

export async function appendAuditEvent(
  ctx: MutationCtx,
  ownerId: string,
  event: AuditEvent,
  occurredAt: number,
): Promise<void> {
  await ctx.db.insert('auditEvents', {
    ownerId,
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId,
    ...('revisionId' in event ? { revisionId: event.revisionId } : {}),
    result: 'succeeded',
    occurredAt,
  });
}

export function normalizeTimeZone(timeZone: string): string {
  const normalized = timeZone.trim();

  if (normalized.length < 3 || normalized.length > 64) {
    throw new Error('INVALID_TIME_ZONE');
  }

  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: normalized }).resolvedOptions().timeZone;
  } catch {
    throw new Error('INVALID_TIME_ZONE');
  }
}

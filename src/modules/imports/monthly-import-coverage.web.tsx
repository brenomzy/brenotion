/* eslint-disable import/no-unresolved -- HugeIcons publishes per-icon JS subpaths without per-icon declarations. */
import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon';
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon';
import Clock01Icon from '@hugeicons/core-free-icons/Clock01Icon';
import FileUploadIcon from '@hugeicons/core-free-icons/FileUploadIcon';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQuery } from 'convex/react';

import { api } from '../../../convex/_generated/api';
import { WebButton } from '@/components/web/ui/button.web';
import { cn } from '@/lib/utils';
import {
  buildMonthlyImportCoverageView,
  shiftCompetence,
  type MonthlyImportSourceId,
  type MonthlyImportStatus,
} from './monthly-import-coverage-model';

type MonthlyImportCoverageProps = {
  competence: string;
  disabled: boolean;
  onCompetenceChange: (competence: string) => void;
  onStartImport: (source: MonthlyImportSourceId) => void;
  onOpenReview: () => void;
};

export function MonthlyImportCoverage({
  competence,
  disabled,
  onCompetenceChange,
  onStartImport,
  onOpenReview,
}: MonthlyImportCoverageProps) {
  const coverage = useQuery(api.monthlyImportCoverage.get, { competence });
  const model = coverage ? buildMonthlyImportCoverageView(coverage) : null;

  return (
    <section
      aria-labelledby="monthly-import-coverage-title"
      aria-busy={coverage === undefined}
      className="rounded-2xl bg-surface p-2 shadow-card">
      <div className="grid gap-5 rounded-lg p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid gap-1">
            <p className="text-overline font-sans-bold uppercase tracking-[0.04em] text-ink-muted">
              Competência mensal
            </p>
            <h2
              id="monthly-import-coverage-title"
              className="text-balance text-title-section font-sans-bold leading-tight">
              {model ? `Arquivos de ${model.competenceLabel}` : 'Verificando arquivos do mês'}
            </h2>
            <p
              aria-live="polite"
              className="max-w-2xl text-pretty text-body leading-relaxed text-ink-muted">
              {model
                ? model.summary
                : 'Consultando os lotes recentes sem alterar nenhuma movimentação.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start">
            <WebButton
              variant="ghost"
              className="size-11 p-0"
              disabled={disabled}
              aria-label="Competência anterior"
              onClick={() => onCompetenceChange(shiftCompetence(competence, -1))}>
              <HugeiconsIcon
                aria-hidden
                icon={ArrowLeft01Icon}
                size={18}
                strokeWidth={1.8}
              />
            </WebButton>
            <label className="grid gap-1">
              <span className="sr-only">Competência</span>
              <input
                type="month"
                value={competence}
                disabled={disabled}
                onChange={(event) => {
                  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.currentTarget.value)) {
                    onCompetenceChange(event.currentTarget.value);
                  }
                }}
                className="min-h-11 rounded-control bg-canvas px-3 text-label font-sans-semibold tabular-nums text-ink shadow-[0_0_0_1px_oklch(0_0_0/0.1)] outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring/45 disabled:opacity-50"
              />
            </label>
            <WebButton
              variant="ghost"
              className="size-11 p-0"
              disabled={disabled}
              aria-label="Próxima competência"
              onClick={() => onCompetenceChange(shiftCompetence(competence, 1))}>
              <HugeiconsIcon
                aria-hidden
                icon={ArrowRight01Icon}
                size={18}
                strokeWidth={1.8}
              />
            </WebButton>
          </div>
        </div>

        {model ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {model.items.map((item) => (
              <article
                key={item.source}
                className="grid content-between gap-5 rounded-card bg-canvas p-4 shadow-[0_0_0_1px_oklch(0_0_0/0.06)]">
                <div className="grid gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <h3 className="text-body font-sans-bold leading-tight">{item.title}</h3>
                      <p className="text-caption font-sans-medium text-ink-muted">
                        {item.formatLabel} · origem {item.originLabel}
                      </p>
                    </div>
                    <CoverageStatus status={item.status} label={item.statusLabel} />
                  </div>
                  <p className="text-caption leading-relaxed text-ink-muted">
                    {item.description}
                  </p>
                </div>
                <WebButton
                  variant={item.status === 'missing' ? 'primary' : 'secondary'}
                  className="w-full"
                  disabled={disabled}
                  onClick={() =>
                    item.status === 'confirmed'
                      ? onOpenReview()
                      : onStartImport(item.source)
                  }>
                  <HugeiconsIcon
                    aria-hidden
                    icon={
                      item.status === 'confirmed'
                        ? CheckmarkCircle02Icon
                        : item.status === 'preview'
                          ? Clock01Icon
                          : FileUploadIcon
                    }
                    size={16}
                    strokeWidth={1.8}
                  />
                  {item.actionLabel}
                </WebButton>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="min-h-44 animate-pulse rounded-card bg-surface-muted"
              />
            ))}
          </div>
        )}

        <p className="text-caption leading-relaxed text-ink-muted">
          Três entradas confirmadas não fecham a competência nem classificam movimentações.
          Patrimônio de Origem e Natureza Econômica continuam independentes.
        </p>
      </div>
    </section>
  );
}

function CoverageStatus({
  status,
  label,
}: {
  status: MonthlyImportStatus;
  label: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-caption font-sans-bold',
        status === 'confirmed'
          ? 'bg-status-recent-soft'
          : status === 'preview'
            ? 'bg-status-warning-soft'
            : 'bg-surface-muted text-ink-muted',
      )}>
      <HugeiconsIcon
        aria-hidden
        icon={
          status === 'confirmed'
            ? CheckmarkCircle02Icon
            : status === 'preview'
              ? Clock01Icon
              : FileUploadIcon
        }
        size={14}
        strokeWidth={1.8}
      />
      {label}
    </span>
  );
}

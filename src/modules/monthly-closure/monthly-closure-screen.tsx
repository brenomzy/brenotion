import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';

import { api } from '../../../convex/_generated/api';
import {
  buildMonthlyClosureViewModel,
  canConfirmMonthlyClosure,
  createMonthlyClosureIdempotencyKey,
  type ClosedMonthlyClosure,
  type MonthlyClosureReadiness,
  type MonthlyClosureReadinessCheck,
} from './monthly-closure-presentation-model';
import {
  MonthlyClosureScreenView,
  type MonthlyClosureScreenState,
} from './monthly-closure-screen-view';
import {
  currentCompetence,
  shiftCompetence,
} from '../imports/monthly-import-coverage-model';

type ReadinessResult =
  (typeof api.monthlyClosures.getReadiness)['_returnType'];
type ClosureHistoryResult =
  (typeof api.monthlyClosures.getByCompetence)['_returnType'];
type CheckCode = ReadinessResult['checks'][number]['code'];

export function MonthlyClosureScreen() {
  const router = useRouter();
  const [competence, setCompetence] = useState(() => currentCompetence());
  const readiness = useQuery(api.monthlyClosures.getReadiness, { competence });
  const history = useQuery(api.monthlyClosures.getByCompetence, { competence });
  const closeMonthlyClosure = useMutation(api.monthlyClosures.close);
  const attemptId = useRef(createAttemptId());
  const [acknowledgements, setAcknowledgements] = useState<{
    fingerprint: string;
    codes: ReadonlySet<string>;
  } | null>(null);
  const [submission, setSubmission] = useState<{
    fingerprint: string;
    status: 'submitting' | 'error';
  } | null>(null);

  const model = useMemo(() => {
    if (!readiness || !history) {
      return null;
    }

    return buildMonthlyClosureViewModel(
      toPresentationReadiness(readiness),
      history.revisions.map(toClosedMonthlyClosure),
    );
  }, [history, readiness]);
  const acknowledgedCheckCodes =
    readiness && acknowledgements?.fingerprint === readiness.fingerprint
      ? acknowledgements.codes
      : EMPTY_CODES;
  const submissionStatus =
    readiness && submission?.fingerprint === readiness.fingerprint
      ? submission.status
      : 'idle';
  const state: MonthlyClosureScreenState =
    readiness === undefined || history === undefined || model === null
      ? { status: 'loading' }
      : {
          status: 'ready',
          model,
          acknowledgedCheckCodes,
          canConfirm: canConfirmMonthlyClosure(model, acknowledgedCheckCodes),
          submissionStatus,
        };

  const changeCompetence = (offset: number) => {
    setCompetence((current) => shiftCompetence(current, offset));
    setSubmission(null);
  };

  const toggleAcknowledgement = (code: string) => {
    if (!readiness) {
      return;
    }

    const allowed = readiness.checks.some(
      (check) => check.code === code && check.acknowledgementAllowed,
    );
    if (!allowed) {
      return;
    }

    setAcknowledgements((current) => {
      const next =
        current?.fingerprint === readiness.fingerprint
          ? new Set(current.codes)
          : new Set<string>();
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return { fingerprint: readiness.fingerprint, codes: next };
    });
    setSubmission(null);
  };

  const confirmClosure = async () => {
    if (!readiness || !model) {
      return;
    }

    const allowedCodes = readiness.checks
      .filter(
        (check) =>
          check.acknowledgementAllowed &&
          acknowledgedCheckCodes.has(check.code),
      )
      .map((check) => check.code);
    if (!canConfirmMonthlyClosure(model, acknowledgedCheckCodes)) {
      return;
    }

    setSubmission({
      fingerprint: readiness.fingerprint,
      status: 'submitting',
    });
    try {
      await closeMonthlyClosure({
        competence,
        readinessFingerprint: readiness.fingerprint,
        acknowledgedCheckCodes: allowedCodes,
        idempotencyKey: createMonthlyClosureIdempotencyKey(
          competence,
          readiness.fingerprint,
          attemptId.current,
        ),
      });
      setSubmission(null);
    } catch {
      setSubmission({
        fingerprint: readiness.fingerprint,
        status: 'error',
      });
    }
  };

  return (
    <MonthlyClosureScreenView
      state={state}
      onBack={() => router.replace('/more')}
      onPreviousCompetence={() => changeCompetence(-1)}
      onNextCompetence={() => changeCompetence(1)}
      onToggleAcknowledgement={toggleAcknowledgement}
      onConfirm={() => void confirmClosure()}
      onRetry={() => setSubmission(null)}
    />
  );
}

const EMPTY_CODES: ReadonlySet<string> = new Set();

function toPresentationReadiness(
  readiness: ReadinessResult,
): MonthlyClosureReadiness {
  return {
    competence: readiness.competence,
    status: readiness.status,
    fingerprint: readiness.fingerprint,
    sources: readiness.coverage.sources.map((source) => ({
      source: source.source,
      status: source.status,
    })),
    checks: readiness.checks.map(toPresentationCheck),
  };
}

function toPresentationCheck(
  check: ReadinessResult['checks'][number],
): MonthlyClosureReadinessCheck {
  const content = CHECK_CONTENT[check.code];

  return {
    code: check.code,
    title: content.title,
    description: content.description,
    status:
      check.severity === 'blocking'
        ? 'blocked'
        : check.code.endsWith('_UNAVAILABLE')
          ? 'unavailable'
          : 'needsAcknowledgement',
    acknowledgementAllowed: check.acknowledgementAllowed,
  };
}

function toClosedMonthlyClosure(
  closure: ClosureHistoryResult['revisions'][number],
): ClosedMonthlyClosure {
  return {
    closureId: closure.closureId,
    competence: closure.competence,
    revisionNumber: closure.revisionNumber,
    closedAt: closure.closedAt,
    confidenceAtClosure: closure.confidenceAtClosure,
    financialCalculationStatus: closure.financialCalculationStatus,
    acknowledgedCheckCodes: closure.acknowledgedCheckCodes,
  };
}

function createAttemptId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const CHECK_CONTENT: Record<
  CheckCode,
  Readonly<{ title: string; description: string }>
> = {
  OWNER_PROFILE_UNAVAILABLE: {
    title: 'Perfil do Titular indisponível',
    description:
      'O fuso horário necessário para registrar o Fechamento não está configurado.',
  },
  IMPORT_SEARCH_TRUNCATED: {
    title: 'Cobertura não verificada por completo',
    description:
      'A busca de lotes atingiu o limite seguro. O Brenotion não pode afirmar que a cobertura está completa.',
  },
  OBLIGATION_SEARCH_TRUNCATED: {
    title: 'Obrigações não verificadas por completo',
    description:
      'A busca de Obrigações atingiu o limite seguro e precisa ser resolvida antes do Fechamento.',
  },
  PERSONAL_BANK_MISSING: {
    title: 'Itaú Pessoal ausente',
    description:
      'Não há extrato OFX pessoal confirmado para esta competência.',
  },
  PERSONAL_BANK_PREVIEW_ONLY: {
    title: 'Itaú Pessoal somente em prévia',
    description:
      'Existe uma prévia do extrato pessoal, mas o lote ainda não foi confirmado.',
  },
  CREDIT_CARD_MISSING: {
    title: 'Fatura do cartão ausente',
    description:
      'Não há fatura XLSX confirmada para esta competência.',
  },
  CREDIT_CARD_PREVIEW_ONLY: {
    title: 'Fatura do cartão somente em prévia',
    description:
      'Existe uma prévia da fatura, mas o lote ainda não foi confirmado.',
  },
  BUSINESS_BANK_MISSING: {
    title: 'Itaú Empresa ausente',
    description:
      'Não há extrato OFX da Empresa confirmado para esta competência.',
  },
  BUSINESS_BANK_PREVIEW_ONLY: {
    title: 'Itaú Empresa somente em prévia',
    description:
      'Existe uma prévia do extrato da Empresa, mas o lote ainda não foi confirmado.',
  },
  OBLIGATION_OCCURRENCES_NOT_MATERIALIZED: {
    title: 'Ocorrências ainda não criadas',
    description:
      'Há Obrigações ativas, mas suas ocorrências desta competência ainda não foram materializadas.',
  },
  OBLIGATION_OCCURRENCES_PENDING: {
    title: 'Obrigações pendentes',
    description:
      'Uma ou mais Ocorrências de Obrigação continuam pendentes nesta competência.',
  },
  OBLIGATION_OCCURRENCES_NEED_ATTENTION: {
    title: 'Obrigações precisam de atenção',
    description:
      'Uma ou mais Ocorrências de Obrigação foram sinalizadas para revisão.',
  },
  CLASSIFICATION_COMPLETENESS_UNAVAILABLE: {
    title: 'Completude da classificação indisponível',
    description:
      'O Fechamento ainda não verifica se todas as movimentações materiais têm Natureza Econômica confirmada.',
  },
  OBLIGATION_PAYMENT_IDENTIFICATION_UNAVAILABLE: {
    title: 'Pagamentos identificados indisponíveis',
    description:
      'Conclusões manuais de Obrigações não comprovam Pagamento Identificado.',
  },
  REPORTED_EXPENSE_CLOSURE_CHECK_UNAVAILABLE: {
    title: 'Gastos Informados indisponíveis',
    description:
      'A verificação e conciliação de Gastos Informados ainda não integra este Fechamento.',
  },
  DOCUMENT_CHECK_UNAVAILABLE: {
    title: 'Documentos não verificados',
    description:
      'Documentos faltantes ainda não são apurados por este Fechamento.',
  },
  DISTRIBUTION_CHECK_UNAVAILABLE: {
    title: 'Distribuições não verificadas',
    description:
      'Distribuições projetadas ou confirmadas ainda não são apuradas nesta revisão.',
  },
  MARGIN_CHECK_UNAVAILABLE: {
    title: 'Margem de Imprevistos não calculada',
    description:
      'A sobra da Margem de Imprevistos ainda não pode ser transferida para uma reserva.',
  },
  BUSINESS_SUMMARY_UNAVAILABLE: {
    title: 'Resumo Empresarial indisponível',
    description:
      'Os agregados empresariais necessários ao planejamento ainda não foram produzidos.',
  },
  FINANCIAL_CALCULATION_UNAVAILABLE: {
    title: 'Cálculo financeiro indisponível',
    description:
      'Este Fechamento registra metadados e lacunas, sem publicar Disponível para Gastar, limites ou reservas.',
  },
};

import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { BottomTabInset } from '@/constants/theme';
import { cn } from '@/lib/utils';
import {
  type MonthlyClosureReadinessCheck,
  type MonthlyClosureViewModel,
} from './monthly-closure-presentation-model';

export type MonthlyClosureScreenState =
  | Readonly<{ status: 'loading' }>
  | Readonly<{
      status: 'error';
      title: string;
      description: string;
    }>
  | Readonly<{
      status: 'ready';
      model: MonthlyClosureViewModel;
      acknowledgedCheckCodes: ReadonlySet<string>;
      canConfirm: boolean;
      submissionStatus: 'idle' | 'submitting' | 'error';
    }>;

type MonthlyClosureScreenViewProps = Readonly<{
  state: MonthlyClosureScreenState;
  onBack: () => void;
  onPreviousCompetence: () => void;
  onNextCompetence: () => void;
  onToggleAcknowledgement: (code: string) => void;
  onConfirm: () => void;
  onRetry: () => void;
}>;

export function MonthlyClosureScreenView({
  state,
  onBack,
  onPreviousCompetence,
  onNextCompetence,
  onToggleAcknowledgement,
  onConfirm,
  onRetry,
}: MonthlyClosureScreenViewProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingTop: Platform.OS === 'web' ? 40 : insets.top + 16,
        paddingBottom: insets.bottom + BottomTabInset + 32,
      }}>
      <View className="w-full max-w-[720px] self-center gap-6 px-5 web:px-8">
        <Button
          variant="ghost"
          size="compact"
          className="self-start"
          onPress={onBack}>
          <Text>Voltar para Mais</Text>
        </Button>

        <View className="gap-1">
          <Text variant="overline">Revisão da competência</Text>
          <Text variant="screenTitle">Fechamento Mensal</Text>
          <Text variant="caption" className="max-w-2xl leading-5">
            Confira cobertura e lacunas antes de registrar esta revisão. O
            Brenotion não calcula nem confirma valores financeiros nesta etapa.
          </Text>
        </View>

        {state.status === 'loading' ? <ClosureLoading /> : null}
        {state.status === 'error' ? (
          <ClosureError
            title={state.title}
            description={state.description}
            onRetry={onRetry}
          />
        ) : null}
        {state.status === 'ready' ? (
          <>
            <CompetencePicker
              label={state.model.competenceLabel}
              disabled={state.submissionStatus === 'submitting'}
              onPrevious={onPreviousCompetence}
              onNext={onNextCompetence}
            />
            <ClosureStatus model={state.model} />
            <SourceCoverage model={state.model} />
            <CheckSummary model={state.model} />
            {state.model.existingClosure ? (
              <ClosedRevision model={state.model} />
            ) : (
              <ClosureConfirmation
                model={state.model}
                acknowledgedCheckCodes={state.acknowledgedCheckCodes}
                canConfirm={state.canConfirm}
                submissionStatus={state.submissionStatus}
                onToggle={onToggleAcknowledgement}
                onConfirm={onConfirm}
              />
            )}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function ClosureLoading() {
  return (
    <View accessibilityLiveRegion="polite" className="gap-3">
      <Text variant="sectionTitle">Verificando a competência</Text>
      <Text variant="caption">
        Consultando dados persistidos sem fechar ou alterar movimentações.
      </Text>
      <View className="h-32 animate-pulse rounded-card bg-surface-muted" />
      <View className="h-56 animate-pulse rounded-card bg-surface-muted" />
    </View>
  );
}

function ClosureError({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  return (
    <Card accessibilityLiveRegion="polite">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="text-body leading-6">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="secondary" onPress={onRetry}>
          <Text>Tentar novamente</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

function CompetencePicker({
  label,
  disabled,
  onPrevious,
  onNext,
}: {
  label: string;
  disabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex-row items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="icon"
          accessibilityLabel="Competência anterior"
          disabled={disabled}
          onPress={onPrevious}>
          <Text className="text-xl">‹</Text>
        </Button>
        <View className="flex-1 items-center gap-1">
          <Text variant="caption">Competência escolhida</Text>
          <Text variant="sectionTitle" className="text-center capitalize">
            {label}
          </Text>
        </View>
        <Button
          variant="ghost"
          size="icon"
          accessibilityLabel="Próxima competência"
          disabled={disabled}
          onPress={onNext}>
          <Text className="text-xl">›</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

function ClosureStatus({ model }: { model: MonthlyClosureViewModel }) {
  return (
    <Card
      className={cn(
        model.blockingChecks.length > 0
          ? 'bg-status-danger-soft'
          : model.acknowledgementChecks.length > 0
            ? 'bg-status-warning-soft'
            : 'bg-status-recent-soft',
      )}>
      <CardHeader>
        <Text variant="overline">
          {model.existingClosure ? 'Histórico preservado' : 'Situação atual'}
        </Text>
        <CardTitle>{model.statusTitle}</CardTitle>
        <CardDescription className="text-body leading-6 text-ink">
          {model.statusDescription}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function SourceCoverage({ model }: { model: MonthlyClosureViewModel }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cobertura mensal</CardTitle>
        <CardDescription className="text-body leading-6">
          As três entradas permanecem separadas por Patrimônio de Origem.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-3">
        {model.sources.map((source) => (
          <View
            key={source.source}
            className="min-h-12 flex-row items-center justify-between gap-3 rounded-control bg-canvas px-4 py-3">
            <Text variant="label" className="flex-1">
              {source.title}
            </Text>
            <StatusPill
              label={source.statusLabel}
              tone={
                source.status === 'confirmed'
                  ? 'positive'
                  : source.status === 'preview'
                    ? 'attention'
                    : 'neutral'
              }
            />
          </View>
        ))}
      </CardContent>
    </Card>
  );
}

function CheckSummary({ model }: { model: MonthlyClosureViewModel }) {
  return (
    <View className="gap-4">
      {model.blockingChecks.length > 0 ? (
        <CheckGroup
          title="Bloqueios"
          description="Estas verificações não podem ser ignoradas."
          checks={model.blockingChecks}
          tone="danger"
        />
      ) : null}
      {model.passedChecks.length > 0 ? (
        <CheckGroup
          title="Verificações concluídas"
          description="Evidências disponíveis para esta competência."
          checks={model.passedChecks}
          tone="positive"
        />
      ) : null}
    </View>
  );
}

function CheckGroup({
  title,
  description,
  checks,
  tone,
}: {
  title: string;
  description: string;
  checks: readonly MonthlyClosureReadinessCheck[];
  tone: 'positive' | 'danger';
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="gap-3">
        {checks.map((check) => (
          <View
            key={check.code}
            className={cn(
              'gap-1 rounded-control px-4 py-3',
              tone === 'positive'
                ? 'bg-status-recent-soft'
                : 'bg-status-danger-soft',
            )}>
            <Text variant="label">{check.title}</Text>
            <Text variant="caption" className="leading-5 text-ink">
              {check.description}
            </Text>
          </View>
        ))}
      </CardContent>
    </Card>
  );
}

function ClosureConfirmation({
  model,
  acknowledgedCheckCodes,
  canConfirm,
  submissionStatus,
  onToggle,
  onConfirm,
}: {
  model: MonthlyClosureViewModel;
  acknowledgedCheckCodes: ReadonlySet<string>;
  canConfirm: boolean;
  submissionStatus: 'idle' | 'submitting' | 'error';
  onToggle: (code: string) => void;
  onConfirm: () => void;
}) {
  const submitting = submissionStatus === 'submitting';

  return (
    <Card>
      <CardHeader>
        <Text variant="overline">Confirmação do Titular</Text>
        <CardTitle>
          {model.acknowledgementChecks.length > 0
            ? 'Reconheça as lacunas'
            : 'Registrar Fechamento'}
        </CardTitle>
        <CardDescription className="text-body leading-6">
          O botão registra a revisão desta competência. Ele não classifica,
          concilia ou calcula valores automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        {model.acknowledgementChecks.map((check) => {
          const checked = acknowledgedCheckCodes.has(check.code);

          return (
            <Pressable
              key={check.code}
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled: submitting }}
              disabled={submitting}
              onPress={() => onToggle(check.code)}
              className={cn(
                'min-h-12 flex-row items-start gap-3 rounded-card bg-canvas p-4 active:scale-[0.96]',
                'web:transition-transform web:duration-150 web:outline-none web:focus-visible:ring-[3px] web:focus-visible:ring-focus-ring/45',
                checked
                  ? 'shadow-[0_0_0_2px_oklch(var(--action-primary))]'
                  : 'shadow-[0_0_0_1px_oklch(var(--divider))]',
              )}>
              <View
                className={cn(
                  'mt-0.5 size-6 items-center justify-center rounded-md',
                  checked ? 'bg-action-primary' : 'bg-surface-muted',
                )}>
                <Text className={checked ? 'text-ink-on-action' : 'text-ink-muted'}>
                  {checked ? '✓' : ''}
                </Text>
              </View>
              <View className="flex-1 gap-1">
                <Text variant="label">{check.title}</Text>
                <Text variant="caption" className="leading-5">
                  {check.description}
                </Text>
              </View>
            </Pressable>
          );
        })}

        <View className="rounded-control bg-surface-muted px-4 py-3">
          <Text variant="label">Sem valores oficiais nesta revisão</Text>
          <Text variant="caption" className="mt-1 leading-5">
            Disponível para Gastar, limites e reservas continuam indisponíveis
            até existir cálculo determinístico versionado.
          </Text>
        </View>

        <Button disabled={!canConfirm || submitting} onPress={onConfirm}>
          <Text>
            {submitting ? 'Registrando Fechamento…' : 'Confirmar Fechamento Mensal'}
          </Text>
        </Button>
        {submissionStatus === 'error' ? (
          <Text accessibilityLiveRegion="polite" variant="caption">
            Não foi possível registrar. Nenhum Fechamento foi confirmado; tente
            novamente com a mesma revisão.
          </Text>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ClosedRevision({ model }: { model: MonthlyClosureViewModel }) {
  const closure = model.existingClosure;

  if (!closure) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <Text variant="overline">{closure.revisionLabel}</Text>
        <CardTitle>Fechamento registrado</CardTitle>
        <CardDescription className="text-body leading-6">
          {closure.closedAtLabel} · {closure.confidenceLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <View className="gap-1 rounded-control bg-status-warning-soft px-4 py-3">
          <Text variant="label">{closure.calculationTitle}</Text>
          <Text variant="caption" className="leading-5 text-ink">
            {closure.calculationDescription}
          </Text>
        </View>
        {model.closureHistory.length > 1 ? (
          <View className="gap-2">
            <Text variant="label">Histórico preservado</Text>
            {model.closureHistory.map((revision) => (
              <View
                key={`${revision.revisionLabel}-${revision.closedAtLabel}`}
                className="flex-row flex-wrap items-center justify-between gap-2 rounded-control bg-canvas px-4 py-3">
                <Text variant="label">{revision.revisionLabel}</Text>
                <Text variant="caption">
                  {revision.closedAtLabel} · {revision.confidenceLabel}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'positive' | 'attention' | 'neutral';
}) {
  return (
    <View
      className={cn(
        'min-h-8 justify-center rounded-full px-3',
        tone === 'positive'
          ? 'bg-status-recent-soft'
          : tone === 'attention'
            ? 'bg-status-warning-soft'
            : 'bg-surface-muted',
      )}>
      <Text variant="caption" className="text-ink">
        {label}
      </Text>
    </View>
  );
}

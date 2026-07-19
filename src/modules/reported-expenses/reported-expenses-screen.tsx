import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
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
import { BottomTabInset, Colors } from '@/constants/theme';
import { cn } from '@/lib/utils';
import {
  buildReportedExpenseListItems,
  EMPTY_FINANCIAL_CYCLE_FORM,
  EMPTY_REPORTED_EXPENSE_FORM,
  expenseToFormValues,
  formatCyclePeriod,
  validateFinancialCycleForm,
  validateReportedExpenseForm,
  type FinancialCycle,
  type FinancialCycleFormValues,
  type ReconciliationCandidate,
  type ReportedExpense,
  type ReportedExpenseFormValues,
} from './reported-expenses-presentation-model';

export type ReportedExpensesScreenSource = Readonly<{
  status: 'loading' | 'ready';
  cycle: FinancialCycle | null;
  expenses: readonly ReportedExpense[];
  isTruncated: boolean;
  reconciliation: Readonly<{
    expenseId: string | null;
    status: 'idle' | 'loading' | 'ready';
    candidates: readonly ReconciliationCandidate[];
  }>;
  openCycle: (values: FinancialCycleFormValues) => Promise<void>;
  createExpense: (
    values: Extract<
      ReturnType<typeof validateReportedExpenseForm>,
      { status: 'valid' }
    >['value'],
  ) => Promise<void>;
  updateExpense: (
    expenseId: string,
    values: Extract<
      ReturnType<typeof validateReportedExpenseForm>,
      { status: 'valid' }
    >['value'],
  ) => Promise<void>;
  voidExpense: (expenseId: string) => Promise<void>;
  requestCandidates: (expenseId: string) => void;
  confirmReconciliation: (
    expenseId: string,
    sourceTransactionId: string,
  ) => Promise<void>;
}>;

type Feedback =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'submitting'; operation: string }>
  | Readonly<{ status: 'success' | 'error'; message: string }>;

const ECONOMIC_NATURE_OPTIONS = [
  {
    value: 'personal',
    label: 'Pessoal',
    description: 'Pertence à vida pessoal.',
  },
  {
    value: 'business',
    label: 'Empresa',
    description: 'Pertence ao patrimônio da Empresa.',
  },
] as const;

const SOURCE_PATRIMONY_OPTIONS = [
  {
    value: 'personal',
    label: 'Pessoal',
    description: 'Pago a partir do patrimônio Pessoal.',
  },
  {
    value: 'business',
    label: 'Empresa',
    description: 'Pago a partir do patrimônio da Empresa.',
  },
  {
    value: 'needsConfirmation',
    label: 'A confirmar',
    description: 'O Patrimônio de Origem ainda não está confirmado.',
  },
] as const;

export function ReportedExpensesScreen({
  source,
}: {
  source: ReportedExpensesScreenSource;
}) {
  const insets = useSafeAreaInsets();
  const [cycleForm, setCycleForm] = useState(EMPTY_FINANCIAL_CYCLE_FORM);
  const [expenseForm, setExpenseForm] = useState(EMPTY_REPORTED_EXPENSE_FORM);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [voidTargetId, setVoidTargetId] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({ status: 'idle' });
  const cycleValidation = validateFinancialCycleForm(cycleForm);
  const expenseValidation = validateReportedExpenseForm(expenseForm);
  const listItems = useMemo(
    () => buildReportedExpenseListItems(source.expenses),
    [source.expenses],
  );
  const isSubmitting = feedback.status === 'submitting';

  const submitCycle = async () => {
    setShowValidation(true);
    if (cycleValidation.status !== 'valid') {
      return;
    }

    setFeedback({ status: 'submitting', operation: 'cycle' });
    try {
      await source.openCycle(cycleValidation.value);
      setFeedback({
        status: 'success',
        message: 'Ciclo Financeiro aberto com as datas informadas.',
      });
      setShowValidation(false);
    } catch {
      setFeedback({
        status: 'error',
        message: 'Não foi possível abrir o ciclo. Nenhuma data foi inferida.',
      });
    }
  };

  const submitExpense = async () => {
    setShowValidation(true);
    if (expenseValidation.status !== 'valid') {
      return;
    }

    setFeedback({ status: 'submitting', operation: 'expense' });
    try {
      if (editingExpenseId) {
        await source.updateExpense(editingExpenseId, expenseValidation.value);
      } else {
        await source.createExpense(expenseValidation.value);
      }
      setExpenseForm(EMPTY_REPORTED_EXPENSE_FORM);
      setEditingExpenseId(null);
      setShowValidation(false);
      setFeedback({
        status: 'success',
        message: editingExpenseId
          ? 'Gasto Informado atualizado.'
          : 'Gasto Informado registrado como provisório.',
      });
    } catch {
      setFeedback({
        status: 'error',
        message:
          'Não foi possível salvar o Gasto Informado. Nenhum valor oficial foi alterado.',
      });
    }
  };

  const startEdit = (expenseId: string) => {
    const expense = source.expenses.find(
      (candidate) => candidate.reportedExpenseId === expenseId,
    );
    if (!expense || expense.status !== 'provisional') {
      return;
    }

    setExpenseForm(expenseToFormValues(expense));
    setEditingExpenseId(expenseId);
    setShowValidation(false);
    setFeedback({ status: 'idle' });
  };

  const confirmVoid = async (expenseId: string) => {
    setFeedback({ status: 'submitting', operation: `void:${expenseId}` });
    try {
      await source.voidExpense(expenseId);
      setVoidTargetId(null);
      setFeedback({
        status: 'success',
        message: 'Gasto Informado anulado e preservado no histórico.',
      });
    } catch {
      setFeedback({
        status: 'error',
        message: 'Não foi possível anular o Gasto Informado.',
      });
    }
  };

  const confirmReconciliation = async (
    expenseId: string,
    sourceTransactionId: string,
  ) => {
    setFeedback({
      status: 'submitting',
      operation: `reconcile:${sourceTransactionId}`,
    });
    try {
      await source.confirmReconciliation(expenseId, sourceTransactionId);
      setFeedback({
        status: 'success',
        message:
          'Conciliação confirmada. O registro provisório não será contado em duplicidade.',
      });
    } catch {
      setFeedback({
        status: 'error',
        message: 'Não foi possível confirmar a conciliação.',
      });
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: Platform.OS === 'web' ? 40 : insets.top + 16,
        paddingBottom: insets.bottom + BottomTabInset + 32,
      }}>
      <View className="w-full max-w-[720px] self-center gap-6 px-5 web:px-8">
        <View className="gap-1">
          <Text variant="overline">Ciclo atual</Text>
          <Text variant="screenTitle">Gastos Informados</Text>
          <Text variant="caption" className="leading-5">
            Registre eventos recentes sem confundi-los com movimentações
            bancárias já importadas.
          </Text>
        </View>

        <View className="rounded-card bg-status-warning-soft p-4">
          <Text variant="label">Impacto financeiro ainda não calculado</Text>
          <Text variant="caption" className="leading-5 text-ink">
            Estes registros ainda não alteram Plano Financeiro, Limite de Gasto
            do Ciclo, Limites por Categoria ou Disponível para Gastar.
          </Text>
        </View>

        {feedback.status === 'success' || feedback.status === 'error' ? (
          <View
            accessibilityLiveRegion="polite"
            className={cn(
              'rounded-control px-4 py-3',
              feedback.status === 'success'
                ? 'bg-status-recent-soft'
                : 'bg-status-danger-soft',
            )}>
            <Text variant="body">{feedback.message}</Text>
          </View>
        ) : null}

        {source.status === 'loading' ? (
          <View accessibilityLiveRegion="polite" className="gap-3">
            <Text variant="sectionTitle">Carregando Ciclo Financeiro</Text>
            <View className="h-52 rounded-card bg-surface-muted" />
          </View>
        ) : !source.cycle ? (
          <CycleForm
            values={cycleForm}
            errors={
              showValidation && cycleValidation.status === 'invalid'
                ? cycleValidation.errors
                : {}
            }
            disabled={isSubmitting}
            onChange={(field, value) =>
              setCycleForm((current) => ({ ...current, [field]: value }))
            }
            onSubmit={() => void submitCycle()}
          />
        ) : (
          <>
            <Card>
              <CardHeader>
                <Text variant="overline">Ciclo Financeiro aberto</Text>
                <CardTitle>{formatCyclePeriod(source.cycle)}</CardTitle>
                <CardDescription className="text-body leading-6">
                  Datas confirmadas pelo Titular. O ciclo não foi inferido de
                  saldo, importação ou recebimento.
                </CardDescription>
              </CardHeader>
            </Card>

            <ExpenseForm
              values={expenseForm}
              errors={
                showValidation && expenseValidation.status === 'invalid'
                  ? expenseValidation.errors
                  : {}
              }
              isEditing={editingExpenseId !== null}
              disabled={isSubmitting}
              onChange={(field, value) =>
                setExpenseForm((current) => ({ ...current, [field]: value }))
              }
              onCancelEdit={() => {
                setExpenseForm(EMPTY_REPORTED_EXPENSE_FORM);
                setEditingExpenseId(null);
                setShowValidation(false);
              }}
              onSubmit={() => void submitExpense()}
            />

            <View className="gap-3">
              <View className="gap-1">
                <Text variant="sectionTitle">Registros do ciclo</Text>
                <Text variant="caption">
                  Provisórios podem ser editados, anulados ou conciliados.
                </Text>
              </View>

              {listItems.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Nenhum Gasto Informado neste ciclo</CardTitle>
                    <CardDescription className="text-body leading-6">
                      O estado vazio não significa ausência de gastos bancários;
                      mostra apenas que nenhum registro provisório foi criado.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <Card className="gap-0 py-0">
                  {listItems.map((item, index) => (
                    <View
                      key={item.id}
                      className={cn(
                        'gap-4 px-5 py-4',
                        index > 0 && 'border-t border-divider',
                      )}>
                      <View className="gap-1">
                        <View className="flex-row flex-wrap items-center justify-between gap-2">
                          <Text variant="label" className="text-body">
                            {item.description}
                          </Text>
                          <View className="rounded-full bg-surface-muted px-2.5 py-1">
                            <Text variant="caption" className="text-ink">
                              {item.statusLabel}
                            </Text>
                          </View>
                        </View>
                        <Text variant="label" className="tabular-nums">
                          {item.amountLabel}
                        </Text>
                        <Text variant="caption">{item.occurredOnLabel}</Text>
                        <Text variant="caption">
                          Natureza Econômica: {item.economicNatureLabel}
                        </Text>
                        <Text variant="caption">
                          Patrimônio de Origem: {item.sourcePatrimonyLabel}
                        </Text>
                      </View>

                      {item.canEdit ? (
                        <View className="flex-row flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="compact"
                            disabled={isSubmitting}
                            onPress={() => startEdit(item.id)}>
                            <Text>Editar</Text>
                          </Button>
                          <Button
                            variant="outline"
                            size="compact"
                            disabled={isSubmitting}
                            onPress={() => {
                              source.requestCandidates(item.id);
                              setFeedback({ status: 'idle' });
                            }}>
                            <Text>Buscar conciliação</Text>
                          </Button>
                          <Button
                            variant="ghost"
                            size="compact"
                            disabled={isSubmitting}
                            onPress={() => setVoidTargetId(item.id)}>
                            <Text>Anular</Text>
                          </Button>
                        </View>
                      ) : null}

                      {voidTargetId === item.id ? (
                        <View className="gap-3 rounded-control bg-status-danger-soft p-4">
                          <Text variant="label">
                            Confirmar anulação deste registro?
                          </Text>
                          <Text variant="caption" className="text-ink">
                            O registro permanecerá auditável como anulado.
                          </Text>
                          <View className="flex-row flex-wrap gap-2">
                            <Button
                              variant="destructive"
                              size="compact"
                              disabled={isSubmitting}
                              onPress={() => void confirmVoid(item.id)}>
                              <Text>Confirmar anulação</Text>
                            </Button>
                            <Button
                              variant="ghost"
                              size="compact"
                              disabled={isSubmitting}
                              onPress={() => setVoidTargetId(null)}>
                              <Text>Cancelar</Text>
                            </Button>
                          </View>
                        </View>
                      ) : null}

                      {source.reconciliation.expenseId === item.id ? (
                        <CandidateList
                          status={source.reconciliation.status}
                          candidates={source.reconciliation.candidates}
                          disabled={isSubmitting}
                          onConfirm={(sourceTransactionId) =>
                            void confirmReconciliation(
                              item.id,
                              sourceTransactionId,
                            )
                          }
                        />
                      ) : null}
                    </View>
                  ))}
                </Card>
              )}

              {source.isTruncated ? (
                <Text variant="caption">
                  A lista foi limitada; existem outros registros no ciclo.
                </Text>
              ) : null}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function CycleForm({
  values,
  errors,
  disabled,
  onChange,
  onSubmit,
}: {
  values: FinancialCycleFormValues;
  errors: Partial<Record<keyof FinancialCycleFormValues, string>>;
  disabled: boolean;
  onChange: (field: keyof FinancialCycleFormValues, value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Abra o Ciclo Financeiro explicitamente</CardTitle>
        <CardDescription className="text-body leading-6">
          Informe as duas datas. O Brenotion não deduz o ciclo por saldo,
          calendário ou histórico.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <FormField
          label="Início do ciclo"
          placeholder="AAAA-MM-DD"
          value={values.startedOn}
          error={errors.startedOn}
          editable={!disabled}
          onChangeText={(value) => onChange('startedOn', value)}
        />
        <FormField
          label="Próximo recebimento esperado"
          placeholder="AAAA-MM-DD"
          value={values.expectedNextReceiptOn}
          error={errors.expectedNextReceiptOn}
          editable={!disabled}
          onChangeText={(value) => onChange('expectedNextReceiptOn', value)}
        />
        <Button disabled={disabled} onPress={onSubmit}>
          <Text>{disabled ? 'Abrindo ciclo…' : 'Abrir Ciclo Financeiro'}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

function ExpenseForm({
  values,
  errors,
  isEditing,
  disabled,
  onChange,
  onCancelEdit,
  onSubmit,
}: {
  values: ReportedExpenseFormValues;
  errors: Partial<Record<keyof ReportedExpenseFormValues, string>>;
  isEditing: boolean;
  disabled: boolean;
  onChange: <Field extends keyof ReportedExpenseFormValues>(
    field: Field,
    value: ReportedExpenseFormValues[Field],
  ) => void;
  onCancelEdit: () => void;
  onSubmit: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Editar Gasto Informado' : 'Novo Gasto Informado'}
        </CardTitle>
        <CardDescription className="text-body leading-6">
          Todas as escolhas são explícitas. O registro permanecerá provisório
          até uma conciliação confirmada.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-5">
        <View className="gap-4 sm:flex-row">
          <View className="flex-1">
            <FormField
              label="Valor"
              placeholder="0,00"
              inputMode="decimal"
              keyboardType="decimal-pad"
              value={values.amount}
              error={errors.amount}
              editable={!disabled}
              onChangeText={(value) => onChange('amount', value)}
            />
          </View>
          <View className="flex-1">
            <FormField
              label="Data"
              placeholder="AAAA-MM-DD"
              value={values.occurredOn}
              error={errors.occurredOn}
              editable={!disabled}
              onChangeText={(value) => onChange('occurredOn', value)}
            />
          </View>
        </View>
        <FormField
          label="Descrição"
          placeholder="Descreva o gasto"
          value={values.description}
          error={errors.description}
          editable={!disabled}
          onChangeText={(value) => onChange('description', value)}
        />
        <ChoiceGroup
          label="Natureza Econômica"
          value={values.economicNature}
          options={ECONOMIC_NATURE_OPTIONS}
          error={errors.economicNature}
          disabled={disabled}
          onChange={(value) => onChange('economicNature', value)}
        />
        <ChoiceGroup
          label="Patrimônio de Origem"
          value={values.sourcePatrimony}
          options={SOURCE_PATRIMONY_OPTIONS}
          error={errors.sourcePatrimony}
          disabled={disabled}
          onChange={(value) => onChange('sourcePatrimony', value)}
        />
        <View className="flex-row flex-wrap gap-2">
          <Button disabled={disabled} onPress={onSubmit}>
            <Text>
              {disabled
                ? 'Salvando…'
                : isEditing
                  ? 'Salvar alterações'
                  : 'Registrar como provisório'}
            </Text>
          </Button>
          {isEditing ? (
            <Button
              variant="ghost"
              disabled={disabled}
              onPress={onCancelEdit}>
              <Text>Cancelar edição</Text>
            </Button>
          ) : null}
        </View>
      </CardContent>
    </Card>
  );
}

function CandidateList({
  status,
  candidates,
  disabled,
  onConfirm,
}: {
  status: ReportedExpensesScreenSource['reconciliation']['status'];
  candidates: readonly ReconciliationCandidate[];
  disabled: boolean;
  onConfirm: (sourceTransactionId: string) => void;
}) {
  if (status === 'loading') {
    return <Text variant="caption">Buscando candidatos explicáveis…</Text>;
  }

  if (status === 'ready' && candidates.length === 0) {
    return (
      <View className="rounded-control bg-surface-muted p-4">
        <Text variant="caption">
          Nenhuma Movimentação de Origem compatível foi encontrada.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3 rounded-card bg-canvas p-4">
      <Text variant="label">Candidatos de conciliação</Text>
      <Text variant="caption">
        Revise a explicação antes de confirmar. Nenhum candidato é aplicado
        automaticamente.
      </Text>
      {candidates.map((candidate) => (
        <View
          key={candidate.sourceTransactionId}
          className="gap-2 rounded-control border border-divider bg-surface p-4">
          <Text variant="label">{candidate.description}</Text>
          <Text variant="caption">
            {candidate.postedOn} ·{' '}
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(Number(candidate.amount.amountInMinorUnits) / 100)}
          </Text>
          <Text variant="caption" className="leading-5 text-ink">
            {candidate.explanation}
          </Text>
          <Button
            variant="outline"
            size="compact"
            disabled={disabled}
            onPress={() => onConfirm(candidate.sourceTransactionId)}>
            <Text>Confirmar conciliação</Text>
          </Button>
        </View>
      ))}
    </View>
  );
}

function FormField({
  label,
  error,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  error?: string;
}) {
  return (
    <View className="gap-2">
      <Text variant="label">{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={Colors.light.textSecondary}
        className={cn(
          'min-h-12 rounded-control border border-divider bg-surface px-4 text-body text-ink',
          'web:outline-none web:focus-visible:ring-[3px] web:focus-visible:ring-focus-ring/45',
          !props.editable && 'opacity-60',
        )}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" variant="caption">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function ChoiceGroup<Option extends string>({
  label,
  value,
  options,
  error,
  disabled,
  onChange,
}: {
  label: string;
  value: Option | '';
  options: readonly {
    value: Option;
    label: string;
    description: string;
  }[];
  error?: string;
  disabled: boolean;
  onChange: (value: Option) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      className="gap-3">
      <Text variant="label">{label}</Text>
      <View className="gap-3 sm:flex-row">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              className={cn(
                'min-h-12 flex-1 gap-1 rounded-card border px-4 py-3',
                selected
                  ? 'border-action-primary bg-action-primary-soft'
                  : 'border-divider bg-surface',
                disabled && 'opacity-60',
              )}>
              <Text variant="label">{option.label}</Text>
              <Text variant="caption">{option.description}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" variant="caption">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

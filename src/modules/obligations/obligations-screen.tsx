import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../../convex/_generated/api';
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
import { ObligationOccurrencesCenter } from './obligation-occurrences-center';
import {
  buildObligationFormViewState,
  createObligationKey,
  formatObligationExpectedAmount,
  type Obligation,
  type ObligationFormErrors,
  type ObligationFormSubmissionStatus,
  type ObligationFormValues,
  type ObligationListItem,
} from './obligations-presentation-model';
import { useObligationsSource } from './use-obligations-source';

const ECONOMIC_NATURE_OPTIONS = [
  {
    value: 'personal',
    label: 'Pessoal',
    description: 'Pertence à vida pessoal, mesmo quando outra conta paga.',
  },
  {
    value: 'business',
    label: 'Empresa',
    description: 'Pertence integralmente ao patrimônio da Empresa.',
  },
] as const;

const PAYMENT_ORIGIN_OPTIONS = [
  {
    value: 'personal',
    label: 'Pessoal',
    description: 'Normalmente paga por uma conta pessoal.',
  },
  {
    value: 'business',
    label: 'Empresa',
    description: 'Normalmente paga pela conta da Empresa.',
  },
  {
    value: 'needsConfirmation',
    label: 'A confirmar',
    description: 'A origem habitual ainda não foi definida.',
  },
] as const;

export function ObligationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const source = useObligationsSource();
  const upsertObligation = useMutation(api.obligations.upsert);
  const [showInactive, setShowInactive] = useState(false);
  const [formValues, setFormValues] = useState<ObligationFormValues | null>(
    null,
  );
  const [submissionStatus, setSubmissionStatus] =
    useState<ObligationFormSubmissionStatus>('idle');
  const [showValidation, setShowValidation] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const visibleItems = useMemo(
    () =>
      showInactive
        ? source.items
        : source.items.filter((item) => item.status === 'active'),
    [showInactive, source.items],
  );
  const formState = formValues
    ? buildObligationFormViewState(formValues, submissionStatus)
    : null;

  const startCreate = () => {
    const existingKeys = new Set(
      source.obligations.map((obligation) => obligation.obligationKey),
    );
    setFormValues({
      obligationKey: createObligationKey(existingKeys),
      name: '',
      economicNature: '',
      paymentOrigin: '',
      expectedAmount: '',
      dueDayOfMonth: '',
      isActive: true,
    });
    setSubmissionStatus('idle');
    setShowValidation(false);
    setSuccessMessage(null);
  };

  const startEdit = (item: ObligationListItem) => {
    const obligation = source.obligations.find(
      (candidate) => candidate.obligationId === item.id,
    );

    if (!obligation) {
      return;
    }

    setFormValues(toFormValues(obligation));
    setSubmissionStatus('idle');
    setShowValidation(false);
    setSuccessMessage(null);
  };

  const cancelForm = () => {
    setFormValues(null);
    setSubmissionStatus('idle');
    setShowValidation(false);
  };

  const saveForm = async () => {
    if (!formValues || !formState) {
      return;
    }

    setShowValidation(true);
    if (formState.validation.status !== 'valid') {
      return;
    }

    setSubmissionStatus('submitting');
    try {
      const result = await upsertObligation(formState.validation.value);
      setSuccessMessage(
        result.status === 'unchanged'
          ? 'Nenhuma alteração foi necessária.'
          : 'Obrigação salva.',
      );
      setFormValues(null);
      setSubmissionStatus('idle');
      setShowValidation(false);
    } catch {
      setSubmissionStatus('error');
    }
  };

  const setField = <Field extends keyof ObligationFormValues>(
    field: Field,
    value: ObligationFormValues[Field],
  ) => {
    setFormValues((current) =>
      current ? { ...current, [field]: value } : current,
    );
    setSubmissionStatus('idle');
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
        <Button
          variant="ghost"
          size="compact"
          className="self-start"
          onPress={() => router.replace('/more')}>
          <Text>Voltar para Mais</Text>
        </Button>

        <View className="gap-1">
          <Text variant="overline">Configurações recorrentes</Text>
          <Text variant="screenTitle">Obrigações</Text>
          <Text variant="caption" className="leading-5">
            Defina o que vence todo mês e separe a Natureza Econômica da conta
            que costuma pagar.
          </Text>
        </View>

        <Card>
          <CardHeader>
            <CardTitle>Conta pagadora não muda a Natureza Econômica</CardTitle>
            <CardDescription className="text-body leading-6">
              Uma Obrigação Pessoal pode ser paga pela Empresa e continuar
              Pessoal. O Brenotion registra as duas decisões separadamente.
            </CardDescription>
          </CardHeader>
        </Card>

        <ObligationOccurrencesCenter
          activeObligationCount={
            source.obligations.filter((obligation) => obligation.isActive)
              .length
          }
          obligationsAreLoading={source.status === 'loading'}
        />

        <View className="gap-1 border-t border-divider pt-6">
          <Text variant="overline">Base recorrente</Text>
          <Text variant="sectionTitle">Configurações de Obrigações</Text>
          <Text variant="caption" className="leading-5">
            Edite aqui o modelo usado nas próximas materializações. Ocorrências
            já criadas preservam o retrato da configuração do momento.
          </Text>
        </View>

        {formValues && formState ? (
          <ObligationForm
            values={formValues}
            errors={
              showValidation && formState.validation.status === 'invalid'
                ? formState.validation.errors
                : {}
            }
            formError={
              showValidation && formState.validation.status === 'invalid'
                ? formState.validation.formError
                : null
            }
            submissionStatus={submissionStatus}
            feedbackLabel={formState.feedbackLabel}
            isEditing={source.obligations.some(
              (obligation) =>
                obligation.obligationKey === formValues.obligationKey,
            )}
            onChange={setField}
            onCancel={cancelForm}
            onSave={saveForm}
          />
        ) : null}

        {successMessage ? (
          <View
            accessibilityLiveRegion="polite"
            className="rounded-control bg-status-recent-soft px-4 py-3">
            <Text variant="body">{successMessage}</Text>
          </View>
        ) : null}

        {source.status === 'loading' ? (
          <View accessibilityLiveRegion="polite" className="gap-3">
            <Text variant="sectionTitle">Carregando Obrigações</Text>
            <Text variant="caption">
              Consultando suas configurações recorrentes.
            </Text>
            <View className="h-40 rounded-card bg-surface-muted" />
          </View>
        ) : (
          <>
            <View className="flex-row flex-wrap items-center justify-between gap-3">
              <View className="flex-row items-center gap-3">
                <Switch
                  value={showInactive}
                  onValueChange={setShowInactive}
                  trackColor={{
                    false: Colors.light.divider,
                    true: Colors.light.actionPrimary,
                  }}
                  accessibilityLabel="Mostrar Obrigações desativadas"
                />
                <Text variant="label">Mostrar desativadas</Text>
              </View>
              <Button
                size="compact"
                onPress={startCreate}
                disabled={formValues !== null}>
                <Text>Nova Obrigação</Text>
              </Button>
            </View>

            {source.isTruncated ? (
              <View className="rounded-control bg-status-warning-soft px-4 py-3">
                <Text variant="caption">
                  Apenas as primeiras 200 configurações estão visíveis.
                </Text>
              </View>
            ) : null}

            {visibleItems.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Nenhuma Obrigação configurada</CardTitle>
                  <CardDescription className="text-body leading-6">
                    Cadastre seu primeiro compromisso recorrente. Nenhuma
                    movimentação será alterada ou paga pelo Brenotion.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onPress={startCreate} disabled={formValues !== null}>
                    <Text>Criar primeira Obrigação</Text>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="gap-0 py-0">
                {visibleItems.map((item, index) => (
                  <ObligationListRow
                    key={item.id}
                    item={item}
                    isFirst={index === 0}
                    disabled={formValues !== null}
                    onEdit={() => startEdit(item)}
                  />
                ))}
              </Card>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function ObligationListRow({
  item,
  isFirst,
  disabled,
  onEdit,
}: {
  item: ObligationListItem;
  isFirst: boolean;
  disabled: boolean;
  onEdit: () => void;
}) {
  return (
    <View
      className={cn(
        'gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between',
        !isFirst && 'border-t border-divider',
        item.status === 'inactive' && 'opacity-60',
      )}>
      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text variant="label" className="text-body">
            {item.name}
          </Text>
          <View className="rounded-full bg-surface-muted px-2.5 py-1">
            <Text variant="caption">{item.statusLabel}</Text>
          </View>
        </View>
        <Text variant="caption">
          Natureza Econômica: {item.economicNatureLabel}
        </Text>
        <Text variant="caption">{item.paymentOriginDescription}</Text>
        <View className="flex-row flex-wrap gap-x-3 gap-y-1">
          <Text variant="caption">{item.dueLabel}</Text>
          {item.expectedAmountLabel ? (
            <Text variant="caption" className="tabular-nums text-ink">
              {item.expectedAmountLabel}
            </Text>
          ) : null}
        </View>
      </View>
      <Button
        variant="outline"
        size="compact"
        onPress={onEdit}
        disabled={disabled}>
        <Text>Editar</Text>
      </Button>
    </View>
  );
}

function ObligationForm({
  values,
  errors,
  formError,
  submissionStatus,
  feedbackLabel,
  isEditing,
  onChange,
  onCancel,
  onSave,
}: {
  values: ObligationFormValues;
  errors: ObligationFormErrors;
  formError: string | null;
  submissionStatus: ObligationFormSubmissionStatus;
  feedbackLabel: string | null;
  isEditing: boolean;
  onChange: <Field extends keyof ObligationFormValues>(
    field: Field,
    value: ObligationFormValues[Field],
  ) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const isSubmitting = submissionStatus === 'submitting';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Obrigação' : 'Nova Obrigação'}</CardTitle>
        <CardDescription className="text-body leading-6">
          Valor e vencimento são opcionais. Nenhum pagamento será iniciado.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-5">
        <FormTextField
          label="Nome"
          value={values.name}
          placeholder="Ex.: compromisso recorrente"
          error={errors.name}
          editable={!isSubmitting}
          onChangeText={(value) => onChange('name', value)}
        />

        <View className="gap-4 sm:flex-row">
          <View className="flex-1">
            <FormTextField
              label="Valor esperado (opcional)"
              value={values.expectedAmount}
              placeholder="0,00"
              error={errors.expectedAmount}
              editable={!isSubmitting}
              inputMode="decimal"
              keyboardType="decimal-pad"
              onChangeText={(value) => onChange('expectedAmount', value)}
            />
          </View>
          <View className="flex-1">
            <FormTextField
              label="Dia do vencimento (opcional)"
              value={values.dueDayOfMonth}
              placeholder="1 a 31"
              error={errors.dueDayOfMonth}
              editable={!isSubmitting}
              inputMode="numeric"
              keyboardType="number-pad"
              onChangeText={(value) => onChange('dueDayOfMonth', value)}
            />
          </View>
        </View>

        <ChoiceGroup
          label="Natureza Econômica"
          description="Define a quem o compromisso pertence."
          value={values.economicNature}
          options={ECONOMIC_NATURE_OPTIONS}
          disabled={isSubmitting}
          error={errors.economicNature}
          onChange={(value) => onChange('economicNature', value)}
        />

        <ChoiceGroup
          label="Origem pagadora habitual"
          description="Indica a conta que costuma pagar e não altera a Natureza Econômica."
          value={values.paymentOrigin}
          options={PAYMENT_ORIGIN_OPTIONS}
          disabled={isSubmitting}
          error={errors.paymentOrigin}
          onChange={(value) => onChange('paymentOrigin', value)}
        />

        {isEditing ? (
          <View className="flex-row items-center justify-between gap-4 rounded-control bg-canvas px-4 py-3">
            <View className="flex-1 gap-1">
              <Text variant="label">Obrigação ativa</Text>
              <Text variant="caption">
                Desativar preserva o histórico e remove a configuração da lista
                principal.
              </Text>
            </View>
            <Switch
              value={values.isActive}
              onValueChange={(value) => onChange('isActive', value)}
              disabled={isSubmitting}
              trackColor={{
                false: Colors.light.divider,
                true: Colors.light.actionPrimary,
              }}
              accessibilityLabel="Obrigação ativa"
            />
          </View>
        ) : null}

        {formError ? (
          <Text accessibilityLiveRegion="polite" variant="caption">
            {formError}
          </Text>
        ) : null}
        {feedbackLabel ? (
          <Text accessibilityLiveRegion="polite" variant="caption">
            {feedbackLabel}
          </Text>
        ) : null}

        <View className="flex-row flex-wrap gap-3">
          <Button onPress={onSave} disabled={isSubmitting}>
            <Text>{isSubmitting ? 'Salvando…' : 'Salvar Obrigação'}</Text>
          </Button>
          <Button
            variant="ghost"
            onPress={onCancel}
            disabled={isSubmitting}>
            <Text>Cancelar</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

function FormTextField({
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
  description,
  value,
  options,
  disabled,
  error,
  onChange,
}: {
  label: string;
  description: string;
  value: Option | '';
  options: readonly {
    value: Option;
    label: string;
    description: string;
  }[];
  disabled: boolean;
  error?: string;
  onChange: (value: Option) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      className="gap-3">
      <View className="gap-1">
        <Text variant="label">{label}</Text>
        <Text variant="caption">{description}</Text>
      </View>
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
                'min-h-12 flex-1 gap-1 rounded-card border px-4 py-3 active:scale-[0.96]',
                'web:transition-[transform,background-color,border-color] web:duration-150 web:outline-none web:focus-visible:ring-[3px] web:focus-visible:ring-focus-ring/45',
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

function toFormValues(obligation: Obligation): ObligationFormValues {
  return {
    obligationKey: obligation.obligationKey,
    name: obligation.name,
    economicNature: obligation.economicNature,
    paymentOrigin: obligation.paymentOrigin,
    expectedAmount:
      formatObligationExpectedAmount(obligation.expectedAmount)
        ?.replace('R$\u00a0', '') ?? '',
    dueDayOfMonth: obligation.dueDayOfMonth?.toString() ?? '',
    isActive: obligation.isActive,
  };
}

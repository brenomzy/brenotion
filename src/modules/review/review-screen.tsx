import { router } from 'expo-router';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MoneyValue, ScreenStatePanel } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { BottomTabInset } from '@/constants/theme';
import { type EconomicNature } from './review-classification-model';
import {
  formatReviewDate,
  formatReviewPeriod,
  formatReviewTimestamp,
  getSelectedBatch,
  type ReviewImportBatch,
  type ReviewReadyModel,
  type ReviewScreenActions,
  type ReviewScreenModel,
  type ReviewSourceTransaction,
} from './review-screen-model';
import {
  type ReviewClassificationGroup,
  useReviewClassificationDecisions,
} from './use-review-classification-decisions';

const ECONOMIC_NATURE_OPTIONS: readonly Readonly<{
  value: EconomicNature;
  label: string;
}>[] = [
  { value: 'personal', label: 'Pessoal' },
  { value: 'business', label: 'Empresa' },
  { value: 'mixed', label: 'Mista' },
];

function ReviewLoading() {
  return (
    <View accessibilityLiveRegion="polite" className="gap-4">
      <View className="h-36 rounded-card bg-surface-muted" />
      <View className="h-24 rounded-card bg-surface-muted" />
      <View className="h-64 rounded-card bg-surface-muted" />
      <Text variant="caption">Carregando importações confirmadas…</Text>
    </View>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[132px] flex-1 gap-1 rounded-control bg-surface-muted px-4 py-3">
      <Text variant="caption">{label}</Text>
      <Text variant="label" className="tabular-nums">
        {value}
      </Text>
    </View>
  );
}

function ImportBatchSummary({ batch }: { batch: ReviewImportBatch }) {
  const isCreditCardStatement = batch.format === 'itauCreditCardXlsx';

  return (
    <Card>
      <CardHeader className="gap-2">
        <View className="gap-1">
          <Text variant="overline">Lote de Importação confirmado</Text>
          <CardTitle>{formatReviewPeriod(batch)}</CardTitle>
          {isCreditCardStatement && batch.statementTitle ? (
            <Text variant="caption">{batch.statementTitle}</Text>
          ) : null}
          {isCreditCardStatement && batch.statementDueOn ? (
            <Text variant="caption">
              Vencimento em {formatReviewDate(batch.statementDueOn)}
            </Text>
          ) : null}
          <Text variant="caption">
            Confirmado em {formatReviewTimestamp(batch.confirmedAt)}
          </Text>
        </View>
      </CardHeader>
      <CardContent className="gap-4">
        <View className="flex-row flex-wrap gap-2">
          <SummaryMetric label="No arquivo" value={`${batch.transactionCount}`} />
          <SummaryMetric label="Movimentações salvas" value={`${batch.insertedCount}`} />
          <SummaryMetric label="Duplicidades ignoradas" value={`${batch.duplicateCount}`} />
        </View>
        {isCreditCardStatement ? (
          <View className="gap-3 border-t border-divider pt-4">
            <ReviewMoneyLine label="Total da fatura" money={batch.statementTotal} />
            <ReviewMoneyLine label="Compras" money={batch.purchaseTotal} />
            <ReviewMoneyLine
              label="Créditos e estornos"
              money={batch.creditAdjustmentTotal}
            />
            <ReviewMoneyLine
              label="Pagamento identificado"
              money={batch.settlementTotal}
            />
            <Text variant="caption" className="leading-5">
              O pagamento é liquidação do cartão e não uma nova despesa.
            </Text>
          </View>
        ) : (
          <View className="gap-3 border-t border-divider pt-4">
            <ReviewMoneyLine label="Créditos no arquivo" money={batch.creditTotal} />
            <ReviewMoneyLine label="Débitos no arquivo" money={batch.debitTotal} />
          </View>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewMoneyLine({
  label,
  money,
}: {
  label: string;
  money: ReviewImportBatch['statementTotal'];
}) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text variant="caption">{label}</Text>
      {money ? (
        <MoneyValue
          minorUnits={money.amountInMinorUnits}
          currency="BRL"
          size="label"
        />
      ) : (
        <Text variant="caption">Não informado</Text>
      )}
    </View>
  );
}

function ClassificationNotice() {
  return (
    <View
      accessibilityRole="summary"
      className="flex-row items-start gap-3 rounded-card bg-status-warning-soft p-4">
      <View
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        className="h-11 w-11 shrink-0 items-center justify-center rounded-control bg-surface">
        <Text variant="sectionTitle">!</Text>
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text variant="label">Ainda não é um Fechamento Mensal</Text>
        <Text variant="caption" className="leading-5 text-ink">
          Você pode confirmar a Natureza Econômica dos grupos abaixo. Isso ainda não faz
          conciliação nem altera valores oficiais do Plano Financeiro.
        </Text>
      </View>
    </View>
  );
}

function ClassificationGroups({ model }: { model: ReviewReadyModel }) {
  const source = useReviewClassificationDecisions({
    transactions: model.transactions,
    isLoadingTransactions: model.isLoadingTransactions,
    hasMoreTransactions: model.hasMoreTransactions,
  });

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text variant="sectionTitle">Natureza Econômica</Text>
        <Text variant="caption" className="leading-5">
          Confirme se cada grupo é Pessoal, Empresa ou Mista. Nenhuma opção é escolhida
          automaticamente.
        </Text>
      </View>

      {source.status === 'error' ? (
        <View
          accessibilityLiveRegion="polite"
          className="gap-1 rounded-card bg-status-danger-soft p-4">
          <Text variant="label">Não foi possível carregar as decisões</Text>
          <Text variant="caption" className="leading-5 text-ink">
            Nenhuma decisão foi alterada. Recarregue a tela para tentar novamente.
          </Text>
        </View>
      ) : source.groups.length === 0 ? (
        <View accessibilityLiveRegion="polite" className="rounded-card bg-surface-muted p-4">
          <Text variant="caption">
            {source.status === 'loading'
              ? 'Preparando grupos para classificação…'
              : 'Nenhum grupo disponível neste lote.'}
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {source.status === 'loading' ? (
            <Text accessibilityLiveRegion="polite" variant="caption">
              Carregando decisões já confirmadas…
            </Text>
          ) : null}
          {source.groups.map((group) => (
            <ClassificationGroupCard
              key={group.groupKey}
              group={group}
              decisionsAreLoading={source.status === 'loading'}
              onSelect={(economicNature) =>
                void source.setEconomicNature(group.groupKey, economicNature)
              }
            />
          ))}
        </View>
      )}

      {!source.isComplete && source.groups.length > 0 ? (
        <Text variant="caption" className="leading-5">
          Estes grupos consideram somente as movimentações carregadas. Use “Carregar mais” para
          revisar os demais grupos deste lote.
        </Text>
      ) : null}
    </View>
  );
}

function ClassificationGroupCard({
  group,
  decisionsAreLoading,
  onSelect,
}: {
  group: ReviewClassificationGroup;
  decisionsAreLoading: boolean;
  onSelect: (economicNature: EconomicNature) => void;
}) {
  const isSaving = group.saveStatus === 'saving';
  const selectedLabel = ECONOMIC_NATURE_OPTIONS.find(
    (option) => option.value === group.economicNature,
  )?.label;

  return (
    <Card className="gap-3 py-4">
      <CardContent className="gap-3">
        <View className="gap-1">
          <Text variant="label" className="leading-5">
            {group.representativeDescription}
          </Text>
          <Text variant="caption" className="tabular-nums">
            {group.count} {group.count === 1 ? 'movimentação' : 'movimentações'} ·{' '}
            {formatReviewDate(group.firstPostedOn)}
            {group.firstPostedOn === group.lastPostedOn
              ? ''
              : ` – ${formatReviewDate(group.lastPostedOn)}`}
          </Text>
        </View>

        <View className="gap-2">
          <Text variant="caption" accessibilityLiveRegion="polite">
            {isSaving
              ? 'Salvando decisão…'
              : decisionsAreLoading
                ? 'Carregando decisão…'
                : selectedLabel
                  ? `Decisão atual: ${selectedLabel}`
                  : 'Ainda não confirmado'}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {ECONOMIC_NATURE_OPTIONS.map((option) => {
              const selected = group.economicNature === option.value;

              return (
                <Button
                  key={option.value}
                  size="compact"
                  variant={selected ? 'secondary' : 'outline'}
                  static={selected}
                  disabled={decisionsAreLoading || isSaving}
                  accessibilityLabel={`Definir ${group.representativeDescription} como ${option.label}`}
                  accessibilityState={{
                    selected,
                    disabled: decisionsAreLoading || isSaving,
                    busy: isSaving,
                  }}
                  className="min-w-[104px] flex-1"
                  onPress={() => onSelect(option.value)}>
                  <Text>{option.label}</Text>
                </Button>
              );
            })}
          </View>
        </View>

        {group.saveStatus === 'error' ? (
          <Text accessibilityLiveRegion="polite" variant="caption" className="text-status-danger">
            Não foi possível salvar. Sua escolha anterior foi preservada; tente novamente.
          </Text>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ImportHistory({
  model,
  actions,
}: {
  model: ReviewReadyModel;
  actions: ReviewScreenActions;
}) {
  if (model.batches.length <= 1 && !model.hasMoreBatches) {
    return null;
  }

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text variant="sectionTitle">Importações confirmadas</Text>
        <Text variant="caption">Escolha um período para conferir suas movimentações.</Text>
      </View>
      <View className="gap-2">
        {model.batches.map((batch) => {
          const selected = batch.id === model.selectedBatchId;

          return (
            <Button
              key={batch.id}
              variant={selected ? 'secondary' : 'outline'}
              static={selected}
              accessibilityState={{ selected }}
              accessibilityLabel={`${formatReviewPeriod(batch)}, ${batch.insertedCount} movimentações salvas`}
              className="h-auto min-h-14 w-full justify-between px-4 py-3"
              onPress={() => actions.selectBatch(batch.id)}>
              <View className="min-w-0 flex-1 items-start gap-0.5">
                <Text variant="label">{formatReviewPeriod(batch)}</Text>
                <Text variant="caption" className="tabular-nums">
                  {batch.insertedCount} movimentações salvas
                </Text>
              </View>
              <Text variant="label">{selected ? 'Em exibição' : 'Ver'}</Text>
            </Button>
          );
        })}
      </View>
      {model.hasMoreBatches ? (
        <Button
          variant="ghost"
          disabled={model.isLoadingMoreBatches}
          onPress={actions.loadMoreBatches}>
          <Text>
            {model.isLoadingMoreBatches ? 'Carregando períodos…' : 'Ver importações anteriores'}
          </Text>
        </Button>
      ) : null}
    </View>
  );
}

function TransactionRow({ transaction }: { transaction: ReviewSourceTransaction }) {
  return (
    <View className="gap-3 border-t border-divider py-4 first:border-t-0">
      <View className="flex-row items-start justify-between gap-4">
        <View className="min-w-0 flex-1 gap-1">
          <Text variant="label" className="leading-5">
            {transaction.description}
          </Text>
          <Text variant="caption" className="tabular-nums">
            {formatReviewDate(transaction.postedOn)}
            {transaction.installmentCurrent && transaction.installmentTotal
              ? ` · parcela ${transaction.installmentCurrent} de ${transaction.installmentTotal}`
              : ''}
          </Text>
        </View>
        <MoneyValue
          minorUnits={transaction.amount.amountInMinorUnits}
          currency="BRL"
          size="label"
        />
      </View>
      <View className="self-start rounded-full bg-surface-muted px-3 py-1.5">
        <Text variant="caption" className="text-ink">
          {transaction.transactionType === 'statementPayment'
            ? 'Liquidação do cartão'
            : transaction.transactionType === 'creditAdjustment'
              ? 'Crédito/estorno'
              : 'Movimentação de Origem'}
        </Text>
      </View>
    </View>
  );
}

function SourceTransactions({
  model,
  actions,
}: {
  model: ReviewReadyModel;
  actions: ReviewScreenActions;
}) {
  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text variant="sectionTitle">Movimentações de Origem</Text>
        <Text variant="caption">
          {model.transactions.length} carregadas neste Lote de Importação
        </Text>
      </View>
      <Card className="gap-0 py-0 shadow-none">
        <CardContent className="px-5">
          {model.isLoadingTransactions ? (
            <View accessibilityLiveRegion="polite" className="gap-3 py-5">
              <View className="h-16 rounded-control bg-surface-muted" />
              <View className="h-16 rounded-control bg-surface-muted" />
              <Text variant="caption">Carregando movimentações deste período…</Text>
            </View>
          ) : model.transactions.length > 0 ? (
            model.transactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))
          ) : (
            <View className="gap-1 py-5">
              <Text variant="label">Nenhuma movimentação foi salva neste lote</Text>
              <Text variant="caption" className="leading-5">
                Todas as entradas podem ter sido identificadas como duplicidades.
              </Text>
            </View>
          )}
        </CardContent>
      </Card>
      {model.hasMoreTransactions ? (
        <Button
          variant="outline"
          disabled={model.isLoadingMoreTransactions}
          onPress={actions.loadMoreTransactions}>
          <Text>
            {model.isLoadingMoreTransactions ? 'Carregando movimentações…' : 'Carregar mais'}
          </Text>
        </Button>
      ) : null}
    </View>
  );
}

function ReviewReady({
  model,
  actions,
}: {
  model: ReviewReadyModel;
  actions: ReviewScreenActions;
}) {
  const batch = getSelectedBatch(model);

  return (
    <>
      <ImportBatchSummary batch={batch} />
      <ClassificationNotice />
      <ImportHistory model={model} actions={actions} />
      <ClassificationGroups model={model} />
      <SourceTransactions model={model} actions={actions} />
    </>
  );
}

export function ReviewScreen({
  model,
  actions,
}: {
  model: ReviewScreenModel;
  actions: ReviewScreenActions;
}) {
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
        <View className="gap-1">
          {model.origin.kind === 'synthetic' ? (
            <Text variant="overline">{model.origin.label}</Text>
          ) : (
            <Text variant="overline">Dados persistidos</Text>
          )}
          <Text variant="screenTitle">Revisar</Text>
          <Text variant="caption">Extratos e faturas importados do Itaú PF</Text>
        </View>

        {model.status === 'loading' ? (
          <ReviewLoading />
        ) : model.status === 'empty' ? (
          <ScreenStatePanel
            state="empty"
            title={model.title}
            description={model.description}
            actionLabel="Enviar arquivo"
            onActionPress={actions.startImport}
          />
        ) : model.status === 'error' ? (
          <ScreenStatePanel
            state="error"
            title={model.title}
            description={model.description}
            actionLabel="Tentar novamente"
            onActionPress={actions.retry}
            secondaryAction={
              <Button variant="outline" className="w-full" onPress={() => router.push('/more')}>
                <Text>Ver opções de importação</Text>
              </Button>
            }
          />
        ) : (
          <ReviewReady model={model} actions={actions} />
        )}
      </View>
    </ScrollView>
  );
}

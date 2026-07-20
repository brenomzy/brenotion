import { useState } from 'react';
import { View } from 'react-native';

import {
  CLASSIFICATION_CATEGORIES,
  classificationCategoryLabel,
  type ClassificationCategoryId,
} from '../../../shared/ai-classification';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { MonthlyClassificationReviewSource } from './use-monthly-classification-review';

export function MonthlyClassificationReview({
  source,
}: {
  source: MonthlyClassificationReviewSource;
}) {
  if (!source.competence) {
    return (
      <Card className="border border-status-danger">
        <CardHeader>
          <CardTitle>Escolha o mês para continuar</CardTitle>
          <Text variant="caption" className="leading-5">
            Volte a Atualizar mês e selecione uma competência válida. Nenhum
            outro mês foi escolhido automaticamente.
          </Text>
        </CardHeader>
      </Card>
    );
  }

  if (source.isLoading || source.review === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preparando as exceções deste mês…</CardTitle>
          <Text variant="caption" className="leading-5">
            Regras confirmadas são aplicadas primeiro. Somente grupos inéditos
            e sanitizados podem seguir para a IA.
          </Text>
        </CardHeader>
      </Card>
    );
  }

  if (!source.coverageComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Complete as três fontes do mês</CardTitle>
          <Text variant="caption" className="leading-5">
            Volte a Atualizar mês e confirme Itaú Pessoal, fatura do cartão e
            Itaú Empresa. A classificação só começa depois dessa cobertura.
          </Text>
        </CardHeader>
      </Card>
    );
  }

  const job = source.review.job;
  const activeErrorCode = source.localErrorCode ?? job?.errorCode ?? null;

  if (source.localErrorCode || job?.status === 'failed') {
    return (
      <Card className="border border-status-danger">
        <CardHeader>
          <CardTitle>Não foi possível preparar as categorias</CardTitle>
          <Text variant="caption" className="leading-5">
            {classificationErrorMessage(activeErrorCode)}
          </Text>
        </CardHeader>
        <CardContent>
          <Button
            variant="secondary"
            disabled={source.isLoading}
            onPress={() => void source.request()}>
            <Text>Tentar novamente</Text>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!job || job.status === 'queued' || job.status === 'running') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preparando as exceções deste mês…</CardTitle>
          <Text variant="caption" className="leading-5">
            Nenhuma sugestão vira regra sem sua confirmação.
          </Text>
        </CardHeader>
      </Card>
    );
  }

  if (job.status === 'completed') {
    return (
      <Card className="border border-status-recent">
        <CardHeader>
          <CardTitle>Categorias conferidas</CardTitle>
          <Text variant="caption" className="leading-5">
            {job.resolvedByRuleCount > 0
              ? `${job.resolvedByRuleCount} grupo(s) foram resolvidos por regras já confirmadas.`
              : 'Todas as exceções deste mês receberam uma decisão explícita.'}
          </Text>
        </CardHeader>
        <CardContent>
          <ProcessingMetadata job={job} />
        </CardContent>
      </Card>
    );
  }

  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text variant="sectionTitle">Categorias que precisam de você</Text>
        <Text variant="caption" className="leading-5">
          Confirme a sugestão, escolha outra categoria ou marque “não sei”.
          Categoria, Natureza Econômica e Patrimônio de Origem permanecem
          independentes.
        </Text>
      </View>

      {source.pendingSuggestions.map((suggestion) => (
        <ClassificationSuggestionCard
          key={suggestion.suggestionId}
          suggestion={suggestion}
          isSaving={source.savingSuggestionId === suggestion.suggestionId}
          onDecide={(decision, categoryId) =>
            source.decide(suggestion.suggestionId, decision, categoryId)
          }
        />
      ))}

      <ProcessingMetadata job={job} />
    </View>
  );
}

type ReviewSuggestion =
  NonNullable<
    MonthlyClassificationReviewSource['review']
  >['suggestions'][number];

function ClassificationSuggestionCard({
  suggestion,
  isSaving,
  onDecide,
}: {
  suggestion: ReviewSuggestion;
  isSaving: boolean;
  onDecide: (
    decision: 'confirm' | 'correct' | 'abstain',
    categoryId: ClassificationCategoryId | null,
  ) => Promise<void>;
}) {
  const [isCorrecting, setIsCorrecting] = useState(
    suggestion.suggestedCategoryId === null,
  );
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<ClassificationCategoryId | null>(
      suggestion.suggestedCategoryId,
    );

  return (
    <Card>
      <CardHeader className="gap-2">
        <Text variant="overline">
          {suggestion.source === 'model'
            ? uncertaintyLabel(suggestion.uncertainty)
            : 'Revisão protegida'}
        </Text>
        <CardTitle>
          {suggestion.displayDescription ??
            manualReviewTitle(suggestion.manualReviewReason)}
        </CardTitle>
        <Text variant="caption" className="leading-5">
          {suggestion.suggestedCategoryId
            ? `Sugestão: ${classificationCategoryLabel(
                suggestion.suggestedCategoryId,
              )}. ${evidenceExplanation(suggestion.evidence)}`
            : 'Não há evidência suficiente para sugerir uma categoria com segurança.'}
        </Text>
      </CardHeader>
      <CardContent className="gap-3">
        {isCorrecting ? (
          <View className="flex-row flex-wrap gap-2">
            {CLASSIFICATION_CATEGORIES.map((category) => (
              <Button
                key={category.id}
                size="compact"
                variant={
                  selectedCategoryId === category.id ? 'secondary' : 'outline'
                }
                disabled={isSaving}
                onPress={() => setSelectedCategoryId(category.id)}>
                <Text>{category.label}</Text>
              </Button>
            ))}
          </View>
        ) : null}

        <View className="flex-row flex-wrap gap-2">
          {suggestion.suggestedCategoryId && !isCorrecting ? (
            <Button
              size="compact"
              disabled={isSaving}
              onPress={() =>
                void onDecide(
                  'confirm',
                  suggestion.suggestedCategoryId,
                )
              }>
              <Text>{isSaving ? 'Confirmando…' : 'Confirmar categoria'}</Text>
            </Button>
          ) : null}
          {isCorrecting && selectedCategoryId ? (
            <Button
              size="compact"
              disabled={isSaving}
              onPress={() =>
                void onDecide('correct', selectedCategoryId)
              }>
              <Text>{isSaving ? 'Salvando…' : 'Confirmar escolha'}</Text>
            </Button>
          ) : (
            <Button
              size="compact"
              variant="outline"
              disabled={isSaving}
              onPress={() => setIsCorrecting(true)}>
              <Text>Corrigir</Text>
            </Button>
          )}
          <Button
            size="compact"
            variant="ghost"
            disabled={isSaving}
            onPress={() => void onDecide('abstain', null)}>
            <Text>Não sei</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

function ProcessingMetadata({
  job,
}: {
  job: NonNullable<
    NonNullable<MonthlyClassificationReviewSource['review']>['job']
  >;
}) {
  const tokenCount = job.totalTokens;
  const cost =
    job.estimatedCostInUsdMicros === null
      ? null
      : (job.estimatedCostInUsdMicros / 1_000_000).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 4,
          maximumFractionDigits: 6,
        });

  return (
    <Text variant="caption" className="leading-5">
      {job.adapter === 'fake' ? 'Adapter de teste' : job.model}
      {tokenCount !== null ? ` · ${tokenCount} tokens` : ''}
      {job.latencyMs !== null ? ` · ${job.latencyMs} ms` : ''}
      {cost ? ` · custo estimado ${cost}` : ''}
      {` · ${job.modelCallCount} chamada(s) nesta execução`}
    </Text>
  );
}

function uncertaintyLabel(value: 'low' | 'medium' | 'high'): string {
  const labels = {
    low: 'Sugestão com menor incerteza',
    medium: 'Sugestão ambígua',
    high: 'Sugestão com alta incerteza',
  };
  return labels[value];
}

function evidenceExplanation(
  value:
    | 'known_merchant'
    | 'description_semantics'
    | 'recurring_pattern'
    | 'insufficient',
): string {
  const explanations = {
    known_merchant: 'A descrição sanitizada parece um estabelecimento conhecido.',
    description_semantics: 'A sugestão usa somente o sentido da descrição sanitizada.',
    recurring_pattern: 'A descrição sanitizada indica um padrão recorrente.',
    insufficient: 'A descrição sanitizada não oferece evidência suficiente.',
  };
  return explanations[value];
}

function manualReviewTitle(
  value:
    | 'sensitive_transfer'
    | 'possible_prompt_injection'
    | 'empty_after_redaction'
    | null,
): string {
  const titles = {
    sensitive_transfer: 'Transferência com dados protegidos',
    possible_prompt_injection: 'Descrição bloqueada por segurança',
    empty_after_redaction: 'Descrição sem contexto seguro',
  };
  return value ? titles[value] : 'Grupo sem descrição segura';
}

function classificationErrorMessage(code: string | null): string {
  const messages: Readonly<Record<string, string>> = {
    MONTHLY_SOURCES_INCOMPLETE:
      'As três fontes desta competência precisam estar confirmadas antes da classificação.',
    AI_NOT_CONFIGURED:
      'A classificação por IA ainda não está configurada no backend.',
    AI_CLASSIFICATION_MODEL_NOT_CONFIGURED:
      'O modelo de classificação ainda não foi escolhido no backend após o eval.',
    AI_TIMEOUT:
      'O processamento excedeu o tempo. Nenhuma regra foi criada; tente novamente.',
    AI_RATE_LIMITED:
      'O serviço está temporariamente ocupado. Nenhuma regra foi criada; tente novamente.',
    AI_PROVIDER_ERROR:
      'O serviço não respondeu como esperado. Nenhuma regra foi criada.',
    AI_INVALID_RESPONSE:
      'A resposta não passou pela validação estrutural. Nenhuma categoria foi assumida.',
    AI_REFUSAL:
      'O modelo não classificou estes grupos. Você pode tentar novamente ou revisar manualmente.',
    CLASSIFICATION_INPUT_CHANGED:
      'Os dados ou regras mudaram durante o processamento. Tente novamente com o estado atual.',
  };
  return (
    messages[code ?? ''] ??
    'Nenhuma regra foi criada. Tente novamente ou volte a Atualizar mês.'
  );
}

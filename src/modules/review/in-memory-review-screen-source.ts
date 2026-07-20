import { type ReviewScreenModel } from './review-screen-model';

export type SyntheticReviewScenario = 'loading' | 'empty' | 'error';

const SYNTHETIC_ORIGIN = {
  kind: 'synthetic',
  label: 'Demonstração com dados sintéticos',
} as const;

export function getSyntheticReviewModel(scenario: SyntheticReviewScenario): ReviewScreenModel {
  if (scenario === 'loading') {
    return { status: 'loading', origin: SYNTHETIC_ORIGIN };
  }

  if (scenario === 'empty') {
    return {
      status: 'empty',
      origin: SYNTHETIC_ORIGIN,
      title: 'Importe seu primeiro período',
      description: 'Nenhum Lote de Importação demonstrativo foi confirmado.',
    };
  }

  return {
    status: 'error',
    origin: SYNTHETIC_ORIGIN,
    title: 'Não foi possível carregar suas importações',
    description: 'Nenhum dado demonstrativo foi perdido. Tente carregar a revisão novamente.',
  };
}

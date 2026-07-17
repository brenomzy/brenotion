import { type MoreScenario, type MoreScreenModel, type MoreScreenSource } from './more-screen-model';

const STATE_BY_SCENARIO: Record<MoreScenario, MoreScreenModel['state']> = {
  loading: {
    title: 'Carregando configurações',
    description: 'Consultando acesso, conexões e preferências.',
  },
  empty: {
    title: 'Nenhuma conexão financeira configurada',
    description: 'Este vazio é apenas demonstrativo. O verificador funcional continua disponível abaixo.',
    actionLabel: 'Configurar conexão',
  },
  recent: {
    title: 'Configurações demonstrativas disponíveis',
    description: 'O estado recente sintético não substitui a verificação real da conexão.',
    actionLabel: 'Ver detalhes',
  },
  partial: {
    title: 'Dados parciais',
    description: 'A cobertura demonstrativa não alcança todo o perímetro esperado.',
    actionLabel: 'Ver cobertura',
  },
  stale: {
    title: 'Conexão demonstrativa desatualizada',
    description: 'O último estado sintético conhecido é de 12 de julho, às 18:10.',
    actionLabel: 'Atualizar conexão',
  },
  offline: {
    title: 'Você está offline',
    description: 'Mostrando o estado sintético conhecido de 15 de julho, às 12:32.',
    actionLabel: 'Tentar novamente',
  },
  error: {
    title: 'Não foi possível verificar a conexão demonstrativa',
    description: 'O último estado conhecido continua visível. Nenhum dado foi alterado.',
    actionLabel: 'Verificar novamente',
  },
};

export const inMemoryMoreScreenSource: MoreScreenSource = {
  get(scenario) {
    return { scenario, state: STATE_BY_SCENARIO[scenario] };
  },
};

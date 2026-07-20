export type SyntheticChecklistStatus =
  | 'pending'
  | 'needsAttention'
  | 'completed'
  | 'waived';

export type SyntheticChecklistAction = 'complete' | 'waive' | 'reopen';

export type SyntheticChecklistItem = Readonly<{
  id: string;
  name: string;
  dueLabel: string;
  expectedAmountLabel: string;
  economicNatureLabel: 'Pessoal' | 'Empresa';
  paymentOriginLabel: 'Pessoal' | 'Empresa';
  status: SyntheticChecklistStatus;
}>;

export const SYNTHETIC_CHECKLIST_ITEMS: readonly SyntheticChecklistItem[] = [
  {
    id: 'synthetic-das',
    name: 'DAS mensal',
    dueLabel: 'Vence em 20 de jul',
    expectedAmountLabel: 'R$ 980,00',
    economicNatureLabel: 'Empresa',
    paymentOriginLabel: 'Empresa',
    status: 'needsAttention',
  },
  {
    id: 'synthetic-accounting',
    name: 'Honorários contábeis',
    dueLabel: 'Vence em 22 de jul',
    expectedAmountLabel: 'R$ 420,00',
    economicNatureLabel: 'Empresa',
    paymentOriginLabel: 'Empresa',
    status: 'pending',
  },
  {
    id: 'synthetic-internet',
    name: 'Internet residencial',
    dueLabel: 'Vence em 25 de jul',
    expectedAmountLabel: 'R$ 149,90',
    economicNatureLabel: 'Pessoal',
    paymentOriginLabel: 'Pessoal',
    status: 'pending',
  },
  {
    id: 'synthetic-card',
    name: 'Fatura do cartão pessoal',
    dueLabel: 'Venceu em 12 de jul',
    expectedAmountLabel: 'R$ 3.480,00',
    economicNatureLabel: 'Pessoal',
    paymentOriginLabel: 'Empresa',
    status: 'completed',
  },
  {
    id: 'synthetic-health',
    name: 'Plano de saúde familiar',
    dueLabel: 'Venceu em 10 de jul',
    expectedAmountLabel: 'R$ 760,00',
    economicNatureLabel: 'Pessoal',
    paymentOriginLabel: 'Pessoal',
    status: 'completed',
  },
  {
    id: 'synthetic-certificate',
    name: 'Renovação de certificado digital',
    dueLabel: 'Sem vencimento neste mês',
    expectedAmountLabel: 'R$ 180,00',
    economicNatureLabel: 'Empresa',
    paymentOriginLabel: 'Empresa',
    status: 'waived',
  },
] as const;

export function actionsForSyntheticChecklistStatus(
  status: SyntheticChecklistStatus,
): readonly SyntheticChecklistAction[] {
  return status === 'completed' || status === 'waived'
    ? ['reopen']
    : ['complete', 'waive'];
}

export function applySyntheticChecklistAction(
  item: SyntheticChecklistItem,
  action: SyntheticChecklistAction,
): SyntheticChecklistItem {
  if (action === 'complete') {
    return { ...item, status: 'completed' };
  }

  if (action === 'waive') {
    return { ...item, status: 'waived' };
  }

  return { ...item, status: 'pending' };
}


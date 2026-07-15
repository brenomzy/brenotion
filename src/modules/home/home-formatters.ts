import { type Money } from '@/modules/home/home-snapshot-source';

const wholeNumberFormatter = new Intl.NumberFormat('pt-BR');

export function formatMoney({ amountMinor, currency }: Money) {
  const absoluteAmount = Math.abs(amountMinor);
  const whole = Math.floor(absoluteAmount / 100);
  const cents = absoluteAmount % 100;
  const sign = amountMinor < 0 ? '−' : '';
  const currencyLabel = currency === 'BRL' ? 'R$' : currency;
  const centsLabel = cents === 0 ? '' : `,${String(cents).padStart(2, '0')}`;

  return `${sign}${currencyLabel}\u00a0${wholeNumberFormatter.format(whole)}${centsLabel}`;
}

export function formatAsOf(isoDate: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
    .format(new Date(isoDate))
    .replace('.', '');
}

export function formatLongDate(isoDate: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(isoDate));
}

export function formatDueDate(isoDate: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(isoDate));
}

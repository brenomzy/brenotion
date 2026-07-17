type MoneyCentsDisplay = 'always' | 'when-needed';

function formatBrlMinorUnits(
  minorUnits: bigint,
  showCents: MoneyCentsDisplay = 'always'
) {
  const isNegative = minorUnits < 0n;
  const absoluteMinorUnits = isNegative ? -minorUnits : minorUnits;
  const wholeUnits = absoluteMinorUnits / 100n;
  const cents = absoluteMinorUnits % 100n;
  const groupedWholeUnits = wholeUnits
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centsSuffix =
    showCents === 'when-needed' && cents === 0n ? '' : `,${cents.toString().padStart(2, '0')}`;
  const sign = isNegative ? '−' : '';

  return `${sign}R$\u00a0${groupedWholeUnits}${centsSuffix}`;
}

export { formatBrlMinorUnits };
export type { MoneyCentsDisplay };

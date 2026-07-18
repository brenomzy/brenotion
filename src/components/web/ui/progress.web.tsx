import { Progress } from '@base-ui/react/progress';

export function WebProgress({ value, label }: { value: number | null; label: string }) {
  return (
    <Progress.Root
      data-slot="progress"
      value={value}
      getAriaValueText={(formattedValue) => `${label}: ${formattedValue ?? 'em andamento'}`}
      className="grid gap-2">
      <div className="flex items-center justify-between gap-4 text-caption font-sans-medium text-ink-muted">
        <Progress.Label>{label}</Progress.Label>
        <Progress.Value className="tabular-nums" />
      </div>
      <Progress.Track className="h-2 overflow-hidden rounded-full bg-surface-muted">
        <Progress.Indicator className="h-full rounded-full bg-action-primary transition-[width] duration-300 ease-out data-[indeterminate]:w-1/3" />
      </Progress.Track>
    </Progress.Root>
  );
}

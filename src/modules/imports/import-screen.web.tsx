/* eslint-disable import/no-unresolved -- HugeIcons publishes per-icon JS subpaths without per-icon declarations. */
import type { FunctionReturnType } from 'convex/server';
import { useAction, useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import AlertCircleIcon from '@hugeicons/core-free-icons/AlertCircleIcon';
import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon';
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon';
import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon';
import FileUploadIcon from '@hugeicons/core-free-icons/FileUploadIcon';
import FileValidationIcon from '@hugeicons/core-free-icons/FileValidationIcon';
import Loading03Icon from '@hugeicons/core-free-icons/Loading03Icon';
import RefreshIcon from '@hugeicons/core-free-icons/RefreshIcon';
import SecurityCheckIcon from '@hugeicons/core-free-icons/SecurityCheckIcon';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRef, useState } from 'react';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { WebButton } from '@/components/web/ui/button.web';
import { WebProgress } from '@/components/web/ui/progress.web';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type Preview = FunctionReturnType<typeof api.imports.createPreview>;
type ImportStage =
  | 'idle'
  | 'uploading'
  | 'validating'
  | 'preview'
  | 'confirming'
  | 'confirmed'
  | 'discarding'
  | 'discarded'
  | 'error';

export function ImportScreen() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.imports.generateUploadUrl);
  const cleanupUpload = useMutation(api.imports.cleanupUpload);
  const createPreview = useAction(api.imports.createPreview);
  const confirmBatch = useMutation(api.imports.confirmBatch);
  const discardBatch = useMutation(api.imports.discardBatch);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<ImportStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const busy = ['uploading', 'validating', 'confirming', 'discarding'].includes(stage);

  const selectFile = (selected: File | null) => {
    setFile(selected);
    setPreview(null);
    setErrorMessage(null);
    setUploadProgress(0);
    setStage('idle');
  };

  const resetFlow = () => {
    selectFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage('Escolha um arquivo OFX antes de continuar.');
      setStage('error');
      return;
    }

    let uploadId: Id<'importUploads'> | null = null;
    let storageId: Id<'_storage'> | null = null;

    try {
      validateSelectedFile(file);
      setErrorMessage(null);
      setStage('uploading');
      setUploadProgress(0);
      const upload = await generateUploadUrl();
      uploadId = upload.uploadId;
      storageId = await uploadFile(upload.uploadUrl, file, setUploadProgress);
      setStage('validating');
      const result = await createPreview({ uploadId, storageId });
      setPreview(result);
      setStage(result.status === 'confirmed' ? 'confirmed' : 'preview');
    } catch (error) {
      if (uploadId && storageId) {
        try {
          await cleanupUpload({ uploadId, storageId });
        } catch {
          // A expiração server-side mantém a limpeza como fallback sem expor o erro original.
        }
      }
      setErrorMessage(importErrorMessage(error));
      setStage('error');
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    try {
      setErrorMessage(null);
      setStage('confirming');
      const confirmed = await confirmBatch({ batchId: preview.batchId });
      setPreview(confirmed);
      setStage('confirmed');
    } catch (error) {
      setErrorMessage(importErrorMessage(error));
      setStage('error');
    }
  };

  const handleDiscard = async () => {
    if (!preview) return;
    try {
      setErrorMessage(null);
      setStage('discarding');
      await discardBatch({ batchId: preview.batchId });
      setPreview({ ...preview, status: 'discarded', previewRows: [] });
      setStage('discarded');
    } catch (error) {
      setErrorMessage(importErrorMessage(error));
      setStage('error');
    }
  };

  return (
    <main className="min-h-screen bg-canvas px-5 pb-32 pt-8 font-sans text-ink antialiased sm:px-8 sm:pt-10">
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <header className="grid gap-4">
          <WebButton variant="ghost" className="w-fit pl-3 pr-4" onClick={() => router.replace('/more')}>
            <HugeiconsIcon
              aria-hidden
              icon={ArrowLeft01Icon}
              size={16}
              strokeWidth={1.8}
            />
            Voltar
          </WebButton>
          <div className="grid gap-2">
            <p className="text-overline font-sans-bold uppercase tracking-[0.04em] text-ink-muted">
              Companion web
            </p>
            <h1 className="max-w-2xl text-balance text-title-screen font-sans-bold leading-tight tracking-[-0.02em]">
              Importar extrato do Itaú PF
            </h1>
            <p className="max-w-2xl text-pretty text-body leading-relaxed text-ink-muted">
              Envie um arquivo OFX, confira a prévia estruturada e só então confirme as
              movimentações. O arquivo bruto é apagado antes de qualquer prévia ser persistida.
            </p>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
          <div className="rounded-2xl bg-surface p-2 shadow-card">
            <div className="grid gap-5 rounded-lg p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-control bg-action-primary-soft">
                  <HugeiconsIcon
                    aria-hidden
                    icon={FileUploadIcon}
                    size={20}
                    strokeWidth={1.8}
                  />
                </span>
                <div className="grid gap-1">
                  <h2 className="text-title-section font-sans-bold leading-tight">Arquivo OFX</h2>
                  <p className="text-pretty text-body leading-relaxed text-ink-muted">
                    Use o extrato exportado pelo banco. Limite de 5 MB por arquivo.
                  </p>
                </div>
              </div>

              <label
                htmlFor="ofx-file"
                className={cn(
                  'grid min-h-44 cursor-pointer place-items-center rounded-card border border-dashed border-divider bg-canvas px-6 py-8 text-center outline-none transition-[background-color,border-color] duration-150 ease-out hover:border-focus-ring hover:bg-surface-muted focus-within:ring-[3px] focus-within:ring-focus-ring/35',
                  busy && 'pointer-events-none opacity-60',
                )}>
                <input
                  ref={inputRef}
                  id="ofx-file"
                  type="file"
                  accept=".ofx,application/ofx,application/x-ofx"
                  disabled={busy}
                  className="sr-only"
                  onChange={(event) => selectFile(event.currentTarget.files?.[0] ?? null)}
                />
                <span className="grid justify-items-center gap-3">
                  {file ? (
                    <HugeiconsIcon
                      aria-hidden
                      color="currentColor"
                      icon={FileValidationIcon}
                      size={28}
                      strokeWidth={1.8}
                      className="text-action-primary"
                    />
                  ) : (
                    <HugeiconsIcon
                      aria-hidden
                      color="currentColor"
                      icon={FileUploadIcon}
                      size={28}
                      strokeWidth={1.8}
                      className="text-ink-muted"
                    />
                  )}
                  <span className="grid gap-1">
                    <span className="break-all text-body font-sans-semibold">
                      {file?.name ?? 'Escolher arquivo OFX'}
                    </span>
                    <span className="text-caption font-sans-medium text-ink-muted">
                      {file ? formatFileSize(file.size) : 'Clique para procurar no computador'}
                    </span>
                  </span>
                </span>
              </label>

              {stage === 'uploading' ? (
                <WebProgress value={uploadProgress} label="Enviando arquivo" />
              ) : stage === 'validating' ? (
                <WebProgress value={null} label="Validando e apagando o bruto" />
              ) : null}

              {errorMessage ? (
                <div
                  role="alert"
                  className="flex gap-3 rounded-card bg-status-danger-soft px-4 py-3 text-body leading-relaxed text-ink">
                  <HugeiconsIcon
                    aria-hidden
                    icon={AlertCircleIcon}
                    size={20}
                    strokeWidth={1.8}
                    className="mt-0.5 shrink-0"
                  />
                  <span>{errorMessage}</span>
                </div>
              ) : null}

              {!preview || stage === 'error' ? (
                <div className="flex flex-wrap gap-3">
                  <WebButton onClick={handleUpload} disabled={!file || busy}>
                    {busy ? (
                      <HugeiconsIcon
                        aria-hidden
                        icon={Loading03Icon}
                        size={16}
                        strokeWidth={1.8}
                        className="animate-spin"
                      />
                    ) : null}
                    Validar e criar prévia
                  </WebButton>
                  {file ? (
                    <WebButton variant="ghost" onClick={resetFlow} disabled={busy}>
                      Limpar seleção
                    </WebButton>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <aside className="grid content-start gap-4 rounded-card bg-surface p-5 shadow-card">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-control bg-status-recent-soft">
                <HugeiconsIcon
                  aria-hidden
                  icon={SecurityCheckIcon}
                  size={20}
                  strokeWidth={1.8}
                />
              </span>
              <h2 className="text-title-section font-sans-bold">Tratamento seguro</h2>
            </div>
            <ul className="grid gap-3 text-body leading-relaxed text-ink-muted">
              <li>O backend aceita somente o Titular autorizado.</li>
              <li>O parser valida formato, período, moeda e centavos exatos.</li>
              <li>Conta, CPF e conteúdo bruto não entram na prévia nem na auditoria.</li>
              <li>Reimportar o mesmo arquivo não duplica movimentações.</li>
            </ul>
          </aside>
        </section>

        {preview ? (
          <PreviewSection
            preview={preview}
            stage={stage}
            onConfirm={handleConfirm}
            onDiscard={handleDiscard}
            onReview={() => router.push('/review')}
            onReset={resetFlow}
          />
        ) : null}
      </div>
    </main>
  );
}

function PreviewSection({
  preview,
  stage,
  onConfirm,
  onDiscard,
  onReview,
  onReset,
}: {
  preview: Preview;
  stage: ImportStage;
  onConfirm: () => void;
  onDiscard: () => void;
  onReview: () => void;
  onReset: () => void;
}) {
  const isConfirmed = stage === 'confirmed' || preview.status === 'confirmed';
  const isDiscarded = stage === 'discarded' || preview.status === 'discarded';
  const isChanging = stage === 'confirming' || stage === 'discarding';

  return (
    <section className="grid gap-5 rounded-card bg-surface p-5 shadow-card sm:p-6" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-overline font-sans-bold uppercase tracking-[0.04em] text-ink-muted">
            Prévia estruturada
          </p>
          <h2 className="text-balance text-title-section font-sans-bold leading-tight">
            {isConfirmed
              ? 'Lote confirmado'
              : isDiscarded
                ? 'Lote descartado'
                : 'Confira antes de confirmar'}
          </h2>
        </div>
        <span className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full bg-status-recent-soft px-3 text-caption font-sans-bold text-ink">
          <HugeiconsIcon
            aria-hidden
            icon={CheckmarkCircle02Icon}
            size={16}
            strokeWidth={1.8}
          />
          Arquivo bruto apagado
        </span>
      </div>

      {isConfirmed ? (
        <StatusMessage>
          {preview.insertedCount === 0
            ? 'Este arquivo já havia sido confirmado. Nenhuma movimentação foi duplicada.'
            : `${preview.insertedCount} movimentações foram registradas como origem imutável.`}
        </StatusMessage>
      ) : isDiscarded ? (
        <StatusMessage>
          A prévia foi descartada e nenhuma Movimentação de Origem foi criada.
        </StatusMessage>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Período" value={formatPeriod(preview.periodStart, preview.periodEnd)} />
        <Metric label="Movimentações" value={String(preview.transactionCount)} />
        <Metric label="Créditos" value={formatBRL(preview.creditTotal.amountInMinorUnits)} />
        <Metric label="Débitos" value={formatBRL(preview.debitTotal.amountInMinorUnits)} />
      </dl>

      {preview.duplicateCount > 0 ? (
        <p className="rounded-control bg-status-warning-soft px-4 py-3 text-body leading-relaxed">
          {preview.duplicateCount} movimentação(ões) já conhecida(s) será(ão) ignorada(s) na
          confirmação.
        </p>
      ) : null}

      {preview.previewRows.length > 0 ? (
        <div className="overflow-x-auto rounded-card shadow-[0_0_0_1px_oklch(0_0_0/0.06)]">
          <table className="w-full min-w-[620px] border-collapse text-start text-label">
            <thead className="bg-surface-muted text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-3 text-start font-sans-bold">Data</th>
                <th scope="col" className="px-4 py-3 text-start font-sans-bold">Descrição</th>
                <th scope="col" className="px-4 py-3 text-end font-sans-bold">Valor</th>
                <th scope="col" className="px-4 py-3 text-end font-sans-bold">Situação</th>
              </tr>
            </thead>
            <tbody>
              {preview.previewRows.map((row, index) => (
                <tr key={`${row.postedOn}-${index}`} className="border-t border-divider">
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{formatDate(row.postedOn)}</td>
                  <td className="max-w-md break-words px-4 py-3">{row.description}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-end font-sans-semibold tabular-nums">
                    {formatBRL(row.amount.amountInMinorUnits)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-end text-caption font-sans-semibold text-ink-muted">
                    {row.isDuplicate ? 'Duplicada' : 'Nova'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {!isConfirmed && !isDiscarded ? (
          <>
            <WebButton onClick={onConfirm} disabled={isChanging}>
              {stage === 'confirming' ? (
                <HugeiconsIcon
                  aria-hidden
                  icon={Loading03Icon}
                  size={16}
                  strokeWidth={1.8}
                  className="animate-spin"
                />
              ) : (
                <HugeiconsIcon
                  aria-hidden
                  icon={CheckmarkCircle02Icon}
                  size={16}
                  strokeWidth={1.8}
                />
              )}
              Confirmar lote
            </WebButton>
            <WebButton variant="outline" onClick={onDiscard} disabled={isChanging}>
              {stage === 'discarding' ? (
                <HugeiconsIcon
                  aria-hidden
                  icon={Loading03Icon}
                  size={16}
                  strokeWidth={1.8}
                  className="animate-spin"
                />
              ) : (
                <HugeiconsIcon
                  aria-hidden
                  icon={Delete02Icon}
                  size={16}
                  strokeWidth={1.8}
                />
              )}
              Descartar prévia
            </WebButton>
          </>
        ) : isConfirmed ? (
          <>
            <WebButton onClick={onReview}>
              <HugeiconsIcon
                aria-hidden
                icon={CheckmarkCircle02Icon}
                size={16}
                strokeWidth={1.8}
              />
              Revisar movimentações
            </WebButton>
            <WebButton variant="secondary" onClick={onReset}>
              <HugeiconsIcon
                aria-hidden
                icon={RefreshIcon}
                size={16}
                strokeWidth={1.8}
              />
              Importar outro arquivo
            </WebButton>
          </>
        ) : (
          <WebButton variant="secondary" onClick={onReset}>
            <HugeiconsIcon
              aria-hidden
              icon={RefreshIcon}
              size={16}
              strokeWidth={1.8}
            />
            Importar outro arquivo
          </WebButton>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-card bg-canvas px-4 py-3">
      <dt className="text-caption font-sans-semibold text-ink-muted">{label}</dt>
      <dd className="break-words text-body font-sans-bold tabular-nums">{value}</dd>
    </div>
  );
}

function StatusMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-control bg-status-recent-soft px-4 py-3 text-body leading-relaxed">
      {children}
    </p>
  );
}

function validateSelectedFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.ofx')) {
    throw new Error('OFX_FILE_EXTENSION');
  }
  if (file.size <= 0) {
    throw new Error('OFX_EMPTY_FILE');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('OFX_FILE_TOO_LARGE');
  }
}

function uploadFile(
  uploadUrl: string,
  file: File,
  onProgress: (value: number) => void,
): Promise<Id<'_storage'>> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', uploadUrl);
    request.setRequestHeader('Content-Type', 'application/x-ofx');
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onerror = () => reject(new Error('OFX_UPLOAD_FAILED'));
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error('OFX_UPLOAD_FAILED'));
        return;
      }
      try {
        const body: unknown = JSON.parse(request.responseText);
        if (
          typeof body !== 'object' ||
          body === null ||
          !('storageId' in body) ||
          typeof body.storageId !== 'string'
        ) {
          reject(new Error('OFX_UPLOAD_FAILED'));
          return;
        }
        onProgress(100);
        resolve(body.storageId as Id<'_storage'>);
      } catch {
        reject(new Error('OFX_UPLOAD_FAILED'));
      }
    };
    request.send(file);
  });
}

function importErrorMessage(error: unknown): string {
  const code = errorCode(error);
  const messages: Record<string, string> = {
    OFX_FILE_EXTENSION: 'Escolha um arquivo com extensão .ofx.',
    OFX_EMPTY_FILE: 'O arquivo está vazio.',
    OFX_FILE_TOO_LARGE: 'O arquivo ultrapassa o limite de 5 MB.',
    OFX_UPLOAD_FAILED: 'O envio não foi concluído. Verifique a conexão e tente novamente.',
    OFX_UPLOAD_NOT_FOUND: 'O upload não está mais disponível. Envie o arquivo novamente.',
    OFX_UPLOAD_EXPIRED: 'O tempo para processar este upload expirou. Envie o arquivo novamente.',
    OFX_UPLOAD_ALREADY_USED: 'Este upload já foi processado. Escolha o arquivo novamente.',
    OFX_INVALID_FORMAT: 'O conteúdo não parece ser um extrato OFX válido.',
    OFX_UNSUPPORTED_CURRENCY: 'O arquivo não está em reais (BRL).',
    OFX_INVALID_PERIOD: 'O período informado pelo arquivo é inválido.',
    OFX_INVALID_TRANSACTION: 'Há uma movimentação inválida no arquivo.',
    OFX_TOO_MANY_TRANSACTIONS: 'O arquivo possui movimentações demais para um único lote.',
    OFX_UNSUPPORTED_CONTENT_TYPE: 'O tipo do arquivo não é aceito para importação OFX.',
    AUTHENTICATION_REQUIRED: 'Sua sessão expirou. Entre novamente para importar.',
    ACCESS_DENIED: 'Esta conta não tem autorização para importar arquivos.',
  };
  return messages[code ?? ''] ?? 'Não foi possível processar o arquivo. Tente novamente.';
}

function errorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === 'object' && data !== null && 'code' in data) {
      const code = (data as { code?: unknown }).code;
      if (typeof code === 'string') return code;
    }
  }
  if (error instanceof Error) {
    const match = /(?:OFX|AUTHENTICATION|AUTHORIZATION|ACCESS)_[A-Z_]+/.exec(error.message);
    return match?.[0] ?? null;
  }
  return null;
}

function formatFileSize(bytes: number): string {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(bytes / 1024)} KB`;
}

function formatPeriod(start: string | null, end: string | null): string {
  if (!start || !end) return 'Não informado';
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function formatBRL(amountInMinorUnits: bigint): string {
  const negative = amountInMinorUnits < 0n;
  const absolute = negative ? -amountInMinorUnits : amountInMinorUnits;
  const whole = absolute / 100n;
  const cents = (absolute % 100n).toString().padStart(2, '0');
  return `${negative ? '−' : ''}R$ ${new Intl.NumberFormat('pt-BR').format(whole)},${cents}`;
}

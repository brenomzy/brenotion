export type PluggyConfig = Readonly<{
  clientId: string;
  clientSecret: string;
  itemId: string;
}>;

export type PluggyConnectionInspection = Readonly<{
  availability: 'ready' | 'partial' | 'unavailable';
  connectorName: string;
  itemStatus: string;
  executionStatus: string;
  lastUpdatedAt: string | null;
  nextAutoSyncAt: string | null;
  accountWarningCount: number;
  accounts: Readonly<{
    total: number;
    bank: number;
    credit: number;
    subtypes: string[];
  }> | null;
}>;

export type PluggyErrorCode =
  | 'PLUGGY_NOT_CONFIGURED'
  | 'PLUGGY_AUTH_FAILED'
  | 'PLUGGY_REQUEST_FAILED'
  | 'PLUGGY_INVALID_RESPONSE';

export class PluggyIntegrationError extends Error {
  readonly code: PluggyErrorCode;
  readonly httpStatus: number | null;
  readonly errorId: string | null;

  constructor(
    code: PluggyErrorCode,
    options?: Readonly<{ httpStatus?: number; errorId?: string | null }>,
  ) {
    super(code);
    this.name = 'PluggyIntegrationError';
    this.code = code;
    this.httpStatus = options?.httpStatus ?? null;
    this.errorId = options?.errorId ?? null;
  }
}

type Environment = Readonly<Record<string, string | undefined>>;
type Fetch = typeof fetch;
type JsonObject = Record<string, unknown>;

const PLUGGY_API_URL = 'https://api.pluggy.ai';

export function readPluggyConfig(environment: Environment): PluggyConfig {
  return {
    clientId: requireEnvironmentValue(environment, 'PLUGGY_CLIENT_ID'),
    clientSecret: requireEnvironmentValue(environment, 'PLUGGY_CLIENT_SECRET'),
    itemId: requireEnvironmentValue(environment, 'PLUGGY_ITEM_ID'),
  };
}

export async function inspectPluggyConnection(
  config: PluggyConfig,
  fetchImplementation: Fetch = fetch,
): Promise<PluggyConnectionInspection> {
  const apiKey = await authenticate(config, fetchImplementation);
  const item = await requestJson(
    `${PLUGGY_API_URL}/items/${encodeURIComponent(config.itemId)}`,
    apiKey,
    fetchImplementation,
  );
  const parsedItem = parseItem(item);

  if (!parsedItem.canFetchAccounts) {
    return {
      availability: parsedItem.availability,
      ...parsedItem.summary,
      accounts: null,
    };
  }

  const accountsResponse = await requestJson(
    `${PLUGGY_API_URL}/accounts?itemId=${encodeURIComponent(config.itemId)}`,
    apiKey,
    fetchImplementation,
  );
  const accounts = parseAccountCoverage(accountsResponse);

  return {
    availability: parsedItem.availability,
    ...parsedItem.summary,
    accounts,
  };
}

async function authenticate(config: PluggyConfig, fetchImplementation: Fetch): Promise<string> {
  const response = await fetchImplementation(`${PLUGGY_API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: config.clientId, clientSecret: config.clientSecret }),
  });
  const body = await readJsonObject(response);

  if (!response.ok) {
    throw new PluggyIntegrationError('PLUGGY_AUTH_FAILED', {
      httpStatus: response.status,
      errorId: readErrorId(body),
    });
  }

  const apiKey = body.apiKey;
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    throw new PluggyIntegrationError('PLUGGY_INVALID_RESPONSE', {
      httpStatus: response.status,
      errorId: readErrorId(body),
    });
  }

  return apiKey;
}

async function requestJson(
  url: string,
  apiKey: string,
  fetchImplementation: Fetch,
): Promise<JsonObject> {
  const response = await fetchImplementation(url, {
    headers: { 'X-API-KEY': apiKey },
  });
  const body = await readJsonObject(response);

  if (!response.ok) {
    throw new PluggyIntegrationError('PLUGGY_REQUEST_FAILED', {
      httpStatus: response.status,
      errorId: readErrorId(body),
    });
  }

  return body;
}

async function readJsonObject(response: Response): Promise<JsonObject> {
  let value: unknown;

  try {
    value = await response.json();
  } catch {
    throw new PluggyIntegrationError('PLUGGY_INVALID_RESPONSE', {
      httpStatus: response.status,
    });
  }

  if (!isJsonObject(value)) {
    throw new PluggyIntegrationError('PLUGGY_INVALID_RESPONSE', {
      httpStatus: response.status,
    });
  }

  return value;
}

function parseItem(value: JsonObject): Readonly<{
  availability: PluggyConnectionInspection['availability'];
  canFetchAccounts: boolean;
  summary: Omit<PluggyConnectionInspection, 'availability' | 'accounts'>;
}> {
  const connector = value.connector;

  if (
    !isJsonObject(connector) ||
    typeof connector.name !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.executionStatus !== 'string'
  ) {
    throw new PluggyIntegrationError('PLUGGY_INVALID_RESPONSE');
  }

  const baseSummary = {
    connectorName: connector.name,
    itemStatus: value.status,
    executionStatus: value.executionStatus,
    lastUpdatedAt: readNullableString(value.lastUpdatedAt),
    nextAutoSyncAt: readNullableString(value.nextAutoSyncAt),
  };

  if (value.status !== 'UPDATED') {
    return {
      availability: 'unavailable',
      canFetchAccounts: false,
      summary: { ...baseSummary, accountWarningCount: 0 },
    };
  }

  if (value.executionStatus === 'SUCCESS') {
    return {
      availability: 'ready',
      canFetchAccounts: true,
      summary: { ...baseSummary, accountWarningCount: 0 },
    };
  }

  if (value.executionStatus !== 'PARTIAL_SUCCESS') {
    return {
      availability: 'unavailable',
      canFetchAccounts: false,
      summary: { ...baseSummary, accountWarningCount: 0 },
    };
  }

  const statusDetail = value.statusDetail;
  const accountsStatus = isJsonObject(statusDetail) ? statusDetail.accounts : null;

  if (accountsStatus === null || accountsStatus === undefined) {
    return {
      availability: 'partial',
      canFetchAccounts: false,
      summary: { ...baseSummary, accountWarningCount: 0 },
    };
  }

  if (
    !isJsonObject(accountsStatus) ||
    typeof accountsStatus.isUpdated !== 'boolean' ||
    !Array.isArray(accountsStatus.warnings)
  ) {
    throw new PluggyIntegrationError('PLUGGY_INVALID_RESPONSE');
  }

  return {
    availability: 'partial',
    canFetchAccounts: accountsStatus.isUpdated,
    summary: {
      ...baseSummary,
      lastUpdatedAt: readNullableString(accountsStatus.lastUpdatedAt) ?? baseSummary.lastUpdatedAt,
      accountWarningCount: accountsStatus.warnings.length,
    },
  };
}

function parseAccountCoverage(value: JsonObject): NonNullable<PluggyConnectionInspection['accounts']> {
  if (!Array.isArray(value.results)) {
    throw new PluggyIntegrationError('PLUGGY_INVALID_RESPONSE');
  }

  let bank = 0;
  let credit = 0;
  const subtypes = new Set<string>();

  for (const account of value.results) {
    if (!isJsonObject(account) || typeof account.type !== 'string' || typeof account.subtype !== 'string') {
      throw new PluggyIntegrationError('PLUGGY_INVALID_RESPONSE');
    }

    if (account.type === 'BANK') bank += 1;
    if (account.type === 'CREDIT') credit += 1;
    subtypes.add(account.subtype);
  }

  return {
    total: value.results.length,
    bank,
    credit,
    subtypes: [...subtypes].sort(),
  };
}

function requireEnvironmentValue(environment: Environment, name: string): string {
  const value = environment[name]?.trim();

  if (!value) {
    throw new PluggyIntegrationError('PLUGGY_NOT_CONFIGURED');
  }

  return value;
}

function readNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readErrorId(value: JsonObject): string | null {
  for (const name of ['errorId', 'error_id', 'requestId', 'request_id']) {
    const candidate = value[name];
    if (typeof candidate === 'string' && candidate.length > 0) return candidate;
  }

  return null;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

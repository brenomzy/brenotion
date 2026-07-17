/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const SYNTHETIC_OWNER_ID = 'user_test_authorized_owner';
const SYNTHETIC_OTHER_ID = 'user_test_someone_else';

describe('financialIntegration.inspectConnection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('denies unauthenticated access before calling Pluggy', async () => {
    stubEnvironment();
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    const t = convexTest(schema, modules);

    await expect(t.action(api.financialIntegration.inspectConnection)).rejects.toMatchObject({
      data: { code: 'AUTHENTICATION_REQUIRED' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('denies another authenticated identity before calling Pluggy', async () => {
    stubEnvironment();
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    const t = convexTest(schema, modules).withIdentity({ subject: SYNTHETIC_OTHER_ID });

    await expect(t.action(api.financialIntegration.inspectConnection)).rejects.toMatchObject({
      data: { code: 'ACCESS_DENIED' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns sanitized coverage to the authorized owner', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T10:00:00.000Z'));
    stubEnvironment();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ apiKey: 'api_key_test_synthetic' }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'UPDATED',
          executionStatus: 'SUCCESS',
          lastUpdatedAt: '2026-07-16T10:00:00.000Z',
          nextAutoSyncAt: null,
          consentExpiresAt: null,
          connector: { name: 'MeuPluggy' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              id: 'account_test_bank',
              type: 'BANK',
              subtype: 'CHECKING_ACCOUNT',
              balance: 123_45,
            },
            {
              id: 'account_test_credit',
              type: 'CREDIT',
              subtype: 'CREDIT_CARD',
              balance: 678_90,
            },
          ],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const t = convexTest(schema, modules).withIdentity({ subject: SYNTHETIC_OWNER_ID });

    const result = await t.action(api.financialIntegration.inspectConnection);

    expect(result).toMatchObject({
      availability: 'ready',
      connectorName: 'MeuPluggy',
      accounts: { total: 2, bank: 1, credit: 1 },
    });
    expect(JSON.stringify(result)).not.toContain('account_test');
    expect(JSON.stringify(result)).not.toContain('12345');
  });
});

function stubEnvironment() {
  vi.stubEnv('AUTHORIZED_CLERK_USER_ID', SYNTHETIC_OWNER_ID);
  vi.stubEnv('PLUGGY_CLIENT_ID', 'client_test_synthetic');
  vi.stubEnv('PLUGGY_CLIENT_SECRET', 'secret_test_synthetic');
  vi.stubEnv('PLUGGY_ITEM_ID', 'item_test_synthetic');
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

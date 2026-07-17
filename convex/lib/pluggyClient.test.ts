import { describe, expect, it, vi } from 'vitest';

import {
  inspectPluggyConnection,
  PluggyIntegrationError,
  readPluggyConfig,
} from './pluggyClient';

const SYNTHETIC_CONFIG = {
  clientId: 'client_test_synthetic',
  clientSecret: 'secret_test_synthetic',
  itemId: 'item_test_synthetic',
};
const INSPECTION_NOW = Date.parse('2026-07-17T10:00:00.000Z');

describe('inspectPluggyConnection', () => {
  it('returns only sanitized coverage metadata for a ready item', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ apiKey: 'api_key_test_synthetic' }))
      .mockResolvedValueOnce(
        jsonResponse({
          id: SYNTHETIC_CONFIG.itemId,
          status: 'UPDATED',
          executionStatus: 'SUCCESS',
          lastUpdatedAt: '2026-07-16T10:00:00.000Z',
          nextAutoSyncAt: '2026-07-17T10:00:00.000Z',
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
              bankData: { transferNumber: 'never-return-this' },
            },
            {
              id: 'account_test_credit',
              type: 'CREDIT',
              subtype: 'CREDIT_CARD',
              balance: 678_90,
              creditData: { creditLimit: 999_99 },
            },
          ],
        }),
      );

    const result = await inspectPluggyConnection(SYNTHETIC_CONFIG, fetchMock, INSPECTION_NOW);

    expect(result).toEqual({
      availability: 'ready',
      connectorName: 'MeuPluggy',
      itemStatus: 'UPDATED',
      executionStatus: 'SUCCESS',
      lastUpdatedAt: '2026-07-16T10:00:00.000Z',
      nextAutoSyncAt: '2026-07-17T10:00:00.000Z',
      consentExpiresAt: null,
      accountWarningCount: 0,
      accounts: {
        total: 2,
        bank: 1,
        credit: 1,
        subtypes: ['CHECKING_ACCOUNT', 'CREDIT_CARD'],
      },
    });
    expect(JSON.stringify(result)).not.toContain('never-return-this');
    expect(JSON.stringify(result)).not.toContain('12345');
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://api.pluggy.ai/accounts?itemId=item_test_synthetic',
      { headers: { 'X-API-KEY': 'api_key_test_synthetic' } },
    );
  });

  it('marks stale item data as partial even when the last execution succeeded', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ apiKey: 'api_key_test_synthetic' }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'UPDATED',
          executionStatus: 'SUCCESS',
          lastUpdatedAt: '2026-07-14T09:59:59.000Z',
          nextAutoSyncAt: null,
          connector: { name: 'MeuPluggy' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            { type: 'BANK', subtype: 'CHECKING_ACCOUNT' },
            { type: 'CREDIT', subtype: 'CREDIT_CARD' },
          ],
        }),
      );

    await expect(
      inspectPluggyConnection(SYNTHETIC_CONFIG, fetchMock, INSPECTION_NOW),
    ).resolves.toMatchObject({ availability: 'partial' });
  });

  it('marks coverage as partial when the required bank and credit accounts are incomplete', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ apiKey: 'api_key_test_synthetic' }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'UPDATED',
          executionStatus: 'SUCCESS',
          lastUpdatedAt: '2026-07-17T09:00:00.000Z',
          nextAutoSyncAt: null,
          connector: { name: 'MeuPluggy' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          results: [{ type: 'BANK', subtype: 'CHECKING_ACCOUNT' }],
        }),
      );

    await expect(
      inspectPluggyConnection(SYNTHETIC_CONFIG, fetchMock, INSPECTION_NOW),
    ).resolves.toMatchObject({
      availability: 'partial',
      accounts: { total: 1, bank: 1, credit: 0 },
    });
  });

  it('does not fetch accounts when consent has expired', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ apiKey: 'api_key_test_synthetic' }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'UPDATED',
          executionStatus: 'SUCCESS',
          lastUpdatedAt: '2026-07-17T09:00:00.000Z',
          nextAutoSyncAt: null,
          consentExpiresAt: '2026-07-17T09:59:59.000Z',
          connector: { name: 'MeuPluggy' },
        }),
      );

    await expect(
      inspectPluggyConnection(SYNTHETIC_CONFIG, fetchMock, INSPECTION_NOW),
    ).resolves.toMatchObject({
      availability: 'unavailable',
      consentExpiresAt: '2026-07-17T09:59:59.000Z',
      accounts: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not fetch accounts while the item is unavailable', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ apiKey: 'api_key_test_synthetic' }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'WAITING_USER_INPUT',
          executionStatus: 'WAITING_USER_INPUT',
          lastUpdatedAt: null,
          nextAutoSyncAt: null,
          connector: { name: 'MeuPluggy' },
        }),
      );

    await expect(
      inspectPluggyConnection(SYNTHETIC_CONFIG, fetchMock, INSPECTION_NOW),
    ).resolves.toMatchObject({
      availability: 'unavailable',
      accounts: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not fetch accounts when partial success marks the product as stale', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ apiKey: 'api_key_test_synthetic' }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'UPDATED',
          executionStatus: 'PARTIAL_SUCCESS',
          lastUpdatedAt: '2026-07-16T10:00:00.000Z',
          nextAutoSyncAt: null,
          connector: { name: 'MeuPluggy' },
          statusDetail: {
            accounts: {
              isUpdated: false,
              lastUpdatedAt: '2026-07-14T10:00:00.000Z',
              warnings: [{ code: 'PRODUCT_TEMPORARILY_UNAVAILABLE' }],
            },
          },
        }),
      );

    await expect(
      inspectPluggyConnection(SYNTHETIC_CONFIG, fetchMock, INSPECTION_NOW),
    ).resolves.toMatchObject({
      availability: 'partial',
      lastUpdatedAt: '2026-07-14T10:00:00.000Z',
      accountWarningCount: 1,
      accounts: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps upstream errors sanitized', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ apiKey: 'api_key_test_synthetic' }))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            errorId: 'error_test_synthetic',
            message: 'response text must not escape the boundary',
          },
          503,
        ),
      );

    const error = await inspectPluggyConnection(SYNTHETIC_CONFIG, fetchMock, INSPECTION_NOW).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(PluggyIntegrationError);
    expect(error).toMatchObject({
      code: 'PLUGGY_REQUEST_FAILED',
      httpStatus: 503,
      errorId: 'error_test_synthetic',
      message: 'PLUGGY_REQUEST_FAILED',
    });
    expect(JSON.stringify(error)).not.toContain('response text');
  });
});

describe('readPluggyConfig', () => {
  it('fails closed without exposing the missing secret name', () => {
    expect(() =>
      readPluggyConfig({
        PLUGGY_CLIENT_ID: SYNTHETIC_CONFIG.clientId,
        PLUGGY_CLIENT_SECRET: '',
        PLUGGY_ITEM_ID: SYNTHETIC_CONFIG.itemId,
      }),
    ).toThrowError('PLUGGY_NOT_CONFIGURED');
  });
});

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

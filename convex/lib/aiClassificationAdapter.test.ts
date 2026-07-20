import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ClassificationAdapterError,
  runClassificationAdapter,
} from './aiClassificationAdapter';

describe('OpenAI classification adapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses store false and strict structured output with only sanitized opaque groups', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'synthetic-response-id',
          status: 'completed',
          output_text: JSON.stringify({
            classifications: [
              {
                groupId: 'group_opaque',
                suggestedCategoryId: 'food',
                evidence: 'description_semantics',
                uncertainty: 'low',
              },
            ],
          }),
          usage: {
            input_tokens: 100,
            output_tokens: 20,
            total_tokens: 120,
          },
        }),
        { status: 200 },
      ),
    );

    const result = await runClassificationAdapter({
      adapter: 'openai',
      apiKey: 'synthetic-api-key',
      model: 'gpt-5.6-luna',
      groups: [
        {
          groupId: 'group_opaque',
          description: 'mercado do bairro',
          direction: 'debit',
          sourcePatrimony: 'personal',
          occurrenceCount: 1,
        },
      ],
    });

    expect(result.classifications[0]?.suggestedCategoryId).toBe('food');
    expect(result.metadata).toMatchObject({
      inputTokens: 100,
      outputTokens: 20,
      totalTokens: 120,
      estimatedCostInUsdMicros: 220,
    });
    const request = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body)) as Record<string, unknown>;
    const serialized = JSON.stringify(body);
    expect(body.store).toBe(false);
    expect(serialized).toContain('"strict":true');
    expect(serialized).toContain('group_opaque');
    expect(serialized).not.toContain('groupKey');
    expect(serialized).not.toContain('CPF');
    expect(serialized).not.toContain('synthetic-api-key');
  });

  it('turns rate limits into a recoverable sanitized error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('provider body must not be read', { status: 429 }),
    );

    await expect(
      runClassificationAdapter({
        adapter: 'openai',
        apiKey: 'synthetic-api-key',
        model: 'gpt-5.6-luna',
        groups: [
          {
            groupId: 'group_opaque',
            description: 'mercado',
            direction: 'debit',
            sourcePatrimony: 'personal',
            occurrenceCount: 1,
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: 'AI_RATE_LIMITED',
      retryable: true,
    } satisfies Partial<ClassificationAdapterError>);
  });

  it('rejects unknown group ids and categories without a default', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'synthetic-response-id',
          status: 'completed',
          output_text: JSON.stringify({
            classifications: [
              {
                groupId: 'unknown-group',
                suggestedCategoryId: 'unknown-category',
                evidence: 'description_semantics',
                uncertainty: 'low',
              },
            ],
          }),
        }),
        { status: 200 },
      ),
    );

    await expect(
      runClassificationAdapter({
        adapter: 'openai',
        apiKey: 'synthetic-api-key',
        model: 'gpt-5.6-luna',
        groups: [
          {
            groupId: 'group_opaque',
            description: 'mercado',
            direction: 'debit',
            sourcePatrimony: 'personal',
            occurrenceCount: 1,
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: 'AI_INVALID_RESPONSE',
      retryable: true,
    } satisfies Partial<ClassificationAdapterError>);
  });

  it('turns refusals into a recoverable sanitized error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'synthetic-response-id',
          status: 'completed',
          output: [
            {
              type: 'message',
              content: [{ type: 'refusal', refusal: 'synthetic refusal' }],
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(
      runClassificationAdapter({
        adapter: 'openai',
        apiKey: 'synthetic-api-key',
        model: 'gpt-5.6-luna',
        groups: [
          {
            groupId: 'group_opaque',
            description: 'mercado',
            direction: 'debit',
            sourcePatrimony: 'personal',
            occurrenceCount: 1,
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: 'AI_REFUSAL',
      retryable: true,
    } satisfies Partial<ClassificationAdapterError>);
  });
});
